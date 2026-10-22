import { supabase } from "@/integrations/supabase/client";
import { useDataStore } from "./store";
import type { ActionPlanRow } from "./excel";

/**
 * Incremented whenever a Kanban mutation starts. Background cloud refreshes
 * that began before a mutation must not overwrite its newer result.
 */
let mutationEpoch = 0;
let inFlight = 0;
export const actionPlanSyncState = () => ({ epoch: mutationEpoch, busy: inFlight > 0 });

async function mutate(
  operation: "add" | "update" | "delete",
  args: { id?: string; patch?: Partial<ActionPlanRow>; rows?: ActionPlanRow[] },
) {
  mutationEpoch++;
  inFlight++;
  const before = useDataStore.getState().actionPlans;
  const stamp = new Date().toISOString();
  const st = useDataStore.getState();
  try {
    if (operation === "add")
      st.addActionPlans((args.rows ?? []).map((r) => ({ ...r, updatedAt: stamp })));
    if (operation === "update" && args.id)
      st.updateActionPlan(args.id, { ...args.patch, updatedAt: stamp });
    if (operation === "delete" && args.id) st.removeActionPlan(args.id);
    const { data, error } = await supabase.rpc("mutate_action_plan", {
      operation,
      task_id: args.id,
      task_patch: (args.patch ?? {}) as never,
      new_tasks: (args.rows ?? []) as never,
    });
    if (error) {
      useDataStore.setState({ actionPlans: before });
      throw new Error(error.message);
    }
    useDataStore.getState().applyCloud({ actionPlans: (data ?? []) as unknown as ActionPlanRow[] });
  } finally {
    inFlight--;
  }
}

export const saveActionPlans = (rows: ActionPlanRow[]) => mutate("add", { rows });
export const saveActionPlanPatch = (id: string, patch: Partial<ActionPlanRow>) =>
  mutate("update", { id, patch });
export const deleteSharedActionPlan = (id: string) => mutate("delete", { id });
