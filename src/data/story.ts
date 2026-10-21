import { useMemo } from "react";
import { normalize, useChart, type Market } from "./seer";

/**
 * What the market said just before people decided: shares of the field at the
 * last moment no outcome held more than 60% (after that, prices only echo the result).
 */
export function useDecisionStory(chainId: number, id: string, m?: Market) {
  const { series } = useChart(chainId, id, m?.outcomes);
  return useMemo(() => {
    const s = normalize((series || []).filter((x) => x.name !== "Invalid"));
    if (!s.length || !s[0].data.length) return null;
    const ts = s[0].data.map((d) => d[0]);
    let k = ts.length - 1;
    while (k > 0 && Math.max(...s.map((x) => x.data[k]?.[1] ?? 0)) > 0.6) k--;
    const at = s.map((x) => ({ name: x.name, p: (x.data[k]?.[1] ?? 0) * 100 })).sort((a, b) => b.p - a.p);
    const winners = m?.payout ? m.outcomes.filter((_, i) => m.payout![i] && m.payout![i] !== "0" && m.outcomes[i] !== "Invalid") : [];
    const chosen = at.filter((x) => winners.includes(x.name));
    const ef = at.find((x) => x.name === "Electric Foundation");
    return {
      series: s.map((x) => ({ ...x, data: x.data.slice(0, k + 1) })),
      at,
      fav: at[0],
      ef,
      chosen,
      rank: (name: string) => at.findIndex((x) => x.name === name) + 1,
      closeT: ts[k],
    };
  }, [series, m]);
}
