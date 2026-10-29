import { expect, test } from "bun:test";
import { competitorProfiles, competitorComparison, rankChurn } from "./competitor-profiling.ts";
import { churnPotential } from "./cluster-profiling.ts";
const cluster = { cluster: " OLT A ", kabupaten: "Kab A", provinsi: "Prov A" };
const offer = { id: "1", cluster: "olt a", kabupaten: "kab a", provinsi: "prov a", competitor: "Provider A", price: 200000, promo: "", promoCategory: "Lainnya" };
test("normalized cluster excludes conflicting territories and other clusters", () => {
  expect(competitorProfiles(cluster, [offer, { ...offer, id: "2", provinsi: "Prov B" }, { ...offer, id: "3", cluster: "OLT B" }], []).map((r) => r.id)).toEqual(["1"]);
});
test("territory offers require matching kabupaten and province", () => {
  expect(competitorProfiles(cluster, [{ ...offer, cluster: "" }, { ...offer, id: "2", cluster: "", provinsi: "" }], []).map((r) => r.id)).toEqual(["1"]);
});
test("latest analyst grouped offer keeps actual price without splitting", () => {
  const rows = [{ id: "a", cluster: "olt a", profilingDate: "2026-10-01", competitor: "A, B", competitorPrice: 200000, competitorPromo: "Actual" }, { id: "b", cluster: "OLT A", profilingDate: "2026-10-20", competitor: "A, B", competitorPrice: 210000, competitorPromo: "Updated" }];
  const result = competitorProfiles(cluster, [], rows);
  expect(result).toHaveLength(1);
  expect(result[0].competitor).toBe("A, B");
  expect(result[0].price).toBe(210000);
});
test("missing ICONNET prices never generate price gaps", () => {
  expect(competitorComparison(offer).delta).toBeNull();
  expect(competitorComparison({ ...offer, iconnetPrice: 0 }).delta).toBeNull();
});
test("comparison uses recorded prices and free installation", () => {
  const result = competitorComparison({ ...offer, iconnetPrice: 250000, installationCost: 0, iconnetInstallationCost: 50000 });
  expect(result.delta).toBe(-50000);
  expect(result.insights.some((text) => text.includes("50.000"))).toBe(true);
});
test("risk ranks reuse churn scores and share ties", () => {
  const ch = churnPotential({ hc: 80, delta: -20, churn: 10, ticket: 50 }, 50);
  expect(ch.score).toBe(77);
  const ranks = rankChurn([{ id: "low", cluster: "Low", ch: { score: 0 } }, { id: "high", cluster: "High", ch }, { id: "tie", cluster: "Tie", ch }]);
  expect(ranks.get("high")).toBe(1);
  expect(ranks.get("tie")).toBe(1);
  expect(ranks.get("low")).toBe(3);
});
test("no actual offers yields no competitor profiles", () => {
  expect(competitorProfiles(cluster, [], [])).toEqual([]);
});