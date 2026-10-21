import { useMemo, useRef, useState } from "react";
import type { Series } from "../data/seer";
import { cx } from "./kit";

const fmtDate = (t: number) => new Date(t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * Multi-series line chart. One series carries the signal colour (the focus);
 * the rest sit in the neutral field and light up on hover.
 */
export function LineChart({
  series,
  focus,
  onFocus,
  height = 280,
  yMax,
  yFormat = (v) => `${Math.round(v * 100)}%`,
  className,
  events = [],
  compareTo,
  fit = false,
}: {
  series: Series[];
  focus?: string | null;
  onFocus?: (name: string | null) => void;
  height?: number;
  yMax?: number;
  yFormat?: (v: number) => string;
  className?: string;
  events?: { t: number; label: string }[];
  compareTo?: string | null;
  /** Fit the y-axis to the data range instead of starting at zero (prices). */
  fit?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverName, setHoverName] = useState<string | null>(null);
  const W = 800,
    H = height,
    P = { l: 8, r: 52, t: 12, b: 26 };

  const { t0, t1, vmax, vmin } = useMemo(() => {
    let t0 = Infinity,
      t1 = -Infinity,
      vmax = 0,
      vmin = Infinity;
    for (const s of series)
      for (const [t, v] of s.data) {
        if (t < t0) t0 = t;
        if (t > t1) t1 = t;
        if (v > vmax) vmax = v;
        if (v < vmin) vmin = v;
      }
    if (fit && isFinite(vmin)) {
      const pad = (vmax - vmin) * 0.15 || vmax * 0.02;
      return { t0, t1, vmax: vmax + pad, vmin: Math.max(0, vmin - pad) };
    }
    return { t0, t1, vmax: yMax ?? niceMax(vmax), vmin: 0 };
  }, [series, yMax, fit]);

  if (!series.length || !isFinite(t0)) return <div className={cx("grid place-items-center text-[13px] text-muted", className)} style={{ height }}>No price history yet</div>;

  const x = (t: number) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - vmin) / (vmax - vmin || 1)) * (H - P.t - P.b);
  const path = (d: [number, number][]) => d.map(([t, v], i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join("");

  const active = hoverName ?? focus ?? null;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => vmin + f * (vmax - vmin));
  const xt = Array.from({ length: 5 }, (_, i) => t0 + ((t1 - t0) * i) / 4);

  const tHover = hoverX != null ? t0 + ((hoverX - P.l) / (W - P.l - P.r)) * (t1 - t0) : null;
  const at = (s: Series, t: number) => {
    let best = s.data[0];
    for (const d of s.data) {
      if (d[0] <= t) best = d;
      else break;
    }
    return best;
  };

  const ordered = [...series].sort((a, b) => (a.name === active ? 1 : 0) - (b.name === active ? 1 : 0) || (a.name === compareTo ? 1 : 0) - (b.name === compareTo ? 1 : 0));
  const readout = tHover != null ? [...series].map((s) => ({ name: s.name, v: at(s, tHover)?.[1] ?? 0 })).sort((a, b) => b.v - a.v) : [];

  return (
    <div className={cx("relative", className)}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseMove={(e) => {
          const r = ref.current!.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHoverX(Math.max(P.l, Math.min(W - P.r, px)));
          // nearest series under cursor
          const py = ((e.clientY - r.top) / r.height) * H;
          const t = t0 + ((px - P.l) / (W - P.l - P.r)) * (t1 - t0);
          let best: string | null = null,
            bd = 14;
          for (const s of series) {
            const d = at(s, t);
            if (!d) continue;
            const dist = Math.abs(y(d[1]) - py);
            if (dist < bd) {
              bd = dist;
              best = s.name;
            }
          }
          setHoverName(best);
          onFocus?.(best ?? focus ?? null);
        }}
        onMouseLeave={() => {
          setHoverX(null);
          setHoverName(null);
          onFocus?.(null);
        }}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x={W - P.r + 8} y={y(v) + 4} fontSize="11" fill="var(--muted)" className="num" style={{ fontFamily: "var(--font-mono)" }}>
              {yFormat(v)}
            </text>
          </g>
        ))}
        {xt.map((t, i) => (
          <text key={i} x={x(t)} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} style={{ fontFamily: "var(--font-mono)" }}>
            {fmtDate(t)}
          </text>
        ))}
        {events.map((e) => (
          <g key={e.t}>
            <line x1={x(e.t)} x2={x(e.t)} y1={P.t} y2={H - P.b} stroke="var(--text)" strokeDasharray="2 3" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />
            <text x={x(e.t) - 6} y={P.t + 10} fontSize="11" fill="var(--text-2)" textAnchor="end" style={{ fontFamily: "var(--font-mono)" }}>
              {e.label}
            </text>
          </g>
        ))}
        {ordered.map((s) => {
          const isA = s.name === active,
            isC = s.name === compareTo;
          return (
            <path
              key={s.name}
              d={path(s.data)}
              fill="none"
              stroke={isA ? "var(--signal)" : isC ? "var(--text)" : "var(--muted)"}
              strokeOpacity={isA || isC ? 1 : active ? 0.22 : 0.45}
              strokeWidth={isA ? 2.25 : isC ? 1.5 : 1}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          );
        })}
        {hoverX != null && <line x1={hoverX} x2={hoverX} y1={P.t} y2={H - P.b} stroke="var(--text)" strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />}
      </svg>
      {tHover != null && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-56 rounded-xl border border-line bg-card/95 p-3 shadow-card backdrop-blur"
          style={{ left: `calc(${((hoverX ?? 0) / W) * 100}% + ${(hoverX ?? 0) > W * 0.6 ? "-236px" : "16px"})` }}
        >
          <div className="eyebrow mb-2">{new Date(tHover * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
          {readout.slice(0, 6).map((r) => (
            <div key={r.name} className={cx("flex justify-between gap-3 text-[12px] leading-5", r.name === active ? "text-signal-ink font-medium" : "text-text-2")}>
              <span className="truncate">{r.name}</span>
              <span className="num">{yFormat(r.v)}</span>
            </div>
          ))}
          {readout.length > 6 && <div className="mt-1 text-[11px] text-muted">+{readout.length - 6} more</div>}
        </div>
      )}
    </div>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const steps = [0.05, 0.1, 0.2, 0.25, 0.4, 0.5, 0.6, 0.8, 1];
  for (const s of steps) if (v <= s) return s;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p) * p;
}

export function Spark({ data, className, on = true, height = 28 }: { data: number[]; className?: string; on?: boolean; height?: number }) {
  if (data.length < 2) return <div className={className} style={{ height }} />;
  const W = 100;
  const mn = Math.min(...data),
    mx = Math.max(...data);
  const y = (v: number) => (mx === mn ? height / 2 : 2 + (1 - (v - mn) / (mx - mn)) * (height - 4));
  const d = data.map((v, i) => `${i ? "L" : "M"}${((i / (data.length - 1)) * W).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className={className} style={{ height }} aria-hidden>
      <path d={d} fill="none" stroke={on ? "var(--signal)" : "var(--muted)"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Probability mass of a whole field: one column per outcome, leader in signal. */
export function FieldStrip({ values, highlight, onHover, height = 64, className }: { values: { name: string; p: number }[]; highlight?: string | null; onHover?: (n: string | null) => void; height?: number; className?: string }) {
  const mx = Math.max(...values.map((v) => v.p), 0.0001);
  return (
    <div className={cx("flex items-end gap-[2px]", className)} style={{ height }} onMouseLeave={() => onHover?.(null)}>
      {values.map((v, i) => (
        <div
          key={v.name}
          onMouseEnter={() => onHover?.(v.name)}
          title={`${v.name} · ${v.p.toFixed(1)}%`}
          className="flex-1 min-w-[2px] rounded-t-[2px] transition-colors"
          style={{
            height: `${Math.max(3, (v.p / mx) * 100)}%`,
            background: highlight === v.name || (!highlight && i === 0) ? "var(--signal)" : "var(--line-strong)",
          }}
        />
      ))}
    </div>
  );
}
