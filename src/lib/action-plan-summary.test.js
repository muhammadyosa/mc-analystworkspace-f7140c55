import { expect, test } from "bun:test";
import { summarizeActions, effectiveAction } from "./action-plan-summary.ts";

const task = (id, status, extra = {}) => ({
  id,
  cluster: "Cluster A",
  program: id,
  pic: "Yosa",
  startDate: "2026-01-01",
  endDate: "2099-01-01",
  status,
  statusManual: true,
  description: "",
  result: "",
  durationDays: 1,
  ...extra,
});
test("joins all cards by normalized cluster without including another cluster", () => {
  const s = summarizeActions(
    [
      task("1", "planned"),
      task("2", "onprogress"),
      task("3", "completed"),
      task("4", "planned", { cluster: "B" }),
    ],
    " CLUSTER   A ",
  );
  expect(s.total).toBe(3);
  expect(s.counts).toEqual({ planned: 1, onprogress: 1, completed: 1, overdue: 0, reschedule: 0 });
  expect(s.progress).toBe(33);
});
test("overdue excludes completed tasks and checks target dates including reschedules", () => {
  const s = summarizeActions(
    [
      task("1", "reschedule", { endDate: "2026-10-21" }),
      task("2", "completed", { endDate: "2026-10-20" }),
      task("3", "planned", { endDate: "2026-10-22" }),
    ],
    "Cluster A",
    new Date("2026-10-22T12:00:00"),
  );
  expect(s.overdue.map((r) => r.id)).toEqual(["1"]);
});
test("manual Kanban moves retain To Do and In Progress despite date derivation", () => {
  expect(effectiveAction(task("1", "planned", { endDate: "2000-01-01" })).status).toBe("planned");
  expect(effectiveAction(task("2", "onprogress", { startDate: "2099-01-01" })).status).toBe(
    "onprogress",
  );
});
test("addition, edit, completion and deletion recompute summary from source", () => {
  const plans = [task("1", "planned")];
  expect(summarizeActions(plans, "Cluster A").total).toBe(1);
  plans.push(task("2", "onprogress"));
  expect(summarizeActions(plans, "Cluster A").counts.onprogress).toBe(1);
  plans[1] = task("2", "completed", {
    pic: "Tim",
    result: "Visit selesai",
    updatedAt: "2026-10-22T17:00:00Z",
  });
  const s = summarizeActions(plans, "Cluster A");
  expect(s.progress).toBe(50);
  expect(s.pics).toEqual(["Yosa", "Tim"]);
  expect(s.recent.result).toBe("Visit selesai");
  plans.splice(1, 1);
  expect(summarizeActions(plans, "Cluster A").counts.completed).toBe(0);
});
test("no tasks has zero progress and no invented activity", () => {
  const s = summarizeActions([], "Cluster A");
  expect(s.total).toBe(0);
  expect(s.progress).toBe(0);
  expect(s.recent).toBeUndefined();
});
