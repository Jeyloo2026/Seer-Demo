import type { Market } from "./seer";

export const CHAINS: Record<number, { name: string; short: string; explorer: string }> = {
  100: { name: "Gnosis", short: "GNO", explorer: "https://gnosisscan.io" },
  1: { name: "Ethereum", short: "ETH", explorer: "https://etherscan.io" },
  10: { name: "Optimism", short: "OP", explorer: "https://optimistic.etherscan.io" },
  8453: { name: "Base", short: "BASE", explorer: "https://basescan.org" },
  11155111: { name: "Sepolia", short: "SEP", explorer: "https://sepolia.etherscan.io" },
};
export const chainName = (id: number) => CHAINS[id]?.name ?? `Chain ${id}`;
export const explorer = (chainId: number, kind: "address" | "tx" | "token", v: string) =>
  `${CHAINS[chainId]?.explorer ?? "https://gnosisscan.io"}/${kind}/${v}`;

export type Kind = "Categorical" | "Multi-categorical" | "Scalar" | "Multi-scalar" | "Futarchy";

export function kindOf(m: Pick<Market, "type" | "tpl" | "outcomes">): Kind {
  if (m.type === "Futarchy") return "Futarchy";
  if (m.tpl === 3) return "Multi-categorical";
  if (m.tpl === 1) {
    const real = m.outcomes.filter((o) => o !== "Invalid");
    return real.length === 2 && real[0] === "DOWN" && real[1] === "UP" ? "Scalar" : "Multi-scalar";
  }
  return "Categorical";
}

export const KIND_NOTE: Record<Kind, string> = {
  Categorical: "One outcome wins.",
  "Multi-categorical": "Several outcomes can be true.",
  Scalar: "A number inside a range, priced by UP and DOWN.",
  "Multi-scalar": "Many numbers at once, one token per item.",
  Futarchy: "Prices conditional on a decision passing or failing.",
};

export type Status = "Trading" | "Reporting" | "Disputed" | "Resolved";

export function statusOf(m: Market, now = Date.now() / 1000): Status {
  if (m.payout && m.payout.some((p) => p !== "0")) return "Resolved";
  if (m.reported) return "Resolved";
  if (m.arbitrating) return "Disputed";
  if (m.open && now >= m.open) return "Reporting";
  return "Trading";
}

export const isTest = (m: Market) => /\btest\b/i.test(m.name);

/** Real (non-Invalid) outcomes with their odds, sorted high → low. */
export function ranked(m: Market) {
  return m.outcomes
    .map((name, i) => ({ name: name.trim(), i, p: m.odds[i] ?? null, won: m.payout ? m.payout[i] !== "0" && m.payout[i] !== undefined : false }))
    .filter((o) => o.name !== "Invalid")
    .sort((a, b) => (b.p ?? -1) - (a.p ?? -1));
}

export function leader(m: Market) {
  const r = ranked(m);
  if (m.payout) {
    const w = r.find((o) => o.won);
    if (w) return w;
  }
  return r[0];
}

/** Scalar markets: expected value implied by UP/DOWN prices. */
export function scalarEstimate(m: Market) {
  if (!m.lo || !m.hi) return null;
  const lo = Number(m.lo) / 1e18,
    hi = Number(m.hi) / 1e18;
  const di = m.outcomes.indexOf("DOWN"),
    ui = m.outcomes.indexOf("UP");
  const d = m.odds[di],
    u = m.odds[ui];
  if (d == null || u == null || d + u === 0) return { lo, hi, value: null as number | null };
  return { lo, hi, value: lo + ((hi - lo) * u) / (u + d) };
}

/** Unit hint from "[...]" suffix in the question, e.g. "[%]" or "[USD]". */
export function unitOf(name: string) {
  const m = name.match(/\[([^\]]{1,24})\]\s*$/);
  return m ? m[1] : "";
}
export const stripUnit = (name: string) => name.replace(/\s*\[[^\]]{1,24}\]\s*$/, "").trim();

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function usd(n: number, digits = 0) {
  if (!isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e4) return `$${(n / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
}

export function pct(p: number | null | undefined, digits?: number) {
  if (p == null || !isFinite(p)) return "—";
  const d = digits ?? (p < 1 && p > 0 ? 1 : p < 10 ? 1 : 0);
  return `${p.toFixed(d)}%`;
}

export function num(n: number, digits = 0) {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function compact(n: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export const short = (a?: string | null, n = 4) => (a ? `${a.slice(0, 2 + n)}…${a.slice(-n)}` : "—");

export function date(ts: number, withYear = true) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

export function ago(ts: number, now = Date.now() / 1000) {
  const s = Math.max(0, now - ts);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function until(ts: number, now = Date.now() / 1000) {
  const s = ts - now;
  if (s <= 0) return "closed";
  if (s < 3600) return `${Math.ceil(s / 60)}m left`;
  if (s < 86400) return `${Math.ceil(s / 3600)}h left`;
  if (s < 86400 * 60) return `${Math.ceil(s / 86400)}d left`;
  return date(ts);
}

export const marketPath = (m: Pick<Market, "chainId" | "id">) => `/app/market/${m.chainId}/${m.id}`;
export const seerUrl = (m: Pick<Market, "chainId" | "id">) => `https://app.seer.pm/markets/${m.chainId}/${m.id}`;
