import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppGlyph, Arrow, Icon, cx, type AppKey } from "../ui/kit";
import type { Market } from "../data/seer";
import { CHAINS, ago, chainName, leader, marketPath, pct, usd, type Kind, type Status } from "../data/market";
import { homeApp } from "../data/featured";

/*
  Seer App overview: a bento of the whole index.
  Colour-blocked tiles (ink, violet, white) carry different jobs, so the eye moves
  from the money (ink) to the apps (violet) to the evidence (white).
*/

type Row = { m: Market; kind: Kind; status: Status };
const INK = "#14121E";
const LIFE: { s: Status; c: string }[] = [
  { s: "Trading", c: "#7D33FF" },
  { s: "Reporting", c: "#14121E" },
  { s: "Disputed", c: "#E8851F" },
  { s: "Resolved", c: "#BFBFE6" },
];
const CRUDE = /blowjob|porn|\bsex\b|fuck|\bdick\b/i;
const GRIM = /attack|war\b|troops|hostilit|regime|militant|kill|strike|deport/i;

export function Overview({
  rows,
  counts,
  stats,
  now,
  q,
  onSearch,
  onChain,
  onStatus,
}: {
  rows: Row[];
  counts: { s: Record<string, number>; c: Record<number, number> };
  stats: { vol: number; liq: number; oi: number };
  now: number;
  q: string;
  onSearch: (v: string) => void;
  onChain: (c: number) => void;
  onStatus: (s: Status) => void;
}) {
  const total = rows.length;
  const trading = counts.s["Trading"] ?? 0;

  const movers = useMemo(
    () =>
      rows
        .filter((r) => r.status !== "Resolved" && leader(r.m)?.p != null && r.m.name.length < 90 && !CRUDE.test(r.m.name) && !GRIM.test(r.m.name) && !/\[/.test(r.m.name))
        .sort((a, b) => b.m.vol - a.m.vol)
        .slice(0, 3),
    [rows],
  );

  const apps = useMemo(() => {
    const c: Partial<Record<AppKey, number>> = {};
    for (const r of rows) {
      const h = homeApp(r.m);
      if (h) c[h.app] = (c[h.app] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const newest = useMemo(() => {
    const list = rows
      .filter((r) => r.m.created && !CRUDE.test(r.m.name))
      .sort((a, b) => (b.m.created ?? 0) - (a.m.created ?? 0))
      .slice(0, 6);
    const groups: { label: string; items: Row[] }[] = [];
    for (const r of list) {
      const d = new Date((r.m.created ?? 0) * 1000);
      const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
      const g = groups.find((x) => x.label === label);
      if (g) g.items.push(r);
      else groups.push({ label, items: [r] });
    }
    return groups;
  }, [rows]);

  const chains = Object.keys(counts.c)
    .map(Number)
    .sort((a, b) => (counts.c[b] ?? 0) - (counts.c[a] ?? 0))
    .slice(0, 3);

  return (
    <section>
      <div className="mx-auto max-w-[1600px] px-4 md:px-6 pt-10 pb-12">
        {/* Greeting + controls */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[14px] text-text-2">
              <AppGlyph app="app" className="h-5 w-5 text-text" /> Seer App
            </div>
            <h1 className="text-[44px] md:text-[60px] leading-[0.95] tracking-[-0.045em] font-medium">Every market, on the record.</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-card px-4 shadow-card md:w-[420px] md:flex-none focus-within:ring-2 focus-within:ring-signal">
              <Icon name="search" className="h-[18px] w-[18px] text-muted" />
              <span className="sr-only">Search markets</span>
              <input
                value={q}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Question, outcome or 0x address"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
              />
            </label>
            <a href="https://app.seer.pm/create-market" target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-text px-5 text-[15px] font-medium text-bg hover:opacity-90">
              <span className="text-[18px] leading-none">+</span> Create market
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          {/* Ink: the money */}
          <div className="relative overflow-hidden rounded-[30px] p-6 text-white xl:col-span-3 xl:row-span-2 flex flex-col" style={{ background: INK }}>
            <CornerLink to="#index" dark label="Jump to the index" />
            <div className="text-[13px] text-white/60">Lifetime volume</div>
            <div className="mt-2 text-[40px] leading-none tracking-[-0.03em]">
              {usd(stats.vol).replace(/(\.\d+)?([KM])$/, "")}
              <span className="text-white/45">{usd(stats.vol).match(/(\.\d+)?[KM]$/)?.[0] ?? ""}</span>
            </div>
            <div className="mt-6 flex gap-2.5">
              {[
                { i: "search" as const, l: "Search", on: () => document.getElementById("index")?.scrollIntoView({ behavior: "smooth" }) },
                { i: "filter" as const, l: "Trading only", on: () => onStatus("Trading") },
                { i: "code" as const, l: "API", href: "https://seer-3.gitbook.io/seer-documentation" },
                { i: "bookmark" as const, l: "Docs", href: "https://seer-3.gitbook.io/seer-documentation" },
              ].map((b) =>
                b.href ? (
                  <a key={b.l} href={b.href} target="_blank" rel="noreferrer" aria-label={b.l} title={b.l} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                    <Icon name={b.i} className="h-[18px] w-[18px]" />
                  </a>
                ) : (
                  <button key={b.l} onClick={b.on} aria-label={b.l} title={b.l} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20 cursor-pointer">
                    <Icon name={b.i} className="h-[18px] w-[18px]" />
                  </button>
                ),
              )}
            </div>

            <div className="mt-8 text-[13px] text-white/60">Trading right now</div>
            <div className="mt-3 flex h-10 items-center gap-1 rounded-full bg-white/[0.06] p-1">
              <div className="relative h-full rounded-full bg-signal" style={{ width: `${Math.max(12, (trading / Math.max(1, total)) * 100)}%` }}>
                <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/25 text-[10px]">⋮</span>
              </div>
              <div className="h-full flex-1 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.18) 0 2px, transparent 2px 7px)" }} />
            </div>
            <div className="mt-3 flex items-baseline gap-2 text-[13px] text-white/60">
              <span className="text-[22px] text-white">{trading.toLocaleString()}</span> of {total.toLocaleString()} markets are open to trade
            </div>

            <div className="mt-6 space-y-2">
              {chains.map((c) => (
                <button key={c} onClick={() => onChain(c)} className="flex w-full items-center gap-3 rounded-[18px] bg-white/[0.07] p-3 text-left hover:bg-white/[0.12] cursor-pointer">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[10px] font-semibold" style={{ color: INK }}>
                    {CHAINS[c]?.short ?? c}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[17px]">{(counts.c[c] ?? 0).toLocaleString()}</span>
                    <span className="block text-[12px] text-white/55">markets on {chainName(c)}</span>
                  </span>
                  <Arrow dir="up-right" className="h-4 w-4 text-[#BFBFE6]" />
                </button>
              ))}
            </div>
          </div>

          {/* Stacked movers */}
          <Tile className="xl:col-span-3" title="Most traded, still open" to="#index">
            <div className="mt-4 -space-y-3">
              {movers.map((r, i) => {
                const l = leader(r.m);
                const tone = i === 0 ? { bg: INK, fg: "#fff", sub: "rgb(255 255 255 / 0.6)" } : i === 1 ? { bg: "#7D33FF", fg: "#fff", sub: "rgb(255 255 255 / 0.75)" } : { bg: "var(--card)", fg: "var(--text)", sub: "var(--text-2)" };
                return (
                  <Link
                    key={r.m.id}
                    to={marketPath(r.m)}
                    className={cx("relative block rounded-[22px] p-4 pb-6 transition-transform hover:-translate-y-0.5", i === 2 && "border border-line")}
                    style={{ background: tone.bg, color: tone.fg, zIndex: 3 - i }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[10px] font-semibold" style={{ background: i === 2 ? INK : "#fff", color: i === 2 ? "#fff" : INK }}>
                        {CHAINS[r.m.chainId]?.short}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[14px] leading-snug">{r.m.name}</span>
                        <span className="mt-1 block text-[12px]" style={{ color: tone.sub }}>
                          {usd(r.m.vol)} traded
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[15px]">{pct(l?.p, 0)}</span>
                        <span className="block max-w-[64px] truncate text-[11px]" style={{ color: tone.sub }}>
                          {l?.name}
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Tile>

          {/* Resolution */}
          <Tile className="xl:col-span-3" title="Waiting on an answer">
            <p className="mt-1 text-[13px] text-text-2">Markets past their opening date, answered on Reality.eth and disputed in Kleros.</p>
            <div className="mt-5 flex items-center">
              {[
                { t: "R.eth", bg: INK, fg: "#fff" },
                { t: "Kleros", bg: "#7D33FF", fg: "#fff" },
                { t: "sDAI", bg: "#E0E2F5", fg: INK },
              ].map((b, i) => (
                <span key={b.t} className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-[var(--card)] text-[11px] font-semibold" style={{ background: b.bg, color: b.fg, marginLeft: i ? -12 : 0 }}>
                  {b.t}
                </span>
              ))}
              <button onClick={() => onStatus("Reporting")} className="ml-3 rounded-full bg-nested px-4 py-2.5 text-left hover:bg-line cursor-pointer">
                <span className="block text-[20px] leading-none">{(counts.s["Reporting"] ?? 0).toLocaleString()}</span>
                <span className="block text-[11px] text-text-2">reporting</span>
              </button>
            </div>
            <div className="mt-7 flex h-3 overflow-hidden rounded-full bg-nested" aria-hidden>
              {LIFE.map((x) => (
                <span key={x.s} style={{ width: `${((counts.s[x.s] ?? 0) / Math.max(1, total)) * 100}%`, background: x.c }} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {LIFE.map((x) => (
                <button key={x.s} onClick={() => onStatus(x.s)} className="flex items-center gap-2 text-left text-[13px] cursor-pointer hover:text-signal-ink">
                  <span className="h-2.5 w-2.5 shrink-0 rotate-45 rounded-[2px]" style={{ background: x.c }} />
                  <span className="flex-1 text-text-2">{x.s}</span>
                  <span>{(counts.s[x.s] ?? 0).toLocaleString()}</span>
                </button>
              ))}
            </div>
          </Tile>

          {/* Violet app tiles */}
          <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-3 xl:row-span-1">
            {(
              [
                { k: "deep", n: "Deep", s: "markets" },
                { k: "futarchy", n: "Futarchy", s: "markets" },
                { k: "opportunity", n: "Opportunity", s: "contests" },
                { k: "risk", n: "Risk", s: "markets" },
              ] as { k: AppKey; n: string; s: string }[]
            ).map((a, i) => (
              <Link
                key={a.k}
                to={`/${a.k}`}
                className="group relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-[24px] p-4 transition-transform hover:-translate-y-0.5"
                style={{ background: i === 0 || i === 3 ? "#7D33FF" : "#E0E2F5", color: i === 0 || i === 3 ? "#fff" : INK }}
              >
                <AppGlyph app={a.k} className="absolute -right-3 -top-3 h-20 w-20 opacity-25 transition-transform group-hover:scale-110" />
                <span className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: i === 0 || i === 3 ? "rgb(255 255 255 / 0.18)" : INK, color: "#fff" }}>
                  <AppGlyph app={a.k} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[16px] font-medium leading-tight">{a.n}</span>
                  <span className="block text-[12px] opacity-75">
                    {(apps[a.k] ?? 0).toLocaleString()} {a.s}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {/* Creation curve */}
          <Tile className="md:col-span-2 xl:col-span-6" title="New markets per month">
            <Curve rows={rows} now={now} />
          </Tile>

          {/* Newest, grouped like a statement */}
          <Tile className="md:col-span-2 xl:col-span-3" title="Just created" to="#index">
            <div className="mt-2 space-y-4">
              {newest.map((g) => (
                <div key={g.label}>
                  <div className="mb-2 text-[12px] text-muted">{g.label}</div>
                  <div className="space-y-3">
                    {g.items.slice(0, 3).map((r) => (
                      <Link key={r.m.id} to={marketPath(r.m)} className="flex items-center gap-3 group">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-text text-[10px] font-semibold text-bg">{CHAINS[r.m.chainId]?.short}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] group-hover:text-signal-ink">{r.m.name}</span>
                          <span className="block text-[12px] text-muted">{r.kind}</span>
                        </span>
                        <span className="text-right text-[12px] text-text-2">{ago(r.m.created ?? now, now)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({ title, to, className, children }: { title: string; to?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cx("relative rounded-[30px] bg-card p-6 shadow-card", className)}>
      {to && <CornerLink to={to} label={title} />}
      <h2 className="pr-14 text-[19px] font-medium tracking-[-0.02em]">{title}</h2>
      {children}
    </div>
  );
}

function CornerLink({ to, dark, label }: { to: string; dark?: boolean; label: string }) {
  return (
    <a
      href={to}
      aria-label={label}
      className={cx("absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border transition-colors", dark ? "border-white/20 text-white hover:bg-white/10" : "border-line text-text hover:bg-nested")}
    >
      <Arrow dir="up-right" className="h-4 w-4" />
    </a>
  );
}

/** Smooth curve of markets created per month, with a selectable month. */
function Curve({ rows, now }: { rows: Row[]; now: number }) {
  const months = useMemo(() => {
    const end = new Date(now * 1000);
    const list: { key: string; label: string; n: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
      list.push({ key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }).toLowerCase(), n: 0 });
    }
    for (const r of rows) {
      if (!r.m.created) continue;
      const d = new Date(r.m.created * 1000);
      const m = list.find((x) => x.key === `${d.getUTCFullYear()}-${d.getUTCMonth()}`);
      if (m) m.n++;
    }
    return list;
  }, [rows, now]);
  const best = months.reduce((a, m, i) => (m.n > months[a].n ? i : a), 0);
  const [sel, setSel] = useState<number | null>(null);
  const s = sel ?? best;

  const W = 640,
    H = 190,
    pad = 14;
  const max = Math.max(1, ...months.map((m) => m.n));
  const pts = months.map((m, i) => [pad + (i * (W - pad * 2)) / (months.length - 1), H - 18 - (m.n / max) * (H - 60)] as const);
  const d = pts.reduce((acc, p, i, a) => {
    if (i === 0) return `M${p[0]},${p[1]}`;
    const p0 = a[i - 2] ?? a[i - 1],
      p1 = a[i - 1],
      p3 = a[i + 1] ?? p;
    const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6];
    const c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6];
    return `${acc} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p[0]},${p[1]}`;
  }, "");
  const prev = s > 0 ? months[s - 1] : null;

  return (
    <div className="mt-12">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Markets created per month; ${months[s].label} has ${months[s].n}`}>
          <defs>
            <linearGradient id="curvefill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7D33FF" stopOpacity="0.18" />
              <stop offset="1" stopColor="#7D33FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`} fill="url(#curvefill)" />
          <path d={d} fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />
          <line x1={pts[s][0]} x2={pts[s][0]} y1={pts[s][1]} y2={H} stroke="var(--line-strong)" strokeDasharray="3 4" />
          <circle cx={pts[s][0]} cy={pts[s][1]} r="9" fill="var(--card)" stroke="var(--text)" strokeWidth="2.2" />
          <circle cx={pts[s][0]} cy={pts[s][1]} r="3.5" fill="#7D33FF" />
        </svg>
        <div className="pointer-events-none absolute flex -translate-x-1/2 gap-1.5" style={{ left: `${(pts[s][0] / W) * 100}%`, top: `calc(${(pts[s][1] / H) * 100}% - 44px)` }}>
          {prev && <span className="rounded-full bg-nested px-2.5 py-1 text-[12px] text-text-2 whitespace-nowrap">{prev.n} in {prev.label}</span>}
          <span className="rounded-full bg-signal px-2.5 py-1 text-[12px] text-white whitespace-nowrap">{months[s].n} new</span>
        </div>
      </div>
      <div className="mt-3 flex justify-between gap-1 overflow-x-auto" role="group" aria-label="Month">
        {months.map((m, i) => (
          <button
            key={m.key}
            onClick={() => setSel(i)}
            aria-pressed={i === s}
            className={cx("h-8 min-w-[40px] rounded-full border px-2 text-[12px] transition-colors cursor-pointer", i === s ? "border-text bg-text text-bg" : "border-line text-text-2 hover:border-line-strong")}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
