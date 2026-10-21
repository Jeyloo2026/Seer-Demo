import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Shell, Container } from "../ui/Shell";
import { AppGlyph, Arrow, Badge, Button, Icon, LiveTag, Seg, Skeleton, cx } from "../ui/kit";
import { LineChart } from "../ui/charts";
import { TradeTicket } from "../ui/Trade";
import { useChart, useLeaderboard, useLiveIds, useMarkets, type Market } from "../data/seer";
import { date, marketPath, num, pct, ranked, short, statusOf, usd } from "../data/market";
import { useDecisionStory } from "../data/story";
import { FEATURED } from "../data/featured";

const CONTESTS = [
  { id: FEATURED.jobboard.id, chainId: 100, label: "AI job board name", reviewer: "Seer team", noun: "names", kind: "names" as const },
  { id: FEATURED.rebrand.id, chainId: 100, label: "Seer rebrand", reviewer: "Seer team", noun: "designs", kind: "names" as const },
  { id: FEATURED.devcon.id, chainId: 100, label: "Devcon merch", reviewer: "Seer team", noun: "designs", kind: "names" as const },
];

/* Reviewer shortlist, kept per viewer in this browser only. */
function useShortlist(key: string) {
  const k = `seer-shortlist-${key}`;
  const [list, setList] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(k) || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      setList(JSON.parse(localStorage.getItem(k) || "[]"));
    } catch {
      setList([]);
    }
  }, [k]);
  const toggle = (n: string) =>
    setList((l) => {
      const next = l.includes(n) ? l.filter((x) => x !== n) : [...l, n];
      try {
        localStorage.setItem(k, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  return [list, toggle] as const;
}

export default function Opportunity() {
  const { byId, liveAt, ready } = useMarkets();
  const { slug } = useParams();
  const nav = useNavigate();
  const c = CONTESTS.find((x) => x.id === slug) ?? CONTESTS[0];
  const m = byId.get(c.id);
  useLiveIds(CONTESTS.map((x) => x.id));

  return (
    <Shell app="opportunity" wide>
      <section className="border-b border-line bg-card">
        <Container wide className="py-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <AppGlyph app="opportunity" className="h-6 w-6 text-text" />
                <span className="text-[15px] font-medium">Opportunity Markets</span>
                <LiveTag live={!!liveAt} at={liveAt} />
              </div>
              <h1 className="display text-[44px] md:text-[68px]">
                Every submission
                <br />
                <span className="text-muted">is an outcome.</span>
              </h1>
            </div>
            <div>
              <p className="text-[16px] leading-relaxed text-text-2">
                Entries to an open call become outcomes of one market. Traders forecast which ones the reviewers will select, and reviewers get a live read on
                the field before they decide. The selection stays with the reviewers; the market only adds a signal.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <SubmitButton />
                <a href="#how" className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-[14px] hover:border-text">
                  How it works
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
            {CONTESTS.map((x) => {
              const mk = byId.get(x.id);
              const st = mk ? statusOf(mk) : null;
              const top = mk ? ranked(mk) : [];
              const won = top.filter((o) => o.won);
              return (
                <button
                  key={x.id}
                  onClick={() => nav(`/opportunity/${x.id}`)}
                  className={cx("rounded-2xl border p-5 text-left transition-colors cursor-pointer", c.id === x.id ? "border-text bg-bg" : "border-line hover:border-line-strong")}
                >
                  <div className="flex items-center gap-2">
                    <span className="eyebrow">{x.label}</span>
                    <span className="ml-auto">{st === "Resolved" ? <Badge tone="neutral">Selected</Badge> : <Badge tone="signal">Open</Badge>}</span>
                  </div>
                  <div className="mt-3 line-clamp-2 text-[15px] font-medium leading-snug">{mk?.name ?? "—"}</div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-2">
                    <span>
                      <span className="num text-text">{mk ? mk.outcomes.length - 1 : "—"}</span> {x.noun}
                    </span>
                    <span>
                      <span className="num text-text">{usd(mk?.vol ?? 0)}</span> traded
                    </span>
                    {won.length > 0 && <span className="truncate text-signal-ink">✓ {won.map((w) => w.name).join(", ")}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      <Container wide className="py-10">{!ready || !m ? <Skeleton className="h-[600px]" /> : <Contest m={m} c={c} />}</Container>

      <Container wide>
        <How />
        <Traders />
      </Container>
    </Shell>
  );
}

function Contest({ m, c }: { m: Market; c: (typeof CONTESTS)[0] }) {
  const resolved = statusOf(m) === "Resolved";
  return resolved ? <ResolvedContest m={m} c={c} /> : <OpenContest m={m} c={c} />;
}

/* ------------------------------------------------------------------ */
/* Open call: gallery + reviewer shortlist + trade                     */
/* ------------------------------------------------------------------ */

function OpenContest({ m, c }: { m: Market; c: (typeof CONTESTS)[0] }) {
  const outs = useMemo(() => ranked(m), [m]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"market" | "az">("market");
  const [sel, setSel] = useState<number>(outs[0]?.i ?? 0);
  const [mode, setMode] = useState<"trade" | "review">("review");
  const [short_, toggle] = useShortlist(m.id);
  const { series } = useChart(m.chainId, m.id, m.outcomes);
  const shown = outs.filter((o) => !q || o.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (sort === "az" ? a.name.localeCompare(b.name) : (b.p ?? 0) - (a.p ?? 0)));
  const top5 = outs.slice(0, 5).map((o) => o.name);
  const overlap = short_.filter((n) => top5.includes(n));
  const selO = outs.find((o) => o.i === sel);
  const max = outs[0]?.p ?? 1;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow mb-2">
              {c.label} · selected by {c.reviewer}
            </div>
            <h2 className="max-w-3xl text-[26px] md:text-[30px] font-medium leading-tight tracking-[-0.025em]">{m.name}</h2>
          </div>
          <Link to={marketPath(m)} className="inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text">
            {short(m.id)} <Arrow className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Podium */}
        <div className="grid gap-3 md:grid-cols-3">
          {outs.slice(0, 3).map((o, k) => (
            <button
              key={o.i}
              onClick={() => setSel(o.i)}
              className={cx("relative overflow-hidden rounded-2xl border p-6 text-left transition-colors cursor-pointer", k === 0 ? "border-signal bg-signal text-on-signal" : "border-line bg-card hover:border-line-strong")}
            >
              <div className={cx("eyebrow", k === 0 && "!text-white/70")}>Market rank {k + 1}</div>
              <div className="mt-8 break-words text-[30px] md:text-[34px] font-medium leading-none tracking-[-0.03em]">{o.name}</div>
              <div className="mt-6 flex items-end justify-between">
                <span className={cx("text-[12px]", k === 0 ? "text-white/70" : "text-muted")}>selection forecast</span>
                <span className="num text-[24px] leading-none">{pct(o.p)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* History */}
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[15px] font-medium">How the field has moved</span>
            <span className="eyebrow">Top 8 · pool prices</span>
          </div>
          {series ? (
            <LineChart series={series.filter((s) => outs.slice(0, 8).some((o) => o.name === s.name))} focus={selO?.name ?? outs[0]?.name} height={240} />
          ) : (
            <Skeleton className="h-[240px]" />
          )}
        </div>

        {/* Gallery */}
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex h-10 flex-1 min-w-[220px] items-center gap-2 rounded-full border border-line bg-card px-4 focus-within:border-signal">
              <Icon name="search" className="h-4 w-4 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${outs.length} ${c.noun}`} className="h-full flex-1 bg-transparent text-[14px] outline-none" />
            </div>
            <Seg
              size="sm"
              value={sort}
              onChange={setSort}
              options={[
                { value: "market", label: "By forecast" },
                { value: "az", label: "A–Z" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((o) => {
              const starred = short_.includes(o.name);
              return (
                <div
                  key={o.i}
                  onClick={() => setSel(o.i)}
                  className={cx("group relative cursor-pointer rounded-xl border bg-card p-4 transition-colors", sel === o.i ? "border-text" : "border-line hover:border-line-strong")}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(o.name);
                    }}
                    aria-label={starred ? "Remove from shortlist" : "Add to shortlist"}
                    className={cx("absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full transition-colors cursor-pointer", starred ? "bg-text text-bg" : "text-muted hover:bg-nested hover:text-text")}
                  >
                    <Icon name="bookmark" className="h-3.5 w-3.5" />
                  </button>
                  <div className="num text-[11px] text-muted">#{outs.indexOf(o) + 1}</div>
                  <div className="mt-5 truncate pr-2 text-[17px] font-medium tracking-[-0.02em]">{o.name}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-nested">
                      <div className="h-full rounded-full" style={{ width: `${((o.p ?? 0) / max) * 100}%`, background: outs.indexOf(o) === 0 ? "var(--signal)" : "var(--line-strong)" }} />
                    </div>
                    <span className="num text-[12px] text-text-2">{pct(o.p)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 self-start">
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { value: "review", label: "Reviewer" },
            { value: "trade", label: "Trader" },
          ]}
        />
        {mode === "review" ? (
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="text-[15px] font-medium">Your shortlist</div>
            <p className="mt-1 text-[13px] leading-relaxed text-text-2">Bookmark entries as you review. The market's view sits next to yours; it never replaces it.</p>
            {short_.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line-strong p-5 text-center text-[13px] text-muted">Nothing shortlisted yet. Use the bookmark on any card.</div>
            ) : (
              <div className="mt-4 space-y-1.5">
                {short_.map((n) => {
                  const o = outs.find((x) => x.name === n);
                  const r = o ? outs.indexOf(o) + 1 : null;
                  return (
                    <div key={n} className="flex items-center gap-3 rounded-lg bg-nested px-3 py-2 text-[13px]">
                      <span className="flex-1 truncate">{n}</span>
                      <span className="num text-[12px] text-text-2">market #{r}</span>
                      <button onClick={() => toggle(n)} className="text-muted hover:text-text cursor-pointer" aria-label="Remove">
                        <Icon name="x" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div>
                <div className="eyebrow mb-1">Shortlisted</div>
                <div className="num text-[22px]">{short_.length}</div>
              </div>
              <div>
                <div className="eyebrow mb-1">In market top 5</div>
                <div className="num text-[22px]">
                  {overlap.length}
                  <span className="text-[14px] text-muted">/{Math.min(5, short_.length) || 0}</span>
                </div>
              </div>
            </div>
            {short_.length > 0 && (
              <p className="mt-3 text-[12px] leading-relaxed text-text-2">
                {overlap.length === short_.length
                  ? "Your shortlist agrees with the market. Worth asking whether you're both missing something."
                  : `${short_.length - overlap.length} of your picks sit outside the market's top 5. That's information, not a mistake.`}
              </p>
            )}
            <p className="mt-4 text-[11px] text-muted">Shortlist stays in this browser.</p>
          </div>
        ) : (
          <TradeTicket market={m} initial={sel} compact />
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resolved call: what the market said vs. what reviewers chose       */
/* ------------------------------------------------------------------ */

function ResolvedContest({ m, c }: { m: Market; c: (typeof CONTESTS)[0] }) {
  const story = useDecisionStory(m.chainId, m.id, m);
  const outs = ranked(m);
  const winners = outs.filter((o) => o.won);
  const [focus, setFocus] = useState<string | null>(null);
  const chosenNames = winners.map((w) => w.name);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow mb-2">
            {c.label} · selected by {c.reviewer} · resolved {date(m.fin && m.fin < 33e9 ? m.fin : m.open)}
          </div>
          <h2 className="max-w-3xl text-[26px] md:text-[30px] font-medium leading-tight tracking-[-0.025em]">{m.name}</h2>
        </div>
        <Link to={marketPath(m)} className="inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text">
          {short(m.id)} <Arrow className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-line bg-ink p-8 text-white">
          <div className="eyebrow !text-white/50">Selected</div>
          <div className="mt-6 space-y-2">
            {winners.map((w) => (
              <div key={w.name} className="text-[34px] md:text-[44px] font-medium leading-[1.02] tracking-[-0.03em]">
                {w.name}
              </div>
            ))}
          </div>
          {story && (
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-[13px]">
              <div>
                <div className="eyebrow !text-white/50 mb-1">Market's pick before the decision</div>
                <div className="text-[16px]">{story.fav.name}</div>
                <div className="num text-white/60">{pct(story.fav.p, 0)}</div>
              </div>
              <div>
                <div className="eyebrow !text-white/50 mb-1">Selected entries were ranked</div>
                <div className="num text-[16px]">{chosenNames.map((n) => `#${story.rank(n)}`).join(", ") || "—"}</div>
                <div className="text-white/60">of {story.at.length} by the market</div>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-line bg-card p-8">
          <div className="text-[18px] font-medium tracking-tight">{story && chosenNames.includes(story.fav.name) ? "The market saw it coming." : "Reviewers went their own way."}</div>
          <p className="mt-3 text-[14px] leading-relaxed text-text-2">
            {story && chosenNames.includes(story.fav.name)
              ? `${story.fav.name} led the market going into the decision, and the reviewers selected it.`
              : `The market's favourite was ${story?.fav.name ?? "another entry"}. The reviewers selected ${chosenNames.join(", ")}. Forecasts surface strong entries; they don't make the decision.`}
          </p>
          <div className="mt-6 space-y-2">
            {(story?.at ?? []).slice(0, 6).map((x) => (
              <div key={x.name} className="flex items-center gap-3 text-[13px]">
                <span className={cx("flex-1 truncate", chosenNames.includes(x.name) && "text-signal-ink font-medium")}>
                  {chosenNames.includes(x.name) && "✓ "}
                  {x.name}
                </span>
                <div className="h-1.5 w-28 rounded-full bg-nested">
                  <div className="h-full rounded-full" style={{ width: `${(x.p / (story!.fav.p || 1)) * 100}%`, background: chosenNames.includes(x.name) ? "var(--signal)" : "var(--line-strong)" }} />
                </div>
                <span className="num w-12 text-right text-text-2">{pct(x.p, 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[15px] font-medium">Share of the field until the decision</span>
          <span className="eyebrow">Normalised pool prices</span>
        </div>
        {story ? <LineChart series={story.series} focus={focus ?? chosenNames[0]} compareTo={story.fav.name !== chosenNames[0] ? story.fav.name : null} onFocus={setFocus} height={300} /> : <Skeleton className="h-[300px]" />}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-text-2">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-signal" /> Selected
          </span>
          {story && story.fav.name !== chosenNames[0] && (
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-5 bg-text" /> Market favourite
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {[...outs].sort((a, b) => (story ? story.rank(a.name) - story.rank(b.name) : 0)).map((o) => (
          <div key={o.i} className={cx("rounded-xl border p-4", o.won ? "border-signal bg-signal-soft" : "border-line bg-card")}>
            <div className="flex items-center justify-between">
              <span className="num text-[11px] text-muted">{story ? `#${story.rank(o.name)}` : ""}</span>
              {o.won && <Badge tone="solid">Selected</Badge>}
            </div>
            <div className={cx("mt-4 line-clamp-2 text-[15px] font-medium leading-snug tracking-[-0.01em]", o.won && "text-signal-ink")}>{o.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function How() {
  const steps = [
    ["Open a call", "A team posts what it is looking for and who will select. The call becomes a Seer market with a closing date."],
    ["Submit", "Each entry is pinned to IPFS and added as an outcome. Submitters can back their own entry."],
    ["Trade", "Traders price which entries the reviewers will pick. Prices move as the field gets read."],
    ["Select", "Reviewers choose, with the market as one input. The answer goes to Reality.eth and the market resolves to it."],
  ];
  return (
    <section id="how" className="scroll-mt-20 py-20">
      <div className="eyebrow mb-4">How it works</div>
      <h2 className="display max-w-3xl text-[40px] md:text-[52px]">
        A forecast for reviewers,
        <span className="text-muted"> not a vote that replaces them.</span>
      </h2>
      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
        {steps.map(([k, v], i) => (
          <div key={k} className="bg-card p-6">
            <div className="num text-[11px] text-muted">0{i + 1}</div>
            <div className="mt-3 text-[18px] font-medium tracking-tight">{k}</div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-line-strong p-5">
        <Badge tone="signal">Next on Opportunity</Badge>
        <span className="text-[14px]">Seer's six-interfaces design contest. Each eligible entry becomes an outcome once submissions close on 23 October.</span>
      </div>
    </section>
  );
}

function Traders() {
  const rows = useLeaderboard("opportunity");
  if (!rows?.length) return null;
  return (
    <section className="pb-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="eyebrow mb-2">Leaderboard · Opportunity markets</div>
          <h2 className="text-[26px] font-medium tracking-[-0.025em]">Best readers of a field</h2>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {rows.slice(0, 5).map((r, i) => (
          <div key={r.address} className={cx("rounded-2xl border p-5", i === 0 ? "border-signal" : "border-line bg-card")}>
            <div className="num text-[11px] text-muted">#{r.rank}</div>
            <div className="num mt-3 truncate text-[14px]">{r.username ? `@${r.username}` : short(r.address, 5)}</div>
            <div className={cx("num mt-3 text-[22px] leading-none", i === 0 && "text-signal-ink")}>
              {r.pnl >= 0 ? "+" : ""}
              {usd(r.pnl)}
            </div>
            <div className="mt-1 text-[12px] text-muted">
              {r.roi != null ? `${num(r.roi * 100, 0)}% ROI · ` : ""}
              {r.marketCount} market{r.marketCount === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SubmitButton() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <Button onClick={() => setOpen(true)}>Submit an entry</Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl rise" onMouseDown={(e) => e.stopPropagation()}>
            {done ? (
              <>
                <div className="eyebrow mb-3">Simulated</div>
                <h3 className="text-[22px] font-medium tracking-tight">“{name}” is queued as an outcome</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-2">
                  On mainnet, the entry is pinned to IPFS and added to the market in the next batch. You can back it as soon as it trades.
                </p>
                <Button
                  className="mt-5 w-full"
                  onClick={() => {
                    setOpen(false);
                    setDone(false);
                    setName("");
                  }}
                >
                  Done
                </Button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) setDone(true);
                }}
              >
                <div className="eyebrow mb-3">AI job board name</div>
                <h3 className="text-[22px] font-medium tracking-tight">Submit an entry</h3>
                <label className="mt-5 block text-[13px] text-text-2" htmlFor="sub-name">
                  Name
                </label>
                <input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-bg px-3 text-[15px] outline-none focus:border-signal" placeholder="e.g. Foreguild" />
                <label className="mt-4 block text-[13px] text-text-2" htmlFor="sub-why">
                  Rationale <span className="text-muted">(optional)</span>
                </label>
                <textarea id="sub-why" rows={3} className="mt-1.5 w-full rounded-xl border border-line-strong bg-bg p-3 text-[14px] outline-none focus:border-signal" />
                <div className="mt-5 flex gap-2">
                  <Button type="submit" className="flex-1" disabled={!name.trim()}>
                    Submit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
                <p className="mt-3 text-[11px] text-muted">Simulated in this demo. Nothing is sent.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
