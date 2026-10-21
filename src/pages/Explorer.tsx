import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Shell, Container } from "../ui/Shell";
import { AppGlyph, Badge, Chip, Diamond, Icon, LiveTag, ProbBar, Seg, cx } from "../ui/kit";
import { useMarkets, useNow, type Market } from "../data/seer";
import { CHAINS, ago, chainName, date, kindOf, leader, marketPath, pct, scalarEstimate, statusOf, stripUnit, unitOf, until, usd, type Kind, type Status } from "../data/market";

const KINDS: Kind[] = ["Categorical", "Multi-categorical", "Scalar", "Multi-scalar", "Futarchy"];
const STATUSES: Status[] = ["Trading", "Reporting", "Disputed", "Resolved"];
type Sort = "vol" | "liq" | "new" | "closing";
const PAGE = 40;

export default function Explorer() {
  const { markets, liveAt, snapshotAt, ready } = useMarkets();
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const kind = (params.get("type") as Kind | null) ?? null;
  const status = (params.get("status") as Status | null) ?? null;
  const chain = params.get("chain") ? Number(params.get("chain")) : null;
  const sort = (params.get("sort") as Sort) ?? "liq";
  const liquid = params.get("liquid") === "1";
  const cond = params.get("cond") === "1";
  const [page, setPage] = useState(0);
  const nav = useNavigate();

  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v == null || v === "") p.delete(k);
    else p.set(k, v);
    setParams(p, { replace: true });
  };
  useEffect(() => setPage(0), [q, kind, status, chain, sort, liquid, cond]);

  const enriched = useMemo(() => markets.map((m) => ({ m, kind: kindOf(m), status: statusOf(m, now) })), [markets, now]);

  const counts = useMemo(() => {
    const k: Record<string, number> = {},
      s: Record<string, number> = {},
      c: Record<number, number> = {};
    for (const e of enriched) {
      k[e.kind] = (k[e.kind] || 0) + 1;
      s[e.status] = (s[e.status] || 0) + 1;
      c[e.m.chainId] = (c[e.m.chainId] || 0) + 1;
    }
    return { k, s, c };
  }, [enriched]);

  const stats = useMemo(() => {
    let vol = 0,
      liq = 0,
      oi = 0,
      v24 = 0;
    for (const { m } of enriched) {
      vol += m.vol;
      liq += m.liq;
      oi += m.oi;
      if (m.created && now - m.created < 86400 * 30) v24++;
    }
    return { vol, liq, oi, recent: v24 };
  }, [enriched, now]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const isAddr = /^0x[0-9a-f]{3,}$/i.test(s);
    const r = enriched.filter(({ m, kind: k, status: st }) => {
      if (kind && k !== kind) return false;
      if (status && st !== status) return false;
      if (chain && m.chainId !== chain) return false;
      if (liquid && m.liq < 10) return false;
      if (cond && !m.parent) return false;
      if (s) {
        if (isAddr) return m.id.toLowerCase().startsWith(s) || (m.cond ?? "").toLowerCase().startsWith(s);
        return m.name.toLowerCase().includes(s) || m.outcomes.some((o) => o.toLowerCase().includes(s));
      }
      return true;
    });
    const by: Record<Sort, (a: (typeof r)[0], b: (typeof r)[0]) => number> = {
      vol: (a, b) => b.m.vol - a.m.vol,
      liq: (a, b) => b.m.liq - a.m.liq,
      new: (a, b) => (b.m.created ?? 0) - (a.m.created ?? 0),
      closing: (a, b) => {
        const fa = a.m.open > now ? a.m.open : Infinity,
          fb = b.m.open > now ? b.m.open : Infinity;
        return fa - fb;
      },
    };
    return r.sort(by[sort]);
  }, [enriched, q, kind, status, chain, liquid, cond, sort, now]);

  const top = useMemo(() => [...enriched].sort((a, b) => b.m.vol - a.m.vol).slice(0, 5), [enriched]);
  const newest = useMemo(() => [...enriched].sort((a, b) => (b.m.created ?? 0) - (a.m.created ?? 0)).slice(0, 5), [enriched]);
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.ceil(rows.length / PAGE);

  return (
    <Shell app="app" wide>
      {/* Index header */}
      <div className="border-b border-line bg-card">
        <Container wide className="py-10 md:py-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <AppGlyph app="app" className="h-6 w-6 text-text" />
                <LiveTag live={!!liveAt} at={liveAt ?? snapshotAt} />
              </div>
              <h1 className="display text-[44px] md:text-[64px]">
                Every market,
                <br />
                <span className="text-muted">on the record.</span>
              </h1>
            </div>
            <p className="max-w-sm text-[14px] leading-relaxed text-text-2">
              The general index for Seer. Search any question, outcome, market address or condition ID across Gnosis, Ethereum, Optimism and Base.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-line-strong bg-bg px-4 focus-within:border-signal">
            <Icon name="search" className="h-5 w-5 text-muted" />
            <input
              value={q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Search by question, outcome, 0x market address or condition ID"
              className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
              aria-label="Search markets"
            />
            {q && (
              <button onClick={() => set("q", null)} className="text-muted hover:text-text cursor-pointer" aria-label="Clear">
                <Icon name="x" />
              </button>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-5">
            {[
              ["Markets", markets.length.toLocaleString(), `${counts.s["Trading"] ?? 0} trading now`],
              ["Lifetime volume", usd(stats.vol), "Swaps across all pools"],
              ["Open interest", usd(stats.oi), "Collateral in outcome tokens"],
              ["Pool liquidity", usd(stats.liq), "Swapr · Uniswap v3"],
              ["New this month", stats.recent.toLocaleString(), `${Object.keys(counts.c).length} chains`],
            ].map(([k, v, s], i) => (
              <div key={k} className={cx("min-w-0", i > 0 && "md:border-l md:border-line md:pl-6")}>
                <div className="eyebrow mb-2">{k}</div>
                <div className="num text-[24px] md:text-[28px] leading-none">{ready ? v : "—"}</div>
                <div className="mt-2 text-[12px] text-muted">{s}</div>
              </div>
            ))}
          </div>
        </Container>
      </div>

      <Container wide className="py-8">
        {/* Etherscan-style twin feeds */}
        {!q && !kind && !status && !chain && (
          <div className="mb-10 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
            <Feed title="Most traded" rows={top} right={(e) => usd(e.m.vol)} nav={nav} />
            <Feed title="Newest markets" rows={newest} right={(e) => (e.m.created ? ago(e.m.created, now) : "—")} nav={nav} />
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Filters */}
          <aside className="space-y-7 lg:sticky lg:top-24 self-start">
            <FilterGroup title="Market type">
              <FilterRow active={!kind} onClick={() => set("type", null)} label="All types" count={markets.length} />
              {KINDS.map((k) => (
                <FilterRow key={k} active={kind === k} onClick={() => set("type", kind === k ? null : k)} label={k} count={counts.k[k] ?? 0} />
              ))}
            </FilterGroup>
            <FilterGroup title="Status">
              {STATUSES.map((s) => (
                <FilterRow key={s} active={status === s} onClick={() => set("status", status === s ? null : s)} label={s} count={counts.s[s] ?? 0} />
              ))}
            </FilterGroup>
            <FilterGroup title="Chain">
              {Object.keys(counts.c)
                .map(Number)
                .sort((a, b) => (counts.c[b] ?? 0) - (counts.c[a] ?? 0))
                .map((c) => (
                  <FilterRow key={c} active={chain === c} onClick={() => set("chain", chain === c ? null : String(c))} label={CHAINS[c]?.name ?? String(c)} count={counts.c[c] ?? 0} />
                ))}
            </FilterGroup>
            <FilterGroup title="Only">
              <FilterRow active={liquid} onClick={() => set("liquid", liquid ? null : "1")} label="With pool liquidity" />
              <FilterRow active={cond} onClick={() => set("cond", cond ? null : "1")} label="Conditional markets" />
            </FilterGroup>
          </aside>

          {/* Table */}
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[14px] text-text-2">
                <span className="num text-text">{rows.length.toLocaleString()}</span> markets
                {(kind || status || chain || liquid || cond || q) && (
                  <button onClick={() => setParams({}, { replace: true })} className="ml-3 text-signal-ink hover:underline cursor-pointer">
                    Clear filters
                  </button>
                )}
              </div>
              <Seg
                size="sm"
                value={sort}
                onChange={(v) => set("sort", v === "liq" ? null : v)}
                options={[
                  { value: "liq", label: "Liquidity" },
                  { value: "vol", label: "Volume" },
                  { value: "new", label: "Newest" },
                  { value: "closing", label: "Closing soon" },
                ]}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_220px_96px_96px_110px] gap-4 border-b border-line px-5 py-3 eyebrow">
                <span>Market</span>
                <span>Market estimate</span>
                <span className="text-right">Volume</span>
                <span className="text-right">Liquidity</span>
                <span className="text-right">Status</span>
              </div>
              {!ready &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="border-b border-line px-5 py-5">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-nested" />
                  </div>
                ))}
              {ready && pageRows.length === 0 && <div className="p-12 text-center text-[14px] text-muted">No market matches. Try an outcome name or a 0x address.</div>}
              {pageRows.map(({ m, kind: k, status: st }) => (
                <MarketRow key={m.id} m={m} kind={k} status={st} now={now} />
              ))}
            </div>

            {pages > 1 && (
              <div className="mt-5 flex items-center justify-between text-[13px]">
                <span className="text-muted">
                  Page <span className="num text-text">{page + 1}</span> of <span className="num">{pages}</span>
                </span>
                <div className="flex gap-2">
                  <Chip onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Chip>
                  <Chip onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>Next</Chip>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Shell>
  );
}

function MarketRow({ m, kind, status, now }: { m: Market; kind: Kind; status: Status; now: number }) {
  const l = leader(m);
  const sc = kind === "Scalar" ? scalarEstimate(m) : null;
  const unit = unitOf(m.name);
  return (
    <Link to={marketPath(m)} className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 transition-colors hover:bg-nested/60 md:grid-cols-[minmax(0,1fr)_220px_96px_96px_110px] md:items-center md:gap-4">
      <div className="min-w-0">
        <div className="truncate text-[14.5px] text-text">{stripUnit(m.name)}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
          <Badge tone="outline">{kind}</Badge>
          {m.parent && <Badge tone="outline">Conditional</Badge>}
          {m.ver === "verified" && <Badge tone="signal">Verified</Badge>}
          <span className="num">{chainName(m.chainId)}</span>
          <span>·</span>
          <span className="num">{m.id.slice(0, 8)}</span>
          <span>·</span>
          <span>{m.outcomes.filter((o) => o !== "Invalid").length} outcomes</span>
        </div>
      </div>
      <div className="min-w-0">
        {sc && sc.value != null ? (
          <ScalarMini lo={sc.lo} hi={sc.hi} v={sc.value} unit={unit} />
        ) : l && (l.p != null || l.won) ? (
          <>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate text-text-2">
                {l.won && <span className="mr-1 text-signal-ink">✓</span>}
                {l.name}
              </span>
              <span className={cx("num shrink-0", l.won ? "text-text-2" : "text-text")}>{l.won ? "Resolved" : pct(l.p)}</span>
            </div>
            <ProbBar p={l.won ? 100 : l.p} on={!l.won} />
          </>
        ) : (
          <span className="text-[12px] text-muted">No pool price</span>
        )}
      </div>
      <div className="num text-[13px] md:text-right">
        <span className="md:hidden eyebrow mr-2">Vol</span>
        {usd(m.vol)}
      </div>
      <div className="num text-[13px] text-text-2 md:text-right">
        <span className="md:hidden eyebrow mr-2">Liq</span>
        {usd(m.liq)}
      </div>
      <div className="md:text-right">
        <StatusPill status={status} />
        <div className="mt-1 text-[11px] text-muted">{status === "Trading" ? until(m.open, now) : status === "Resolved" ? "Final" : date(m.open, false)}</div>
      </div>
    </Link>
  );
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-[12px]", status === "Trading" ? "text-text" : status === "Disputed" ? "text-alert" : "text-text-2")}>
      <span className={cx("h-1.5 w-1.5 rotate-45", status === "Trading" ? "bg-signal" : status === "Disputed" ? "bg-alert" : status === "Reporting" ? "bg-text-2" : "bg-line-strong")} />
      {status}
    </span>
  );
}

function ScalarMini({ lo, hi, v, unit }: { lo: number; hi: number; v: number; unit: string }) {
  const f = (x: number) => (Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : Math.abs(x) >= 1e3 ? `${(x / 1e3).toFixed(1)}K` : x.toFixed(x < 10 ? 2 : 1));
  const p = hi > lo ? ((v - lo) / (hi - lo)) * 100 : 50;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-text-2">Estimate</span>
        <span className="num text-text">
          {f(v)}
          {unit && <span className="text-muted"> {unit}</span>}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-nested">
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${p}%` }}>
          <Diamond size={11} />
        </span>
      </div>
      <div className="mt-1 flex justify-between num text-[10px] text-muted">
        <span>{f(lo)}</span>
        <span>{f(hi)}</span>
      </div>
    </div>
  );
}

function Feed({ title, rows, right, nav }: { title: string; rows: { m: Market; kind: Kind; status: Status }[]; right: (e: { m: Market }) => string; nav: (p: string) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <span className="text-[14px] font-medium">{title}</span>
        <span className="eyebrow">Live</span>
      </div>
      {rows.map((e) => {
        const l = leader(e.m);
        return (
          <button key={e.m.id} onClick={() => nav(marketPath(e.m))} className="flex w-full items-center gap-4 border-b border-line px-5 py-3 text-left last:border-b-0 hover:bg-nested/60 cursor-pointer">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-nested">
              <span className="eyebrow !text-[9px] !text-text-2">{CHAINS[e.m.chainId]?.short ?? "?"}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px]">{stripUnit(e.m.name)}</span>
              <span className="block truncate text-[12px] text-muted">
                {e.kind}
                {l?.p != null && (
                  <>
                    {" · "}
                    <span className="text-text-2">{l.name}</span> <span className="num text-signal-ink">{pct(l.p)}</span>
                  </>
                )}
              </span>
            </span>
            <span className="num shrink-0 text-[13px] text-text-2">{right(e)}</span>
          </button>
        );
      })}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2.5">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterRow({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx("flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] transition-colors cursor-pointer", active ? "bg-text text-bg" : "text-text-2 hover:bg-card hover:text-text")}
    >
      <span className={cx("h-2 w-2 rotate-45 rounded-[1px]", active ? "bg-signal" : "border border-line-strong")} />
      <span className="flex-1 truncate">{label}</span>
      {count != null && <span className={cx("num text-[11px]", active ? "text-bg/70" : "text-muted")}>{count.toLocaleString()}</span>}
    </button>
  );
}
