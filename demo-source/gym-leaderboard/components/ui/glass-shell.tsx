"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Bell,
  Check,
  Layers,
  Moon,
  Search,
  Settings2,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";

gsap.registerPlugin(useGSAP);

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type GlassSettings = {
  blur: number;
  opacity: number;
  saturation: number;
  tint: string;
  edge: number;
};

export type ShellView = {
  id: string;
  /** Label used in the navigation. */
  label: string;
  icon: LucideIcon;
  /** Large heading. Defaults to `label`. */
  title?: string;
  /** Small line above the heading. Defaults to the shell `tagline`. */
  eyebrow?: string;
  /** Right side of the heading row: a button, a date, a segmented control... */
  action?: ReactNode;
  /** The view body. Build it from the primitives below. */
  content: ReactNode;
};

export type ShellNotification = { id: string; title: string; body?: string };

export interface GlassShellProps {
  brand?: string;
  /** Icon in the brand tile. Defaults to Layers. */
  brandIcon?: LucideIcon;
  /** Muted text next to the brand (hidden on small screens). */
  tagline?: string;
  /** Shows an avatar with the first letter, and a greeting on the first view. */
  userName?: string;
  backgroundImage?: string;
  /** 1 to ~6 views. They become the rail, the dock and the mobile tab bar. */
  views: ShellView[];
  initialViewId?: string;
  /** Called whenever the active view changes (for syncing the URL, etc.). */
  onViewChange?: (id: string) => void;
  notifications?: ShellNotification[];
  footerNote?: string;
  glass?: Partial<GlassSettings>;
  onGlassChange?: (settings: GlassSettings) => void;
  theme?: "system" | "light" | "dark";
  /** Inherit complete Tailwind v4 --color-* tokens. The host owns theme switching. */
  useHostTheme?: boolean;
  className?: string;
  style?: CSSProperties;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const defaults: GlassSettings = {
  blur: 22,
  opacity: 0.3,
  saturation: 1.2,
  tint: "#eadbc7",
  edge: 0.6,
};

const bounded = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

const normalize = (v: Partial<GlassSettings>): GlassSettings => ({
  blur: bounded(v.blur ?? defaults.blur, 0, 40, defaults.blur),
  opacity: bounded(v.opacity ?? defaults.opacity, 0.08, 0.9, defaults.opacity),
  saturation: bounded(
    v.saturation ?? defaults.saturation,
    0.5,
    2,
    defaults.saturation,
  ),
  edge: bounded(v.edge ?? defaults.edge, 0, 1, defaults.edge),
  tint: /^#[0-9a-f]{6}$/i.test(v.tint ?? "") ? v.tint! : defaults.tint,
});

/* ------------------------------------------------------------------ */
/* Context: lets any child switch views or show a toast                */
/* ------------------------------------------------------------------ */

type ShellApi = {
  view: string;
  setView: (id: string) => void;
  toast: (message: string) => void;
};
const ShellContext = createContext<ShellApi | null>(null);

/** Use inside view content: `const { setView, toast } = useShell();` */
export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <GlassShell>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export default function GlassShell({
  brand = "Workspace",
  brandIcon: BrandIcon = Layers,
  tagline,
  userName,
  backgroundImage,
  views,
  initialViewId,
  onViewChange,
  notifications = [],
  footerNote,
  glass = defaults,
  onGlassChange,
  theme = "system",
  useHostTheme = true,
  className = "",
  style,
}: GlassShellProps) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const id = useId().replace(/:/g, "");
  const [viewId, setViewId] = useState(initialViewId ?? views[0]?.id ?? "");
  const [material, setMaterial] = useState(() => normalize(glass));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localTheme, setLocalTheme] = useState(theme);
  const [notice, setNotice] = useState("");
  const [alerts, setAlerts] = useState(false);
  const [backgroundFailed, setBackgroundFailed] = useState(false);

  // If the list of views changes and the active one disappears, fall back to the first.
  const active = views.find((v) => v.id === viewId) ?? views[0];

  useEffect(
    () => setMaterial(normalize(glass)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass.blur, glass.opacity, glass.saturation, glass.tint, glass.edge],
  );
  useEffect(() => setLocalTheme(theme), [theme]);
  useEffect(() => {
    if (settingsOpen)
      root.current
        ?.querySelector<HTMLButtonElement>(".gw-material button")
        ?.focus();
  }, [settingsOpen]);
  useEffect(() => setBackgroundFailed(false), [backgroundImage]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const changeView = useCallback(
    (next: string) => {
      setViewId(next);
      setAlerts(false);
      onViewChange?.(next);
    },
    [onViewChange],
  );

  const api = useMemo<ShellApi>(
    () => ({ view: active?.id ?? "", setView: changeView, toast: setNotice }),
    [active?.id, changeView],
  );

  // Staggered entrance for every `.gw-reveal` element when the view changes.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const panels = content.current?.querySelectorAll(".gw-reveal");
        if (!panels?.length) return;
        gsap.fromTo(
          panels,
          { y: 12, opacity: 0.45, filter: "blur(3px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.48,
            stagger: 0.045,
            ease: "power3.out",
            clearProps: "transform,opacity,filter",
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [active?.id], revertOnUpdate: true },
  );

  function updateGlass(patch: Partial<GlassSettings>) {
    const next = normalize({ ...material, ...patch });
    setMaterial(next);
    onGlassChange?.(next);
  }
  function closeSettings() {
    setSettingsOpen(false);
    settingsTrigger.current?.focus();
  }
  function toggleTheme() {
    const scheme = root.current
      ? getComputedStyle(root.current).colorScheme
      : "normal";
    const isDark =
      scheme === "dark" ||
      (scheme !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setLocalTheme(isDark ? "light" : "dark");
  }

  const nav = (compact = false) => (
    <nav
      className={compact ? "gw-rail gw-glass" : "gw-dock gw-glass"}
      aria-label={compact ? "Quick navigation" : "Views"}
    >
      {views.map((tab, i) => (
        <button
          key={tab.id}
          type="button"
          aria-label={compact ? tab.label : undefined}
          title={compact ? tab.label : undefined}
          aria-current={active?.id === tab.id ? "page" : undefined}
          onClick={() => changeView(tab.id)}
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
              return;
            e.preventDefault();
            const next =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? views.length - 1
                  : (i + (e.key === "ArrowRight" ? 1 : views.length - 1)) %
                    views.length;
            changeView(views[next].id);
            (
              e.currentTarget.parentElement?.children[next] as HTMLButtonElement
            )?.focus();
          }}
        >
          <tab.icon size={18} strokeWidth={1.7} aria-hidden="true" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  if (!active) return null;
  const isFirst = active.id === views[0].id;

  return (
    <ShellContext.Provider value={api}>
      <div
        ref={root}
        className={`gw-root ${className}`}
        data-theme={useHostTheme ? "system" : localTheme}
        data-host-theme={useHostTheme}
        style={
          {
            "--gw-blur": `${material.blur}px`,
            "--gw-opacity": material.opacity,
            "--gw-saturation": material.saturation,
            "--gw-tint": useHostTheme
              ? `color-mix(in srgb, var(--color-background, Canvas) 80%, ${material.tint})`
              : material.tint,
            "--gw-edge": material.edge,
            ...style,
          } as CSSProperties
        }
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (settingsOpen) closeSettings();
            setAlerts(false);
          }
        }}
      >
        <style>{styles}</style>
        {backgroundImage && !backgroundFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="gw-room"
            src={backgroundImage}
            alt=""
            onError={() => setBackgroundFailed(true)}
          />
        )}
        <div className="gw-room-shade" aria-hidden="true" />
        <div className="gw-workspace">
          <header className="gw-topbar gw-glass">
            <a
              className="gw-brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                changeView(views[0].id);
              }}
            >
              <span className="gw-brand-icon">
                <BrandIcon size={18} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <strong>{brand}</strong>
              {tagline && (
                <>
                  <span className="gw-brand-divider" />
                  <span className="gw-personal">{tagline}</span>
                </>
              )}
            </a>
            <div className="gw-toolbar">
              <button
                type="button"
                className="gw-adjust"
                ref={settingsTrigger}
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  setAlerts(false);
                }}
                aria-expanded={settingsOpen}
                aria-controls={`${id}-material`}
              >
                <Settings2 size={16} aria-hidden="true" />
                <span>Adjust glass</span>
              </button>
              {!useHostTheme && (
                <button
                  type="button"
                  className="gw-icon-button"
                  aria-label="Toggle light and dark theme"
                  onClick={toggleTheme}
                >
                  <Sun className="gw-sun" size={17} aria-hidden="true" />
                  <Moon className="gw-moon" size={17} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="gw-icon-button gw-bell"
                aria-label="Notifications"
                aria-expanded={alerts}
                onClick={() => {
                  setAlerts(!alerts);
                  setSettingsOpen(false);
                }}
              >
                <Bell size={17} aria-hidden="true" />
                {notifications.length > 0 && <i />}
              </button>
              {userName && (
                <span className="gw-avatar" title={userName}>
                  {userName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
          </header>
          <div className="gw-stage">
            {nav(true)}
            <main className="gw-main gw-glass">
              <div className="gw-view-heading">
                <div>
                  <p className="gw-greeting">
                    {active.eyebrow ??
                      (isFirst && userName
                        ? `Welcome back, ${userName}.`
                        : tagline)}
                  </p>
                  <h1>{active.title ?? active.label}</h1>
                </div>
                <div className="gw-heading-action">{active.action}</div>
              </div>
              <div className="gw-mobile-nav">{nav()}</div>
              <div ref={content} key={active.id} className="gw-view">
                {active.content}
              </div>
              {footerNote && (
                <footer className="gw-footer">
                  <span>
                    <i />
                    {footerNote}
                  </span>
                </footer>
              )}
              <div className="gw-desktop-dock">{nav()}</div>
            </main>
          </div>
          {alerts && (
            <aside
              className="gw-notifications gw-glass"
              aria-label="Notifications"
            >
              <div>
                <h2>
                  {notifications.length
                    ? "Notifications"
                    : "You’re all caught up."}
                </h2>
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setAlerts(false)}
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
              {notifications.length ? (
                notifications.map((n) => (
                  <p key={n.id}>
                    <strong>{n.title}</strong>
                    {n.body && <> &mdash; {n.body}</>}
                  </p>
                ))
              ) : (
                <p>No new notifications.</p>
              )}
            </aside>
          )}
          {settingsOpen && (
            <aside
              className="gw-material gw-glass"
              id={`${id}-material`}
              aria-label="Glass appearance"
            >
              <div className="gw-material-title">
                <div>
                  <span className="gw-material-icon">
                    <Settings2 size={18} aria-hidden="true" />
                  </span>
                  <h2>Glass appearance</h2>
                </div>
                <button
                  type="button"
                  className="gw-icon-button"
                  aria-label="Close glass settings"
                  onClick={closeSettings}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <p>Adjust the material across your workspace.</p>
              <div className="gw-material-sample" aria-hidden="true">
                <Layers size={28} strokeWidth={1.1} />
                <span>Live material preview</span>
              </div>
              <div className="gw-presets" aria-label="Glass presets">
                {[
                  {
                    name: "Clear",
                    value: { blur: 8, opacity: 0.12, saturation: 1.1, edge: 0.8 },
                  },
                  { name: "Frosted", value: defaults },
                  {
                    name: "Solid",
                    value: { blur: 32, opacity: 0.86, saturation: 1, edge: 0.35 },
                  },
                ].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => updateGlass(p.value)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {[
                {
                  key: "blur",
                  label: "Blur",
                  min: 0,
                  max: 40,
                  step: 1,
                  value: `${Math.round(material.blur)} px`,
                },
                {
                  key: "opacity",
                  label: "Opacity",
                  min: 0.08,
                  max: 0.9,
                  step: 0.01,
                  value: `${Math.round(material.opacity * 100)}%`,
                },
                {
                  key: "saturation",
                  label: "Saturation",
                  min: 0.5,
                  max: 2,
                  step: 0.05,
                  value: `${Math.round(material.saturation * 100)}%`,
                },
                {
                  key: "edge",
                  label: "Edge light",
                  min: 0,
                  max: 1,
                  step: 0.05,
                  value: `${Math.round(material.edge * 100)}%`,
                },
              ].map((c) => (
                <label className="gw-range" key={c.key}>
                  <span>
                    {c.label}
                    <output>{c.value}</output>
                  </span>
                  <input
                    type="range"
                    aria-label={c.label}
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={material[c.key as keyof GlassSettings]}
                    onChange={(e) =>
                      updateGlass({ [c.key]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
              <label className="gw-tint">
                Glass tint{" "}
                <input
                  type="color"
                  value={material.tint}
                  onChange={(e) => updateGlass({ tint: e.target.value })}
                />
              </label>
              <button
                className="gw-reset"
                type="button"
                onClick={() => updateGlass(normalize(glass))}
              >
                Reset appearance
              </button>
            </aside>
          )}
        </div>
        {notice && (
          <div className="gw-toast" role="status">
            <Check size={16} aria-hidden="true" />
            {notice}
          </div>
        )}
      </div>
    </ShellContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Building blocks for view content                                    */
/* All of these must render inside <GlassShell> (they use its CSS).    */
/* Add className "gw-reveal" to anything that should animate in.       */
/* ------------------------------------------------------------------ */

/** A frosted card with an optional title row. */
export function GlassPanel({
  title,
  action,
  children,
  className = "",
  style,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={`gw-panel gw-reveal ${className}`} style={style}>
      {(title || action) && (
        <div className="gw-panel-title">
          {title ? <h2>{title}</h2> : <span />}
          {action && <span className="gw-title-actions">{action}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

/** A row of KPI tiles. Children are <Stat /> elements. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="gw-stats gw-reveal">{children}</div>;
}

export function Stat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <section className="gw-panel">
      <div className="gw-panel-title">
        <span>{label}</span>
        {Icon && <Icon size={17} aria-hidden="true" />}
      </div>
      <strong>{value}</strong>
      {note && <span>{note}</span>}
    </section>
  );
}

/** Two columns (wide + narrow) that collapse to one on small screens. */
export function Grid({
  children,
  even = false,
}: {
  children: ReactNode;
  even?: boolean;
}) {
  return <div className={even ? "gw-grid-even" : "gw-grid"}>{children}</div>;
}

/** Vertical rhythm between panels. */
export function Stack({ children }: { children: ReactNode }) {
  return <div className="gw-stack">{children}</div>;
}

/** Small segmented control, e.g. for a period or filter. */
export function SegmentControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className="gw-segment" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <div className="gw-list">{children}</div>;
}

/** One row of a list: icon, title/subtitle, small meta text, trailing value, actions. */
export function ListRow({
  icon: Icon,
  title,
  subtitle,
  meta,
  value,
  accent = false,
  actions,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  value?: ReactNode;
  /** Tints the icon and value with the accent color. */
  accent?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div className="gw-item">
      {Icon && (
        <span className={`gw-item-icon ${accent ? "is-accent" : ""}`}>
          <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
        </span>
      )}
      <div className="gw-item-body">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      {meta && <span className="gw-item-meta">{meta}</span>}
      {value != null && (
        <strong className={accent ? "gw-accent-text" : ""}>{value}</strong>
      )}
      {actions}
    </div>
  );
}

/** Horizontal bars for comparing a few values. `ratio` is 0..1. */
export function BarList({
  items,
}: {
  items: { label: string; display: ReactNode; ratio: number }[];
}) {
  return (
    <div className="gw-bars">
      {items.map((it, i) => (
        <div key={it.label}>
          <div>
            <span>{it.label}</span>
            <strong>{it.display}</strong>
          </div>
          <span className="gw-bar-track">
            <i
              style={{
                width: `${Math.min(100, Math.max(0, it.ratio * 100))}%`,
                opacity: Math.max(0.4, 1 - i * 0.14),
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Labeled progress bar. `value` is 0..100. */
export function Progress({
  label,
  value,
  display,
  note,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  display?: ReactNode;
  note?: ReactNode;
  icon?: LucideIcon;
  /** Optional CSS color for the fill. */
  color?: string;
}) {
  const pct = Math.round(Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0)));
  return (
    <div className="gw-progress-block">
      <div className="gw-progress-head">
        {Icon && (
          <span className="gw-item-icon">
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
        <strong>{label}</strong>
        <span>{display ?? `${pct}%`}</span>
      </div>
      <div
        className="gw-progress"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${pct}%`, background: color }} />
      </div>
      {note && <p className="gw-progress-note">{note}</p>}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search",
  label = placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="gw-search">
      <Search size={15} aria-hidden="true" />
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")}>
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </label>
  );
}

/** Primary action button in the glass style. */
export function ShellButton({
  icon: Icon,
  children,
  ...props
}: { icon?: LucideIcon; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="gw-button" {...props}>
      {Icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Small icon-only buttons for row actions (edit, delete...). */
export function RowActions({
  actions,
}: {
  actions: { label: string; icon: LucideIcon; onClick: () => void }[];
}) {
  return (
    <span className="gw-mini-actions">
      {actions.map((a) => (
        <button key={a.label} type="button" aria-label={a.label} onClick={a.onClick}>
          <a.icon size={14} aria-hidden="true" />
        </button>
      ))}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="gw-empty">
      {Icon && <Icon size={23} aria-hidden="true" />}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

/** Simple responsive table. The first column is emphasized; others are right-aligned. */
export function DataTable<Row>({
  columns,
  rows,
  getKey,
  label,
}: {
  columns: { header: string; cell: (row: Row) => ReactNode }[];
  rows: Row[];
  getKey: (row: Row) => string;
  label: string;
}) {
  const template = `1.4fr ${columns
    .slice(1)
    .map(() => "1fr")
    .join(" ")}`;
  return (
    <div className="gw-table-scroll">
      <div className="gw-table" role="table" aria-label={label}>
        <div className="gw-row gw-row-head" role="row" style={{ gridTemplateColumns: template }}>
          {columns.map((c) => (
            <span key={c.header} role="columnheader">
              {c.header}
            </span>
          ))}
        </div>
        {rows.map((r) => (
          <div className="gw-row" role="row" key={getKey(r)} style={{ gridTemplateColumns: template }}>
            {columns.map((c) => (
              <span key={c.header} role="cell">
                {c.cell(r)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = `
.gw-root {
  --gw-ink: var(--color-foreground, CanvasText);
  --gw-muted: var(--color-muted-foreground, GrayText);
  --gw-accent: var(--color-primary, Highlight);
  --gw-line: color-mix(
    in srgb,
    var(--color-border, CanvasText) 35%,
    transparent
  );
  --gw-background: var(--color-background, Canvas);
  --gw-shade: color-mix(
    in srgb,
    var(--color-background, Canvas) 22%,
    transparent
  );
  --gw-surface: var(--color-card, var(--color-background, Canvas));
  --gw-panel: var(--color-card, var(--color-background, Canvas));
  --gw-brand: var(--color-primary, Highlight);
  --gw-brand-ink: var(--color-primary-foreground, HighlightText);
  --gw-avatar: var(--color-secondary, ButtonFace);
  --gw-rail-active: color-mix(
    in srgb,
    var(--color-secondary, ButtonFace) 70%,
    transparent
  );
  --gw-segment: color-mix(
    in srgb,
    var(--color-muted, ButtonFace) 25%,
    transparent
  );
  --gw-segment-active: color-mix(
    in srgb,
    var(--color-card, Canvas) 85%,
    transparent
  );
  --gw-item-surface: color-mix(
    in srgb,
    var(--color-secondary, ButtonFace) 45%,
    transparent
  );
  --gw-accent-surface: color-mix(
    in srgb,
    var(--color-primary, Highlight) 15%,
    transparent
  );
  --gw-pending: var(--color-muted-foreground, GrayText);
  --gw-dock: color-mix(in srgb, var(--color-card, Canvas) 70%, transparent);
  --gw-dock-active: var(--color-secondary, ButtonFace);
  --gw-button: var(--color-primary, Highlight);
  --gw-button-ink: var(--color-primary-foreground, HighlightText);
  --gw-search: color-mix(in srgb, var(--color-input, Canvas) 35%, transparent);
  --gw-popover: color-mix(
    in srgb,
    var(--color-popover, Canvas) 94%,
    transparent
  );
  --gw-notification: color-mix(
    in srgb,
    var(--color-popover, Canvas) 94%,
    transparent
  );
  --gw-fallback: var(--color-card, Canvas);
  --gw-mobile-dock: color-mix(
    in srgb,
    var(--color-card, Canvas) 55%,
    transparent
  );
  --gw-shadow: color-mix(
    in srgb,
    var(--color-foreground, CanvasText) 18%,
    transparent
  );
  --gw-panel-shadow: color-mix(
    in srgb,
    var(--color-foreground, CanvasText) 16%,
    transparent
  );
  --gw-soft-shadow: color-mix(
    in srgb,
    var(--color-foreground, CanvasText) 7%,
    transparent
  );
  --gw-segment-shadow: color-mix(
    in srgb,
    var(--color-foreground, CanvasText) 6%,
    transparent
  );
  --gw-dock-shadow: color-mix(
    in srgb,
    var(--color-foreground, CanvasText) 7%,
    transparent
  );
  --gw-popover-shadow: color-mix(
    in srgb,
    var(--color-foreground, CanvasText) 20%,
    transparent
  );
  --gw-sample-shadow: color-mix(
    in srgb,
    var(--color-foreground, CanvasText) 35%,
    transparent
  );
  --gw-toast-shadow: color-mix(
    in srgb,
    var(--color-foreground, CanvasText) 13%,
    transparent
  );
  --gw-toast: var(--color-primary, Highlight);
  --gw-dock-ink: var(--color-secondary-foreground, CanvasText);
  --gw-selection: color-mix(
    in srgb,
    var(--color-primary, Highlight) 35%,
    transparent
  );
  --gw-scrollbar: var(--color-muted-foreground, GrayText);
  --gw-hover: color-mix(
    in srgb,
    var(--color-secondary, ButtonFace) 25%,
    transparent
  );
  --gw-dock-hover: color-mix(
    in srgb,
    var(--color-secondary, ButtonFace) 30%,
    transparent
  );
  --gw-control-hover: color-mix(
    in srgb,
    var(--color-secondary, ButtonFace) 35%,
    transparent
  );
  --gw-soft-edge: color-mix(
    in srgb,
    var(--color-card, Canvas) 53%,
    transparent
  );
  --gw-toast-ink: var(--color-primary-foreground, HighlightText);
  --gw-highlight: var(--color-card, Canvas);
  position: relative;
  isolation: isolate;
  min-height: 100svh;
  overflow: hidden;
  padding: 38px 28px 32px;
  background: var(--gw-background);
  color: var(--gw-ink);
  font:
    14px/1.5 "Segoe UI",
    Arial,
    sans-serif;
  letter-spacing: -0.012em;
  font-variant-numeric: tabular-nums;
  box-sizing: border-box;
  color-scheme: inherit;
}
.gw-root[data-theme="light"] {
  color-scheme: light;
}
.gw-root[data-theme="dark"] {
  color-scheme: dark;
}
.gw-root * {
  box-sizing: border-box;
}
.gw-root ::selection {
  background: var(--gw-selection);
}
.gw-root button,
.gw-root input,
.gw-root a {
  font: inherit;
  color: inherit;
}
.gw-root button {
  cursor: pointer;
}
.gw-root button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.gw-root button,
.gw-root a,
.gw-root input {
  outline-offset: 4px;
}
.gw-root :focus-visible {
  outline: 2px solid var(--gw-accent);
}
.gw-root button {
  border: 0;
  background: none;
}
.gw-root h1,
.gw-root h2,
.gw-root h3,
.gw-root p {
  margin: 0;
}
.gw-room {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 56%;
  z-index: -3;
}
.gw-room-shade {
  position: absolute;
  inset: 0;
  background: var(--gw-shade);
  z-index: -2;
}
.gw-workspace {
  position: relative;
  width: min(1280px, 100%);
  margin: auto;
}
.gw-glass {
  background: color-mix(
    in srgb,
    var(--gw-surface) calc(var(--gw-opacity) * 100%),
    transparent
  );
  backdrop-filter: blur(var(--gw-blur)) saturate(var(--gw-saturation));
  -webkit-backdrop-filter: blur(var(--gw-blur)) saturate(var(--gw-saturation));
  box-shadow:
    inset 0 1px 0
      color-mix(
        in srgb,
        var(--gw-highlight) calc(var(--gw-edge) * 100%),
        transparent
      ),
    inset 0 0 0 1px
      color-mix(
        in srgb,
        var(--gw-highlight) calc(var(--gw-edge) * 34%),
        transparent
      ),
    0 20px 52px -25px var(--gw-shadow);
  position: relative;
}
.gw-glass:before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--gw-tint);
  opacity: 0.12;
  pointer-events: none;
  border-radius: inherit;
}
.gw-topbar {
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-radius: 20px;
  margin-bottom: 18px;
  padding: 0 20px;
}
.gw-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  white-space: nowrap;
}
.gw-brand strong {
  font-size: 14px;
  letter-spacing: -0.025em;
}
.gw-brand-icon {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  background: var(--gw-brand);
  color: var(--gw-brand-ink);
  border-radius: 9px;
}
.gw-brand-divider {
  height: 16px;
  width: 1px;
  background: var(--gw-line);
  margin: 0 4px;
}
.gw-personal {
  font-size: 12px;
  color: var(--gw-muted);
}
.gw-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.gw-adjust {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 9px;
  padding: 8px 10px;
}
.gw-adjust:hover {
  background: var(--gw-hover);
}
.gw-icon-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  flex: none;
}
.gw-icon-button:hover {
  background: var(--gw-hover);
}
.gw-bell {
  position: relative;
}
.gw-bell i {
  position: absolute;
  right: 8px;
  top: 6px;
  background: var(--gw-accent);
  width: 4px;
  height: 4px;
  border-radius: 50%;
}
.gw-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--gw-avatar);
  display: grid;
  place-items: center;
  font:
    600 12px Georgia,
    serif;
}
.gw-stage {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.gw-rail {
  border-radius: 23px;
  width: 50px;
  padding: 8px 5px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 50px;
  flex: none;
}
.gw-rail button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.gw-rail button span {
  display: none;
}
.gw-rail button[aria-current] {
  background: var(--gw-rail-active);
  box-shadow: 0 3px 8px var(--gw-soft-shadow);
}
.gw-main {
  border-radius: 27px;
  padding: 30px 30px 98px;
  flex: 1;
  min-width: 0;
}
.gw-view-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}
.gw-greeting {
  font-size: 13px;
  color: var(--gw-muted);
  margin-bottom: 5px !important;
}
.gw-view-heading h1 {
  font-size: clamp(23px, 2.3vw, 31px);
  font-weight: 500;
  letter-spacing: -0.035em;
  line-height: 1.18;
}
.gw-date {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--gw-muted);
  white-space: nowrap;
}
.gw-panel {
  background: color-mix(
    in srgb,
    var(--gw-panel) calc((0.16 + var(--gw-opacity) * 0.5) * 100%),
    transparent
  );
  border-radius: 17px;
  box-shadow:
    inset 0 1px 0
      color-mix(
        in srgb,
        var(--gw-highlight) calc(var(--gw-edge) * 75%),
        transparent
      ),
    0 8px 22px -20px var(--gw-panel-shadow);
  padding: 21px;
  min-width: 0;
  position: relative;
}
.gw-panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  color: var(--gw-muted);
  font-size: 12px;
}
.gw-panel-title h2 {
  font-size: 14px;
  letter-spacing: -0.02em;
  font-weight: 600;
  color: var(--gw-ink);
}
.gw-panel-title > svg {
  opacity: 0.65;
}
.gw-accent-text {
  color: var(--gw-accent);
}
.gw-segment {
  display: flex;
  gap: 3px;
  background: var(--gw-segment);
  border-radius: 8px;
  padding: 3px;
  font-size: 10px;
}
.gw-segment button {
  padding: 4px 8px;
  border-radius: 6px;
}
.gw-segment button[aria-pressed="true"] {
  background: var(--gw-segment-active);
  box-shadow: 0 2px 4px var(--gw-segment-shadow);
  color: var(--gw-ink);
}
.gw-text-button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px !important;
}
.gw-text-button:hover {
  color: var(--gw-accent);
}
.gw-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 0;
  border-top: 1px solid var(--gw-line);
  min-width: 0;
}
.gw-item:first-child {
  border-top: 0;
  padding-top: 0;
}
.gw-item:last-child {
  padding-bottom: 0;
}
.gw-item-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--gw-item-surface);
  flex: none;
}
.gw-item-icon.is-accent {
  background: var(--gw-accent-surface);
  color: var(--gw-accent);
}
.gw-item-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.gw-item-body strong {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.gw-item-body span {
  font-size: 10px;
  color: var(--gw-muted);
  margin-top: 2px;
}
.gw-item > strong {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.gw-item-meta {
  font-size: 9px;
  color: var(--gw-muted);
  display: flex;
  align-items: center;
  gap: 3px;
}
.gw-item-meta.is-muted {
  color: var(--gw-pending);
}
.gw-small-label {
  font-size: 10px;
}
.gw-progress {
  height: 5px;
  background: var(--gw-line);
  margin: 11px 0 6px;
  border-radius: 5px;
  overflow: hidden;
}
.gw-progress i {
  height: 100%;
  display: block;
  background: var(--gw-accent);
  border-radius: 5px;
}
.gw-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--gw-muted);
  font-size: 9px;
  margin-top: 22px;
  gap: 16px;
}
.gw-footer > span:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
}
.gw-footer i {
  height: 4px;
  width: 4px;
  background: var(--gw-accent);
  border-radius: 50%;
}
.gw-desktop-dock {
  position: absolute;
  bottom: 19px;
  left: 50%;
  transform: translateX(-50%);
}
.gw-dock {
  display: flex;
  align-items: center;
  gap: 3px;
  border-radius: 30px;
  padding: 5px;
  white-space: nowrap;
  background: var(--gw-dock);
  backdrop-filter: blur(20px);
}
.gw-dock button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 24px;
  padding: 10px 17px;
  font-size: 11px;
  transition:
    background 0.22s,
    color 0.22s;
}
.gw-dock button svg {
  width: 15px;
}
.gw-dock button[aria-current] {
  background: var(--gw-dock-active);
  color: var(--gw-dock-ink);
  box-shadow: 0 3px 7px var(--gw-dock-shadow);
}
.gw-dock button:not([aria-current]):hover {
  background: var(--gw-dock-hover);
}
.gw-mobile-nav {
  display: none;
}
.gw-button {
  padding: 9px 13px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--gw-button) !important;
  color: var(--gw-button-ink) !important;
  font-size: 11px !important;
  white-space: nowrap;
}
.gw-button:hover {
  filter: brightness(1.13);
}
.gw-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--gw-search);
  border: 1px solid var(--gw-line);
  border-radius: 8px;
  padding: 7px 10px;
}
.gw-search input {
  width: 165px;
  background: none;
  border: 0;
  caret-color: var(--gw-accent);
  font-size: 11px;
}
.gw-search input::placeholder {
  color: var(--gw-muted);
}
.gw-search button {
  padding: 0;
  display: flex;
}
.gw-count {
  margin-left: 6px;
  font-size: 10px;
  color: var(--gw-muted);
}
.gw-empty {
  text-align: center;
  padding: 70px 15px;
  color: var(--gw-muted);
  font-size: 12px;
}
.gw-empty svg {
  margin-bottom: 12px;
}
.gw-empty h3 {
  font-size: 15px;
  color: var(--gw-ink);
  margin-bottom: 6px;
}
.gw-empty button {
  margin-top: 15px;
  text-decoration: underline;
}
.gw-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.gw-stats strong {
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.035em;
  display: block;
}
.gw-stats section > span {
  font-size: 10px;
  color: var(--gw-muted);
}
.gw-stats .gw-panel-title {
  margin-bottom: 15px;
}
.gw-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 16px;
}
.gw-bars > div + div {
  margin-top: 19px;
}
.gw-bars > div > div {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 11px;
}
.gw-bars strong {
  margin-left: auto;
  font-weight: 500;
}
.gw-bars svg {
  width: 14px;
}
.gw-bar-track {
  display: block;
  height: 4px;
  border-radius: 3px;
  background: var(--gw-line);
  margin-top: 9px;
}
.gw-bar-track i {
  display: block;
  height: 100%;
  background: var(--gw-accent);
  border-radius: 3px;
}
.gw-material {
  position: absolute;
  z-index: 20;
  max-height: calc(100svh - 128px);
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--gw-scrollbar) transparent;
  right: 10px;
  top: 75px;
  width: 300px;
  border-radius: 22px;
  padding: 22px;
  background: var(--gw-popover);
  box-shadow:
    inset 0 1px 0 var(--gw-soft-edge),
    0 24px 80px var(--gw-popover-shadow);
}
.gw-material-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gw-material-title > div {
  display: flex;
  gap: 10px;
  align-items: center;
}
.gw-material h2 {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.03em;
}
.gw-material-icon {
  display: grid;
  place-items: center;
}
.gw-material > p {
  font-size: 11px;
  color: var(--gw-muted);
  margin: 7px 0 18px;
}
.gw-material-sample {
  height: 87px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 13px;
  margin-bottom: 17px;
  background: color-mix(
    in srgb,
    var(--gw-tint) calc(var(--gw-opacity) * 100%),
    transparent
  );
  backdrop-filter: blur(var(--gw-blur));
  box-shadow:
    inset 0 1px 0
      color-mix(
        in srgb,
        var(--gw-highlight) calc(var(--gw-edge) * 100%),
        transparent
      ),
    0 12px 20px -18px var(--gw-sample-shadow);
  font-size: 12px;
}
.gw-presets {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
}
.gw-presets button {
  flex: 1;
  border: 1px solid var(--gw-line);
  border-radius: 7px;
  padding: 6px 0;
  font-size: 11px;
}
.gw-presets button:hover {
  background: var(--gw-control-hover);
}
.gw-range {
  display: block;
  margin: 17px 0;
}
.gw-range > span {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}
.gw-range output {
  font-size: 10px;
  color: var(--gw-muted);
}
.gw-range input {
  width: 100%;
  accent-color: var(--gw-accent);
  height: 16px;
  margin: 8px 0 0;
  cursor: pointer;
}
.gw-tint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  margin-top: 20px;
}
.gw-tint input {
  height: 28px;
  width: 42px;
  padding: 2px;
  background: none;
  border: 1px solid var(--gw-line);
  border-radius: 6px;
  cursor: pointer;
}
.gw-reset {
  width: 100%;
  border: 1px solid var(--gw-line) !important;
  border-radius: 8px;
  padding: 8px;
  margin-top: 22px;
  font-size: 11px !important;
}
.gw-reset:hover {
  background: var(--gw-control-hover);
}
.gw-notifications {
  position: absolute;
  right: 25px;
  top: 75px;
  z-index: 21;
  width: 280px;
  border-radius: 16px;
  padding: 22px;
  background: var(--gw-notification);
}
.gw-notifications > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gw-notifications h2 {
  font-size: 15px;
  font-weight: 500;
}
.gw-notifications p {
  margin-top: 8px;
  font-size: 12px;
  color: var(--gw-muted);
}
.gw-toast {
  position: fixed;
  left: 50%;
  bottom: 25px;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 20px;
  border-radius: 12px;
  background: var(--gw-toast);
  color: var(--gw-toast-ink);
  box-shadow: 0 10px 30px var(--gw-toast-shadow);
  font-size: 12px;
  white-space: nowrap;
}
.gw-sun {
  display: none;
}
[data-theme="dark"] .gw-sun {
  display: block;
}
[data-theme="dark"] .gw-moon {
  display: none;
}
@supports not (backdrop-filter: blur(1px)) {
  .gw-glass,
  .gw-panel {
      background: var(--gw-fallback);
    }
}
@media (min-width: 1550px) {
  .gw-root {
      padding-top: 65px;
    }
  .gw-main {
      padding-top: 36px;
    }
  .gw-panel {
      padding: 25px;
    }
  .gw-item {
      padding: 14px 0;
    }
}
@media (max-width: 1050px) {
  .gw-root {
      padding: 24px 18px;
    }
  .gw-main {
      padding: 25px 23px 92px;
    }
  .gw-rail {
      display: none;
    }
  .gw-item-meta {
      display: none;
    }
  .gw-personal,
  .gw-brand-divider {
      display: none;
    }
  .gw-panel {
      padding: 18px;
    }
}
@media (max-width: 700px) {
  .gw-root {
      padding: 12px 10px 24px;
    }
  .gw-topbar {
      height: 56px;
      padding: 0 12px;
      border-radius: 17px;
      margin-bottom: 12px;
    }
  .gw-toolbar {
      gap: 3px;
    }
  .gw-brand {
      gap: 7px;
    }
  .gw-brand strong {
      font-size: 12px;
    }
  .gw-brand-icon {
      width: 25px;
      height: 25px;
    }
  .gw-bell,
  .gw-avatar {
      display: none !important;
    }
  .gw-adjust {
      padding: 8px;
      font-size: 11px !important;
      gap: 5px;
    }
  .gw-main {
      border-radius: 20px;
      padding: 23px 15px;
    }
  .gw-view-heading {
      gap: 8px;
      align-items: flex-start;
      margin-bottom: 20px;
    }
  .gw-view-heading h1 {
      font-size: 25px;
      max-width: 290px;
      line-height: 1.12;
    }
  .gw-greeting {
      font-size: 11px;
    }
  .gw-heading-action .gw-date {
      display: none;
    }
  .gw-heading-action .gw-button {
      padding: 8px 10px;
      font-size: 10px !important;
    }
  .gw-mobile-nav {
      display: block;
      margin-bottom: 20px;
    }
  .gw-mobile-nav .gw-dock {
      width: 100%;
      padding: 4px;
      border-radius: 12px;
      justify-content: space-between;
      background: var(--gw-mobile-dock);
      box-shadow: none;
    }
  .gw-dock button {
      font-size: 10px;
      padding: 9px 10px;
      border-radius: 9px;
      gap: 5px;
    }
  .gw-dock button svg {
      width: 13px;
      height: 13px;
    }
  .gw-desktop-dock {
      display: none;
    }
  .gw-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }
  .gw-panel {
      border-radius: 15px;
      padding: 18px;
    }
  .gw-panel-title {
      gap: 8px;
      margin-bottom: 18px;
    }
  .gw-footer {
      font-size: 8px;
      margin-top: 24px;
    }
  .gw-footer > span:last-child {
      display: none;
    }
  .gw-material {
      right: 4px;
      top: 65px;
      width: min(310px, calc(100% - 8px));
      padding: 20px;
      max-height: calc(100svh - 90px);
      overflow: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--gw-scrollbar) transparent;
    }
  .gw-notifications {
      right: 4px;
      max-width: calc(100% - 8px);
    }
  .gw-item-body strong,
  .gw-item > strong {
      font-size: 11px;
    }
  .gw-search {
      padding: 7px;
      width: 100%;
    }
  .gw-search input {
      width: 100%;
      min-width: 0;
    }
  .gw-view:has(.gw-search) .gw-panel-title {
      flex-wrap: wrap;
    }
  .gw-stats {
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
  .gw-stats .gw-panel {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
    }
  .gw-stats .gw-panel-title {
      margin: 0;
    }
  .gw-stats .gw-panel-title svg {
      display: none;
    }
  .gw-stats strong {
      font-size: 26px;
    }
  .gw-stats section > span {
      grid-column: 1/-1;
      margin-top: 8px;
    }
  .gw-view:has(.gw-search) {
      min-height: 370px;
    }
  .gw-toast {
      max-width: calc(100% - 30px);
      font-size: 11px;
      white-space: normal;
    }
}
@media (max-height: 550px) {
  .gw-material {
      top: 70px;
      max-height: calc(100svh - 110px);
    }
}
@media (prefers-reduced-motion: reduce) {
  .gw-root * {
      scroll-behavior: auto !important;
      transition: none !important;
    }
}
.gw-table { display: flex; flex-direction: column; }
.gw-row {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 0.9fr 0.9fr 1fr 1.1fr;
  gap: 10px;
  align-items: center;
  padding: 11px 0;
  border-top: 1px solid var(--gw-line);
  font-size: 12px;
}
.gw-row > span { display: flex; flex-direction: column; min-width: 0; }
.gw-row small { font-size: 10px; color: var(--gw-muted); margin-top: 2px; }
.gw-row > span:not(:first-child) { text-align: right; align-items: flex-end; }
.gw-row-head { border-top: 0; padding-top: 0; font-size: 10px; color: var(--gw-muted); }
.gw-title-actions { display: flex; align-items: center; gap: 12px; }
.gw-mini-actions { display: flex; gap: 2px; margin-left: 4px; flex: none; }
.gw-mini-actions button {
  width: 26px; height: 26px; border-radius: 8px;
  display: grid; place-items: center; color: var(--gw-muted);
}
.gw-mini-actions button:hover { background: var(--gw-hover); color: var(--gw-ink); }


.gw-stack { display: flex; flex-direction: column; gap: 16px; }
.gw-grid-even { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.gw-stats { grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
.gw-list { display: flex; flex-direction: column; }
.gw-item-meta.is-muted { color: var(--gw-pending); }
.gw-progress-head { display: flex; align-items: center; gap: 9px; font-size: 12px; }
.gw-progress-head strong { font-weight: 500; flex: 1; }
.gw-progress-head span { font-size: 10px; color: var(--gw-muted); }
.gw-progress-note { display: flex; justify-content: space-between; font-size: 10px; color: var(--gw-muted); }
.gw-progress + .gw-progress-note { margin-top: 0; }
.gw-progress-block + .gw-progress-block { margin-top: 22px; }
.gw-table-scroll { overflow-x: auto; }
.gw-table-scroll .gw-table { min-width: 520px; }
.gw-brand-icon svg { display: block; }
`;
