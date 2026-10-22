import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, MapPin, User, Building2, Users, Ticket, TrendingDown, TrendingUp, Lightbulb } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataStore, computePriority, recommendStrategy } from "@/lib/store";
import { ChartCard, C, axisProps, gridProps, makeTooltip, fmtFull } from "@/components/chart-kit";
import { MONTH_KEYS, MONTH_LABELS } from "@/lib/prefs";
import { useClusterActions } from "@/hooks/use-cluster-actions";
import { ClusterActionSummary } from "@/components/cluster-action-summary";

export const Route = createFileRoute("/cluster/$name")({
  head: () => ({ meta: [
    { title: "Cluster Detail — MCA Analyst Workspace" },
    { name: "description", content: "Lihat tren HC, ticket, prioritas, dan rekomendasi cluster." },
    { property: "og:title", content: "Cluster Detail — MCA Analyst Workspace" },
    { property: "og:description", content: "Lihat tren HC, ticket, prioritas, dan rekomendasi cluster." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DetailPage,
});

function DetailPage() {
  const { name } = Route.useParams();
  const clusters = useDataStore((s) => s.clusters);
  const decoded = decodeURIComponent(name);
  const actionSummary = useClusterActions(decoded);
  const cluster = clusters.find((c) => c.cluster === decoded);
  const maxTicket = useMemo(() => Math.max(...clusters.map((c) => c.ticket), 1), [clusters]);

  if (!clusters.length) return (<><AppHeader title="Detail Cluster" /><div className="p-6"><EmptyState /></div></>);
  if (!cluster)
    return (
      <>
        <AppHeader title="Detail Cluster" />
        <div className="p-6">
          <Card className="glass-card border-0 p-6 text-center">
            <p className="text-sm text-muted-foreground">Cluster "{decoded}" tidak ditemukan.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/master">Kembali ke Master</Link></Button>
          </Card>
        </div>
      </>
    );

  // Bulan mengikuti data yang tersedia pada file — bulan baru otomatis muncul.
  const monthSeries = MONTH_KEYS.map((k) => ({
    key: k,
    month: MONTH_LABELS[k],
    hc: Number((cluster as unknown as Record<string, unknown>)[k]) || 0,
  }));
  const filledIdx = monthSeries.map((m, i) => (m.hc > 0 ? i : -1)).filter((i) => i >= 0);
  const trend = filledIdx.length ? monthSeries.slice(0, filledIdx[filledIdx.length - 1] + 1) : monthSeries.slice(0, 1);
  const curM = trend[trend.length - 1];
  const prevM = trend.length > 1 ? trend[trend.length - 2] : undefined;
  const hcCur = curM?.hc ?? 0;
  const hcPrev = prevM?.hc ?? 0;

  const hcChangePct = hcPrev > 0 ? ((hcCur - hcPrev) / hcPrev) * 100 : 0;
  const pr = computePriority(cluster, maxTicket);
  const strategy = recommendStrategy(cluster);
  const TrendTip = makeTooltip<(typeof trend)[number]>((d) => ({
    title: d.month,
    rows: [{ label: "HC Aktif", value: fmtFull(d.hc), color: C.primary, strong: true }],
  }));

  const periodLabel = prevM ? `${prevM.month} ke ${curM.month}` : curM?.month ?? "-";
  const insights: string[] = [];
  if (hcChangePct < 0) insights.push(`HC turun ${Math.abs(hcChangePct).toFixed(1)}% dari ${periodLabel}.`);
  else if (hcChangePct > 0) insights.push(`HC tumbuh ${hcChangePct.toFixed(1)}% dari ${periodLabel}.`);
  if (cluster.ticket > 5) insights.push(`Ticket cukup tinggi: ${cluster.ticket} kasus.`);
  if (cluster.totalHC2026 > 0 && hcCur / cluster.totalHC2026 < 0.5)
    insights.push(`Realisasi HC ${((hcCur / cluster.totalHC2026) * 100).toFixed(0)}% dari target 2026 — potensi masih besar.`);
  insights.push(...actionSummary.insights);

  const causes = ["Kompetitor", "Gangguan jaringan", "Kurangnya aktivitas AE"];

  return (
    <>
      <AppHeader title={cluster.cluster} subtitle={`${cluster.kabupaten} · ${cluster.provinsi}`} />
      <div className="space-y-4 p-4 sm:p-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/master"><ArrowLeft className="mr-1 h-4 w-4" /> Kembali</Link>
        </Button>

        {/* Info card */}
        <Card className="glass-card border-0">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MapPin, label: "Kabupaten", value: cluster.kabupaten || "—" },
              { icon: Building2, label: "Provinsi", value: cluster.provinsi || "—" },
              { icon: User, label: "PIC", value: cluster.pic || "—" },
              { icon: Users, label: `HC ${curM?.month ?? "-"}`, value: hcCur.toLocaleString("id-ID") },
              { icon: Ticket, label: "Ticket", value: cluster.ticket },
              { icon: TrendingUp, label: "Total HC 2026", value: cluster.totalHC2026.toLocaleString("id-ID") },
            ].map((it, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary">
                  <it.icon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{it.label}</p>
                  <p className="truncate font-display text-sm font-semibold">{it.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="analytics-grid lg:grid-cols-3">
          <ChartCard title="Trend HC (6 bulan)" subtitle="Pergerakan HC aktif Januari–Juni" height={240} className="lg:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} width={42} />
                  <Tooltip content={TrendTip} />
                  <Line type="monotone" dataKey="hc" stroke={C.primary} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
          </ChartCard>

          <Card className="analytics-card rounded-lg">
            <CardHeader>
              <CardTitle className="font-display text-base">Priority Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <div className="font-display text-5xl font-bold text-gradient">{pr.score}</div>
                <Badge
                  className={`mt-2 ${
                    pr.level === "Tinggi"
                      ? "bg-destructive/15 text-destructive"
                      : pr.level === "Sedang"
                        ? "bg-warning/15 text-warning"
                        : "bg-success/15 text-success"
                  }`}
                >
                  Priority {pr.level}
                </Badge>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Δ HC Aktif</span>
                  <span className={hcChangePct >= 0 ? "text-success" : "text-destructive"}>
                    {hcChangePct >= 0 ? "+" : ""}{hcChangePct.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ticket</span>
                  <span>{cluster.ticket}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Realisasi 2026</span>
                  <span>
                    {cluster.totalHC2026 > 0 ? `${((hcCur / cluster.totalHC2026) * 100).toFixed(0)}%` : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="border-y border-border py-5">
          <ClusterActionSummary summary={actionSummary} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border-0">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Lightbulb className="h-4 w-4 text-warning" />
              <CardTitle className="font-display text-base">Insight Otomatis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {insights.length ? (
                <ul className="list-disc space-y-1 pl-5">
                  {insights.map((i, idx) => <li key={idx}>{i}</li>)}
                </ul>
              ) : (
                <p className="text-muted-foreground">Cluster dalam kondisi stabil.</p>
              )}
              {hcChangePct < 0 && (
                <div>
                  <p className="font-medium">Kemungkinan penyebab:</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {causes.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <TrendingDown className="h-4 w-4 text-primary" />
              <CardTitle className="font-display text-base">Strategi Rekomendasi — {strategy.type}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {strategy.actions.map((a) => (
                  <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                ))}
              </div>
              <ul className="mt-3 list-disc space-y-1 break-words pl-5 text-sm text-muted-foreground">
                {actionSummary.advice.map((a) => <li key={a}>{a}</li>)}
              </ul>
              <Button asChild size="sm" className="mt-4">
                <Link to="/action-plan">Tambah ke Action Plan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
