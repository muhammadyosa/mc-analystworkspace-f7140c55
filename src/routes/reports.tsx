import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { Printer, FileText, Calendar, Radar as RadarIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore } from "@/lib/store";
import type { CompetitorRow, PromoCategory } from "@/lib/excel";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — MCA Workspace" }] }),
  component: ReportsPage,
});

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16"];

function fmtRp(n: number) {
  if (!n) return "-";
  return `Rp${n.toLocaleString("id-ID")}`;
}

function threatScore(rows: CompetitorRow[]): number {
  const count = new Set(rows.map((r) => r.competitor)).size;
  const avgPrice = rows.length ? rows.reduce((s, r) => s + (r.price || 0), 0) / rows.length : 0;
  const promoCount = new Set(rows.map((r) => r.promoCategory).filter((c) => c !== "Tidak Ada Promo")).size;
  const countScore = Math.min(count / 5, 1) * 100;
  const priceScore = avgPrice > 0 ? Math.max(0, 100 - Math.min((avgPrice / 300000) * 100, 100)) : 40;
  const promoScore = Math.min(promoCount / 4, 1) * 100;
  return Math.round(countScore * 0.4 + priceScore * 0.3 + promoScore * 0.3);
}

function ReportsPage() {
  const clusters = useDataStore((s) => s.clusters);
  const actions = useDataStore((s) => s.actions);
  const competitorData = useDataStore((s) => s.competitorData);
  const weeklyRef = useRef<HTMLDivElement>(null);
  const monthlyRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (!clusters.length) return null;
    const monthKeys: Array<keyof typeof clusters[number]> = [
      "januari", "februari", "maret", "april", "mei", "juni",
    ] as const;
    const monthLabel = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"];
    const hcTrend = monthKeys.map((k, i) => ({
      bulan: monthLabel[i],
      hc: clusters.reduce((a, c) => a + (Number(c[k]) || 0), 0),
    }));
    const sumJun = hcTrend[5].hc;
    const sumMei = hcTrend[4].hc;
    const growth = sumMei > 0 ? ((sumJun - sumMei) / sumMei) * 100 : 0;
    const topGrowth = [...clusters].sort((a, b) => b.deltaMeiJuni - a.deltaMeiJuni).slice(0, 5);
    const topDecline = [...clusters].sort((a, b) => a.deltaMeiJuni - b.deltaMeiJuni).slice(0, 5);
    const totalTicket = clusters.reduce((a, c) => a + c.ticket, 0);
    const running = actions.filter((a) => a.status === "onprogress").length;
    const done = actions.filter((a) => a.status === "done").length;
    const belum = actions.filter((a) => a.status === "belum").length;
    const actionStatus = [
      { name: "Belum", value: belum },
      { name: "On Progress", value: running },
      { name: "Done", value: done },
    ];
    const topHC = [...clusters].sort((a, b) => b.juni - a.juni).slice(0, 8)
      .map((c) => ({ cluster: c.cluster, hc: c.juni }));
    const topTicket = [...clusters].sort((a, b) => b.ticket - a.ticket).slice(0, 8)
      .map((c) => ({ cluster: c.cluster, ticket: c.ticket }));
    // PIC performance: sum HC per PIC
    const picMap = new Map<string, { hc: number; ticket: number }>();
    clusters.forEach((c) => {
      const pic = c.pic || "-";
      const cur = picMap.get(pic) ?? { hc: 0, ticket: 0 };
      cur.hc += c.juni;
      cur.ticket += c.ticket;
      picMap.set(pic, cur);
    });
    const picPerf = Array.from(picMap.entries())
      .map(([pic, v]) => ({ pic, ...v }))
      .sort((a, b) => b.hc - a.hc)
      .slice(0, 8);
    return {
      sumJun, sumMei, growth, topGrowth, topDecline, totalTicket, running, done, belum,
      hcTrend, actionStatus, topHC, topTicket, picPerf,
    };
  }, [clusters, actions]);

  // Competitor Intelligence-derived charts
  const compCharts = useMemo(() => {
    if (!competitorData.length) return null;
    const compCount = new Map<string, number>();
    const promoCount = new Map<PromoCategory, number>();
    const priceByComp = new Map<string, number[]>();
    const clusterGroup = new Map<string, CompetitorRow[]>();
    competitorData.forEach((r) => {
      compCount.set(r.competitor, (compCount.get(r.competitor) ?? 0) + 1);
      promoCount.set(r.promoCategory, (promoCount.get(r.promoCategory) ?? 0) + 1);
      if (r.price > 0) {
        if (!priceByComp.has(r.competitor)) priceByComp.set(r.competitor, []);
        priceByComp.get(r.competitor)!.push(r.price);
      }
      if (r.cluster) {
        if (!clusterGroup.has(r.cluster)) clusterGroup.set(r.cluster, []);
        clusterGroup.get(r.cluster)!.push(r);
      }
    });

    const topCompetitors = Array.from(compCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const promoBreakdown = Array.from(promoCount.entries()).map(([name, value]) => ({ name, value }));

    const priceRange = Array.from(priceByComp.entries())
      .map(([name, arr]) => ({
        name,
        min: Math.min(...arr),
        avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        max: Math.max(...arr),
      }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 8);

    const threats = Array.from(clusterGroup.entries()).map(([cluster, rows]) => ({
      cluster,
      score: threatScore(rows),
    }));
    const threatBuckets = [
      { name: "Rendah", value: threats.filter((t) => t.score < 41).length },
      { name: "Sedang", value: threats.filter((t) => t.score >= 41 && t.score < 71).length },
      { name: "Tinggi", value: threats.filter((t) => t.score >= 71).length },
    ];
    const topThreats = [...threats].sort((a, b) => b.score - a.score).slice(0, 8);

    return {
      totalCompetitors: compCount.size,
      totalClusters: clusterGroup.size,
      highThreat: threatBuckets[2].value,
      dominant: topCompetitors[0]?.name ?? "-",
      topCompetitors,
      promoBreakdown,
      priceRange,
      threatBuckets,
      topThreats,
    };
  }, [competitorData]);

  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const w = window.open("", "", "width=900,height=1200");
    if (!w) return;
    w.document.write(`<html><head><title>Report</title><style>
      body{font-family:-apple-system,sans-serif;padding:32px;color:#111}
      h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 8px;border-bottom:2px solid #333;padding-bottom:4px}
      ul{margin:0;padding-left:20px} li{margin:4px 0} .kpi{display:inline-block;margin-right:24px}
      .label{font-size:11px;color:#666;text-transform:uppercase} .value{font-size:20px;font-weight:700}
      </style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (!clusters.length) return (<><AppHeader title="Reports" /><div className="p-6"><EmptyState /></div></>);
  const s = stats!;

  return (
    <>
      <AppHeader title="Reports" subtitle="Weekly & Monthly report + Competitor Intelligence charts" />
      <div className="space-y-4 p-4 sm:p-6">
        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly"><Calendar className="mr-1 h-4 w-4" /> Weekly</TabsTrigger>
            <TabsTrigger value="monthly"><FileText className="mr-1 h-4 w-4" /> Monthly</TabsTrigger>
            <TabsTrigger value="intel"><RadarIcon className="mr-1 h-4 w-4" /> Competitor Intel</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-4">
            <Card className="glass-card border-0">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display text-base">Weekly Report</CardTitle>
                <Button size="sm" onClick={() => handlePrint(weeklyRef)}><Printer className="mr-1 h-4 w-4" /> Export PDF</Button>
              </CardHeader>
              <CardContent>
                <div ref={weeklyRef} className="space-y-4 text-sm">
                  <div>
                    <h1 className="font-display text-xl font-bold">Weekly Executive Report</h1>
                    <p className="text-muted-foreground">Periode: minggu berjalan</p>
                  </div>
                  <div>
                    <div className="kpi inline-block mr-6"><div className="label text-[10px] uppercase text-muted-foreground">Total HC</div><div className="value font-display text-lg font-bold">{s.sumJun.toLocaleString("id-ID")}</div></div>
                    <div className="kpi inline-block mr-6"><div className="label text-[10px] uppercase text-muted-foreground">Growth</div><div className="value font-display text-lg font-bold">{s.growth.toFixed(1)}%</div></div>
                    <div className="kpi inline-block"><div className="label text-[10px] uppercase text-muted-foreground">Ticket</div><div className="value font-display text-lg font-bold">{s.totalTicket}</div></div>
                  </div>
                  <div><h2 className="font-semibold">Executive Summary</h2><p>HC {s.growth >= 0 ? "tumbuh" : "turun"} {s.growth.toFixed(1)}% dari periode sebelumnya. {s.running} action plan sedang berjalan, {s.done} program telah selesai.</p></div>
                  <div><h2 className="font-semibold">Top Growth Cluster</h2><ul>{s.topGrowth.map((c) => <li key={c.id}>{c.cluster} (+{c.deltaMeiJuni})</li>)}</ul></div>
                  <div><h2 className="font-semibold">Top Decline Cluster</h2><ul>{s.topDecline.map((c) => <li key={c.id}>{c.cluster} ({c.deltaMeiJuni})</li>)}</ul></div>
                  <div><h2 className="font-semibold">Program Berjalan</h2><ul>{actions.filter((a) => a.status === "onprogress").map((a) => <li key={a.id}>{a.cluster} — {a.program}</li>)}{!actions.filter((a) => a.status === "onprogress").length && <li>Tidak ada</li>}</ul></div>
                  <div><h2 className="font-semibold">Rencana Minggu Depan</h2><ul><li>Retention Program di cluster decline</li><li>Site Visit ke high-risk cluster</li><li>Analisa kompetitor</li></ul></div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="glass-card border-0">
                <CardHeader><CardTitle className="font-display text-sm">Tren HC 6 Bulan Terakhir</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer>
                    <AreaChart data={s.hcTrend}>
                      <defs>
                        <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bulan" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} />
                      <Tooltip formatter={(v: number) => v.toLocaleString("id-ID")} />
                      <Area type="monotone" dataKey="hc" stroke="#6366f1" strokeWidth={2} fill="url(#hcGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-card border-0">
                <CardHeader><CardTitle className="font-display text-sm">Status Action Plan</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={s.actionStatus} dataKey="value" nameKey="name" outerRadius={90}
                        label={(e: any) => `${e.name}: ${e.value}`} labelLine={false}>
                        {s.actionStatus.map((_, i) => (
                          <Cell key={i} fill={["#94a3b8", "#f59e0b", "#22c55e"][i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-card border-0">
                <CardHeader><CardTitle className="font-display text-sm">Top 8 Cluster Growth (Mei → Jun)</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={s.topGrowth.concat(s.topDecline).slice(0, 8).map((c) => ({ cluster: c.cluster, delta: c.deltaMeiJuni }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="cluster" fontSize={10} angle={-25} textAnchor="end" height={70} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="delta" radius={[6, 6, 0, 0]}>
                        {s.topGrowth.concat(s.topDecline).slice(0, 8).map((c, i) => (
                          <Cell key={i} fill={c.deltaMeiJuni >= 0 ? "#22c55e" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-card border-0">
                <CardHeader><CardTitle className="font-display text-sm">Top Cluster berdasarkan Ticket</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={s.topTicket} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={10} />
                      <YAxis type="category" dataKey="cluster" fontSize={10} width={100} />
                      <Tooltip />
                      <Bar dataKey="ticket" fill="#ef4444" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card border-0">
              <CardHeader><CardTitle className="font-display text-sm">Analisa Mingguan</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• HC minggu ini <b>{s.sumJun.toLocaleString("id-ID")}</b> ({s.growth >= 0 ? "naik" : "turun"} <b>{Math.abs(s.growth).toFixed(1)}%</b> dari Mei). Momentum ini harus dijaga lewat program retensi di top decline cluster.</p>
                <p>• Cluster paling agresif tumbuh: <b>{s.topGrowth[0]?.cluster ?? "-"}</b> (+{s.topGrowth[0]?.deltaMeiJuni ?? 0}). Replikasi strategi ke cluster serupa.</p>
                <p>• Ticket menumpuk pada <b>{s.topTicket[0]?.cluster ?? "-"}</b> ({s.topTicket[0]?.ticket ?? 0} tiket). Perlu quick-win perbaikan layanan minggu ini.</p>
                <p>• Action plan aktif <b>{s.running}</b>, selesai <b>{s.done}</b>. Rasio penyelesaian {s.done + s.running > 0 ? Math.round((s.done / (s.done + s.running)) * 100) : 0}%.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <Card className="glass-card border-0">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display text-base">Monthly Report</CardTitle>
                <Button size="sm" onClick={() => handlePrint(monthlyRef)}><Printer className="mr-1 h-4 w-4" /> Export PDF</Button>
              </CardHeader>
              <CardContent>
                <div ref={monthlyRef} className="space-y-4 text-sm">
                  <div>
                    <h1 className="font-display text-xl font-bold">Monthly Executive Report</h1>
                    <p className="text-muted-foreground">Periode: Juni 2026</p>
                  </div>
                  <div><h2 className="font-semibold">HC Summary</h2><p>Total HC bulan ini: {s.sumJun.toLocaleString("id-ID")} (bulan lalu {s.sumMei.toLocaleString("id-ID")}).</p></div>
                  <div><h2 className="font-semibold">Growth Summary</h2><p>Pertumbuhan {s.growth.toFixed(1)}%. Top cluster: {s.topGrowth[0]?.cluster ?? "—"}.</p></div>
                  <div><h2 className="font-semibold">Ticket Summary</h2><p>Total ticket: {s.totalTicket}. Kluster dengan ticket tertinggi memerlukan retention.</p></div>
                  <div><h2 className="font-semibold">Program Effectiveness</h2><p>{s.done} program selesai. {s.running} sedang berjalan.</p></div>
                  <div><h2 className="font-semibold">Insight Bulanan</h2><ul><li>Prioritaskan retention pada cluster decline</li><li>Perluas coverage di area low-HC dengan potensi tinggi</li></ul></div>
                  <div><h2 className="font-semibold">Prioritas Bulan Depan</h2><ul><li>Eksekusi acquisition strategy</li><li>Optimalisasi PIC performance</li><li>Deploy loyalty program</li></ul></div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="glass-card border-0">
                <CardHeader><CardTitle className="font-display text-sm">Tren HC Bulanan (Jan – Jun)</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={s.hcTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bulan" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} />
                      <Tooltip formatter={(v: number) => v.toLocaleString("id-ID")} />
                      <Line type="monotone" dataKey="hc" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-card border-0">
                <CardHeader><CardTitle className="font-display text-sm">Top 8 Cluster berdasarkan HC</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={s.topHC} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={10} />
                      <YAxis type="category" dataKey="cluster" fontSize={10} width={100} />
                      <Tooltip />
                      <Bar dataKey="hc" fill="#6366f1" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-card border-0">
                <CardHeader><CardTitle className="font-display text-sm">PIC Performance (HC vs Ticket)</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={s.picPerf}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="pic" fontSize={10} angle={-25} textAnchor="end" height={70} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="hc" fill="#6366f1" name="HC" />
                      <Bar dataKey="ticket" fill="#ef4444" name="Ticket" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-card border-0">
                <CardHeader><CardTitle className="font-display text-sm">Status Action Plan</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={s.actionStatus} dataKey="value" nameKey="name" outerRadius={95}
                        label={(e: any) => `${e.name}: ${e.value}`} labelLine={false}>
                        {s.actionStatus.map((_, i) => (
                          <Cell key={i} fill={["#94a3b8", "#f59e0b", "#22c55e"][i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card border-0">
              <CardHeader><CardTitle className="font-display text-sm">Analisa Bulanan</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Total HC Juni <b>{s.sumJun.toLocaleString("id-ID")}</b>, bergerak {s.growth >= 0 ? "positif" : "negatif"} <b>{s.growth.toFixed(1)}%</b> dari Mei. Tren 6 bulan {s.hcTrend[5].hc >= s.hcTrend[0].hc ? "menunjukkan pertumbuhan konsisten" : "cenderung menurun dan perlu intervensi"}.</p>
                <p>• Kontributor HC terbesar: <b>{s.topHC[0]?.cluster ?? "-"}</b> ({(s.topHC[0]?.hc ?? 0).toLocaleString("id-ID")}). Fokus development cluster ini untuk menjaga base.</p>
                <p>• PIC dengan portofolio terbesar: <b>{s.picPerf[0]?.pic ?? "-"}</b> ({(s.picPerf[0]?.hc ?? 0).toLocaleString("id-ID")} HC, {s.picPerf[0]?.ticket ?? 0} ticket). Beban ticket perlu dievaluasi.</p>
                <p>• Efektivitas program: {s.done} selesai, {s.running} berjalan, {s.belum} belum dieksekusi. Rasio delivery {s.done + s.running + s.belum > 0 ? Math.round((s.done / (s.done + s.running + s.belum)) * 100) : 0}%.</p>
                <p>• Rekomendasi: perluas program retention di cluster decline, replikasi strategi cluster top growth, dan alokasikan resource tambahan untuk PIC dengan ticket tinggi.</p>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="intel">
            {!compCharts ? (
              <Card className="glass-card border-0">
                <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
                  <RadarIcon className="h-8 w-8 text-primary" />
                  Belum ada data Competitor. Upload KOMPETITOR.xlsx dari Settings → Data Management.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* KPI ringkas */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: "Cluster Terpantau", value: compCharts.totalClusters },
                    { label: "Kompetitor Unik", value: compCharts.totalCompetitors },
                    { label: "Cluster Ancaman Tinggi", value: compCharts.highThreat },
                    { label: "Kompetitor Dominan", value: compCharts.dominant },
                  ].map((k) => (
                    <Card key={k.label} className="glass-card border-0">
                      <CardContent className="p-4">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
                        <div className="mt-1 font-display text-lg font-bold">
                          {typeof k.value === "number" ? k.value.toLocaleString("id-ID") : k.value}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="glass-card border-0">
                    <CardHeader><CardTitle className="font-display text-sm">Top Competitor (kemunculan)</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer>
                        <BarChart data={compCharts.topCompetitors} layout="vertical" margin={{ left: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" fontSize={11} />
                          <YAxis type="category" dataKey="name" fontSize={11} width={90} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {compCharts.topCompetitors.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader><CardTitle className="font-display text-sm">Distribusi Threat Level</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={compCharts.threatBuckets}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={90}
                            label={(e: any) => `${e.name}: ${e.value}`}
                            labelLine={false}
                          >
                            {compCharts.threatBuckets.map((_, i) => (
                              <Cell key={i} fill={["#22c55e", "#f59e0b", "#ef4444"][i]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader><CardTitle className="font-display text-sm">Harga Kompetitor (Min · Rata² · Max)</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer>
                        <BarChart data={compCharts.priceRange}>
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
                    <CardHeader><CardTitle className="font-display text-sm">Analisis Promo</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={compCharts.promoBreakdown}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={90}
                            label={(e: any) => e.name}
                            labelLine={false}
                          >
                            {compCharts.promoBreakdown.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card className="glass-card border-0">
                  <CardHeader><CardTitle className="font-display text-sm">Top Cluster Berdasarkan Threat Score</CardTitle></CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer>
                      <BarChart data={compCharts.topThreats}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="cluster" fontSize={10} angle={-25} textAnchor="end" height={70} />
                        <YAxis fontSize={10} domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                          {compCharts.topThreats.map((t, i) => (
                            <Cell key={i} fill={t.score >= 71 ? "#ef4444" : t.score >= 41 ? "#f59e0b" : "#22c55e"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
