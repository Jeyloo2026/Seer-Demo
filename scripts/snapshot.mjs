// Pulls a snapshot of live Seer data from the public app.seer.pm API into public/data.
// The demos load this first (instant, never empty) and then refresh live in the browser.
import { mkdir, writeFile } from "node:fs/promises";

const API = "https://app.seer.pm/.netlify/functions";
const OUT = new URL("../public/data/", import.meta.url);

// Markets that anchor each interface (all real, on-chain).
export const FEATURED = {
  rebrand: { id: "0xe7850b0d928aa40ab8732bd323fa4f6ef3c24b8a", chainId: 100 },
  devcon: { id: "0xc2b8e25675db9977ad14bca62b655e4aa6b36683", chainId: 100 },
  jobboard: { id: "0x8b3c7f3f09f6a85353926d8ee0f12decc1c9a5e8", chainId: 100 },
  deepRound2: { id: "0xc6c82f5ff9b57722f4831d1dbcae3809cf12c0b9", chainId: 10 },
  deepRound1: { id: "0xb88275fe4e2494e04cea8fb5e9d913aa48add581", chainId: 10 },
  pd: { id: "0xc84786b06390f11ded0dd362e27fc881b540e6f2", chainId: 100 },
  lepen: null,
};

const JUNK = /(^\s*$|\btest|test\d|^t-\[|xxx|asdf|lorem|^\[\]|minimal test|feature x|^proposal-|futarchy-static|MarketName|qwe|sss\b)/i;

async function post(fn, body) {
  const r = await fetch(`${API}/${fn}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${fn} ${r.status}`);
  return r.json();
}
async function get(fn, qs) {
  const r = await fetch(`${API}/${fn}?${new URLSearchParams(qs)}`);
  if (!r.ok) throw new Error(`${fn} ${r.status}`);
  return r.json();
}

export function trim(m) {
  return {
    id: m.id,
    chainId: m.chainId,
    type: m.type,
    name: (m.marketName || "").trim(),
    outcomes: m.outcomes,
    odds: m.odds,
    vol: Math.round((m.volumeUSD || 0) * 100) / 100,
    liq: Math.round((m.liquidityUSD || 0) * 100) / 100,
    oi: Math.round((m.openInterestUSD || 0) * 100) / 100,
    tpl: Number(m.templateId),
    lo: m.lowerBound,
    hi: m.upperBound,
    open: m.openingTs,
    fin: m.finalizeTs,
    created: m.blockTimestamp || null,
    parent: m.parentMarket?.id && !/^0x0+$/.test(m.parentMarket.id) ? m.parentMarket.id : null,
    parentOutcome: m.parentOutcome ?? null,
    cats: m.categories,
    ver: m.verification?.status || "not_verified",
    cond: m.conditionId,
    q: m.questionId,
    coll: m.collateralToken,
    coll1: m.collateralToken1,
    coll2: m.collateralToken2,
    tokens: m.wrappedTokens,
    reported: m.payoutReported,
    payout: m.payoutNumerators,
    creator: m.creator || null,
    url: m.url,
    questions: (m.questions || []).slice(0, 1).map((q) => ({
      id: q.id,
      arb: q.arbitrator,
      bond: q.bond,
      minBond: q.min_bond,
      timeout: q.timeout,
      opening: q.opening_ts,
      finalize: q.finalize_ts,
      arbitrating: q.is_pending_arbitration,
      answer: q.best_answer,
    })),
    nq: (m.questions || []).length,
  };
}

// List view: only what tables, search and cards need.
export function slim(m) {
  const r = {
    id: m.id, chainId: m.chainId, type: m.type, name: m.name, outcomes: m.outcomes,
    odds: m.odds.map((o) => (o == null ? null : Math.round(o * 100) / 100)),
    vol: Math.round(m.vol), liq: Math.round(m.liq), oi: Math.round(m.oi), tpl: m.tpl, open: m.open, fin: m.fin,
    created: m.created, ver: m.ver, nq: m.nq,
  };
  if (m.tpl === 1 || m.tpl === 3) { r.lo = m.lo; r.hi = m.hi; }
  if (m.parent) { r.parent = m.parent; r.parentOutcome = m.parentOutcome; }
  if (m.reported) r.payout = m.payout;
  if (m.cats?.length && !(m.cats.length === 1 && m.cats[0] === "misc")) r.cats = m.cats;
  if (m.questions[0]?.arbitrating) r.arbitrating = true;
  return r;
}

function dedupe(data) {
  const m = new Map();
  for (const d of data) m.set(d[0], d);
  return [...m.values()].sort((a, b) => a[0] - b[0]);
}

// Keep the series shape over time: bucket by time, keep the last point in each bucket.
function thin(data, max) {
  if (data.length <= max) return data;
  const t0 = data[0][0], t1 = data[data.length - 1][0], w = (t1 - t0) / max, out = new Map();
  for (const d of data) out.set(Math.min(max - 1, Math.floor((d[0] - t0) / w)), d);
  return [...out.values()];
}

function thinByIndex(data, max) {
  if (data.length <= max) return data;
  const step = data.length / max, out = [];
  for (let i = 0; i < max; i++) out.push(data[Math.floor(i * step)]);
  out.push(data[data.length - 1]);
  return out;
}

// market-chart returns one array per outcome of hourly pool snapshots; reduce to [ts, price].
export function chartToSeries(raw, outcomes) {
  return (raw || []).map((rows, i) => ({
    name: outcomes?.[i] ?? `#${i}`,
    data: (rows || [])
      .map((r) => {
        const a = Number(r.token0Price), b = Number(r.token1Price);
        const p = a > 0 && b > 0 ? Math.min(a, b) : 0;
        return [r.periodStartUnix, Math.round(p * 1e5) / 1e5];
      })
      .filter((d) => d[0]),
  })).map((s) => ({ ...s, data: thin(dedupe(s.data), 400) }));
}

async function main() {
  await mkdir(new URL("charts/", OUT), { recursive: true });
  const all = [];
  for (let page = 1; page < 10; page++) {
    const r = await post("markets-search", { limit: 1000, page });
    all.push(...r.markets);
    if (page >= r.pages) break;
  }
  const full = all.filter((m) => !JUNK.test(m.marketName || "")).map(trim);
  const markets = full.map(slim);
  await writeFile(new URL("markets.json", OUT), JSON.stringify({ at: Math.floor(Date.now() / 1000), markets }));
  console.log("markets", all.length, "->", markets.length);
  // Full records for the featured markets so their pages render complete before the live fetch.
  const ids = new Set(Object.values(FEATURED).filter(Boolean).map((f) => f.id));
  const top = [...full].sort((a, b) => b.vol - a.vol).slice(0, 60);
  for (const m of top) ids.add(m.id);
  await writeFile(new URL("details.json", OUT), JSON.stringify(full.filter((m) => ids.has(m.id))));

  for (const [key, ref] of Object.entries(FEATURED)) {
    if (!ref) continue;
    const m = all.find((x) => x.id === ref.id);
    try {
      const raw = await get("market-chart", { marketId: ref.id, chainId: ref.chainId });
      await writeFile(new URL(`charts/${ref.id}.json`, OUT), JSON.stringify(chartToSeries(raw, m?.outcomes)));
      console.log("chart", key, raw.length);
    } catch (e) {
      console.warn("chart failed", key, e.message);
    }
  }

  for (const app of ["deepfund", "opportunity", "all"]) {
    try {
      const lb = await get("get-pnl-leaderboard", { app, chainId: "all", limit: 25 });
      await writeFile(new URL(`leaderboard-${app}.json`, OUT), JSON.stringify(lb));
      console.log("leaderboard", app, lb.rows?.length);
    } catch (e) {
      console.warn("leaderboard failed", app, e.message);
    }
  }
}

main();
