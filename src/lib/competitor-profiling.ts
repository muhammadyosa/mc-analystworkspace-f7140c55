import type { AnalystRow, ClusterRow, CompetitorRow } from "./excel";

export const profileKey = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export const money = (value?: number | null) =>
  value == null ? "Belum ada data" : `Rp${value.toLocaleString("id-ID")}`;
const knownPrice = (value?: number | null) => (value != null && value > 0 ? value : null);

export type CompetitorProfile = CompetitorRow & {
  source: "Competitor" | "Analyst Market";
  scope: "Cluster" | "Wilayah";
  original?: CompetitorRow;
};

export function competitorProfiles(
  cluster: Pick<ClusterRow, "cluster" | "kabupaten" | "provinsi">,
  rows: CompetitorRow[],
  analyst: AnalystRow[],
): CompetitorProfile[] {
  const key = profileKey(cluster.cluster);
  if (!key) return [];
  const result: CompetitorProfile[] = rows
    .filter((r) => {
      const territory =
        (!r.kabupaten || profileKey(r.kabupaten) === profileKey(cluster.kabupaten)) &&
        (!r.provinsi || profileKey(r.provinsi) === profileKey(cluster.provinsi));
      return (
        territory &&
        (profileKey(r.cluster) === key ||
          (!r.cluster.trim() &&
            !!r.kabupaten &&
            profileKey(r.kabupaten) === profileKey(cluster.kabupaten) &&
            !!r.provinsi &&
            profileKey(r.provinsi) === profileKey(cluster.provinsi)))
      );
    })
    .filter((r) => r.competitor.trim())
    .map((r) => ({
      ...r,
      original: r,
      source: "Competitor",
      scope: r.cluster.trim() ? "Cluster" : "Wilayah",
    }));
  const existing = new Set(result.flatMap((r) => r.competitor.split(/[,;\n]+/).map(profileKey)));
  // Newest assessment first; a grouped offer stays grouped: no invented per-provider price.
  const assessments = analyst
    .filter((r) => profileKey(r.cluster) === key)
    .sort(
      (a, b) =>
        (Number(b.profilingDate) || Date.parse(b.profilingDate) || 0) -
        (Number(a.profilingDate) || Date.parse(a.profilingDate) || 0),
    );
  for (const r of assessments) {
    const names = r.competitor
      .split(/[,;\n]+/)
      .map(profileKey)
      .filter(Boolean);
    if (!names.length || names.every((n) => existing.has(n))) continue;
    result.push({
      id: `analyst-${r.id}`,
      cluster: cluster.cluster,
      kabupaten: cluster.kabupaten,
      provinsi: cluster.provinsi,
      competitor: r.competitor,
      competitorRaw: r.competitor,
      price: r.competitorPrice,
      promo: r.competitorPromo,
      promoCategory: "Lainnya",
      source: "Analyst Market",
      scope: "Cluster",
    });
    names.forEach((n) => existing.add(n));
  }
  return result;
}

export function rankChurn<T extends { id: string; cluster: string; ch: { score: number } }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => b.ch.score - a.ch.score || a.cluster.localeCompare(b.cluster));
  const ranks = new Map<string, number>();
  let rank = 0;
  sorted.forEach((row, index) => {
    if (index === 0 || row.ch.score !== sorted[index - 1].ch.score) rank = index + 1;
    ranks.set(row.id, rank);
  });
  return ranks;
}

export function competitorComparison(row: CompetitorRow) {
  const price = knownPrice(row.price),
    iconnet = knownPrice(row.iconnetPrice);
  const delta = price != null && iconnet != null ? price - iconnet : null;
  const insights: string[] = [];
  const advice: string[] = [];
  if (delta != null) {
    insights.push(
      delta < 0
        ? `${row.competitor} lebih murah ${money(-delta)} dibanding ICONNET.`
        : delta > 0
          ? `ICONNET lebih murah ${money(delta)} dibanding ${row.competitor}.`
          : "Harga paket kompetitor dan ICONNET sama.",
    );
    advice.push(
      delta < 0
        ? "Prioritaskan pelanggan sensitif harga; evaluasi penawaran retention sesuai paket yang disetujui."
        : "Tonjolkan nilai harga ICONNET saat follow up pelanggan.",
    );
  } else insights.push("Perbandingan harga ICONNET: Belum ada data.");
  if (row.speedMbps && row.iconnetSpeedMbps) {
    insights.push(
      `${row.competitor}: ${row.speedMbps} Mbps · ICONNET: ${row.iconnetSpeedMbps} Mbps.`,
    );
    if (row.speedMbps > row.iconnetSpeedMbps)
      advice.push("Evaluasi kebutuhan kecepatan pelanggan dan opsi upgrade ICONNET yang tersedia.");
  }
  if (row.promo?.trim()) {
    insights.push(`Promo tercatat ${row.competitor}: ${row.promo}.`);
    advice.push("Verifikasi masa berlaku promo kompetitor sebelum menawarkan program loyalitas.");
  }
  if (
    row.installationCost != null &&
    row.iconnetInstallationCost != null &&
    row.installationCost < row.iconnetInstallationCost
  ) {
    insights.push(
      `Biaya instalasi kompetitor lebih rendah ${money(row.iconnetInstallationCost - row.installationCost)}.`,
    );
    advice.push("Evaluasi hambatan biaya instalasi pada program win-back.");
  }
  return { delta, insights, advice };
}

export function competitorProfileText(rows: CompetitorProfile[]) {
  if (!rows.length) return "COMPETITOR PROFILING\nBelum ada data";
  return (
    "COMPETITOR PROFILING\n" +
    rows
      .map((r) =>
        [
          r.competitor,
          `Sumber: ${r.source} · ${r.scope}`,
          `Layanan: ${r.serviceType || "Belum ada data"}`,
          `Harga: ${money(knownPrice(r.price))}`,
          `Kecepatan: ${r.speedMbps ? `${r.speedMbps} Mbps` : "Belum ada data"}`,
          `Promo: ${r.promo || "Belum ada data"}`,
          `Instalasi: ${money(r.installationCost)}`,
          `Periode: ${r.promoStart || "Belum ada data"} — ${r.promoEnd || "Belum ada data"}`,
          ...competitorComparison(r).insights,
          ...competitorComparison(r).advice,
        ].join("\n"),
      )
      .join("\n\n")
  );
}
