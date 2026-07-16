import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  GripVertical,
  ListChecks,
  Sparkles,
  Target,
  Users,
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
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useDataStore } from "@/lib/store";
import { computeActionStatus, type ActionPlanRow, type ActionPlanStatus } from "@/lib/excel";

export const Route = createFileRoute("/action-plan")({
  head: () => ({ meta: [{ title: "Action Plan — Iconnet Workspace" }] }),
  component: ActionPlanPage,
});

const STATUS_META: Record<
  ActionPlanStatus,
  { label: string; color: string; dot: string; ring: string; icon: typeof Clock }
> = {
  planned: { label: "Planned", color: "text-sky-500", dot: "bg-sky-500", ring: "ring-sky-500/30", icon: CalendarDays },
  onprogress: { label: "On Progress", color: "text-amber-500", dot: "bg-amber-500", ring: "ring-amber-500/30", icon: Clock },
  completed: { label: "Completed", color: "text-emerald-500", dot: "bg-emerald-500", ring: "ring-emerald-500/30", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "text-rose-500", dot: "bg-rose-500", ring: "ring-rose-500/30", icon: AlertTriangle },
};

const COLUMNS: ActionPlanStatus[] = ["planned", "onprogress", "completed", "overdue"];

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

function DraggableCard({ row }: { row: ActionPlanRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;
  const meta = STATUS_META[row.status];
  const pct = progressOf(row);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card group rounded-xl border-0 p-3 shadow-sm ring-1 ${meta.ring}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{row.cluster || "—"}</p>
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

function KanbanColumn({ status, rows }: { status: ActionPlanStatus; rows: ActionPlanRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  const Icon = meta.icon;
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
        {rows.map((r) => (
          <DraggableCard key={r.id} row={r} />
        ))}
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
  const { actionPlans, clusters, tickets, overrideActionPlanStatus } = useDataStore();
  const [search, setSearch] = useState("");
  const [filterPic, setFilterPic] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Recompute status live (some rows may have moved from planned→onprogress by date)
  const rows = useMemo(() => {
    return actionPlans.map((r) => ({
      ...r,
      status:
        r.status === "completed"
          ? r.status
          : computeActionStatus(r.startDate, r.endDate),
    }));
  }, [actionPlans]);

  const pics = useMemo(
    () => Array.from(new Set(rows.map((r) => r.pic).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterPic && r.pic !== filterPic) return false;
      if (!s) return true;
      return (
        r.cluster.toLowerCase().includes(s) ||
        r.program.toLowerCase().includes(s) ||
        r.pic.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s)
      );
    });
  }, [rows, search, filterPic]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const planned = rows.filter((r) => r.status === "planned").length;
    const onprogress = rows.filter((r) => r.status === "onprogress").length;
    const completed = rows.filter((r) => r.status === "completed").length;
    const overdue = rows.filter((r) => r.status === "overdue").length;
    const uniquePic = new Set(rows.map((r) => r.pic).filter(Boolean)).size;
    const uniqueCluster = new Set(rows.map((r) => r.cluster).filter(Boolean)).size;
    const completion = total ? Math.round((completed / total) * 100) : 0;
    return { total, planned, onprogress, completed, overdue, uniquePic, uniqueCluster, completion };
  }, [rows]);

  // AI-ish recommendation engine
  const recommendations = useMemo(() => {
    const out: { severity: "high" | "med" | "low"; title: string; detail: string }[] = [];
    const overdueList = rows.filter((r) => r.status === "overdue");
    if (overdueList.length) {
      out.push({
        severity: "high",
        title: `${overdueList.length} program terlambat`,
        detail: `Segera lakukan Site Visit & review komitmen PIC: ${Array.from(
          new Set(overdueList.map((r) => r.pic).filter(Boolean)),
        )
          .slice(0, 5)
          .join(", ") || "-"}.`,
      });
    }
    const clustersWithPlan = new Set(rows.map((r) => r.cluster));
    const clustersNoPlan = clusters
      .map((c) => c.cluster)
      .filter((c) => c && !clustersWithPlan.has(c));
    if (clustersNoPlan.length) {
      out.push({
        severity: "med",
        title: `${clustersNoPlan.length} cluster belum memiliki program`,
        detail: `Contoh: ${clustersNoPlan.slice(0, 6).join(", ")}. Rekomendasi: Branding lokal & Program Loyalty.`,
      });
    }
    // Ticket-heavy clusters without on-progress program
    const ticketByCluster = new Map<string, number>();
    for (const t of tickets) ticketByCluster.set(t.cluster, (ticketByCluster.get(t.cluster) ?? 0) + t.ticket);
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
    if (kpis.completion >= 70) {
      out.push({
        severity: "low",
        title: `Completion rate sehat (${kpis.completion}%)`,
        detail: "Pertahankan momentum, siapkan program acquisition baru untuk kuartal berikutnya.",
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
  }, [rows, clusters, tickets, kpis.completion]);

  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id as ActionPlanStatus | undefined;
    if (!overId) return;
    overrideActionPlanStatus(e.active.id as string, overId);
  };

  return (
    <>
      <AppHeader
        title="Action Plan"
        subtitle="Timeline, Kanban, Kalender & AI Recommendation berbasis ACTION PLAN.xlsx"
      />
      <div className="space-y-4 p-4 sm:p-6">
        {/* KPI Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <KpiCard icon={ListChecks} label="Total Program" value={kpis.total} sub={`${kpis.uniqueCluster} cluster`} />
          <KpiCard icon={CalendarDays} label="Planned" value={kpis.planned} color="text-sky-500" />
          <KpiCard icon={Clock} label="On Progress" value={kpis.onprogress} color="text-amber-500" />
          <KpiCard icon={CheckCircle2} label="Completed" value={kpis.completed} color="text-emerald-500" />
          <KpiCard icon={AlertTriangle} label="Overdue" value={kpis.overdue} color="text-rose-500" />
          <KpiCard icon={Users} label="PIC Terlibat" value={kpis.uniquePic} color="text-primary" />
          <KpiCard icon={Target} label="Completion" value={`${kpis.completion}%`} sub="rate keseluruhan" />
        </div>

        {/* Toolbar */}
        <Card className="glass-card border-0">
          <CardContent className="flex flex-wrap items-center gap-2 p-3">
            <Input
              placeholder="Cari cluster / program / PIC…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 max-w-xs"
            />
            <select
              value={filterPic}
              onChange={(e) => setFilterPic(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">Semua PIC</option>
              {pics.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div className="ml-auto text-[11px] text-muted-foreground">
              {filtered.length} dari {rows.length} program
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
                  <KanbanColumn key={c} status={c} rows={filtered.filter((r) => r.status === c)} />
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
              Belum ada data. Upload <code className="font-mono">ACTION PLAN.xlsx</code> di Settings →
              Data Management.
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
