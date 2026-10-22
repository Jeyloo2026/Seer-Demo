import { useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { LOGO_PATH, MARK_PATH } from "./logo-path";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

export function Wordmark({ className = "h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 86 24" className={className} aria-label="Seer" role="img">
      <path d={LOGO_PATH} fill="currentColor" />
    </svg>
  );
}

/** The symbol alone: two interlocking forms resolving into one decision. */
export function Mark({ className = "h-6 w-6", tile = false }: { className?: string; tile?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {tile ? (
        <>
          <rect width="24" height="24" rx="6" fill="var(--signal)" />
          <path fill="#fff" fillRule="evenodd" d={MARK_PATH} transform="translate(4.8 4.8) scale(0.6)" />
        </>
      ) : (
        <path fill="currentColor" fillRule="evenodd" d={MARK_PATH} />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* App identities: every app glyph is built from the mark's diamond    */
/* counters, the brand's unit for "an outcome".                        */
/* ------------------------------------------------------------------ */

export type AppKey = "home" | "app" | "deep" | "futarchy" | "opportunity" | "risk";

export const APPS: { key: AppKey; name: string; path: string; line: string; verb: string }[] = [
  { key: "home", name: "Seer", path: "/", line: "The protocol beneath", verb: "Protocol" },
  { key: "app", name: "Seer App", path: "/app", line: "Every market, on the record", verb: "Explore" },
  { key: "deep", name: "Deep", path: "/deep", line: "Questions with a whole field of answers", verb: "Forecast fields" },
  { key: "futarchy", name: "Futarchy", path: "/futarchy", line: "What a decision is worth, both ways", verb: "Inform decisions" },
  { key: "opportunity", name: "Opportunity", path: "/opportunity", line: "Which submission gets chosen", verb: "Surface entries" },
  { key: "risk", name: "Risk", path: "/risk", line: "Default risk, priced side by side", verb: "Price risk" },
];

function D({ x, y, s = 3.2, on = false, outline = false }: { x: number; y: number; s?: number; on?: boolean; outline?: boolean }) {
  return (
    <rect
      x={x - s}
      y={y - s}
      width={s * 2}
      height={s * 2}
      rx={0.6}
      transform={`rotate(45 ${x} ${y})`}
      fill={outline ? "none" : on ? "var(--signal)" : "currentColor"}
      stroke={outline ? "currentColor" : "none"}
      strokeWidth={outline ? 1.2 : 0}
      opacity={on || outline ? 1 : 0.28}
    />
  );
}

export function AppGlyph({ app, className = "h-6 w-6" }: { app: AppKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {app === "home" && <Mark className="" />}
      {app === "app" && (
        <>
          <D x={7} y={7} on />
          <D x={17} y={7} />
          <D x={7} y={17} />
          <D x={17} y={17} />
        </>
      )}
      {app === "deep" && (
        <>
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((c) => <D key={`${r}${c}`} x={4.5 + c * 5} y={4.5 + r * 5} s={1.5} on={r === 1 && c === 2} />),
          )}
        </>
      )}
      {app === "futarchy" && (
        <>
          <D x={8} y={12} s={4.2} on />
          <D x={16} y={12} s={4.2} outline />
        </>
      )}
      {app === "opportunity" && (
        <>
          <D x={4} y={15} s={2} />
          <D x={12} y={8} s={3.6} on />
          <D x={20} y={15} s={2} />
          <line x1="2" y1="20.5" x2="22" y2="20.5" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        </>
      )}
      {app === "risk" && (
        <>
          <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
          <line x1="2" y1="8" x2="2" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
          <line x1="22" y1="8" x2="22" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
          <D x={7} y={12} s={2} />
          <D x={15} y={12} s={3.4} on />
        </>
      )}
    </svg>
  );
}

/** The single "signal" glyph used as a probability marker on scales. */
export function Diamond({ size = 10, on = true, className }: { size?: number; on?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" className={className} aria-hidden>
      <rect x="1.6" y="1.6" width="6.8" height="6.8" rx="1" transform="rotate(45 5 5)" fill={on ? "var(--signal)" : "var(--muted)"} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "outline"; size?: "sm" | "md" | "lg" };

export function Button({ variant = "primary", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap select-none cursor-pointer",
        size === "sm" && "h-9 px-4 text-[13px]",
        size === "md" && "h-11 px-5 text-[14px]",
        size === "lg" && "h-12 px-6 text-[15px]",
        variant === "primary" && "bg-signal text-on-signal hover:brightness-110",
        variant === "secondary" && "bg-signal-soft text-signal-ink hover:brightness-95",
        variant === "ghost" && "text-text-2 hover:text-text hover:bg-nested",
        variant === "outline" && "border border-line-strong bg-card text-text hover:border-text",
        className,
      )}
    />
  );
}

export function ButtonLink({ to, variant = "primary", size = "md", className, children, external }: { to: string; variant?: BtnProps["variant"]; size?: BtnProps["size"]; className?: string; children: ReactNode; external?: boolean }) {
  const cls = cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors whitespace-nowrap",
    size === "sm" && "h-9 px-4 text-[13px]",
    size === "md" && "h-11 px-5 text-[14px]",
    size === "lg" && "h-12 px-6 text-[15px]",
    variant === "primary" && "bg-signal text-on-signal hover:brightness-110",
    variant === "secondary" && "bg-signal-soft text-signal-ink hover:brightness-95",
    variant === "ghost" && "text-text-2 hover:text-text hover:bg-nested",
    variant === "outline" && "border border-line-strong text-text hover:border-text",
    className,
  );
  return external ? (
    <a href={to} target="_blank" rel="noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

export function Seg<T extends string>({ value, onChange, options, size = "md", className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: "sm" | "md"; className?: string }) {
  return (
    <div role="tablist" className={cx("inline-flex rounded-full bg-card p-1 gap-0.5 shadow-card", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-full transition-colors whitespace-nowrap cursor-pointer",
            size === "sm" ? "h-8 px-3.5 text-[12.5px]" : "h-9 px-4 text-[13px]",
            value === o.value ? "bg-text text-bg font-medium" : "text-text-2 hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "h-9 rounded-full px-4 text-[13px] border transition-colors whitespace-nowrap cursor-pointer",
        active ? "bg-text text-bg border-text" : "border-line-strong bg-card text-text-2 hover:border-text hover:text-text",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "signal" | "solid" | "outline" | "alert"; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 h-6 rounded-full px-2.5 text-[11.5px] font-medium whitespace-nowrap",
        tone === "neutral" && "bg-nested text-text-2",
        tone === "signal" && "bg-signal-soft text-signal-ink",
        tone === "solid" && "bg-signal text-on-signal",
        tone === "outline" && "border border-line-strong text-text-2",
        tone === "alert" && "bg-alert/10 text-alert",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className, as: As = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  return <As className={cx("rounded-[24px] bg-card shadow-card", className)}>{children}</As>;
}

export function Stat({ label, value, sub, className, big }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string; big?: boolean }) {
  return (
    <div className={cx("min-w-0", className)}>
      <div className="eyebrow mb-2">{label}</div>
      <div className={cx("num text-text tracking-[-0.03em]", big ? "text-[36px] leading-none" : "text-[24px] leading-tight")}>{value}</div>
      {sub && <div className="mt-1.5 text-[12px] text-muted">{sub}</div>}
    </div>
  );
}

/** Horizontal probability bar. The leading outcome is the only one that gets the signal colour. */
export function ProbBar({ p, on = false, className, h = 8 }: { p: number | null; on?: boolean; className?: string; h?: number }) {
  return (
    <div className={cx("w-full rounded-full bg-nested overflow-hidden", className)} style={{ height: h }}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.max(0, Math.min(100, p ?? 0))}%`, background: on ? "var(--signal)" : "var(--line-strong)" }}
      />
    </div>
  );
}

export function LiveTag({ live, at, className }: { live: boolean; at?: number | null; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 eyebrow", className)} title={at ? new Date(at * 1000).toLocaleString() : undefined}>
      <span className={cx("h-1.5 w-1.5 rounded-full", live ? "bg-signal live-dot" : "bg-muted")} />
      {live ? "Live · app.seer.pm" : "Snapshot"}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="num inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong px-1 text-[10px] text-muted">{children}</kbd>;
}

export function Copy({ text, label }: { text: string; label?: ReactNode }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1.5 text-text-2 hover:text-text cursor-pointer"
      title="Copy"
    >
      {label}
      <span className="eyebrow !text-[10px]">{ok ? "copied" : "copy"}</span>
    </button>
  );
}

export function Section({ eyebrow, title, aside, children, className, id }: { eyebrow?: ReactNode; title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx("py-10", className)}>
      {(eyebrow || title || aside) && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
            {title && <h2 className="text-[24px] md:text-[28px] font-medium tracking-[-0.025em] leading-tight">{title}</h2>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line-strong p-8 text-center text-[13px] text-muted">{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-nested", className)} />;
}

export function Arrow({ className = "h-4 w-4", dir = "right" }: { className?: string; dir?: "right" | "up-right" | "down" | "left" }) {
  const rot = { right: 0, "up-right": -45, down: 90, left: 180 }[dir];
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ transform: `rotate(${rot}deg)` }} aria-hidden>
      <path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Icon({ name, className = "h-4 w-4" }: { name: "search" | "sun" | "moon" | "x" | "check" | "external" | "info" | "filter" | "wallet" | "bolt" | "code" | "user" | "bookmark" | "sort"; className?: string }) {
  const p: Record<string, ReactNode> = {
    search: <><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></>,
    sun: <><circle cx="8" cy="8" r="3" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" /></>,
    moon: <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />,
    x: <path d="M4 4l8 8M12 4l-8 8" />,
    check: <path d="M3 8.5 6.5 12 13 4.5" />,
    external: <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" />,
    info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.5V11M8 5v.01" /></>,
    filter: <path d="M2.5 4h11M4.5 8h7M6.5 12h3" />,
    wallet: <><rect x="2" y="4" width="12" height="9" rx="2" /><path d="M10.5 8.5h1M2 6.5h12" /></>,
    bolt: <path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z" />,
    code: <path d="M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4" />,
    user: <><circle cx="8" cy="5.5" r="2.5" /><path d="M3 13.5c.8-2.2 2.7-3.5 5-3.5s4.2 1.3 5 3.5" /></>,
    bookmark: <path d="M4.5 2.5h7v11L8 11l-3.5 2.5z" />,
    sort: <path d="M5 3v10M2.5 10.5 5 13l2.5-2.5M11 13V3M8.5 5.5 11 3l2.5 2.5" />,
  };
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p[name]}
    </svg>
  );
}
