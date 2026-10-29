import { supabase } from "@/integrations/supabase/client";
import { useDataStore } from "./store";
import type { CompetitorRow } from "./excel";

let epoch = 0;
let busy = false;
export const competitorSyncState = () => ({ epoch, busy });
export async function saveCompetitorProfile(profile: CompetitorRow, original?: CompetitorRow) {
  if (busy) throw new Error("Penyimpanan kompetitor sedang berlangsung");
  epoch++;
  busy = true;
  try {
    const { data, error } = await supabase.rpc("save_competitor_profile", { profile: profile as never, expected_row: (original ?? null) as never });
    if (error) throw new Error(error.message);
    useDataStore.getState().applyCloud({ competitorData: data as unknown as CompetitorRow[] });
  } finally { busy = false; }
}