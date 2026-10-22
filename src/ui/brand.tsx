import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppGlyph, cx, type AppKey } from "./kit";
import { LOGO_PATH } from "./logo-path";
import { asset } from "../data/seer";

/*
  The Electric Foundation graphic language, as page furniture.
  The kit says "let the graphic language lead": every interface gets one device
  from the brandbook, so the five apps feel like one family without sharing a layout.

    grid      crosshair grid fading into violet (social banner)      → Seer App
    field     a field of diamond counters, one per outcome           → Deep
    worlds    two ray fans meeting at one decision point             → Futarchy
    portrait  violet duotone photography                             → Opportunity
    stripes   diagonal line field (business card / poster)           → Risk
*/

export type Device = "grid" | "field" | "worlds" | "portrait" | "stripes";

const TONE: Record<Device, { bg: string; fg: string; sub: string }> = {
  grid: { bg: "#14121E", fg: "#FFFFFF", sub: "rgb(255 255 255 / 0.72)" },
  field: { bg: "#7D33FF", fg: "#FFFFFF", sub: "rgb(255 255 255 / 0.82)" },
  worlds: { bg: "#14121E", fg: "#FFFFFF", sub: "rgb(255 255 255 / 0.72)" },
  portrait: { bg: "#7D33FF", fg: "#FFFFFF", sub: "rgb(255 255 255 / 0.85)" },
  stripes: { bg: "#0C0A16", fg: "#FFFFFF", sub: "rgb(255 255 255 / 0.72)" },
};

/** Full-bleed opening band for an interface: headline, lede, actions, and the app's brand device. */
export function Masthead({
  app,
  device,
  name,
  title,
  lede,
  meta,
  children,
  field,
}: {
  app: AppKey;
  device: Device;
  name: string;
  title: ReactNode;
  lede: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  /** Values for the "field" device, e.g. the live odds of every entry. */
  field?: number[];
}) {
  const t = TONE[device];
  return (
    <section className="relative isolate overflow-hidden" style={{ background: t.bg, color: t.fg }}>
      <Art device={device} field={field} />
      <div className="relative mx-auto max-w-[1600px] px-4 md:px-6">
        <div className="flex min-h-[460px] md:min-h-[520px] flex-col justify-end gap-8 py-12 md:py-16 lg:max-w-[52%]">
          <div className="flex items-center gap-3 text-[14px]">
            <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: "rgb(255 255 255 / 0.12)" }}>
              <AppGlyph app={app} className="h-5 w-5" />
            </span>
            <span className="font-medium">{name}</span>
            {meta}
          </div>
          <h1 className="display text-[48px] sm:text-[64px] lg:text-[80px] max-w-[11ch]" style={{ textWrap: "balance" }}>
            {title}
          </h1>
          <p className="max-w-[54ch] text-[17px] leading-relaxed" style={{ color: t.sub }}>
            {lede}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

export function Art({ device, field }: { device: Device; field?: number[] }) {
  if (device === "grid") return <GridArt />;
  if (device === "field") return <FieldArt values={field} />;
  if (device === "worlds") return <WorldsArt />;
  if (device === "portrait") return <PortraitArt />;
  return <StripesArt />;
}

/* ---------------------------------------------------------------- */

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [s, setS] = useState({ w: 1440, h: 560 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setS({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, s] as const;
}

/** Crosshair grid. Lines brighten toward the right edge, where the violet pools. */
function GridArt() {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const cell = 64;
  const cols = Math.ceil(w / cell) + 1;
  const rows = Math.ceil(h / cell) + 1;
  // A staircase of lit cells climbing to the top-right corner: activity accumulating.
  const lit = new Set(["0,0", "1,0", "0,1", "2,1", "1,2", "3,2", "2,3", "4,3", "5,5"]);
  const reach = Math.min(cols, 12);
  return (
    <div ref={ref} className="absolute inset-0 -z-10" aria-hidden>
      <svg width={w} height={h} className="absolute inset-0">
        <g>
          {Array.from({ length: reach }, (_, c) => {
            const x = w - c * cell;
            const o = 0.55 * (1 - c / reach);
            return <line key={"v" + c} x1={x} x2={x} y1={0} y2={h} stroke={c % 3 === 0 ? "#9C6FF2" : "#BFBFE6"} strokeOpacity={o} strokeDasharray="54 10" strokeDashoffset="-5" />;
          })}
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: reach }, (_, c) => {
              const x = w - (c + 1) * cell;
              return (
                <line key={`h${r}-${c}`} x1={x + 5} x2={x + cell - 5} y1={r * cell} y2={r * cell} stroke={r % 2 ? "#BFBFE6" : "#9C6FF2"} strokeOpacity={0.5 * (1 - c / reach)} />
              );
            }),
          )}
          {[...lit].map((k) => {
            const [c, r] = k.split(",").map(Number);
            return <rect key={"l" + k} x={w - (c + 1) * cell + 3} y={r * cell + 3} width={cell - 6} height={cell - 6} fill="#7D33FF" fillOpacity={0.55 - (c + r) * 0.05} />;
          })}
        </g>
        {Array.from({ length: Math.ceil(w / 32) }, (_, c) =>
          Array.from({ length: Math.ceil(h / 32) }, (_, r) => <circle key={`d${c}-${r}`} cx={c * 32 + 16} cy={r * 32 + 16} r="0.8" fill="#fff" fillOpacity="0.12" />),
        )}
      </svg>
    </div>
  );
}

/** One diamond counter per outcome. Size follows the live price, so the field reads as a distribution. */
function FieldArt({ values }: { values?: number[] }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const gap = 34;
  const cols = Math.ceil(w / gap);
  const rows = Math.ceil(h / gap);
  const vals = (values && values.length ? values : Array.from({ length: 64 }, (_, i) => 6 * Math.exp(-i / 12))).filter((v) => v > 0);
  const max = Math.max(...vals);
  const x0 = w < 1024 ? w * 0.35 : w * 0.5;
  const cells: { x: number; y: number; s: number; on: boolean }[] = [];
  let k = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = c * gap + gap / 2;
      const y = r * gap + gap / 2;
      if (x < x0) continue;
      const v = vals[k % vals.length];
      const fade = Math.min(1, (x - x0) / 260);
      cells.push({ x, y, s: (3 + 11 * Math.sqrt(v / max)) * fade, on: k === 0 });
      k++;
    }
  }
  return (
    <div ref={ref} className="absolute inset-0 -z-10" aria-hidden>
      <svg width={w} height={h} className="absolute inset-0">
        {cells.map((d, i) => (
          <rect
            key={i}
            x={d.x - d.s / 2}
            y={d.y - d.s / 2}
            width={d.s}
            height={d.s}
            rx={d.s * 0.12}
            transform={`rotate(45 ${d.x} ${d.y})`}
            fill={d.on ? "#FFFFFF" : "#BFBFE6"}
            fillOpacity={d.on ? 1 : 0.5 + 0.5 * (d.s / 14)}
          />
        ))}
      </svg>
    </div>
  );
}

/** Two fans of rays, one per world, meeting at the decision. */
function WorldsArt() {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const mobile = w < 1024;
  const fx = mobile ? w * 0.78 : w * 0.76;
  const fy = h / 2;
  const n = 7;
  const left = mobile ? w * 0.56 : w * 0.54;
  return (
    <div ref={ref} className="absolute inset-0 -z-10" aria-hidden>
      <svg width={w} height={h} className="absolute inset-0" style={{ opacity: mobile ? 0.35 : 1 }}>
        <defs>
          <linearGradient id="wfade" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id="wmask" maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
            <rect x={left - 120} y={0} width={fx - left + 120} height={h} fill="url(#wfade)" />
          </mask>
        </defs>
        <rect x={fx} y={0} width={w - fx} height={h} fill="#7D33FF" />
        <g mask="url(#wmask)">
          {Array.from({ length: n }, (_, i) => {
            const y = 20 + (i * (h - 40)) / (n - 1);
            const half = 7 + Math.abs(i - (n - 1) / 2) * 2.2;
            return <polygon key={"a" + i} points={`${left - 120},${y - half * 1.3} ${left - 120},${y + half * 1.3} ${fx},${fy}`} fill="#9C6FF2" />;
          })}
        </g>
        {Array.from({ length: n }, (_, i) => {
          const y = 20 + (i * (h - 40)) / (n - 1);
          const half = 7 + Math.abs(i - (n - 1) / 2) * 2.2;
          return <polygon key={"b" + i} points={`${w},${y - half} ${w},${y + half} ${fx},${fy}`} fill="#BFBFE6" />;
        })}
        <rect x={fx - 7} y={fy - 7} width="14" height="14" fill="#fff" transform={`rotate(45 ${fx} ${fy})`} />
        {!mobile && (
          <>
            <text x={left + 40} y={28} fontSize="12" fill="#BFBFE6" style={{ fontFamily: "var(--font-mono)" }}>
              if it passes
            </text>
            <text x={w - 16} y={h - 18} textAnchor="end" fontSize="12" fill="#14121E" style={{ fontFamily: "var(--font-mono)" }}>
              if it fails
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

/** Brand photography: violet duotone portrait with the cropped wordmark behind the subject. */
function PortraitArt() {
  return (
    <div className="absolute inset-0 -z-10" aria-hidden>
      <div className="absolute inset-y-0 right-0 hidden md:block w-[46%] max-w-[640px]">
        <img src={asset("brand/portrait.jpg")} alt="" className="absolute bottom-0 right-0 h-full w-full object-cover object-[50%_20%]" />
        <div className="absolute inset-y-0 left-0 w-40" style={{ background: "linear-gradient(90deg, #7D33FF, rgb(125 51 255 / 0))" }} />
      </div>
    </div>
  );
}

/** Diagonal line field, with one violet plane cutting across it. */
function StripesArt() {
  return (
    <div className="absolute inset-0 -z-10" aria-hidden>
      <div
        className="absolute inset-0 opacity-25 md:opacity-100"
        style={{
          backgroundImage: "repeating-linear-gradient(-58deg, rgb(255 255 255 / 0.9) 0 2px, transparent 2px 46px)",
          WebkitMaskImage: "linear-gradient(90deg, transparent 38%, #000 78%)",
          maskImage: "linear-gradient(90deg, transparent 38%, #000 78%)",
        }}
      />
      <div
        className="absolute hidden md:block right-[8%] top-1/2 h-[118%] w-[30%] -translate-y-1/2"
        style={{ background: "#7D33FF", clipPath: "polygon(22% 0, 100% 0, 78% 100%, 0 100%)" }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** The wordmark as a typographic object, cropped by its container. */
export function GiantWordmark({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="27.5 3.5 59 17" className={cx("block w-full h-auto", className)} aria-hidden>
      <path d={LOGO_PATH} fill={color} />
    </svg>
  );
}
