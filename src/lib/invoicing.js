// ── Invoice settlement ────────────────────────────────────────────────────────
// One consistent path for recording money against an invoice. Every "mark paid",
// bulk-pay, status→paid, and create-as-paid flow routes through settleInvoice so
// they ALL: patch {amount_paid, balance, status}, insert an invoice_payments row,
// and post the payment journal — instead of each call site doing a partial subset
// (which is how invoices ended up "paid" yet still carrying a balance, with no
// payment row and no cash in the ledger).
import { sb } from "./supabase.js";
import { postPaymentJournal } from "./journal.js";

const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || "");

// remainingBalance: how much is still owed right now (amount − amount_paid), never negative.
// Use this as `payNow` when settling an invoice in full.
export function remainingBalance(invoice) {
  const amount = parseFloat(invoice?.amount) || 0;
  const prevPaid = parseFloat(invoice?.amount_paid) || 0;
  return Math.max(0, amount - prevPaid);
}

// computeSettlement: pure calc of the invoice's new money state after receiving `payNow`.
// - amountPaid is capped at the invoice amount (overpayment is reported separately, not stored).
// - status becomes "paid" once the balance clears, else "partial".
export function computeSettlement(invoice, payNow) {
  const amount = parseFloat(invoice?.amount) || 0;
  const prevPaid = parseFloat(invoice?.amount_paid) || 0;
  let pay = parseFloat(payNow);
  if (!isFinite(pay) || pay < 0) pay = 0;
  const totalPaid = prevPaid + pay;
  const overpayment = Math.max(0, totalPaid - amount);
  const amountPaid = Math.min(totalPaid, amount);
  const balance = Math.max(0, amount - totalPaid);
  const status = balance <= 0 ? "paid" : "partial";
  return { amount, prevPaid, pay, totalPaid, overpayment, amountPaid, balance, status };
}

// settleInvoice: apply a payment to an invoice and record it everywhere it belongs.
// Returns { ok, error, paymentError, ...settlement }.
//   ok === false        → the invoice patch failed; nothing was recorded, don't touch UI/ledger.
//   paymentError != null → invoice updated but the payment-ledger row failed (surface a warning).
// The journal post is best-effort (non-fatal by design in journal.js).
export async function settleInvoice({ token, invoice, payNow, method = "cash", date, accounts = [], userId, profile }) {
  const s = computeSettlement(invoice, payNow);
  const payDate = date || new Date().toISOString().split("T")[0];

  // 1) Patch the invoice — the source of truth. Fail loudly if this doesn't land.
  const patchRes = await sb
    .patch(token, "invoices", invoice.id, { amount_paid: s.amountPaid, balance: s.balance, status: s.status, payment_method: method })
    .catch((e) => ({ error: e }));
  if (!patchRes || patchRes.error || (patchRes.code && !Array.isArray(patchRes))) {
    return { ok: false, error: patchRes?.message || patchRes?.error?.message || "Failed to update invoice", paymentError: null, ...s };
  }

  // 2) Payment-ledger row + journal — only when cash actually moved this transaction.
  let paymentError = null;
  if (s.pay > 0) {
    const payRow = {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer: invoice.customer,
      amount: s.pay,
      method,
      payment_date: payDate,
      notes: s.overpayment > 0 ? `Full payment + £${s.overpayment.toFixed(2)} overpayment` : s.status === "paid" ? "Full payment" : "Partial payment",
      recorded_by_name: profile?.full_name || "Admin",
    };
    if (isUUID(userId)) payRow.recorded_by = userId;
    const payRes = await sb.addPayment(token, payRow).catch((e) => ({ error: e }));
    if (payRes?.error || payRes?.code) paymentError = payRes?.message || "Payment ledger insert failed";

    await postPaymentJournal(token, accounts, { invoice_id: invoice.id, invoice_number: invoice.invoice_number, amount: s.pay, date: payDate });
  }

  return { ok: true, error: null, paymentError, ...s };
}
