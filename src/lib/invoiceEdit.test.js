import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const get = vi.fn();
vi.mock("./supabase.js", () => ({ sb: { rpc: (...a) => rpc(...a), get: (...a) => get(...a) } }));

import { reconcileStatus, resolveProductLine, fetchContractPrice, reconcileInvoiceJournal } from "./invoiceEdit.js";

describe("reconcileStatus", () => {
  it("keeps the user's status when nothing is paid", () => {
    expect(reconcileStatus({ userStatus: "pending", amountPaid: 0, total: 100 })).toBe("pending");
    expect(reconcileStatus({ userStatus: "overdue", amountPaid: 0, total: 100 })).toBe("overdue");
  });
  it("flags paid when an edit brings the balance to zero", () => {
    expect(reconcileStatus({ userStatus: "partial", amountPaid: 100, total: 100 })).toBe("paid");
    expect(reconcileStatus({ userStatus: "partial", amountPaid: 100, total: 80 })).toBe("paid"); // edited below paid
  });
  it("flags partial when a paid invoice is edited upward (money now owed)", () => {
    expect(reconcileStatus({ userStatus: "paid", amountPaid: 100, total: 150 })).toBe("partial");
  });
  it("tolerates a penny at the boundary", () => {
    expect(reconcileStatus({ userStatus: "partial", amountPaid: 100, total: 100.004 })).toBe("paid");
  });
});

describe("resolveProductLine", () => {
  it("uses the contract price when supplied", () => {
    const r = resolveProductLine({ id: "p1", name: "Widget", sale_price: 10, vat_rate: 20, unit: "box" }, 7.5);
    expect(r).toMatchObject({ product_id: "p1", description: "Widget", unit_price: 7.5, vat_rate: 20, unit: "box", custom_price_applied: true });
  });
  it("falls back to sale_price when there's no contract price", () => {
    const r = resolveProductLine({ id: "p1", name: "Widget", sale_price: 10, vat_rate: 20 }, null);
    expect(r).toMatchObject({ unit_price: 10, custom_price_applied: false, unit: "unit" });
  });
  it("preserves a genuine 0 sale price and 0% VAT (?? not ||)", () => {
    const r = resolveProductLine({ id: "p1", name: "Free sample", sale_price: 0, vat_rate: 0 }, null);
    expect(r.unit_price).toBe(0);
    expect(r.vat_rate).toBe(0);
  });
  it("defaults a missing VAT rate to 20", () => {
    expect(resolveProductLine({ id: "p1", name: "X" }, null).vat_rate).toBe(20);
  });
});

describe("fetchContractPrice", () => {
  beforeEach(() => get.mockReset());
  it("returns null with no customer name", async () => {
    expect(await fetchContractPrice({ token: "t", contacts: [], customerName: "", productId: "p1" })).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
  it("returns null when the customer isn't in contacts", async () => {
    expect(await fetchContractPrice({ token: "t", contacts: [{ id: "c1", name: "Acme" }], customerName: "Other", productId: "p1" })).toBeNull();
  });
  it("returns the custom price when a contract row exists", async () => {
    get.mockResolvedValue([{ custom_price: 42 }]);
    const r = await fetchContractPrice({ token: "t", contacts: [{ id: "c1", name: "Acme" }], customerName: "Acme", productId: "p1" });
    expect(r).toBe(42);
    expect(get).toHaveBeenCalledWith("t", "customer_prices", "contact_id=eq.c1&product_id=eq.p1");
  });
  it("returns null when no contract row / null price", async () => {
    get.mockResolvedValue([]);
    expect(await fetchContractPrice({ token: "t", contacts: [{ id: "c1", name: "Acme" }], customerName: "Acme", productId: "p1" })).toBeNull();
    get.mockResolvedValue([{ custom_price: null }]);
    expect(await fetchContractPrice({ token: "t", contacts: [{ id: "c1", name: "Acme" }], customerName: "Acme", productId: "p1" })).toBeNull();
  });
});

describe("reconcileInvoiceJournal", () => {
  beforeEach(() => rpc.mockReset());
  it("maps a successful reconcile", async () => {
    rpc.mockResolvedValue({ ok: true, old_amount: 100, new_amount: 150, reposted: true });
    const r = await reconcileInvoiceJournal({ token: "t", invoiceId: "i1" });
    expect(r).toEqual({ ok: true, oldAmount: 100, newAmount: 150, reposted: true });
    expect(rpc).toHaveBeenCalledWith("t", "reconcile_invoice_journal", { p_invoice_id: "i1" });
  });
  it("maps business reasons", async () => {
    rpc.mockResolvedValue({ ok: false, reason: "accounts_missing" });
    expect(await reconcileInvoiceJournal({ token: "t", invoiceId: "i1" })).toEqual({ ok: false, reason: "accounts_missing" });
  });
  it("flags a missing function as needsSql", async () => {
    rpc.mockResolvedValue({ code: "PGRST202", message: "nope" });
    expect(await reconcileInvoiceJournal({ token: "t", invoiceId: "i1" })).toEqual({ ok: false, needsSql: true });
  });
  it("treats null (expired session) as an error", async () => {
    rpc.mockResolvedValue(null);
    const r = await reconcileInvoiceJournal({ token: "t", invoiceId: "i1" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/session expired/i);
  });
});
