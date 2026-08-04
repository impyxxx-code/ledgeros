import { describe, it, expect } from "vitest";
import { openBalance } from "./CreditControl.jsx";

// Regression tests for audit item #7: openBalance must net amount_paid (via
// balanceDue) instead of falling back to the full invoice amount, and must never
// count draft or cancelled invoices as debt.
describe("openBalance", () => {
  it("nets amount_paid when the stored balance is missing (the #7 bug)", () => {
    // Legacy/imported partial: 100 invoiced, 40 paid, balance never populated.
    expect(openBalance({ status: "partial", amount: 100, amount_paid: 40, balance: null })).toBe(60);
  });

  it("prefers the stored balance when present", () => {
    expect(openBalance({ status: "partial", amount: 100, amount_paid: 40, balance: 60 })).toBe(60);
  });

  it("returns the full amount when nothing is paid and no balance stored", () => {
    expect(openBalance({ status: "pending", amount: 100 })).toBe(100);
  });

  it("returns 0 for a paid invoice", () => {
    expect(openBalance({ status: "paid", amount: 100, amount_paid: 100 })).toBe(0);
  });

  it("returns 0 for a draft invoice regardless of amount", () => {
    expect(openBalance({ status: "draft", amount: 500, balance: 500 })).toBe(0);
  });

  it("returns 0 for a cancelled invoice (was previously counted as debt)", () => {
    expect(openBalance({ status: "cancelled", amount: 250, balance: 250 })).toBe(0);
  });

  it("never returns negative on an overpaid invoice", () => {
    expect(openBalance({ status: "partial", amount: 100, amount_paid: 130, balance: null })).toBe(0);
  });

  it("handles null/undefined invoices", () => {
    expect(openBalance(null)).toBe(0);
    expect(openBalance(undefined)).toBe(0);
  });
});
