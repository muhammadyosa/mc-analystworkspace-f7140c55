import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchDatasets, fetchDatasetStatus } from "@/lib/cloud-sync";
import { actionPlanSyncState } from "@/lib/action-plan-sync";
import { useDataStore } from "@/lib/store";
import type {
  ActionPlanRow,
  AnalystRow,
  ClusterRow,
  CompetitorRow,
  TicketRow,
  ImportKind,
} from "@/lib/excel";

/**
 * Menarik data workspace dari cloud saat aplikasi dibuka dan setiap kali
 * admin mengunggah data baru, sehingga semua user melihat data terbaru.
 */
export function useCloudData() {
  const applyCloud = useDataStore((s) => s.applyCloud);

  useEffect(() => {
    let mounted = true;
    let busy = false;
    let queued = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const versions = new Map<string, string>();

    async function sync() {
      if (busy) {
        queued = true;
        return;
      }
      busy = true;
      try {
        const startEpoch = actionPlanSyncState().epoch;
        const statuses = await fetchDatasetStatus(controller.signal);
        if (!mounted) return;
        const changed = statuses
          .filter((s) => versions.get(s.kind) !== s.updated_at)
          .map((s) => s.kind as ImportKind);
        const sets = await fetchDatasets(changed, controller.signal);
        if (!mounted || sets.length === 0) return;
        // A Kanban edit started while this read was in flight: its RPC result is newer.
        const planStale = actionPlanSyncState().busy || actionPlanSyncState().epoch !== startEpoch;
        const patch: Parameters<typeof applyCloud>[0] = {};
        for (const s of sets) {
          if (s.kind === "cluster") patch.clusters = s.rows as ClusterRow[];
          if (s.kind === "ticket") patch.tickets = s.rows as TicketRow[];
          if (s.kind === "analyst") patch.analyst = s.rows as AnalystRow[];
          if (s.kind === "competitor") patch.competitorData = s.rows as CompetitorRow[];
          if (s.kind === "actionplan" && !planStale) patch.actionPlans = s.rows as ActionPlanRow[];
        }
        if (Object.keys(patch).length > 0) applyCloud(patch);
        sets.forEach((s) => {
          if (s.kind === "actionplan" && planStale) {
            clearTimeout(debounce);
            debounce = setTimeout(() => void sync(), 600);
          } else versions.set(s.kind, s.updatedAt);
        });
      } catch {
        /* offline / belum ada akses — pakai data lokal */
      } finally {
        busy = false;
        if (mounted && queued) {
          queued = false;
          void sync();
        }
      }
    }

    void sync();

    const channel = supabase
      .channel("shared-datasets")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_datasets" }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => void sync(), 200);
      })
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(debounce);
      controller.abort();
      supabase.removeChannel(channel);
    };
  }, [applyCloud]);
}
