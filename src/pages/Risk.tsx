import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Shell, Container } from "../ui/Shell";
import { AppGlyph, Arrow, Badge, Chip, Diamond, Icon, LiveTag, Seg, Skeleton, cx } from "../ui/kit";
import { useLiveIds, useMarkets, useNow } from "../data/seer";
import { date, marketPath, num, pct, short, usd } from "../data/market";
import { FEATURED } from "../data/featured";

/* Asset classes for the assets listed in Seer's PD market. */
const CLASS: Record<string, string> = {
  wbETH: "ETH staking", weETH: "ETH staking", stETH: "ETH staking", "ETH+": "ETH staking", bsdETH: "ETH staking", rETH: "ETH staking", pufETH: "ETH staking", avETH: "ETH staking",
  PYUSD: "Fiat-backed stable", RLUSD: "Fiat-backed stable", USDC: "Fiat-backed stable", USD1: "Fiat-backed stable", USDT: "Fiat-backed stable", USDO: "Fiat-backed stable", U: "Fiat-backed stable",
  USDS: "Synthetic stable", RUSD: "Synthetic stable", USDF: "Synthetic stable", avUSD: "Synthetic stable", NUSD: "Synthetic stable", iUSD: "Synthetic stable", "satUSD+": "Synthetic stable",
  BTCB: "Wrapped BTC", solvBTC: "Wrapped BTC", tBTC: "Wrapped BTC", cbBTC: "Wrapped BTC", LBTC: "Wrapped BTC", UBTC: "Wrapped BTC",
  "GACLO-1": "Tokenised credit", "BUIDL-I": "Tokenised credit", JAAA: "Tokenised credit", JTRSY: "Tokenised credit", "mF-ONE": "Tokenised credit", STAC: "Tokenised credit",
};
const CLASSES = ["ETH staking", "Fiat-backed stable", "Synthetic stable", "Wrapped BTC", "Tokenised credit"];

type Asset = { name: string; cls: string; p: number; i: number };

// The API quotes odds to 0.1%, so a zero means "below the market's resolution".
const oneIn = (p: number) => (p <= 0 ? "< 1 in 1,000" : p >= 50 ? "coin flip" : `1 in ${num(Math.round(100 / p))}`);
const pd = (p: number) => (p <= 0 ? "<0.1%" : pct(p));

export default function Risk() {
  const { byId, liveAt, ready } = useMarkets();
  const now = useNow();
  const id = FEATURED.pd.id;
  useLiveIds([id]);
  const m = byId.get(id);

  const { assets, none } = useMemo(() => {
    if (!m) return { assets: [] as Asset[], none: null as number | null };
    const a: Asset[] = [];
    let none: number | null = null;
    m.outcomes.forEach((n, i) => {
      if (n === "Invalid") return;
      if (n === "No To All") none = m.odds[i];
      else a.push({ name: n, cls: CLASS[n] ?? "Other", p: m.odds[i] ?? 0, i });
    });
    return { assets: a.sort((x, y) => y.p - x.p), none };
  }, [m]);

  const [cls, setCls] = useState<string | null>(null);
  const [cmp, setCmp] = useState<string[]>(["USDF", "USDT", "stETH"]);
  const shown = assets.filter((a) => !cls || a.cls === cls);
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  };
  const classMed = Object.fromEntries(CLASSES.map((c) => [c, median(assets.filter((a) => a.cls === c).map((a) => a.p))]));
  const maxP = Math.max(4, ...assets.map((a) => a.p));
  const daysLeft = Math.max(0, Math.round((Date.UTC(2027, 0, 1) / 1000 - now) / 86400));

  return (
    <Shell app="risk" wide>
      <section className="border-b border-line bg-card">
        <Container wide className="py-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <AppGlyph app="risk" className="h-6 w-6 text-text" />
                <span className="text-[15px] font-medium">Risk Pricing</span>
                <LiveTag live={!!liveAt} at={liveAt} />
              </div>
              <h1 className="display text-[44px] md:text-[68px]">
                Default risk,
                <br />
                <span className="text-muted">priced side by side.</span>
              </h1>
            </div>
            <div>
              <p className="text-[16px] leading-relaxed text-text-2">
                One market lists {assets.length || "dozens of"} DeFi assets and one more outcome: none of them default. Every asset is priced against the others
                and against “none”, so you can compare risks directly instead of reading a single yes-or-no price on its own.
              </p>
              {m && (
                <Link to={marketPath(m)} className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-text-2 hover:text-text">
                  Market {short(m.id)} · Gnosis <Arrow className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-5">
            {[
              ["Assets priced", assets.length ? String(assets.length) : "—", "in one market"],
              ["No asset defaults", none != null ? pct(none, 1) : "—", "before 1 Jan 2027"],
              ["Highest", assets[0] ? `${assets[0].name} ${pd(assets[0].p)}` : "—", assets[0] ? oneIn(assets[0].p) : ""],
              ["Median asset", assets.length ? pd(median(assets.map((a) => a.p))) : "—", "probability of default"],
              ["Horizon", `${daysLeft} days`, "until 31 Dec 2026"],
            ].map(([k, v, s], i) => (
              <div key={k} className={cx("min-w-0", i > 0 && "md:border-l md:border-line md:pl-6")}>
                <div className="eyebrow mb-2">{k}</div>
                <div className={cx("num truncate text-[24px] md:text-[28px] leading-none", i === 1 && "text-signal-ink")}>{v}</div>
                <div className="mt-2 text-[12px] text-muted">{s}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container wide className="py-10">
        {!ready || !m ? (
          <Skeleton className="h-[600px]" />
        ) : (
          <div className="space-y-12">
            {/* Spectrum */}
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="eyebrow mb-2">Risk spectrum</div>
                  <h2 className="text-[26px] md:text-[30px] font-medium tracking-[-0.025em]">Every asset on one scale</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip active={!cls} onClick={() => setCls(null)}>
                    All classes
                  </Chip>
                  {CLASSES.map((c) => (
                    <Chip key={c} active={cls === c} onClick={() => setCls(cls === c ? null : c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>
              <Spectrum assets={assets} cls={cls} maxP={maxP} medians={classMed} onPick={(n) => setCmp((c) => (c.includes(n) ? c : [...c.slice(-2), n]))} cmp={cmp} />
            </section>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
              {/* Ladder */}
              <section className="min-w-0">
                <div className="mb-4 flex items-center justify-between">
                  <div className="eyebrow">
                    {shown.length} assets · market-implied probability of default before 2027
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-line bg-card">
                  <div className="grid grid-cols-[1fr_auto] md:grid-cols-[140px_150px_1fr_80px_110px_40px] gap-4 border-b border-line px-5 py-3 eyebrow">
                    <span>Asset</span>
                    <span className="hidden md:block">Class</span>
                    <span className="hidden md:block">Probability of default</span>
                    <span className="text-right">PD</span>
                    <span className="hidden md:block text-right">Odds</span>
                    <span />
                  </div>
                  {shown.map((a, k) => {
                    const inCmp = cmp.includes(a.name);
                    return (
                      <div key={a.name} className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[140px_150px_1fr_80px_110px_40px] items-center gap-4 border-b border-line px-5 py-2.5 text-[13.5px] last:border-b-0">
                        <span className="font-medium">{a.name}</span>
                        <span className="hidden md:block text-[12.5px] text-text-2">{a.cls}</span>
                        <span className="relative hidden h-2 rounded-full bg-nested md:block">
                          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(1.5, (a.p / maxP) * 100)}%`, background: k === 0 && !cls ? "var(--signal)" : "var(--line-strong)" }} />
                          <span className="absolute -top-1 bottom-[-4px] w-px bg-text/40" style={{ left: `${(classMed[a.cls] / maxP) * 100}%` }} title="Class median" />
                        </span>
                        <span className="num text-right">{pd(a.p)}</span>
                        <span className="num hidden md:block text-right text-[12px] text-text-2">{oneIn(a.p)}</span>
                        <button
                          onClick={() => setCmp((c) => (inCmp ? c.filter((x) => x !== a.name) : [...c.slice(-2), a.name]))}
                          aria-label={inCmp ? `Remove ${a.name} from comparison` : `Compare ${a.name}`}
                          className={cx("grid h-7 w-7 place-items-center rounded-full justify-self-end cursor-pointer", inCmp ? "bg-text text-bg" : "text-muted hover:bg-nested hover:text-text")}
                        >
                          <Icon name={inCmp ? "check" : "sort"} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted">
                  Tick marks show each class median. Probabilities are normalised outcome-token prices from the market's pools; thin liquidity widens the error on
                  small numbers.
                </p>
              </section>

              {/* Compare + exposure */}
              <aside className="space-y-6 xl:sticky xl:top-24 self-start">
                <Compare assets={assets} names={cmp} medians={classMed} onRemove={(n) => setCmp((c) => c.filter((x) => x !== n))} />
                <Exposure assets={assets} />
              </aside>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
              {[
                ["One market, many assets", "Each asset has an outcome token that pays 1 sDAI if it defaults before 2027. “No To All” pays if none do. Every price is set against the same pool of capital."],
                ["What counts as a default", "The definition is written into the market's Reality.eth question, so every trader prices the same event. Disputed answers escalate to Kleros jurors."],
                ["Read with care", "Liquidity in this market is still thin, so small probabilities carry wide error. Treat the numbers as one input next to audits, collateral data and your own judgment."],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-line bg-card p-6">
                  <div className="text-[15px] font-medium">{k}</div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">{v}</p>
                </div>
              ))}
            </section>
            <div className="text-[12px] text-muted">Market opened {m.created ? date(m.created) : "—"} · question opens {date(m.open)}</div>
          </div>
        )}
      </Container>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */

function Spectrum({ assets, cls, maxP, medians, onPick, cmp }: { assets: Asset[]; cls: string | null; maxP: number; medians: Record<string, number>; onPick: (n: string) => void; cmp: string[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const ticks = [0, 1, 2, 3, 4].filter((t) => t <= maxP);
  return (
    <div className="rounded-2xl border border-line bg-card p-5 md:p-7">
      <div className="space-y-1">
        {CLASSES.map((c) => {
          const xs = assets.filter((a) => a.cls === c);
          const dim = cls && cls !== c;
          return (
            <div key={c} className={cx("grid grid-cols-[110px_1fr] md:grid-cols-[170px_1fr] items-center gap-4 py-2.5 transition-opacity", dim && "opacity-25")}>
              <div>
                <div className="text-[13.5px]">{c}</div>
                <div className="num text-[11px] text-muted">median {pd(medians[c])}</div>
              </div>
              <div className="relative h-10">
                <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
                <div className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-text/30" style={{ left: `${(medians[c] / maxP) * 100}%` }} />
                {xs.map((a, k) => {
                  const on = hover === a.name || cmp.includes(a.name);
                  const lead = a === assets[0];
                  return (
                    <button
                      key={a.name}
                      onMouseEnter={() => setHover(a.name)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => onPick(a.name)}
                      className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ left: `${(a.p / maxP) * 100}%`, marginTop: (k % 3) * 6 - 6 }}
                      aria-label={`${a.name} ${pd(a.p)}`}
                    >
                      <Diamond size={on || lead ? 15 : 11} on={on || lead} />
                      <span
                        className={cx(
                          "num pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-text px-1.5 py-0.5 text-[10.5px] text-bg",
                          on ? "block" : "hidden group-hover:block",
                        )}
                      >
                        {a.name} {pd(a.p)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-[110px_1fr] md:grid-cols-[170px_1fr] gap-4">
        <span />
        <div className="relative h-4">
          {ticks.map((t) => (
            <span key={t} className="num absolute -translate-x-1/2 text-[11px] text-muted" style={{ left: `${(t / maxP) * 100}%` }}>
              {t}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Compare({ assets, names, medians, onRemove }: { assets: Asset[]; names: string[]; medians: Record<string, number>; onRemove: (n: string) => void }) {
  const xs = names.map((n) => assets.find((a) => a.name === n)).filter(Boolean) as Asset[];
  const lo = xs.length ? xs.reduce((a, b) => (b.p < a.p ? b : a)) : null;
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-1 text-[15px] font-medium">Compare</div>
      <p className="mb-4 text-[12.5px] text-text-2">Pick up to three assets from the spectrum or the table.</p>
      {xs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-6 text-center text-[13px] text-muted">Nothing selected.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {xs.map((a) => {
            const rel = medians[a.cls] ? a.p / medians[a.cls] : null;
            return (
              <div key={a.name} className={cx("relative rounded-xl border p-3", a === lo ? "border-line" : "border-line")}>
                <button onClick={() => onRemove(a.name)} className="absolute right-2 top-2 text-muted hover:text-text cursor-pointer" aria-label={`Remove ${a.name}`}>
                  <Icon name="x" className="h-3 w-3" />
                </button>
                <div className="text-[14px] font-medium">{a.name}</div>
                <div className="truncate text-[11px] text-muted">{a.cls}</div>
                <div className={cx("num mt-4 text-[22px] leading-none", a === xs.reduce((m, b) => (b.p > m.p ? b : m)) && xs.length > 1 && "text-signal-ink")}>{pd(a.p)}</div>
                <div className="num mt-1 text-[11px] text-text-2">{oneIn(a.p)}</div>
                <div className="mt-3 border-t border-line pt-2 text-[11px] text-text-2">{rel != null && a.p > 0 ? `${num(rel, 1)}× class median` : a.p > 0 ? "class median <0.1%" : "at or below class median"}</div>
              </div>
            );
          })}
        </div>
      )}
      {xs.length > 1 && lo && (
        <p className="mt-4 text-[12.5px] leading-relaxed text-text-2">
          {lo.p > 0
            ? `The market prices ${xs.filter((x) => x !== lo).map((x) => `${x.name} at ${num(x.p / lo.p, 1)}×`).join(" and ")} the default risk of ${lo.name}.`
            : `${lo.name} trades below the market's 0.1% resolution; ${xs.filter((x) => x !== lo && x.p > 0).map((x) => `${x.name} is priced at ${pd(x.p)}`).join(", ") || "the others too"}.`}
        </p>
      )}
    </div>
  );
}

function Exposure({ assets }: { assets: Asset[] }) {
  const [rows, setRows] = useState<{ name: string; amt: string }[]>([
    { name: "USDC", amt: "40000" },
    { name: "stETH", amt: "30000" },
    { name: "cbBTC", amt: "20000" },
    { name: "USDF", amt: "10000" },
  ]);
  const [lgd, setLgd] = useState<"100" | "50" | "25">("50");
  const calc = rows
    .map((r) => ({ ...r, a: assets.find((x) => x.name === r.name), v: Math.max(0, Number(r.amt) || 0) }))
    .filter((r) => r.a);
  const total = calc.reduce((s, r) => s + r.v, 0);
  const el = calc.reduce((s, r) => s + r.v * (r.a!.p / 100) * (Number(lgd) / 100), 0);
  const anyDefault = 1 - calc.reduce((s, r) => s * (1 - r.a!.p / 100), 1);
  const worst = calc.reduce<(typeof calc)[0] | null>((w, r) => (!w || r.v * r.a!.p > w.v * w.a!.p ? r : w), null);

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-1 text-[15px] font-medium">Your exposure</div>
      <p className="mb-4 text-[12.5px] text-text-2">Enter positions to read the market's view of your book.</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={r.name}
              onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              className="h-10 w-28 rounded-lg border border-line-strong bg-bg px-2 text-[13px] outline-none focus:border-signal"
              aria-label="Asset"
            >
              {assets.map((a) => (
                <option key={a.name}>{a.name}</option>
              ))}
            </select>
            <div className="flex h-10 flex-1 items-center rounded-lg border border-line-strong bg-bg px-3 focus-within:border-signal">
              <span className="text-[13px] text-muted">$</span>
              <input
                inputMode="decimal"
                value={r.amt}
                onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, amt: e.target.value.replace(/[^0-9.]/g, "") } : x)))}
                className="num h-full w-full bg-transparent pl-1 text-[13px] outline-none"
                aria-label={`${r.name} amount`}
              />
            </div>
            <button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-nested hover:text-text cursor-pointer" aria-label="Remove position">
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {rows.length < 6 && (
          <button onClick={() => setRows((rs) => [...rs, { name: assets[assets.length - 1]?.name ?? "USDC", amt: "10000" }])} className="h-9 w-full rounded-lg border border-dashed border-line-strong text-[13px] text-text-2 hover:text-text cursor-pointer">
            + Add position
          </button>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[12.5px] text-text-2">Loss given default</span>
        <Seg
          size="sm"
          value={lgd}
          onChange={setLgd}
          options={[
            { value: "25", label: "25%" },
            { value: "50", label: "50%" },
            { value: "100", label: "100%" },
          ]}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-signal bg-signal-soft p-4">
          <div className="eyebrow mb-1.5 !text-signal-ink">Expected loss</div>
          <div className="num text-[24px] leading-none text-signal-ink">{usd(el)}</div>
          <div className="num mt-1.5 text-[11px] text-text-2">{total ? pct((el / total) * 100, 2) : "—"} of {usd(total)}</div>
        </div>
        <div className="rounded-xl border border-line p-4">
          <div className="eyebrow mb-1.5">Any default</div>
          <div className="num text-[24px] leading-none">{pct(anyDefault * 100)}</div>
          <div className="mt-1.5 text-[11px] text-text-2">at least one holding</div>
        </div>
      </div>
      {worst && (
        <p className="mt-4 text-[12.5px] leading-relaxed text-text-2">
          <span className="font-medium text-text">{worst.name}</span> contributes the most risk: {usd(worst.v)} at {pd(worst.a!.p)}.
        </p>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted">“Any default” treats assets as independent, which understates correlated failures. Before 1 Jan 2027.</p>
      <div className="mt-4">
        <Badge tone="outline">Market estimate, not advice</Badge>
      </div>
    </div>
  );
}
