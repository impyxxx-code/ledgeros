// ── Invoice-edit helpers ──────────────────────────────────────────────────────
// Backing logic for EditInvoiceModal:
//   * reconcileStatus   — keep status in step with the balance after an edit
//   * resolveProductLine — apply a picked product's price + VAT (+ contract price)
//   * reconcileInvoiceJournal — atomically re-sync the sale journal to the new amount
import { sb } from "./supabase.js";

// After editing lines, the invoice total can change while a payment is already on
// record. Status must follow the resulting balance, not stay frozen: a paid
// invoice edited upward still owes money (→ partial); a partial invoice edited
// down to/under what's paid is settled (→ paid). With nothing paid, the user's
// chosen status (draft/pending/overdue/cancelled) stands.
export function reconcileStatus({ userStatus, amountPaid, total }) {
  const paid = parseFloat(amountPaid) || 0;
  const t = parseFloat(total) || 0;
  if (paid > 0) return Math.max(0, t - paid) <= 0.005 ? "paid" : "partial";
  return userStatus;
}

// Build the line fields for a picked product. Uses ?? (not ||) so a genuine 0
// sale price or 0% VAT is preserved rather than clobbered. `customPrice` is the
// customer-specific contract price when one exists, else null.
export function resolveProductLine(p, customPrice) {
  return {
    product_id: p.id,
    description: p.name || "",
    unit_price: customPrice != null ? customPrice : (p.sale_price ?? ""),
    vat_rate: p.vat_rate ?? 20,
    unit: p.unit || "unit",
    custom_price_applied: customPrice != null,
  };
}

// Fetch a customer-specific contract price for (customerName, product), or null.
// Mirrors InvoiceForm's pick behaviour so edits price the same way new invoices do.
export async function fetchContractPrice({ token, contacts, customerName, productId }) {
  if (!customerName) return null;
  const contact = (contacts || []).find(c => c.name === customerName);
  if (!contact) return null;
  const prices = await sb.get(token, "customer_prices", `contact_id=eq.${contact.id}&product_id=eq.${productId}`);
  if (Array.isArray(prices) && prices[0] && prices[0].custom_price != null) return prices[0].custom_price;
  return null;
}

// Atomically re-sync an invoice's sale journal (Dr AR / Cr Sales) to its current
// amount via the reconcile_invoice_journal RPC. Call AFTER patching the invoice.
// Returns one of:
//   { ok:true, oldAmount, newAmount, reposted }
//   { ok:false, reason:'not_found' | 'accounts_missing' }
//   { ok:false, needsSql:true }           — function not deployed yet
//   { ok:false, error:'<message>' }
export async function reconcileInvoiceJournal({ token, invoiceId }) {
  const r = await sb.rpc(token, "reconcile_invoice_journal", { p_invoice_id: invoiceId });
  if (r === null) return { ok: false, error: "Your session expired — please sign in again." };
  if (r.ok === true) return { ok: true, oldAmount: r.old_amount, newAmount: r.new_amount, reposted: r.reposted };
  if (r.ok === false) return { ok: false, reason: r.reason || "failed" };
  if (r.code === "PGRST202") return { ok: false, needsSql: true };
  return { ok: false, error: r.message || "Failed to reconcile the invoice journal." };
}
