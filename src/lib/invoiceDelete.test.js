import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase client so we can drive deleteInvoiceCascade with each shape
// of response the delete_invoice_cascade RPC (or PostgREST) can return.
const rpc = vi.fn();
vi.mock("./supabase.js", () => ({ sb: { rpc: (...a) => rpc(...a) } }));

import { deleteInvoiceCascade } from "./invoiceDelete.js";

describe("deleteInvoiceCascade", () => {
  beforeEach(() => rpc.mockReset());

  it("passes the invoice id to the RPC as p_invoice_id", async () => {
    rpc.mockResolvedValue({ ok: true, entries_deleted: 2, payments_deleted: 1 });
    await deleteInvoiceCascade({ token: "t", invoiceId: "inv-123" });
    expect(rpc).toHaveBeenCalledWith("t", "delete_invoice_cascade", { p_invoice_id: "inv-123" });
  });

  it("reports success with entry + payment counts", async () => {
    rpc.mockResolvedValue({ ok: true, entries_deleted: 4, payments_deleted: 2 });
    expect(await deleteInvoiceCascade({ token: "t", invoiceId: "x" }))
      .toEqual({ ok: true, entries: 4, payments: 2 });
  });

  it("defaults missing counts to 0", async () => {
    rpc.mockResolvedValue({ ok: true });
    expect(await deleteInvoiceCascade({ token: "t", invoiceId: "x" }))
      .toEqual({ ok: true, entries: 0, payments: 0 });
  });

  it("surfaces a credit-notes block", async () => {
    rpc.mockResolvedValue({ ok: false, blocked: "credit_notes" });
    expect(await deleteInvoiceCascade({ token: "t", invoiceId: "x" }))
      .toEqual({ ok: false, blocked: "credit_notes" });
  });

  it("surfaces a customer-credits block", async () => {
    rpc.mockResolvedValue({ ok: false, blocked: "customer_credits" });
    expect(await deleteInvoiceCascade({ token: "t", invoiceId: "x" }))
      .toEqual({ ok: false, blocked: "customer_credits" });
  });

  it("surfaces a not-found block", async () => {
    rpc.mockResolvedValue({ ok: false, blocked: "not_found" });
    expect(await deleteInvoiceCascade({ token: "t", invoiceId: "x" }))
      .toEqual({ ok: false, blocked: "not_found" });
  });

  it("defaults an ok:false with no reason to a generic block", async () => {
    rpc.mockResolvedValue({ ok: false });
    expect(await deleteInvoiceCascade({ token: "t", invoiceId: "x" }))
      .toEqual({ ok: false, blocked: "linked_documents" });
  });

  it("flags needsSql when the function is not deployed (PGRST202)", async () => {
    rpc.mockResolvedValue({ code: "PGRST202", message: "Could not find function" });
    expect(await deleteInvoiceCascade({ token: "t", invoiceId: "x" }))
      .toEqual({ ok: false, needsSql: true });
  });

  it("surfaces a generic server error message", async () => {
    rpc.mockResolvedValue({ code: "P0001", message: "boom" });
    expect(await deleteInvoiceCascade({ token: "t", invoiceId: "x" }))
      .toEqual({ ok: false, error: "boom" });
  });

  it("treats a null result (expired session) as an auth error", async () => {
    rpc.mockResolvedValue(null);
    const r = await deleteInvoiceCascade({ token: "t", invoiceId: "x" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/session expired/i);
  });
});
