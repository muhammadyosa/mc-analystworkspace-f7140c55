import type { AnalystRow } from "./excel";

export type PotentialCategory = "tinggi" | "sedang" | "rendah";

/** Interpret the existing assessment labels, not a new numerical score. */
export function potentialCategory(value: unknown): PotentialCategory | null {
  if (typeof value !== "string") return null;
  const label = value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  // Specific qualifiers must precede the generic "potensial" match.
  if (/\b(rendah|kurang|tidak)\b/.test(label)) return "rendah";
  if (/\b(sedang|cukup)\b/.test(label)) return "sedang";
  if (/\b(tinggi|potensial)\b/.test(label)) return "tinggi";
  return null;
}

function assessmentTime(row: AnalystRow): number {
  for (const raw of [row.timestamp, row.profilingDate]) {
    if (!raw?.trim()) continue;
    const serial = Number(raw);
    if (Number.isFinite(serial) && serial > 0) return (serial - 25569) * 86400000;
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NEGATIVE_INFINITY;
}

/** One actual cluster, one latest assessment; later rows break equal/missing-date ties. */
export function latestClusterAssessments(rows: AnalystRow[]): AnalystRow[] {
  const latest = new Map<string, AnalystRow>();
  for (const row of rows) {
    const key = row.cluster?.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
    if (!key) continue;
    const previous = latest.get(key);
    if (!previous || assessmentTime(row) >= assessmentTime(previous)) latest.set(key, row);
  }
  return [...latest.values()];
}

export function summarizePotential(rows: AnalystRow[]) {
  const counts = { tinggi: 0, sedang: 0, rendah: 0, unknown: 0 };
  for (const row of latestClusterAssessments(rows)) {
    const category = potentialCategory(row.potential);
    if (category) counts[category]++;
    else counts.unknown++;
  }
  return counts;
}

export function potentialPercent(count: number, total: number): number {
  return Number.isFinite(count) && Number.isFinite(total) && count >= 0 && total > 0
    ? (count / total) * 100 : 0;
}