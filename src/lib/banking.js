// ── Banking / cash-reconciliation helpers ─────────────────────────────────────
import { sb, SUPABASE_URL } from "./supabase.js";

// ── Pure calculation helpers (unit-tested) ────────────────────────────────────

// Group payments by their calendar day (created_at, falling back to payment_date),
// newest day first.
export function groupPaymentsByDate(payments) {
  const byDate = {};
  for (const p of payments || []) {
    const d = (p.created_at || p.payment_date || "").split("T")[0];
    if (!d) continue;
    (byDate[d] = byDate[d] || []).push(p);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  return { byDate, dates };
}

// Sum by payment method (a missing method counts as cash, matching the UI).
export function paymentMethodTotals(payments) {
  const byMethod = {};
  for (const p of payments || []) {
    const m = p.method || "cash";
    byMethod[m] = (byMethod[m] || 0) + (parseFloat(p.amount) || 0);
  }
  return byMethod;
}

// Physical cash still awaiting deposit: CASH payments on days not yet marked
// banked. Card (auto-settles) and bank transfer (already electronic) are NOT
// physically banked, so they must be excluded from "unbanked cash".
export function unbankedCash(dates, byDate, bankedDates) {
  return (dates || [])
    .filter(d => !bankedDates || !bankedDates[d])
    .reduce((s, d) => s + (byDate[d] || [])
      .filter(p => (p.method || "cash") === "cash")
      .reduce((ss, p) => ss + (parseFloat(p.amount) || 0), 0), 0);
}

// ── Deposit-day persistence (shared, server-side) ─────────────────────────────

// Load all banking_deposit_days rows into { banked:{date:true}, refs:{date:ref} }.
// Non-fatal: returns empty maps on any error (table missing, offline, etc.) so
// the page still works before the migration is run.
export async function loadDepositDays(token) {
  try {
    const rows = await sb.get(token, "banking_deposit_days", "select=deposit_date,banked,deposit_ref&limit=10000");
    const banked = {}, refs = {};
    if (Array.isArray(rows)) {
      for (const r of rows) {
        const d = (r.deposit_date || "").split("T")[0];
        if (!d) continue;
        if (r.banked) banked[d] = true;
        if (r.deposit_ref != null && r.deposit_ref !== "") refs[d] = r.deposit_ref;
      }
    }
    return { banked, refs };
  } catch {
    return { banked: {}, refs: {} };
  }
}

// Upsert one day's banked flag and/or deposit_ref (merge-duplicates on the
// deposit_date PK — omitted columns are left untouched on an existing row).
// Returns { ok } — callers should revert optimistic UI + warn on !ok.
export async function upsertDepositDay(token, { date, banked, depositRef, userId }) {
  if (!date) return { ok: false, error: "no date" };
  const row = { deposit_date: date };
  if (banked !== undefined) row.banked = banked;
  if (depositRef !== undefined) row.deposit_ref = depositRef;
  if (userId != null) row.updated_by = String(userId);
  row.updated_at = new Date().toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/banking_deposit_days`, {
      method: "POST",
      headers: { ...sb.h(token), "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}
