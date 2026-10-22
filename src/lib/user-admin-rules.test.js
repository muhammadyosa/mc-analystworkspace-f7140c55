import { expect, test } from "bun:test";
import {
  canDeleteUser,
  isAdminRoles,
  isValidAssignableRole,
  normalizeRole,
} from "./user-admin-rules.ts";

test("hanya admin yang dianggap admin", () => {
  expect(isAdminRoles(["admin"])).toBe(true);
  expect(isAdminRoles(["manager", "analyst"])).toBe(false);
  expect(isAdminRoles([])).toBe(false);
});

test("admin tidak bisa menghapus akun sendiri", () => {
  expect(canDeleteUser(true, "a", "b")).toBe(true);
  expect(canDeleteUser(true, "a", "a")).toBe(false);
  expect(canDeleteUser(false, "a", "b")).toBe(false);
});

test("hanya empat role yang boleh diberikan; role lama 'user' dinormalisasi ke viewer", () => {
  expect(isValidAssignableRole("admin")).toBe(true);
  expect(isValidAssignableRole("superadmin")).toBe(false);
  expect(normalizeRole("user")).toBe("viewer");
  expect(normalizeRole("manager")).toBe("manager");
  expect(normalizeRole("")).toBe("viewer");
});
