import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { ActionPlanRow, AnalystRow, ClusterRow, CompetitorRow, TicketRow, UploadMeta } from "./excel";

// Debounced localStorage — sync reads keep hydration flash-free,
// async writes prevent JSON.stringify on large datasets from blocking navigation.
const writeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pending = new Map<string, string>();
const debouncedLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    pending.set(name, value);
    const t = writeTimers.get(name);
    if (t) clearTimeout(t);
    writeTimers.set(
      name,
      setTimeout(() => {
        const v = pending.get(name);
        pending.delete(name);
        writeTimers.delete(name);
        if (v === undefined) return;
        try {
          const write = () => window.localStorage.setItem(name, v);
          const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
          if (typeof ric === "function") ric(write);
          else write();
        } catch {
          /* quota / private mode — ignore */
        }
      }, 400),
    );
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

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

export type UploadHistoryEntry = UploadMeta & {
  kind: "cluster" | "ticket" | "analyst" | "competitor" | "actionplan";
  mode: "replace" | "append";
  checksum?: string;
};

type DataState = {
  clusters: ClusterRow[];
  tickets: TicketRow[];
  analyst: AnalystRow[];
  competitorData: CompetitorRow[];
  actions: ActionItem[];
  competitors: Competitor[];
  history: UploadHistoryEntry[];
  lastUpdated: number | null;
  setClusters: (c: ClusterRow[], mode?: "replace" | "append") => void;
  setTickets: (t: TicketRow[], mode?: "replace" | "append") => void;
  setAnalyst: (a: AnalystRow[], mode?: "replace" | "append") => void;
  setCompetitorData: (c: CompetitorRow[], mode?: "replace" | "append") => void;
  pushHistory: (h: UploadHistoryEntry) => void;
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
      analyst: [],
      competitorData: [],
      actions: [],
      competitors: [],
      history: [],
      lastUpdated: null,
      setClusters: (rows, mode = "replace") =>
        set((s) => ({
          clusters: mode === "append" ? [...s.clusters, ...rows] : rows,
          lastUpdated: Date.now(),
        })),
      setTickets: (rows, mode = "replace") =>
        set((s) => ({
          tickets: mode === "append" ? [...s.tickets, ...rows] : rows,
          lastUpdated: Date.now(),
        })),
      setAnalyst: (rows, mode = "replace") =>
        set((s) => ({
          analyst: mode === "append" ? [...s.analyst, ...rows] : rows,
          lastUpdated: Date.now(),
        })),
      setCompetitorData: (rows, mode = "replace") =>
        set((s) => ({
          competitorData: mode === "append" ? [...s.competitorData, ...rows] : rows,
          lastUpdated: Date.now(),
        })),
      pushHistory: (h) => set((s) => ({ history: [h, ...s.history].slice(0, 20) })),
      addAction: (a) => set((s) => ({ actions: [...s.actions, a] })),
      updateActionStatus: (id, status) =>
        set((s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, status } : a)) })),
      deleteAction: (id) => set((s) => ({ actions: s.actions.filter((a) => a.id !== id) })),
      addCompetitor: (c) => set((s) => ({ competitors: [...s.competitors, c] })),
      deleteCompetitor: (id) => set((s) => ({ competitors: s.competitors.filter((c) => c.id !== id) })),
      clearAll: () =>
        set({ clusters: [], tickets: [], analyst: [], competitorData: [], actions: [], competitors: [], history: [], lastUpdated: null }),
    }),
    { name: "mcaw-store", storage: createJSONStorage(() => debouncedLocalStorage) },
  ),
);

export function computePriority(row: ClusterRow, maxTicket: number): { score: number; level: "Rendah" | "Sedang" | "Tinggi" } {
  const growthPct = row.mei > 0 ? (row.deltaMeiJuni / row.mei) * 100 : 0;
  const growthScore = Math.max(0, Math.min(100, 50 + growthPct * 2));
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

  if (declined && highTicket) return { type: "Retention", actions: ["Site Visit", "Follow Up Customer", "Koordinasi Teknik"] };
  if (lowHC && highPotensi) return { type: "Acquisition", actions: ["Door to Door", "Digital Ads", "Event", "Partnership"] };
  if (row.totalHC2026 > 0 && row.juni / row.totalHC2026 < 0.3) return { type: "Development", actions: ["Open Access", "FAT Baru", "Homepass Baru"] };
  return { type: "Maintain", actions: ["Monitoring rutin", "Program loyalitas"] };
}
