import { describe, it, expect } from "vitest";
import { computeCOGS } from "./reporting.js";

const PRODUCTS = [
  { id: "p1", name: "Widget", cost_price: 4, stock_qty: 1000 },   // huge stock — must NOT inflate COGS
  { id: "p2", name: "Gadget", cost_price: 10, stock_qty: 500 },
];
const line = (product_id, qty, description) => ({ product_id, qty, description });

// Audit item #8: COGS must be the cost of goods SOLD (from invoice lines,
// recognised as collected), not the value of all stock on hand.
describe("computeCOGS", () => {
  it("is the cost of goods sold on a fully-paid invoice — not inventory value", () => {
    const inv = { amount: 100, amount_paid: 100, lines: JSON.stringify([line("p1", 3)]) };
    // 3 × £4 = £12, NOT 1000 × £4 (stock on hand).
    expect(computeCOGS([inv], PRODUCTS)).toBe(12);
  });

  it("recognises COGS in proportion to how much was collected", () => {
    const inv = { amount: 100, amount_paid: 50, lines: JSON.stringify([line("p1", 10)]) }; // £40 cost, 50% paid
    expect(computeCOGS([inv], PRODUCTS)).toBe(20);
  });

  it("counts nothing for an unpaid invoice", () => {
    const inv = { amount: 100, amount_paid: 0, lines: JSON.stringify([line("p2", 5)]) };
    expect(computeCOGS([inv], PRODUCTS)).toBe(0);
  });

  it("sums multiple lines and multiple invoices", () => {
    const a = { amount: 100, amount_paid: 100, lines: JSON.stringify([line("p1", 2), line("p2", 1)]) }; // 8 + 10 = 18
    const b = { amount: 200, amount_paid: 200, lines: JSON.stringify([line("p2", 3)]) };                // 30
    expect(computeCOGS([a, b], PRODUCTS)).toBe(48);
  });

  it("accepts lines already parsed as an array", () => {
    const inv = { amount: 40, amount_paid: 40, lines: [line("p1", 5)] };
    expect(computeCOGS([inv], PRODUCTS)).toBe(20);
  });

  it("falls back to matching a line by description when product_id is absent", () => {
    const inv = { amount: 40, amount_paid: 40, lines: JSON.stringify([{ qty: 2, description: "Gadget" }]) };
    expect(computeCOGS([inv], PRODUCTS)).toBe(20);
  });

  it("treats unknown products as zero cost", () => {
    const inv = { amount: 40, amount_paid: 40, lines: JSON.stringify([line("ghost", 9, "Nonesuch")]) };
    expect(computeCOGS([inv], PRODUCTS)).toBe(0);
  });

  it("does not crash on malformed lines JSON — skips that invoice's lines", () => {
    const bad = { amount: 40, amount_paid: 40, lines: "{not valid json" };
    const good = { amount: 40, amount_paid: 40, lines: JSON.stringify([line("p1", 1)]) };
    expect(computeCOGS([bad, good], PRODUCTS)).toBe(4);
  });

  it("clamps overpaid invoices to 100% (no over-recognition)", () => {
    const inv = { amount: 100, amount_paid: 150, lines: JSON.stringify([line("p1", 10)]) };
    expect(computeCOGS([inv], PRODUCTS)).toBe(40);
  });

  it("handles empty/missing inputs", () => {
    expect(computeCOGS([], PRODUCTS)).toBe(0);
    expect(computeCOGS(null, null)).toBe(0);
    expect(computeCOGS([{ amount: 0, amount_paid: 0, lines: "[]" }], PRODUCTS)).toBe(0);
  });
});
