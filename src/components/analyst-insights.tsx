import { useMemo, useState } from "react";
import { Brain, ClipboardPlus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildStructuredInsights, type InsightSeverity, type StructuredInsight } from "@/lib/insight-engine";
import type { FilteredCluster } from "@/hooks/use-global-filters";
import { useDataStore } from "@/lib/store";
import { useRole } from "@/hooks/use-role";

const TONE: Record<InsightSeverity, { badge: string; bar: string; label: string }> = {
  kritis: { badge: "bg-destructive/15 text-destructive", bar: "border-l-destructive", label: "Kritis" },
  perhatian: { badge: "bg-warning/15 text-warning", bar: "border-l-warning", label: "Perhatian" },
  positif: { badge: "bg-success/15 text-success", bar: "border-l-success", label: "Positif" },
  info: { badge: "bg-info/15 text-info", bar: "border-l-info", label: "Informasi" },
};

/** Analysis Engine: insight terstruktur (temuan, metrik, penyebab, dampak, rekomendasi). */
export function AnalystInsights({
  rows,
  curLabel,
  prevLabel,
  limit = 6,
  title = "Analyst Insight Engine",
}: {
  rows: FilteredCluster[];
  curLabel: string;
  prevLabel: string;
  limit?: number;
  title?: string;
}) {
  const insights = useMemo(() => buildStructuredInsights(rows, curLabel, prevLabel, limit), [rows, curLabel, prevLabel, limit]);
  if (!insights.length) return null;

  return (
    <Card className="glass-card border-0">
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <CardTitle className="font-display text-base">{title}</CardTitle>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {insights.length} temuan
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {insights.map((it) => (
          <InsightItem key={it.id} insight={it} />
        ))}
      </CardContent>
    </Card>
  );
}

function InsightItem({ insight }: { insight: StructuredInsight }) {
  const [open, setOpen] = useState(false);
  const addActionPlans = useDataStore((s) => s.addActionPlans);
  const { canPlan } = useRole();
  const tone = TONE[insight.severity];

  const createPlan = () => {
    const today = new Date();
    const end = new Date(today.getTime() + 14 * 86400000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    addActionPlans([
      {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pic: "Belum ditentukan",
        cluster: insight.cluster,
        program: insight.recommendation.length > 80 ? insight.recommendation.slice(0, 77) + "…" : insight.recommendation,
        startDate: iso(today),
        endDate: iso(end),
        description: `Temuan: ${insight.finding}\nPenyebab: ${insight.cause}\nDampak: ${insight.impact}`,
        result: "",
        status: "planned",
        durationDays: 14,
      },
    ]);
    toast.success("Insight dijadikan Action Plan");
  };

  return (
    <div className={`rounded-xl border-l-4 bg-muted/30 p-3 ${tone.bar}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`${tone.badge} border-0 text-[10px]`}>{tone.label}</Badge>
        <span className="text-[11px] font-medium text-muted-foreground">{insight.cluster}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium leading-snug">{insight.finding}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {insight.metrics.map((m) => (
          <span key={m.label} className="rounded-md bg-background/70 px-2 py-1 text-[11px]">
            <span className="text-muted-foreground">{m.label}: </span>
            <span className="font-semibold">{m.value}</span>
          </span>
        ))}
      </div>
      {open && (
        <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Dugaan penyebab: </span>
            {insight.cause}
          </p>
          <p>
            <span className="font-semibold text-foreground">Dampak bisnis: </span>
            {insight.impact}
          </p>
          <p>
            <span className="font-semibold text-foreground">Rekomendasi: </span>
            {insight.recommendation}
          </p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
          {open ? "Sembunyikan analisa" : "Lihat analisa lengkap"}
        </Button>
        {canPlan && (
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-success" onClick={createPlan}>
            <ClipboardPlus className="mr-1 h-3.5 w-3.5" /> Jadikan Action Plan
          </Button>
        )}
      </div>
    </div>
  );
}
