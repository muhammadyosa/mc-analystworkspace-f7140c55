import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ClusterRow, TicketRow } from "./excel";

export type ActionStatus = "belum" | "onprogress" | "done";
export type ActionItem = {
  id: string;
  cluster: string;
  program: string;
  pic: string;
  deadline: string;
  status: ActionStatus;
  createdAt: number;
};

export type Competitor = {
  id: string;
  nama: string;
  harga: number;
  promo: string;
  coverage: string;
};

type DataState = {
  clusters: ClusterRow[];
  tickets: TicketRow[];
  actions: ActionItem[];
  competitors: Competitor[];
  lastUpdated: number | null;
  setClusters: (c: ClusterRow[]) => void;
  setTickets: (t: TicketRow[]) => void;
  addAction: (a: ActionItem) => void;
  updateActionStatus: (id: string, status: ActionStatus) => void;
  deleteAction: (id: string) => void;
  addCompetitor: (c: Competitor) => void;
  deleteCompetitor: (id: string) => void;
  clearAll: () => void;
};

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      clusters: [],
      tickets: [],
      actions: [],
      competitors: [],
      lastUpdated: null,
      setClusters: (clusters) => set({ clusters, lastUpdated: Date.now() }),
      setTickets: (tickets) => set({ tickets, lastUpdated: Date.now() }),
      addAction: (a) => set((s) => ({ actions: [...s.actions, a] })),
      updateActionStatus: (id, status) =>
        set((s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, status } : a)) })),
      deleteAction: (id) => set((s) => ({ actions: s.actions.filter((a) => a.id !== id) })),
      addCompetitor: (c) => set((s) => ({ competitors: [...s.competitors, c] })),
      deleteCompetitor: (id) => set((s) => ({ competitors: s.competitors.filter((c) => c.id !== id) })),
      clearAll: () => set({ clusters: [], tickets: [], actions: [], competitors: [], lastUpdated: null }),
    }),
    { name: "mcaw-store" },
  ),
);

// Derived analytics
export function computePriority(row: ClusterRow, maxTicket: number): { score: number; level: "Rendah" | "Sedang" | "Tinggi" } {
  const growthPct = row.mei > 0 ? (row.deltaMeiJuni / row.mei) * 100 : 0;
  const growthScore = Math.max(0, Math.min(100, 50 + growthPct * 2)); // centered
  const ticketScore = maxTicket > 0 ? (row.ticket / maxTicket) * 100 : 0;
  const potensi = row.totalHC2026 > 0 ? Math.min(100, (row.juni / row.totalHC2026) * 100) : 50;
  const score = Math.round(growthScore * 0.4 + ticketScore * 0.3 + (100 - potensi) * 0.3);
  const level = score >= 71 ? "Tinggi" : score >= 41 ? "Sedang" : "Rendah";
  return { score, level };
}

export type StrategyType = "Retention" | "Acquisition" | "Development" | "Maintain";
export function recommendStrategy(row: ClusterRow): { type: StrategyType; actions: string[] } {
  const declined = row.deltaMeiJuni < 0;
  const highTicket = row.ticket > 5;
  const lowHC = row.totalHC2026 > 0 && row.juni / row.totalHC2026 < 0.4;
  const highPotensi = row.totalHC2026 > 0 && row.juni / row.totalHC2026 < 0.6;

  if (declined && highTicket) {
    return { type: "Retention", actions: ["Site Visit", "Follow Up Customer", "Koordinasi Teknik"] };
  }
  if (lowHC && highPotensi) {
    return { type: "Acquisition", actions: ["Door to Door", "Digital Ads", "Event", "Partnership"] };
  }
  if (row.totalHC2026 > 0 && row.juni / row.totalHC2026 < 0.3) {
    return { type: "Development", actions: ["Open Access", "FAT Baru", "Homepass Baru"] };
  }
  return { type: "Maintain", actions: ["Monitoring rutin", "Program loyalitas"] };
}
