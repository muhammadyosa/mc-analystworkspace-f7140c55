import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canDeleteUser, isValidAssignableRole } from "@/lib/user-admin-rules";

const inviteSchema = z.object({
  email: z.string().trim().email({ message: "Alamat email tidak valid" }).max(255),
  role: z.string(),
});

const deleteSchema = z.object({
  userId: z.string().uuid({ message: "ID pengguna tidak valid" }),
});

type AuthContext = {
  supabase: {
    from: (table: string) => {
      select: (cols: string) => { eq: (col: string, val: string) => Promise<{ data: { role: string }[] | null; error: { message: string } | null }> };
    };
  };
  userId: string;
};

async function requireAdmin(context: AuthContext) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((r) => r.role === "admin")) {
    throw new Error("Hanya admin yang boleh mengelola pengguna.");
  }
}

/** Mengundang pengguna baru via email dan memberikan role awal. */
export const inviteWorkspaceUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as AuthContext);
    if (!isValidAssignableRole(data.role)) throw new Error("Role tidak dikenal.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    if (error) throw new Error(error.message);
    const uid = invited.user?.id;
    if (uid) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: uid, role: data.role });
      if (roleError) throw new Error(roleError.message);
    }
    return { ok: true as const };
  });

/** Menghapus pengguna beserta profil dan rolenya (cascade). */
export const deleteWorkspaceUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as AuthContext);
    if (!canDeleteUser(true, context.userId, data.userId)) {
      throw new Error("Anda tidak bisa menghapus akun sendiri.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
