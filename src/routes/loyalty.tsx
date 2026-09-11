import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, Ticket, ShieldCheck, Plus, ChevronRight } from "lucide-react";
import { useDataStore } from "@/lib/store";
import { computeActionStatus, type ClusterRow } from "@/lib/excel";

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Customer Loyalty — Iconnet Workspace" }] }),
  component: LoyaltyPage,
});

function LoyaltyPage() {
  const clusters = useDataStore((s) => s.clusters);
  const addActionPlans = useDataStore((s) => s.addActionPlans);
  const insights = useMemo(() => {
    const decline = [...clusters].filter((c) => c.deltaMeiJuni < 0).sort((a, b) => a.deltaMeiJuni - b.deltaMeiJuni).slice(0, 10);
    const highRisk = [...clusters].filter((c) => c.deltaMeiJuni < 0 && c.ticket > 3).slice(0, 10);
    const topTicket = [...clusters].sort((a, b) => b.ticket - a.ticket).slice(0, 10);
    return { decline, highRisk, topTicket };
  }, [clusters]);

  if (!clusters.length) return (<><AppHeader title="Customer Loyalty" /><div className="p-6"><EmptyState /></div></>);

  const addRetention = (c: ClusterRow) => {
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
        description: `Auto-generated dari Customer Loyalty — Δ HC Aktif ${c.deltaMeiJuni}, Ticket ${c.ticket}`,
        result: "",
        status: computeActionStatus(today, end, ""),
        durationDays: 15,
      },
    ]);
  };

  const Row = ({ title, items, icon: Icon, tone }: { title: string; items: ClusterRow[]; icon: React.ComponentType<{ className?: string }>; tone: string }) => (
    <Card className="glass-card border-0">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4 text-white" /></div>
        <CardTitle className="font-display text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-sm">
              <Link
                to="/cluster/$name"
                params={{ name: c.cluster }}
                className="min-w-0 flex-1 group"
              >
                <p className="truncate font-medium group-hover:text-primary">
                  {c.cluster} <ChevronRight className="inline h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                </p>
                <p className="truncate text-xs text-muted-foreground">{c.kabupaten}</p>
              </Link>
              <div className="text-right text-xs">
                <div className={c.deltaMeiJuni < 0 ? "text-destructive" : "text-success"}>{c.deltaMeiJuni < 0 ? "Δ HC Aktif Turun " : "Δ HC Aktif "}{c.deltaMeiJuni}</div>
                <div className="text-muted-foreground">Ticket {c.ticket}</div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => addRetention(c)}
                title="Tambah program Retention ke Action Plan"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <AppHeader title="Customer Loyalty" subtitle="Deteksi risiko churn dan rekomendasi retensi" />
      <div className="space-y-4 p-4 sm:p-6">
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

