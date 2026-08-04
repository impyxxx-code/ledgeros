import { describe, it, expect } from "vitest";
import { computeSettlement, remainingBalance } from "./invoicing.js";

describe("remainingBalance", () => {
  it("returns amount − amount_paid", () => {
    expect(remainingBalance({ amount: 100, amount_paid: 30 })).toBe(70);
  });
  it("returns the full amount when nothing is paid", () => {
    expect(remainingBalance({ amount: 100 })).toBe(100);
  });
  it("never goes negative", () => {
    expect(remainingBalance({ amount: 100, amount_paid: 120 })).toBe(0);
  });
  it("handles null/undefined", () => {
    expect(remainingBalance(null)).toBe(0);
    expect(remainingBalance(undefined)).toBe(0);
  });
});

describe("computeSettlement", () => {
  it("settles a fresh invoice in full → paid, balance 0, amount_paid = amount", () => {
    const s = computeSettlement({ amount: 100, amount_paid: 0 }, 100);
    expect(s).toMatchObject({ amountPaid: 100, balance: 0, status: "paid", overpayment: 0, pay: 100 });
  });
  it("records a partial payment → partial, correct balance", () => {
    const s = computeSettlement({ amount: 100, amount_paid: 0 }, 40);
    expect(s).toMatchObject({ amountPaid: 40, balance: 60, status: "partial" });
  });
  it("settles the remainder of a partial invoice → paid", () => {
    const s = computeSettlement({ amount: 100, amount_paid: 40 }, 60);
    expect(s).toMatchObject({ amountPaid: 100, balance: 0, status: "paid" });
  });
  it("caps stored amount_paid at the invoice amount and reports overpayment", () => {
    const s = computeSettlement({ amount: 100, amount_paid: 0 }, 150);
    expect(s).toMatchObject({ amountPaid: 100, balance: 0, status: "paid", overpayment: 50 });
  });
  it("treats a zero/invalid payNow as no cash moved", () => {
    const s = computeSettlement({ amount: 100, amount_paid: 25 }, 0);
    expect(s).toMatchObject({ pay: 0, amountPaid: 25, balance: 75, status: "partial" });
    expect(computeSettlement({ amount: 100 }, "abc").pay).toBe(0);
    expect(computeSettlement({ amount: 100 }, -5).pay).toBe(0);
  });
  it("parses string numbers from the DB", () => {
    const s = computeSettlement({ amount: "100.00", amount_paid: "25" }, "75");
    expect(s).toMatchObject({ amountPaid: 100, balance: 0, status: "paid" });
  });
});
