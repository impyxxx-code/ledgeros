// ── Ledger-safe invoice deletion ──────────────────────────────────────────────
// Deleting an invoice must also reverse the double-entry postings and account
// balances it created, and remove its payment rows — otherwise the P&L, Balance
// Sheet, Trial Balance and General Ledger keep counting a deleted invoice.
//
// This is done atomically in one DB transaction by the delete_invoice_cascade
// SECURITY DEFINER function (see supabase/DELETE_INVOICE_CASCADE.sql). We never
// attempt a multi-step client-side delete: a half-completed cascade would corrupt
// the ledger worse than the original bug. If the function isn't deployed yet, we
// block the delete with a clear message rather than fall back to the old orphaning
// behaviour.
//
// Returns one of:
//   { ok: true, entries, payments }              — deleted; N entries + M payments reversed
//   { ok: false, blocked: 'credit_notes' }       — has credit notes; cancel instead
//   { ok: false, blocked: 'customer_credits' }   — has customer credits; cancel instead
//   { ok: false, blocked: 'not_found' }          — already gone
//   { ok: false, needsSql: true }                — function not deployed yet
//   { ok: false, error: '<message>' }            — auth/other failure
import { sb } from "./supabase.js";

export async function deleteInvoiceCascade({ token, invoiceId }) {
  const r = await sb.rpc(token, "delete_invoice_cascade", { p_invoice_id: invoiceId });

  // sb.rpc returns null on an expired session (401).
  if (r === null) return { ok: false, error: "Your session expired — please sign in again." };

  if (r.ok === true) {
    return { ok: true, entries: r.entries_deleted || 0, payments: r.payments_deleted || 0 };
  }
  if (r.ok === false) {
    return { ok: false, blocked: r.blocked || "linked_documents" };
  }

  // No `ok` field → PostgREST error object. PGRST202 = function not found (not
  // deployed yet); anything else is a genuine server error.
  if (r.code === "PGRST202") return { ok: false, needsSql: true };
  return { ok: false, error: r.message || "Failed to delete invoice." };
}
