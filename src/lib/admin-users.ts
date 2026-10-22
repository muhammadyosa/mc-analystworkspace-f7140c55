import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRole, type AssignableRole } from "@/lib/user-admin-rules";

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  approved: boolean;
  approved_at: string | null;
  created_at: string;
  last_seen_at: string | null;
  role: AssignableRole;
};

export type AdminUsersResult = {
  isAdmin: boolean;
  rows: AdminUserRow[];
};

export const adminUsersOptions = queryOptions({
  queryKey: ["admin-users"],
  staleTime: 60_000,
  gcTime: 300_000,
  refetchInterval: 60_000,
  queryFn: async ({ signal }): Promise<AdminUsersResult> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { isAdmin: false, rows: [] };
    const { data: myRoles, error: myErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .abortSignal(signal);
    if (myErr) throw myErr;
    if (!(myRoles ?? []).some((r) => r.role === "admin")) return { isAdmin: false, rows: [] };

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, approved, approved_at, created_at, last_seen_at")
        .order("created_at", { ascending: false })
        .abortSignal(signal),
      supabase.from("user_roles").select("user_id, role").abortSignal(signal),
    ]);
    if (pErr) throw pErr;
    if (rErr) throw rErr;

    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      if (r.role === "admin" || !cur) roleMap.set(r.user_id, r.role);
    });
    return {
      isAdmin: true,
      rows: (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        approved: p.approved,
        approved_at: p.approved_at,
        created_at: p.created_at,
        last_seen_at: p.last_seen_at,
        role: normalizeRole(roleMap.get(p.id) ?? "user"),
      })),
    };
  },
});
