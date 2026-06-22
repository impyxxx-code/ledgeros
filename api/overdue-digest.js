// ── Overdue Invoices Digest ─────────────────────────────────────────────────
// Runs daily via Vercel Cron. Emails admin a summary of all overdue invoices.

const fmt = (n) => "£" + parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async function handler(req, res) {
  // Vercel Cron sends GET with this header automatically — reject anything else
  const CRON_SECRET = process.env.CRON_SECRET;
  if (CRON_SECRET) {
    const auth = req.headers["authorization"] || "";
    if (auth !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: "Unauthorized" });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_DIGEST_EMAIL || "ARKHAMRETAIL@GMAIL.COM";

  if (!SUPABASE_URL || !SERVICE_KEY || !SENDGRID_KEY) {
    return res.status(500).json({ error: "Missing required env vars" });
  }

  try {
    const invRes = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?status=eq.overdue&select=invoice_number,customer,amount,balance,due_date&order=balance.desc`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const overdue = await invRes.json();
    if (!Array.isArray(overdue) || overdue.length === 0) {
      return res.status(200).json({ success: true, sent: false, reason: "No overdue invoices" });
    }

    const now = Date.now();
    const rows = overdue.map((inv) => ({
      customer: inv.customer,
      invoice_number: inv.invoice_number,
      balance: parseFloat(inv.balance) > 0 ? parseFloat(inv.balance) : parseFloat(inv.amount) || 0,
      daysOverdue: Math.max(0, Math.floor((now - new Date(inv.due_date || inv.invoice_date).getTime()) / 86400000)),
    }));
    const totalOverdue = rows.reduce((s, r) => s + r.balance, 0);

    const css = `body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f2f5;margin:0;padding:24px 16px}.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09)}.hdr{background:#b45309;padding:24px 32px;display:flex;align-items:center;gap:14px}.hdr-mark{width:40px;height:40px;background:#92400e;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.hdr-title{color:#fff;font-size:18px;font-weight:800;letter-spacing:-.3px}.hdr-sub{color:rgba(255,255,255,.45);font-size:11px;margin-top:2px}.body{padding:32px}.eyebrow{font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}.amount{font-size:34px;font-weight:900;color:#0f172a;letter-spacing:-1px;margin:4px 0 20px}table{width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}thead tr{background:#b45309}th{padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#fff;text-align:left}th:last-child,td:last-child{text-align:right}td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}tr:last-child td{border-bottom:none}.ftr{background:#f8fafc;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;line-height:1.7}`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="wrap"><div class="hdr"><div class="hdr-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div><div class="hdr-title">Overdue Invoices Digest</div><div class="hdr-sub">Arkham Retail Ltd · ${rows.length} invoice${rows.length !== 1 ? "s" : ""} overdue</div></div></div><div class="body"><div class="eyebrow">Total overdue</div><div class="amount">${fmt(totalOverdue)}</div><table><thead><tr><th>Customer</th><th>Invoice #</th><th style="text-align:right">Days Overdue</th><th style="text-align:right">Balance</th></tr></thead><tbody>${rows
      .map(
        (r) =>
          `<tr><td style="font-weight:600">${escHtml(r.customer)}</td><td>${escHtml(r.invoice_number)}</td><td style="text-align:right;color:#dc2626;font-weight:700">${r.daysOverdue}</td><td style="text-align:right;font-weight:700">${fmt(r.balance)}</td></tr>`
      )
      .join("")}</tbody></table></div><div class="ftr">Arkham Retail Ltd · 2 Fieldhead Street, Bradford, BD7 1LW<br>Generated automatically · LedgerOS</div></div></body></html>`;

    const sendRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: ADMIN_EMAIL }] }],
        from: { email: "noreply@arkos.uk", name: "LedgerOS" },
        subject: `Overdue Invoices Digest — ${rows.length} invoice${rows.length !== 1 ? "s" : ""} — ${fmt(totalOverdue)} outstanding`,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (sendRes.status === 202) return res.status(200).json({ success: true, sent: true, count: rows.length, total: totalOverdue });
    return res.status(500).json({ error: "SendGrid send failed", status: sendRes.status });
  } catch (e) {
    return res.status(500).json({ error: "Internal error", message: e.message });
  }
}
