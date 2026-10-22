import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppGlyph, Arrow, cx, type AppKey } from "./kit";
import { Art, type Device } from "./brand";

/*
  Bento kit shared by every interface.
  Tiles are colour-blocked by job: ink holds money and state, violet holds the
  thing the market points at, white holds evidence. Radii step down as tiles nest
  (30 → 22 → full), so hierarchy reads without borders.
*/

export const INK = "#14121E";
export const VIOLET = "#7D33FF";
export const FOG = "#E0E2F5";

/** Page opening: name, headline and controls above the bento grid. */
export function BentoHead({ app, name, title, meta, controls }: { app: AppKey; name: string; title: ReactNode; meta?: ReactNode; controls?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2 text-[14px] text-text-2">
          <AppGlyph app={app} className="h-5 w-5 text-text" /> {name}
          {meta}
        </div>
        <h1 className="text-[40px] md:text-[60px] leading-[0.95] tracking-[-0.045em] font-medium" style={{ textWrap: "balance" }}>
          {title}
        </h1>
      </div>
      {controls && <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">{controls}</div>}
    </div>
  );
}

export function Bento({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-[1600px] px-4 md:px-6 pt-10 pb-6">
      {children}
    </section>
  );
}

export function Tile({ title, to, className, children, style }: { title?: ReactNode; to?: string; className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={cx("relative rounded-[30px] bg-card p-6 shadow-card", className)} style={style}>
      {to && <CornerLink to={to} label={typeof title === "string" ? title : "Open"} />}
      {title && <h2 className="pr-14 text-[19px] font-medium tracking-[-0.02em]">{title}</h2>}
      {children}
    </div>
  );
}

/** A tile painted with the interface's brand device. */
export function DeviceTile({ device, field, className, children, tone = "dark" }: { device: Device; field?: number[]; className?: string; children: ReactNode; tone?: "dark" | "violet" }) {
  return (
    <div className={cx("relative isolate overflow-hidden rounded-[30px] p-7 md:p-8 text-white", className)} style={{ background: tone === "violet" ? VIOLET : INK }}>
      <Art device={device} field={field} />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}

export function InkTile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("relative overflow-hidden rounded-[30px] p-6 text-white", className)} style={{ background: INK }}>
      {children}
    </div>
  );
}

export function CornerLink({ to, dark, label }: { to: string; dark?: boolean; label: string }) {
  const cls = cx(
    "absolute right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full border transition-colors",
    dark ? "border-white/20 text-white hover:bg-white/10" : "border-line-strong text-text hover:bg-nested",
  );
  return to.startsWith("#") || to.startsWith("http") ? (
    <a href={to} aria-label={label} className={cls} {...(to.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
      <Arrow dir="up-right" className="h-4 w-4" />
    </a>
  ) : (
    <Link to={to} aria-label={label} className={cls}>
      <Arrow dir="up-right" className="h-4 w-4" />
    </Link>
  );
}

export type StackItem = { key: string; title: ReactNode; sub?: ReactNode; value?: ReactNode; valueSub?: ReactNode; badge?: ReactNode; to?: string; onClick?: () => void; active?: boolean };

/** Overlapping rows, ink → violet → white, like cards fanned on a table. */
export function StackRows({ items }: { items: StackItem[] }) {
  const tones = [
    { bg: INK, fg: "#fff", sub: "rgb(255 255 255 / 0.62)", chip: "#fff", chipFg: INK },
    { bg: VIOLET, fg: "#fff", sub: "rgb(255 255 255 / 0.78)", chip: "#fff", chipFg: INK },
    { bg: "var(--card)", fg: "var(--text)", sub: "var(--text-2)", chip: INK, chipFg: "#fff" },
  ];
  return (
    <div className="mt-4 -space-y-3">
      {items.slice(0, 3).map((it, i) => {
        const t = tones[i];
        const body = (
          <div className="flex items-start gap-3">
            {it.badge != null && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[10px] font-semibold" style={{ background: t.chip, color: t.chipFg }}>
                {it.badge}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[14px] leading-snug">{it.title}</span>
              {it.sub && (
                <span className="mt-1 block text-[12px]" style={{ color: t.sub }}>
                  {it.sub}
                </span>
              )}
            </span>
            {it.value != null && (
              <span className="shrink-0 text-right">
                <span className="block text-[15px]">{it.value}</span>
                {it.valueSub && (
                  <span className="block max-w-[72px] truncate text-[11px]" style={{ color: t.sub }}>
                    {it.valueSub}
                  </span>
                )}
              </span>
            )}
          </div>
        );
        const cls = cx("relative block w-full rounded-[22px] p-4 pb-6 text-left transition-transform hover:-translate-y-0.5 cursor-pointer", i === 2 && "border border-line", it.active && "ring-2 ring-offset-2 ring-signal ring-offset-[var(--card)]");
        const style = { background: t.bg, color: t.fg, zIndex: 3 - i };
        return it.to ? (
          <Link key={it.key} to={it.to} className={cls} style={style}>
            {body}
          </Link>
        ) : (
          <button key={it.key} onClick={it.onClick} className={cls} style={style}>
            {body}
          </button>
        );
      })}
    </div>
  );
}

/** Pill tabs used inside tiles (months, views, filters). */
export function PillRow<T extends string | number>({ items, value, onChange, label, dark }: { items: { v: T; t: ReactNode }[]; value: T; onChange: (v: T) => void; label: string; dark?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {items.map((x) => {
        const on = x.v === value;
        return (
          <button
            key={String(x.v)}
            onClick={() => onChange(x.v)}
            aria-pressed={on}
            className={cx(
              "h-9 rounded-full px-3.5 text-[13px] transition-colors cursor-pointer whitespace-nowrap",
              dark ? (on ? "bg-white text-ink" : "border border-white/25 text-white hover:border-white/60") : on ? "bg-text text-bg" : "border border-line-strong text-text-2 hover:text-text",
            )}
          >
            {x.t}
          </button>
        );
      })}
    </div>
  );
}

/** Small bar meter split into labelled segments. */
export function Segments({ parts }: { parts: { label: string; n: number; c: string; onClick?: () => void }[] }) {
  const total = Math.max(1, parts.reduce((a, p) => a + p.n, 0));
  return (
    <>
      <div className="flex h-3 overflow-hidden rounded-full bg-nested" aria-hidden>
        {parts.map((p) => (
          <span key={p.label} style={{ width: `${(p.n / total) * 100}%`, background: p.c }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {parts.map((p) => (
          <button key={p.label} onClick={p.onClick} className="flex items-center gap-2 text-left text-[13px] cursor-pointer hover:text-signal-ink disabled:cursor-default" disabled={!p.onClick}>
            <span className="h-2.5 w-2.5 shrink-0 rotate-45 rounded-[2px]" style={{ background: p.c }} />
            <span className="flex-1 text-text-2">{p.label}</span>
            <span>{p.n.toLocaleString()}</span>
          </button>
        ))}
      </div>
    </>
  );
}
