import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useMemo } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Ticket,
  MapPin,
  Building2,
  AlertTriangle,
  Target,
  Sparkles,
  Activity,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataStore, computePriority } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MCA Workspace" },
      { name: "description", content: "Dashboard executive: HC, ticket, growth, dan prioritas cluster." },
    ],
  }),
  component: Dashboard,
});

const MONTHS = ["januari", "februari", "maret", "april", "mei", "juni"] as const;
const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"];

const KpiCard = memo(function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tint = "primary",
}: {
  label: string;
  value: string | number;
  delta?: { value: number; suffix?: string };
  icon: React.ComponentType<{ className?: string }>;
  tint?: "primary" | "success" | "warning" | "info" | "destructive";
}) {
  const tintMap: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 text-primary",
    success: "from-success/20 to-success/5 text-success",
    warning: "from-warning/20 to-warning/5 text-warning",
    info: "from-info/20 to-info/5 text-info",
    destructive: "from-destructive/20 to-destructive/5 text-destructive",
  };
  return (
    <div className="glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">{value}</p>
          {delta !== undefined && (
            <div
              className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                delta.value >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {delta.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta.value >= 0 ? "+" : ""}
              {delta.value.toFixed(1)}
              {delta.suffix ?? "%"}
            </div>
          )}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tintMap[tint]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
});


function Dashboard() {
  const clusters = useDataStore((s) => s.clusters);
  const actions = useDataStore((s) => s.actions);

  const stats = useMemo(() => {
    if (!clusters.length) return null;
    const totalCluster = clusters.length;
    const totalKab = new Set(clusters.map((c) => c.kabupaten).filter(Boolean)).size;
    const totalProv = new Set(clusters.map((c) => c.provinsi).filter(Boolean)).size;
    const sumJun = clusters.reduce((a, c) => a + c.juni, 0);
    const sumMei = clusters.reduce((a, c) => a + c.mei, 0);
    const hcGrowth = sumMei > 0 ? ((sumJun - sumMei) / sumMei) * 100 : 0;
    const totalTicket = clusters.reduce((a, c) => a + c.ticket, 0);
    const prevTicket = totalTicket * 0.9;
    const ticketGrowth = ((totalTicket - prevTicket) / prevTicket) * 100;
    const maxTicket = Math.max(...clusters.map((c) => c.ticket), 1);
    const priorities = clusters.map((c) => ({ ...c, ...computePriority(c, maxTicket) }));
    const highRisk = priorities.filter((p) => p.level === "Tinggi").length;
    const highPriority = priorities.filter((p) => p.level === "Tinggi").length;

    const trend = MONTHS.map((m, i) => ({
      month: MONTH_LABEL[i],
      hc: clusters.reduce((a, c) => a + (c[m] as number), 0),
    }));

    const topHc = [...clusters].sort((a, b) => b.juni - a.juni).slice(0, 10);
    const growth = [...clusters]
      .filter((c) => c.deltaMeiJuni !== 0)
      .sort((a, b) => Math.abs(b.deltaMeiJuni) - Math.abs(a.deltaMeiJuni))
      .slice(0, 12);
    const topTicket = [...clusters].sort((a, b) => b.ticket - a.ticket).slice(0, 8);

    const provMap = new Map<string, number>();
    clusters.forEach((c) => provMap.set(c.provinsi || "N/A", (provMap.get(c.provinsi || "N/A") ?? 0) + c.juni));
    const provDist = [...provMap.entries()].map(([name, value]) => ({ name, value }));

    const picMap = new Map<string, { pic: string; hc: number; ticket: number; clusters: number; growth: number }>();
    clusters.forEach((c) => {
      const key = c.pic || "N/A";
      const cur = picMap.get(key) ?? { pic: key, hc: 0, ticket: 0, clusters: 0, growth: 0 };
      cur.hc += c.juni;
      cur.ticket += c.ticket;
      cur.clusters += 1;
      cur.growth += c.deltaMeiJuni;
      picMap.set(key, cur);
    });
    const pics = [...picMap.values()].sort((a, b) => b.hc - a.hc).slice(0, 8);

    const declines = [...clusters].sort((a, b) => a.deltaMeiJuni - b.deltaMeiJuni).slice(0, 3);
    const risingTicket = [...clusters].sort((a, b) => b.ticket - a.ticket).slice(0, 3);

    return {
      totalCluster,
      totalKab,
      totalProv,
      sumJun,
      sumMei,
      hcGrowth,
      totalTicket,
      ticketGrowth,
      highRisk,
      highPriority,
      trend,
      topHc,
      growth,
      topTicket,
      provDist,
      pics,
      declines,
      risingTicket,
    };
  }, [clusters]);

  if (!clusters.length) {
    return (
      <>
        <AppHeader title="Dashboard" subtitle="Executive Overview" />
        <div className="p-4 sm:p-6">
          <EmptyState />
        </div>
      </>
    );
  }

  const s = stats!;
  const chartColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
  const actionActive = actions.filter((a) => a.status === "onprogress").length;
  const actionDone = actions.filter((a) => a.status === "done").length;

  return (
    <>
      <AppHeader title="Dashboard" subtitle="Executive Overview — Cluster Intelligence" />
      <div className="space-y-6 p-4 sm:p-6">
        {/* KPI Row 1 - Cluster */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
          <KpiCard label="Total Cluster" value={s.totalCluster} icon={Target} tint="primary" />
          <KpiCard label="Total Kabupaten" value={s.totalKab} icon={MapPin} tint="info" />
          <KpiCard label="Total Provinsi" value={s.totalProv} icon={Building2} tint="info" />
          <KpiCard label="Total HC (Juni)" value={s.sumJun.toLocaleString("id-ID")} icon={Users} tint="success" delta={{ value: s.hcGrowth }} />
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="HC Bulan Ini" value={s.sumJun.toLocaleString("id-ID")} icon={Activity} tint="success" />
          <KpiCard label="HC Bulan Lalu" value={s.sumMei.toLocaleString("id-ID")} icon={Activity} tint="info" />
          <KpiCard label="Total Ticket" value={s.totalTicket.toLocaleString("id-ID")} icon={Ticket} tint="warning" delta={{ value: s.ticketGrowth }} />
          <KpiCard label="High Risk Cluster" value={s.highRisk} icon={AlertTriangle} tint="destructive" />
        </div>

        {/* KPI Row 3 - Progress */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <KpiCard label="Cluster Prioritas" value={s.highPriority} icon={Target} tint="warning" />
          <KpiCard label="Action Plan Aktif" value={actionActive} icon={Activity} tint="info" />
          <KpiCard label="Cycle Completed" value={actionDone} icon={TrendingUp} tint="success" />
        </div>

        {/* Executive Summary */}
        <div className="animate-in fade-in duration-500">
          <Card className="glass-card border-0 overflow-hidden">
            <div className="absolute inset-0 gradient-primary opacity-[0.03] pointer-events-none" />
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="font-display text-base">Executive Summary AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                HC {s.hcGrowth >= 0 ? "tumbuh" : "turun"}{" "}
                <span className={s.hcGrowth >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
                  {s.hcGrowth >= 0 ? "+" : ""}
                  {s.hcGrowth.toFixed(1)}%
                </span>{" "}
                dibanding bulan sebelumnya ({s.sumMei.toLocaleString("id-ID")} → {s.sumJun.toLocaleString("id-ID")}).
              </p>
              <div>
                <p className="font-medium">Cluster dengan penurunan terbesar:</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {s.declines.map((d) => (
                    <li key={d.id}>
                      {d.cluster} ({d.deltaMeiJuni})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Ticket tertinggi:</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {s.risingTicket.map((d) => (
                    <li key={d.id}>
                      {d.cluster} — {d.ticket} ticket
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Fokus minggu ini:</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="secondary">Retention Program</Badge>
                  <Badge variant="secondary">Site Visit</Badge>
                  <Badge variant="secondary">Analisa Kompetitor</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="font-display text-base">HC Trend (Jan–Jun)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="hc" stroke="var(--color-chart-1)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="font-display text-base">Top 10 HC Cluster</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.topHc} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis type="category" dataKey="cluster" stroke="var(--color-muted-foreground)" fontSize={11} width={90} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="juni" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="font-display text-base">HC Growth (Delta Mei–Juni)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="cluster" stroke="var(--color-muted-foreground)" fontSize={10} angle={-30} textAnchor="end" height={60} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="deltaMeiJuni" radius={[6, 6, 0, 0]}>
                    {s.growth.map((g, i) => (
                      <Cell key={i} fill={g.deltaMeiJuni >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="font-display text-base">Ticket Analysis (Top 8)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.topTicket}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="cluster" stroke="var(--color-muted-foreground)" fontSize={10} angle={-30} textAnchor="end" height={60} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="ticket" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="font-display text-base">Province Distribution (HC)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={s.provDist} dataKey="value" nameKey="name" outerRadius={90} label>
                    {s.provDist.map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="font-display text-base">PIC Performance (Top 8)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {s.pics.map((p, i) => (
                  <div key={p.pic} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full gradient-primary text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.pic}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.clusters} cluster • {p.ticket} ticket
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-sm font-bold tabular-nums">{p.hc.toLocaleString("id-ID")}</div>
                      <div className={`text-[10px] ${p.growth >= 0 ? "text-success" : "text-destructive"}`}>
                        {p.growth >= 0 ? "+" : ""}
                        {p.growth}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Butuh detail cluster?{" "}
          <Link to="/master" className="text-primary hover:underline">
            Buka Master Cluster
          </Link>
        </div>
      </div>
    </>
  );
}
