import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SENDGRID_KEY = Deno.env.get("SENDGRID_API_KEY")!;

const COMPANY = {
  name: "Arkham Retail Ltd",
  address: "2 Fieldhead Street, Fieldhead Business Centre",
  city: "Bradford, West Yorkshire, BD7 1LW",
  phone: "07801 567209 / 07851 983151",
  email: "ARKHAMRETAIL@GMAIL.COM",
  vat: "GB462229106",
  bank: "Tide Bank",
  sortCode: "04-06-05",
  account: "23058246",
};

function fmt(n: number): string {
  return "£" + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtDate(d: string): string {
  return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function daysOverdue(inv: Record<string, string>): number {
  return Math.max(0, Math.floor((Date.now() - new Date(inv.due_date || inv.invoice_date).getTime()) / 86400000));
}

// Outstanding balance — falls back to the full amount when balance isn't tracked.
function openBalance(inv: Record<string, string>): number {
  const b = parseFloat(inv.balance);
  return b > 0 ? b : parseFloat(inv.amount || "0");
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { "Authorization": `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "noreply@arkos.uk", name: COMPANY.name },   // must match the verified SendGrid sender used by api/send-email.js
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
  return res.status === 202;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type OverdueRow = { invoice_number: string; due_date: string; days: number; balance: number };

// One consolidated reminder per customer, listing all their overdue invoices.
function buildHtml(customerName: string, rows: OverdueRow[], total: number): string {
  const worst = rows.reduce((m, r) => Math.max(m, r.days), 0);
  const urgency = worst > 60 ? "Final Reminder" : worst > 30 ? "Overdue Notice" : "Payment Reminder";
  const tableRows = rows.map(r => `<tr><td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600">${esc(r.invoice_number)}</td><td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${fmtDate(r.due_date)}</td><td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#dc2626;font-weight:700">${r.days}</td><td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;font-weight:700">${fmt(r.balance)}</td></tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f0f2f5;padding:24px 16px}.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden}.hdr{background:#b45309;padding:24px 32px}.hdr-title{color:#fff;font-size:18px;font-weight:800}.hdr-sub{color:rgba(255,255,255,.6);font-size:11px;margin-top:2px}.body{padding:32px}.alert{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-bottom:24px}.alert-text{font-size:13px;color:#9a3412;line-height:1.6}.eyebrow{font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}.amount{font-size:34px;font-weight:900;color:#b45309;letter-spacing:-1px;margin:4px 0 20px}table{width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}thead tr{background:#b45309}th{padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#fff;text-align:left}th:nth-child(3),th:nth-child(4){text-align:right}.bank{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px}.bank-title{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:4px}.bank-sub{font-size:11px;color:#64748b;margin-bottom:12px}.bank-row{display:flex;gap:24px}.bank-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px}.bank-val{font-size:12px;font-weight:700;color:#0f172a}.ftr{background:#f8fafc;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;line-height:1.7}</style></head><body><div class="wrap"><div class="hdr"><div class="hdr-title">${urgency}</div><div class="hdr-sub">${COMPANY.name} · Action Required</div></div><div class="body"><div class="alert"><div class="alert-text">Dear <strong>${esc(customerName)}</strong>, the following ${rows.length} invoice${rows.length !== 1 ? "s are" : " is"} <strong>overdue</strong> on your account. Please arrange payment at your earliest convenience to avoid disruption to your supply.</div></div><div class="eyebrow">Total Overdue</div><div class="amount">${fmt(total)}</div><table><thead><tr><th>Invoice</th><th>Due Date</th><th>Days Overdue</th><th>Balance</th></tr></thead><tbody>${tableRows}</tbody></table><div class="bank"><div class="bank-title">How to Pay</div><div class="bank-sub">Please quote your invoice number(s) as the payment reference. Contact us if you have already paid.</div><div class="bank-row"><div><div class="bank-lbl">Bank</div><div class="bank-val">${COMPANY.bank}</div></div><div><div class="bank-lbl">Sort Code</div><div class="bank-val">${COMPANY.sortCode}</div></div><div><div class="bank-lbl">Account</div><div class="bank-val">${COMPANY.account}</div></div></div></div><p style="font-size:12px;color:#64748b;line-height:1.6">If you have already made payment please disregard this reminder. Contact us at ${COMPANY.email} or ${COMPANY.phone}.</p></div><div class="ftr">${COMPANY.name} · ${COMPANY.address}, ${COMPANY.city}<br>${COMPANY.email} · Tel: ${COMPANY.phone} · VAT: ${COMPANY.vat}</div></div></body></html>`;
}

export default {
  async fetch(req: Request): Promise<Response> {
    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = body.dry_run === true;
    } catch (_) { /* no body */ }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: invoices, error: invErr } = await sb
      .from("invoices")
      .select("*")
      .eq("status", "overdue")
      .order("due_date", { ascending: true });

    if (invErr) {
      return Response.json({ error: invErr.message }, { status: 500 });
    }

    const { data: contacts } = await sb
      .from("contacts")
      .select("id, name, email, phone")
      .not("email", "is", null);

    const contactMap = new Map((contacts || []).map((c: Record<string, string>) => [c.name, c]));

    // Group all overdue invoices by customer → one consolidated email each.
    const byCustomer = new Map<string, Record<string, string>[]>();
    for (const inv of (invoices || [])) {
      if (!byCustomer.has(inv.customer)) byCustomer.set(inv.customer, []);
      byCustomer.get(inv.customer)!.push(inv);
    }

    const results: Record<string, unknown>[] = [];
    let emailed = 0;              // customers emailed
    let skippedInvoices = 0;      // invoices skipped (no email on file)

    for (const [customer, invs] of byCustomer) {
      const contact = contactMap.get(customer);

      if (!contact?.email) {
        skippedInvoices += invs.length;
        results.push({ customer, invoices: invs.length, status: "skipped — no email" });
        continue;
      }

      const rows: OverdueRow[] = invs.map((inv) => ({
        invoice_number: inv.invoice_number,
        due_date: inv.due_date || inv.invoice_date,
        days: daysOverdue(inv),
        balance: openBalance(inv),
      }));
      const total = rows.reduce((s, r) => s + r.balance, 0);
      const worst = rows.reduce((m, r) => Math.max(m, r.days), 0);
      const urgency = worst > 60 ? "Final Reminder — " : worst > 30 ? "Overdue Notice — " : "Payment Reminder — ";
      const subject = `${urgency}${fmt(total)} outstanding — ${COMPANY.name}`;
      const html = buildHtml(customer, rows, total);

      if (!dryRun) {
        const ok = await sendEmail(contact.email, subject, html);
        if (ok) {
          await sb.from("audit_log").insert({
            action: "auto_reminder_sent",
            description: `Auto reminder sent to ${contact.email} — ${rows.length} overdue invoice(s), ${fmt(total)}`,
            entity_type: "contact",
            entity_id: contact.id || null,
            user_id: null,
            created_at: new Date().toISOString(),
          });
          emailed++;
          results.push({ customer, email: contact.email, invoices: rows.length, total, status: "sent" });
        } else {
          results.push({ customer, email: contact.email, invoices: rows.length, total, status: "failed" });
        }
      } else {
        results.push({ customer, email: contact.email, invoices: rows.length, total, worst, status: "dry_run" });
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      total_overdue: invoices?.length || 0,
      customers: byCustomer.size,
      emailed,
      skipped_invoices: skippedInvoices,
      results,
    });
  },
};
