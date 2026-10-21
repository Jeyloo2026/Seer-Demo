import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Shell, Container } from "../ui/Shell";
import { APPS, AppGlyph, Arrow, ButtonLink, Diamond, Mark, cx, type AppKey } from "../ui/kit";
import { LineChart } from "../ui/charts";
import { normalize, useChart, useMarkets, type Market } from "../data/seer";
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
      <Hero signals={signals} stats={stats} />
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

function Hero({ signals, stats }: { signals: Market[]; stats: { count: number; vol: number; liq: number; chains: number } }) {
  return (
    <section className="relative overflow-hidden bg-signal text-white">
      <Rays signals={signals} />
      <Container className="relative">
        <div className="grid min-h-[600px] md:min-h-[640px] items-end md:items-center md:grid-cols-[1fr_1fr] pb-10 md:pb-0">
          <div className="hidden md:block" />
          <div className="relative pt-64 md:pt-0 md:pl-[10%]">
            <div className="eyebrow !text-white/70 mb-5">Seer · Decision infrastructure</div>
            <h1 className="display text-[52px] sm:text-[72px] lg:text-[88px]">
              Every decision
              <br />
              has a price.
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-white/80">
              Seer is the market layer beneath prediction, governance and coordination. Open questions become tradable outcomes, and applications read the
              answer the market converges on.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/app" size="lg" className="!bg-white !text-signal hover:!brightness-95">
                Explore markets <Arrow />
              </ButtonLink>
              <a href="#stack" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/40 px-6 text-[15px] font-medium hover:border-white">
                How it fits together
              </a>
            </div>
          </div>
        </div>
      </Container>

      <div className="relative border-t border-white/20 bg-signal">
        <Container className="grid grid-cols-2 md:grid-cols-4">
          {[
            ["Markets on record", stats.count ? stats.count.toLocaleString() : "—"],
            ["Lifetime volume", stats.vol ? usd(stats.vol) : "—"],
            ["Liquidity in pools", stats.liq ? usd(stats.liq) : "—"],
            ["Chains", stats.chains || "—"],
          ].map(([k, v], i) => (
            <div key={k as string} className={cx("py-6 md:py-7", i > 0 && "md:border-l md:pl-6 border-white/20", i % 2 === 1 && "border-l pl-4 md:pl-6")}>
              <div className="eyebrow !text-white/60 mb-2">{k}</div>
              <div className="num text-[28px] md:text-[34px] leading-none">{v}</div>
            </div>
          ))}
        </Container>
      </div>
    </section>
  );
}

/** Brandbook rays, drawn in real pixels so each live question can ride its own ray. */
function Rays({ signals }: { signals: Market[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1440, h: 760 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = size;
  const mobile = w < 768;
  const F = mobile ? { x: w * 0.92, y: 120 } : { x: w * 0.48, y: (h - 110) / 2 };
  const top = mobile ? 0 : 0;
  const span = mobile ? 230 : h - 110;
  const n = 8;
  return (
    <div ref={ref} className="absolute inset-0" aria-hidden>
      <svg width={w} height={h} className="absolute inset-0">
        {Array.from({ length: n }, (_, i) => {
          const yc = top + 26 + (i * (span - 52)) / (n - 1);
          const half = (mobile ? 9 : 21) + Math.abs(i - (n - 1) / 2) * (mobile ? 1 : 2.4);
          const ang = (Math.atan2(F.y - yc, F.x) * 180) / Math.PI;
          const m = signals[i];
          const l = m ? leader(m) : null;
          const label = m ? (m.name.length > 52 ? m.name.slice(0, 50) + "…" : m.name) : "";
          return (
            <g key={i} className="rise" style={{ animationDelay: `${i * 60}ms` }}>
              <polygon points={`0,${yc - half} 0,${yc + half} ${F.x},${F.y}`} fill="#BFBFE6" />
              {m && !mobile && (
                <g transform={`rotate(${ang} 0 ${yc})`}>
                  <text x={22} y={yc + 4} fontSize="11" fill="#7D33FF" style={{ fontFamily: "var(--font-mono)" }}>
                    {label}
                    <tspan dx="10" fontWeight="600">
                      {pct(l?.p, 0)}
                    </tspan>
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <rect x={F.x - 3} y={F.y - 3} width="6" height="6" fill="#fff" transform={`rotate(45 ${F.x} ${F.y})`} />
      </svg>
    </div>
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
          <div className="mt-8 space-y-1.5">
            {APPS.filter((a) => a.key !== "home").map((a) => {
              const k = a.key as Exclude<AppKey, "home">;
              return (
                <Link
                  key={a.key}
                  to={a.path}
                  onMouseEnter={() => setHover(k)}
                  onFocus={() => setHover(k)}
                  className={cx(
                    "group flex items-center gap-4 rounded-2xl border p-4 transition-colors",
                    hover === k ? "border-text bg-card" : "border-transparent hover:bg-card",
                  )}
                >
                  <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl border", hover === k ? "border-signal text-signal" : "border-line text-text")}>
                    <AppGlyph app={a.key} className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-medium">{a.name}</span>
                    <span className="block text-[13px] text-text-2">{hover === k ? USES[k].why : a.line}</span>
                  </span>
                  <Arrow className={cx("h-4 w-4 shrink-0 transition-transform", hover === k ? "text-signal translate-x-0.5" : "text-muted")} />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-card p-5 md:p-8 lg:sticky lg:top-24 self-start">
          <Layer n="04" title="Interfaces" note="What people and agents use">
            <div className="grid grid-cols-5 gap-2">
              {APPS.filter((a) => a.key !== "home").map((a) => (
                <button
                  key={a.key}
                  onMouseEnter={() => setHover(a.key as Exclude<AppKey, "home">)}
                  className={cx(
                    "flex flex-col items-center gap-2 rounded-xl border px-1 py-3 text-[12px] transition-colors cursor-pointer",
                    hover === a.key ? "border-signal bg-signal text-on-signal" : "border-line text-text-2 hover:border-line-strong",
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
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors duration-300",
        on ? "border-signal bg-signal-soft text-signal-ink" : muted ? "border-dashed border-line-strong text-muted" : "border-line text-muted",
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
        <PreviewCard app="app" className="md:col-span-2" title="Every market, on the record" to="/app">
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
              <div key={x.k} className={cx("rounded-xl border p-4", x.on ? "border-signal" : "border-line")}>
                <div className="eyebrow mb-2">{x.k}</div>
                <div className={cx("num text-[26px] leading-none", x.on && "text-signal-ink")}>{x.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[12px] text-muted">Conditional prices inform the vote. The DAO still decides. Illustrative figures.</div>
        </PreviewCard>

        {/* Risk */}
        <PreviewCard app="risk" className="md:col-span-3" title="Probability of default before 2027, priced per asset" to="/risk">
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

function PreviewCard({ app, title, to, children, className }: { app: AppKey; title: string; to: string; children: React.ReactNode; className?: string }) {
  const a = APPS.find((x) => x.key === app)!;
  return (
    <Link to={to} className={cx("group flex flex-col rounded-3xl border border-line bg-card p-6 transition-colors hover:border-line-strong", className)}>
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

/** Shares of the field just before the decision (the last moment no design held > 60%). */
export function useRebrandStory(rebrand?: Market) {
  const { series } = useChart(100, REBRAND, rebrand?.outcomes);
  return useMemo(() => {
    const s = normalize((series || []).filter((x) => x.name !== "Invalid"));
    if (!s.length || !s[0].data.length) return null;
    const ts = s[0].data.map((d) => d[0]);
    let k = ts.length - 1;
    while (k > 0 && Math.max(...s.map((x) => x.data[k]?.[1] ?? 0)) > 0.6) k--;
    const at = s.map((x) => ({ name: x.name, p: (x.data[k]?.[1] ?? 0) * 100 })).sort((a, b) => b.p - a.p);
    const ef = at.find((x) => x.name === "Electric Foundation");
    return { series: s.map((x) => ({ ...x, data: x.data.slice(0, k + 1) })), fav: at[0], ef, rankEf: at.findIndex((x) => x.name === "Electric Foundation") + 1, closeT: ts[k] };
  }, [series]);
}

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
      <div className="mt-12 grid grid-cols-2 md:grid-cols-6 border-t border-line">
        {steps.map((s, k) => (
          <button
            key={s.t}
            onMouseEnter={() => setI(k)}
            onFocus={() => setI(k)}
            className={cx("relative border-b md:border-b-0 border-line p-5 pt-8 text-left transition-colors cursor-default", k > 0 && "md:border-l", k % 2 === 1 && "border-l", i === k && "bg-card")}
          >
            <span className={cx("absolute -top-[5px] left-5", k <= i ? "" : "opacity-40")}>
              <Diamond size={10} on={k <= i} />
            </span>
            <div className="num text-[11px] text-muted">0{k + 1}</div>
            <div className={cx("mt-2 text-[20px] font-medium tracking-tight", i === k && "text-signal-ink")}>{s.t}</div>
            <p className="mt-2 text-[13px] leading-relaxed text-text-2">{s.d}</p>
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
          <div className="p-8 md:p-12">
            <Mark className="h-10 w-10 text-signal" />
            <div className="eyebrow !text-white/50 mt-10 mb-4">04 · Proof</div>
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
      <div className="grid gap-12 lg:grid-cols-2 items-center">
        <div>
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
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
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
