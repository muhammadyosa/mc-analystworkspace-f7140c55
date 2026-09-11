import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchDatasets } from "@/lib/cloud-sync";
import { useDataStore } from "@/lib/store";
import type { ActionPlanRow, AnalystRow, ClusterRow, CompetitorRow, TicketRow } from "@/lib/excel";

/**
 * Menarik data workspace dari cloud saat aplikasi dibuka dan setiap kali
 * admin mengunggah data baru, sehingga semua user melihat data terbaru.
 */
export function useCloudData() {
  const applyCloud = useDataStore((s) => s.applyCloud);

  useEffect(() => {
    let mounted = true;

    async function sync() {
      try {
        const sets = await fetchDatasets();
        if (!mounted || sets.length === 0) return;
        const patch: Parameters<typeof applyCloud>[0] = {};
        for (const s of sets) {
          if (s.kind === "cluster") patch.clusters = s.rows as ClusterRow[];
          if (s.kind === "ticket") patch.tickets = s.rows as TicketRow[];
          if (s.kind === "analyst") patch.analyst = s.rows as AnalystRow[];
          if (s.kind === "competitor") patch.competitorData = s.rows as CompetitorRow[];
          if (s.kind === "actionplan") patch.actionPlans = s.rows as ActionPlanRow[];
        }
        applyCloud(patch);
      } catch {
        /* offline / belum ada akses — pakai data lokal */
      }
    }

    void sync();

    const channel = supabase
      .channel("shared-datasets")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_datasets" }, () => {
        void sync();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [applyCloud]);
}
