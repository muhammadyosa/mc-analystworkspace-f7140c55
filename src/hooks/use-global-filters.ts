import { useMemo } from "react";
import { useDataStore } from "@/lib/store";
import { MONTH_KEYS, MONTH_LABELS, usePrefsStore, type MonthKey } from "@/lib/prefs";
import type { ClusterRow } from "@/lib/excel";
import { computePriority } from "@/lib/store";

export type FilteredCluster = ClusterRow & { hcCur: number; hcPrev: number; ticketView: number };

/**
 * Terapkan filter global ke data cluster: periode, provinsi, kabupaten, cluster, PIC, kategori.
 * Semua KPI, grafik, dan tabel memakai hasil yang sama agar konsisten.
 */
export function useGlobalClusters() {
  const clusters = useDataStore((s) => s.clusters);
  const filters = usePrefsStore((s) => s.filters);

  return useMemo(() => {
    const filled = MONTH_KEYS.map((key, idx) => ({
      key,
      idx,
      total: clusters.reduce((a, c) => a + (Number(c[key]) || 0), 0),
    })).filter((m) => m.total > 0);

    const lastIdx = filled.length ? filled[filled.length - 1].idx : MONTH_KEYS.indexOf("juni");
    const prevIdxDefault = filled.length > 1 ? filled[filled.length - 2].idx : Math.max(0, lastIdx - 1);

    const curKey: MonthKey = filters.monthTo === "auto" ? MONTH_KEYS[lastIdx] : filters.monthTo;
    const curIdx = MONTH_KEYS.indexOf(curKey);
    const prevKey: MonthKey =
      filters.monthFrom === "auto"
        ? MONTH_KEYS[filters.monthTo === "auto" ? prevIdxDefault : Math.max(0, curIdx - 1)]
        : filters.monthFrom;
    const prevIdx = MONTH_KEYS.indexOf(prevKey);

    const rangeKeys = MONTH_KEYS.slice(Math.min(prevIdx, curIdx), Math.max(prevIdx, curIdx) + 1);
    const monthScoped = filters.monthFrom !== "auto" || filters.monthTo !== "auto";

    const mapped: FilteredCluster[] = clusters.map((c) => {
      const cur = Number(c[curKey]) || 0;
      const prev = Number(c[prevKey]) || 0;
      const ticketRange = rangeKeys.reduce((a, k) => a + (Number(c.ticketByMonth?.[k]) || 0), 0);
      const ticketView = monthScoped && ticketRange > 0 ? ticketRange : c.ticket;
      return { ...c, juni: cur, mei: prev, deltaMeiJuni: cur - prev, ticket: ticketView, hcCur: cur, hcPrev: prev, ticketView };
    });

    const maxTicket = Math.max(...mapped.map((c) => c.ticket), 1);

    const rows = mapped.filter((c) => {
      if (filters.provinsi !== "all" && (c.provinsi || "N/A") !== filters.provinsi) return false;
      if (filters.kabupaten !== "all" && (c.kabupaten || "N/A") !== filters.kabupaten) return false;
      if (filters.cluster !== "all" && c.cluster !== filters.cluster) return false;
      if (filters.pic !== "all" && (c.pic || "N/A") !== filters.pic) return false;
      if (filters.kategori === "growth" && c.deltaMeiJuni <= 0) return false;
      if (filters.kategori === "decline" && c.deltaMeiJuni >= 0) return false;
      if (filters.kategori === "high-ticket" && c.ticket < 100) return false;
      if (filters.kategori === "high-risk" && computePriority(c, maxTicket).level !== "Tinggi") return false;
      return true;
    });

    /** Baris asli (nilai bulan tidak diubah) tapi tetap mengikuti filter wilayah/cluster/PIC/kategori.
     *  Dipakai halaman yang punya kontrol bulan sendiri (Loyalty, Reports, Competitor). */
    const keep = new Set(rows.map((c) => c.id));
    const dimRows = clusters.filter((c) => keep.has(c.id));

    const uniq = (arr: (string | undefined)[]) =>
      [...new Set(arr.map((v) => v || "N/A"))].filter(Boolean).sort((a, b) => a.localeCompare(b));

    return {
      all: clusters,
      rows,
      dimRows,
      filled,
      rangeKeys,
      curKey,
      prevKey,
      curLabel: MONTH_LABELS[curKey],
      prevLabel: MONTH_LABELS[prevKey],
      monthScoped,
      options: {
        provinsi: uniq(clusters.map((c) => c.provinsi)),
        kabupaten: uniq(
          clusters
            .filter((c) => filters.provinsi === "all" || (c.provinsi || "N/A") === filters.provinsi)
            .map((c) => c.kabupaten),
        ),
        cluster: uniq(
          clusters
            .filter((c) => filters.provinsi === "all" || (c.provinsi || "N/A") === filters.provinsi)
            .filter((c) => filters.kabupaten === "all" || (c.kabupaten || "N/A") === filters.kabupaten)
            .map((c) => c.cluster),
        ).slice(0, 500),
        pic: uniq(clusters.map((c) => c.pic)),
        months: filled.map((m) => m.key),
      },
    };
  }, [clusters, filters]);
}
