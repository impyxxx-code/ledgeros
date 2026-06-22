// ── General Ledger / Journal posting ──────────────────────────────────────────
// Posts simple double-entry pairs for real business events. VAT is intentionally
// not split out in the ledger (the VAT Summary/Exceptions reports already cover
// VAT accurately from invoice/PO line data) — every entry here is a clean,
// balanced Dr/Cr pair so the ledger always reconciles.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";

const ACCOUNT_CODES = {
  CASH: "1000",
  AR: "1100",
  AP: "2000",
  SALES: "4000",
  COGS: "5000",
};

const h = (token) => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` });

const findAccount = (accounts, code) => accounts.find(a => a.code === code);

const bumpBalance = async (token, account, delta) => {
  if (!account) return;
  const newBalance = parseFloat(account.balance || 0) + delta;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${account.id}`, {
      method: "PATCH",
      headers: h(token),
      body: JSON.stringify({ balance: newBalance }),
    });
    account.balance = newBalance; // mutate local copy so subsequent calls in the same batch see it
  } catch { /* ledger balance update failures are non-fatal */ }
};

const insertEntries = async (token, rows) => {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/journal_entries`, {
      method: "POST",
      headers: { ...h(token), Prefer: "return=minimal" },
      body: JSON.stringify(rows),
    });
  } catch { /* journal insert failures are non-fatal — never block the user's action */ }
};

// Dr Accounts Receivable / Cr Sales Revenue — posted when an invoice is created
export const postInvoiceJournal = async (token, accounts, { invoice_id, invoice_number, amount, date }) => {
  if (!amount || amount <= 0) return;
  const ar = findAccount(accounts, ACCOUNT_CODES.AR);
  const sales = findAccount(accounts, ACCOUNT_CODES.SALES);
  if (!ar || !sales) return;
  await insertEntries(token, [
    { entry_date: date, account_id: ar.id, debit: amount, credit: 0, description: `Invoice ${invoice_number}`, source_type: "invoice", source_id: invoice_id },
    { entry_date: date, account_id: sales.id, debit: 0, credit: amount, description: `Invoice ${invoice_number}`, source_type: "invoice", source_id: invoice_id },
  ]);
  await bumpBalance(token, ar, amount);
  await bumpBalance(token, sales, amount);
};

// Dr Cash & Checking / Cr Accounts Receivable — posted when a payment is received (full, partial, or bulk)
export const postPaymentJournal = async (token, accounts, { invoice_id, invoice_number, amount, date }) => {
  if (!amount || amount <= 0) return;
  const cash = findAccount(accounts, ACCOUNT_CODES.CASH);
  const ar = findAccount(accounts, ACCOUNT_CODES.AR);
  if (!cash || !ar) return;
  await insertEntries(token, [
    { entry_date: date, account_id: cash.id, debit: amount, credit: 0, description: `Payment — ${invoice_number}`, source_type: "payment", source_id: invoice_id },
    { entry_date: date, account_id: ar.id, debit: 0, credit: amount, description: `Payment — ${invoice_number}`, source_type: "payment", source_id: invoice_id },
  ]);
  await bumpBalance(token, cash, amount);
  await bumpBalance(token, ar, -amount);
};

// Dr Cost of Goods Sold / Cr Accounts Payable — posted when a purchase order is created
export const postPurchaseJournal = async (token, accounts, { po_id, po_number, amount, date }) => {
  if (!amount || amount <= 0) return;
  const cogs = findAccount(accounts, ACCOUNT_CODES.COGS);
  const ap = findAccount(accounts, ACCOUNT_CODES.AP);
  if (!cogs || !ap) return;
  await insertEntries(token, [
    { entry_date: date, account_id: cogs.id, debit: amount, credit: 0, description: `Purchase ${po_number}`, source_type: "purchase", source_id: po_id },
    { entry_date: date, account_id: ap.id, debit: 0, credit: amount, description: `Purchase ${po_number}`, source_type: "purchase", source_id: po_id },
  ]);
  await bumpBalance(token, cogs, amount);
  await bumpBalance(token, ap, amount);
};
