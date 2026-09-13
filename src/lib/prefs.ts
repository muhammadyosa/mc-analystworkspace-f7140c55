import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MONTH_KEYS = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
] as const;
export type MonthKey = (typeof MONTH_KEYS)[number];
export const MONTH_LABELS: Record<MonthKey, string> = {
  januari: "Januari",
  februari: "Februari",
  maret: "Maret",
  april: "April",
  mei: "Mei",
  juni: "Juni",
  juli: "Juli",
  agustus: "Agustus",
  september: "September",
  oktober: "Oktober",
  november: "November",
  desember: "Desember",
};

/** Filter global yang dipakai bersama oleh dashboard, tabel, grafik, dan laporan. */
export type GlobalFilters = {
  monthFrom: MonthKey | "auto";
  monthTo: MonthKey | "auto";
  provinsi: string;
  kabupaten: string;
  cluster: string;
  pic: string;
  kategori: "all" | "growth" | "decline" | "high-ticket" | "high-risk";
};

export const emptyFilters: GlobalFilters = {
  monthFrom: "auto",
  monthTo: "auto",
  provinsi: "all",
  kabupaten: "all",
  cluster: "all",
  pic: "all",
  kategori: "all",
};

export type SavedView = {
  id: string;
  name: string;
  filters: GlobalFilters;
  createdAt: number;
};

export type NotificationPrefs = {
  kritis: boolean;
  perhatian: boolean;
  info: boolean;
  sistem: boolean;
};

/** Riwayat laporan yang pernah diunduh pengguna (Report Center). */
export type ReportHistoryItem = {
  id: string;
  label: string;
  format: string;
  rows: number;
  filters: string;
  at: number;
};

/** Target KPI bulanan yang dipantau di Dashboard. */
export type KpiMetric = "hcGrowth" | "ticketPer100HC" | "highRisk";
export type KpiTarget = {
  id: string;
  metric: KpiMetric;
  /** "min" = realisasi harus >= target; "max" = realisasi harus <= target. */
  direction: "min" | "max";
  target: number;
};

export const KPI_METRIC_META: Record<KpiMetric, { label: string; unit: string; hint: string }> = {
  hcGrowth: { label: "Pertumbuhan HC", unit: "%", hint: "Target pertumbuhan HC bulan berjalan vs bulan sebelumnya" },
  ticketPer100HC: { label: "Ticket per 100 HC", unit: "", hint: "Batas maksimal rasio ticket per 100 HC" },
  highRisk: { label: "Cluster Risiko Tinggi", unit: "cluster", hint: "Batas maksimal jumlah cluster prioritas tinggi" },
};

export const defaultKpiTargets: KpiTarget[] = [
  { id: "kpi-hc-growth", metric: "hcGrowth", direction: "min", target: 2 },
  { id: "kpi-ticket-ratio", metric: "ticketPer100HC", direction: "max", target: 5 },
  { id: "kpi-high-risk", metric: "highRisk", direction: "max", target: 15 },
];

type PrefsState = {
  filters: GlobalFilters;
  recentReports: ReportHistoryItem[];
  addReport: (item: Omit<ReportHistoryItem, "id" | "at">) => void;
  clearReports: () => void;
  recent: GlobalFilters[];
  views: SavedView[];
  defaultViewId: string | null;
  favorites: string[];
  readAlerts: string[];
  notifPrefs: NotificationPrefs;
  kpiTargets: KpiTarget[];
  setKpiTarget: (metric: KpiMetric, target: number) => void;
  resetKpiTargets: () => void;
  density: "comfortable" | "compact";
  setFilter: <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => void;
  setFilters: (f: GlobalFilters) => void;
  clearFilters: () => void;
  saveView: (name: string) => void;
  applyView: (id: string) => void;
  renameView: (id: string, name: string) => void;
  duplicateView: (id: string) => void;
  deleteView: (id: string) => void;
  setDefaultView: (id: string | null) => void;
  toggleFavorite: (url: string) => void;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  setNotifPref: (key: keyof NotificationPrefs, value: boolean) => void;
  setDensity: (d: "comfortable" | "compact") => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const isFilterActive = (f: GlobalFilters) =>
  f.monthFrom !== "auto" ||
  f.monthTo !== "auto" ||
  f.provinsi !== "all" ||
  f.kabupaten !== "all" ||
  f.cluster !== "all" ||
  f.pic !== "all" ||
  f.kategori !== "all";

export const filterSummary = (f: GlobalFilters) => {
  const parts: string[] = [];
  if (f.monthFrom !== "auto" || f.monthTo !== "auto") {
    const a = f.monthFrom === "auto" ? "awal" : MONTH_LABELS[f.monthFrom];
    const b = f.monthTo === "auto" ? "akhir" : MONTH_LABELS[f.monthTo];
    parts.push(`${a}–${b}`);
  }
  if (f.provinsi !== "all") parts.push(f.provinsi);
  if (f.kabupaten !== "all") parts.push(f.kabupaten);
  if (f.cluster !== "all") parts.push(f.cluster);
  if (f.pic !== "all") parts.push(`PIC ${f.pic}`);
  if (f.kategori !== "all")
    parts.push(
      {
        growth: "Tumbuh",
        decline: "Turun",
        "high-ticket": "Ticket tinggi",
        "high-risk": "Risiko tinggi",
      }[f.kategori],
    );
  return parts.length ? parts.join(" · ") : "Semua data";
};

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set, get) => ({
      filters: emptyFilters,
      recentReports: [],
      addReport: (item) =>
        set((s) => ({
          recentReports: [{ ...item, id: uid(), at: Date.now() }, ...s.recentReports].slice(0, 10),
        })),
      clearReports: () => set({ recentReports: [] }),
      recent: [],
      views: [],
      defaultViewId: null,
      favorites: [],
      readAlerts: [],
      notifPrefs: { kritis: true, perhatian: true, info: true, sistem: true },
      density: "comfortable",
      setFilter: (key, value) =>
        set((s) => {
          const filters = { ...s.filters, [key]: value };
          return { filters, recent: pushRecent(s.recent, filters) };
        }),
      setFilters: (filters) => set((s) => ({ filters, recent: pushRecent(s.recent, filters) })),
      clearFilters: () => set({ filters: emptyFilters }),
      saveView: (name) =>
        set((s) => ({
          views: [...s.views, { id: uid(), name: name.trim() || "View baru", filters: s.filters, createdAt: Date.now() }],
        })),
      applyView: (id) => {
        const v = get().views.find((x) => x.id === id);
        if (v) set({ filters: v.filters });
      },
      renameView: (id, name) =>
        set((s) => ({ views: s.views.map((v) => (v.id === id ? { ...v, name: name.trim() || v.name } : v)) })),
      duplicateView: (id) =>
        set((s) => {
          const v = s.views.find((x) => x.id === id);
          if (!v) return s;
          return { views: [...s.views, { ...v, id: uid(), name: `${v.name} (copy)`, createdAt: Date.now() }] };
        }),
      deleteView: (id) =>
        set((s) => ({
          views: s.views.filter((v) => v.id !== id),
          defaultViewId: s.defaultViewId === id ? null : s.defaultViewId,
        })),
      setDefaultView: (id) => set({ defaultViewId: id }),
      toggleFavorite: (url) =>
        set((s) => ({
          favorites: s.favorites.includes(url) ? s.favorites.filter((f) => f !== url) : [...s.favorites, url],
        })),
      markRead: (id) => set((s) => ({ readAlerts: [...new Set([...s.readAlerts, id])] })),
      markAllRead: (ids) => set((s) => ({ readAlerts: [...new Set([...s.readAlerts, ...ids])] })),
      setNotifPref: (key, value) => set((s) => ({ notifPrefs: { ...s.notifPrefs, [key]: value } })),
      setDensity: (density) => set({ density }),
    }),
    { name: "mcaw-prefs" },
  ),
);

function pushRecent(list: GlobalFilters[], f: GlobalFilters) {
  if (!isFilterActive(f)) return list;
  const key = JSON.stringify(f);
  return [f, ...list.filter((x) => JSON.stringify(x) !== key)].slice(0, 5);
}
