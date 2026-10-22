import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export type WorkspaceRole = "admin" | "manager" | "analyst" | "viewer";

export const workspaceUserOptions = queryOptions({
  queryKey: ["workspace-user"],
  staleTime: 60_000,
  gcTime: 300_000,
  queryFn: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const user = data.user;
    if (!user) return null;
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (roleError) throw roleError;
    const role =
      (["admin", "manager", "analyst", "viewer"] as const).find((value) =>
        roles?.some((row) => row.role === value),
      ) ?? "viewer";
    return { user, role };
  },
});
