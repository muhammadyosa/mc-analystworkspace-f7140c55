import { describe, it, expect } from "vitest";
import { isAppWorkerAllowed } from "./pwa";
describe("app worker safety", () => {
  it("allows only production top-level published pages", () => {
    expect(isAppWorkerAllowed(true, "mc-analystworkspace.lovable.app", false, "")).toBe(true);
    expect(isAppWorkerAllowed(false, "localhost", false, "")).toBe(false);
    expect(isAppWorkerAllowed(true, "mc-analystworkspace.lovable.app", true, "")).toBe(false);
  });
  it("never registers in preview domains", () => {
    for (const host of [
      "id-preview--example.lovable.app",
      "preview--example.lovable.app",
      "example.lovableproject.com",
      "lovableproject-dev.com",
      "beta.lovable.dev",
    ]) {
      expect(isAppWorkerAllowed(true, host, false, "")).toBe(false);
    }
  });
  it("honors the worker kill switch", () => {
    expect(isAppWorkerAllowed(true, "mc-analystworkspace.lovable.app", false, "?sw=off")).toBe(
      false,
    );
    expect(
      isAppWorkerAllowed(true, "mc-analystworkspace.lovable.app", false, "?month=september"),
    ).toBe(true);
  });
});
