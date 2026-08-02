import { sb } from "./supabase.js";

// ── Stock-movement ledger ────────────────────────────────────────────────────
// Records one immutable movement row for a stock change. Fire-and-forget and
// non-fatal — a ledger write must never block the user's stock update.
//   mv = { product, delta, balance_after, reason, ref_type, ref_id, note, userId, userName }
export const logStockMovement = async (token, { product, delta, balance_after, reason, ref_type, ref_id, note, userId, userName }) => {
  if (!token || !product || !delta) return;
  try {
    await sb.post(token, "stock_movements", {
      product_id: product.id,
      product_name: product.name,
      delta,
      balance_after: balance_after != null ? balance_after : null,
      reason: reason || "manual",
      ref_type: ref_type || "manual",
      ref_id: ref_id != null ? String(ref_id) : null,
      note: note || null,
      created_by: userId || null,
      created_by_name: userName || null,
    });
  } catch (_) { /* ledger write failures are non-fatal */ }
};

// Fetch a product's movement history, newest first.
export const getStockMovements = async (token, productId) => {
  try {
    const d = await sb.get(token, "stock_movements", `product_id=eq.${productId}&order=created_at.desc&limit=100`);
    return Array.isArray(d) ? d : [];
  } catch (_) { return []; }
};
