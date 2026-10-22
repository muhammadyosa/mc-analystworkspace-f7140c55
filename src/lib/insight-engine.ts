// Analysis Engine — mengubah data mentah cluster menjadi insight terstruktur:
// Temuan → Metrik pendukung → Dugaan penyebab → Dampak bisnis → Rekomendasi.
import type { FilteredCluster } from "@/hooks/use-global-filters";
import { computePriority } from "@/lib/store";

export type InsightSeverity = "kritis" | "perhatian" | "positif" | "info";

export type StructuredInsight = {
  id: string;
  severity: InsightSeverity;
  cluster: string;
  finding: string;
  metrics: { label: string; value: string }[];
  cause: string;
  impact: string;
  recommendation: string;
};

const num = (n: number) => Math.round(n).toLocaleString("id-ID");
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const growth = (cur: number, prev: number) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;

/**
 * Bangun daftar insight terstruktur dari cluster yang sudah difilter.
 * curLabel/prevLabel = label bulan pembanding (mis. "Agustus" vs "Juli").
 */
export function buildStructuredInsights(
  rows: FilteredCluster[],
  curLabel: string,
  prevLabel: string,
  limit = 6,
): StructuredInsight[] {
  if (!rows.length) return [];

  const out: StructuredInsight[] = [];
  const maxTicket = Math.max(...rows.map((c) => c.ticket), 1);

  const hcCur = rows.reduce((a, c) => a + c.hcCur, 0);
  const hcPrev = rows.reduce((a, c) => a + c.hcPrev, 0);
  const ticket = rows.reduce((a, c) => a + c.ticket, 0);
  const hcG = growth(hcCur, hcPrev);
  const ticketPer100 = hcCur > 0 ? (ticket / hcCur) * 100 : 0;

  // 1. Ringkasan portofolio: tekanan operasional bila HC naik tapi ticket jauh lebih cepat.
  out.push({
    id: "portfolio",
    severity: hcG < 0 ? "kritis" : ticketPer100 > 20 ? "perhatian" : "positif",
    cluster: "PORTOFOLIO",
    finding:
      hcG >= 0
        ? `HC Aktif tumbuh ${pct(hcG)} dari ${prevLabel} ke ${curLabel} pada ${rows.length} cluster.`
        : `HC Aktif turun ${pct(hcG)} dari ${prevLabel} ke ${curLabel} pada ${rows.length} cluster.`,
    metrics: [
      { label: `HC ${prevLabel}`, value: num(hcPrev) },
      { label: `HC ${curLabel}`, value: num(hcCur) },
      { label: "Total Ticket", value: num(ticket) },
      { label: "Ticket / 100 HC", value: ticketPer100.toFixed(1) },
    ],
    cause:
      hcG >= 0 && ticketPer100 > 20
        ? "Pertumbuhan pelanggan tidak diimbangi kapasitas layanan, sehingga beban gangguan per pelanggan tinggi."
        : hcG < 0
          ? "Indikasi churn pelanggan dan/atau tekanan kompetitor di beberapa wilayah."
          : "Pertumbuhan sehat dengan beban layanan masih terkendali.",
    impact:
      hcG < 0
        ? "Penurunan basis pelanggan langsung menekan pendapatan berulang bulan berikutnya."
        : ticketPer100 > 20
          ? "Risiko kepuasan pelanggan turun dan biaya operasional naik jika gangguan tidak ditekan."
          : "Momentum pertumbuhan dapat dipakai untuk memperluas penetrasi.",
    recommendation:
      hcG < 0
        ? `Jalankan program retensi terarah pada cluster penurunan terbesar periode ${curLabel}.`
        : ticketPer100 > 20
          ? `Turunkan rasio ticket per 100 HC di ${curLabel} lewat perbaikan jaringan pada cluster ticket tertinggi.`
          : `Perluas program akuisisi pada cluster bertumbuh tertinggi di ${curLabel}.`,
  });

  // 2. Cluster dengan penurunan HC terbesar.
  const decline = [...rows]
    .sort((a, b) => a.hcCur - a.hcPrev - (b.hcCur - b.hcPrev))
    .slice(0, 3)
    .filter((c) => c.hcCur < c.hcPrev);
  decline.forEach((c) => {
    const g = growth(c.hcCur, c.hcPrev);
    out.push({
      id: `decline-${c.cluster}`,
      severity: g <= -10 ? "kritis" : "perhatian",
      cluster: c.cluster,
      finding: `${c.cluster} kehilangan ${num(c.hcPrev - c.hcCur)} HC Aktif (${pct(g)}) dari ${prevLabel} ke ${curLabel}.`,
      metrics: [
        { label: `HC ${prevLabel}`, value: num(c.hcPrev) },
        { label: `HC ${curLabel}`, value: num(c.hcCur) },
        { label: "Ticket", value: num(c.ticket) },
        { label: "PIC", value: c.pic || "N/A" },
      ],
      cause:
        c.ticket > maxTicket * 0.5
          ? "Volume gangguan tinggi memicu ketidakpuasan dan berhenti berlangganan."
          : "Kemungkinan tekanan harga kompetitor atau layanan purna jual yang belum optimal.",
      impact: `Kehilangan potensi pendapatan berulang dari ${num(c.hcPrev - c.hcCur)} pelanggan di ${c.kabupaten || "wilayah ini"}.`,
      recommendation: `Retensi ${c.cluster}: kunjungan pelanggan churn, tawarkan paket loyalitas, dan audit kualitas jaringan.`,
    });
  });

  // 3. Cluster dengan beban ticket tertinggi.
  const heavy = [...rows].sort((a, b) => b.ticket - a.ticket).slice(0, 2);
  heavy.forEach((c) => {
    const ratio = c.hcCur > 0 ? (c.ticket / c.hcCur) * 100 : 0;
    out.push({
      id: `ticket-${c.cluster}`,
      severity: ratio > 30 ? "kritis" : "perhatian",
      cluster: c.cluster,
      finding: `${c.cluster} mencatat ${num(c.ticket)} ticket dengan rasio ${ratio.toFixed(1)} per 100 HC Aktif.`,
      metrics: [
        { label: "Ticket", value: num(c.ticket) },
        { label: `HC ${curLabel}`, value: num(c.hcCur) },
        { label: "Ticket / 100 HC", value: ratio.toFixed(1) },
        { label: "Prioritas", value: computePriority(c, maxTicket).level },
      ],
      cause:
        "Konsentrasi gangguan menandakan masalah infrastruktur atau kapasitas teknisi di area tersebut.",
      impact:
        "Beban biaya penanganan naik dan risiko churn pelanggan meningkat pada bulan berikutnya.",
      recommendation: `Perbaikan teknis terjadwal di ${c.cluster} dan penambahan kapasitas penanganan gangguan.`,
    });
  });

  // 4. Cluster bertumbuh terbaik untuk direplikasi.
  const best = [...rows].sort((a, b) => b.hcCur - b.hcPrev - (a.hcCur - a.hcPrev))[0];
  if (best && best.hcCur > best.hcPrev) {
    out.push({
      id: `growth-${best.cluster}`,
      severity: "positif",
      cluster: best.cluster,
      finding: `${best.cluster} tumbuh ${num(best.hcCur - best.hcPrev)} HC Aktif (${pct(growth(best.hcCur, best.hcPrev))}) di ${curLabel}.`,
      metrics: [
        { label: `HC ${prevLabel}`, value: num(best.hcPrev) },
        { label: `HC ${curLabel}`, value: num(best.hcCur) },
        { label: "Ticket", value: num(best.ticket) },
        { label: "PIC", value: best.pic || "N/A" },
      ],
      cause: "Eksekusi program pemasaran dan kualitas layanan di cluster ini berjalan efektif.",
      impact: "Menjadi acuan praktik terbaik yang bisa direplikasi ke cluster sekitar.",
      recommendation: `Dokumentasikan program ${best.cluster} dan replikasi ke cluster dengan profil serupa.`,
    });
  }

  return out.slice(0, limit);
}
