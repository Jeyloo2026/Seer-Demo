import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

export const API = "https://app.seer.pm/.netlify/functions";

export type Question = {
  id: string;
  arb: string;
  bond: string;
  minBond: string;
  timeout: number;
  opening: number;
  finalize: number;
  arbitrating: boolean;
  answer: string;
};

export type Market = {
  id: string;
  chainId: number;
  type: "Generic" | "Futarchy";
  name: string;
  outcomes: string[];
  odds: (number | null)[];
  vol: number;
  liq: number;
  oi: number;
  tpl: number;
  open: number;
  fin: number;
  created: number | null;
  ver: "verified" | "verifying" | "challenged" | "not_verified";
  nq: number;
  lo?: string;
  hi?: string;
  parent?: string;
  parentOutcome?: string;
  payout?: string[];
  cats?: string[];
  arbitrating?: boolean;
  // Full records only (details.json / get-market)
  cond?: string;
  q?: string;
  coll?: string;
  coll1?: string;
  coll2?: string;
  tokens?: string[];
  reported?: boolean;
  creator?: string | null;
  url?: string;
  questions?: Question[];
};

export type Series = { name: string; data: [number, number][] };

/* ------------------------------------------------------------------ */
/* Normalisation of live API records into the same shape as snapshot   */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromApi(m: any): Market {
  const zero = (a?: string) => !a || /^0x0+$/.test(a);
  const q = (m.questions || [])[0];
  return {
    id: m.id,
    chainId: m.chainId,
    type: m.type,
    name: (m.marketName || "").trim(),
    outcomes: m.outcomes,
    odds: (m.odds || []).map((o: number | null) => (o == null ? null : Math.round(o * 100) / 100)),
    vol: m.volumeUSD || 0,
    liq: m.liquidityUSD || 0,
    oi: m.openInterestUSD || 0,
    tpl: Number(m.templateId),
    lo: m.lowerBound,
    hi: m.upperBound,
    open: m.openingTs,
    fin: m.finalizeTs,
    created: m.blockTimestamp || null,
    ver: m.verification?.status || "not_verified",
    nq: (m.questions || []).length,
    parent: zero(m.parentMarket?.id) ? undefined : m.parentMarket.id,
    parentOutcome: m.parentOutcome,
    payout: m.payoutReported ? m.payoutNumerators : undefined,
    reported: m.payoutReported,
    cats: m.categories,
    arbitrating: q?.is_pending_arbitration,
    cond: m.conditionId,
    q: m.questionId,
    coll: m.collateralToken,
    coll1: m.collateralToken1,
    coll2: m.collateralToken2,
    tokens: m.wrappedTokens,
    creator: m.creator,
    url: m.url,
    questions: (m.questions || []).map((x: Record<string, unknown>) => ({
      id: x.id,
      arb: x.arbitrator,
      bond: x.bond,
      minBond: x.min_bond,
      timeout: x.timeout,
      opening: x.opening_ts,
      finalize: x.finalize_ts,
      arbitrating: x.is_pending_arbitration,
      answer: x.best_answer,
    })) as Question[],
  };
}

/* ------------------------------------------------------------------ */
/* Store: snapshot first, then live merges                             */
/* ------------------------------------------------------------------ */

type StoreState = {
  markets: Market[];
  byId: Map<string, Market>;
  snapshotAt: number;
  liveAt: number | null;
  ready: boolean;
};

let state: StoreState = { markets: [], byId: new Map(), snapshotAt: 0, liveAt: null, ready: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setMarkets(list: Market[], patch: Partial<StoreState>) {
  const byId = new Map(state.byId);
  for (const m of list) byId.set(m.id, { ...byId.get(m.id), ...m });
  const markets = state.ready
    ? [...byId.values()]
    : list;
  state = { ...state, ...patch, byId, markets };
  emit();
}

function merge(list: Market[]) {
  const byId = new Map(state.byId);
  for (const m of list) byId.set(m.id, { ...byId.get(m.id), ...m });
  state = { ...state, byId, markets: [...byId.values()], liveAt: Math.floor(Date.now() / 1000) };
  emit();
}

let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  Promise.all([
    fetch("/data/markets.json").then((r) => r.json()),
    fetch("/data/details.json").then((r) => r.json()).catch(() => []),
  ])
    .then(([snap, details]: [{ at: number; markets: Market[] }, Market[]]) => {
      setMarkets(snap.markets, { snapshotAt: snap.at, ready: true });
      merge0(details);
      refreshTop();
    })
    .catch(() => refreshTop());
}

// Merge without touching liveAt (snapshot details).
function merge0(list: Market[]) {
  const byId = new Map(state.byId);
  for (const m of list) byId.set(m.id, { ...byId.get(m.id), ...m });
  state = { ...state, byId, markets: [...byId.values()] };
  emit();
}

// Live refresh: the most active markets, re-pulled from app.seer.pm every minute.
async function refreshTop() {
  try {
    const r = await searchMarkets({ orderBy: "volumeUSD", orderDirection: "desc", limit: 250 });
    merge(r);
    if (!state.ready) state = { ...state, ready: true };
  } catch {
    /* snapshot stays authoritative */
  }
}
if (typeof window !== "undefined") {
  setInterval(() => document.visibilityState === "visible" && refreshTop(), 60_000);
}

export async function searchMarkets(body: Record<string, unknown>): Promise<Market[]> {
  const r = await fetch(`${API}/markets-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(String(r.status));
  const j = await r.json();
  return (j.markets || []).map(fromApi);
}

export function useStore() {
  boot();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function useMarkets() {
  return useStore();
}

/** One market, upgraded to the full live record from get-market. */
export function useMarket(chainId: number, id: string | undefined) {
  const s = useStore();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let dead = false;
    fetch(`${API}/get-market`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chainId, id }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((m) => !dead && merge([fromApi(m)]))
      .catch((e) => !dead && setError(String(e)));
    return () => {
      dead = true;
    };
  }, [chainId, id]);
  return { market: id ? s.byId.get(id.toLowerCase()) ?? s.byId.get(id) : undefined, error, ready: s.ready, liveAt: s.liveAt };
}

/** Live-refresh a fixed set of markets (featured markets on app pages). */
export function useLiveIds(ids: string[]) {
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return;
    searchMarkets({ marketIds: key.split(","), limit: 100 }).then(merge).catch(() => {});
  }, [key]);
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chartToSeries(raw: any[], outcomes?: string[]): Series[] {
  return (raw || []).map((rows, i) => ({
    name: outcomes?.[i] ?? `#${i}`,
    data: (rows || [])
      .map((r: Record<string, string | number>) => {
        const a = Number(r.token0Price),
          b = Number(r.token1Price);
        return [Number(r.periodStartUnix), a > 0 && b > 0 ? Math.min(a, b) : 0] as [number, number];
      })
      .filter((d: [number, number]) => d[0]),
  }));
}

/**
 * Pool snapshots arrive at irregular times per outcome. Put every series on one
 * uniform time grid (carrying the last price forward) so they can be compared.
 */
export function resample(series: Series[], n = 220): Series[] {
  const live = series.filter((s) => s.data.length);
  if (!live.length) return series;
  // Start once most outcomes have a price; before that, shares are meaningless.
  const starts = live.map((s) => s.data[0][0]).sort((a, b) => a - b);
  const t0 = starts[Math.floor((starts.length - 1) / 2)];
  const t1 = Math.max(...live.map((s) => s.data[s.data.length - 1][0]));
  const grid = Array.from({ length: n }, (_, i) => Math.round(t0 + ((t1 - t0) * i) / (n - 1)));
  return series.map((s) => {
    let j = 0,
      last: number | null = null;
    const data: [number, number][] = [];
    for (const t of grid) {
      while (j < s.data.length && s.data[j][0] <= t) last = s.data[j++][1];
      if (last != null) data.push([t, last]);
    }
    return { name: s.name, data };
  });
}

/** Convert raw outcome prices into shares of the field at each instant (sums to 1). */
export function normalize(series: Series[]): Series[] {
  const n = Math.max(0, ...series.map((s) => s.data.length));
  if (!n) return series;
  const ts = series.find((s) => s.data.length === n)!.data.map((d) => d[0]);
  const idx = series.map((s) => new Map(s.data.map((d) => [d[0], d[1]])));
  const sums = ts.map((t) => idx.reduce((a, m) => a + (m.get(t) ?? 0), 0));
  return series.map((s, k) => ({
    name: s.name,
    data: ts.filter((t) => idx[k].has(t)).map((t) => [t, sums[ts.indexOf(t)] > 0 ? (idx[k].get(t) ?? 0) / sums[ts.indexOf(t)] : 0] as [number, number]),
  }));
}

const chartCache = new Map<string, Series[]>();

export function useChart(chainId: number, id: string | undefined, outcomes?: string[]) {
  const [series, setSeries] = useState<Series[] | null>(id ? chartCache.get(id) ?? null : null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!id) return;
    let dead = false;
    if (!chartCache.has(id)) {
      fetch(`/data/charts/${id}.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((raw: Series[]) => {
          if (dead || live) return;
          const s = resample(raw);
          chartCache.set(id, s);
          setSeries(s);
        })
        .catch(() => {});
    }
    fetch(`${API}/market-chart?marketId=${id}&chainId=${chainId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((raw) => {
        if (dead) return;
        const s = resample(chartToSeries(raw, outcomes));
        if (s.some((x) => x.data.length)) {
          chartCache.set(id, s);
          setSeries(s);
          setLive(true);
        }
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, id]);
  const named = useMemo(
    () => (series && outcomes ? series.map((s, i) => ({ ...s, name: outcomes[i] ?? s.name })) : series),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, outcomes?.join("|")],
  );
  return { series: named, live };
}

/* ------------------------------------------------------------------ */
/* Leaderboards                                                        */
/* ------------------------------------------------------------------ */

export type LeaderRow = {
  rank: number;
  address: string;
  username?: string;
  pnl: number;
  volume: number;
  roi: number | null;
  marketCount: number;
  score: number | null;
  tier: string | null;
};

export function useLeaderboard(app: "all" | "deepfund" | "opportunity" | "futarchy" | "foresight") {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  useEffect(() => {
    let dead = false;
    fetch(`/data/leaderboard-${app}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => !dead && setRows((prev) => prev ?? j.rows))
      .catch(() => {});
    fetch(`${API}/get-pnl-leaderboard?app=${app}&chainId=all&limit=25`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => !dead && j.rows && setRows(j.rows))
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [app]);
  return rows;
}

/* ------------------------------------------------------------------ */
/* Token activity (holders + transfers)                                */
/* ------------------------------------------------------------------ */

export type Holder = { address: string; balance: string };
export type Transfer = { id: string; from: string; to: string; value: string; timestamp: number; tx_hash: string; token: string };

/** Top holders per outcome token and the latest transfers, derived from a market id. */
export function useTokenActivity(chainId: number, marketId: string | undefined) {
  const [data, setData] = useState<{ holders: Record<string, Holder[]>; txs: Transfer[]; total: number } | null>(null);
  useEffect(() => {
    if (!marketId) return;
    let dead = false;
    setData(null);
    fetch(`${API}/get-token-transactions?marketId=${marketId}&chainId=${chainId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => !dead && setData({ holders: j.topHolders || {}, txs: j.recentTransactions || [], total: j.totalTransactions || 0 }))
      .catch(() => !dead && setData({ holders: {}, txs: [], total: 0 }));
    return () => {
      dead = true;
    };
  }, [chainId, marketId]);
  return data;
}

export function useNow(every = 30_000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

export function useFiltered<T>(items: T[], pred: (x: T) => boolean, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => items.filter(pred), [items, ...deps]);
}
