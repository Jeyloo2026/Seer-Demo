import { Suspense, lazy, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell, Container } from "../ui/Shell";
import { APPS, AppGlyph, Arrow, ButtonLink, Diamond, Icon, Mark, cx, type AppKey } from "../ui/kit";
import { CornerLink } from "../ui/bento";
import { FEATURED } from "../data/featured";

const Logo3D = lazy(() => import("../ui/Logo3D"));
import { LineChart } from "../ui/charts";
import { asset, useChart, useLiveIds, useMarkets, type Market, type Series } from "../data/seer";
import { useDecisionStory } from "../data/story";
import { chainName, compact, kindOf, leader, marketPath, pct, ranked, usd, type Kind } from "../data/market";

const REBRAND = "0xe7850b0d928aa40ab8732bd323fa4f6ef3c24b8a";
const DEEP = "0xc6c82f5ff9b57722f4831d1dbcae3809cf12c0b9";
const PD = "0xc84786b06390f11ded0dd362e27fc881b540e6f2";

export default function Home() {
  const { markets, byId } = useMarkets();

  const stats = useMemo(() => {
    const vol = markets.reduce((a, m) => a + (m.vol || 0), 0);
    const liq = markets.reduce((a, m) => a + (m.liq || 0), 0);
    const chains = new Set(markets.map((m) => m.chainId)).size;
    const kinds: Record<string, number> = {};
    for (const m of markets) kinds[kindOf(m)] = (kinds[kindOf(m)] || 0) + 1;
    return { count: markets.length, vol, liq, chains, kinds };
  }, [markets]);

  const signals = useMemo(
    () =>
      markets
        .filter((m) => m.odds.some((o) => o != null) && !m.payout && m.name.length < 64 && !/\[/.test(m.name) && !/attack|war\b|troops|hostilit|regime|militant|kill|strike/i.test(m.name))
        .sort((a, b) => b.vol - a.vol)
        .slice(0, 9),
    [markets],
  );

  return (
    <Shell app="home">
      <Hero signals={signals} stats={stats} featured={byId.get(FEATURED.jobboard.id)} />
      <Container>
        <Stack />
        <Previews deep={byId.get(DEEP)} pd={byId.get(PD)} rebrand={byId.get(REBRAND)} kinds={stats.kinds} count={stats.count} />
        <Lifecycle />
        <Chosen rebrand={byId.get(REBRAND)} />
        <Builders />
      </Container>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: many signals converge on one decision                        */
/* ------------------------------------------------------------------ */

function Hero({ signals, stats, featured }: { signals: Market[]; stats: { count: number; vol: number; liq: number; chains: number }; featured?: Market }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const chips = signals.filter((m) => m.name.length < 56).slice(0, 3);
  return (
    <div className="mx-auto max-w-[1600px] px-3 pt-4 md:px-6">
      <div className="grid gap-4 xl:grid-cols-12">
        {/* Ask */}
        <section className="relative isolate flex min-h-[600px] flex-col overflow-hidden rounded-[36px] p-7 text-white md:p-12 xl:col-span-7" style={{ background: "#14121E" }}>
          <div className="absolute -right-32 -top-40 -z-10 h-[520px] w-[520px] rounded-full opacity-80 blur-[90px]" style={{ background: "radial-gradient(circle, #7D33FF 0%, rgb(125 51 255 / 0) 70%)" }} aria-hidden />
          <div className="absolute -bottom-48 -left-24 -z-10 h-[420px] w-[420px] rounded-full opacity-40 blur-[100px]" style={{ background: "radial-gradient(circle, #BFBFE6 0%, rgb(191 191 230 / 0) 70%)" }} aria-hidden />
          <div className="absolute inset-0 -z-10 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} aria-hidden />
          <Suspense fallback={null}>
            <Logo3D className="pointer-events-none absolute right-2 top-6 -z-10 hidden h-[300px] w-[300px] md:block xl:-right-3 xl:top-1" />
          </Suspense>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[13px] text-white/80 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-signal live-dot" /> Live on Gnosis, Ethereum, Optimism and Base
          </span>

          <h1 className="display mt-10 max-w-[12ch] text-[52px] sm:text-[68px] lg:text-[84px]">Every decision has a price.</h1>
          <p className="mt-6 max-w-[48ch] text-[17px] leading-relaxed text-white/70">
            Seer turns open questions into tradable outcomes. Apps for funding, governance and risk read the price; people still make the call.
          </p>

          <form
            className="mt-9 flex w-full max-w-[600px] items-center gap-2 rounded-full bg-white p-2 pl-5 text-ink shadow-[0_30px_80px_-30px_rgb(125_51_255_/_0.9)]"
            onSubmit={(e) => {
              e.preventDefault();
              nav(q.trim() ? `/app?q=${encodeURIComponent(q.trim())}` : "/app");
            }}
          >
            <Icon name="search" className="h-5 w-5 text-[#8E8E99]" />
            <label htmlFor="ask" className="sr-only">
              Search markets
            </label>
            <input
              id="ask"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask the market anything"
              className="h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#8E8E99]"
            />
            <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-full bg-signal px-6 text-[15px] font-medium text-white hover:brightness-110 cursor-pointer">
              See the odds
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((m) => {
              const l = leader(m);
              return (
                <Link key={m.id} to={marketPath(m)} className="inline-flex h-11 max-w-full items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] pl-4 pr-1.5 text-[13.5px] text-white/85 backdrop-blur hover:bg-white/[0.12]">
                  <span className="truncate">{m.name}</span>
                  <span className="num shrink-0 rounded-full bg-white px-2.5 py-1 text-[12.5px] text-ink">
                    {l?.name && l.name.length < 14 ? `${l.name} ` : ""}
                    {pct(l?.p, 0)}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 pt-12 sm:grid-cols-4">
            {[
              ["Markets", stats.count ? stats.count.toLocaleString() : "—"],
              ["Volume", stats.vol ? usd(stats.vol) : "—"],
              ["Liquidity", stats.liq ? usd(stats.liq) : "—"],
              ["Chains", String(stats.chains || "—")],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur">
                <div className="text-[12px] text-white/55">{k}</div>
                <div className="num mt-1 text-[24px] leading-none tracking-[-0.03em]">{v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Live market */}
        <LiveCard m={featured} />

        {/* Apps */}
        <div className="grid grid-cols-2 gap-4 xl:col-span-12 xl:grid-cols-4">
          {(
            [
              { k: "deep", tone: "tone-violet" },
              { k: "futarchy", tone: "tone-ink" },
              { k: "opportunity", tone: "" },
              { k: "risk", tone: "bg-card" },
            ] as { k: AppKey; tone: string }[]
          ).map(({ k, tone }) => {
            const a = APPS.find((x) => x.key === k)!;
            return (
              <Link
                key={k}
                to={a.path}
                className={cx("group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-[30px] p-6 shadow-card transition-transform hover:-translate-y-1", tone)}
                style={tone ? undefined : { background: "#E0E2F5", color: "#14121E" }}
              >
                <AppGlyph app={k} className="absolute -right-6 -top-6 h-36 w-36 opacity-20 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#14121E] shadow-card">
                  <AppGlyph app={k} className="h-6 w-6" />
                </span>
                <span className="flex items-end justify-between gap-3">
                  <span>
                    <span className="block text-[22px] font-medium tracking-[-0.02em]">{a.name}</span>
                    <span className="mt-1 hidden text-[13px] opacity-70 sm:block">{a.line}</span>
                  </span>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border" style={{ borderColor: "color-mix(in srgb, currentColor 25%, transparent)" }}>
                    <Arrow dir="up-right" className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The featured live market: a smooth curve of its top outcomes and the current leader. */
function LiveCard({ m }: { m?: Market }) {
  useLiveIds([FEATURED.jobboard.id]);
  const { series } = useChart(100, FEATURED.jobboard.id, m?.outcomes);
  const top = m ? ranked(m).filter((o) => o.p != null).slice(0, 3) : [];
  const colors = ["#7D33FF", "#14121E", "#BFBFE6"];
  const W = 520,
    H = 220;
  const lines = top.map((o) => series?.find((s) => s.name.trim() === o.name)).filter((s): s is Series => !!s && s.data.length > 1);
  const val = (v: number) => (v <= 1 ? v * 100 : v);
  const max = Math.max(1, ...lines.flatMap((s) => s.data.map((d) => val(d[1]))));
  const t0 = Math.min(...lines.map((s) => s.data[0][0]));
  const t1 = Math.max(...lines.map((s) => s.data[s.data.length - 1][0]));
  const path = (s: Series) => {
    const step = Math.max(1, Math.floor(s.data.length / 40));
    const pts = s.data
      .filter((_, i) => i % step === 0 || i === s.data.length - 1)
      .map((d) => [((d[0] - t0) / Math.max(1, t1 - t0)) * W, H - 14 - (val(d[1]) / max) * (H - 40)] as const);
    return {
      d: pts.reduce((acc, p, i, a) => {
        if (!i) return `M${p[0]},${p[1]}`;
        const q = a[i - 1];
        const mid = q[0] + (p[0] - q[0]) / 2;
        return `${acc} C${mid},${q[1]} ${mid},${p[1]} ${p[0]},${p[1]}`;
      }, ""),
      end: pts[pts.length - 1],
    };
  };
  const lead = lines[0] ? path(lines[0]) : null;
  return (
    <section className="relative flex flex-col rounded-[36px] bg-card p-7 shadow-card md:p-8 xl:col-span-5">
      <CornerLink to={`/opportunity/${FEATURED.jobboard.id}`} label="Open in Opportunity" />
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-nested px-3.5 py-1.5 text-[12.5px] text-text-2">
        <span className="h-2 w-2 rounded-full bg-signal live-dot" /> Live now · Opportunity
      </span>
      <h2 className="mt-5 max-w-[26ch] pr-10 text-[22px] font-medium leading-snug tracking-[-0.02em]">{m?.name ?? "Loading the live market…"}</h2>

      <div className="mt-5 flex items-end gap-3">
        <span className="num text-[56px] leading-none tracking-[-0.045em]">{pct(top[0]?.p, 1)}</span>
        <span className="pb-1.5 text-[14px] text-text-2">{top[0]?.name ?? ""} leads</span>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label="Price history of the three leading names">
          <defs>
            <linearGradient id="livefill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7D33FF" stopOpacity="0.22" />
              <stop offset="1" stopColor="#7D33FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--line-strong)" strokeDasharray="2 6" />
          ))}
          {lead && <path d={`${lead.d} L${W},${H} L0,${H} Z`} fill="url(#livefill)" />}
          {lines
            .map((s, i) => ({ s, i }))
            .reverse()
            .map(({ s, i }) => (
              <path key={s.name} d={path(s).d} fill="none" stroke={colors[i]} strokeWidth={i === 0 ? 3 : 2} strokeLinecap="round" />
            ))}
          {lead && (
            <>
              <circle cx={lead.end[0]} cy={lead.end[1]} r="10" fill="var(--card)" stroke="#7D33FF" strokeWidth="3" />
              <circle cx={lead.end[0]} cy={lead.end[1]} r="3.5" fill="#7D33FF" />
            </>
          )}
        </svg>
        {lead && (
          <span
            className="num absolute -translate-x-full whitespace-nowrap rounded-full bg-signal px-3 py-1 text-[12.5px] text-white"
            style={{ left: `${((lead.end[0] - 16) / W) * 100}%`, top: `calc(${(lead.end[1] / H) * 100}% - 48px)` }}
          >
            {pct(top[0]?.p, 1)} now
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {top.map((o, i) => (
          <div key={o.name} className={cx("rounded-[20px] p-3.5", i === 0 ? "tone-violet" : i === 1 ? "tone-ink" : "bg-nested")}>
            <div className="truncate text-[12.5px] text-text-2">{o.name}</div>
            <div className="num mt-1 text-[20px] leading-none">{pct(o.p, 1)}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] text-text-2">Reviewers choose the name. The price is their second opinion.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The stack: how the five applications sit on one protocol            */
/* ------------------------------------------------------------------ */

const USES: Record<Exclude<AppKey, "home">, { kinds: (Kind | "Conditional")[]; layers: string[]; why: string }> = {
  app: {
    kinds: ["Categorical", "Multi-categorical", "Scalar", "Multi-scalar", "Conditional", "Futarchy"],
    layers: ["Conditional Tokens", "ERC-20 outcomes", "Reality.eth", "Kleros", "Pools"],
    why: "Indexes every market of every type, on every chain, down to the condition ID.",
  },
  deep: {
    kinds: ["Multi-scalar", "Categorical"],
    layers: ["Conditional Tokens", "ERC-20 outcomes", "Reality.eth", "Pools"],
    why: "One question, dozens of outcomes. Multi-scalar markets price a whole field at once, readable by people and agents.",
  },
  futarchy: {
    kinds: ["Futarchy", "Conditional"],
    layers: ["Conditional Tokens", "ERC-20 outcomes", "Reality.eth", "Pools"],
    why: "Collateral splits into pass and fail worlds, and each world gets its own price for the same metric.",
  },
  opportunity: {
    kinds: ["Categorical", "Multi-categorical"],
    layers: ["Conditional Tokens", "ERC-20 outcomes", "Reality.eth", "Kleros", "Pools"],
    why: "Every submission is an outcome. The price is a forecast of selection; the reviewers still choose.",
  },
  risk: {
    kinds: ["Multi-categorical"],
    layers: ["Conditional Tokens", "ERC-20 outcomes", "Reality.eth", "Kleros", "Pools"],
    why: "One market lists many assets plus “none of them”, so default probabilities are priced against each other.",
  },
};

function Stack() {
  const [hover, setHover] = useState<Exclude<AppKey, "home">>("deep");
  const u = USES[hover];
  const kinds: (Kind | "Conditional")[] = ["Categorical", "Multi-categorical", "Scalar", "Multi-scalar", "Conditional", "Futarchy"];
  const settle = ["Conditional Tokens", "ERC-20 outcomes", "Pools"];
  const truth = ["Reality.eth", "Kleros"];
  const on = (x: string) => (u.kinds as string[]).includes(x) || u.layers.includes(x);

  return (
    <section id="stack" className="scroll-mt-20 pt-24 pb-10">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="eyebrow mb-4">01 · One protocol</div>
          <h2 className="display text-[40px] md:text-[56px]">
            Five interfaces.
            <br />
            <span className="text-muted">One market layer.</span>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-text-2">
            Each application asks a different kind of question. Underneath, they share the same primitives: outcome tokens, an oracle, a court, and pools
            that turn conviction into a price.
          </p>
          <div className="mt-8 space-y-2 rounded-[30px] bg-card p-3 shadow-card">
            {APPS.filter((a) => a.key !== "home").map((a) => {
              const k = a.key as Exclude<AppKey, "home">;
              return (
                <Link
                  key={a.key}
                  to={a.path}
                  onMouseEnter={() => setHover(k)}
                  onFocus={() => setHover(k)}
                  className={cx(
                    "group flex items-center gap-4 rounded-[22px] p-4 transition-colors",
                    hover === k ? "bg-text text-bg" : "hover:bg-nested",
                  )}
                >
                  <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-full", hover === k ? "bg-signal text-white" : "bg-nested text-text")}>
                    <AppGlyph app={a.key} className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-medium">{a.name}</span>
                    <span className={cx("block text-[13px]", hover === k ? "opacity-70" : "text-text-2")}>{hover === k ? USES[k].why : a.line}</span>
                  </span>
                  <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full border", hover === k ? "border-white/25" : "border-line-strong")}><Arrow dir="up-right" className="h-4 w-4" /></span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-[30px] bg-card shadow-card p-5 md:p-8 lg:sticky lg:top-24 self-start">
          <Layer n="04" title="Interfaces" note="What people and agents use">
            <div className="grid grid-cols-5 gap-2">
              {APPS.filter((a) => a.key !== "home").map((a) => (
                <button
                  key={a.key}
                  onMouseEnter={() => setHover(a.key as Exclude<AppKey, "home">)}
                  className={cx(
                    "flex flex-col items-center gap-2 rounded-[18px] px-1 py-3.5 text-[12px] transition-colors cursor-pointer",
                    hover === a.key ? "bg-signal text-on-signal" : "bg-nested text-text-2 hover:text-text",
                  )}
                >
                  <AppGlyph app={a.key} className="h-5 w-5" />
                  <span className="truncate max-w-full">{a.name.replace("Seer ", "")}</span>
                </button>
              ))}
            </div>
          </Layer>
          <Wire />
          <Layer n="03" title="Market types" note="How a question becomes outcomes">
            <div className="flex flex-wrap gap-1.5">
              {kinds.map((k) => (
                <Pill key={k} on={on(k)}>
                  {k}
                </Pill>
              ))}
            </div>
          </Layer>
          <Wire />
          <Layer n="02" title="Settlement" note="Collateral split into outcome tokens, traded in pools">
            <div className="flex flex-wrap gap-1.5">
              {settle.map((k) => (
                <Pill key={k} on={on(k)}>
                  {k === "Pools" ? "Swapr · Uniswap v3 pools" : k}
                </Pill>
              ))}
              <Pill on={false} muted>
                sDAI · USDS collateral
              </Pill>
            </div>
          </Layer>
          <Wire />
          <Layer n="01" title="Truth" note="Answers reported on-chain, disputes escalated to a court">
            <div className="flex flex-wrap gap-1.5">
              {truth.map((k) => (
                <Pill key={k} on={on(k)}>
                  {k === "Reality.eth" ? "Reality.eth answers" : "Kleros arbitration"}
                </Pill>
              ))}
            </div>
          </Layer>
        </div>
      </div>
    </section>
  );
}

function Layer({ n, title, note, children }: { n: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="num text-[11px] text-muted">{n}</span>
        <span className="text-[14px] font-medium">{title}</span>
        <span className="text-[12px] text-muted hidden sm:inline">{note}</span>
      </div>
      {children}
    </div>
  );
}

function Wire() {
  return (
    <div className="my-3 flex justify-center" aria-hidden>
      <svg width="12" height="22" viewBox="0 0 12 22">
        <line x1="6" y1="0" x2="6" y2="16" stroke="var(--line-strong)" strokeDasharray="2 3" />
        <rect x="3" y="15" width="6" height="6" transform="rotate(45 6 18)" fill="var(--line-strong)" />
      </svg>
    </div>
  );
}

function Pill({ on, children, muted }: { on: boolean; children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors duration-300",
        on ? "bg-text text-bg" : muted ? "border border-dashed border-line-strong text-muted" : "bg-nested text-text-2",
      )}
    >
      {on && <Diamond size={8} />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Live previews of each application                                   */
/* ------------------------------------------------------------------ */

function Previews({ deep, pd, rebrand, kinds, count }: { deep?: Market; pd?: Market; rebrand?: Market; kinds: Record<string, number>; count: number }) {
  const deepField = deep ? ranked(deep).filter((o) => o.p != null) : [];
  const pdRows = pd
    ? ranked(pd)
        .filter((o) => o.name !== "No To All" && o.p != null)
        .slice(0, 6)
    : [];
  const noToAll = pd ? pd.odds[pd.outcomes.indexOf("No To All")] : null;

  return (
    <section className="py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow mb-4">02 · Live on the protocol</div>
          <h2 className="display text-[40px] md:text-[56px]">
            Real markets,
            <br />
            <span className="text-muted">read five ways.</span>
          </h2>
        </div>
        <p className="max-w-sm text-[14px] leading-relaxed text-text-2">Every figure below is read from Seer's public API as the page loads. Nothing on this page is mocked.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        {/* App */}
        <PreviewCard app="app" tone="ink" className="md:col-span-2" title="Every market, on the record" to="/app">
          <div className="space-y-2.5">
            {(["Categorical", "Multi-categorical", "Scalar", "Multi-scalar", "Futarchy"] as Kind[]).map((k, i) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-32 text-[12px] text-text-2">{k}</span>
                <div className="h-2 flex-1 rounded-full bg-nested overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${count ? ((kinds[k] || 0) / count) * 100 : 0}%`, background: i === 0 ? "var(--signal)" : "var(--line-strong)" }} />
                </div>
                <span className="num w-12 text-right text-[12px] text-text-2">{(kinds[k] || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </PreviewCard>

        {/* Deep */}
        <PreviewCard app="deep" className="md:col-span-4" title="Deep Funding · how will jurors weigh Ethereum's open-source repos?" to="/deep">
          {deepField.length ? (
            <>
              <div className="flex h-28 items-end gap-[3px]">
                {deepField.map((o, i) => (
                  <div key={o.name} title={`${o.name} ${pct(o.p)}`} className="flex-1 rounded-t-[2px]" style={{ height: `${((o.p ?? 0) / (deepField[0].p ?? 1)) * 100}%`, background: i < 3 ? "var(--signal)" : "var(--line-strong)" }} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                {deepField.slice(0, 3).map((o) => (
                  <span key={o.name} className="text-text-2">
                    <span className="text-text">{o.name}</span> <span className="num text-signal-ink">{pct(o.p)}</span>
                  </span>
                ))}
                <span className="text-muted">+{deepField.length - 3} more repositories</span>
              </div>
            </>
          ) : (
            <div className="h-28" />
          )}
        </PreviewCard>

        {/* Futarchy */}
        <PreviewCard app="futarchy" className="md:col-span-3" title="If the proposal passes, what is GNO worth? And if it fails?" to="/futarchy">
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "If approved", v: "$131.40", on: true },
              { k: "If rejected", v: "$127.95", on: false },
            ].map((x) => (
              <div key={x.k} className={cx("rounded-[22px] p-4", x.on ? "tone-violet" : "bg-nested")}>
                <div className="eyebrow mb-2">{x.k}</div>
                <div className={cx("num text-[26px] leading-none", x.on && "text-signal-ink")}>{x.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[12px] text-muted">Conditional prices inform the vote. The DAO still decides. Illustrative figures.</div>
        </PreviewCard>

        {/* Risk */}
        <PreviewCard app="risk" tone="violet" className="md:col-span-3" title="Probability of default before 2027, priced per asset" to="/risk">
          <div className="space-y-2">
            {pdRows.map((o, i) => (
              <div key={o.name} className="flex items-center gap-3">
                <span className="w-16 text-[12px] text-text">{o.name}</span>
                <div className="h-2 flex-1 rounded-full bg-nested">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((o.p ?? 0) / (pdRows[0].p ?? 1)) * 100)}%`, background: i === 0 ? "var(--signal)" : "var(--line-strong)" }} />
                </div>
                <span className="num w-12 text-right text-[12px] text-text-2">{pct(o.p)}</span>
              </div>
            ))}
            {noToAll != null && <div className="pt-1 text-[12px] text-muted">“No asset defaults” trades at <span className="num text-text">{pct(noToAll)}</span></div>}
          </div>
        </PreviewCard>

        {/* Opportunity */}
        <PreviewCard app="opportunity" className="md:col-span-6" title="Seer Rebrand Contest · which submission will be chosen?" to="/opportunity">
          <RebrandMini rebrand={rebrand} />
        </PreviewCard>
      </div>
    </section>
  );
}

/* Colour-blocked tiles re-point the theme tokens, so the live charts inside repaint themselves. */
const TONES: Record<"ink" | "violet", React.CSSProperties> = {
  ink: { "--card": "#14121E", "--nested": "rgb(255 255 255 / 0.1)", "--line": "rgb(255 255 255 / 0.14)", "--line-strong": "rgb(255 255 255 / 0.3)", "--text": "#FFFFFF", "--text-2": "rgb(255 255 255 / 0.72)", "--muted": "rgb(255 255 255 / 0.5)", "--signal-ink": "#C7A8FF" } as React.CSSProperties,
  violet: { "--card": "#7D33FF", "--nested": "rgb(255 255 255 / 0.18)", "--line": "rgb(255 255 255 / 0.2)", "--line-strong": "rgb(255 255 255 / 0.4)", "--text": "#FFFFFF", "--text-2": "rgb(255 255 255 / 0.82)", "--muted": "rgb(255 255 255 / 0.65)", "--signal": "#FFFFFF", "--signal-ink": "#FFFFFF" } as React.CSSProperties,
};

function PreviewCard({ app, title, to, children, className, tone }: { app: AppKey; title: string; to: string; children: React.ReactNode; className?: string; tone?: "ink" | "violet" }) {
  const a = APPS.find((x) => x.key === app)!;
  return (
    <Link to={to} style={tone ? TONES[tone] : undefined} className={cx("group flex flex-col rounded-[30px] bg-card text-text p-6 shadow-card transition-transform hover:-translate-y-0.5", className)}>
      <div className="mb-5 flex items-center gap-2.5">
        <AppGlyph app={app} className="h-5 w-5 text-text" />
        <span className="text-[14px] font-medium">{a.name}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-muted group-hover:text-signal-ink">
          Open <Arrow className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mb-5 text-[15px] leading-snug text-text-2">{title}</div>
      <div className="mt-auto">{children}</div>
    </Link>
  );
}

const useRebrandStory = (rebrand?: Market) => useDecisionStory(100, REBRAND, rebrand);

function RebrandMini({ rebrand }: { rebrand?: Market }) {
  const story = useRebrandStory(rebrand);
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px] items-center">
      <LineChart series={story?.series || []} focus="Electric Foundation" compareTo={story?.fav.name} height={190} />
      <div>
        <div className="eyebrow mb-3">Before the vote</div>
        {story && (
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-3 border-b border-line pb-2">
              <span className="text-text-2">Market favourite · {story.fav.name}</span>
              <span className="num">{pct(story.fav.p, 0)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-line pb-2">
              <span className="text-signal-ink">Chosen · Electric Foundation</span>
              <span className="num text-signal-ink">{pct(story.ef?.p, 0)}</span>
            </div>
          </div>
        )}
        <p className="mt-3 text-[13px] leading-relaxed text-text-2">The market informed the team. The team made the call. That split is the whole design of Opportunity Markets.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

function Lifecycle() {
  const steps = [
    { t: "Ask", d: "A question, its outcomes and an opening date are written to Reality.eth." },
    { t: "Split", d: "Collateral splits into a full set of outcome tokens: one of each, always worth one in total." },
    { t: "Trade", d: "Tokens trade in pools. Prices settle where traders stop disagreeing." },
    { t: "Answer", d: "After opening, anyone can report the answer by posting a bond." },
    { t: "Dispute", d: "A higher bond challenges it. If it escalates, Kleros jurors rule." },
    { t: "Redeem", d: "Winning tokens redeem for collateral. Invalid splits it evenly." },
  ];
  const [i, setI] = useState(2);
  return (
    <section className="py-20">
      <div className="eyebrow mb-4">03 · Lifecycle</div>
      <h2 className="display max-w-3xl text-[40px] md:text-[56px]">
        From question to settlement,
        <span className="text-muted"> without a trusted operator.</span>
      </h2>
      <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-6">
        {steps.map((s, k) => (
          <button
            key={s.t}
            onMouseEnter={() => setI(k)}
            onFocus={() => setI(k)}
            className={cx("relative flex min-h-[220px] flex-col rounded-[26px] p-5 text-left shadow-card transition-colors cursor-default", i === k ? "bg-signal text-white" : k < i ? "bg-text text-bg" : "bg-card")}
          >
            <span className={cx("grid h-10 w-10 place-items-center rounded-full text-[13px]", k <= i ? "bg-white/15" : "bg-nested")}>{k + 1}</span>
            <div className="mt-auto pt-8 text-[22px] font-medium tracking-tight">{s.t}</div>
            <p className={cx("mt-2 text-[13px] leading-relaxed", k <= i ? "opacity-75" : "text-text-2")}>{s.d}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Meta: this identity was chosen with an Opportunity Market            */
/* ------------------------------------------------------------------ */

function Chosen({ rebrand }: { rebrand?: Market }) {
  const story = useRebrandStory(rebrand);
  const shares = new Map((story ? [story.fav, story.ef] : []).filter(Boolean).map((x) => [x!.name, x!.p]));
  const finals = rebrand ? ranked(rebrand) : [];
  return (
    <section className="py-20">
      <div className="overflow-hidden rounded-[28px] bg-ink text-white">
        <div className="grid lg:grid-cols-[1fr_1.1fr]">
          <div className="relative isolate p-8 md:p-12">
            <img src={asset("brand/hood.jpg")} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover object-[80%_30%] opacity-70" />
            <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, rgb(12 10 22 / 0.15) 0%, rgb(12 10 22 / 0.9) 42%, #0C0A16 70%)" }} aria-hidden />
            <Mark className="h-10 w-10 text-white" />
            <div className="eyebrow !text-white/60 mt-40 md:mt-56 mb-4">04 · Proof</div>
            <h2 className="display text-[40px] md:text-[52px]">
              A market informed
              <br />
              this identity.
              <br />
              <span className="text-white/40">People chose it.</span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/70">
              Sixteen designs entered Seer's rebrand contest as outcomes of an Opportunity Market.
              {story
                ? ` Going into the vote, traders favoured ${story.fav.name} at ${pct(story.fav.p, 0)}. The team chose Electric Foundation, priced at ${pct(story.ef?.p, 0)}.`
                : " Traders priced which one the team would choose; the team still voted."}{" "}
              A forecast is a signal for reviewers, never a substitute for them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/opportunity" className="!bg-white !text-ink">
                See the market <Arrow />
              </ButtonLink>
              {rebrand && (
                <Link to={marketPath(rebrand)} className="inline-flex h-10 items-center rounded-full border border-white/30 px-4 text-[14px] hover:border-white">
                  On-chain record
                </Link>
              )}
            </div>
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-white/10 p-8 md:p-12">
            <div className="eyebrow !text-white/50 mb-5">Outcomes · {finals.length} designs</div>
            <ol className="space-y-0">
              {[...finals].sort((a, b) => Number(b.won) - Number(a.won) || (shares.get(b.name) ?? 0) - (shares.get(a.name) ?? 0)).slice(0, 8).map((o, k) => (
                <li key={o.name} className="flex items-center gap-4 border-b border-white/10 py-3">
                  <span className="num w-6 text-[12px] text-white/40">{String(k + 1).padStart(2, "0")}</span>
                  <span className={cx("flex-1 truncate text-[15px]", o.won ? "text-white" : "text-white/60")}>{o.name}</span>
                  {shares.has(o.name) && !o.won && <span className="num text-[12px] text-white/60">{pct(shares.get(o.name), 0)} · favourite</span>}
                  {o.won ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-signal px-2.5 py-1 text-[11px] font-medium">
                      {shares.has(o.name) && <span className="num">{pct(shares.get(o.name), 0)} ·</span>} Chosen
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <div className="mt-4 text-[12px] text-white/40">+{Math.max(0, finals.length - 8)} more · resolved on Gnosis Chain</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

function Builders() {
  return (
    <section className="py-20">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[30px] p-8 md:p-10" style={{ background: "#E0E2F5", color: "#14121E" }}>
          <div className="eyebrow mb-4">05 · Build</div>
          <h2 className="display text-[40px] md:text-[56px]">
            The sixth interface
            <br />
            <span className="text-muted">is yours.</span>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-text-2">
            Every application here reads the same open API and the same contracts. Create markets, quote trades and redeem positions from{" "}
            <span className="num text-[14px] text-text">@seer-pm/sdk</span>, or query the index directly. Agents use exactly the same surface.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="https://seer-3.gitbook.io/seer-documentation" external variant="primary">
              Read the docs <Arrow dir="up-right" />
            </ButtonLink>
            <ButtonLink to="https://github.com/seer-pm" external variant="outline">
              GitHub
            </ButtonLink>
          </div>
        </div>
        <div className="overflow-hidden rounded-[24px] bg-card shadow-card">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span className="eyebrow">POST</span>
            <span className="num truncate text-[12px] text-text-2">app.seer.pm/.netlify/functions/markets-search</span>
          </div>
          <pre className="num overflow-x-auto p-5 text-[12.5px] leading-6 text-text-2 scroll-thin">
            <span className="text-muted">{"// the same call that powers this page\n"}</span>
            {"const res = await fetch(SEER + "}
            <span className="text-signal-ink">"/markets-search"</span>
            {", {\n  method: "}
            <span className="text-signal-ink">"POST"</span>
            {",\n  body: JSON.stringify({\n    orderBy: "}
            <span className="text-signal-ink">"volumeUSD"</span>
            {",\n    marketStatusList: ["}
            <span className="text-signal-ink">"open"</span>
            {"],\n    limit: 50,\n  }),\n});\n\nconst { markets } = await res.json();\nmarkets[0].odds; "}
            <span className="text-muted">{"// → [62.1, 37.9, null]"}</span>
          </pre>
          <div className="grid grid-cols-3 border-t border-line text-center">
            {[
              ["Chains", chainName(100) + " +3"],
              ["Index", "≈ " + compact(2900) + " markets"],
              ["Access", "Open · CORS *"],
            ].map(([k, v], i) => (
              <div key={k} className={cx("p-4", i > 0 && "border-l border-line")}>
                <div className="eyebrow mb-1">{k}</div>
                <div className="text-[13px]">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
