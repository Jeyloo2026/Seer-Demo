import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Shell, Container } from "../ui/Shell";
import { Bento, BentoHead, DeviceTile, FOG, INK, PillRow, Segments, StackRows, Tile as BTile, VIOLET } from "../ui/bento";
import { Arrow, Badge, Button, Diamond, Seg, Skeleton, cx } from "../ui/kit";
import { LineChart } from "../ui/charts";
import { useMarkets, useNow, type Market, type Series } from "../data/seer";
import { date, marketPath, num, short } from "../data/market";

/* ------------------------------------------------------------------ */
/* Real futarchy proposals on Seer (titles, orgs and DAO outcomes)     */
/* ------------------------------------------------------------------ */

type Org = { key: string; name: string; token: string; cg: string; fallback: number };
const ORGS: Org[] = [
  { key: "gnosis", name: "GnosisDAO", token: "GNO", cg: "gnosis", fallback: 128 },
  { key: "kleros", name: "Kleros", token: "PNK", cg: "kleros", fallback: 0.018 },
  { key: "cow", name: "CoW DAO", token: "COW", cg: "cow-protocol", fallback: 0.32 },
];

const PROPOSALS: { id: string; code: string; title: string; org: string }[] = [
  { id: "0xee8878d0a7136c5cd109554f06bb780e225badef", code: "GIP-152", title: "Spin out the Gnosis App into an independent company", org: "gnosis" },
  { id: "0x4120de9931fd29c8a6effea4df57a7c8760c1677", code: "GIP-153", title: "Transition Gnosis Chain into the Ethereum Economic Zone", org: "gnosis" },
  { id: "0x84412fe9d088c1d8dd676a7be9a3d5d0291ab1cf", code: "KIP-90", title: "Cooperative Spending Disclosure", org: "kleros" },
  { id: "0xece80208cb8376be311ce0f5ea4ef73850a0dcf0", code: "GIP-151", title: "One-time pro-rata treasury redemption", org: "gnosis" },
  { id: "0x0cae5e6f520e52e3d6a93c856bb6dbf7781f2e31", code: "KIP-88", title: "DAO Guidance to the Cooperative", org: "kleros" },
  { id: "0x1a0f209fa9730a4668ce43ce18982cb0010a972a", code: "GIP-150", title: "Pro-rata treasury redemption", org: "gnosis" },
  { id: "0x47c80f5f701ebc5f25cab64e660f0577890729c2", code: "GIP-149", title: "Fund continued support of Revoke.cash", org: "gnosis" },
  { id: "0xb607bd7c7201e966e6a150cd6ef1d08db55cad5d", code: "KIP-86", title: "Exclude Cooperative-held PNK from KIP-66", org: "kleros" },
  { id: "0xa3bfb330364ec836442290dfb5604343e0ec4efc", code: "CIP-83", title: "Renewing Team Grant Allocation", org: "cow" },
  { id: "0x45e1064348fd8a407d6d1f59fc64b05f633b28fc", code: "GIP-145", title: "Advisory futarchy pilot with $100k temporary liquidity", org: "gnosis" },
];

/* ------------------------------------------------------------------ */
/* Live spot prices (CoinGecko)                                        */
/* ------------------------------------------------------------------ */

function useSpot() {
  const [spot, setSpot] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ORGS.map((o) => o.cg).join(",")}&vs_currencies=usd`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setSpot(Object.fromEntries(ORGS.map((o) => [o.key, j[o.cg]?.usd ?? o.fallback]))))
      .catch(() => setSpot(Object.fromEntries(ORGS.map((o) => [o.key, o.fallback]))));
  }, []);
  return spot;
}

/* ------------------------------------------------------------------ */
/* Illustrative conditional prices: deterministic per proposal         */
/* ------------------------------------------------------------------ */

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1e6) / 1e6;
  };
}

function conditional(id: string, spot: number, end: number) {
  const r = rng(id);
  const edge = (r() - 0.42) * 0.09; // pass-vs-fail premium, about -4% … +5%
  const n = 160,
    span = 12 * 86400,
    t0 = end - span;
  let s = spot * (1 + (r() - 0.5) * 0.06),
    gap = 0;
  const spotS: [number, number][] = [],
    pass: [number, number][] = [],
    fail: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.round(t0 + (span * i) / (n - 1));
    s *= 1 + (r() - 0.5) * 0.012;
    s += (spot - s) * (i / n) * 0.08;
    gap += ((edge * (0.35 + (0.65 * i) / n)) - gap) * 0.12 + (r() - 0.5) * 0.004;
    spotS.push([t, s]);
    pass.push([t, s * (1 + gap / 2 + (r() - 0.5) * 0.003)]);
    fail.push([t, s * (1 - gap / 2 + (r() - 0.5) * 0.003)]);
  }
  return { series: [{ name: "If it passes", data: pass }, { name: "If it fails", data: fail }, { name: "Spot", data: spotS }] as Series[], pass: pass[n - 1][1], fail: fail[n - 1][1], spot: spotS[n - 1][1] };
}

/* ------------------------------------------------------------------ */

export default function Futarchy() {
  const { byId, ready } = useMarkets();
  const spot = useSpot();
  const now = useNow();
  const { slug } = useParams();
  const nav = useNavigate();
  const [org, setOrg] = useState<string | null>(null);
  const list = PROPOSALS.filter((p) => !org || p.org === org);
  const sel = PROPOSALS.find((p) => p.code.toLowerCase() === slug?.toLowerCase()) ?? PROPOSALS[0];
  const m = byId.get(sel.id);
  const o = ORGS.find((x) => x.key === sel.org)!;
  const outcome = (mk?: Market) => (!mk?.payout ? "Open" : mk.payout[0] !== "0" ? "Passed" : "Rejected");

  return (
    <Shell app="futarchy" wide>
      <Bento>
        <BentoHead
          app="futarchy"
          name="Futarchy"
          title="What a decision is worth, both ways."
          controls={
            <PillRow
              label="Filter by DAO"
              value={org ?? "all"}
              onChange={(v) => setOrg(v === "all" ? null : v)}
              items={[{ v: "all", t: "All DAOs" }, ...ORGS.map((x) => ({ v: x.key, t: x.name }))]}
            />
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <DeviceTile device="worlds" className="md:col-span-2 xl:col-span-6 xl:row-span-2 min-h-[400px]">
            <span className="w-fit rounded-full px-3 py-1.5 text-[12px]" style={{ background: "rgb(255 255 255 / 0.12)" }}>
              {sel.code} · {o.name} · {outcome(m)}
            </span>
            <div className="mt-auto max-w-[24ch] pt-20 md:max-w-[46%]">
              <h2 className="text-[30px] leading-[1.06] tracking-[-0.03em] font-medium">{sel.title}</h2>
              <p className="mt-5 text-[14px] leading-relaxed text-white/70">
                Two conditional markets price {o.token} in two worlds: one where this passes, one where it fails. The gap is what traders expect the decision to be worth.
                The vote stays with {o.name}.
              </p>
              <a href="#proposal" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-medium text-ink hover:bg-signal-fog">
                Compare both worlds <Arrow className="h-4 w-4" />
              </a>
            </div>
          </DeviceTile>

          <BTile className="xl:col-span-3" title="Proposals">
            <StackRows
              items={list.slice(0, 3).map((p) => ({
                key: p.id,
                badge: p.code.split("-")[0],
                title: p.title,
                sub: `${p.code} · ${ORGS.find((x) => x.key === p.org)?.name}`,
                value: outcome(byId.get(p.id)),
                active: p.id === sel.id,
                onClick: () => nav(`/futarchy/${p.code.toLowerCase()}`),
              }))}
            />
          </BTile>

          <BTile className="xl:col-span-3" title="Decided so far">
            <p className="mt-1 mb-6 text-[13px] text-text-2">Markets inform these votes. They never cast them.</p>
            <Segments
              parts={(["Passed", "Rejected", "Open"] as const).map((k, i) => ({
                label: k,
                n: list.filter((p) => outcome(byId.get(p.id)) === k).length,
                c: [VIOLET, INK, FOG][i],
              }))}
            />
          </BTile>

          <BTile className="md:col-span-2 xl:col-span-6" title="Reading both worlds">
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { t: "Split", d: `Collateral splits into pass and fail ${o.token}.` },
                { t: "Trade", d: "Each world gets its own price for the same token." },
                { t: "Vote", d: "The DAO reads the gap, then votes as it always has." },
              ].map((s, i) => (
                <li key={s.t} className="rounded-[22px] p-4" style={{ background: i === 1 ? VIOLET : "var(--nested)", color: i === 1 ? "#fff" : undefined }}>
                  <span className="grid h-9 w-9 place-items-center rounded-full text-[13px]" style={{ background: i === 1 ? INK : "var(--card)", color: i === 1 ? "#fff" : undefined }}>
                    {i + 1}
                  </span>
                  <span className="mt-6 block text-[17px] font-medium">{s.t}</span>
                  <span className={cx("mt-1 block text-[13px]", i === 1 ? "text-white/80" : "text-text-2")}>{s.d}</span>
                </li>
              ))}
            </ol>
          </BTile>
        </div>
      </Bento>
      <span id="proposal" className="block scroll-mt-24" />

      <Container wide className="py-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Proposals */}
          <aside className="lg:sticky lg:top-24 self-start">
            <div className="eyebrow mb-3">Proposals with conditional markets</div>
            <div className="overflow-hidden rounded-[30px] bg-card p-2 shadow-card">
              {list.map((p) => {
                const mk = byId.get(p.id);
                const st = outcome(mk);
                return (
                  <button
                    key={p.id}
                    onClick={() => nav(`/futarchy/${p.code.toLowerCase()}`)}
                    className={cx("block w-full rounded-[20px] px-4 py-3.5 text-left transition-colors cursor-pointer", sel.id === p.id ? "tone-ink" : "hover:bg-nested")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="num text-[12px] text-text-2">{p.code}</span>
                      <span className="text-[11px] text-muted">{ORGS.find((x) => x.key === p.org)?.name}</span>
                      <span className="ml-auto">
                        <OutcomeTag st={st} />
                      </span>
                    </div>
                    <div className={cx("mt-1 text-[14px] leading-snug", sel.id === p.id ? "text-text" : "text-text-2")}>{p.title}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Proposal */}
          <div className="min-w-0">{!ready || !spot ? <Skeleton className="h-[640px]" /> : <Proposal p={sel} m={m} org={o} spot={spot[o.key]} now={now} status={outcome(m)} />}</div>
        </div>

        <Record byId={byId} outcome={outcome} />
      </Container>
    </Shell>
  );
}

function OutcomeTag({ st }: { st: string }) {
  const cls = st === "Passed" ? "bg-signal text-white" : st === "Rejected" ? "bg-text text-bg" : "border border-dashed border-line-strong text-text-2";
  return <span className={cx("inline-flex h-8 items-center rounded-full px-3 text-[12px] whitespace-nowrap", cls)}>{st}</span>;
}

function Proposal({ p, m, org, spot, now, status }: { p: (typeof PROPOSALS)[0]; m?: Market; org: Org; spot: number; now: number; status: string }) {
  const end = m?.open && m.open < now ? m.open : now;
  const c = useMemo(() => conditional(p.id, spot, end), [p.id, spot, end]);
  const [world, setWorld] = useState<"pass" | "fail">("pass");
  const [focus, setFocus] = useState<string | null>(null);
  const edge = (c.pass / c.fail - 1) * 100;
  const fmt = (v: number) => (v < 1 ? `$${v.toFixed(4)}` : `$${num(v, 2)}`);
  const up = edge >= 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="num text-[13px] text-text-2">{p.code}</span>
          <span className="text-[13px] text-muted">· {org.name}</span>
          <OutcomeTag st={status} />
          {m && (
            <Link to={marketPath(m)} className="ml-auto inline-flex items-center gap-1 text-[12px] text-text-2 hover:text-text">
              Market {short(m.id)} <Arrow className="h-3 w-3" />
            </Link>
          )}
        </div>
        <h2 className="text-[30px] md:text-[40px] font-medium leading-[1.05] tracking-[-0.03em]">{p.title}</h2>
        {m && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-2">Market question: “{m.name}”</p>}
      </div>

      {/* Decision signal */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile k={`${org.token} if it passes`} v={fmt(c.pass)} on />
        <Tile k={`${org.token} if it fails`} v={fmt(c.fail)} />
        <Tile k="Decision premium" v={`${up ? "+" : ""}${num(edge, 1)}%`} sub={up ? "Market favours passing" : "Market favours rejecting"} />
        <Tile k={`${org.token} spot · live`} v={fmt(spot)} sub="CoinGecko" />
      </div>

      <div className="rounded-[24px] bg-card shadow-card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-signal" /> If it passes
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-text" /> If it fails
          </span>
          <span className="flex items-center gap-2 text-muted">
            <span className="h-0.5 w-5 bg-muted opacity-50" /> Spot
          </span>
          <span className="ml-auto">
            <Badge tone="outline">Illustrative prices</Badge>
          </span>
        </div>
        <LineChart series={c.series} focus={focus ?? "If it passes"} compareTo="If it fails" onFocus={setFocus} height={300} yFormat={(v) => fmt(v)} fit />
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          Conditional pool history is not exposed by the public endpoint this demo reads, so these curves are simulated around the live spot price. Proposal,
          market and DAO outcome are real.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* How to read */}
        <div className="rounded-[24px] bg-card shadow-card p-6">
          <div className="text-[16px] font-medium">How the two worlds work</div>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {[
              ["Split", `1 sDAI becomes YES-sDAI + NO-sDAI. ${org.token} splits the same way.`],
              ["Trade each world", `YES tokens trade only against YES tokens, so the YES pool prices ${org.token} in the world where it passes.`],
              ["Settle", "When the vote is final, the losing world's tokens are void and the winning world redeems 1:1."],
            ].map(([k, v], i) => (
              <div key={k} className={cx("relative rounded-[22px] p-4", i === 1 ? "tone-violet" : "bg-nested")}>
                <span className={cx("num grid h-9 w-9 place-items-center rounded-full text-[13px]", i === 1 ? "bg-white text-[#7D33FF]" : "bg-card")}>{i + 1}</span>
                <div className="mt-5 text-[16px] font-medium">{k}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-text-2">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[22px] tone-ink p-5 text-[13.5px] leading-relaxed text-text-2">
            <span className="font-medium text-text">Reading the gap.</span> A {num(Math.abs(edge), 1)}% premium means traders expect {org.token} to be worth that much{" "}
            {up ? "more" : "less"} if {p.code} passes. It is a forecast of one metric, not a recommendation, and it says nothing about values the token price
            doesn't capture.
          </div>
        </div>

        {/* Trade */}
        <div className="rounded-[24px] bg-card shadow-card p-5">
          <div className="mb-4 text-[15px] font-medium">Take a view</div>
          <Seg
            value={world}
            onChange={setWorld}
            className="w-full [&>button]:flex-1"
            options={[
              { value: "pass", label: "If it passes" },
              { value: "fail", label: "If it fails" },
            ]}
          />
          <div className="mt-5 space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-text-2">Buy</span>
              <span className="num">
                {world === "pass" ? "YES" : "NO"}-{org.token}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-2">Price</span>
              <span className="num">{fmt(world === "pass" ? c.pass : c.fail)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-2">Pays out</span>
              <span className="text-right">only if the vote {world === "pass" ? "passes" : "fails"}</span>
            </div>
          </div>
          <Button className="mt-5 w-full" size="lg" disabled={status !== "Open"}>
            {status === "Open" ? `Buy ${world === "pass" ? "YES" : "NO"}-${org.token}` : `Vote ${status.toLowerCase()} · market settled`}
          </Button>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">Simulated. If the other world wins, your collateral returns as the vote resolves.</p>
        </div>
      </div>

      {/* Governance timeline */}
      <div className="rounded-[24px] bg-card shadow-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-[16px] font-medium">Decision record</span>
          <span className="eyebrow">Advisory · the DAO decides</span>
        </div>
        <ol className="grid gap-5 sm:grid-cols-4">
          {[
            ["Proposal on Snapshot", p.code, true],
            ["Conditional markets created", m?.created ? date(m.created) : "—", true],
            ["DAO vote", m?.open ? date(m.open) : "—", !!m && m.open < now],
            ["Outcome", status === "Open" ? "Pending" : status, status !== "Open"],
          ].map(([k, v, done], i) => (
            <li key={String(k)} className="relative border-t border-line pt-4">
              <span className="absolute -top-[6px] left-0 bg-card pr-1">
                <Diamond size={11} on={!!done && i === 3} />
              </span>
              <div className={cx("text-[13.5px]", done ? "text-text" : "text-muted")}>{k}</div>
              <div className="num mt-1 text-[12px] text-text-2">{v}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Tile({ k, v, sub, on }: { k: string; v: string; sub?: string; on?: boolean }) {
  return (
    <div className={cx("rounded-[24px] p-5 shadow-card", on ? "tone-violet" : "bg-card")}>
      <div className="eyebrow mb-2">{k}</div>
      <div className={cx("num text-[28px] leading-none", on && "text-signal-ink")}>{v}</div>
      {sub && <div className="mt-2 text-[12px] text-muted">{sub}</div>}
    </div>
  );
}

function Record({ byId, outcome }: { byId: Map<string, Market>; outcome: (m?: Market) => string }) {
  return (
    <section className="mt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">On-chain record</div>
          <h2 className="text-[26px] md:text-[30px] font-medium tracking-[-0.025em]">Every advisory market, and what the DAO did</h2>
        </div>
        <p className="max-w-sm text-[13px] text-text-2">Outcomes are read from the Reality.eth answer each market resolved to.</p>
      </div>
      <div className="overflow-hidden rounded-[30px] bg-card p-2 shadow-card">
        {PROPOSALS.map((p) => {
          const m = byId.get(p.id);
          const st = outcome(m);
          return (
            <Link key={p.id} to={`/futarchy/${p.code.toLowerCase()}`} className="grid grid-cols-[96px_1fr_auto] md:grid-cols-[96px_120px_1fr_140px_110px] items-center gap-4 rounded-[20px] px-3 py-3 text-[14.5px] transition-colors hover:bg-nested">
              <span className="num inline-flex h-9 w-fit items-center rounded-full bg-nested px-3 text-[12.5px]">{p.code}</span>
              <span className="hidden md:block text-text-2">{ORGS.find((x) => x.key === p.org)?.name}</span>
              <span className="truncate">{p.title}</span>
              <span className="num hidden md:block text-text-2">{m?.open ? date(m.open) : "—"}</span>
              <span className="text-right">
                <OutcomeTag st={st} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
