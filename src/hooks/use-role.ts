import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkspaceRole = "admin" | "manager" | "analyst" | "viewer";

const PRIORITY: WorkspaceRole[] = ["admin", "manager", "analyst", "viewer"];

let cachedRole: WorkspaceRole | null = null;

function pickRole(roles: string[]): WorkspaceRole {
  for (const r of PRIORITY) if (roles.includes(r)) return r;
  return "viewer";
}

/**
 * Role workspace:
 * - admin   : akses penuh, kelola user & data
 * - manager : kelola data & action plan, tanpa kelola user
 * - analyst : membuat & mengelola action plan
 * - viewer  : hanya melihat
 */
export function useRole() {
  const [role, setRole] = useState<WorkspaceRole | null>(cachedRole);
  const [loading, setLoading] = useState(cachedRole === null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (mounted) {
          setRole("viewer");
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      cachedRole = pickRole((data ?? []).map((r) => r.role as string));
      if (mounted) {
        setRole(cachedRole);
        setLoading(false);
      }
    }
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        cachedRole = null;
        void load();
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
