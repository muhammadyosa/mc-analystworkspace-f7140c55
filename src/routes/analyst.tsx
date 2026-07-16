import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { Users, Target, TrendingUp, Award, Sparkles, ExternalLink, AlertTriangle } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { useDataStore } from "@/lib/store";
import { DrilldownDialog, type DrilldownState } from "@/components/drilldown-dialog";

const AnalystCharts = lazy(() => import("@/components/analyst-charts"));

export const Route = createFileRoute("/analyst")({
  head: () => ({ meta: [{ title: "Analyst Market — MCA Workspace" }] }),
  component: AnalystPage,
});

function ChartFallback() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card h-72 animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  hint?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Card className={`glass-card border-0 ${onClick ? "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:border-primary/40" : ""}`}>
      <Comp onClick={onClick} className="block w-full text-left">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</div>
              {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
              <Icon className="h-4 w-4 text-white" />
            </div>
          </div>
        </CardContent>
      </Comp>
    </Card>
  );
}

function AnalystPage() {
  const analyst = useDataStore((s) => s.analyst);
  const clusters = useDataStore((s) => s.clusters);

  const stats = useMemo(() => {
    if (!analyst.length) return null;
    const ae = new Set(analyst.map((a) => a.aeName).filter(Boolean));
    const profCluster = new Set(analyst.map((a) => a.cluster).filter(Boolean));
    const closeWon = analyst.reduce((s, a) => s + a.closewonToday, 0);
    const sfmi = analyst.reduce((s, a) => s + a.sfToday, 0);
    const potensi = analyst.reduce(
      (acc, a) => {
        const p = a.potential.toLowerCase();
        if (p.includes("tinggi") || p.includes("potensial")) acc.tinggi++;
        else if (p.includes("sedang")) acc.sedang++;
        else if (p) acc.rendah++;
        return acc;
      },
      { tinggi: 0, sedang: 0, rendah: 0 },
    );
    const fatRelocation = analyst.filter((a) => /ya|perlu|butuh/i.test(a.fatRelocation)).length;
    const toolkitNeed = analyst.filter((a) => /ya|butuh/i.test(a.toolkitRequest)).length;

    // competitor breakdown
    const compMap = new Map<string, number>();
    const priceMap = new Map<string, number[]>();
    const promoMap = new Map<string, number>();
    const segMap = new Map<string, number>();
    const strategyMap = new Map<string, number>();
    const dayaBeliMap = new Map<string, number>();
    analyst.forEach((a) => {
      a.competitor.split(/[,;/]/).map((s) => s.trim()).filter(Boolean).forEach((c) => {
        compMap.set(c, (compMap.get(c) ?? 0) + 1);
        if (a.competitorPrice > 0) {
          const arr = priceMap.get(c) ?? [];
          arr.push(a.competitorPrice);
          priceMap.set(c, arr);
        }
      });
      if (a.competitorPromo) promoMap.set(a.competitorPromo, (promoMap.get(a.competitorPromo) ?? 0) + 1);
      if (a.customerSegment) segMap.set(a.customerSegment, (segMap.get(a.customerSegment) ?? 0) + 1);
      a.marketingStrategy.split(/[,;/]/).map((s) => s.trim()).filter(Boolean).forEach((st) => {
        strategyMap.set(st, (strategyMap.get(st) ?? 0) + 1);
      });
      if (a.purchasingPower) dayaBeliMap.set(a.purchasingPower, (dayaBeliMap.get(a.purchasingPower) ?? 0) + 1);
    });

    const topCompetitors = Array.from(compMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        avgPrice: priceMap.has(name) ? Math.round(priceMap.get(name)!.reduce((a, b) => a + b, 0) / priceMap.get(name)!.length) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const promos = Array.from(promoMap.entries()).map(([name, value]) => ({ name, value }));
    const segments = Array.from(segMap.entries()).map(([name, value]) => ({ name, value }));
    const strategies = Array.from(strategyMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    const dayaBeli = Array.from(dayaBeliMap.entries()).map(([name, value]) => ({ name, value }));

    return {
      totalProfiling: analyst.length,
      totalAE: ae.size,
      profCluster: profCluster.size,
      closeWon,
      sfmi,
      totalCompetitor: compMap.size,
      potensi,
      fatRelocation,
      toolkitNeed,
      topCompetitors,
      promos,
      segments,
      strategies,
      dayaBeli,
    };
  }, [analyst]);

  const profilingPct = useMemo(() => {
    if (!stats || !clusters.length) return 0;
    return Math.round((stats.profCluster / clusters.length) * 100);
  }, [stats, clusters]);

  const aiInsight = useMemo(() => {
    if (!stats) return "";
    const topComp = stats.topCompetitors[0];
    const topSeg = stats.segments.sort((a, b) => b.value - a.value)[0];
    const topStrat = stats.strategies[0];
    return `Terdapat ${stats.totalProfiling} profiling dari ${stats.totalAE} AE mencakup ${stats.profCluster} cluster. Kompetitor dominan: ${topComp?.name ?? "-"}${topComp?.avgPrice ? ` (rata-rata Rp${topComp.avgPrice.toLocaleString("id-ID")})` : ""}. Segmen mayoritas: ${topSeg?.name ?? "-"}. Strategi paling banyak diterapkan: ${topStrat?.name ?? "-"}. ${stats.fatRelocation} cluster memerlukan relokasi FAT dan ${stats.toolkitNeed} cluster meminta penambahan toolkit. Potensi tinggi: ${stats.potensi.tinggi}, sedang: ${stats.potensi.sedang}, rendah: ${stats.potensi.rendah}.`;
  }, [stats]);

  if (!analyst.length) {
    return (
      <>
        <AppHeader title="Analyst Market" subtitle="Dashboard hasil profiling AE" />
        <div className="p-6">
          <EmptyState
            title="Belum ada data profiling"
            desc="Upload file ANALYST MARKET.xlsx (sheet HASIL PROFILING) di Data Management."
          />
        </div>
      </>
    );
  }

  const s = stats!;


  return (
    <>
      <AppHeader title="Analyst Market" subtitle="Executive dashboard profiling & kompetitor" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <KpiCard label="Total Profiling" value={s.totalProfiling} icon={Target} />
          <KpiCard label="Total AE" value={s.totalAE} icon={Users} />
          <KpiCard label="Cluster Profiled" value={`${s.profCluster}`} icon={Award} hint={`${profilingPct}% coverage`} />
          <KpiCard label="Close Won" value={s.closeWon} icon={TrendingUp} />
          <KpiCard label="SF/MI" value={s.sfmi} icon={TrendingUp} />
          <KpiCard label="Kompetitor" value={s.totalCompetitor} icon={Sparkles} />
          <KpiCard label="Potensi Tinggi" value={s.potensi.tinggi} icon={Target} />
          <KpiCard label="Potensi Sedang" value={s.potensi.sedang} icon={Target} />
          <KpiCard label="Potensi Rendah" value={s.potensi.rendah} icon={Target} />
          <KpiCard label="FAT Perlu Relokasi" value={s.fatRelocation} icon={AlertTriangle} />
          <KpiCard label="Butuh Toolkit" value={s.toolkitNeed} icon={AlertTriangle} />
          <KpiCard label="Profiling Coverage" value={`${profilingPct}%`} icon={Award} />
        </div>

        <Card className="glass-card border-0">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-base">AI Insight — Ringkasan Analyst Market</CardTitle>
          </CardHeader>
          <CardContent>

            <p className="text-sm leading-relaxed text-muted-foreground">{aiInsight}</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="charts" className="space-y-4">

          <TabsList>
            <TabsTrigger value="charts">Visualisasi</TabsTrigger>
            <TabsTrigger value="detail">Detail Profiling</TabsTrigger>
          </TabsList>
          <TabsContent value="charts" className="mt-0">
            <Suspense fallback={<ChartFallback />}>
              <AnalystCharts stats={s} />
            </Suspense>
          </TabsContent>
          <TabsContent value="detail" className="mt-0">
            <Card className="glass-card border-0">
              <CardHeader><CardTitle className="font-display text-base">Detail Profiling per Cluster</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {analyst.slice(0, 12).map((a) => (
                    <div key={a.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="font-display text-sm font-semibold">{a.cluster || "—"}</div>
                        <Badge variant={/tinggi|potensial/i.test(a.potential) ? "default" : /sedang/i.test(a.potential) ? "secondary" : "outline"}>
                          {a.potential || "—"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-muted-foreground">AE: {a.aeName || "—"}</div>
                      <div className="mt-2 space-y-1">
                        <div><span className="text-muted-foreground">Kompetitor:</span> {a.competitor || "—"}</div>
                        <div><span className="text-muted-foreground">Harga:</span> {a.competitorPrice ? `Rp${a.competitorPrice.toLocaleString("id-ID")}` : "—"}</div>
                        <div><span className="text-muted-foreground">Segmen:</span> {a.customerSegment || "—"} · <span className="text-muted-foreground">Daya beli:</span> {a.purchasingPower || "—"}</div>
                        <div><span className="text-muted-foreground">SF/MI:</span> {a.sfToday} · <span className="text-muted-foreground">Close Won:</span> {a.closewonToday}</div>
                        {a.aeInsight && <div className="mt-1 rounded-md bg-primary/10 p-2 text-[11px] italic">"{a.aeInsight}"</div>}
                      </div>
                      {a.evidence && /^https?:\/\//.test(a.evidence) && (
                        <Button size="sm" variant="outline" className="mt-2 h-7 text-[11px]" asChild>
                          <a href={a.evidence} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1 h-3 w-3" /> Open Evidence
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {analyst.length > 12 && (
                  <div className="mt-3 text-center text-xs text-muted-foreground">
                    Menampilkan 12 dari {analyst.length} hasil profiling
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </>
  );
}
