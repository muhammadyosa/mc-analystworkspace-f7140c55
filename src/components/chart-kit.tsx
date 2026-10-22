import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/* ---------------- Semantic data palette ---------------- */
export const C = {
  primary: "var(--color-chart-1)",
  primaryLight: "color-mix(in oklab, var(--color-chart-1) 68%, var(--color-card))",
  positive: "var(--color-success)",
  positiveLight: "color-mix(in oklab, var(--color-success) 72%, var(--color-card))",
  positiveDark: "color-mix(in oklab, var(--color-success) 78%, var(--color-foreground))",
  warning: "var(--color-warning)",
  negative: "var(--color-destructive)",
  info: "var(--color-info)",
  purple: "var(--color-chart-5)",
  pink: "color-mix(in oklab, var(--color-chart-5) 72%, var(--color-destructive))",
  orange: "var(--color-chart-3)",
  neutral: "var(--color-muted-foreground)",
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
  "color-mix(in oklab, var(--color-chart-2) 70%, var(--color-info))",
  "color-mix(in oklab, var(--color-chart-2) 70%, var(--color-warning))",
  "color-mix(in oklab, var(--color-chart-5) 70%, var(--color-primary))",
];

const COMPETITOR_COLORS: Record<string, string> = {
  indihome: C.primary,
  "rt/rw net": C.info,
  "xl home": C.warning,
  myrepublic: C.negative,
  rt: C.purple,
  rwnet: C.pink,
  "rw net": C.positiveLight,
  "prima home": C.positiveDark,
};

export function competitorColor(name: string, index = 0) {
  return (
    COMPETITOR_COLORS[(name || "").trim().toLowerCase()] ?? CATEGORICAL[index % CATEGORICAL.length]
  );
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
  strokeDasharray: "3 4",
  strokeOpacity: 0.65,
  vertical: false,
} as const;

export const axisTick = {
  fontSize: 10,
  fontWeight: 500,
  fill: "var(--color-muted-foreground)",
} as const;

export const axisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: false,
} as const;

export const legendStyle = {
  fontSize: 11,
  paddingTop: 6,
  color: "var(--color-muted-foreground)",
} as const;

export const hoverCursor = { fill: "var(--color-muted)", fillOpacity: 0.35 } as const;

/* ---------------- Tooltip ---------------- */
export type TipRow = { label: string; value: ReactNode; color?: string; strong?: boolean };

export function TooltipShell({ title, rows }: { title?: ReactNode; rows: TipRow[] }) {
  return (
    <div className="min-w-[168px] max-w-[260px] rounded-lg border border-border bg-popover/95 p-2.5 text-popover-foreground shadow-[var(--shadow-glass)] backdrop-blur">
      {title && (
        <div className="mb-2 break-words border-b border-border/70 pb-1.5 font-display text-[11px] font-semibold leading-snug">
          {title}
        </div>
      )}
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {r.color && (
                <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: r.color }} />
              )}
              {r.label}
            </span>
            <span className={`tabular-nums ${r.strong ? "font-bold" : "font-medium"}`}>
              {r.value}
            </span>
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
  height = 260,
  className = "",
  frameClassName = "",
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
  frameClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card className={`analytics-card lazy-block rounded-lg ${className}`}>
      <CardHeader className="gap-2 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-display text-[13px] font-semibold leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="mt-0.5 line-clamp-2 text-[11px] font-normal leading-snug text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {badge}
            {action}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 px-2.5 pb-3 pt-3 sm:px-4">
        <div
          className={`chart-frame ${frameClassName}`}
          style={height > 0 ? { height } : undefined}
          aria-label={title}
          role="img"
        >
          {children}
        </div>
        {footer && (
          <p className="border-t border-border/60 px-1 pt-2 text-[11px] leading-relaxed text-muted-foreground">
            {footer}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Small pill showing a delta with direction. */
export function DeltaBadge({
  value,
  suffix = "%",
  label,
}: {
  value: number;
  suffix?: string;
  label?: string;
}) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
    >
      {up ? "↑" : "↓"}
      {Math.abs(value).toFixed(1)}
      {suffix}
      {label && <span className="font-medium opacity-80">{label}</span>}
    </span>
  );
}

/* ---------------- Insights ---------------- */
export type Insight = {
  icon: string;
  tone: "positive" | "warning" | "negative" | "info" | "neutral";
  text: ReactNode;
};

const TONE: Record<Insight["tone"], string> = {
  positive: C.positive,
  warning: C.warning,
  negative: C.negative,
  info: C.info,
  neutral: C.neutral,
};

export function KeyInsights({
  items,
  title = "Key Insights",
}: {
  items: Insight[];
  title?: string;
}) {
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
  const color = {
    primary: C.primary,
    positive: C.positive,
    warning: C.warning,
    negative: C.negative,
  }[tone];
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
    const p = (a: number) =>
      `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    return `M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}`;
  };

  return (
    <div
      className={`grid h-full min-h-0 grid-cols-1 content-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.85fr)] sm:items-center sm:gap-5 ${className}`}
    >
      <div className="min-h-0 min-w-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto max-h-[170px] w-full max-w-[360px]"
          role="img"
          aria-label="Distribusi"
        >
          {items.map((it, i) => {
            const r = W / 2 - stroke - i * (stroke + gap - 5);
            const frac = total ? it.value / total : 0;
            return (
              <g key={it.name}>
                <path
                  d={arc(r, 1)}
                  fill="none"
                  stroke="var(--color-muted)"
                  strokeOpacity={0.5}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
                <path
                  d={arc(r, frac)}
                  fill="none"
                  stroke={it.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="min-h-0 space-y-1 overflow-y-auto pr-1 sm:max-h-[220px]">
        {items.map((it) => (
          <li key={it.name}>
            <button
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(it)}
              className={`grid w-full grid-cols-[minmax(4.5rem,auto)_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs ${
                onSelect ? "cursor-pointer transition-colors hover:bg-muted/60" : ""
              }`}
            >
              <span
                className="text-right font-display text-sm font-bold tabular-nums"
                style={{ color: it.color }}
              >
                {fmtFull(it.value)}
              </span>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: it.color }}
              />
              <span
                className="min-w-0 break-words font-medium leading-tight"
                style={{ color: it.color }}
              >
                {it.icon ? `${it.icon} ` : ""}
                {it.name}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                ({total ? Math.round((it.value / total) * 100) : 0}%)
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
