import { useState } from "react";
import { Crosshair, RotateCcw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  KPI_METRIC_META,
  usePrefsStore,
  type KpiMetric,
} from "@/lib/prefs";

export type KpiActuals = Record<KpiMetric, number>;

const fmt = (v: number, metric: KpiMetric) =>
  metric === "ticketPer100HC" ? v.toFixed(1) : v.toLocaleString("id-ID", { maximumFractionDigits: 1 });

/** Kartu Target & KPI: membandingkan realisasi periode berjalan dengan target yang diatur pengguna. */
export function KpiTargetsCard({ actuals, periodLabel }: { actuals: KpiActuals; periodLabel: string }) {
  const targets = usePrefsStore((s) => s.kpiTargets);
  const setKpiTarget = usePrefsStore((s) => s.setKpiTarget);
  const resetKpiTargets = usePrefsStore((s) => s.resetKpiTargets);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<KpiMetric, string>>({ hcGrowth: "", ticketPer100HC: "", highRisk: "" });

  const achieved = targets.filter((t) =>
    t.direction === "min" ? actuals[t.metric] >= t.target : actuals[t.metric] <= t.target,
  ).length;

  const openDialog = () => {
    const next = { ...draft };
    targets.forEach((t) => {
      next[t.metric] = String(t.target);
    });
    setDraft(next);
    setOpen(true);
  };

  const save = () => {
    (Object.keys(draft) as KpiMetric[]).forEach((m) => {
      const v = Number(draft[m]);
      if (Number.isFinite(v) && v >= 0) setKpiTarget(m, v);
    });
    setOpen(false);
    toast.success("Target KPI diperbarui");
  };

  return (
    <Card className="glass-card border-0">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary">
            <Crosshair className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="font-display text-base">Target & KPI — {periodLabel}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {achieved} dari {targets.length} target tercapai
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openDialog}>
              <Settings2 className="h-3.5 w-3.5" />
              Atur Target
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Atur Target KPI</DialogTitle>
              <DialogDescription>
                Target dipakai untuk mengukur capaian periode berjalan di Dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {targets.map((t) => {
                const meta = KPI_METRIC_META[t.metric];
                return (
                  <div key={t.id} className="space-y-1.5">
                    <Label htmlFor={`kpi-${t.metric}`}>
                      {meta.label}
                      {meta.unit ? ` (${meta.unit})` : ""}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        — {t.direction === "min" ? "minimal" : "maksimal"}
                      </span>
                    </Label>
                    <Input
                      id={`kpi-${t.metric}`}
                      type="number"
                      min={0}
                      step="any"
                      value={draft[t.metric]}
                      onChange={(e) => setDraft((d) => ({ ...d, [t.metric]: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">{meta.hint}</p>
                  </div>
                );
              })}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  resetKpiTargets();
                  setOpen(false);
                  toast.success("Target dikembalikan ke bawaan");
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Bawaan
              </Button>
              <Button onClick={save}>Simpan Target</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {targets.map((t) => {
          const meta = KPI_METRIC_META[t.metric];
          const actual = actuals[t.metric];
          const ok = t.direction === "min" ? actual >= t.target : actual <= t.target;
          const pct =
            t.target > 0
              ? Math.min(100, Math.max(4, (t.direction === "min" ? actual / t.target : t.target / Math.max(actual, 0.0001)) * 100))
              : 100;
          return (
            <div key={t.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{meta.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {fmt(actual, t.metric)}
                    {meta.unit === "%" ? "%" : ""} / target {t.direction === "min" ? "≥" : "≤"} {fmt(t.target, t.metric)}
                    {meta.unit === "%" ? "%" : meta.unit ? ` ${meta.unit}` : ""}
                  </span>
                  <Badge variant={ok ? "default" : "destructive"} className={ok ? "bg-success text-success-foreground" : ""}>
                    {ok ? "Tercapai" : "Belum"}
                  </Badge>
                </div>
              </div>
              <Progress value={pct} className={`h-2 ${ok ? "[&>div]:bg-success" : "[&>div]:bg-warning"}`} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
