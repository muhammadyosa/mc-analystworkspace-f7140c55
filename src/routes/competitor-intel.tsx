import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Radar as RadarIcon,
  Search,
  Sparkles,
  ShieldAlert,
  TrendingUp,
  Layers,
  DollarSign,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { useDataStore } from "@/lib/store";
import { useGlobalClusters } from "@/hooks/use-global-filters";
import { usePrefsStore } from "@/lib/prefs";
import { GlobalFilterBar } from "@/components/global-filter";
import type { CompetitorRow, PromoCategory } from "@/lib/excel";
import {
  C,
  CATEGORICAL,
  ChartCard,
  axisProps,
  competitorColor,
  fmtFull,
  fmtNum,
  fmtPct,
  hoverCursor,
  legendStyle,
  makeTooltip,
  truncateLabel,
} from "@/components/chart-kit";

export const Route = createFileRoute("/competitor-intel")({
  head: () => ({
    meta: [{ title: "Competitor Intelligence — MCA Workspace" }],
  }),
  component: CompetitorIntelPage,
});

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#84cc16",
];

function fmtRp(n: number) {
  if (!n) return "-";
  return `Rp${n.toLocaleString("id-ID")}`;
}

function threatFromRows(rows: CompetitorRow[]): { level: "Rendah" | "Sedang" | "Tinggi"; score: number } {
  const count = new Set(rows.map((r) => r.competitor)).size;
  const avgPrice = rows.length
    ? rows.reduce((s, r) => s + (r.price || 0), 0) / rows.length
    : 0;
  const promoCount = new Set(rows.map((r) => r.promoCategory).filter((c) => c !== "Tidak Ada Promo")).size;
  // 0-100 score: 40% competitor density, 30% price aggressiveness (lower price = higher threat), 30% promo variety
  const countScore = Math.min(count / 5, 1) * 100;
  const priceScore = avgPrice > 0 ? Math.max(0, 100 - Math.min((avgPrice / 300000) * 100, 100)) : 40;
  const promoScore = Math.min(promoCount / 4, 1) * 100;
  const score = Math.round(countScore * 0.4 + priceScore * 0.3 + promoScore * 0.3);
  return {
    score,
    level: score >= 71 ? "Tinggi" : score >= 41 ? "Sedang" : "Rendah",
  };
}

function CompetitorIntelPage() {
  const allCompetitor = useDataStore((s) => s.competitorData);
  const { dimRows: clusters } = useGlobalClusters();
  const gf = usePrefsStore((s) => s.filters);
  const [q, setQ] = useState("");

  /** Filter global (provinsi / wilayah / cluster) juga berlaku untuk data kompetitor. */
  const competitorData = useMemo(() => {
    const names = new Set(clusters.map((c) => c.cluster));
    return allCompetitor.filter((r) => {
      if (gf.provinsi !== "all" && (r.provinsi || "N/A") !== gf.provinsi) return false;
      if (gf.kabupaten !== "all" && (r.kabupaten || "N/A") !== gf.kabupaten) return false;
      if (gf.cluster !== "all" && r.cluster !== gf.cluster) return false;
      if (gf.pic !== "all" || gf.kategori !== "all") return names.has(r.cluster);
      return true;
    });
  }, [allCompetitor, clusters, gf]);

  const filtered = useMemo(() => {
    if (!q.trim()) return competitorData;
    const t = q.toLowerCase();
    return competitorData.filter(
      (r) =>
        r.cluster.toLowerCase().includes(t) ||
        r.competitor.toLowerCase().includes(t) ||
        r.kabupaten.toLowerCase().includes(t) ||
        r.provinsi.toLowerCase().includes(t) ||
        r.promo.toLowerCase().includes(t),
    );
  }, [competitorData, q]);

  const stats = useMemo(() => {
    const uniqueClusters = new Set(filtered.map((r) => r.cluster).filter(Boolean));
    const uniqueComp = new Set(filtered.map((r) => r.competitor));
    const prices = filtered.map((r) => r.price).filter((p) => p > 0);
    const promoTypes = new Set(filtered.map((r) => r.promoCategory));
    return {
      clusters: uniqueClusters.size,
      unique: uniqueComp.size,
      appearances: filtered.length,
      priceMin: prices.length ? Math.min(...prices) : 0,
      priceMax: prices.length ? Math.max(...prices) : 0,
      priceAvg: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      promoTypes: promoTypes.size,
    };
  }, [filtered]);

  const topCompetitors = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach((r) => counts.set(r.competitor, (counts.get(r.competitor) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  const clusterPressure = useMemo(() => {
    const grp = new Map<string, number>();
    filtered.forEach((r) => {
      if (!r.cluster) return;
      grp.set(r.cluster, (grp.get(r.cluster) ?? 0) + 1);
    });
    return Array.from(grp.entries())
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 12);
  }, [filtered]);

  const priceByCompetitor = useMemo(() => {
    const grp = new Map<string, number[]>();
    filtered.forEach((r) => {
      if (r.price > 0) {
        if (!grp.has(r.competitor)) grp.set(r.competitor, []);
        grp.get(r.competitor)!.push(r.price);
      }
    });
    return Array.from(grp.entries())
      .map(([name, arr]) => ({
        name,
        min: Math.min(...arr),
        max: Math.max(...arr),
        avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
      }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 10);
  }, [filtered]);

  const promoBreakdown = useMemo(() => {
    const grp = new Map<PromoCategory, number>();
    filtered.forEach((r) => grp.set(r.promoCategory, (grp.get(r.promoCategory) ?? 0) + 1));
    return Array.from(grp.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const heatmap = useMemo(() => {
    // Top kabupaten x top competitors matrix
    const kabCount = new Map<string, number>();
    filtered.forEach((r) => r.kabupaten && kabCount.set(r.kabupaten, (kabCount.get(r.kabupaten) ?? 0) + 1));
    const topKab = Array.from(kabCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k]) => k);
    const topComp = topCompetitors.slice(0, 6).map((c) => c.name);
    const matrix: Record<string, Record<string, number>> = {};
    topKab.forEach((k) => {
      matrix[k] = {};
      topComp.forEach((c) => (matrix[k][c] = 0));
    });
    filtered.forEach((r) => {
      if (matrix[r.kabupaten]?.[r.competitor] !== undefined) matrix[r.kabupaten][r.competitor]++;
    });
    const maxVal = Math.max(1, ...Object.values(matrix).flatMap((row) => Object.values(row)));
    return { topKab, topComp, matrix, maxVal };
  }, [filtered, topCompetitors]);

  const clusterThreats = useMemo(() => {
    const grp = new Map<string, CompetitorRow[]>();
    filtered.forEach((r) => {
      if (!r.cluster) return;
      if (!grp.has(r.cluster)) grp.set(r.cluster, []);
      grp.get(r.cluster)!.push(r);
    });
    return Array.from(grp.entries())
      .map(([cluster, rows]) => ({ cluster, rows, ...threatFromRows(rows) }))
      .sort((a, b) => b.score - a.score);
  }, [filtered]);

  const promoRanked = useMemo(
    () => [...promoBreakdown].sort((a, b) => b.value - a.value).slice(0, 10),
    [promoBreakdown],
  );

  const compTotal = filtered.length || 1;

  const CompTip = makeTooltip<{ name: string; value: number }>((d) => ({
    title: d.name,
    rows: [
      { label: "Kemunculan", value: fmtFull(d.value), color: C.primary, strong: true },
      { label: "Pangsa", value: fmtPct((d.value / compTotal) * 100) },
    ],
  }));

  const ClusterTip = makeTooltip<{ name: string; size: number }>((d) => ({
    title: d.name,
    rows: [
      { label: "Temuan kompetitor", value: fmtFull(d.size), color: C.negative, strong: true },
      { label: "Pangsa", value: fmtPct((d.size / compTotal) * 100) },
    ],
  }));

  const PriceTip = makeTooltip<{ name: string; min: number; avg: number; max: number }>((d) => ({
    title: d.name,
    rows: [
      { label: "Termurah", value: fmtRp(d.min), color: C.positive },
      { label: "Rata-rata", value: fmtRp(d.avg), color: C.primary, strong: true },
      { label: "Tertinggi", value: fmtRp(d.max), color: C.negative },
      { label: "Spread", value: fmtRp(d.max - d.min) },
    ],
  }));

  const PromoTip = makeTooltip<{ name: string; value: number }>((d) => ({
    title: d.name,
    rows: [
      { label: "Jumlah", value: fmtFull(d.value), strong: true },
      { label: "Porsi", value: fmtPct((d.value / compTotal) * 100) },
    ],
  }));

  const aiSummary = useMemo(() => {
    if (!filtered.length) return null;
    const dominant = topCompetitors[0];
    const cheapest = priceByCompetitor[0];
    const highThreat = clusterThreats.filter((c) => c.level === "Tinggi").length;
    const topPromos = [...promoBreakdown]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((p) => p.name)
      .join(", ");
    return {
      dominant: dominant?.name ?? "-",
      cheapest: cheapest?.name ?? "-",
      cheapestPrice: cheapest?.min ?? 0,
      highThreat,
      totalClusters: stats.clusters,
      topPromos,
      priceRange: `${fmtRp(stats.priceMin)} – ${fmtRp(stats.priceMax)}`,
    };
  }, [filtered, topCompetitors, priceByCompetitor, clusterThreats, promoBreakdown, stats]);

  if (!allCompetitor.length) {
    return (
      <>
        <AppHeader title="Competitor Intelligence" subtitle="Analisa persaingan otomatis dari KOMPETITOR.xlsx" />
        <div className="p-6">
          <Card className="glass-card border-0">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary">
                <RadarIcon className="h-7 w-7 text-white" />
              </div>
              <div className="font-display text-lg font-semibold">Belum ada data Competitor</div>
              <div className="max-w-md text-sm text-muted-foreground">
                Upload file KOMPETITOR.xlsx melalui menu Settings → Data Management. Sistem akan
                otomatis mendeteksi dataset berdasarkan struktur kolom.
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const kpis = [
    { label: "Cluster", value: stats.clusters, icon: Layers, color: "text-primary" },
    { label: "Kompetitor Unik", value: stats.unique, icon: RadarIcon, color: "text-info" },
    { label: "Kemunculan", value: stats.appearances, icon: TrendingUp, color: "text-success" },
    { label: "Jenis Promo", value: stats.promoTypes, icon: Sparkles, color: "text-warning" },
    { label: "Harga Min", value: fmtRp(stats.priceMin), icon: DollarSign, color: "text-success" },
    { label: "Harga Rata²", value: fmtRp(stats.priceAvg), icon: DollarSign, color: "text-primary" },
    { label: "Harga Max", value: fmtRp(stats.priceMax), icon: DollarSign, color: "text-destructive" },
  ];

  return (
    <>
      <AppHeader title="Competitor Intelligence" subtitle="Analisa persaingan otomatis dari KOMPETITOR.xlsx" />
      <div className="space-y-6 p-4 md:p-6">
        {/* Search bar */}
        <div className="flex items-center justify-end">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari cluster, kompetitor, kabupaten…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>


      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {kpis.map((k) => (
          <Card key={k.label} className="glass-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                {k.label}
              </div>
              <div className="mt-1 font-display text-lg font-bold">
                {typeof k.value === "number" ? k.value.toLocaleString("id-ID") : k.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <Card className="glass-card border-0">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-base">AI Competitor Analysis</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Executive Summary
                </div>
                <p>
                  Persaingan aktif terpantau di{" "}
                  <b>{aiSummary.totalClusters} cluster</b> dengan{" "}
                  <b>{aiSummary.dominant}</b> sebagai kompetitor paling dominan. Harga bergerak di
                  rentang <b>{aiSummary.priceRange}</b>. Sebanyak{" "}
                  <b className="text-destructive">{aiSummary.highThreat} cluster</b> masuk kategori
                  ancaman tinggi dan perlu prioritas monitoring.
                </p>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Analisis Harga
                </div>
                <p>
                  <b>{aiSummary.cheapest}</b> menawarkan harga paling rendah ({fmtRp(aiSummary.cheapestPrice)}),
                  berpotensi menarik pelanggan sensitif harga. Selisih harga signifikan menandakan
                  peluang penyesuaian tarif atau bundling.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Analisis Promo
                </div>
                <p>
                  Promo paling sering muncul: <b>{aiSummary.topPromos}</b>. Instalasi (gratis/diskon)
                  masih menjadi strategi akuisisi utama.
                </p>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Rekomendasi
                </div>
                <ul className="ml-4 list-disc space-y-0.5">
                  <li>Prioritaskan retensi pada cluster ancaman tinggi</li>
                  <li>Tingkatkan canvassing AE pada cluster dengan &gt;2 kompetitor</li>
                  <li>Evaluasi harga jika kompetitor selisih signifikan</li>
                  <li>Optimalkan bundling / gratis instalasi di area agresif</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          icon={RadarIcon}
          title="Top Kompetitor"
          subtitle="Frekuensi kemunculan di seluruh cluster"
          height={330}
          footer={
            topCompetitors[0]
              ? `${topCompetitors[0].name} paling dominan dengan ${fmtFull(topCompetitors[0].value)} kemunculan (${fmtPct((topCompetitors[0].value / (stats.appearances || 1)) * 100)} dari total).`
              : undefined
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCompetitors} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
              <XAxis type="number" hide domain={[0, (topCompetitors[0]?.value ?? 1) * 1.15]} />
              <YAxis type="category" dataKey="name" {...axisProps} width={132} tickFormatter={(v) => truncateLabel(v, 18)} />
              <Tooltip content={CompTip} cursor={hoverCursor} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false}>
                {topCompetitors.map((c, i) => (
                  <Cell key={i} fill={competitorColor(c.name, i)} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => fmtFull(v)}
                  style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-foreground)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          icon={Layers}
          title="Cluster Paling Kompetitif"
          subtitle="Jumlah temuan kompetitor per cluster (Top 12)"
          height={330}
          footer={
            clusterPressure[0]
              ? `${clusterPressure[0].name} paling padat dengan ${fmtFull(clusterPressure[0].size)} temuan kompetitor.`
              : undefined
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={clusterPressure} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
              <XAxis type="number" hide domain={[0, (clusterPressure[0]?.size ?? 1) * 1.15]} />
              <YAxis type="category" dataKey="name" {...axisProps} width={132} tickFormatter={(v) => truncateLabel(v, 18)} />
              <Tooltip content={ClusterTip} cursor={hoverCursor} />
              <Bar dataKey="size" radius={[0, 6, 6, 0]} barSize={14} isAnimationActive={false}>
                {clusterPressure.map((c, i) => (
                  <Cell key={i} fill={C.negative} fillOpacity={0.4 + 0.6 * (c.size / (clusterPressure[0]?.size || 1))} />
                ))}
                <LabelList
                  dataKey="size"
                  position="right"
                  formatter={(v: number) => fmtFull(v)}
                  style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-foreground)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          icon={DollarSign}
          title="Rentang Harga Kompetitor"
          subtitle="Min · rata-rata · max, diurutkan dari termurah"
          height={330}
          footer={
            priceByCompetitor[0]
              ? `${priceByCompetitor[0].name} paling agresif dengan harga mulai ${fmtRp(priceByCompetitor[0].min)}.`
              : undefined
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priceByCompetitor} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }} barGap={2}>
              <XAxis type="number" {...axisProps} tickFormatter={(v) => `Rp${fmtNum(v as number)}`} />
              <YAxis type="category" dataKey="name" {...axisProps} width={122} tickFormatter={(v) => truncateLabel(v, 16)} />
              <Tooltip content={PriceTip} cursor={hoverCursor} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              <Bar dataKey="min" fill={C.positive} name="Termurah" radius={[0, 3, 3, 0]} barSize={7} isAnimationActive={false} />
              <Bar dataKey="avg" fill={C.primary} name="Rata-rata" radius={[0, 3, 3, 0]} barSize={7} isAnimationActive={false} />
              <Bar dataKey="max" fill={C.negative} name="Tertinggi" radius={[0, 3, 3, 0]} barSize={7} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          icon={Sparkles}
          title="Analisis Promo"
          subtitle="Strategi promo yang paling sering digunakan"
          height={330}
          footer={
            promoRanked[0]
              ? `Promo dominan: ${promoRanked[0].name} (${fmtPct((promoRanked[0].value / (stats.appearances || 1)) * 100)} dari temuan).`
              : undefined
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={promoRanked} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
              <XAxis type="number" hide domain={[0, (promoRanked[0]?.value ?? 1) * 1.15]} />
              <YAxis type="category" dataKey="name" {...axisProps} width={150} tickFormatter={(v) => truncateLabel(v, 22)} />
              <Tooltip content={PromoTip} cursor={hoverCursor} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false}>
                {promoRanked.map((_, i) => (
                  <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => fmtFull(v)}
                  style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-foreground)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>


      {/* Heatmap */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="font-display text-sm">Persebaran Kompetitor (Kabupaten × Kompetitor)</CardTitle>
        </CardHeader>
        <CardContent>
          {heatmap.topKab.length === 0 ? (
            <div className="text-xs text-muted-foreground">Data kabupaten tidak tersedia.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="p-1.5 text-left font-medium">Kabupaten</th>
                    {heatmap.topComp.map((c) => (
                      <th key={c} className="p-1.5 text-center font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.topKab.map((k) => (
                    <tr key={k}>
                      <td className="p-1.5 font-medium">{k}</td>
                      {heatmap.topComp.map((c) => {
                        const v = heatmap.matrix[k][c];
                        const intensity = v / heatmap.maxVal;
                        return (
                          <td key={c} className="p-1 text-center">
                            <div
                              className="mx-auto grid h-9 w-14 place-items-center rounded text-[11px] font-semibold"
                              style={{
                                backgroundColor: `hsl(217, 91%, ${95 - intensity * 55}%)`,
                                color: intensity > 0.5 ? "white" : "hsl(217, 91%, 25%)",
                              }}
                            >
                              {v || ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cluster threat table */}
      <Card className="glass-card border-0">
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <CardTitle className="font-display text-sm">Detail Cluster · Competitor Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Cluster</th>
                  <th className="py-2 pr-3">Kompetitor</th>
                  <th className="py-2 pr-3">Harga</th>
                  <th className="py-2 pr-3">Promo</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2 pr-3">Ancaman</th>
                </tr>
              </thead>
              <tbody>
                {clusterThreats.slice(0, 30).map((c) => (
                  <tr key={c.cluster} className="border-t border-border/50 align-top">
                    <td className="py-2 pr-3 font-medium">{c.cluster}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(c.rows.map((r) => r.competitor))).map((n) => (
                          <Badge key={n} variant="outline" className="text-[10px]">
                            {n}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      {(() => {
                        const p = c.rows.map((r) => r.price).filter((v) => v > 0);
                        if (!p.length) return "-";
                        return `${fmtRp(Math.min(...p))} – ${fmtRp(Math.max(...p))}`;
                      })()}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(c.rows.map((r) => r.promoCategory))).map((p) => (
                          <span
                            key={p}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-3 font-mono font-semibold">{c.score}</td>
                    <td className="py-2 pr-3">
                      <Badge
                        className={
                          c.level === "Tinggi"
                            ? "bg-destructive/15 text-destructive"
                            : c.level === "Sedang"
                              ? "bg-warning/15 text-warning"
                              : "bg-success/15 text-success"
                        }
                        variant="outline"
                      >
                        {c.level === "Tinggi" ? "🔴" : c.level === "Sedang" ? "🟡" : "🟢"} {c.level}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Score = jumlah kompetitor (40%) + harga (30%) + variasi promo (30%) · Terhubung dengan{" "}
            {clusters.length.toLocaleString("id-ID")} cluster master
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
