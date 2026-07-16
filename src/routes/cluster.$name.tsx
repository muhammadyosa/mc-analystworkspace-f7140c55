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

export const Route = createFileRoute("/cluster/$name")({
  head: () => ({ meta: [{ title: "Cluster Detail — MCA Workspace" }] }),
  component: DetailPage,
});

function DetailPage() {
  const { name } = Route.useParams();
  const clusters = useDataStore((s) => s.clusters);
  const decoded = decodeURIComponent(name);
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

  const trend = [
    { month: "Jan", hc: cluster.januari },
    { month: "Feb", hc: cluster.februari },
    { month: "Mar", hc: cluster.maret },
    { month: "Apr", hc: cluster.april },
    { month: "Mei", hc: cluster.mei },
    { month: "Jun", hc: cluster.juni },
  ];

  const hcChangePct = cluster.mei > 0 ? ((cluster.juni - cluster.mei) / cluster.mei) * 100 : 0;
  const pr = computePriority(cluster, maxTicket);
  const strategy = recommendStrategy(cluster);

  const insights: string[] = [];
  if (hcChangePct < 0) insights.push(`HC turun ${Math.abs(hcChangePct).toFixed(1)}% dari Mei ke Juni.`);
  else if (hcChangePct > 0) insights.push(`HC tumbuh ${hcChangePct.toFixed(1)}% dari Mei ke Juni.`);
  if (cluster.ticket > 5) insights.push(`Ticket cukup tinggi: ${cluster.ticket} kasus.`);
  if (cluster.totalHC2026 > 0 && cluster.juni / cluster.totalHC2026 < 0.5)
    insights.push(`Realisasi HC ${((cluster.juni / cluster.totalHC2026) * 100).toFixed(0)}% dari target 2026 — potensi masih besar.`);

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
              { icon: Users, label: "HC Juni", value: cluster.juni.toLocaleString("id-ID") },
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

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="glass-card border-0 lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-base">Trend HC (6 bulan)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="hc" stroke="var(--color-chart-1)" strokeWidth={3} dot={{ r: 5 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
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
                  <span className="text-muted-foreground">Δ HC (Mei–Jun)</span>
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
                    {cluster.totalHC2026 > 0 ? `${((cluster.juni / cluster.totalHC2026) * 100).toFixed(0)}%` : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
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
