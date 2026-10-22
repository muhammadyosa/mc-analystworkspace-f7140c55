// Aturan murni pengelolaan pengguna — dipakai di klien dan fungsi server,
// dan diuji di user-admin-rules.test.js.

export type AssignableRole = "admin" | "manager" | "analyst" | "viewer";

export const ASSIGNABLE_ROLES: AssignableRole[] = ["admin", "manager", "analyst", "viewer"];

export function isAdminRoles(roles: readonly string[]): boolean {
  return roles.includes("admin");
}

/** Role lama "user" diperlakukan sebagai viewer. */
export function normalizeRole(role: string): AssignableRole {
  return isValidAssignableRole(role) ? role : "viewer";
}

export function isValidAssignableRole(role: string): role is AssignableRole {
  return (ASSIGNABLE_ROLES as string[]).includes(role);
}

/** Hanya admin yang boleh menghapus, dan tidak boleh menghapus akun sendiri. */
export function canDeleteUser(actorIsAdmin: boolean, actorId: string, targetId: string): boolean {
  return actorIsAdmin && actorId !== targetId;
}
