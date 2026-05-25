// Supabase Edge Function — send-reminders
// Runs nightly via pg_cron at 08:00 UTC
// Finds all overdue invoices with customer emails and sends branded reminders

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const fmt = (n: number) =>
  "£" + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const daysOverdue = (inv: any) =>
  Math.max(0, Math.floor((Date.now() - new Date(inv.due_date || inv.invoice_date).getTime()) / 86400000));

const buildReminderHtml = (invoice: any, contact: any) => {
  const days = daysOverdue(invoice);
  const urgency = days > 60 ? "URGENT: " : days > 30 ? "OVERDUE: " : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f2f5;padding:24px 16px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09)}
  .hdr{background:#b45309;padding:24px 32px;display:flex;align-items:center;gap:14px}
  .hdr-mark{width:40px;height:40px;background:#92400e;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .hdr-title{color:#fff;font-size:18px;font-weight:800}
  .hdr-sub{color:rgba(255,255,255,.6);font-size:11px;margin-top:2px}
  .body{padding:32px}
  .alert{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-bottom:24px;display:flex;gap:12px}
  .alert-icon{font-size:20px;flex-shrink:0}
  .alert-text{font-size:13px;color:#9a3412;line-height:1.6}
  .eyebrow{font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
  .amount{font-size:34px;font-weight:900;color:#b45309;letter-spacing:-1px;margin:4px 0 20px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}
  .meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 14px}
  .meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}
  .meta-val{font-size:13px;font-weight:700;color:#0f172a}
  .bank{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px}
  .bank-title{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:4px}
  .bank-sub{font-size:11px;color:#64748b;margin-bottom:12px}
  .bank-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .bank-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px}
  .bank-val{font-size:12px;font-weight:700;color:#0f172a}
  .ftr{background:#f8fafc;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;line-height:1.7}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-mark">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <div>
      <div class="hdr-title">${urgency}Payment Reminder</div>
      <div class="hdr-sub">${COMPANY.name} · Action Required</div>
    </div>
  </div>
  <div class="body">
    <div class="alert">
      <div class="alert-icon">⚠️</div>
      <div class="alert-text">
        <strong>This invoice is ${days} days overdue.</strong> The payment due date was ${fmtDate(invoice.due_date || invoice.invoice_date)}.
        Please arrange payment at your earliest convenience to avoid any disruption to your account.
      </div>
    </div>
    <div class="eyebrow">Outstanding Balance</div>
    <div style="font-size:15px;color:#5c677d;margin-bottom:4px">Owed by <strong style="color:#0f172a">${contact.name}</strong></div>
    <div class="amount">${fmt(invoice.amount)}</div>
    <div class="meta">
      <div class="meta-box"><div class="meta-lbl">Invoice #</div><div class="meta-val">${invoice.invoice_number}</div></div>
      <div class="meta-box"><div class="meta-lbl">Original Due</div><div class="meta-val" style="color:#dc2626">${fmtDate(invoice.due_date || invoice.invoice_date)}</div></div>
      <div class="meta-box"><div class="meta-lbl">Days Overdue</div><div class="meta-val" style="color:#dc2626">${days} days</div></div>
      <div class="meta-box"><div class="meta-lbl">Invoice Amount</div><div class="meta-val">${fmt(invoice.amount)}</div></div>
    </div>
    <div class="bank">
      <div class="bank-title">How to Pay</div>
      <div class="bank-sub">Please use <strong>${invoice.invoice_number}</strong> as your payment reference.</div>
      <div class="bank-grid">
        <div><div class="bank-lbl">Bank</div><div class="bank-val">${COMPANY.bank}</div></div>
        <div><div class="bank-lbl">Sort Code</div><div class="bank-val">${COMPANY.sortCode}</div></div>
        <div><div class="bank-lbl">Account</div><div class="bank-val">${COMPANY.account}</div></div>
      </div>
    </div>
    <p style="font-size:12px;color:#64748b;line-height:1.6">
      If you have already made payment please disregard this reminder and accept our apologies for any inconvenience.
      To discuss your account please contact us at ${COMPANY.email} or call ${COMPANY.phone}.
    </p>
  </div>
  <div class="ftr">
    ${COMPANY.name} · ${COMPANY.address}, ${COMPANY.city}<br>
    ${COMPANY.email} · Tel: ${COMPANY.phone}<br>
    VAT: ${COMPANY.vat}
  </div>
</div>
</body>
</html>`;
};

const sendEmail = async (to: string, subject: string, html: string) => {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SENDGRID_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "ARKHAMRETAIL@GMAIL.COM", name: COMPANY.name },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
  return res.status === 202;
};

serve(async (req) => {
  // Allow manual trigger via POST with optional { dry_run: true }
  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body.dry_run === true;
  } catch {}

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Get all overdue invoices
  const { data: invoices, error: invErr } = await sb
    .from("invoices")
    .select("*")
    .eq("status", "overdue")
    .order("due_date", { ascending: true });

  if (invErr) {
    return new Response(JSON.stringify({ error: invErr.message }), { status: 500 });
  }

  // 2. Get all contacts with emails
  const { data: contacts } = await sb
    .from("contacts")
    .select("name, email, phone")
    .not("email", "is", null);

  const contactMap = new Map((contacts || []).map((c: any) => [c.name, c]));

  const results: any[] = [];
  let sent = 0;
  let skipped = 0;

  // 3. Send reminder for each overdue invoice that has a customer email
  for (const inv of invoices || []) {
    const contact = contactMap.get(inv.customer);

    if (!contact?.email) {
      skipped++;
      results.push({ invoice: inv.invoice_number, customer: inv.customer, status: "skipped — no email" });
      continue;
    }

    const days = daysOverdue(inv);
    const urgency = days > 60 ? "URGENT: " : days > 30 ? "OVERDUE: " : "";
    const subject = `${urgency}Payment Reminder — ${inv.invoice_number} (${fmt(inv.amount)})`;
    const html = buildReminderHtml(inv, contact);

    if (!dryRun) {
      const ok = await sendEmail(contact.email, subject, html);

      if (ok) {
        // Log to audit_log
        await sb.from("audit_log").insert({
          action: "auto_reminder_sent",
          description: `Auto reminder sent for ${inv.invoice_number} to ${contact.email} (${days} days overdue)`,
          entity_type: "invoice",
          entity_id: inv.id,
          user_id: null,
          created_at: new Date().toISOString(),
        });
        sent++;
        results.push({ invoice: inv.invoice_number, customer: inv.customer, email: contact.email, days, status: "sent" });
      } else {
        results.push({ invoice: inv.invoice_number, customer: inv.customer, email: contact.email, days, status: "failed" });
      }
    } else {
      results.push({ invoice: inv.invoice_number, customer: inv.customer, email: contact.email, days, status: "dry_run" });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      dry_run: dryRun,
      total_overdue: invoices?.length || 0,
      sent,
      skipped,
      results,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
