import { computeActionStatus, type ActionPlanRow, type ActionPlanStatus } from "./excel";

export const actionStatusLabels: Record<ActionPlanStatus, string> = {
  planned: "To Do",
  onprogress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
  reschedule: "Reschedule",
};
export const clusterKey = (name: string) =>
  name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

export function effectiveAction(row: ActionPlanRow): ActionPlanRow {
  return {
    ...row,
    status:
      row.statusManual || row.status === "completed" || row.status === "reschedule"
        ? row.status
        : computeActionStatus(row.startDate, row.endDate, row.result),
  };
}

export function summarizeActions(plans: ActionPlanRow[], cluster: string, now = new Date()) {
  const tasks = plans
    .filter((r) => clusterKey(r.cluster) === clusterKey(cluster))
    .map(effectiveAction);
  const counts = { planned: 0, onprogress: 0, completed: 0, overdue: 0, reschedule: 0 };
  tasks.forEach((r) => counts[r.status]++);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter(
    (r) =>
      r.status !== "completed" &&
      (r.status === "overdue" || (!!r.endDate && new Date(`${r.endDate}T00:00:00`) < today)),
  );
  const dates = tasks
    .map((r) => r.endDate)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)))
    .sort();
  const recent = tasks
    .filter((r) => r.updatedAt)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
  const followUps = tasks.filter((r) => r.result?.trim());
  const insights = tasks.length
    ? [
        `${tasks.length} Action Plan: ${counts.planned} To Do, ${counts.onprogress} In Progress, ${counts.completed} Completed, ${counts.overdue} Overdue, ${counts.reschedule} Reschedule.`,
        `Penyelesaian ${Math.round((counts.completed / tasks.length) * 100)}% · ${overdue.length} task melewati target tanggal.`,
      ]
    : ["Belum ada Action Plan untuk cluster ini."];
  const advice = tasks.length
    ? [
        ...overdue.map(
          (r) =>
            `Tindak lanjuti task overdue “${r.program}” bersama PIC ${r.pic || "—"} (target ${r.endDate || "—"}).`,
        ),
        ...tasks
          .filter((r) => r.status === "onprogress")
          .map(
            (r) =>
              `Pantau “${r.program}” bersama PIC ${r.pic || "—"} hingga target ${r.endDate || "—"}.`,
          ),
        ...(counts.completed === tasks.length
          ? ["Seluruh Action Plan selesai; evaluasi hasil dan kebutuhan tindak lanjut."]
          : []),
      ]
    : ["Susun Action Plan berdasarkan rekomendasi retention cluster."];
  return {
    tasks,
    counts,
    total: tasks.length,
    progress: tasks.length ? Math.round((counts.completed / tasks.length) * 100) : 0,
    overdue,
    pics: [...new Set(tasks.map((r) => r.pic.trim()).filter(Boolean))],
    dates,
    recent,
    followUps,
    insights,
    advice,
  };
}

export function actionSummaryText(s: ReturnType<typeof summarizeActions>) {
  return [
    ...s.insights,
    `PIC Action Plan: ${s.pics.join(", ") || "—"}`,
    ...s.tasks.map(
      (r) =>
        `- ${r.program} · ${actionStatusLabels[r.status]} · PIC ${r.pic || "—"} · Target ${r.endDate || "—"}${r.result ? ` · Hasil: ${r.result}` : ""}`,
    ),
    ...(s.recent ? [`Aktivitas terbaru: ${s.recent.program} · ${s.recent.updatedAt}`] : []),
    ...s.advice,
  ].join("\n");
}
