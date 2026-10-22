import { expect, test } from "bun:test";
import { churnPotential } from "./cluster-profiling.ts";

test("sharp HC decline with heavy tickets is high churn potential", () => {
  expect(churnPotential({ hc: 80, delta: -20, churn: 10, ticket: 50 }, 50).level).toBe("Tinggi");
});
test("growing cluster without tickets is low churn potential", () => {
  expect(churnPotential({ hc: 100, delta: 5, churn: 0, ticket: 0 }, 50).level).toBe("Rendah");
});
