import { useQuery } from "@tanstack/react-query";
import { workspaceUserOptions } from "@/lib/workspace-user";
export type { WorkspaceRole } from "@/lib/workspace-user";

/**
 * Role workspace:
 * - admin   : akses penuh, kelola user & data
 * - manager : kelola data & action plan, tanpa kelola user
 * - analyst : membuat & mengelola action plan
 * - viewer  : hanya melihat
 */
export function useRole() {
  const { data, isPending: loading } = useQuery(workspaceUserOptions);
  const role = data?.role ?? null;

  return {
    role,
    loading,
    isAdmin: role === "admin",
    /** Boleh mengubah data (upload, edit master). */
    canEdit: role === "admin" || role === "manager",
    /** Boleh membuat & mengelola action plan. */
    canPlan: role === "admin" || role === "manager" || role === "analyst",
    /** Boleh membuka menu Settings. */
    canAccessSettings: role === "admin",
  };
}
