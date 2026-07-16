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
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { useDataStore } from "@/lib/store";
import type { CompetitorRow, PromoCategory } from "@/lib/excel";

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

function TreemapCell(props: any) {
  const { x, y, width, height, index, name } = props;
  const color = COLORS[(index ?? 0) % COLORS.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} opacity={0.85} />
      {width > 50 && height > 20 && (
        <text x={x + 6} y={y + 16} fill="#fff" fontSize={10}>
          {name}
        </text>
      )}
    </g>
  );
}

function CompetitorIntelPage() {
  const competitorData = useDataStore((s) => s.competitorData);
  const clusters = useDataStore((s) => s.clusters);
  const [q, setQ] = useState("");

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

  const treemap = useMemo(() => {
    const grp = new Map<string, number>();
    filtered.forEach((r) => {
      if (!r.cluster) return;
      grp.set(r.cluster, (grp.get(r.cluster) ?? 0) + 1);
    });
    return Array.from(grp.entries())
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 30);
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

  const aiSummary = useMemo(() => {
    if (!filtered.length) return null;
    const dominant = topCompetitors[0];
    const cheapest = priceByCompetitor[0];
    const highThreat = clusterThreats.filter((c) => c.level === "Tinggi").length;
    const topPromos = promoBreakdown
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

  if (!competitorData.length) {
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
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="font-display text-sm">Top Competitor (kemunculan)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={topCompetitors} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={90} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {topCompetitors.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="font-display text-sm">Distribusi Kompetitor per Cluster</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <Treemap
                data={treemap}
                dataKey="size"
                stroke="#fff"
                fill="#6366f1"
                content={<TreemapCell />}
              />
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="font-display text-sm">Harga Kompetitor (min · rata² · max)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={priceByCompetitor}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={10} angle={-25} textAnchor="end" height={60} />
                <YAxis fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => fmtRp(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="min" fill="#22c55e" name="Min" />
                <Bar dataKey="avg" fill="#6366f1" name="Rata²" />
                <Bar dataKey="max" fill="#ef4444" name="Max" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="font-display text-sm">Analisis Promo</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={promoBreakdown}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={(e: any) => e.name}
                  labelLine={false}
                >
                  {promoBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
  );
}
