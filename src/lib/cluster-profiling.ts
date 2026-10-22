import { MONTH_KEYS, MONTH_LABELS } from "./prefs";
import { recommendStrategy } from "./store";
import type { ClusterRow } from "./excel";

export type ChurnLevel = "Tinggi" | "Sedang" | "Rendah";

/** Churn potential from actual data: HC decline, recorded churn and ticket load (0–100). */
export function churnPotential(
  input: { hc: number; delta: number; churn: number; ticket: number },
  maxTicket: number,
) {
  const prev = input.hc - input.delta;
  const declinePct = input.delta < 0 && prev > 0 ? Math.min(100, (-input.delta / prev) * 100) : 0;
  const churnPct =
    input.hc + input.churn > 0 ? Math.min(100, (input.churn / (input.hc + input.churn)) * 100) : 0;
  const ticketPct = maxTicket > 0 ? Math.min(100, (input.ticket / maxTicket) * 100) : 0;
  const score = Math.round(
    Math.min(100, declinePct * 4) * 0.45 + Math.min(100, churnPct * 4) * 0.25 + ticketPct * 0.3,
  );
  const level: ChurnLevel = score >= 60 ? "Tinggi" : score >= 30 ? "Sedang" : "Rendah";
  return { score, level };
}

/** HC series over months that contain data for this cluster. */
export function hcTrend(c: ClusterRow) {
  const rec = c as unknown as Record<string, unknown>;
  return MONTH_KEYS.map((k) => ({
    key: k,
    label: MONTH_LABELS[k],
    hc: Number(rec[k]) || 0,
  })).filter((m) => m.hc > 0);
}

export function trendLabel(series: { hc: number }[]) {
  const last = series.slice(-3);
  if (last.length < 2) return "Data belum cukup";
  const up = last.every((m, i) => i === 0 || m.hc >= last[i - 1].hc);
  const down = last.every((m, i) => i === 0 || m.hc <= last[i - 1].hc);
  if (up && last[last.length - 1].hc > last[0].hc) return "Naik";
  if (down && last[last.length - 1].hc < last[0].hc) return "Turun";
  return "Fluktuatif";
}

export function retentionAdvice(level: ChurnLevel, c: ClusterRow): string[] {
  const base = recommendStrategy(c).actions;
  if (level === "Tinggi")
    return [
      "Site visit & win-back pelanggan non-aktif",
      "Selesaikan ticket terbuka prioritas",
      ...base,
    ];
  if (level === "Sedang")
    return ["Follow up pelanggan dengan keluhan", "Program loyalitas/promo perpanjangan", ...base];
  return ["Monitoring rutin & jaga kualitas layanan", ...base];
}

export function profilingText(p: {
  cluster: string;
  kabupaten: string;
  provinsi: string;
  pic: string;
  period: string;
  hc: number;
  delta: number;
  ticket: number;
  trend: string;
  priority: { score: number; level: string };
  churn: { score: number; level: string };
  advice: string[];
}) {
  return [
    `HASIL PROFILING CLUSTER — ${p.cluster}`,
    `Wilayah: ${p.kabupaten || "-"}, ${p.provinsi || "-"} · PIC: ${p.pic || "-"}`,
    `Periode: ${p.period}`,
    `Tren HC: ${p.trend}`,
    `HC Aktif: ${p.hc.toLocaleString("id-ID")} (Δ ${p.delta >= 0 ? "+" : ""}${p.delta.toLocaleString("id-ID")})`,
    `Jumlah Ticket: ${p.ticket.toLocaleString("id-ID")}`,
    `Priority Score: ${p.priority.score} (${p.priority.level})`,
    `Potensi Churn: ${p.churn.score} (${p.churn.level})`,
    `Rekomendasi Retention:`,
    ...[...new Set(p.advice)].map((a) => `- ${a}`),
  ].join("\n");
}
