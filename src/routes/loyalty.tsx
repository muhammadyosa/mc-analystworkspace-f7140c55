import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingDown, Ticket, ShieldCheck, Plus, ChevronRight, CalendarRange } from "lucide-react";
import { useDataStore } from "@/lib/store";
import { computeActionStatus, type ClusterRow } from "@/lib/excel";

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Customer Loyalty — Iconnet Workspace" }] }),
  component: LoyaltyPage,
});

const MONTHS = [
  { key: "januari", label: "Januari" },
  { key: "februari", label: "Februari" },
  { key: "maret", label: "Maret" },
  { key: "april", label: "April" },
  { key: "mei", label: "Mei" },
  { key: "juni", label: "Juni" },
  { key: "juli", label: "Juli" },
  { key: "agustus", label: "Agustus" },
  { key: "september", label: "September" },
  { key: "oktober", label: "Oktober" },
  { key: "november", label: "November" },
  { key: "desember", label: "Desember" },
] as const;

type MonthKey = (typeof MONTHS)[number]["key"];

const hcOf = (c: ClusterRow, m: MonthKey) => (c[m] as number) || 0;
const ticketOf = (c: ClusterRow, m: MonthKey) => c.ticketByMonth?.[m] ?? 0;

type LoyaltyRow = { cluster: ClusterRow; delta: number; ticket: number; hcStart: number; hcEnd: number };

function LoyaltyPage() {
  const clusters = useDataStore((s) => s.clusters);
  const addActionPlans = useDataStore((s) => s.addActionPlans);

  const availableMonths = useMemo(
    () =>
      MONTHS.filter((m) => clusters.some((c) => hcOf(c, m.key) > 0 || ticketOf(c, m.key) > 0)),
    [clusters],
  );

  const [fromKey, setFromKey] = useState<MonthKey | null>(null);
  const [toKey, setToKey] = useState<MonthKey | null>(null);

  const from =
    availableMonths.find((m) => m.key === fromKey) ??
    availableMonths[Math.max(0, availableMonths.length - 2)];
  const to =
    availableMonths.find((m) => m.key === toKey) ??
    availableMonths[availableMonths.length - 1];

  const rangeMonths = useMemo(() => {
    if (!from || !to) return [];
    const a = MONTHS.findIndex((m) => m.key === from.key);
    const b = MONTHS.findIndex((m) => m.key === to.key);
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    return MONTHS.slice(lo, hi + 1);
  }, [from, to]);

  const rows: LoyaltyRow[] = useMemo(
    () =>
      clusters.map((c) => {
        // HC awal = bulan pertama dalam range yang terisi, HC akhir = bulan terakhir yang terisi
        const filled = rangeMonths.filter((m) => hcOf(c, m.key) > 0);
        const hcStart = filled.length ? hcOf(c, filled[0].key) : c.hcAktif || 0;
        const hcEnd = filled.length ? hcOf(c, filled[filled.length - 1].key) : c.hcAktif || 0;
        const delta = filled.length >= 2 ? hcEnd - hcStart : 0;
        const ticket = rangeMonths.reduce((a, m) => a + ticketOf(c, m.key), 0);
        return { cluster: c, delta, ticket, hcStart, hcEnd };
      }),
    [clusters, rangeMonths],
  );

  const insights = useMemo(() => {
    const decline = rows.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 10);
    const highRisk = rows.filter((r) => r.delta < 0 && r.ticket > 3).slice(0, 10);
    const topTicket = [...rows].sort((a, b) => b.ticket - a.ticket).slice(0, 10);
    return { decline, highRisk, topTicket };
  }, [rows]);

  if (!clusters.length) return (<><AppHeader title="Customer Loyalty" /><div className="p-6"><EmptyState /></div></>);

  const rangeLabel = from && to ? `${from.label} – ${to.label}` : "Semua bulan";

  const addRetention = (r: LoyaltyRow) => {
    const c = r.cluster;
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(now + 14 * 86400000).toISOString().slice(0, 10);
    addActionPlans([
      {
        id: `loyalty-${now}-${c.id}`,
        pic: c.pic || "",
        cluster: c.cluster,
        program: "Retention",
        startDate: today,
        endDate: end,
        description: `Auto-generated dari Customer Loyalty (${rangeLabel}) — Δ HC Aktif ${r.delta}, Ticket ${r.ticket}`,
        result: "",
        status: computeActionStatus(today, end, ""),
        durationDays: 15,
      },
    ]);
  };

  const Row = ({ title, items, icon: Icon, tone }: { title: string; items: LoyaltyRow[]; icon: React.ComponentType<{ className?: string }>; tone: string }) => (
    <Card className="glass-card border-0">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4 text-white" /></div>
        <CardTitle className="font-display text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada cluster pada kategori ini untuk rentang {rangeLabel}.</p>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.cluster.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-sm">
                <Link
                  to="/cluster/$name"
                  params={{ name: r.cluster.cluster }}
                  className="min-w-0 flex-1 group"
                >
                  <p className="truncate font-medium group-hover:text-primary">
                    {r.cluster.cluster} <ChevronRight className="inline h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{r.cluster.kabupaten}</p>
                </Link>
                <div className="text-right text-xs">
                  <div className={r.delta < 0 ? "text-destructive" : "text-success"}>
                    {r.delta < 0 ? "Δ HC Aktif Turun " : "Δ HC Aktif "}{r.delta}
                  </div>
                  <div className="text-muted-foreground">Ticket {r.ticket}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => addRetention(r)}
                  title="Tambah program Retention ke Action Plan"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <AppHeader title="Customer Loyalty" subtitle="Deteksi risiko churn dan rekomendasi retensi" />
      <div className="space-y-4 p-4 sm:p-6">
        <Card className="glass-card border-0">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarRange className="h-4 w-4 text-primary" />
              Rentang Analisis
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Select value={from?.key} onValueChange={(v) => setFromKey(v as MonthKey)}>
                <SelectTrigger className="h-9 w-full sm:w-[150px]"><SelectValue placeholder="Dari bulan" /></SelectTrigger>
                <SelectContent>
                  {availableMonths.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">sampai</span>
              <Select value={to?.key} onValueChange={(v) => setToKey(v as MonthKey)}>
                <SelectTrigger className="h-9 w-full sm:w-[150px]"><SelectValue placeholder="Sampai bulan" /></SelectTrigger>
                <SelectContent>
                  {availableMonths.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-[11px]">
                {rows.filter((r) => r.delta < 0).length} cluster turun · {rangeLabel}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-base">Rekomendasi Otomatis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">Site Visit</Badge>
            <Badge variant="secondary">Promo Retensi</Badge>
            <Badge variant="secondary">Koordinasi Teknik</Badge>
            <Badge variant="secondary">Loyalty Program</Badge>
            <Badge variant="secondary">Follow Up Customer</Badge>
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:grid-cols-3">
          <Row title="HC Aktif Turun" items={insights.decline} icon={TrendingDown} tone="bg-destructive" />
          <Row title="Cluster Risiko Tinggi" items={insights.highRisk} icon={AlertTriangle} tone="bg-warning" />
          <Row title="Top Ticket" items={insights.topTicket} icon={Ticket} tone="bg-info" />
        </div>
      </div>
    </>
  );
}
