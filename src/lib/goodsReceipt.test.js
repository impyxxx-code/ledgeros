import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("./supabase.js", () => ({ sb: { rpc: (...a) => rpc(...a) } }));

import { buildReceipts, receivePurchaseOrder } from "./goodsReceipt.js";

describe("buildReceipts", () => {
  it("clamps each qty to the remaining (ordered - received)", () => {
    const lines = [
      { id: "a", qty: 10, qty_received: 3 },
      { id: "b", qty: 5, qty_received: 0 },
    ];
    const inputs = { a: "20", b: "2" }; // a over-asks
    expect(buildReceipts(lines, inputs)).toEqual([
      { line_id: "a", qty: 7 },
      { line_id: "b", qty: 2 },
    ]);
  });

  it("drops lines with nothing to receive (0, negative, blank, fully received)", () => {
    const lines = [
      { id: "a", qty: 10, qty_received: 10 }, // already complete
      { id: "b", qty: 5, qty_received: 0 },
      { id: "c", qty: 5, qty_received: 0 },
      { id: "d", qty: 5, qty_received: 0 },
    ];
    const inputs = { a: "3", b: "0", c: "-4", d: "" };
    expect(buildReceipts(lines, inputs)).toEqual([]);
  });

  it("handles missing inputs and non-numeric safely", () => {
    const lines = [{ id: "a", qty: 5, qty_received: 0 }];
    expect(buildReceipts(lines, {})).toEqual([]);
    expect(buildReceipts(lines, { a: "abc" })).toEqual([]);
    expect(buildReceipts(null, null)).toEqual([]);
  });

  it("floors fractional input via parseInt", () => {
    const lines = [{ id: "a", qty: 10, qty_received: 0 }];
    expect(buildReceipts(lines, { a: "3.9" })).toEqual([{ line_id: "a", qty: 3 }]);
  });
});

describe("receivePurchaseOrder", () => {
  beforeEach(() => rpc.mockReset());

  it("returns {reason:'nothing'} without calling the RPC when receipts is empty", async () => {
    const r = await receivePurchaseOrder({ token: "t", poId: "p", receipts: [] });
    expect(r).toEqual({ ok: false, reason: "nothing" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps a successful RPC result", async () => {
    rpc.mockResolvedValue({ ok: true, status: "partial", lines: [{ line_id: "a", applied: 2 }] });
    const r = await receivePurchaseOrder({ token: "t", poId: "p", receipts: [{ line_id: "a", qty: 2 }] });
    expect(r).toEqual({ ok: true, status: "partial", lines: [{ line_id: "a", applied: 2 }] });
    expect(rpc).toHaveBeenCalledWith("t", "receive_purchase_order", { p_po_id: "p", p_receipts: [{ line_id: "a", qty: 2 }] });
  });

  it("maps business blocks (cancelled / not_found)", async () => {
    rpc.mockResolvedValue({ ok: false, reason: "cancelled" });
    expect(await receivePurchaseOrder({ token: "t", poId: "p", receipts: [{ line_id: "a", qty: 1 }] }))
      .toEqual({ ok: false, reason: "cancelled" });
  });

  it("flags a missing function as needsSql (PGRST202)", async () => {
    rpc.mockResolvedValue({ code: "PGRST202", message: "not found" });
    expect(await receivePurchaseOrder({ token: "t", poId: "p", receipts: [{ line_id: "a", qty: 1 }] }))
      .toEqual({ ok: false, needsSql: true });
  });

  it("treats a null (expired-session) result as an error", async () => {
    rpc.mockResolvedValue(null);
    const r = await receivePurchaseOrder({ token: "t", poId: "p", receipts: [{ line_id: "a", qty: 1 }] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/session expired/i);
  });

  it("defaults lines to [] when the RPC omits them", async () => {
    rpc.mockResolvedValue({ ok: true, status: "received" });
    const r = await receivePurchaseOrder({ token: "t", poId: "p", receipts: [{ line_id: "a", qty: 1 }] });
    expect(r).toEqual({ ok: true, status: "received", lines: [] });
  });
});
