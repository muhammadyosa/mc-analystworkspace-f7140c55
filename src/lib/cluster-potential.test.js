import { describe, expect, test } from "bun:test";
import {
  latestClusterAssessments,
  potentialCategory,
  potentialPercent,
  summarizePotential,
} from "./cluster-potential";

const row = (cluster, potential, timestamp = "2026-09-01") => ({ cluster, potential, timestamp });

describe("actual cluster potential", () => {
  test("existing high assessment labels stay high", () => {
    expect(["Tinggi", "🟢 Potensial", "🟢 Sangat Potensial"].map(potentialCategory)).toEqual([
      "tinggi",
      "tinggi",
      "tinggi",
    ]);
  });
  test("cukup potensial and sedang are medium, not generic high", () => {
    expect(["🟡 Cukup Potensial", "Sedang"].map(potentialCategory)).toEqual(["sedang", "sedang"]);
  });
  test("kurang/tidak potensial and rendah are low", () => {
    expect(["🔴 Kurang Potensial", "⚫ Tidak Potensial", "Rendah"].map(potentialCategory)).toEqual([
      "rendah",
      "rendah",
      "rendah",
    ]);
  });
  test("invalid assessments are unknown, not low", () => {
    expect([undefined, NaN, "", "N/A", "-"].map(potentialCategory)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });
  test("counts distinct clusters using latest assessment, regardless of input order", () => {
    const data = [
      row(" A ", "Rendah", "2026-10-02"),
      row("a", "Tinggi"),
      row("B", "Sedang"),
      row("C", "N/A"),
      row(" ", "Tinggi"),
    ];
    expect(latestClusterAssessments(data).length).toBe(3);
    expect(summarizePotential(data)).toEqual({ tinggi: 0, sedang: 1, rendah: 1, unknown: 1 });
  });
  test("percentage denominator contains only valid categories", () => {
    expect(potentialPercent(1, 2)).toBe(50);
    expect(potentialPercent(1, 3)).toBeCloseTo(33.333333);
    expect(potentialPercent(0, 0)).toBe(0);
  });
  test("add, edit, delete and filtered subsets recompute without stale counts", () => {
    const data = [row("A", "Tinggi"), row("B", "Sedang")];
    expect(summarizePotential(data).tinggi).toBe(1);
    expect(summarizePotential([...data, row("C", "Rendah")]).rendah).toBe(1);
    expect(summarizePotential([row("A", "Rendah"), data[1]]).tinggi).toBe(0);
    expect(summarizePotential(data.filter((r) => r.cluster === "B"))).toEqual({
      tinggi: 0,
      sedang: 1,
      rendah: 0,
      unknown: 0,
    });
    expect(summarizePotential([])).toEqual({ tinggi: 0, sedang: 0, rendah: 0, unknown: 0 });
  });
});
