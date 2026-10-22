import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Shell, Container } from "../ui/Shell";
import { APPS, AppGlyph, Arrow, Badge, Copy, Icon, Diamond, Empty, LiveTag, ProbBar, Seg, Skeleton, cx } from "../ui/kit";
import { LineChart } from "../ui/charts";
import { TradeTicket } from "../ui/Trade";
import { StatusPill } from "./Explorer";
import { useChart, useMarket, useMarkets, useNow, useTokenActivity, type Market } from "../data/seer";
import { KIND_NOTE, ago, chainName, date, explorer, kindOf, marketPath, num, pct, ranked, scalarEstimate, seerUrl, short, statusOf, stripUnit, unitOf, usd } from "../data/market";
import { homeApp } from "../data/featured";

type Tab = "outcomes" | "anatomy" | "holders" | "activity" | "raw";

export default function MarketPage() {
  const { chainId = "100", id = "" } = useParams();
  const cid = Number(chainId);
  const { market: m, error, liveAt } = useMarket(cid, id);
  const { markets } = useMarkets();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("outcomes");
  const [focus, setFocus] = useState<string | null>(null);
  const { series, live } = useChart(cid, id, m?.outcomes);

  const children = useMemo(() => (m ? markets.filter((x) => x.parent === m.id) : []), [markets, m]);
  const parent = m?.parent ? markets.find((x) => x.id === m.parent) : undefined;

  if (!m)
    return (
      <Shell app="app" wide>
        <Container wide className="py-16">
          {error ? <Empty>Market {short(id)} was not found on {chainName(cid)}.</Empty> : <Skeleton className="h-64" />}
        </Container>
      </Shell>
    );

  const kind = kindOf(m);
  const status = statusOf(m, now);
  const outs = ranked(m);
  const sc = kind === "Scalar" ? scalarEstimate(m) : null;
  const unit = unitOf(m.name);
  const home = homeApp(m);
  const homeMeta = home ? APPS.find((a) => a.key === home.app) : null;
  const realSeries = (series || []).filter((s) => s.name !== "Invalid");
  const lead = focus ?? outs[0]?.name ?? null;

  return (
    <Shell app="app" wide>
      <Container wide className="pt-8">
        <nav className="mb-6 flex items-center gap-2 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link to="/app" className="hover:text-text">
            Markets
          </Link>
          <span>/</span>
          <span>{chainName(m.chainId)}</span>
          <span>/</span>
          <span className="num text-text-2">{short(m.id, 6)}</span>
        </nav>

        {/* Header */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <div className={cx("relative isolate overflow-hidden rounded-[32px] p-7 md:p-9 shadow-card", status === "Trading" ? "tone-violet" : "tone-ink")}>
              <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rotate-45 rounded-[40px] border-[18px] border-white/10" aria-hidden />
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{kind}</Badge>
                {m.parent && <Badge tone="neutral">Conditional</Badge>}
                <Badge tone="neutral">{chainName(m.chainId)}</Badge>
                {m.ver === "verified" ? <Badge tone="neutral">Verified on Curate</Badge> : <Badge tone="neutral">{m.ver.replace("_", " ")}</Badge>}
                <span className="ml-1">
                  <StatusPill status={status} />
                </span>
                <LiveTag live={!!liveAt} at={liveAt} className="ml-auto" />
              </div>
              <h1 className="max-w-[24ch] text-[30px] md:text-[44px] font-medium leading-[1.04] tracking-[-0.035em]">{stripUnit(m.name)}</h1>
              <p className="mt-4 text-[14px] text-text-2">
                {KIND_NOTE[kind]} {unit && <span>Unit: {unit}.</span>}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: "Volume", v: usd(m.vol), cls: "bg-card" },
                { k: "Liquidity", v: usd(m.liq), cls: "bg-card" },
                { k: "Open interest", v: usd(m.oi), cls: "bg-card" },
                { k: status === "Trading" ? "Answer opens" : "Opened", v: date(m.open), cls: "bg-card" },
              ].map((x, i) => (
                <div key={x.k} className={cx("flex min-h-[112px] flex-col justify-between rounded-[26px] p-5 shadow-card", i === 0 ? "tone-ink" : x.cls)} style={i === 3 ? { background: "#E0E2F5", color: "#14121E" } : undefined}>
                  <span className="text-[13px] opacity-70">{x.k}</span>
                  <span className="num text-[26px] leading-none tracking-[-0.03em]">{x.v}</span>
                </div>
              ))}
            </div>

            {homeMeta && home && (
              <Link to={home.path} className="mt-4 flex items-center gap-4 rounded-[26px] bg-card p-4 pr-5 shadow-card transition-transform hover:-translate-y-0.5">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-text text-bg">
                  <AppGlyph app={home.app} className="h-6 w-6" />
                </span>
                <span className="flex-1 text-[14px]">
                  This market has a purpose-built view in <span className="font-medium">{homeMeta.name}</span>
                  <span className="text-text-2"> · {homeMeta.line}</span>
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-full border border-line-strong">
                  <Arrow dir="up-right" className="h-4 w-4" />
                </span>
              </Link>
            )}
          </div>
          <div className="lg:row-span-2">
            <div className="lg:sticky lg:top-24 space-y-4">
              <TradeTicket market={m} />
              <Lifecycle m={m} now={now} />
            </div>
          </div>

          {/* Body */}
          <div className="min-w-0">
            {/* Chart / estimate */}
            <div className="rounded-[30px] bg-card shadow-card p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                {sc && sc.value != null ? (
                  <div>
                    <div className="eyebrow mb-1">Market estimate</div>
                    <div className="num text-[32px] leading-none">
                      {num(sc.value, sc.value < 10 ? 2 : 1)} <span className="text-[16px] text-muted">{unit}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="eyebrow mb-1">{m.payout ? "Resolved" : "Leading"}</div>
                    <div className="text-[18px] font-medium">
                      {outs.find((o) => o.won)?.name ?? outs[0]?.name}{" "}
                      {!m.payout && <span className="num text-signal-ink">{pct(outs[0]?.p)}</span>}
                    </div>
                  </div>
                )}
                <span className="eyebrow">{live ? "Pool prices · hourly" : series ? "Pool prices · snapshot" : "Loading prices"}</span>
              </div>
              {series ? <LineChart series={realSeries} focus={lead} onFocus={setFocus} height={300} /> : <Skeleton className="h-[300px]" />}
              {sc && sc.value != null && <ScalarBar lo={sc.lo} hi={sc.hi} v={sc.value} unit={unit} />}
            </div>

            <div className="mt-8 mb-4 overflow-x-auto scroll-thin">
              <Seg
                value={tab}
                onChange={setTab}
                options={[
                  { value: "outcomes", label: `Outcomes · ${outs.length}` },
                  { value: "anatomy", label: "Contract" },
                  { value: "holders", label: "Holders" },
                  { value: "activity", label: "Transfers" },
                  { value: "raw", label: "JSON" },
                ]}
              />
            </div>

            {tab === "outcomes" && <Outcomes m={m} onHover={setFocus} focus={lead} />}
            {tab === "anatomy" && <Anatomy m={m} parent={parent} kids={children} />}
            {tab === "holders" && <Holders m={m} />}
            {tab === "activity" && <Activity m={m} now={now} />}
            {tab === "raw" && (
              <pre className="num max-h-[520px] overflow-auto rounded-[24px] bg-card shadow-card p-5 text-[12px] leading-5 text-text-2 scroll-thin">{JSON.stringify(m, null, 2)}</pre>
            )}

            {(parent || children.length > 0) && (
              <div className="mt-8">
                <div className="eyebrow mb-3">Conditional tree</div>
                <div className="rounded-[24px] bg-card shadow-card p-4">
                  {parent && (
                    <Link to={marketPath(parent)} className="flex items-center gap-3 rounded-xl p-2 hover:bg-nested">
                      <span className="eyebrow w-16">Parent</span>
                      <span className="truncate text-[14px]">{stripUnit(parent.name)}</span>
                    </Link>
                  )}
                  {children.slice(0, 12).map((c) => (
                    <Link key={c.id} to={marketPath(c)} className="flex items-center gap-3 rounded-xl p-2 hover:bg-nested">
                      <span className="eyebrow w-16">Child</span>
                      <span className="truncate text-[14px]">{stripUnit(c.name)}</span>
                      <span className="num ml-auto text-[12px] text-muted">{usd(c.vol)}</span>
                    </Link>
                  ))}
                  {children.length > 12 && <div className="p-2 text-[12px] text-muted">+{children.length - 12} more conditional markets</div>}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3 text-[13px]">
              <a href={seerUrl(m)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-text-2 hover:text-text">
                Open on app.seer.pm <Arrow dir="up-right" className="h-3.5 w-3.5" />
              </a>
              <a href={explorer(m.chainId, "address", m.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-text-2 hover:text-text">
                Contract on block explorer <Arrow dir="up-right" className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </Shell>
  );
}

function ScalarBar({ lo, hi, v, unit }: { lo: number; hi: number; v: number; unit: string }) {
  const p = hi > lo ? ((v - lo) / (hi - lo)) * 100 : 50;
  return (
    <div className="mt-6">
      <div className="relative h-2 rounded-full bg-nested">
        <div className="absolute inset-y-0 left-0 rounded-full bg-signal-soft" style={{ width: `${p}%` }} />
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${p}%` }}>
          <Diamond size={16} />
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-muted">
        <span className="num">
          DOWN pays at ≤ {num(lo, 2)} {unit}
        </span>
        <span className="num">
          UP pays at ≥ {num(hi, 2)} {unit}
        </span>
      </div>
    </div>
  );
}

function Outcomes({ m, onHover, focus }: { m: Market; onHover: (n: string | null) => void; focus: string | null }) {
  const outs = ranked(m);
  const max = Math.max(...outs.map((o) => o.p ?? 0), 1);
  return (
    <div className="overflow-hidden rounded-[30px] bg-card p-2 shadow-card" onMouseLeave={() => onHover(null)}>
      {outs.map((o, k) => (
        <div
          key={o.i}
          onMouseEnter={() => onHover(o.name)}
          className={cx("grid grid-cols-[40px_minmax(0,1fr)_88px] md:grid-cols-[40px_minmax(0,1fr)_200px_88px] items-center gap-4 rounded-[20px] px-3 py-2.5 transition-colors", o.won ? "tone-violet" : focus === o.name ? "bg-nested" : "hover:bg-nested")}
        >
          <span className={cx("num grid h-10 w-10 place-items-center rounded-full text-[13px]", o.won ? "bg-white text-[#7D33FF]" : k < 3 && !m.payout ? "bg-text text-bg" : "bg-nested text-text-2")}>{k + 1}</span>
          <span className="min-w-0 truncate text-[15px]">{o.name}</span>
          <span className="hidden md:block">
            <ProbBar h={12} p={m.payout ? (o.won ? 100 : 0) : ((o.p ?? 0) / max) * 100} on={(k === 0 && !m.payout) || o.won} />
          </span>
          <span className="flex justify-end">
            {m.payout ? (
              o.won ? (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] text-[#7D33FF]">
                  <Icon name="check" className="h-3.5 w-3.5" /> Won
                </span>
              ) : (
                <span className="inline-flex h-8 items-center rounded-full bg-nested px-3 text-[12px] text-text-2">Lost</span>
              )
            ) : (
              <span className="num text-[16px] tracking-[-0.02em]">{pct(o.p)}</span>
            )}
          </span>
        </div>
      ))}
      {m.outcomes.includes("Invalid") && (
        <div className="flex items-center gap-4 px-4 pt-3 pb-2 text-[12px] text-muted">
          <span className="hatch h-3 w-6 rounded-full" />
          Invalid · redeems collateral pro rata if the question cannot be answered
        </div>
      )}
    </div>
  );
}

function Anatomy({ m, parent, kids }: { m: Market; parent?: Market; kids: Market[] }) {
  const q = m.questions?.[0];
  const rows: [string, React.ReactNode][] = [
    ["Market", <Addr key="m" chain={m.chainId} a={m.id} />],
    ["Condition ID", <Hex key="c" v={m.cond} />],
    ["Question ID", <Hex key="q" v={m.q} />],
    ["Collateral", <Addr key="col" chain={m.chainId} a={m.coll} kind="token" />],
    ["Template", <span key="t">{["", "Numeric (Reality.eth template 1)", "Single select (template 2)", "Multi select (template 3)"][m.tpl] ?? m.tpl}</span>],
    ["Questions", <span key="nq">{m.nq} Reality.eth question{m.nq === 1 ? "" : "s"}</span>],
    ["Arbitrator", q ? <Addr key="arb" chain={m.chainId} a={q.arb} /> : "—"],
    ["Min. bond", q ? <span key="b" className="num">{num(Number(q.minBond) / 1e18, 2)}</span> : "—"],
    ["Answer timeout", q ? <span key="to">{Math.round(q.timeout / 3600)} h</span> : "—"],
    ["Opening", <span key="o">{date(m.open)}</span>],
    ["Finalized", <span key="f">{m.fin && m.fin < 33_000_000_000 ? date(m.fin) : "Not yet"}</span>],
    ["Parent market", parent ? <Link key="p" className="text-signal-ink hover:underline" to={marketPath(parent)}>{short(parent.id)}</Link> : m.parent ? short(m.parent) : "None"],
    ["Child markets", <span key="k">{kids.length}</span>],
    ["Creator", m.creator ? <Addr key="cr" chain={m.chainId} a={m.creator} /> : "—"],
  ];
  if (!m.cond)
    return (
      <div className="rounded-[24px] bg-card shadow-card p-6">
        <Skeleton className="h-40" />
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[30px] bg-card p-2 shadow-card">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[150px_1fr] gap-4 rounded-[18px] px-4 py-3 text-[13px] transition-colors hover:bg-nested">
            <span className="text-text-2">{k}</span>
            <span className="min-w-0 truncate">{v}</span>
          </div>
        ))}
      </div>
      {m.tokens?.length ? (
        <div className="overflow-hidden rounded-[30px] bg-card p-2 shadow-card">
          <div className="px-4 pt-3 pb-2 eyebrow">Outcome tokens · wrapped ERC-1155 → ERC-20</div>
          {m.tokens.map((t, i) => (
            <div key={t} className="grid grid-cols-[1fr_auto] gap-4 rounded-[18px] px-4 py-2.5 text-[13px] transition-colors hover:bg-nested">
              <span className="truncate">{m.outcomes[i] ?? `#${i}`}</span>
              <Addr chain={m.chainId} a={t} kind="token" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Addr({ chain, a, kind = "address" }: { chain: number; a?: string | null; kind?: "address" | "token" }) {
  if (!a) return <>—</>;
  return (
    <span className="inline-flex items-center gap-3">
      <a href={explorer(chain, kind, a)} target="_blank" rel="noreferrer" className="num text-signal-ink hover:underline">
        {short(a, 6)}
      </a>
      <Copy text={a} />
    </span>
  );
}
function Hex({ v }: { v?: string }) {
  if (!v) return <>—</>;
  return (
    <span className="inline-flex items-center gap-3">
      <span className="num text-text">{short(v, 8)}</span>
      <Copy text={v} />
    </span>
  );
}

function Holders({ m }: { m: Market }) {
  const data = useTokenActivity(m.chainId, m.id);
  const outs = ranked(m).slice(0, 6);
  if (!data) return <Skeleton className="h-60" />;
  const tokenFor = (i: number) => m.tokens?.[i]?.toLowerCase();
  const any = outs.some((o) => (data.holders[tokenFor(o.i) ?? ""] ?? []).length);
  if (!any) return <Empty>No holder data indexed for this market yet.</Empty>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {outs.map((o) => {
        const hs = (data.holders[tokenFor(o.i) ?? ""] ?? []).slice(0, 5);
        if (!hs.length) return null;
        const tot = hs.reduce((a, h) => a + Number(h.balance) / 1e18, 0);
        return (
          <div key={o.i} className="rounded-[24px] bg-card shadow-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="truncate text-[14px] font-medium">{o.name}</span>
              <span className="num text-[12px] text-muted">{pct(o.p)}</span>
            </div>
            {hs.map((h, k) => {
              const b = Number(h.balance) / 1e18;
              return (
                <div key={h.address} className="flex items-center gap-3 py-1.5 text-[12.5px]">
                  <span className="num w-4 text-muted">{k + 1}</span>
                  <a href={explorer(m.chainId, "address", h.address)} target="_blank" rel="noreferrer" className="num text-text-2 hover:text-signal-ink">
                    {short(h.address)}
                  </a>
                  <div className="h-1 flex-1 rounded-full bg-nested">
                    <div className="h-full rounded-full bg-line-strong" style={{ width: `${(b / (tot || 1)) * 100}%` }} />
                  </div>
                  <span className="num w-20 text-right">{num(b, b < 10 ? 2 : 0)}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Activity({ m, now }: { m: Market; now: number }) {
  const data = useTokenActivity(m.chainId, m.id);
  if (!data) return <Skeleton className="h-60" />;
  if (!data.txs.length) return <Empty>No transfers indexed for this market yet.</Empty>;
  const name = (t: string) => {
    const i = (m.tokens || []).findIndex((x) => x.toLowerCase() === t.toLowerCase());
    return i >= 0 ? m.outcomes[i] : short(t);
  };
  return (
    <div className="overflow-hidden rounded-[30px] bg-card p-2 shadow-card">
      <div className="hidden md:grid grid-cols-[110px_1fr_120px_120px_100px] gap-4 px-4 pt-3 pb-2 eyebrow">
        <span>Tx</span>
        <span>Token</span>
        <span>From</span>
        <span>To</span>
        <span className="text-right">Amount</span>
      </div>
      {data.txs.slice(0, 25).map((t) => (
        <div key={t.id} className="grid grid-cols-2 md:grid-cols-[110px_1fr_120px_120px_100px] gap-x-4 gap-y-1 rounded-[18px] px-4 py-2.5 text-[12.5px] transition-colors hover:bg-nested">
          <a href={explorer(m.chainId, "tx", t.tx_hash)} target="_blank" rel="noreferrer" className="num text-signal-ink hover:underline">
            {t.tx_hash.slice(0, 10)}
            <span className="ml-2 text-muted">{ago(t.timestamp, now)}</span>
          </a>
          <span className="truncate">{name(t.token)}</span>
          <span className="num text-text-2">{short(t.from)}</span>
          <span className="num text-text-2">{short(t.to)}</span>
          <span className="num md:text-right">{num(Number(t.value) / 1e18, 2)}</span>
        </div>
      ))}
      <div className="px-5 py-3 text-[12px] text-muted">{data.total.toLocaleString()} transfers indexed in total</div>
    </div>
  );
}

function Lifecycle({ m, now }: { m: Market; now: number }) {
  const status = statusOf(m, now);
  const steps = [
    { k: "Created", t: m.created ? date(m.created) : "—", done: true },
    { k: "Trading", t: status === "Resolved" ? "closed" : "open until resolution", done: true },
    { k: "Answer on Reality.eth", t: m.open > now ? `from ${date(m.open)}` : status === "Reporting" ? "open now" : "answered", done: m.open <= now },
    { k: status === "Disputed" ? "Kleros arbitration" : "Finalized", t: m.fin && m.fin < 33e9 ? date(m.fin) : "pending", done: status === "Resolved" || status === "Disputed" },
    { k: "Redeem", t: status === "Resolved" ? "available" : "after resolution", done: status === "Resolved" },
  ];
  return (
    <div className="rounded-[24px] bg-card shadow-card p-5">
      <div className="eyebrow mb-4">Lifecycle</div>
      <ol className="relative space-y-4">
        <span className="absolute left-[5px] top-2 bottom-2 w-px bg-line" />
        {steps.map((s) => (
          <li key={s.k} className="relative flex items-start gap-3">
            <span className="mt-1 bg-card">
              <Diamond size={11} on={s.done} />
            </span>
            <div className="flex-1">
              <div className={cx("text-[13.5px]", s.done ? "text-text" : "text-muted")}>{s.k}</div>
              <div className="text-[12px] text-muted">{s.t}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
