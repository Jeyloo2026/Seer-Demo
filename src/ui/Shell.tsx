import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { APPS, AppGlyph, Button, Icon, Kbd, Wordmark, cx, type AppKey } from "./kit";
import { GiantWordmark } from "./brand";
import { useMarkets } from "../data/seer";
import { chainName, kindOf, leader, marketPath, pct, usd } from "../data/market";

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("seer-theme", theme);
    } catch {
      /* private mode */
    }
  }, [theme]);
  return [theme, setTheme] as const;
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

export function Shell({ app, children, wide = false }: { app: AppKey; children: ReactNode; wide?: boolean }) {
  const [theme, setTheme] = useTheme();
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [wallet, setWallet] = useState(false);
  const loc = useLocation();
  const current = APPS.find((a) => a.key === app)!;

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea")) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 px-3 pt-3 md:px-6">
        <div className={cx("mx-auto flex h-16 items-center gap-3 rounded-full bg-card/90 pl-5 pr-2.5 shadow-card backdrop-blur-md", wide ? "max-w-[1552px]" : "max-w-[1312px]")}>
          <Link to="/" className="flex items-center gap-2 shrink-0 text-text" aria-label="Seer home">
            <Wordmark className="h-[22px] w-auto" />
          </Link>
          {app !== "home" && (
            <div className="flex items-center gap-2 text-text min-w-0">
              <span className="text-line-strong text-[20px] font-light">/</span>
              <AppGlyph app={app} className="h-5 w-5 shrink-0 text-text" />
              <span className="text-[15px] font-medium tracking-[-0.01em] truncate">{current.name.replace("Seer ", "")}</span>
            </div>
          )}

          <nav className="ml-6 hidden lg:flex items-center gap-0.5" aria-label="Seer interfaces">
            {APPS.map((a) => (
              <NavLink
                key={a.key}
                to={a.path}
                end={a.path === "/"}
                className={({ isActive }) =>
                  cx(
                    "h-10 px-4 rounded-full text-[14px] inline-flex items-center gap-1.5 transition-colors",
                    isActive || a.key === app ? "bg-text text-bg" : "text-text-2 hover:text-text hover:bg-nested",
                  )
                }
              >
                {a.key === "home" ? "Protocol" : a.name.replace("Seer ", "")}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setPalette(true)}
              className="hidden md:inline-flex h-11 w-60 items-center gap-2 rounded-full bg-nested px-4 text-[14px] text-text-2 hover:bg-line cursor-pointer"
            >
              <Icon name="search" />
              <span className="flex-1 text-left">Search markets</span>
              <Kbd>⌘K</Kbd>
            </button>
            <button onClick={() => setPalette(true)} className="md:hidden h-11 w-11 grid place-items-center rounded-full border border-line-strong text-text hover:bg-nested" aria-label="Search">
              <Icon name="search" />
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-11 w-11 grid place-items-center rounded-full border border-line-strong text-text hover:bg-nested cursor-pointer"
              aria-label="Toggle theme"
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <span className="hidden sm:block">
              <Button size="md" onClick={() => setWallet(true)}>
                Connect
              </Button>
            </span>
            <button onClick={() => setMenu((m) => !m)} className="lg:hidden h-11 w-11 grid place-items-center rounded-full border border-line-strong text-text hover:bg-nested" aria-label="Menu" aria-expanded={menu}>
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                {menu ? <path d="M4 4l8 8M12 4l-8 8" /> : <path d="M2.5 5h11M2.5 11h11" />}
              </svg>
            </button>
          </div>
        </div>
        {menu && (
          <div className="lg:hidden mx-auto mt-2 max-w-[1312px] rounded-[28px] bg-card p-3 shadow-card">
            <div className="grid grid-cols-2 gap-2">
              {APPS.map((a) => (
                <Link key={a.key} to={a.path} className={cx("flex items-center gap-3 rounded-[20px] p-3", a.key === app ? "bg-text text-bg" : "bg-nested")}>
                  <AppGlyph app={a.key} className="h-6 w-6" />
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium">{a.key === "home" ? "Protocol" : a.name}</div>
                    <div className="text-[11px] opacity-60 truncate">{a.line}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <Footer />
      {palette && <Palette onClose={() => setPalette(false)} onTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />}
      {wallet && <WalletNote onClose={() => setWallet(false)} />}
    </div>
  );
}

export function Container({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cx("mx-auto px-4 md:px-6", wide ? "max-w-[1600px]" : "max-w-[1360px]", className)}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Command palette — one search across every market and interface      */
/* ------------------------------------------------------------------ */

function Palette({ onClose, onTheme }: { onClose: () => void; onTheme: () => void }) {
  const { markets } = useMarkets();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const apps = APPS.filter((a) => !s || a.name.toLowerCase().includes(s) || a.line.toLowerCase().includes(s)).map((a) => ({
      kind: "app" as const,
      key: a.key,
      title: a.key === "home" ? "Seer protocol" : a.name,
      sub: a.line,
      go: () => nav(a.path),
    }));
    const isAddr = /^0x[0-9a-f]{4,}$/i.test(s);
    const ms = (s
      ? markets.filter((m) => (isAddr ? m.id.toLowerCase().startsWith(s) : m.name.toLowerCase().includes(s) || m.outcomes.some((o) => o.toLowerCase().includes(s))))
      : markets
    )
      .slice()
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 8)
      .map((m) => {
        const l = leader(m);
        return {
          kind: "market" as const,
          key: m.id,
          title: m.name,
          sub: `${kindOf(m)} · ${chainName(m.chainId)} · ${usd(m.vol)} vol${l?.p != null ? ` · ${l.name} ${pct(l.p)}` : ""}`,
          go: () => nav(marketPath(m)),
        };
      });
    const actions = "theme dark light".includes(s) || !s ? [{ kind: "action" as const, key: "theme", title: "Toggle light / dark", sub: "Appearance", go: onTheme }] : [];
    return [...ms, ...apps, ...actions];
  }, [q, markets, nav, onTheme]);

  useEffect(() => setI(0), [q]);

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm p-4 pt-[12vh]" onMouseDown={onClose}>
      <div className="mx-auto max-w-2xl overflow-hidden rounded-[24px] bg-card shadow-card shadow-2xl rise" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" className="h-4 w-4 text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setI((x) => Math.min(items.length - 1, x + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setI((x) => Math.max(0, x - 1));
              }
              if (e.key === "Enter" && items[i]) {
                items[i].go();
                onClose();
              }
            }}
            placeholder="Search markets, outcomes, addresses, interfaces…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto scroll-thin p-2">
          {items.length === 0 && <div className="p-6 text-center text-[13px] text-muted">Nothing on the record for “{q}”.</div>}
          {items.map((it, idx) => (
            <button
              key={it.kind + it.key}
              onMouseEnter={() => setI(idx)}
              onClick={() => {
                it.go();
                onClose();
              }}
              className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer", idx === i && "bg-nested")}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-text-2">
                {it.kind === "app" ? <AppGlyph app={it.key as AppKey} className="h-4 w-4" /> : it.kind === "action" ? <Icon name="moon" /> : <span className="eyebrow !text-[9px]">MKT</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-text">{it.title}</span>
                <span className="block truncate text-[12px] text-muted">{it.sub}</span>
              </span>
              {idx === i && <Kbd>↵</Kbd>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
          <span className="ml-auto">{markets.length.toLocaleString()} markets indexed</span>
        </div>
      </div>
    </div>
  );
}

function WalletNote({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-sm p-4" onMouseDown={onClose}>
      <div className="w-full max-w-sm rounded-[24px] bg-card shadow-card p-6 shadow-2xl rise" onMouseDown={(e) => e.stopPropagation()}>
        <div className="eyebrow mb-3">Design demo</div>
        <h3 className="text-[20px] font-medium tracking-tight">Wallets are simulated here</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-text-2">
          Market data on every page is read live from Seer's public API. Trades, submissions and wallet actions are simulated so the flows can be reviewed without
          moving funds.
        </p>
        <div className="mt-5 flex gap-2">
          <Button onClick={onClose} className="flex-1">
            Got it
          </Button>
          <a href="https://app.seer.pm" target="_blank" rel="noreferrer" className="flex-1">
            <Button variant="outline" className="w-full">
              Open app.seer.pm
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="mt-20 px-3 pb-3 md:px-6 md:pb-6">
      <div className="relative mx-auto max-w-[1552px] overflow-hidden rounded-[36px] text-white" style={{ background: "#14121E" }}>
        <div className="px-6 pt-12 md:px-12 md:pt-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Wordmark className="h-7 w-auto text-white" />
              <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-white/65">Decision infrastructure. Markets for prediction, governance and coordination, on one protocol.</p>
              <div className="mt-6 flex gap-2">
                {[
                  ["X", "https://x.com/seer_pm"],
                  ["Discord", "https://discord.com/invite/rBEB4MYQwV"],
                  ["GitHub", "https://github.com/seer-pm"],
                ].map(([l, h]) => (
                  <a key={l} href={h} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full border border-white/20 px-4 text-[13px] hover:bg-white/10">
                    {l}
                  </a>
                ))}
              </div>
            </div>
            <FooterCol title="Interfaces" links={APPS.map((a) => ({ label: a.key === "home" ? "Protocol" : a.name, to: a.path }))} />
            <FooterCol
              title="Protocol"
              links={[
                { label: "Documentation", href: "https://seer-3.gitbook.io/seer-documentation" },
                { label: "GitHub", href: "https://github.com/seer-pm" },
                { label: "Reality.eth oracle", href: "https://reality.eth.limo" },
                { label: "Kleros court", href: "https://kleros.io" },
              ]}
            />
            <FooterCol
              title="Community"
              links={[
                { label: "X / Twitter", href: "https://x.com/seer_pm" },
                { label: "Discord", href: "https://discord.com/invite/rBEB4MYQwV" },
                { label: "Telegram", href: "https://t.me/Seerpredictionmarket" },
                { label: "Blog", href: "https://seer-pm.medium.com" },
              ]}
            />
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[12px] text-white/50">
            <span>Design concept on the Electric Foundation identity. Market data is live from the public Seer API; trading actions are simulated.</span>
            <span>Gnosis, Ethereum, Optimism and Base</span>
          </div>
        </div>
        <div className="mt-8 px-4 md:px-8" aria-hidden>
          <GiantWordmark className="-mb-[4.5%] text-signal" />
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to?: string; href?: string }[] }) {
  return (
    <div>
      <div className="mb-4 text-[13px] text-white/45">{title}</div>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link to={l.to} className="text-[14px] text-white/80 hover:text-white">
                {l.label}
              </Link>
            ) : (
              <a href={l.href} target="_blank" rel="noreferrer" className="text-[14px] text-white/80 hover:text-white">
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
