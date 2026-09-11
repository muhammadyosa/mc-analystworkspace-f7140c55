import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkspaceRole = "admin" | "viewer";

let cachedRole: WorkspaceRole | null = null;

/**
 * Role workspace: admin (akses penuh) atau viewer (hanya melihat).
 * Semua akun non-admin diperlakukan sebagai viewer.
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
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      cachedRole = data ? "admin" : "viewer";
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

  return { role, loading, isAdmin: role === "admin", canEdit: role === "admin" };
}
