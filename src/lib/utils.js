// ── Shared utility functions ──────────────────────────────────────────────────
export const isMobile = () => window.innerWidth < 768;
export const DEFAULT_REORDER = 5;

export const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtShort = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
export const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
export const fmtRelative = (d) => {
  if (!d) return { line1: "—", line2: "" };
  const date = new Date(d); const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return { line1: "Today", line2: fmtTime(d) };
  if (diffDays === 1) return { line1: "Yesterday", line2: fmtTime(d) };
  if (diffDays < 7) return { line1: diffDays + "d ago", line2: fmtTime(d) };
  return { line1: fmtShort(d), line2: fmtTime(d) };
};
export const dueDelta = (d) => { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000); };
export const today = () => new Date().toISOString().split("T")[0];

// balanceDue: the outstanding amount to DISPLAY for an invoice.
// - A "paid" invoice always shows 0 (fixes the old `balance>0 && balance<total ? balance : total`
//   pattern that fell through to the full total when balance === 0).
// - Otherwise prefer the stored `balance`; if it's absent, derive it from amount − amount_paid.
// Uses the stored invoice `amount` (VAT-inclusive grand total), not a line-recomputed total, so
// legacy invoices with no stored lines don't get inflated. Capped to [0, amount].
export const balanceDue = (invoice) => {
  if (!invoice) return 0;
  if (invoice.status === "paid") return 0;
  const amount = parseFloat(invoice.amount) || 0;
  const paid = parseFloat(invoice.amount_paid) || 0;
  const hasBal = invoice.balance !== null && invoice.balance !== undefined && invoice.balance !== "";
  let bal = hasBal ? parseFloat(invoice.balance) : amount - paid;
  if (isNaN(bal)) bal = amount - paid;
  if (amount > 0) bal = Math.min(bal, amount);
  return Math.max(0, bal);
};
export const escHtml = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

// ── CSV export safety ─────────────────────────────────────────────────────────
// Renders one value as a safe CSV cell: neutralises formula-injection (a cell a
// spreadsheet could execute) and always quotes/escapes so commas, quotes and
// newlines can't break the row. A leading '=' or '@' — or '+'/'-' followed by a
// non-number — is prefixed with a single quote so Excel/Sheets treat it as text.
// Plain numbers (incl. negatives) and phone numbers like +44… are left untouched.
export const csvCell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=@\t\r]/.test(s) || /^[+-][^\d.]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
// Build a full CSV document from a header row + data rows, each cell sanitised.
export const buildCsv = (header, rows) =>
  [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");

// shortName: strips namespace/category prefix — "VAPE:DISPOSABLES:HAYATI 6K" → "HAYATI 6K"
export const shortName = (n) => { if (!n) return n; const p = n.split(":"); return p[p.length - 1].trim(); };
