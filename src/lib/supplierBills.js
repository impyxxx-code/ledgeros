// ── Supplier-bill helpers ─────────────────────────────────────────────────────
// Pure logic for two robustness fixes on the supplier side:
//   1. duplicate-bill detection — the same supplier bill entered twice doubles
//      COGS and Accounts Payable;
//   2. bill-payment computation — the old code silently truncated an overpayment
//      (Math.min(amt, balance)), so paying more than the balance made the excess
//      vanish with no supplier credit and no warning.

// Returns the first already-recorded bill matching (supplier_id, bill_number),
// or null. A blank bill number can't be de-duplicated, so it's always allowed.
// Case/whitespace-insensitive on the number.
export function findDuplicateBill(bills, { supplier_id, bill_number }) {
  const bn = (bill_number || "").trim().toLowerCase();
  if (!bn) return null;
  return (bills || []).find(
    (b) => b && b.supplier_id === supplier_id && (b.bill_number || "").trim().toLowerCase() === bn
  ) || null;
}

// Computes how a payment of `amt` applies to `bill`. Never invents money: the
// caller should refuse to persist when `overpay` is true rather than silently
// drop the excess. `balance` prefers the stored value, else total - amount_paid.
export function computeBillPayment(bill, amt) {
  const total = parseFloat(bill?.total) || 0;
  const prevPaid = parseFloat(bill?.amount_paid) || 0;
  const storedBal = parseFloat(bill?.balance);
  const balance = Number.isFinite(storedBal) ? storedBal : Math.max(0, total - prevPaid);
  const pay = parseFloat(amt) || 0;

  const overpay = pay > balance + 0.005; // penny tolerance
  const applied = Math.min(pay, balance);
  const newPaid = prevPaid + applied;
  const newBalance = Math.max(0, total - newPaid);
  const newStatus = newBalance <= 0.005 ? "paid" : "partial";

  return { balance, applied, overpay, excess: Math.max(0, pay - balance), newPaid, newBalance, newStatus };
}
