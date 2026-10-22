import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Shell, Container } from "../ui/Shell";
import { Bento, BentoHead, DeviceTile, INK, StackRows, Tile, VIOLET } from "../ui/bento";
import { Arrow, Badge, Icon, LiveTag, Seg, Skeleton, cx } from "../ui/kit";
import { TradeTicket } from "../ui/Trade";
import { useLeaderboard, useLiveIds, useMarkets, type Market } from "../data/seer";
import { chainName, marketPath, num, pct, short, statusOf, stripUnit, usd } from "../data/market";
import { ZCASH_GRANTS } from "../data/deep-contests";
import { FEATURED } from "../data/featured";

/* ------------------------------------------------------------------ */
/* Contests: real Deep markets on Seer                                 */
/* ------------------------------------------------------------------ */

type Contest = {
  key: string;
  label: string;
  short: string;
  evaluator: string;
  question: string;
  kind: "binary" | "share";
  ids: string[];
  entryNoun: string;
};

const CONTESTS: Contest[] = [
  {
    key: "zcash",
    label: "Zcash retroactive grants",
    short: "Zcash · Q3 2026",
    evaluator: "ZEC coinholder poll",
    question: "Which grant proposals will coinholders approve?",
    kind: "binary",
    ids: ZCASH_GRANTS,
    entryNoun: "proposals",
  },
  {
    key: "deepfunding",
    label: "Deep Funding, round 2",
    short: "Deep Funding · R2",
    evaluator: "Expert jurors",
    question: "How much weight will jurors give each Ethereum repository?",
    kind: "share",
    ids: [FEATURED.deepRound2.id],
    entryNoun: "repositories",
  },
  {
    key: "octant",
    label: "Octant epoch 12",
    short: "Octant · E12",
    evaluator: "Community + matching pool",
    question: "What share of funding will each project receive?",
    kind: "share",
    ids: ["0xe85ada7cd6d33cb41ac596fb4749e3f94d836ece"],
    entryNoun: "projects",
  },
];

type Entry = { key: string; name: string; p: number; actual: number | null; market: Market; index: number };

function entriesFor(c: Contest, byId: Map<string, Market>): Entry[] {
  if (c.kind === "binary") {
    return c.ids
      .map((id) => byId.get(id))
      .filter((m): m is Market => !!m && m.odds[0] != null)
      .map((m) => ({
        key: m.id,
        name: m.name.replace(/^Will (.*?) be approved in the .*$/i, "$1"),
        p: m.odds[0] ?? 0,
        actual: m.payout ? (m.payout[0] !== "0" ? 1 : 0) : null,
        market: m,
        index: 0,
      }))
      .sort((a, b) => b.p - a.p);
  }
  const m = byId.get(c.ids[0]);
  if (!m) return [];
  const tot = m.payout ? m.payout.reduce((a, x, i) => a + (m.outcomes[i] === "Invalid" ? 0 : Number(x)), 0) : 0;
  const sumP = m.odds.reduce<number>((a, x, i) => a + (m.outcomes[i] === "Invalid" ? 0 : x ?? 0), 0) || 1;
  return m.outcomes
    .map((name, i) => ({
      key: `${m.id}:${i}`,
      name: name.trim(),
      p: ((m.odds[i] ?? 0) / sumP) * 100,
      actual: m.payout && tot ? (Number(m.payout[i]) / tot) * 100 : null,
      market: m,
      index: i,
    }))
    .filter((e) => e.name !== "Invalid")
    .sort((a, b) => b.p - a.p);
}

export default function Deep() {
  const { byId, liveAt, ready } = useMarkets();
  const params = useParams();
  const nav = useNavigate();
  const fromRoute = params.id ? CONTESTS.find((c) => c.ids.includes(params.id!)) : undefined;
  const [ck, setCk] = useState<string>(fromRoute?.key ?? "zcash");
  const c = CONTESTS.find((x) => x.key === ck)!;
  useLiveIds(c.ids);

  const entries = useMemo(() => entriesFor(c, byId), [c, byId]);
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<"human" | "agent">("human");
  const selected = entries.find((e) => e.key === sel) ?? entries[0];
  const vol = useMemo(() => c.ids.reduce((a, id) => a + (byId.get(id)?.vol ?? 0), 0), [c, byId]);
  const resolved = entries.length > 0 && entries.every((e) => e.actual != null);

  return (
    <Shell app="deep" wide>
      {/* Header */}
      <Bento>
        <BentoHead app="deep" name="Deep" meta={<LiveTag live={!!liveAt} at={liveAt} className="ml-2" />} title="A whole field, priced at once." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <DeviceTile device="field" tone="violet" field={entries.map((e) => e.p).sort((a, b) => b - a)} className="md:col-span-2 xl:col-span-6 xl:row-span-2 min-h-[400px]">
            <span className="w-fit rounded-full px-3 py-1.5 text-[12px]" style={{ background: "rgb(255 255 255 / 0.16)" }}>
              {c.short}
            </span>
            <div className="mt-auto max-w-[32ch] pt-20">
              <h2 className="text-[30px] leading-[1.05] tracking-[-0.03em] font-medium">{c.question}</h2>
              <div className="mt-6 flex gap-8">
                <span>
                  <span className="block text-[40px] leading-none tracking-[-0.03em]">{entries.length || "—"}</span>
                  <span className="mt-1 block text-[13px] text-white/75">{c.entryNoun}</span>
                </span>
                <span>
                  <span className="block text-[40px] leading-none tracking-[-0.03em]">{usd(vol)}</span>
                  <span className="mt-1 block text-[13px] text-white/75">traded</span>
                </span>
              </div>
              <p className="mt-6 text-[14px] leading-relaxed text-white/80">Forecasters, many of them AI agents, price how each entry will be judged ({c.evaluator}). The evaluators still decide.</p>
            </div>
          </DeviceTile>

          <Tile className="xl:col-span-3" title="Contests">
            <StackRows
              items={CONTESTS.map((x) => {
                const es = entriesFor(x, byId);
                const done = es.length > 0 && es.every((e) => e.actual != null);
                return {
                  key: x.key,
                  title: x.question,
                  sub: `${es.length || "—"} ${x.entryNoun} · ${usd(x.ids.reduce((a, id) => a + (byId.get(id)?.vol ?? 0), 0))}`,
                  value: done ? "Done" : "Open",
                  active: ck === x.key,
                  onClick: () => {
                    setCk(x.key);
                    setSel(null);
                    if (params.id) nav("/deep", { replace: true });
                  },
                };
              })}
            />
          </Tile>

          <Tile className="xl:col-span-3" title="Leading the field" to="#field">
            <StackRows
              items={[...entries]
                .sort((a, b) => b.p - a.p)
                .slice(0, 3)
                .map((e, i) => ({ key: e.key, badge: String(i + 1).padStart(2, "0"), title: e.name, value: pct(e.p), valueSub: e.actual != null ? "resolved" : "forecast", onClick: () => setSel(e.key) }))}
            />
          </Tile>

          <Tile className="md:col-span-2 xl:col-span-6" title="Every entry, by forecast">
            {entries.length ? (
              <>
                <div className="mt-5 flex h-36 items-end gap-[3px]">
                  {[...entries]
                    .sort((a, b) => b.p - a.p)
                    .map((e, i, arr) => (
                      <button
                        key={e.key}
                        onClick={() => setSel(e.key)}
                        title={`${e.name} ${pct(e.p)}`}
                        aria-label={`${e.name} ${pct(e.p)}`}
                        className="flex-1 rounded-t-[6px] transition-opacity hover:opacity-70 cursor-pointer"
                        style={{ height: `${Math.max(4, (e.p / (arr[0].p || 1)) * 100)}%`, background: e.key === selected?.key ? VIOLET : i < 3 ? INK : "var(--line-strong)" }}
                      />
                    ))}
                </div>
                <div className="mt-3 flex justify-between text-[12px] text-text-2">
                  <span>Highest forecast</span>
                  <span>{entries.length} entries</span>
                </div>
              </>
            ) : (
              <Skeleton className="mt-5 h-36" />
            )}
          </Tile>
        </div>
      </Bento>

      <span id="field" className="block scroll-mt-24" />
      <Container wide className="py-10">
        {!ready || !entries.length ? (
          <Skeleton className="h-[480px]" />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0 space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="eyebrow mb-2">
                    {c.label} · {c.evaluator}
                  </div>
                  <h2 className="text-[26px] md:text-[30px] font-medium tracking-[-0.025em] leading-tight">{c.question}</h2>
                </div>
                <div className="text-right text-[13px] text-text-2">
                  <span className="num text-text">{usd(vol)}</span> traded · {chainName(entries[0].market.chainId)}
                </div>
              </div>

              {c.kind === "binary" ? (
                <BinaryField entries={entries} sel={selected?.key} onSel={setSel} resolved={resolved} />
              ) : (
                <ShareField entries={entries} sel={selected?.key} onSel={setSel} resolved={resolved} noun={c.entryNoun} />
              )}
            </div>

            {/* Side panel */}
            <aside className="space-y-4 xl:sticky xl:top-24 self-start">
              <Seg
                value={view}
                onChange={setView}
                options={[
                  { value: "human", label: "Reviewer view" },
                  { value: "agent", label: "Agent view" },
                ]}
              />
              {selected && view === "human" && <EntryPanel e={selected} c={c} rank={entries.indexOf(selected) + 1} total={entries.length} />}
              {selected && view === "agent" && <AgentPanel c={c} entries={entries} e={selected} />}
            </aside>
          </div>
        )}

        <Forecasters />
      </Container>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Binary field: many yes/no proposals → review queue                  */
/* ------------------------------------------------------------------ */

function BinaryField({ entries, sel, onSel, resolved }: { entries: Entry[]; sel?: string; onSel: (k: string) => void; resolved: boolean }) {
  const [t, setT] = useState(60);
  const [reveal, setReveal] = useState(resolved);
  const above = entries.filter((e) => e.p >= t);
  const below = entries.filter((e) => e.p < t);
  const hit = (xs: Entry[]) => xs.filter((e) => e.actual === 1).length;

  return (
    <div className="space-y-6">
      {/* Threshold control: the funding team's lens */}
      <div className="rounded-[24px] bg-card shadow-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[15px] font-medium">Review threshold</div>
            <div className="text-[13px] text-text-2">Proposals above the line look likely to pass. Spend reviewer time below it.</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="num w-12 text-right text-[22px] text-signal-ink">{t}%</span>
          </div>
        </div>
        <input type="range" min={10} max={90} value={t} onChange={(e) => setT(Number(e.target.value))} className="mt-4 w-full accent-[var(--signal)]" aria-label="Review threshold" />
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Mini k="Above the line" v={String(above.length)} s="likely approvals" />
          <Mini k="Below the line" v={String(below.length)} s="need a closer look" />
          {resolved && reveal ? (
            <>
              <Mini k="Approved above" v={`${hit(above)}/${above.length}`} s={above.length ? `${Math.round((hit(above) / above.length) * 100)}% hit rate` : "—"} on />
              <Mini k="Approved below" v={`${hit(below)}/${below.length}`} s={below.length ? `${Math.round((hit(below) / below.length) * 100)}% slipped through` : "—"} />
            </>
          ) : (
            <div className="col-span-2 flex items-center rounded-xl border border-dashed border-line-strong px-4 text-[13px] text-muted">
              {resolved ? "Outcome hidden. Reveal it to check the forecast." : "Results appear here once the poll resolves."}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[30px] bg-card p-3 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-2 pb-4">
          <div>
            <h3 className="text-[19px] font-medium tracking-[-0.02em]">Every proposal, ranked</h3>
            <p className="mt-0.5 text-[13px] text-text-2">{entries.length} proposals, ordered by the market’s approval forecast</p>
          </div>
          {resolved && (
            <button
              role="switch"
              aria-checked={reveal}
              onClick={() => setReveal(!reveal)}
              className="inline-flex h-11 items-center gap-3 rounded-full bg-nested pl-1.5 pr-4 text-[13px] cursor-pointer"
            >
              <span className={cx("flex h-8 w-14 items-center rounded-full p-1 transition-colors", reveal ? "bg-signal" : "bg-line-strong")}>
                <span className={cx("h-6 w-6 rounded-full bg-white shadow transition-transform", reveal && "translate-x-6")} />
              </span>
              Coinholder result
            </button>
          )}
        </div>

        <ol className="space-y-1.5">
          {entries.map((e, k) => {
            const first = k > 0 && entries[k - 1].p >= t && e.p < t;
            const on = sel === e.key;
            const above = e.p >= t;
            return (
              <li key={e.key}>
                {first && (
                  <div className="my-3 flex items-center gap-3 px-3" aria-label={`Review line at ${t}%`}>
                    <span className="h-px flex-1 border-t-2 border-dashed border-signal/40" />
                    <span className="rounded-full bg-signal-soft px-3.5 py-1.5 text-[12.5px] text-signal-ink">Review line · {t}%</span>
                    <span className="h-px flex-1 border-t-2 border-dashed border-signal/40" />
                  </div>
                )}
                <button
                  onClick={() => onSel(e.key)}
                  aria-pressed={on}
                  className={cx(
                    "grid w-full grid-cols-[40px_minmax(0,1fr)_52px] md:grid-cols-[40px_minmax(0,1fr)_200px_56px_128px] items-center gap-4 rounded-[20px] px-3 py-2.5 text-left transition-colors cursor-pointer",
                    on ? "tone-ink" : "hover:bg-nested",
                  )}
                >
                  <span
                    className={cx(
                      "num grid h-10 w-10 place-items-center rounded-full text-[13px]",
                      on ? "bg-signal text-white" : k < 3 ? "bg-text text-bg" : "bg-nested text-text-2",
                    )}
                  >
                    {k + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px]">{e.name}</span>
                    <span className="mt-0.5 block text-[12px] text-text-2 md:hidden">{above ? "Above the review line" : "Below the review line"}</span>
                  </span>
                  <span className="relative hidden h-3 rounded-full bg-nested md:block">
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${e.p}%`, background: above ? "var(--signal)" : "var(--line-strong)" }} />
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] border-2 border-[var(--card)] bg-text" style={{ left: `${t}%` }} />
                  </span>
                  <span className="num text-right text-[16px] tracking-[-0.02em]">{pct(e.p, 0)}</span>
                  <span className="hidden justify-end md:flex">
                    {reveal && e.actual != null ? (
                      e.actual ? (
                        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-signal px-3 text-[12px] text-white">
                          <Icon name="check" className="h-3.5 w-3.5" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex h-8 items-center rounded-full bg-nested px-3 text-[12px] text-text-2">Not approved</span>
                      )
                    ) : (
                      <span className="inline-flex h-8 items-center rounded-full border border-dashed border-line-strong px-3 text-[12px] text-muted">{resolved ? "Hidden" : "Pending"}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Mini({ k, v, s, on }: { k: string; v: string; s: string; on?: boolean }) {
  return (
    <div className={cx("rounded-[22px] p-4", on ? "tone-violet" : "bg-nested")}>
      <div className="eyebrow mb-1.5">{k}</div>
      <div className={cx("num text-[24px] leading-none", on && "text-signal-ink")}>{v}</div>
      <div className="mt-1.5 text-[12px] text-text-2">{s}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Share field: one market, many weights → treemap + concentration     */
/* ------------------------------------------------------------------ */

function ShareField({ entries, sel, onSel, resolved, noun }: { entries: Entry[]; sel?: string; onSel: (k: string) => void; resolved: boolean; noun: string }) {
  const [mode, setMode] = useState<"forecast" | "actual">("forecast");
  const val = (e: Entry) => (mode === "actual" && e.actual != null ? e.actual : e.p);
  const sorted = [...entries].sort((a, b) => val(b) - val(a));
  const W = 1000,
    H = 520;
  const rects = useMemo(() => squarify(sorted.map((e) => ({ key: e.key, v: Math.max(0.0001, val(e)) })), 0, 0, W, H), [sorted.map((e) => e.key + val(e)).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const total = sorted.reduce((a, e) => a + val(e), 0) || 1;
  let cum = 0;
  const curve = sorted.map((e) => (cum += val(e) / total));
  const nAt = (f: number) => curve.findIndex((c) => c >= f) + 1;
  const mae = resolved ? entries.reduce((a, e) => a + Math.abs(e.p - (e.actual ?? 0)), 0) / entries.length : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="eyebrow">
          {entries.length} {noun} · area = {mode === "forecast" ? "market forecast" : "final result"}
        </div>
        {resolved && (
          <Seg
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: "forecast", label: "Market forecast" },
              { value: "actual", label: "Final result" },
            ]}
          />
        )}
      </div>

      <div className="overflow-hidden rounded-[24px] bg-card shadow-card p-1.5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ aspectRatio: `${W}/${H}` }}>
          {rects.map((r, i) => {
            const e = byKey.get(r.key)!;
            const on = sel ? sel === r.key : i === 0;
            const big = r.w > 90 && r.h > 34;
            return (
              <g key={r.key} onClick={() => onSel(r.key)} className="cursor-pointer">
                <rect
                  x={r.x + 1.5}
                  y={r.y + 1.5}
                  width={Math.max(0, r.w - 3)}
                  height={Math.max(0, r.h - 3)}
                  rx={6}
                  fill={on ? "var(--signal)" : i < 3 ? "var(--signal-soft)" : "var(--nested)"}
                  stroke={on ? "var(--signal)" : "var(--line)"}
                  className="transition-[fill] duration-200 hover:fill-[var(--signal-fog)]"
                />
                {big && (
                  <>
                    <text x={r.x + 12} y={r.y + 24} fontSize={r.w > 220 ? 15 : 12} fill={on ? "#fff" : "var(--text)"} style={{ pointerEvents: "none" }}>
                      {truncate(e.name.split("/").pop() ?? e.name, Math.floor(r.w / (r.w > 220 ? 8.5 : 7)))}
                    </text>
                    {r.h > 54 && (
                      <text x={r.x + 12} y={r.y + 44} fontSize="12" fill={on ? "rgba(255,255,255,.75)" : "var(--text-2)"} style={{ fontFamily: "var(--font-mono)", pointerEvents: "none" }}>
                        {pct(val(e))}
                      </text>
                    )}
                    {r.h > 80 && r.w > 160 && e.name.includes("/") && (
                      <text x={r.x + 12} y={r.y + r.h - 14} fontSize="11" fill={on ? "rgba(255,255,255,.6)" : "var(--muted)"} style={{ fontFamily: "var(--font-mono)", pointerEvents: "none" }}>
                        {e.name.split("/")[0]}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] bg-card shadow-card p-5">
          <div className="text-[15px] font-medium">Concentration</div>
          <p className="mt-1 text-[13px] text-text-2">
            <span className="num text-text">{nAt(0.5)}</span> of {entries.length} {noun} hold half of the {mode === "forecast" ? "forecast" : "final"} weight;{" "}
            <span className="num text-text">{nAt(0.8)}</span> hold 80%.
          </p>
          <Curve curve={curve} />
        </div>
        <div className="rounded-[24px] bg-card shadow-card p-5">
          <div className="text-[15px] font-medium">{resolved ? "Forecast vs. result" : "How this resolves"}</div>
          {resolved ? (
            <>
              <p className="mt-1 text-[13px] text-text-2">
                Mean absolute error across the field: <span className="num text-text">{num(mae ?? 0, 2)} pts</span>. Biggest misses:
              </p>
              <div className="mt-3 space-y-2">
                {[...entries]
                  .sort((a, b) => Math.abs(b.p - (b.actual ?? 0)) - Math.abs(a.p - (a.actual ?? 0)))
                  .slice(0, 4)
                  .map((e) => (
                    <div key={e.key} className="flex items-center gap-3 text-[13px]">
                      <span className="flex-1 truncate">{e.name}</span>
                      <span className="num text-text-2">{pct(e.p)}</span>
                      <Arrow className="h-3 w-3 text-muted" />
                      <span className="num w-12 text-right">{pct(e.actual)}</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="mt-1 text-[13px] leading-relaxed text-text-2">
              Each {noun.replace(/s$/, "")} has its own outcome token. When the evaluators publish their weights, each token redeems for its share of the
              collateral. Prices today are the field's best guess at that split.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Curve({ curve }: { curve: number[] }) {
  const W = 400,
    H = 120;
  const n = curve.length;
  const d = curve.map((c, i) => `${i ? "L" : "M"}${((i + 1) / n) * W},${H - c * H}`).join("");
  const i50 = curve.findIndex((c) => c >= 0.5);
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="mt-4 w-full">
      <line x1="0" y1={H} x2={W} y2={H} stroke="var(--line)" />
      <line x1="0" y1={H} x2={W} y2="0" stroke="var(--line-strong)" strokeDasharray="3 4" />
      <path d={`M0,${H}${d.replace("M", "L")}L${W},${H}Z`} fill="var(--signal-soft)" />
      <path d={`M0,${H}${d.replace("M", "L")}`} fill="none" stroke="var(--signal)" strokeWidth="2" />
      {i50 >= 0 && (
        <g>
          <line x1={((i50 + 1) / n) * W} x2={((i50 + 1) / n) * W} y1={H / 2} y2={H} stroke="var(--text)" strokeDasharray="2 3" />
          <rect x={((i50 + 1) / n) * W - 4} y={H / 2 - 4} width="8" height="8" transform={`rotate(45 ${((i50 + 1) / n) * W} ${H / 2})`} fill="var(--signal)" />
        </g>
      )}
      <text x="0" y={H + 15} fontSize="10" fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>
        TOP ENTRY
      </text>
      <text x={W} y={H + 15} fontSize="10" fill="var(--muted)" textAnchor="end" style={{ fontFamily: "var(--font-mono)" }}>
        ALL {n}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Side panels                                                         */
/* ------------------------------------------------------------------ */

function EntryPanel({ e, c, rank, total }: { e: Entry; c: Contest; rank: number; total: number }) {
  const m = e.market;
  const resolved = statusOf(m) === "Resolved";
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-card shadow-card p-5">
        <div className="eyebrow mb-2">
          #{rank} of {total}
        </div>
        <div className="text-[20px] font-medium leading-snug tracking-tight break-words">{e.name}</div>
        {e.name.includes("/") && (
          <a href={`https://github.com/${e.name}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-text-2 hover:text-text">
            github.com/{e.name} <Arrow dir="up-right" className="h-3 w-3" />
          </a>
        )}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <div className="eyebrow mb-1">{c.kind === "binary" ? "Approval forecast" : "Forecast share"}</div>
            <div className="num text-[28px] leading-none text-signal-ink">{pct(e.p)}</div>
          </div>
          <div>
            <div className="eyebrow mb-1">Result</div>
            <div className="num text-[28px] leading-none">{e.actual == null ? "—" : c.kind === "binary" ? (e.actual ? "Yes" : "No") : pct(e.actual)}</div>
          </div>
        </div>
        <Link to={marketPath(m)} className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[13px] text-text-2 hover:text-text">
          <span className="truncate">{c.kind === "binary" ? stripUnit(m.name) : `Market ${short(m.id)}`}</span>
          <Arrow className="h-4 w-4 shrink-0" />
        </Link>
      </div>
      {!resolved && <TradeTicket market={m} initial={e.index} compact />}
      {resolved && (
        <div className="rounded-[24px] bg-card shadow-card p-5 text-[13px] leading-relaxed text-text-2">
          This market has resolved. Winning tokens redeem for sDAI on the{" "}
          <Link to={marketPath(m)} className="text-signal-ink hover:underline">
            market page
          </Link>
          .
        </div>
      )}
    </div>
  );
}

function AgentPanel({ c, entries, e }: { c: Contest; entries: Entry[]; e: Entry }) {
  const m = e.market;
  const spec = {
    question: c.question,
    evaluator: c.evaluator,
    chainId: m.chainId,
    market: c.kind === "binary" ? undefined : m.id,
    resolution: c.kind === "binary" ? "YES token pays 1 if approved" : "each token pays its final share of collateral",
    entries: entries.slice(0, 4).map((x) => ({
      name: x.name,
      forecast: Number((x.p / 100).toFixed(4)),
      ...(c.kind === "binary" ? { market: x.market.id } : { outcomeIndex: x.index }),
    })),
    "…": `${entries.length - 4} more`,
  };
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-card shadow-card p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[15px] font-medium">Built for agents</span>
          <Badge tone="signal">Open API</Badge>
        </div>
        <p className="text-[13px] leading-relaxed text-text-2">
          Agents read the same field as reviewers, as structured data, and trade through the same router. No scraping, no special access.
        </p>
      </div>
      <div className="overflow-hidden rounded-[30px] bg-card p-2 shadow-card">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="eyebrow">field.json</span>
        </div>
        <pre className="num max-h-[300px] overflow-auto p-4 text-[11.5px] leading-[1.6] text-text-2 scroll-thin">{JSON.stringify(spec, null, 2)}</pre>
      </div>
      <div className="overflow-hidden rounded-[30px] bg-card p-2 shadow-card">
        <div className="px-4 pt-3 pb-2 eyebrow">Read · then trade</div>
        <pre className="num overflow-x-auto p-4 text-[11.5px] leading-[1.7] text-text-2 scroll-thin">
          {`curl -X POST https://app.seer.pm/.netlify/functions/get-market \\
  -d '{"chainId":${m.chainId},"id":"${short(m.id, 6)}"}'

import { trade } from "@seer-pm/sdk"
await trade({ market, outcome: ${e.index}, amount })`}
        </pre>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Forecasters (real P/L leaderboard for the Deep Funding app)         */
/* ------------------------------------------------------------------ */

function Forecasters() {
  const rows = useLeaderboard("deepfund");
  return (
    <section className="mt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Forecasters · Deep Funding markets</div>
          <h2 className="text-[26px] md:text-[30px] font-medium tracking-[-0.025em]">Who has read the field best</h2>
        </div>
        <p className="max-w-sm text-[13px] text-text-2">Realised P/L across every Deep Funding market, from Seer's leaderboard. Wallets may be people, agents, or both.</p>
      </div>
      <div className="overflow-hidden rounded-[30px] bg-card p-2 shadow-card">
        <div className="hidden md:grid grid-cols-[48px_1fr_120px_120px_100px_90px_120px] gap-4 px-4 pt-3 pb-2 eyebrow">
          <span>#</span>
          <span>Wallet</span>
          <span className="text-right">P/L</span>
          <span className="text-right">Volume</span>
          <span className="text-right">ROI</span>
          <span className="text-right">Markets</span>
          <span className="text-right">Score</span>
        </div>
        {!rows && <Skeleton className="m-5 h-40" />}
        {rows?.slice(0, 10).map((r, i) => (
          <div key={r.address} className="grid grid-cols-[48px_1fr_auto] md:grid-cols-[48px_1fr_120px_120px_100px_90px_120px] items-center gap-4 rounded-[18px] px-4 py-3 text-[13px] transition-colors hover:bg-nested">
            <span className="num text-muted">{String(r.rank).padStart(2, "0")}</span>
            <span className="num truncate">{r.username ? `@${r.username}` : short(r.address, 5)}</span>
            <span className={cx("num text-right", i === 0 ? "text-signal-ink" : "text-text")}>{r.pnl >= 0 ? "+" : ""}{usd(r.pnl)}</span>
            <span className="num hidden md:block text-right text-text-2">{usd(r.volume)}</span>
            <span className="num hidden md:block text-right text-text-2">{r.roi == null ? "—" : `${num(r.roi * 100, 0)}%`}</span>
            <span className="num hidden md:block text-right text-text-2">{r.marketCount}</span>
            <span className="hidden md:block text-right">{r.score != null ? <Badge tone={r.tier === "Elite" || r.tier === "Great" ? "signal" : "neutral"}>{`${r.score} · ${r.tier}`}</Badge> : <span className="text-[12px] text-muted">unscored</span>}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Squarified treemap                                                  */
/* ------------------------------------------------------------------ */

type Rect = { key: string; x: number; y: number; w: number; h: number };

function squarify(items: { key: string; v: number }[], x: number, y: number, w: number, h: number): Rect[] {
  const total = items.reduce((a, i) => a + i.v, 0);
  if (!total) return [];
  const scale = (w * h) / total;
  const nodes = items.map((i) => ({ key: i.key, a: i.v * scale }));
  const out: Rect[] = [];
  let row: typeof nodes = [];
  let rx = x,
    ry = y,
    rw = w,
    rh = h;
  const worst = (r: typeof nodes, side: number) => {
    const s = r.reduce((a, n) => a + n.a, 0);
    const mx = Math.max(...r.map((n) => n.a)),
      mn = Math.min(...r.map((n) => n.a));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const layout = (r: typeof nodes) => {
    const s = r.reduce((a, n) => a + n.a, 0);
    if (rw >= rh) {
      const cw = s / rh;
      let cy = ry;
      for (const n of r) {
        const nh = n.a / cw;
        out.push({ key: n.key, x: rx, y: cy, w: cw, h: nh });
        cy += nh;
      }
      rx += cw;
      rw -= cw;
    } else {
      const ch = s / rw;
      let cx = rx;
      for (const n of r) {
        const nw = n.a / ch;
        out.push({ key: n.key, x: cx, y: ry, w: nw, h: ch });
        cx += nw;
      }
      ry += ch;
      rh -= ch;
    }
  };
  for (const n of nodes) {
    const side = Math.min(rw, rh);
    if (!row.length || worst([...row, n], side) <= worst(row, side)) row.push(n);
    else {
      layout(row);
      row = [n];
    }
  }
  if (row.length) layout(row);
  return out;
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s);
