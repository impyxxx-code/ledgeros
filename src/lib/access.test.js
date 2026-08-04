import { describe, it, expect } from "vitest";
import { canViewPage } from "./access.js";

// Audit item #10: admin-only pages must not render for a confirmed non-admin.
const ADMIN = new Set(["settings", "banking", "vat-return", "admin-reports", "credit-control"]);

describe("canViewPage", () => {
  it("blocks a confirmed agent from an admin page", () => {
    expect(canViewPage("settings", "agent", ADMIN)).toBe(false);
    expect(canViewPage("banking", "agent", ADMIN)).toBe(false);
  });

  it("allows admin and manager to view admin pages", () => {
    expect(canViewPage("settings", "admin", ADMIN)).toBe(true);
    expect(canViewPage("banking", "manager", ADMIN)).toBe(true);
  });

  it("allows anyone to view non-admin pages", () => {
    expect(canViewPage("dashboard", "agent", ADMIN)).toBe(true);
    expect(canViewPage("invoices", "agent", ADMIN)).toBe(true);
    expect(canViewPage("inventory", "agent", ADMIN)).toBe(true);
  });

  it("does not lock out a missing/unknown role (matches app's privileged-by-default convention)", () => {
    expect(canViewPage("settings", null, ADMIN)).toBe(true);
    expect(canViewPage("settings", undefined, ADMIN)).toBe(true);
    expect(canViewPage("settings", "", ADMIN)).toBe(true);
  });

  it("allows everything when no admin set is provided", () => {
    expect(canViewPage("settings", "agent", null)).toBe(true);
    expect(canViewPage("settings", "agent", undefined)).toBe(true);
  });
});
