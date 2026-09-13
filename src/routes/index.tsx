import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, memo, Suspense, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore, computePriority } from "@/lib/store";
import { DrilldownDialog, type DrilldownState } from "@/components/drilldown-dialog";
import { KeyInsights, fmtFull, fmtPct, type Insight } from "@/components/chart-kit";
import { GlobalFilterBar } from "@/components/global-filter";
import { useGlobalClusters } from "@/hooks/use-global-filters";

const DashboardCharts = lazy(() => import("@/components/dashboard-charts"));

function ChartFallback() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card h-64 animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MCA Workspace" },
      { name: "description", content: "Dashboard executive: HC, ticket, growth, dan prioritas cluster." },
    ],
  }),
  component: Dashboard,
});

const MONTHS = [
  "januari", "februari", "maret", "april", "mei", "juni",
  "juli", "agustus", "september", "oktober", "november", "desember",
] as const;
const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const KpiCard = memo(function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tint = "primary",
  onClick,
}: {
  label: string;
  value: string | number;
  delta?: { value: number; suffix?: string };
  icon: React.ComponentType<{ className?: string }>;
  tint?: "primary" | "success" | "warning" | "info" | "destructive";
  onClick?: () => void;
}) {
  const tintMap: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 text-primary",
    success: "from-success/20 to-success/5 text-success",
    warning: "from-warning/20 to-warning/5 text-warning",
    info: "from-info/20 to-info/5 text-info",
    destructive: "from-destructive/20 to-destructive/5 text-destructive",
  };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-1 duration-300 text-left w-full ${
        onClick ? "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:border-primary/40" : ""
      }`}
    >
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
    </Comp>
  );
});


function Dashboard() {
  const clusters = useDataStore((s) => s.clusters);
  const actions = useDataStore((s) => s.actions);
  const global = useGlobalClusters();

  /** Periode & baris mengikuti filter global (periode, wilayah, cluster, PIC, kategori). */
  const period = useMemo(
    () => ({
      filled: global.filled,
      curKey: global.curKey,
      prevKey: global.prevKey,
      curLabel: global.curLabel,
      prevLabel: global.prevLabel,
    }),
    [global],
  );

  const rows = global.rows;

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const totalCluster = rows.length;
    const totalKab = new Set(rows.map((c) => c.kabupaten).filter(Boolean)).size;
    const totalProv = new Set(rows.map((c) => c.provinsi).filter(Boolean)).size;
    const sumJun = rows.reduce((a, c) => a + c.juni, 0);
    const sumMei = rows.reduce((a, c) => a + c.mei, 0);
    const hcGrowth = sumMei > 0 ? ((sumJun - sumMei) / sumMei) * 100 : 0;
    const totalTicket = rows.reduce((a, c) => a + c.ticket, 0);
    const ticketCur = rows.reduce((a, c) => a + (Number(c.ticketByMonth?.[period.curKey]) || 0), 0);
    const ticketPrev = rows.reduce((a, c) => a + (Number(c.ticketByMonth?.[period.prevKey]) || 0), 0);
    const ticketGrowth = ticketPrev > 0 ? ((ticketCur - ticketPrev) / ticketPrev) * 100 : 0;
    const maxTicket = Math.max(...rows.map((c) => c.ticket), 1);
    const priorities = rows.map((c) => ({ ...c, ...computePriority(c, maxTicket) }));
    const highRisk = priorities.filter((p) => p.level === "Tinggi").length;
    const highPriority = priorities.filter((p) => p.level === "Tinggi").length;

    const trend = period.filled.map((m) => ({
      month: MONTH_LABEL[m.idx],
      hc: m.total,
    }));


    const topHc = [...rows].sort((a, b) => b.juni - a.juni).slice(0, 10);
    const growth = [...rows]
      .filter((c) => c.deltaMeiJuni !== 0)
      .sort((a, b) => Math.abs(b.deltaMeiJuni) - Math.abs(a.deltaMeiJuni))
      .slice(0, 12);
    const topTicket = [...rows].sort((a, b) => b.ticket - a.ticket).slice(0, 8);

    const provMap = new Map<string, number>();
    rows.forEach((c) => provMap.set(c.provinsi || "N/A", (provMap.get(c.provinsi || "N/A") ?? 0) + c.juni));
    const provDist = [...provMap.entries()].map(([name, value]) => ({ name, value }));

    const picMap = new Map<string, { pic: string; hc: number; ticket: number; clusters: number; growth: number }>();
    rows.forEach((c) => {
      const key = c.pic || "N/A";
      const cur = picMap.get(key) ?? { pic: key, hc: 0, ticket: 0, clusters: 0, growth: 0 };
      cur.hc += c.juni;
      cur.ticket += c.ticket;
      cur.clusters += 1;
      cur.growth += c.deltaMeiJuni;
      picMap.set(key, cur);
    });
    const pics = [...picMap.values()].sort((a, b) => b.hc - a.hc).slice(0, 8);

    const declines = [...rows].sort((a, b) => a.deltaMeiJuni - b.deltaMeiJuni).slice(0, 3);
    const risingTicket = [...rows].sort((a, b) => b.ticket - a.ticket).slice(0, 3);

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
  }, [rows, period]);

  const [drill, setDrill] = useState<DrilldownState>(null);

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

  if (!stats) {
    return (
      <>
        <AppHeader title="Dashboard" subtitle="Executive Overview" />
        <div className="space-y-4 p-4 sm:p-6">
          <GlobalFilterBar />
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Tidak ada cluster yang cocok dengan filter saat ini. Ubah atau reset filter di atas.
          </div>
        </div>
      </>
    );
  }

  const s = stats;
  const actionActive = actions.filter((a) => a.status === "onprogress").length;
  const actionDone = actions.filter((a) => a.status === "done").length;

  const insights: Insight[] = (() => {
    const out: Insight[] = [];
    out.push({
      icon: s.hcGrowth >= 0 ? "\u2705" : "\u26a0\ufe0f",
      tone: s.hcGrowth >= 0 ? "positive" : "negative",
      text: (
        <>
          HC {s.hcGrowth >= 0 ? "tumbuh" : "turun"} <b>{fmtPct(s.hcGrowth, true)}</b> bulan ini ({fmtFull(s.sumMei)} → {fmtFull(s.sumJun)}).
        </>
      ),
    });
    const best = [...s.growth].sort((a, b) => b.deltaMeiJuni - a.deltaMeiJuni)[0];
    if (best && best.deltaMeiJuni > 0)
      out.push({
        icon: "\ud83d\ude80",
        tone: "positive",
        text: (
          <>
            <b>{best.cluster}</b> tumbuh paling cepat (+{fmtFull(best.deltaMeiJuni)} HC) — replikasi strateginya.
          </>
        ),
      });
    const worst = s.declines[0];
    if (worst && worst.deltaMeiJuni < 0)
      out.push({
        icon: "\ud83d\udcc9",
        tone: "negative",
        text: (
          <>
            <b>{worst.cluster}</b> turun {fmtFull(worst.deltaMeiJuni)} HC — perlu program retensi segera.
          </>
        ),
      });
    const t = s.risingTicket[0];
    if (t && t.ticket > 0)
      out.push({
        icon: "\ud83c\udfab",
        tone: "warning",
        text: (
          <>
            Ticket tertinggi di <b>{t.cluster}</b> ({fmtFull(t.ticket)} ticket) — indikasi masalah kualitas layanan.
          </>
        ),
      });
    if (s.highRisk > 0)
      out.push({
        icon: "\ud83d\udea8",
        tone: "warning",
        text: (
          <>
            <b>{s.highRisk} cluster</b> berstatus prioritas tinggi dan menunggu tindakan.
          </>
        ),
      });
    const topProv = [...s.provDist].sort((a, b) => b.value - a.value)[0];
    if (topProv)
      out.push({
        icon: "\ud83d\udccd",
        tone: "info",
        text: (
          <>
            <b>{topProv.name}</b> menyumbang {fmtPct((topProv.value / (s.sumJun || 1)) * 100)} dari total HC.
          </>
        ),
      });
    return out;
  })();


  const maxTicket = Math.max(...rows.map((c) => c.ticket), 1);
  const priorities = rows.map((c) => ({ ...c, ...computePriority(c, maxTicket) }));

  const colClusterBasic = [
    { key: "cluster", label: "Cluster" },
    { key: "kabupaten", label: "Kabupaten" },
    { key: "provinsi", label: "Provinsi" },
    { key: "pic", label: "PIC" },
    { key: "juni", label: `HC ${period.curLabel}`, align: "right" as const, format: (v: unknown) => Number(v).toLocaleString("id-ID") },
    { key: "ticket", label: "Ticket", align: "right" as const, format: (v: unknown) => Number(v).toLocaleString("id-ID") },
  ];

  const openTop = (title: string, sortKey: "juni" | "mei" | "ticket" | "deltaMeiJuni", desc = true) => {
    const list = [...rows].sort((a, b) => (desc ? Number(b[sortKey]) - Number(a[sortKey]) : Number(a[sortKey]) - Number(b[sortKey]))).slice(0, 50);
    setDrill({ title, description: "Menampilkan hingga 50 cluster teratas", columns: colClusterBasic, rows: list as unknown as Record<string, unknown>[] });
  };

  const openGrouped = (title: string, key: "kabupaten" | "provinsi" | "pic") => {
    const map = new Map<string, { name: string; clusters: number; hc: number; ticket: number }>();
    rows.forEach((c) => {
      const k = (c[key] as string) || "N/A";
      const cur = map.get(k) ?? { name: k, clusters: 0, hc: 0, ticket: 0 };
      cur.clusters += 1;
      cur.hc += c.juni;
      cur.ticket += c.ticket;
      map.set(k, cur);
    });
    const list = [...map.values()].sort((a, b) => b.hc - a.hc);
    setDrill({
      title,
      columns: [
        { key: "name", label: key.charAt(0).toUpperCase() + key.slice(1) },
        { key: "clusters", label: "Cluster", align: "right", format: (v) => Number(v).toLocaleString("id-ID") },
        { key: "hc", label: "Total HC", align: "right", format: (v) => Number(v).toLocaleString("id-ID") },
        { key: "ticket", label: "Ticket", align: "right", format: (v) => Number(v).toLocaleString("id-ID") },
      ],
      rows: list as unknown as Record<string, unknown>[],
    });
  };

  const openHighRisk = () => {
    const rows = priorities
      .filter((p) => p.level === "Tinggi")
      .sort((a, b) => b.score - a.score);
    setDrill({
      title: "High Risk / Prioritas Tinggi",
      description: "Cluster dengan score prioritas tinggi berdasarkan HC growth, ticket, dan potensi.",
      columns: [
        { key: "cluster", label: "Cluster" },
        { key: "kabupaten", label: "Kabupaten" },
        { key: "pic", label: "PIC" },
        { key: "juni", label: "HC", align: "right", format: (v) => Number(v).toLocaleString("id-ID") },
        { key: "ticket", label: "Ticket", align: "right" },
        { key: "score", label: "Score", align: "right", format: (v) => Number(v).toFixed(1) },
      ],
      rows: rows as unknown as Record<string, unknown>[],
    });
  };

  const openActions = (status: "belum" | "onprogress" | "done", title: string) => {
    const rows = actions.filter((a) => a.status === status);
    setDrill({
      title,
      columns: [
        { key: "title", label: "Judul" },
        { key: "cluster", label: "Cluster" },
        { key: "priority", label: "Prioritas" },
        { key: "assignee", label: "Assignee" },
      ],
      rows: rows as unknown as Record<string, unknown>[],
    });
  };

  return (
    <>
      <AppHeader title="Dashboard" subtitle={`Executive Overview — data s/d ${period.curLabel}`} />
      <div className="space-y-6 p-4 sm:p-6">
        <GlobalFilterBar />
        {/* KPI Row 1 - Cluster */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
          <KpiCard label="Total Cluster" value={s.totalCluster} icon={Target} tint="primary" onClick={() => openTop("Semua Cluster", "juni")} />
          <KpiCard label="Total Kabupaten" value={s.totalKab} icon={MapPin} tint="info" onClick={() => openGrouped("Distribusi per Kabupaten", "kabupaten")} />
          <KpiCard label="Total Provinsi" value={s.totalProv} icon={Building2} tint="info" onClick={() => openGrouped("Distribusi per Provinsi", "provinsi")} />
          <KpiCard label={`Total HC Aktif (${period.curLabel})`} value={s.sumJun.toLocaleString("id-ID")} icon={Users} tint="success" delta={{ value: s.hcGrowth }} onClick={() => openTop(`Top HC (${period.curLabel})`, "juni")} />
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label={`HC Aktif ${period.curLabel}`} value={s.sumJun.toLocaleString("id-ID")} icon={Activity} tint="success" onClick={() => openTop(`HC Aktif ${period.curLabel}`, "juni")} />
          <KpiCard label={`HC Aktif ${period.prevLabel}`} value={s.sumMei.toLocaleString("id-ID")} icon={Activity} tint="info" onClick={() => openTop(`HC Aktif ${period.prevLabel}`, "mei")} />
          <KpiCard label="Total Ticket" value={s.totalTicket.toLocaleString("id-ID")} icon={Ticket} tint="warning" delta={{ value: s.ticketGrowth }} onClick={() => openTop("Top Ticket", "ticket")} />
          <KpiCard label="High Risk Cluster" value={s.highRisk} icon={AlertTriangle} tint="destructive" onClick={openHighRisk} />
        </div>

        {/* KPI Row 3 - Progress */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <KpiCard label="Cluster Prioritas" value={s.highPriority} icon={Target} tint="warning" onClick={openHighRisk} />
          <KpiCard label="Action Plan Aktif" value={actionActive} icon={Activity} tint="info" onClick={() => openActions("onprogress", "Action Plan — On Progress")} />
          <KpiCard label="Cycle Completed" value={actionDone} icon={TrendingUp} tint="success" onClick={() => openActions("done", "Action Plan — Done")} />
        </div>

        {/* Key Insights */}
        <KeyInsights items={insights} />



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
        </div>

        {/* Charts & PIC in Tabs (lazy) */}
        <Tabs defaultValue="charts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="charts">Visualisasi</TabsTrigger>
            <TabsTrigger value="pic">PIC Performance</TabsTrigger>
          </TabsList>
          <TabsContent value="charts" className="mt-0">
            <Suspense fallback={<ChartFallback />}>
              <DashboardCharts
                stats={s}
                labels={{ cur: period.curLabel, prev: period.prevLabel }}
                onSelect={(kind, d) => {
                  if (kind === "cluster") {
                    const name = d.cluster as string;
                    const row = rows.find((c) => c.cluster === name);
                    if (row) {
                      setDrill({
                        title: `Detail Cluster — ${name}`,
                        columns: [
                          { key: "field", label: "Field" },
                          { key: "val", label: "Nilai", align: "right" },
                        ],
                        rows: [
                          { field: "Kabupaten", val: row.kabupaten },
                          { field: "Provinsi", val: row.provinsi },
                          { field: "PIC", val: row.pic },
                          ...period.filled.map((m) => ({
                            field: `HC ${MONTH_FULL[m.idx]}`,
                            val: (Number(row[m.key as keyof typeof row]) || 0).toLocaleString("id-ID"),
                          })),
                          { field: `Delta ${period.prevLabel}–${period.curLabel}`, val: row.deltaMeiJuni },
                          { field: "Ticket", val: row.ticket.toLocaleString("id-ID") },
                        ],
                      });
                    }
                  } else if (kind === "province") {
                    const name = d.name as string;
                    const list = rows.filter((c) => (c.provinsi || "N/A") === name);
                    setDrill({
                      title: `Provinsi — ${name}`,
                      description: `${list.length} cluster di provinsi ini.`,
                      columns: colClusterBasic,
                      rows: list as unknown as Record<string, unknown>[],
                    });
                  } else if (kind === "month") {
                    setDrill({
                      title: `HC Bulan ${d.month}`,
                      columns: colClusterBasic,
                      rows: [...rows].sort((a, b) => b.juni - a.juni).slice(0, 50) as unknown as Record<string, unknown>[],
                    });
                  }
                }}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="pic" className="mt-0">
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
          </TabsContent>
        </Tabs>


        <div className="text-center text-xs text-muted-foreground">
          Butuh detail cluster?{" "}
          <Link to="/master" className="text-primary hover:underline">
            Buka Master Cluster
          </Link>
        </div>
      </div>
      <DrilldownDialog state={drill} onClose={() => setDrill(null)} />
    </>
  );
}
