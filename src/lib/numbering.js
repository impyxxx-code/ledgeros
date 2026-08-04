// ── Document numbering ────────────────────────────────────────────────────────
// Race-free numbers for invoices / purchase orders / credit notes.
//
// Preferred path: the atomic next_doc_number() Postgres RPC (see
// supabase/DOC_NUMBERING.sql) — a row-locked counter, so concurrent creators can
// never mint the same number and deletions never cause reuse.
//
// Fallback path (used until that SQL is run): read the current max and add 1.
// This keeps behaviour identical to before the DB function exists, so the code is
// safe to deploy in any order. Note the fallback uses max+1 for ALL series, which
// already fixes the old PO `length+1` delete-reuse bug even before the RPC lands.
import { sb } from "./supabase.js";

const pad = (n, p) => String(n).padStart(p, "0");

// opts: { prefix: "INV", table: "invoices", column: "invoice_number", width: 4 }
export async function nextDocNumber(token, { prefix, table, column, width = 4 }) {
  // 1) Atomic DB counter (preferred).
  try {
    const v = await sb.rpc(token, "next_doc_number", { p_prefix: prefix, p_pad: width });
    if (typeof v === "string" && v.indexOf(prefix + "-") === 0) return v;
  } catch { /* fall through to the max+1 fallback */ }

  // 2) Fallback: current max + 1.
  try {
    const rows = await sb.get(token, table, `select=${column}&order=${column}.desc&limit=1`);
    let n = 1;
    if (Array.isArray(rows) && rows[0] && rows[0][column]) {
      const last = parseInt(String(rows[0][column]).replace(/\D/g, ""), 10);
      if (!Number.isNaN(last)) n = last + 1;
    }
    return `${prefix}-${pad(n, width)}`;
  } catch {
    // Last-ditch: time-based suffix so we never block the user with a hard failure.
    return `${prefix}-${pad(Number(String(Date.now()).slice(-width)), width)}`;
  }
}
