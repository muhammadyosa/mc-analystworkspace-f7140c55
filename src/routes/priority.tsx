import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataStore, computePriority, recommendStrategy } from "@/lib/store";
import { useGlobalClusters } from "@/hooks/use-global-filters";
import { GlobalFilterBar } from "@/components/global-filter";
import { AnalystInsights } from "@/components/analyst-insights";

export const Route = createFileRoute("/priority")({
  head: () => ({ meta: [{ title: "Priority Engine — MCA Workspace" }] }),
  component: PriorityPage,
});

function PriorityPage() {
  const allClusters = useDataStore((s) => s.clusters);
  const { rows: clusters } = useGlobalClusters();
  const scored = useMemo(() => {
    const max = Math.max(...clusters.map((c) => c.ticket), 1);
    return clusters
      .map((c) => ({ ...c, ...computePriority(c, max), strategy: recommendStrategy(c) }))
      .sort((a, b) => b.score - a.score);
  }, [clusters]);

  if (!allClusters.length) return (<><AppHeader title="Priority Engine" /><div className="p-6"><EmptyState /></div></>);

  const groups = {
    Tinggi: scored.filter((s) => s.level === "Tinggi"),
    Sedang: scored.filter((s) => s.level === "Sedang"),
    Rendah: scored.filter((s) => s.level === "Rendah"),
  };

  return (
    <>
      <AppHeader title="Priority Engine" subtitle="Scoring cluster + rekomendasi strategi" />
      <div className="space-y-4 p-4 sm:p-6">
        <GlobalFilterBar />
        {!clusters.length && (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Tidak ada cluster yang cocok dengan filter saat ini.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          {(["Tinggi", "Sedang", "Rendah"] as const).map((lvl) => (
            <Card key={lvl} className="glass-card border-0">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Priority {lvl}</p>
                <p className={`font-display text-3xl font-bold ${
                  lvl === "Tinggi" ? "text-destructive" : lvl === "Sedang" ? "text-warning" : "text-success"
                }`}>
                  {groups[lvl].length}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {(["Tinggi", "Sedang", "Rendah"] as const).map((lvl) =>
          groups[lvl].length ? (
            <Card key={lvl} className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <span className={`h-2 w-2 rounded-full ${
                    lvl === "Tinggi" ? "bg-destructive" : lvl === "Sedang" ? "bg-warning" : "bg-success"
                  }`} />
                  Priority {lvl}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {groups[lvl].slice(0, 15).map((c) => (
                    <Link
                      key={c.id}
                      to="/cluster/$name"
                      params={{ name: encodeURIComponent(c.cluster) }}
                      className="group rounded-xl border border-border/60 bg-muted/30 p-3 transition hover:border-primary/60 hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-sm">{c.cluster}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.kabupaten}</p>
                        </div>
                        <Badge variant="outline" className="tabular-nums">{c.score}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[10px]">{c.strategy.type}</Badge>
                        {c.strategy.actions.slice(0, 2).map((a) => (
                          <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null,
        )}
      </div>
    </>
  );
}
