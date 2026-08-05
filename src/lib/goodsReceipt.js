// ── Atomic goods receipt ──────────────────────────────────────────────────────
// Receiving a PO must update product stock, the PO line's qty_received, and the
// PO status together — or not at all. The old client-side version fired those as
// separate un-transacted patches, so a failure mid-way could leave stock credited
// while the line still showed the units outstanding (→ receivable twice), plus it
// overwrote stock_qty with a stale client-computed value (lost concurrent updates).
//
// The receive_purchase_order SECURITY DEFINER function (see
// supabase/RECEIVE_PURCHASE_ORDER.sql) does it all in one transaction with a
// server-side clamp and an atomic stock increment. If it isn't deployed yet we
// block the receipt with a clear message rather than fall back to the unsafe path.
import { sb } from "./supabase.js";

// Pure: turn the modal's line list + qty inputs into the RPC payload
// [{ line_id, qty }], clamping each qty to the remaining (ordered - received)
// and dropping anything <= 0. Exported for unit testing.
export function buildReceipts(lines, inputs) {
  const out = [];
  for (const l of lines || []) {
    const ordered = parseFloat(l.qty) || 0;
    const already = parseFloat(l.qty_received) || 0;
    const raw = parseInt(inputs?.[l.id], 10) || 0;
    const qty = Math.max(0, Math.min(raw, ordered - already));
    if (qty > 0) out.push({ line_id: l.id, qty });
  }
  return out;
}

// Calls the atomic RPC. Returns one of:
//   { ok:true, status, lines:[{line_id,product_id,product_name,applied,new_stock,qty_received}] }
//   { ok:false, reason:'nothing' }        — nothing to receive (no call made)
//   { ok:false, reason:'not_found' | 'cancelled' }
//   { ok:false, needsSql:true }           — function not deployed yet
//   { ok:false, error:'<message>' }       — session/other failure
export async function receivePurchaseOrder({ token, poId, receipts }) {
  if (!receipts || receipts.length === 0) return { ok: false, reason: "nothing" };

  const r = await sb.rpc(token, "receive_purchase_order", { p_po_id: poId, p_receipts: receipts });

  if (r === null) return { ok: false, error: "Your session expired — please sign in again." };
  if (r.ok === true) return { ok: true, status: r.status, lines: Array.isArray(r.lines) ? r.lines : [] };
  if (r.ok === false) return { ok: false, reason: r.reason || "failed" };
  if (r.code === "PGRST202") return { ok: false, needsSql: true };
  return { ok: false, error: r.message || "Failed to record goods receipt." };
}
