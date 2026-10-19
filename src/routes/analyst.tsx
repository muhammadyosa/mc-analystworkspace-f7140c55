import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { Users, Target, TrendingUp, Award, Sparkles, ExternalLink, AlertTriangle, MapPin, Search, X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { useDataStore } from "@/lib/store";
import { latestClusterAssessments, potentialCategory, summarizePotential } from "@/lib/cluster-potential";
import { DrilldownDialog, type DrilldownState } from "@/components/drilldown-dialog";

const AnalystCharts = lazy(() => import("@/components/analyst-charts"));

export const Route = createFileRoute("/analyst")({
  head: () => ({ meta: [
    { title: "Analyst Market — MCA Analyst Workspace" },
    { name: "description", content: "Analisis profiling, potensi cluster aktual, dan kompetitor MCA Analyst Workspace." },
    { property: "og:title", content: "Analyst Market — MCA Analyst Workspace" },
    { property: "og:description", content: "Analisis profiling, potensi cluster aktual, dan kompetitor MCA Analyst Workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AnalystPage,
});

function ChartFallback() {
  return (
    <div className="analytics-grid lg:grid-cols-12">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`analytics-card h-64 animate-pulse rounded-lg ${i < 2 ? (i === 0 ? "lg:col-span-8" : "lg:col-span-4") : "lg:col-span-6"}`} />
      ))}
    </div>
  );
}

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "accent";
const TONE: Record<Tone, { grad: string; text: string; ring: string }> = {
  primary: { grad: "from-indigo-500 to-blue-500", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-500/20" },
  success: { grad: "from-emerald-500 to-teal-500", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  warning: { grad: "from-amber-500 to-orange-500", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20" },
  danger:  { grad: "from-rose-500 to-red-500",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20" },
  info:    { grad: "from-cyan-500 to-sky-500",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500/20" },
  accent:  { grad: "from-fuchsia-500 to-purple-500", text: "text-fuchsia-600 dark:text-fuchsia-400", ring: "ring-fuchsia-500/20" },
};

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  hint?: string;
  tone?: Tone;
  onClick?: () => void;
}) {
  const t = TONE[tone];
  const Comp = onClick ? "button" : "div";
  return (
    <Card className={`analytics-card rounded-lg ring-1 ${t.ring} ${onClick ? "cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/20" : ""}`}>
      <Comp onClick={onClick} className="block w-full text-left">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${t.text}`}>{value}</div>
              {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
            </div>
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br ${t.grad}`}>
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

  // ---------- Filter Bar ----------
  const [q, setQ] = useState("");
  const [fAE, setFAE] = useState("");
  const [fPic, setFPic] = useState("");
  const [fPotensi, setFPotensi] = useState("");
  const [fSegment, setFSegment] = useState("");
  const [fProv, setFProv] = useState("");

  // Map cluster→PIC/Provinsi from cluster master
  const clusterMeta = useMemo(() => {
    const m = new Map<string, { pic: string; provinsi: string; kabupaten: string }>();
    clusters.forEach((c) => {
      if (c.cluster) m.set(c.cluster.toLowerCase(), { pic: c.pic || "", provinsi: c.provinsi || "", kabupaten: c.kabupaten || "" });
    });
    return m;
  }, [clusters]);

  const countBy = (get: (a: (typeof analyst)[number]) => string | undefined) => {
    const m = new Map<string, number>();
    analyst.forEach((a) => {
      const v = (get(a) || "").trim();
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    });
    return Array.from(m.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
  };
  const aeOptions = useMemo(() => countBy((a) => a.aeName), [analyst]);
  const picOptions = useMemo(() => countBy((a) => clusterMeta.get(a.cluster.toLowerCase())?.pic), [analyst, clusterMeta]);
  const segOptions = useMemo(() => countBy((a) => a.customerSegment), [analyst]);
  const provOptions = useMemo(() => countBy((a) => clusterMeta.get(a.cluster.toLowerCase())?.provinsi), [analyst, clusterMeta]);
  const compOptions = useMemo(() => {
    const m = new Map<string, number>();
    analyst.forEach((a) => a.competitor.split(/[,;/]/).map((s) => s.trim()).filter(Boolean).forEach((c) => m.set(c, (m.get(c) ?? 0) + 1)));
    return Array.from(m.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
  }, [analyst]);
  const assessments = useMemo(() => latestClusterAssessments(analyst), [analyst]);
  const potensiCounts = useMemo(() => summarizePotential(assessments), [assessments]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return analyst.filter((a) => {
      const meta = clusterMeta.get(a.cluster.toLowerCase());
      if (fAE && a.aeName !== fAE) return false;
      if (fPic && meta?.pic !== fPic) return false;
      if (fPotensi && potentialCategory(a.potential) !== fPotensi) return false;
      if (fSegment && a.customerSegment !== fSegment) return false;
      if (fProv && meta?.provinsi !== fProv) return false;
      if (!s) return true;
      return (
        a.cluster.toLowerCase().includes(s) ||
        a.aeName.toLowerCase().includes(s) ||
        a.competitor.toLowerCase().includes(s) ||
        (meta?.pic || "").toLowerCase().includes(s) ||
        (a.aeInsight || "").toLowerCase().includes(s)
      );
    });
  }, [analyst, clusterMeta, q, fAE, fPic, fPotensi, fSegment, fProv]);

  const potentialRows = useMemo(() => {
    const included = new Set(filtered);
    return assessments.filter((row) => included.has(row));
  }, [assessments, filtered]);

  const hasFilter = q || fAE || fPic || fPotensi || fSegment || fProv;
  const resetFilters = () => { setQ(""); setFAE(""); setFPic(""); setFPotensi(""); setFSegment(""); setFProv(""); };

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const ae = new Set(filtered.map((a) => a.aeName).filter(Boolean));
    const profCluster = new Set(filtered.map((a) => a.cluster).filter(Boolean));
    const closeWon = filtered.reduce((s, a) => s + a.closewonToday, 0);
    const sfmi = filtered.reduce((s, a) => s + a.sfToday, 0);
    const potensi = summarizePotential(potentialRows);
    const fatRelocation = filtered.filter((a) => /ya|perlu|butuh/i.test(a.fatRelocation)).length;
    const toolkitNeed = filtered.filter((a) => /ya|butuh/i.test(a.toolkitRequest)).length;

    const compMap = new Map<string, number>();
    const priceMap = new Map<string, number[]>();
    const promoMap = new Map<string, number>();
    const segMap = new Map<string, number>();
    const strategyMap = new Map<string, number>();
    const dayaBeliMap = new Map<string, number>();
    filtered.forEach((a) => {
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
      totalProfiling: filtered.length,
      totalAE: ae.size,
      profCluster: profCluster.size,
      closeWon, sfmi,
      totalCompetitor: compMap.size,
      potensi, fatRelocation, toolkitNeed,
      topCompetitors, promos, segments, strategies, dayaBeli,
    };
  }, [filtered, potentialRows]);

  // Pembagian wilayah per PIC (dari master cluster)
  const regionByPic = useMemo(() => {
    const m = new Map<string, { pic: string; clusters: Set<string>; provinces: Set<string>; kab: Set<string>; profiling: number; closeWon: number }>();
    filtered.forEach((a) => {
      const meta = clusterMeta.get(a.cluster.toLowerCase());
      const pic = meta?.pic || "N/A";
      const cur = m.get(pic) ?? { pic, clusters: new Set(), provinces: new Set(), kab: new Set(), profiling: 0, closeWon: 0 };
      if (a.cluster) cur.clusters.add(a.cluster);
      if (meta?.provinsi) cur.provinces.add(meta.provinsi);
      if (meta?.kabupaten) cur.kab.add(meta.kabupaten);
      cur.profiling += 1;
      cur.closeWon += a.closewonToday;
      m.set(pic, cur);
    });
    return Array.from(m.values())
      .map((v) => ({ pic: v.pic, clusters: v.clusters.size, provinces: Array.from(v.provinces).join(", ") || "-", kab: v.kab.size, profiling: v.profiling, closeWon: v.closeWon }))
      .sort((a, b) => b.profiling - a.profiling);
  }, [filtered, clusterMeta]);

  const profilingPct = useMemo(() => {
    if (!stats || !clusters.length) return 0;
    return Math.round((stats.profCluster / clusters.length) * 100);
  }, [stats, clusters]);

  const aiInsight = useMemo(() => {
    if (!stats) return "";
    const topComp = stats.topCompetitors[0];
    const topSeg = stats.segments.sort((a, b) => b.value - a.value)[0];
    const topStrat = stats.strategies[0];
    return `Terdapat ${stats.totalProfiling} profiling dari ${stats.totalAE} AE mencakup ${stats.profCluster} cluster. Kompetitor dominan: ${topComp?.name ?? "-"}${topComp?.avgPrice ? ` (rata-rata Rp${topComp.avgPrice.toLocaleString("id-ID")})` : ""}. Segmen mayoritas: ${topSeg?.name ?? "-"}. Strategi paling banyak: ${topStrat?.name ?? "-"}. ${stats.fatRelocation} cluster perlu relokasi FAT, ${stats.toolkitNeed} minta toolkit. Potensi Tinggi: ${stats.potensi.tinggi} · Sedang: ${stats.potensi.sedang} · Rendah: ${stats.potensi.rendah}.`;
  }, [stats]);

  const [drill, setDrill] = useState<DrilldownState>(null);
  const [detailFilter, setDetailFilter] = useState("");
  const [detailPotensi, setDetailPotensi] = useState("");
  const [detailAE, setDetailAE] = useState("");
  const [detailPic, setDetailPic] = useState("");
  const [detailSeg, setDetailSeg] = useState("");
  const [detailComp, setDetailComp] = useState("");
  const [detailSort, setDetailSort] = useState("cluster");

  if (!analyst.length) {
    return (
      <>
        <AppHeader title="Analyst Market" subtitle="Dashboard hasil profiling AE" />
        <div className="p-6">
          <EmptyState
            title="Belum ada data profiling"
            desc="Upload file ANALYST MARKET.xlsx (sheet HASIL PROFILING) di Settings → Data Management."
          />
        </div>
      </>
    );
  }

  const analystCols = [
    { key: "cluster", label: "Cluster" },
    { key: "aeName", label: "AE" },
    { key: "competitor", label: "Kompetitor" },
    { key: "potential", label: "Potensi" },
    { key: "customerSegment", label: "Segmen" },
    {
      key: "competitorPrice",
      label: "Harga",
      align: "right" as const,
      format: (v: unknown) => (Number(v) > 0 ? `Rp${Number(v).toLocaleString("id-ID")}` : "—"),
    },
  ];

  const openAll = (title: string, subset?: typeof filtered, description?: string) => {
    const rows = (subset ?? filtered) as unknown as Record<string, unknown>[];
    setDrill({ title, description, columns: analystCols, rows });
  };

  const openPot = (kind: "tinggi" | "sedang" | "rendah") => {
    const rows = potentialRows.filter((a) => potentialCategory(a.potential) === kind);
    openAll(`Potensi ${kind[0].toUpperCase()}${kind.slice(1)}`, rows);
  };

  const s = stats;

  return (
    <>
      <AppHeader title="Analyst Market" subtitle="Executive dashboard profiling & kompetitor" />
      <div className="space-y-5 p-4 sm:p-6">
        {/* FILTER BAR */}
        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari cluster / AE / PIC / kompetitor…" className="h-8 pl-8" />
              </div>
              <div className="scroll-x -mx-3 px-3 sm:mx-0 sm:px-0 sm:contents">
                <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
                  <FilterSelect value={fAE} onChange={setFAE} placeholder="Semua AE" options={aeOptions} />
                  <FilterSelect value={fPic} onChange={setFPic} placeholder="Semua PIC" options={picOptions} />
                  <FilterSelect value={fProv} onChange={setFProv} placeholder="Semua Provinsi" options={provOptions} />
                  <FilterSelect value={fSegment} onChange={setFSegment} placeholder="Semua Segmen" options={segOptions} />
                  <select value={fPotensi} onChange={(e) => setFPotensi(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium">
                    <option value="">Semua Potensi ({potensiCounts.tinggi + potensiCounts.sedang + potensiCounts.rendah})</option>
                    <option value="tinggi">Tinggi ({potensiCounts.tinggi})</option>
                    <option value="sedang">Sedang ({potensiCounts.sedang})</option>
                    <option value="rendah">Rendah ({potensiCounts.rendah})</option>
                  </select>
                  {hasFilter && (
                    <Button size="sm" variant="ghost" className="h-8" onClick={resetFilters}>
                      <X className="mr-1 h-3 w-3" /> Reset
                    </Button>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground sm:ml-auto">{filtered.length} dari {analyst.length} profiling</span>
            </div>
          </CardContent>
        </Card>

        {!s ? (
          <EmptyState title="Tidak ada data pada filter ini" desc="Coba reset filter untuk melihat seluruh data." />
        ) : (
        <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <KpiCard tone="primary" label="Total Profiling" value={s.totalProfiling} icon={Target} onClick={() => openAll("Semua Profiling")} />
          <KpiCard tone="info" label="Total AE" value={s.totalAE} icon={Users} onClick={() => openAll("Data per AE")} />
          <KpiCard tone="accent" label="Cluster Profiled" value={s.profCluster} icon={Award} hint={`${profilingPct}% coverage`} onClick={() => openAll("Cluster Terprofil")} />
          <KpiCard tone="success" label="Close Won" value={s.closeWon} icon={TrendingUp} hint={`${filtered.filter((a) => a.closewonToday > 0).length} record`} onClick={() => openAll("Close Won > 0", filtered.filter((a) => a.closewonToday > 0))} />
          <KpiCard tone="success" label="SF/MI" value={s.sfmi} icon={TrendingUp} hint={`${filtered.filter((a) => a.sfToday > 0).length} record`} onClick={() => openAll("SF/MI > 0", filtered.filter((a) => a.sfToday > 0))} />
          <KpiCard tone="accent" label="Kompetitor Unik" value={s.totalCompetitor} icon={Sparkles} onClick={() => openAll("Semua Kompetitor")} />
          <KpiCard tone="success" label="Potensi Tinggi" value={s.potensi.tinggi} icon={Target} onClick={() => openPot("tinggi")} />
          <KpiCard tone="warning" label="Potensi Sedang" value={s.potensi.sedang} icon={Target} onClick={() => openPot("sedang")} />
          <KpiCard tone="danger" label="Potensi Rendah" value={s.potensi.rendah} icon={Target} onClick={() => openPot("rendah")} />
          <KpiCard tone="info" label="Potensi Belum Terisi" value={s.potensi.unknown} icon={AlertTriangle} hint="perlu dilengkapi AE" onClick={() => openAll("Potensi Belum Terisi", potentialRows.filter((a) => !potentialCategory(a.potential)))} />

          <KpiCard tone="danger" label="FAT Perlu Relokasi" value={s.fatRelocation} icon={AlertTriangle} onClick={() => openAll("FAT Perlu Relokasi", filtered.filter((a) => /ya|perlu|butuh/i.test(a.fatRelocation)))} />
          <KpiCard tone="warning" label="Butuh Toolkit" value={s.toolkitNeed} icon={AlertTriangle} onClick={() => openAll("Butuh Toolkit", filtered.filter((a) => /ya|butuh/i.test(a.toolkitRequest)))} />
          <KpiCard tone="primary" label="Coverage" value={`${profilingPct}%`} icon={Award} hint={`${s.profCluster}/${clusters.length} cluster`} onClick={() => openAll("Cluster Terprofil")} />
        </div>

        <Card className="glass-card border-0 border-l-4 border-l-primary">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-base">AI Insight — Ringkasan Analyst Market</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/80">{aiInsight}</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="charts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="charts">Visualisasi</TabsTrigger>
            <TabsTrigger value="detail">Detail Profiling</TabsTrigger>
            <TabsTrigger value="wilayah"><MapPin className="mr-1 h-3.5 w-3.5" /> Pembagian Wilayah PIC</TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="mt-0">
            <Suspense fallback={<ChartFallback />}>
              <AnalystCharts
                stats={s}
                onSelect={(kind, d) => {
                  const name = (d.name as string) || "";
                  if (kind === "competitor") openAll(`Kompetitor — ${name}`, filtered.filter((a) => a.competitor.toLowerCase().includes(name.toLowerCase())));
                  else if (kind === "potensi") {
                    const k = name.toLowerCase() as "tinggi" | "sedang" | "rendah";
                    openPot(k);
                  } else if (kind === "promo") openAll(`Promo — ${name}`, filtered.filter((a) => a.competitorPromo === name));
                  else if (kind === "segment") openAll(`Segmen — ${name}`, filtered.filter((a) => a.customerSegment === name));
                  else if (kind === "strategy") openAll(`Strategi — ${name}`, filtered.filter((a) => a.marketingStrategy.toLowerCase().includes(name.toLowerCase())));
                  else if (kind === "dayaBeli") openAll(`Daya Beli — ${name}`, filtered.filter((a) => a.purchasingPower === name));
                }}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="detail" className="mt-0">
            <Card className="glass-card border-0">
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="font-display text-base">Detail Profiling per Cluster</CardTitle>
                  <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="flex min-w-max flex-wrap gap-2 sm:min-w-0">
                      <Input placeholder="Cari cluster / AE / kompetitor…" value={detailFilter} onChange={(e) => setDetailFilter(e.target.value)} className="h-8 w-48" />
                      <FilterSelect value={detailAE} onChange={setDetailAE} placeholder="Semua AE" options={aeOptions} />
                      <FilterSelect value={detailPic} onChange={setDetailPic} placeholder="Semua PIC" options={picOptions} />
                      <FilterSelect value={detailSeg} onChange={setDetailSeg} placeholder="Semua Segmen" options={segOptions} />
                      <FilterSelect value={detailComp} onChange={setDetailComp} placeholder="Semua Kompetitor" options={compOptions} />
                      <select value={detailPotensi} onChange={(e) => setDetailPotensi(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium">
                        <option value="">Semua Potensi ({potensiCounts.tinggi + potensiCounts.sedang + potensiCounts.rendah})</option>
                        <option value="tinggi">Tinggi ({potensiCounts.tinggi})</option>
                        <option value="sedang">Sedang ({potensiCounts.sedang})</option>
                        <option value="rendah">Rendah ({potensiCounts.rendah})</option>
                      </select>
                      <select value={detailSort} onChange={(e) => setDetailSort(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium">
                        <option value="cluster">Urut: Cluster A-Z</option>
                        <option value="ae">Urut: AE A-Z</option>
                        <option value="closewon">Urut: Close Won ↓</option>
                        <option value="harga">Urut: Harga Kompetitor ↓</option>
                      </select>
                      {(detailFilter || detailAE || detailPic || detailSeg || detailComp || detailPotensi) && (
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => { setDetailFilter(""); setDetailAE(""); setDetailPic(""); setDetailSeg(""); setDetailComp(""); setDetailPotensi(""); }}>
                          <X className="mr-1 h-3 w-3" /> Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const q2 = detailFilter.trim().toLowerCase();
                  const list = filtered.filter((a) => {
                    if (q2 && !(a.cluster.toLowerCase().includes(q2) || a.aeName.toLowerCase().includes(q2) || a.competitor.toLowerCase().includes(q2))) return false;
                    if (detailAE && a.aeName !== detailAE) return false;
                    if (detailPic && (clusterMeta.get(a.cluster.toLowerCase())?.pic || "") !== detailPic) return false;
                    if (detailSeg && a.customerSegment !== detailSeg) return false;
                    if (detailComp && !a.competitor.toLowerCase().includes(detailComp.toLowerCase())) return false;
                    if (detailPotensi && potentialCategory(a.potential) !== detailPotensi) return false;
                    return true;
                  }).sort((x, y) => {
                    if (detailSort === "ae") return (x.aeName || "").localeCompare(y.aeName || "");
                    if (detailSort === "closewon") return y.closewonToday - x.closewonToday;
                    if (detailSort === "harga") return y.competitorPrice - x.competitorPrice;
                    return (x.cluster || "").localeCompare(y.cluster || "");
                  });
                  return (
                    <>
                      <div className="mb-2 text-xs text-muted-foreground">{list.length} profiling</div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {list.map((a) => {
                          const category = potentialCategory(a.potential);
                          const potColor = category === "tinggi" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : category === "sedang" ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : category === "rendah" ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400" : "border-border bg-muted text-muted-foreground";
                          return (
                            <div key={a.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs transition hover:shadow-md">
                              <div className="flex items-center justify-between">
                                <div className="font-display text-sm font-semibold truncate">{a.cluster || "—"}</div>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${potColor}`}>{a.potential || "—"}</span>
                              </div>
                              <div className="mt-1 text-muted-foreground">AE: <span className="text-foreground/80">{a.aeName || "—"}</span></div>
                              <div className="mt-2 space-y-1">
                                <div><span className="text-muted-foreground">Kompetitor:</span> {a.competitor || "—"}</div>
                                <div><span className="text-muted-foreground">Harga:</span> {a.competitorPrice ? `Rp${a.competitorPrice.toLocaleString("id-ID")}` : "—"} · <span className="text-muted-foreground">Promo:</span> {a.competitorPromo || "—"}</div>
                                <div><span className="text-muted-foreground">Segmen:</span> {a.customerSegment || "—"} · <span className="text-muted-foreground">Daya beli:</span> {a.purchasingPower || "—"}</div>
                                <div><span className="text-muted-foreground">Strategi Produk:</span> {a.productStrategy || "—"}</div>
                                <div><span className="text-muted-foreground">Strategi Pemasaran:</span> {a.marketingStrategy || "—"}</div>
                                <div><span className="text-muted-foreground">SF/MI hari ini:</span> {a.sfToday} · <span className="text-muted-foreground">Close Won:</span> {a.closewonToday} · <span className="text-muted-foreground">Total SF/MI:</span> {a.sfTotal}</div>
                                <div><span className="text-muted-foreground">Kondisi Cluster:</span> {a.clusterCondition || "—"}</div>
                                <div><span className="text-muted-foreground">Relokasi FAT:</span> {a.fatRelocation || "—"} · <span className="text-muted-foreground">Toolkit:</span> {a.toolkitStatus || "—"}</div>
                                <div><span className="text-muted-foreground">Mitra:</span> {a.partner || "—"} {a.partnerName ? `(${a.partnerName})` : ""}</div>
                                <div><span className="text-muted-foreground">Prioritas berikutnya:</span> {a.nextPriority || "—"}</div>
                                {a.complaint && <div><span className="text-muted-foreground">Keluhan:</span> {a.complaint}</div>}
                                {a.aeInsight && <div className="mt-1 rounded-md bg-primary/10 p-2 text-[11px] italic">"{a.aeInsight}"</div>}
                                {a.profilingDate && <div className="text-[10px] text-muted-foreground">Tanggal profiling: {a.profilingDate}</div>}
                              </div>
                              {a.evidence && /^https?:\/\//.test(a.evidence) && (
                                <Button size="sm" variant="outline" className="mt-2 h-7 text-[11px]" asChild>
                                  <a href={a.evidence} target="_blank" rel="noreferrer">
                                    <ExternalLink className="mr-1 h-3 w-3" /> Open Evidence
                                  </a>
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        {!list.length && <div className="col-span-full py-8 text-center text-sm text-muted-foreground">Tidak ada data pada filter ini.</div>}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wilayah" className="mt-0">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="font-display text-base">Pembagian Wilayah berdasarkan PIC</CardTitle>
              </CardHeader>
              <CardContent>
                {regionByPic.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Tidak ada data.</div>
                ) : (
                  <div className="scroll-x">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="p-2 text-left">PIC</th>
                          <th className="p-2 text-left">Provinsi</th>
                          <th className="p-2 text-right">Kabupaten</th>
                          <th className="p-2 text-right">Cluster</th>
                          <th className="p-2 text-right">Profiling</th>
                          <th className="p-2 text-right">Close Won</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regionByPic.map((r) => (
                          <tr key={r.pic} className="border-t border-border/40 cursor-pointer hover:bg-muted/30" onClick={() => openAll(`Profiling — PIC ${r.pic}`, filtered.filter((a) => (clusterMeta.get(a.cluster.toLowerCase())?.pic || "N/A") === r.pic))}>
                            <td className="p-2 font-semibold">{r.pic}</td>
                            <td className="p-2 text-muted-foreground">{r.provinces}</td>
                            <td className="p-2 text-right tabular-nums">{r.kab}</td>
                            <td className="p-2 text-right tabular-nums">{r.clusters}</td>
                            <td className="p-2 text-right tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">{r.profiling}</td>
                            <td className="p-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{r.closeWon}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>
      <DrilldownDialog state={drill} onClose={() => setDrill(null)} />
    </>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; count: number }[] }) {
  const total = options.reduce((a, b) => a + b.count, 0);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 max-w-[190px] shrink-0 rounded-md border border-input bg-background px-2 text-xs font-medium">
      <option value="">{placeholder} ({total})</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.value} ({o.count})</option>)}
    </select>
  );
}
