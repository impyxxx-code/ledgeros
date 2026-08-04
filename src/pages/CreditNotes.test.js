import { describe, it, expect } from "vitest";
import { computeCreditApplication } from "./CreditNotes.jsx";

// Audit item #6: applying a credit note must record only the portion that fits the
// linked invoice (not the full note) and bank the remainder as customer credit.
describe("computeCreditApplication", () => {
  it("applies a note that fits inside the invoice balance in full", () => {
    // £50 note on a £100 unpaid invoice → £50 applied, none left over, still partial.
    expect(computeCreditApplication(50, { amount: 100, amount_paid: 0 }))
      .toEqual({ applied: 50, excess: 0, actualPaid: 50, balance: 50, newStatus: "partial" });
  });

  it("settles an invoice exactly", () => {
    expect(computeCreditApplication(100, { amount: 100, amount_paid: 0 }))
      .toEqual({ applied: 100, excess: 0, actualPaid: 100, balance: 0, newStatus: "paid" });
  });

  it("caps at the remaining balance and banks the excess (the #6 bug)", () => {
    // £150 note on a £100 invoice → only £100 applied, £50 becomes credit, invoice paid.
    expect(computeCreditApplication(150, { amount: 100, amount_paid: 0 }))
      .toEqual({ applied: 100, excess: 50, actualPaid: 100, balance: 0, newStatus: "paid" });
  });

  it("accounts for prior payments when sizing what fits", () => {
    // £100 invoice already £70 paid → only £30 fits; a £50 note applies £30, banks £20.
    expect(computeCreditApplication(50, { amount: 100, amount_paid: 70 }))
      .toEqual({ applied: 30, excess: 20, actualPaid: 100, balance: 0, newStatus: "paid" });
  });

  it("banks the whole note when the invoice is already fully paid", () => {
    expect(computeCreditApplication(40, { amount: 100, amount_paid: 100 }))
      .toEqual({ applied: 0, excess: 40, actualPaid: 100, balance: 0, newStatus: "paid" });
  });

  it("treats an unlinked note as entirely customer credit", () => {
    expect(computeCreditApplication(75, null))
      .toEqual({ applied: 0, excess: 75, actualPaid: null, balance: null, newStatus: null });
  });

  it("leaves the invoice partial when the note only covers part", () => {
    const r = computeCreditApplication(20, { amount: 100, amount_paid: 0 });
    expect(r.newStatus).toBe("partial");
    expect(r.balance).toBe(80);
    expect(r.excess).toBe(0);
  });

  it("rounds to pennies (no floating-point dust in applied/excess)", () => {
    const r = computeCreditApplication(0.30, { amount: 0.20, amount_paid: 0 });
    expect(r.applied).toBe(0.20);
    expect(r.excess).toBe(0.10);
  });

  it("handles missing/zero amounts safely", () => {
    expect(computeCreditApplication(0, { amount: 100, amount_paid: 0 }))
      .toEqual({ applied: 0, excess: 0, actualPaid: 0, balance: 100, newStatus: "partial" });
  });
});
