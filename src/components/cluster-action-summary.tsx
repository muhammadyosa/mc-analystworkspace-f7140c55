import { actionStatusLabels, type summarizeActions } from "@/lib/action-plan-summary";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function ClusterActionSummary({
  summary: s,
}: {
  summary: ReturnType<typeof summarizeActions>;
}) {
  return (
    <section className="min-w-0 space-y-3 text-sm" aria-label="Ringkasan Action Plan">
      <h3 className="font-semibold">Action Plan — Kanban</h3>
      {!s.total ? (
        <p className="text-muted-foreground">Belum ada Action Plan untuk cluster ini.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.entries(s.counts).map(([key, count]) => (
              <Badge key={key} variant="secondary">
                {actionStatusLabels[key as keyof typeof s.counts]}: {count}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs">
            <span>
              {s.total} rencana · {s.progress}% selesai
            </span>
            <span className={s.overdue.length ? "text-destructive" : "text-muted-foreground"}>
              {s.overdue.length} task overdue
            </span>
          </div>
          <Progress value={s.progress} className="h-2" />
          <p className="break-words text-xs text-muted-foreground">
            PIC: {s.pics.join(", ") || "—"}
          </p>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {s.tasks.map((r) => (
              <div key={r.id} className="min-w-0 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 break-words font-medium">{r.program || "—"}</p>
                  <Badge variant="outline">{actionStatusLabels[r.status]}</Badge>
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  PIC {r.pic || "—"} · Target {r.endDate || "—"}
                </p>
                {(r.result || r.description) && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs">
                    {r.result ? `Hasil / tindak lanjut: ${r.result}` : r.description}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="break-words text-xs text-muted-foreground">
            {s.recent
              ? `Aktivitas terbaru: ${s.recent.program} · ${actionStatusLabels[s.recent.status]} · ${new Date(s.recent.updatedAt ?? "").toLocaleString("id-ID")}`
              : "Waktu aktivitas terbaru belum tercatat pada data lama."}
          </p>
        </>
      )}
    </section>
  );
}
