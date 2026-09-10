import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/* ---------------- Semantic data palette ---------------- */
export const C = {
  primary: "#6366F1",
  primaryLight: "#818CF8",
  positive: "#22C55E",
  positiveLight: "#4ADE80",
  positiveDark: "#16A34A",
  warning: "#F59E0B",
  negative: "#EF4444",
  info: "#06B6D4",
  purple: "#A855F7",
  pink: "#EC4899",
  orange: "#F97316",
  neutral: "#64748B",
} as const;

/** Categorical palette — stable order, used only where categories have no semantic meaning. */
export const CATEGORICAL = [
  C.primary,
  C.info,
  C.warning,
  C.purple,
  C.positive,
  C.pink,
  C.orange,
  "#14B8A6",
  "#84CC16",
  "#8B5CF6",
];

const COMPETITOR_COLORS: Record<string, string> = {
  indihome: C.primary,
  "rt/rw net": C.info,
  "xl home": C.warning,
  myrepublic: C.negative,
  rt: "#8B5CF6",
  rwnet: C.pink,
  "rw net": "#14B8A6",
  "prima home": "#84CC16",
};

export function competitorColor(name: string, index = 0) {
  return COMPETITOR_COLORS[(name || "").trim().toLowerCase()] ?? CATEGORICAL[index % CATEGORICAL.length];
}

export function potensiColor(name: string) {
  const k = (name || "").toLowerCase();
  if (k.startsWith("ting")) return C.positive;
  if (k.startsWith("sed")) return C.warning;
  if (k.startsWith("rend")) return C.negative;
  return C.neutral;
}

/** Threat level: lower is better (green), higher is worse (red). */
export function threatColor(name: string) {
  const k = (name || "").toLowerCase();
  if (k.startsWith("rend")) return C.positive;
  if (k.startsWith("sed")) return C.warning;
  if (k.startsWith("ting")) return C.negative;
  return C.neutral;
}

/* ---------------- Formatters ---------------- */
export function fmtNum(n: number | undefined | null): string {
  const v = Number(n ?? 0);
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}K`;
  return `${sign}${Math.round(abs)}`;
}

function trim(v: number) {
  const s = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
  return s.replace(/\.?0+$/, "");
}

export function fmtFull(n: number | undefined | null): string {
  return Number(n ?? 0).toLocaleString("id-ID");
}

export function fmtRpShort(n: number | undefined | null): string {
  const v = Number(n ?? 0);
  if (!v) return "-";
  return `Rp${fmtNum(v)}`;
}

export function fmtPct(n: number | undefined | null, withSign = false): string {
  const v = Number(n ?? 0);
  const s = withSign && v > 0 ? "+" : "";
  return `${s}${v.toFixed(1)}%`;
}

export function fmtSigned(n: number | undefined | null): string {
  const v = Number(n ?? 0);
  return `${v > 0 ? "+" : ""}${fmtFull(v)}`;
}

export function truncateLabel(value: unknown, max = 20): string {
  const s = String(value ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/* ---------------- Recharts shared props ---------------- */
export const gridProps = {
  stroke: "var(--color-border)",
  strokeDasharray: "3 3",
  strokeOpacity: 0.55,
} as const;

export const axisTick = { fontSize: 11, fill: "var(--color-muted-foreground)" } as const;

export const axisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: { stroke: "var(--color-border)" },
} as const;

export const legendStyle = { fontSize: 12, paddingTop: 8 } as const;

export const hoverCursor = { fill: "var(--color-muted)", fillOpacity: 0.35 } as const;

/* ---------------- Tooltip ---------------- */
export type TipRow = { label: string; value: ReactNode; color?: string; strong?: boolean };

export function TooltipShell({ title, rows }: { title?: ReactNode; rows: TipRow[] }) {
  return (
    <div className="min-w-[180px] rounded-[10px] border border-border bg-popover/95 p-3 text-popover-foreground shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur">
      {title && (
        <div className="mb-2 break-words border-b border-border/70 pb-1.5 text-[12px] font-semibold leading-snug">
          {title}
        </div>
      )}
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {r.color && <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className={`tabular-nums ${r.strong ? "font-bold" : "font-medium"}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Build a Recharts `content` renderer from a payload mapper. */
export function makeTooltip<T = Record<string, unknown>>(
  render: (d: T) => { title?: ReactNode; rows: TipRow[] } | null,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function TooltipContent(props: any) {
    const payload = props?.payload as Array<{ payload?: T }> | undefined;
    const first = payload?.[0]?.payload;
    if (!props?.active || !first) return null;
    const out = render(first);
    if (!out) return null;
    return <TooltipShell title={out.title} rows={out.rows} />;
  };
}

/* ---------------- Chart card shell ---------------- */
export function ChartCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  action,
  footer,
  height = 320,
  className = "",
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  height?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={`glass-card overflow-hidden rounded-2xl border-0 ${className}`}>
      <CardHeader className="gap-3 pb-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="truncate font-display text-[15px] font-semibold leading-tight">{title}</h3>
              {subtitle && <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {badge}
            {action}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-4 sm:px-5">
        <div style={{ height }} aria-label={title} role="img">
          {children}
        </div>
        {footer && (
          <p className="border-t border-border/60 pt-2.5 text-xs leading-relaxed text-muted-foreground">{footer}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Small pill showing a delta with direction. */
export function DeltaBadge({ value, suffix = "%", label }: { value: number; suffix?: string; label?: string }) {
  const up = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
      style={{
        color: up ? C.positive : C.negative,
        background: `${up ? C.positive : C.negative}1f`,
      }}
    >
      {up ? "↑" : "↓"}
      {Math.abs(value).toFixed(1)}
      {suffix}
      {label && <span className="font-medium opacity-80">{label}</span>}
    </span>
  );
}

/* ---------------- Insights ---------------- */
export type Insight = { icon: string; tone: "positive" | "warning" | "negative" | "info" | "neutral"; text: ReactNode };

const TONE: Record<Insight["tone"], string> = {
  positive: C.positive,
  warning: C.warning,
  negative: C.negative,
  info: C.info,
  neutral: C.neutral,
};

export function KeyInsights({ items, title = "Key Insights" }: { items: Insight[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it, i) => (
          <div
            key={i}
            className="glass-card flex items-start gap-3 rounded-2xl p-4"
            style={{ borderLeft: `3px solid ${TONE[it.tone]}` }}
          >
            <span className="text-base leading-none" aria-hidden>
              {it.icon}
            </span>
            <p className="min-w-0 text-[13px] leading-relaxed">{it.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Progress ---------------- */
export function ProgressStat({
  label,
  value,
  total,
  tone = "primary",
}: {
  label: string;
  value: number;
  total: number;
  tone?: "primary" | "positive" | "warning" | "negative";
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const color = { primary: C.primary, positive: C.positive, warning: C.warning, negative: C.negative }[tone];
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <p className="truncate text-[13px] font-medium">{label}</p>
        <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {fmtFull(value)} / {fmtFull(total)}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ---------------- Concentric arc distribution ---------------- */
export type ArcItem = { name: string; value: number; color: string; icon?: string };

/** Semi-circular concentric arcs with a value legend — compact, readable share view. */
export function ArcDistribution({
  items,
  className = "",
  onSelect,
}: {
  items: ArcItem[];
  className?: string;
  onSelect?: (item: ArcItem) => void;
}) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const W = 260;
  const H = 150;
  const cx = W / 2;
  const cy = H - 12;
  const stroke = 13;
  const gap = 9;

  const arc = (r: number, frac: number) => {
    const a0 = Math.PI;
    const a1 = Math.PI + Math.PI * Math.max(0, Math.min(1, frac));
    const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    return `M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}`;
  };

  return (
    <div className={`grid h-full grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto] ${className}`}>
      <div className="min-w-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full max-h-[190px] w-full" role="img" aria-label="Distribusi">
          {items.map((it, i) => {
            const r = (W / 2 - stroke) - i * (stroke + gap - 5);
            const frac = total ? it.value / total : 0;
            return (
              <g key={it.name}>
                <path d={arc(r, 1)} fill="none" stroke="var(--color-muted)" strokeOpacity={0.5} strokeWidth={stroke} strokeLinecap="round" />
                <path d={arc(r, frac)} fill="none" stroke={it.color} strokeWidth={stroke} strokeLinecap="round" />
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.name} className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 text-xs">
            <span className="w-8 text-right font-display text-sm font-bold tabular-nums" style={{ color: it.color }}>
              {fmtFull(it.value)}
            </span>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: it.color }} />
            <span className="truncate font-medium" style={{ color: it.color }}>
              {it.icon ? `${it.icon} ` : ""}
              {it.name}
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              ({total ? Math.round((it.value / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
