import { useMemo, useState } from "react";
import type { Market } from "../data/seer";
import { num, pct, ranked, statusOf } from "../data/market";
import { Button, Seg, cx } from "./kit";

/**
 * Simulated trade ticket. Prices come from the live market; execution is a
 * constant-product estimate against the market's real pool liquidity.
 */
export function TradeTicket({ market, initial, compact = false, labels }: { market: Market; initial?: number; compact?: boolean; labels?: Record<number, string> }) {
  const outs = useMemo(() => ranked(market).filter((o) => o.p != null), [market]);
  const [sel, setSel] = useState<number>(initial ?? outs[0]?.i ?? 0);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amt, setAmt] = useState("100");
  const [done, setDone] = useState(false);
  const status = statusOf(market);
  const o = outs.find((x) => x.i === sel) ?? outs[0];
  const price = Math.max(0.001, (o?.p ?? 0) / 100);
  const a = Math.max(0, Number(amt) || 0);
  // Per-outcome pool depth: split market liquidity across outcomes, floor at $50.
  const depth = Math.max(50, market.liq / Math.max(1, outs.length));
  const impact = a / (depth + a);
  const avg = Math.min(0.999, side === "buy" ? price * (1 + impact) : price * (1 - impact));
  const shares = side === "buy" ? a / avg : a;
  const proceeds = side === "sell" ? a * avg : 0;
  const after = side === "buy" ? Math.min(0.99, price + (1 - price) * impact) : Math.max(0.001, price * (1 - impact));
  // Seer pools keep trading until the market resolves.
  const closed = status === "Resolved";

  if (!o)
    return (
      <div className="rounded-2xl border border-line bg-card p-5 text-[13px] text-muted">
        No pool prices yet for this market. Liquidity has to be added before it can trade.
      </div>
    );

  return (
    <div className={cx("rounded-2xl border border-line bg-card", compact ? "p-4" : "p-5")}>
      <div className="mb-4 flex items-center justify-between">
        <Seg
          size="sm"
          value={side}
          onChange={(v) => {
            setSide(v);
            setDone(false);
          }}
          options={[
            { value: "buy", label: "Buy" },
            { value: "sell", label: "Sell" },
          ]}
        />
        <span className="eyebrow">sDAI</span>
      </div>

      <div className="eyebrow mb-2">Outcome</div>
      <div className="mb-4 max-h-48 space-y-1 overflow-y-auto scroll-thin pr-1">
        {outs.slice(0, 12).map((x) => (
          <button
            key={x.i}
            onClick={() => {
              setSel(x.i);
              setDone(false);
            }}
            className={cx(
              "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors cursor-pointer",
              x.i === sel ? "border-signal bg-signal-soft text-signal-ink" : "border-line hover:border-line-strong",
            )}
          >
            <span className="truncate">{labels?.[x.i] ?? x.name}</span>
            <span className="num shrink-0">{pct(x.p)}</span>
          </button>
        ))}
      </div>

      <label className="eyebrow mb-2 block" htmlFor="amt">
        {side === "buy" ? "You pay" : "Shares to sell"}
      </label>
      <div className="mb-2 flex items-center rounded-xl border border-line-strong bg-bg px-3 focus-within:border-signal">
        <input
          id="amt"
          inputMode="decimal"
          value={amt}
          onChange={(e) => {
            setAmt(e.target.value.replace(/[^0-9.]/g, ""));
            setDone(false);
          }}
          className="num h-12 w-full bg-transparent text-[20px] outline-none"
        />
        <span className="text-[13px] text-muted">{side === "buy" ? "sDAI" : "shares"}</span>
      </div>
      <div className="mb-4 flex gap-1.5">
        {[10, 100, 500, 1000].map((v) => (
          <button key={v} onClick={() => setAmt(String(v))} className="num h-7 flex-1 rounded-lg bg-nested text-[12px] text-text-2 hover:text-text cursor-pointer">
            {v}
          </button>
        ))}
      </div>

      <dl className="mb-4 space-y-1.5 text-[13px]">
        <Row k="Avg. price" v={`${(avg * 100).toFixed(1)}¢`} />
        {side === "buy" ? (
          <>
            <Row k="Shares" v={num(shares, 2)} />
            <Row k="Pays if right" v={`${num(shares, 2)} sDAI`} strong />
            <Row k="Return" v={a ? `${num((shares / a - 1) * 100, 0)}%` : "—"} />
          </>
        ) : (
          <Row k="You receive" v={`${num(proceeds, 2)} sDAI`} strong />
        )}
        <Row k="Price after" v={`${pct(price * 100)} → ${pct(after * 100)}`} />
        <Row k="Price impact" v={pct(impact * 100)} warn={impact > 0.1} />
      </dl>

      {done ? (
        <div className="rounded-xl bg-signal-soft p-3 text-[13px] text-signal-ink">
          Simulated: {side === "buy" ? `bought ${num(shares, 2)} ${o.name}` : `sold ${num(a, 2)} ${o.name}`}. On mainnet this routes through the Seer router in a single
          transaction.
        </div>
      ) : (
        <Button className="w-full" size="lg" disabled={!a || closed} onClick={() => setDone(true)}>
          {closed ? `Market ${status.toLowerCase()}` : `${side === "buy" ? "Buy" : "Sell"} ${labels?.[o.i] ?? o.name}`}
        </Button>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted">Estimate against current pool depth. Simulated in this demo; no transaction is sent.</p>
    </div>
  );
}

function Row({ k, v, strong, warn }: { k: string; v: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-text-2">{k}</dt>
      <dd className={cx("num", strong && "text-text font-medium", warn && "text-alert")}>{v}</dd>
    </div>
  );
}
