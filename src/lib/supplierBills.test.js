import { describe, it, expect } from "vitest";
import { findDuplicateBill, computeBillPayment } from "./supplierBills.js";

describe("findDuplicateBill", () => {
  const bills = [
    { id: "1", supplier_id: "s1", bill_number: "INV-100", total: 50 },
    { id: "2", supplier_id: "s2", bill_number: "INV-100", total: 99 },
  ];

  it("finds a same-supplier same-number bill (case/space-insensitive)", () => {
    expect(findDuplicateBill(bills, { supplier_id: "s1", bill_number: " inv-100 " })?.id).toBe("1");
  });

  it("does not match the same number under a different supplier", () => {
    expect(findDuplicateBill(bills, { supplier_id: "s3", bill_number: "INV-100" })).toBeNull();
  });

  it("allows a blank bill number (can't de-dupe)", () => {
    expect(findDuplicateBill(bills, { supplier_id: "s1", bill_number: "" })).toBeNull();
    expect(findDuplicateBill(bills, { supplier_id: "s1", bill_number: null })).toBeNull();
  });

  it("returns null against an empty/undefined list", () => {
    expect(findDuplicateBill([], { supplier_id: "s1", bill_number: "INV-100" })).toBeNull();
    expect(findDuplicateBill(undefined, { supplier_id: "s1", bill_number: "INV-100" })).toBeNull();
  });
});

describe("computeBillPayment", () => {
  const bill = { total: 100, amount_paid: 30, balance: 70 };

  it("applies a partial payment", () => {
    const r = computeBillPayment(bill, 20);
    expect(r).toMatchObject({ applied: 20, overpay: false, newPaid: 50, newBalance: 50, newStatus: "partial" });
  });

  it("settles exactly to paid", () => {
    const r = computeBillPayment(bill, 70);
    expect(r).toMatchObject({ applied: 70, overpay: false, newBalance: 0, newStatus: "paid" });
  });

  it("flags an overpayment (and does not fabricate a negative balance)", () => {
    const r = computeBillPayment(bill, 120);
    expect(r.overpay).toBe(true);
    expect(r.excess).toBeCloseTo(50, 2);
    expect(r.applied).toBe(70); // caller should refuse rather than persist this
  });

  it("derives balance from total - amount_paid when stored balance is missing", () => {
    const r = computeBillPayment({ total: 100, amount_paid: 40 }, 60);
    expect(r.balance).toBe(60);
    expect(r).toMatchObject({ applied: 60, overpay: false, newStatus: "paid" });
  });

  it("tolerates a penny rounding at the boundary", () => {
    const r = computeBillPayment({ total: 100, amount_paid: 0, balance: 100 }, 100.004);
    expect(r.overpay).toBe(false);
    expect(r.newStatus).toBe("paid");
  });
});
