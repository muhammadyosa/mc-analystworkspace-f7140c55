import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  GripVertical,
  ListChecks,
  Plus,
  Sparkles,
  Target,
  Trophy,
  Users,
  Link2,
  Download,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDataStore } from "@/lib/store";
import { computeActionStatus, type ActionPlanRow, type ActionPlanStatus } from "@/lib/excel";

export const Route = createFileRoute("/action-plan")({
  head: () => ({ meta: [{ title: "Action Plan — Iconnet Workspace" }] }),
  component: ActionPlanPage,
});

const PROGRAM_OPTIONS = [
  "Door to Door",
  "Digital Ads",
  "Branding",
  "Event",
  "Partnership",
  "Site Visit",
  "Retention",
  "Profiling",
  "Customer Loyalty",
];

const STATUS_META: Record<
  ActionPlanStatus,
  { label: string; color: string; dot: string; ring: string; icon: typeof Clock }
> = {
  planned: { label: "Not Started", color: "text-sky-500", dot: "bg-sky-500", ring: "ring-sky-500/30", icon: CalendarDays },
  onprogress: { label: "On Progress", color: "text-amber-500", dot: "bg-amber-500", ring: "ring-amber-500/30", icon: Clock },
  completed: { label: "Done", color: "text-emerald-500", dot: "bg-emerald-500", ring: "ring-emerald-500/30", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "text-rose-500", dot: "bg-rose-500", ring: "ring-rose-500/30", icon: AlertTriangle },
  reschedule: { label: "Reschedule", color: "text-purple-500", dot: "bg-purple-500", ring: "ring-purple-500/30", icon: RotateCcw },
};

const COLUMNS: ActionPlanStatus[] = ["planned", "onprogress", "completed", "overdue", "reschedule"];

function progressOf(row: ActionPlanRow): number {
  if (row.status === "completed") return 100;
  const s = new Date(row.startDate).getTime();
  const e = new Date(row.endDate).getTime();
  if (!s || !e || e <= s) return row.status === "planned" ? 0 : 50;
  const now = Date.now();
  const pct = ((now - s) / (e - s)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function fmtDate(iso: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function DraggableCard({
  row,
  onOpen,
  onDelete,
}: {
  row: ActionPlanRow;
  onOpen: (r: ActionPlanRow) => void;
  onDelete: (r: ActionPlanRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;
  const meta = STATUS_META[row.status];
  const pct = progressOf(row);
  const hasResult = !!row.result?.trim();
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card group cursor-pointer rounded-xl border-0 p-3 shadow-sm ring-1 ${meta.ring} hover:ring-primary/60`}
      onClick={() => onOpen(row)}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold">{row.cluster || "—"}</p>
            <div className="flex shrink-0 items-center gap-1">
              {hasResult && (
                <Badge className="border-emerald-500/40 bg-emerald-500/10 text-[9px] text-emerald-600">
                  Hasil ✓
                </Badge>
              )}
              <button
                type="button"
                aria-label={`Hapus action plan ${row.program} di ${row.cluster}`}
                title="Hapus action plan"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row);
                }}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{row.program}</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="truncate">PIC: {row.pic || "-"}</span>
            <span>{fmtDate(row.endDate)}</span>
          </div>
          <Progress value={pct} className="mt-2 h-1.5" />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{fmtDate(row.startDate)}</span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OltGroupCard({
  cluster,
  rows,
  onOpenGroup,
}: {
  cluster: string;
  rows: ActionPlanRow[];
  onOpenGroup: (cluster: string, rows: ActionPlanRow[]) => void;
}) {
  const avgPct = Math.round(rows.reduce((s, r) => s + progressOf(r), 0) / rows.length);
  const hasResult = rows.some((r) => r.result?.trim());
  return (
    <div
      className="glass-card group relative cursor-pointer rounded-xl border-0 p-3 shadow-sm ring-1 ring-border/50 hover:ring-primary/60"
      onClick={() => onOpenGroup(cluster, rows)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold">{cluster || "—"}</p>
        <Badge className="shrink-0 bg-primary/10 text-[10px] text-primary">{rows.length} action</Badge>
      </div>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
        {rows.slice(0, 2).map((r) => r.program).join(" · ")}
        {rows.length > 2 ? ` +${rows.length - 2} lainnya` : ""}
      </p>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="truncate">PIC: {Array.from(new Set(rows.map((r) => r.pic).filter(Boolean))).join(", ") || "-"}</span>
        {hasResult && <span className="text-emerald-600">Hasil ✓</span>}
      </div>
      <Progress value={avgPct} className="mt-2 h-1.5" />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>Rata-rata progress</span>
        <span>{avgPct}%</span>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  rows,
  onOpen,
  onOpenGroup,
  onDelete,
}: {
  status: ActionPlanStatus;
  rows: ActionPlanRow[];
  onOpen: (r: ActionPlanRow) => void;
  onOpenGroup: (cluster: string, rows: ActionPlanRow[]) => void;
  onDelete: (r: ActionPlanRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  // Group by OLT (cluster). If a cluster has only 1 action → normal draggable card. If ≥2 → single OLT group card.
  const groups = useMemo(() => {
    const m = new Map<string, ActionPlanRow[]>();
    rows.forEach((r) => {
      const k = r.cluster || "—";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return Array.from(m.entries());
  }, [rows]);
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[320px] flex-col gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3 transition ${
        isOver ? "border-primary/60 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-1">
        <Icon className={`h-4 w-4 ${meta.color}`} />
        <span className="text-sm font-semibold">{meta.label}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {rows.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {groups.map(([cluster, list]) =>
          list.length === 1 ? (
            <DraggableCard key={list[0].id} row={list[0]} onOpen={onOpen} onDelete={onDelete} />
          ) : (
            <OltGroupCard key={cluster} cluster={cluster} rows={list} onOpenGroup={onOpenGroup} />
          ),
        )}
        {!rows.length && (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Kosong</p>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-display text-2xl font-bold">{value}</p>
              {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
            </div>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TimelineView({ rows }: { rows: ActionPlanRow[] }) {
  const data = useMemo(() => {
    const withDates = rows
      .filter((r) => r.startDate && r.endDate)
      .map((r) => ({ ...r, s: new Date(r.startDate).getTime(), e: new Date(r.endDate).getTime() }))
      .filter((r) => !Number.isNaN(r.s) && !Number.isNaN(r.e) && r.e >= r.s);
    if (!withDates.length) return null;
    const min = Math.min(...withDates.map((r) => r.s));
    const max = Math.max(...withDates.map((r) => r.e));
    const span = Math.max(1, max - min);
    return { rows: withDates.sort((a, b) => a.s - b.s), min, max, span };
  }, [rows]);

  if (!data) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Belum ada rentang tanggal untuk ditampilkan.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>{fmtDate(new Date(data.min).toISOString())}</span>
        <span>Timeline / Gantt</span>
        <span>{fmtDate(new Date(data.max).toISOString())}</span>
      </div>
      <div className="max-h-[480px] space-y-1.5 overflow-auto pr-1">
        {data.rows.map((r) => {
          const left = ((r.s - data.min) / data.span) * 100;
          const width = Math.max(1.5, ((r.e - r.s) / data.span) * 100);
          const meta = STATUS_META[r.status];
          return (
            <div key={r.id} className="grid grid-cols-[minmax(140px,220px)_1fr] items-center gap-3 text-xs">
              <div className="truncate">
                <span className="font-medium">{r.cluster || "-"}</span>
                <span className="ml-1 text-muted-foreground">· {r.pic || "-"}</span>
              </div>
              <div className="relative h-6 rounded-md bg-muted/40">
                <div
                  className={`absolute top-1 h-4 rounded ${meta.dot} shadow-sm`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${r.program} · ${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarView({ rows }: { rows: ActionPlanRow[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const startDay = (first.getDay() + 6) % 7; // Monday-first
  const cells = Array.from({ length: startDay + days }, (_, i) =>
    i < startDay ? null : new Date(y, m, i - startDay + 1),
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ActionPlanRow[]>();
    for (const r of rows) {
      if (!r.startDate || !r.endDate) continue;
      const s = new Date(r.startDate);
      const e = new Date(r.endDate);
      const d = new Date(s);
      while (d <= e) {
        if (d.getFullYear() === y && d.getMonth() === m) {
          const key = d.toISOString().slice(0, 10);
          const arr = map.get(key) ?? [];
          arr.push(r);
          map.set(key, arr);
        }
        d.setDate(d.getDate() + 1);
      }
    }
    return map;
  }, [rows, y, m]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(y, m - 1, 1))}>
          ‹ Prev
        </Button>
        <div className="font-display text-sm font-semibold">
          {cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(y, m + 1, 1))}>
          Next ›
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px]">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <div key={d} className="py-1 text-center font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-20 rounded-md bg-muted/10" />;
          const key = d.toISOString().slice(0, 10);
          const events = eventsByDay.get(key) ?? [];
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={i}
              className={`h-20 overflow-hidden rounded-md border p-1 text-[10px] ${
                isToday ? "border-primary bg-primary/5" : "border-border/50 bg-background/40"
              }`}
            >
              <div className="text-muted-foreground">{d.getDate()}</div>
              <div className="mt-0.5 space-y-0.5">
                {events.slice(0, 2).map((r) => (
                  <div
                    key={r.id}
                    className={`truncate rounded px-1 text-white ${STATUS_META[r.status].dot}`}
                    title={`${r.cluster} · ${r.program}`}
                  >
                    {r.cluster || r.program}
                  </div>
                ))}
                {events.length > 2 && (
                  <div className="text-muted-foreground">+{events.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionPlanPage() {
  const { actionPlans, clusters, tickets, analyst, competitorData, overrideActionPlanStatus, addActionPlans, updateActionPlan, removeActionPlan } = useDataStore();
  const [search, setSearch] = useState("");
  const [filterPic, setFilterPic] = useState("");
  const [filterCluster, setFilterCluster] = useState("");
  const [filterKab, setFilterKab] = useState("");
  const [filterProv, setFilterProv] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | ActionPlanStatus>("");
  const [filterMonth, setFilterMonth] = useState("");
  const [openRow, setOpenRow] = useState<ActionPlanRow | null>(null);
  const [oltGroup, setOltGroup] = useState<{ cluster: string; rows: ActionPlanRow[] } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ActionPlanRow | null>(null);
  const askDelete = (r: ActionPlanRow) => setDeleteTarget(r);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Cluster meta lookup by name (case-insensitive)
  const clusterMeta = useMemo(() => {
    const m = new Map<string, (typeof clusters)[number]>();
    for (const c of clusters) if (c.cluster) m.set(c.cluster.toLowerCase(), c);
    return m;
  }, [clusters]);

  const ticketByCluster = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tickets) m.set(t.cluster, (m.get(t.cluster) ?? 0) + t.ticket);
    return m;
  }, [tickets]);

  const analystByCluster = useMemo(() => {
    const m = new Map<string, (typeof analyst)[number]>();
    for (const a of analyst) if (a.cluster) m.set(a.cluster.toLowerCase(), a);
    return m;
  }, [analyst]);

  const competitorByCluster = useMemo(() => {
    const m = new Map<string, (typeof competitorData)[number][]>();
    for (const c of competitorData) {
      const k = (c.cluster || "").toLowerCase();
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(c);
    }
    return m;
  }, [competitorData]);

  // Recompute status live but preserve manual overrides (completed / reschedule)
  const rows = useMemo(() => {
    return actionPlans.map((r) => ({
      ...r,
      status:
        r.status === "completed" || r.status === "reschedule"
          ? r.status
          : computeActionStatus(r.startDate, r.endDate, r.result),
    }));
  }, [actionPlans]);

  const pics = useMemo(() => Array.from(new Set(rows.map((r) => r.pic).filter(Boolean))).sort(), [rows]);
  const clusterOpts = useMemo(() => Array.from(new Set(rows.map((r) => r.cluster).filter(Boolean))).sort(), [rows]);
  const kabOpts = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => clusterMeta.get(r.cluster.toLowerCase())?.kabupaten).filter(Boolean) as string[]),
      ).sort(),
    [rows, clusterMeta],
  );
  const provOpts = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => clusterMeta.get(r.cluster.toLowerCase())?.provinsi).filter(Boolean) as string[]),
      ).sort(),
    [rows, clusterMeta],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterPic && r.pic !== filterPic) return false;
      if (filterCluster && r.cluster !== filterCluster) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      const meta = clusterMeta.get(r.cluster.toLowerCase());
      if (filterKab && meta?.kabupaten !== filterKab) return false;
      if (filterProv && meta?.provinsi !== filterProv) return false;
      if (filterMonth) {
        const [y, m] = filterMonth.split("-");
        const st = r.startDate?.slice(0, 7);
        const en = r.endDate?.slice(0, 7);
        const target = `${y}-${m}`;
        if (!(st && en && st <= target && target <= en)) return false;
      }
      if (!s) return true;
      return (
        r.cluster.toLowerCase().includes(s) ||
        r.program.toLowerCase().includes(s) ||
        r.pic.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s) ||
        (r.result || "").toLowerCase().includes(s)
      );
    });
  }, [rows, search, filterPic, filterCluster, filterKab, filterProv, filterStatus, filterMonth, clusterMeta]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const planned = rows.filter((r) => r.status === "planned").length;
    const onprogress = rows.filter((r) => r.status === "onprogress").length;
    const completed = rows.filter((r) => r.status === "completed").length;
    const overdue = rows.filter((r) => r.status === "overdue").length;
    const uniquePic = new Set(rows.map((r) => r.pic).filter(Boolean)).size;
    const uniqueCluster = new Set(rows.map((r) => r.cluster).filter(Boolean)).size;
    const withResult = rows.filter((r) => r.result?.trim()).length;
    const completion = total ? Math.round((completed / total) * 100) : 0;
    const effectiveness = total ? Math.round((withResult / total) * 100) : 0;
    return { total, planned, onprogress, completed, overdue, uniquePic, uniqueCluster, completion, effectiveness, withResult };
  }, [rows]);

  const recommendations = useMemo(() => {
    const out: { severity: "high" | "med" | "low"; title: string; detail: string }[] = [];
    const overdueList = rows.filter((r) => r.status === "overdue");
    if (overdueList.length) {
      out.push({
        severity: "high",
        title: `${overdueList.length} program terlambat (belum ada Hasil)`,
        detail: `Evaluasi & Site Visit: ${Array.from(new Set(overdueList.map((r) => `${r.cluster}·${r.pic}`))).slice(0, 5).join(" | ") || "-"}. Update kolom Hasil untuk menutup program.`,
      });
    }
    const bestPractice = rows.filter((r) => r.status === "completed" && r.result?.trim());
    if (bestPractice.length) {
      out.push({
        severity: "low",
        title: `Best Practice: ${bestPractice.length} program sukses`,
        detail: `Replikasi: ${bestPractice.slice(0, 4).map((r) => `${r.program} @ ${r.cluster}`).join(" | ")}.`,
      });
    }
    const clustersWithPlan = new Set(rows.map((r) => r.cluster));
    const clustersNoPlan = clusters.map((c) => c.cluster).filter((c) => c && !clustersWithPlan.has(c));
    if (clustersNoPlan.length) {
      out.push({
        severity: "med",
        title: `${clustersNoPlan.length} cluster belum memiliki program`,
        detail: `Contoh: ${clustersNoPlan.slice(0, 6).join(", ")}. Rekomendasi: Branding lokal & Program Loyalty.`,
      });
    }
    const hotSpots = Array.from(ticketByCluster.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .filter(([c]) => !rows.some((r) => r.cluster === c && r.status === "onprogress"));
    if (hotSpots.length) {
      out.push({
        severity: "med",
        title: `${hotSpots.length} cluster ticket tinggi tanpa program aktif`,
        detail: `Prioritas: ${hotSpots.map(([c, n]) => `${c} (${n} tiket)`).join(", ")}. Rekomendasi: Preventive Maintenance & Care Program.`,
      });
    }
    if (kpis.effectiveness >= 60) {
      out.push({
        severity: "low",
        title: `Efektivitas program ${kpis.effectiveness}%`,
        detail: `${kpis.withResult}/${kpis.total} program terisi Hasil — dokumentasi konsisten, pertahankan.`,
      });
    }
    if (!rows.length) {
      out.push({
        severity: "low",
        title: "Belum ada Action Plan",
        detail: "Upload ACTION PLAN.xlsx melalui Settings → Data Management untuk memulai.",
      });
    }
    return out;
  }, [rows, clusters, ticketByCluster, kpis]);

  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id as ActionPlanStatus | undefined;
    if (!overId) return;
    overrideActionPlanStatus(e.active.id as string, overId);
  };

  return (
    <>
      <AppHeader
        title="Action Plan"
        subtitle="Timeline, Kanban, Kalender, Detail & AI Recommendation berbasis ACTION PLAN.xlsx"
      />
      <div className="space-y-4 p-4 sm:p-6">
        {/* KPI Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <KpiCard icon={ListChecks} label="Total Program" value={kpis.total} sub={`${kpis.uniqueCluster} cluster`} />
          <KpiCard icon={CalendarDays} label="Planned" value={kpis.planned} color="text-sky-500" />
          <KpiCard icon={Clock} label="On Progress" value={kpis.onprogress} color="text-amber-500" />
          <KpiCard icon={CheckCircle2} label="Completed" value={kpis.completed} color="text-emerald-500" />
          <KpiCard icon={AlertTriangle} label="Overdue" value={kpis.overdue} color="text-rose-500" />
          <KpiCard icon={Users} label="PIC Terlibat" value={kpis.uniquePic} color="text-primary" />
          <KpiCard icon={Target} label="Completion" value={`${kpis.completion}%`} sub="rate keseluruhan" />
          <KpiCard icon={Trophy} label="Efektivitas" value={`${kpis.effectiveness}%`} sub={`${kpis.withResult} program ada Hasil`} color="text-emerald-500" />
        </div>

        {/* Exec Summary */}
        <Card className="glass-card border-0">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {rows.length
              ? `Dari ${kpis.total} program di ${kpis.uniqueCluster} cluster, ${kpis.onprogress} sedang berjalan, ${kpis.completed} selesai (${kpis.completion}%) dan ${kpis.overdue} terlambat. Efektivitas dokumentasi Hasil mencapai ${kpis.effectiveness}%. ${kpis.overdue > 0 ? "Fokus utama: menutup program overdue dengan mengisi kolom Hasil atau melakukan evaluasi." : "Semua program berjalan sesuai jalur — lanjutkan planning kuartal berikutnya."}`
              : "Belum ada data Action Plan. Upload ACTION PLAN.xlsx untuk memulai analisis."}
          </CardContent>
        </Card>

        {/* Toolbar */}
        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Input
                placeholder="Cari cluster / program / PIC / hasil…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full sm:max-w-xs"
              />
              <div className="scroll-x -mx-3 px-3 sm:mx-0 sm:px-0 sm:contents">
                <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
                  <FilterSelect value={filterPic} onChange={setFilterPic} placeholder="Semua PIC" options={pics} />
                  <FilterSelect value={filterCluster} onChange={setFilterCluster} placeholder="Semua Cluster" options={clusterOpts} />
                  <FilterSelect value={filterKab} onChange={setFilterKab} placeholder="Semua Kabupaten" options={kabOpts} />
                  <FilterSelect value={filterProv} onChange={setFilterProv} placeholder="Semua Provinsi" options={provOpts} />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as "" | ActionPlanStatus)}
                    className="h-8 shrink-0 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Semua Status</option>
                    <option value="planned">Not Started</option>
                    <option value="onprogress">On Progress</option>
                    <option value="completed">Done</option>
                    <option value="overdue">Overdue</option>
                    <option value="reschedule">Reschedule</option>
                  </select>
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="h-8 shrink-0 rounded-md border border-input bg-background px-2 text-xs"
                  />
                  {(search || filterPic || filterCluster || filterKab || filterProv || filterStatus || filterMonth) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 shrink-0"
                      onClick={() => {
                        setSearch("");
                        setFilterPic("");
                        setFilterCluster("");
                        setFilterKab("");
                        setFilterProv("");
                        setFilterStatus("");
                        setFilterMonth("");
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <span className="text-[11px] text-muted-foreground">
                  {filtered.length} dari {rows.length} program
                </span>
                <Button size="sm" className="h-8" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Tambah ke Action Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>


        <Tabs defaultValue="kanban" className="space-y-4">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="calendar">Kalender</TabsTrigger>
            <TabsTrigger value="ai">AI Recommendation</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {COLUMNS.map((c) => (
                  <KanbanColumn
                    key={c}
                    status={c}
                    rows={filtered.filter((r) => r.status === c)}
                    onOpen={setOpenRow}
                    onOpenGroup={(cluster, rows) => setOltGroup({ cluster, rows })}
                    onDelete={askDelete}
                  />
                ))}
              </div>
            </DndContext>
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="glass-card border-0">
              <CardContent className="p-4">
                <TimelineView rows={filtered} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card className="glass-card border-0">
              <CardContent className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportCalendarExcel(filtered)}>
                    <Download className="mr-1 h-4 w-4" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportCalendarPDF(filtered)}>
                    <Download className="mr-1 h-4 w-4" /> PDF
                  </Button>
                </div>
                <CalendarView rows={filtered} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card className="glass-card border-0">
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="font-display text-base">Smart Recommendation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendations.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 text-sm ${
                      r.severity === "high"
                        ? "border-rose-500/40 bg-rose-500/5"
                        : r.severity === "med"
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-emerald-500/40 bg-emerald-500/5"
                    }`}
                  >
                    <div className="font-semibold">{r.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{r.detail}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {!rows.length && (
          <Card className="glass-card border-0">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Belum ada data. Upload <code className="font-mono">ACTION PLAN.xlsx</code> di Settings → Data Management.
            </CardContent>
          </Card>
        )}
      </div>

      <DetailDialog
        row={openRow ? (actionPlans.find((a) => a.id === openRow.id) ?? null) : null}
        onClose={() => setOpenRow(null)}
        onUpdate={updateActionPlan}
        clusterMeta={clusterMeta}
        ticketByCluster={ticketByCluster}
        analystByCluster={analystByCluster}
        competitorByCluster={competitorByCluster}
      />

      <Dialog open={!!oltGroup} onOpenChange={(o) => { if (!o) setOltGroup(null); }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] p-4 sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display flex flex-wrap items-center gap-2 text-base">
              <span className="min-w-0 truncate">OLT · {oltGroup?.cluster}</span>
              {oltGroup && <Badge variant="secondary">{oltGroup.rows.length} action</Badge>}
            </DialogTitle>
            <DialogDescription>Klik salah satu action plan untuk melihat / mengedit detail.</DialogDescription>
          </DialogHeader>
          {oltGroup && (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {oltGroup.rows.map((r) => {
                const meta = STATUS_META[r.status];
                const StatusIcon = meta.icon;
                const pct = progressOf(r);
                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setOltGroup(null); setOpenRow(r); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { setOltGroup(null); setOpenRow(r); }
                    }}
                    className={`w-full cursor-pointer rounded-xl border border-border/60 bg-muted/30 p-3 text-left transition hover:border-primary/60 hover:bg-muted/60`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-display text-sm font-semibold">{r.program || "—"}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">PIC: {r.pic || "-"} · {fmtDate(r.startDate)} → {fmtDate(r.endDate)}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant="outline" className={`gap-1 text-[10px] ${meta.color}`}>
                          <StatusIcon className="h-3 w-3" /> {meta.label}
                        </Badge>
                        <button
                          type="button"
                          aria-label={`Hapus action plan ${r.program}`}
                          title="Hapus action plan"
                          onClick={(e) => { e.stopPropagation(); askDelete(r); }}
                          className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {r.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{r.description}</p>}
                    <Progress value={pct} className="mt-2 h-1.5" />
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddProgramDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clusterOptions={Array.from(new Set(clusters.map((c) => c.cluster).filter(Boolean))).sort()}
        picOptions={Array.from(new Set(clusters.map((c) => c.pic).filter(Boolean))).sort()}
        onSubmit={(payload) => {
          const now = Date.now();
          const created: ActionPlanRow[] = payload.programs.map((prog, i) => {
            const durationDays = payload.startDate && payload.endDate
              ? Math.max(1, Math.round((new Date(payload.endDate).getTime() - new Date(payload.startDate).getTime()) / 86400000) + 1)
              : 0;
            return {
              id: `manual-${now}-${i}-${prog}`.slice(0, 120),
              pic: payload.pic,
              cluster: payload.cluster,
              program: prog,
              startDate: payload.startDate,
              endDate: payload.endDate,
              description: payload.description,
              result: "",
              status: computeActionStatus(payload.startDate, payload.endDate, ""),
              durationDays,
            };
          });
          addActionPlans(created);
          setAddOpen(false);
        }}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Hapus action plan?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.program || "—"}" di cluster ${deleteTarget.cluster || "—"} akan dihapus permanen dari daftar action plan.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  removeActionPlan(deleteTarget.id);
                  setOltGroup((g) =>
                    g ? { ...g, rows: g.rows.filter((r) => r.id !== deleteTarget.id) } : g,
                  );
                }
                setDeleteTarget(null);
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function exportCalendarExcel(rows: ActionPlanRow[]) {
  const data = rows
    .filter((r) => r.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((r) => ({
      "Start Date": r.startDate,
      "End Date": r.endDate,
      Cluster: r.cluster,
      Program: r.program,
      PIC: r.pic,
      Status: STATUS_META[r.status].label,
      Keterangan: r.description,
      Hasil: r.result,
    }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kalender Action Plan");
  XLSX.writeFile(wb, `kalender-action-plan-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportCalendarPDF(rows: ActionPlanRow[]) {
  const w = window.open("", "", "width=1000,height=1200");
  if (!w) return;
  const sorted = [...rows].filter((r) => r.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const body = sorted
    .map(
      (r) => `<tr>
      <td>${r.startDate}</td><td>${r.endDate}</td><td>${r.cluster}</td>
      <td>${r.program}</td><td>${r.pic || "-"}</td>
      <td>${STATUS_META[r.status].label}</td><td>${(r.description || "").replace(/</g, "&lt;")}</td>
    </tr>`,
    )
    .join("");
  w.document.write(`<html><head><title>Kalender Action Plan</title><style>
    body{font-family:-apple-system,sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin:0 0 12px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}
    th{background:#f3f4f6}
    </style></head><body>
    <h1>Kalender Action Plan — ${new Date().toLocaleDateString("id-ID")}</h1>
    <table><thead><tr>
      <th>Start</th><th>End</th><th>Cluster</th><th>Program</th><th>PIC</th><th>Status</th><th>Keterangan</th>
    </tr></thead><tbody>${body}</tbody></table>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}

function AddProgramDialog({
  open,
  onClose,
  onSubmit,
  clusterList,
  picOptions,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: {
    programs: string[];
    clusters: { cluster: string; kabupaten: string }[];
    pic: string;
    startDate: string;
    endDate: string;
    description: string;
  }) => void;
  clusterList: { cluster: string; kabupaten: string }[];
  picOptions: string[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [kab, setKab] = useState("");
  const [mode, setMode] = useState<"all" | "some">("all");
  const [oltPick, setOltPick] = useState<string[]>([]);
  const [oltSearch, setOltSearch] = useState("");
  const [pic, setPic] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const kabOptions = useMemo(
    () => Array.from(new Set(clusterList.map((c) => c.kabupaten).filter(Boolean))).sort(),
    [clusterList],
  );
  const oltInKab = useMemo(
    () =>
      clusterList
        .filter((c) => c.cluster && (!kab || c.kabupaten === kab))
        .filter((c, i, arr) => arr.findIndex((x) => x.cluster === c.cluster) === i)
        .sort((a, b) => a.cluster.localeCompare(b.cluster)),
    [clusterList, kab],
  );
  const visibleOlt = useMemo(() => {
    const q = oltSearch.trim().toLowerCase();
    return q ? oltInKab.filter((c) => c.cluster.toLowerCase().includes(q)) : oltInKab;
  }, [oltInKab, oltSearch]);

  const chosen = mode === "all" ? oltInKab : oltInKab.filter((c) => oltPick.includes(c.cluster));

  const toggle = (p: string) => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  const toggleOlt = (c: string) =>
    setOltPick((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const resetAll = () => {
    setSelected([]); setKab(""); setMode("all"); setOltPick([]); setOltSearch("");
    setPic(""); setStartDate(""); setEndDate(""); setDescription("");
  };

  const submit = () => {
    if (!selected.length || !chosen.length) return;
    onSubmit({
      programs: selected,
      clusters: chosen.map((c) => ({ cluster: c.cluster, kabupaten: c.kabupaten })),
      pic: pic.trim(),
      startDate,
      endDate,
      description,
    });
    resetAll();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Tambah ke Action Plan</DialogTitle>
          <DialogDescription>Pilih program, kabupaten, lalu OLT yang menjadi target.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Program ({selected.length} dipilih)</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PROGRAM_OPTIONS.map((p) => {
                const active = selected.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggle(p)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Kabupaten</Label>
                <select
                  value={kab}
                  onChange={(e) => { setKab(e.target.value); setOltPick([]); }}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Semua Kabupaten</option>
                  {kabOptions.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Cakupan OLT</Label>
                <div className="mt-1 flex gap-1.5">
                  {(["all", "some"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition ${
                        mode === m
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      {m === "all" ? "Semua OLT" : "OLT tertentu"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {mode === "some" && (
              <div className="mt-2.5 space-y-2">
                <Input
                  value={oltSearch}
                  onChange={(e) => setOltSearch(e.target.value)}
                  placeholder="Cari OLT…"
                  className="h-8"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => setOltPick(Array.from(new Set([...oltPick, ...visibleOlt.map((c) => c.cluster)])))}
                  >
                    Select All
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setOltPick([])}>
                    Clear Selection
                  </Button>
                  <Badge variant="secondary" className="text-[10px]">{oltPick.length} OLT dipilih</Badge>
                </div>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border bg-background p-1.5">
                  {visibleOlt.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">Tidak ada OLT pada filter ini.</p>
                  ) : (
                    visibleOlt.map((c) => (
                      <label
                        key={c.cluster}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={oltPick.includes(c.cluster)}
                          onChange={() => toggleOlt(c.cluster)}
                          className="h-3.5 w-3.5 accent-[var(--primary)]"
                        />
                        <span className="min-w-0 flex-1 truncate">{c.cluster}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{c.kabupaten || "—"}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <p className="mt-2 text-[11px] text-muted-foreground">
              Target: {chosen.length} OLT{kab ? ` di ${kab}` : ""} · total{" "}
              {chosen.length * selected.length} action plan akan dibuat.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">PIC</Label>
              <Input list="ap-pics" value={pic} onChange={(e) => setPic(e.target.value)} className="h-8" />
              <datalist id="ap-pics">{picOptions.map((p) => <option key={p} value={p} />)}</datalist>
            </div>
            <div />
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={!selected.length || !chosen.length}>
            Simpan {selected.length && chosen.length ? `(${selected.length * chosen.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 max-w-[160px] rounded-md border border-input bg-background px-2 text-xs"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function DetailDialog({
  row,
  onClose,
  onUpdate,
  clusterMeta,
  ticketByCluster,
  analystByCluster,
  competitorByCluster,
}: {
  row: ActionPlanRow | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ActionPlanRow>) => void;
  clusterMeta: Map<string, any>;
  ticketByCluster: Map<string, number>;
  analystByCluster: Map<string, any>;
  competitorByCluster: Map<string, any[]>;
}) {
  if (!row) return null;
  const key = row.cluster.toLowerCase();
  const meta = clusterMeta.get(key);
  const tickets = ticketByCluster.get(row.cluster) ?? 0;
  const a = analystByCluster.get(key);
  const comps = competitorByCluster.get(key) ?? [];
  const pct = progressOf(row);
  const status = STATUS_META[row.status];
  const hcNow = meta?.juni ?? 0;
  const hcTarget = meta?.totalHC2026 ?? 0;
  const hcJan = meta?.januari ?? 0;
  const growth = hcJan > 0 ? Math.round(((hcNow - hcJan) / hcJan) * 100) : 0;
  const potensi = hcTarget > 0 ? Math.round((hcNow / hcTarget) * 100) : 0;
  const aiNote = row.status === "completed" && row.result?.trim()
    ? `Program berhasil dieksekusi. Best Practice: replikasi pola "${row.program}" ke cluster serupa (potensi ${potensi}%).`
    : row.status === "overdue"
      ? `Program overdue tanpa Hasil. Rekomendasi: evaluasi PIC ${row.pic || "-"}, jadwalkan Site Visit dan update kolom Hasil untuk closing.`
      : row.status === "onprogress"
        ? `Program aktif ${pct}%. Pantau progres mingguan, siapkan dokumentasi Hasil menjelang End Date.`
        : `Program akan dimulai. Pastikan resource PIC ${row.pic || "-"} & alignment dengan cluster ${row.cluster}.`;

  const patchDates = (startDate: string, endDate: string) => {
    const s = startDate || row.startDate;
    const e = endDate || row.endDate;
    const ms = s && e ? new Date(e).getTime() - new Date(s).getTime() : 0;
    const durationDays = ms > 0 ? Math.round(ms / 86400000) + 1 : row.durationDays;
    onUpdate(row.id, { startDate, endDate, durationDays, status: computeActionStatus(startDate, endDate, row.result) });
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${status.ring} ${status.color}`} variant="outline">
              {status.label}
            </Badge>
            <DialogTitle className="font-display">{row.program || "—"}</DialogTitle>
            <select
              value={row.status}
              onChange={(e) => onUpdate(row.id, { status: e.target.value as ActionPlanStatus })}
              className="ml-auto h-7 rounded-md border border-input bg-background px-2 text-xs"
            >
              {COLUMNS.map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>
          <DialogDescription>
            {row.cluster} · PIC: {row.pic || "-"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Left: Program Detail */}
          <div className="space-y-3 md:col-span-2">
            <Card className="glass-card border-0">
              <CardContent className="space-y-3 p-4 text-sm">
                <div className="text-xs font-semibold text-muted-foreground">Edit Manual (perubahan tersimpan otomatis)</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">OLT / Cluster</Label>
                    <Input className="h-8" value={row.cluster} onChange={(e) => onUpdate(row.id, { cluster: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">PIC</Label>
                    <Input className="h-8" value={row.pic} onChange={(e) => onUpdate(row.id, { pic: e.target.value })} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px]">Program</Label>
                    <Input className="h-8" value={row.program} onChange={(e) => onUpdate(row.id, { program: e.target.value })} list="program-options" />
                    <datalist id="program-options">
                      {PROGRAM_OPTIONS.map((p) => <option key={p} value={p} />)}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Start Date</Label>
                    <Input type="date" className="h-8" value={row.startDate} onChange={(e) => patchDates(e.target.value, row.endDate)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">End Date</Label>
                    <Input type="date" className="h-8" value={row.endDate} onChange={(e) => patchDates(row.startDate, e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Info label="Start Date" value={fmtDate(row.startDate)} />
                  <Info label="End Date" value={fmtDate(row.endDate)} />
                  <Info label="Durasi" value={`${row.durationDays} hari`} />
                  <Info label="Progress" value={`${pct}%`} />
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">Progress Timeline</div>
                  <Progress value={pct} className="h-2" />
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">Catatan / Keterangan (editable)</div>
                  <Textarea
                    rows={3}
                    value={row.description || ""}
                    onChange={(e) => onUpdate(row.id, { description: e.target.value })}
                    placeholder="Update catatan progres realtime…"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
                    <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-muted-foreground">Hasil / Outcome (editable)</span>
                  </div>
                  <Textarea
                    rows={2}
                    value={row.result || ""}
                    onChange={(e) => onUpdate(row.id, { result: e.target.value })}
                    placeholder="Catat outcome program di sini…"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0">
              <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="font-display text-sm">AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{aiNote}</CardContent>
            </Card>
          </div>

          {/* Right: Smart Relations */}
          <div className="space-y-3">
            <Card className="glass-card border-0">
              <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
                <Link2 className="h-4 w-4 text-primary" />
                <CardTitle className="font-display text-sm">Smart Relation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <Info label="Kabupaten" value={meta?.kabupaten || "-"} />
                <Info label="Provinsi" value={meta?.provinsi || "-"} />
                <Info label="HC Juni" value={hcNow.toLocaleString()} />
                <Info label="Target HC 2026" value={hcTarget.toLocaleString()} />
                <Info label="Growth (Jan→Jun)" value={`${growth}%`} />
                <Info label="Potensi Realisasi" value={`${potensi}%`} />
                <Info label="Total Ticket" value={tickets.toLocaleString()} />
                <Info label="Kompetitor" value={comps.length ? Array.from(new Set(comps.map((c) => c.competitor))).slice(0, 3).join(", ") : "-"} />
                {a && (
                  <>
                    <Info label="AE" value={a.aeName || "-"} />
                    <Info label="Tingkat Potensi" value={a.potential || "-"} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
