import { supabase } from "@/integrations/supabase/client";
import { useDataStore } from "./store";
import type { ActionPlanRow } from "./excel";

async function mutate(operation: "add" | "update" | "delete", args: { id?: string; patch?: Partial<ActionPlanRow>; rows?: ActionPlanRow[] }) {
  const before = useDataStore.getState().actionPlans;
  const stamp = new Date().toISOString();
  const st = useDataStore.getState();
  if (operation === "add") st.addActionPlans((args.rows ?? []).map((r) => ({ ...r, updatedAt: stamp })));
  if (operation === "update" && args.id) st.updateActionPlan(args.id, { ...args.patch, updatedAt: stamp });
  if (operation === "delete" && args.id) st.removeActionPlan(args.id);
  const { data, error } = await supabase.rpc("mutate_action_plan", { operation, task_id: args.id, task_patch: (args.patch ?? {}) as never, new_tasks: (args.rows ?? []) as never });
  if (error) { useDataStore.setState({ actionPlans: before }); throw new Error(error.message); }
  useDataStore.getState().applyCloud({ actionPlans: (data ?? []) as unknown as ActionPlanRow[] });
}

export const saveActionPlans = (rows: ActionPlanRow[]) => mutate("add", { rows });
export const saveActionPlanPatch = (id: string, patch: Partial<ActionPlanRow>) => mutate("update", { id, patch });
export const deleteSharedActionPlan = (id: string) => mutate("delete", { id });