// ╔══════════════════════════════════════════════════════════════════╗
// ║  LedgerOS — Arkham Retail Ltd                                    ║
// ║  Single-file React app  |  src/App.jsx                           ║
// ║  Stack: React + Vite + Supabase + Vercel + SendGrid              ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  COMPONENT INDEX                                                  ║
// ║  L  898  CommandPalette      Global Ctrl+K search                ║
// ║  L  962  SkeletonTable       Loading placeholder                 ║
// ║  L 1008  OnboardingChecklist First-run checklist                 ║
// ║  L 1060  Auth                Login/Signup                        ║
// ║  L 1144  InvoiceModal        Invoice detail (3 tabs)             ║
// ║  L 1571  InvoiceForm         Create invoice + line items         ║
// ║  L 2086  AgentDashboard      Agent role dashboard                ║
// ║  L 2190  Dashboard           Admin KPI dashboard                 ║
// ║  L 2641  Invoices            Invoice list + actions              ║
// ║  L 2871  Contacts            Customer/supplier management        ║
// ║  L 3629  AdminReports        13-tab reports suite                ║
// ║  L 3922  DeliveryNotes       DN create/print/email               ║
// ║  L 4220  AIAssistant         Hover AI chat panel                 ║
// ║  L 4876  EditInvoiceModal    Edit existing invoice               ║
// ║  L 5041  Settings            App settings                        ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  AUDIT RULES (run before every push)                             ║
// ║  1. All 27 functions must have balanced braces/parens            ║
// ║  2. No duplicate style props on same element                     ║
// ║  3. No bare opacity decimals without leading zero                 ║
// ║  4. No regex literals inside JSX returns                         ║
// ║  5. No variable * decimal expressions in JSX                     ║
// ║  6. Backtick count must be even (template literal balance)       ║
// ╚══════════════════════════════════════════════════════════════════╝

import Analytics from "./Analytics.jsx";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const isMobile = () => window.innerWidth < 768;
const DEFAULT_REORDER = 5;

// ── Toast Notification System ────────────────────────────────────────────────
const toast = (() => {
  let container = null;
  const getContainer = () => {
    if (!container || !document.body.contains(container)) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  };
  const show = (msg, type = 'info', duration = 3500) => {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: 'ti-circle-check', error: 'ti-circle-x', info: 'ti-info-circle', warn: 'ti-alert-triangle' };
    const icon = document.createElement('i');
    icon.className = `ti ${icons[type] || icons.info}`;
    icon.style.cssText = 'font-size:16px;flex-shrink:0';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(icon);
    el.appendChild(span);
    getContainer().appendChild(el);
    const remove = () => { el.style.animation = 'slideOutRight .2s var(--ease) forwards'; setTimeout(() => el.remove(), 200); };
    const timer = setTimeout(remove, duration);
    el.onclick = () => { clearTimeout(timer); remove(); };
    return remove;
  };
  return { success: (m, d) => show(m, 'success', d), error: (m, d) => show(m, 'error', d), info: (m, d) => show(m, 'info', d), warn: (m, d) => show(m, 'warn', d) };
})();

const COMPANY = {
  name: "Arkham Retail Ltd",
  address: "2 Fieldhead Street, Fieldhead Business Centre",
  city: "Bradford, West Yorkshire", postcode: "BD7 1LW",
  phone: "07801 567209 / 07851 983151",
  email: "ARKHAMRETAIL@GMAIL.COM",
  vatNumber: "GB462229106",
  bankName: "Tide Bank",
  sortCode: "04-06-05",
  accountNumber: "23058246",
};

const LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MjAgMTIwIj4KICA8IS0tIEEgLSBncmVlbiAtLT4KICA8dGV4dCB4PSIyMCIgeT0iODgiIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjaywgQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iODIiIGZpbGw9IiMyMmM1NWUiPkE8L3RleHQ+CiAgPCEtLSBSIC0gYmx1ZSAtLT4KICA8dGV4dCB4PSI3MCIgeT0iODgiIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjaywgQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iODIiIGZpbGw9IiMxZTkwZmYiPlI8L3RleHQ+CiAgPCEtLSBWZXJ0aWNhbCBkaXZpZGVyIC0tPgogIDxyZWN0IHg9IjE2NCIgeT0iMTYiIHdpZHRoPSIyIiBoZWlnaHQ9Ijg4IiBmaWxsPSIjMjJjNTVlIiBvcGFjaXR5PSIwLjUiLz4KICA8IS0tIEFSS0hBTSAtIGRhcmsgZm9yIHByaW50IC0tPgogIDx0ZXh0IHg9IjE4MiIgeT0iNTIiIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjaywgQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iMzQiIGxldHRlci1zcGFjaW5nPSIzIiBmaWxsPSIjMGYxNzJhIj5BUktIQU08L3RleHQ+CiAgPCEtLSBHcmVlbiBydWxlIC0tPgogIDxyZWN0IHg9IjE4MiIgeT0iNjAiIHdpZHRoPSIyMjIiIGhlaWdodD0iMiIgZmlsbD0iIzIyYzU1ZSIvPgogIDwhLS0gUkVUQUlMIExURCAtLT4KICA8dGV4dCB4PSIxODIiIHk9IjgyIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtc2l6ZT0iMTQiIGxldHRlci1zcGFjaW5nPSI2IiBmaWxsPSIjMjJjNTVlIj5SRVRBSUwgIExURDwvdGV4dD4KICA8IS0tIFdIT0xFU0FMRSDCtyBSRVRBSUwgLSBkYXJrIGZvciBwcmludCAtLT4KICA8dGV4dCB4PSIxODIiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNDAwIiBmb250LXNpemU9IjEwIiBsZXR0ZXItc3BhY2luZz0iMyIgZmlsbD0iIzY0NzQ4YiI+V0hPTEVTQUxFICDCtyAgUkVUQUlMPC90ZXh0Pgo8L3N2Zz4=";

const sb = {
  h: (t) => ({ "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${t || SUPABASE_ANON_KEY}` }),
  async signIn(e, p) { return (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: sb.h(), body: JSON.stringify({ email: e, password: p }) })).json(); },
  async signUp(e, p, n) {
    const d = await (await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: sb.h(), body: JSON.stringify({ email: e, password: p, data: { full_name: n } }) })).json();
    if (d.access_token && d.user) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles`, { method: "POST", headers: { ...sb.h(d.access_token), "Prefer": "return=representation" }, body: JSON.stringify({ id: d.user.id, full_name: n, role: "agent" }) });
      } catch(err) { console.log("Profile creation failed, will retry on login"); }
    }
    return d;
  },
  async signOut(t) { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: sb.h(t) }); },
  async get(t, table, q = "") { return (await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { headers: sb.h(t) })).json(); },
  async post(t, table, body) { return (await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...sb.h(t), "Prefer": "return=representation" }, body: JSON.stringify(body) })).json(); },
  async patch(t, table, id, body) { return (await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...sb.h(t), "Prefer": "return=representation" }, body: JSON.stringify(body) })).json(); },
};

const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const today = () => new Date().toISOString().split("T")[0];

// ── Send email via Vercel API + SendGrid ──────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html })
    });
    const data = await res.json();
    if (data.success) return { success: true };
    throw new Error(data.error || "Send failed");
  } catch (e) {
    return { success: false, error: e.message };
  }
};

// ── Audit Trail Logger ───────────────────────────────────────────────────────
const logAudit = async (token, userId, action, entity, entityId, details) => {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/audit_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        user_id: userId,
        action,
        entity,
        entity_id: entityId || null,
        details: details || null,
        created_at: new Date().toISOString()
      })
    });
  } catch(e) { console.warn("Audit log failed:", e.message); }
};

const escHtml = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

const _emailCss = (accentBg, accentLight) => `body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f2f5;margin:0;padding:24px 16px}.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09)}.hdr{background:${accentBg};padding:24px 32px;display:flex;align-items:center;gap:14px}.hdr-mark{width:40px;height:40px;background:#1e1b4b;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.hdr-title{color:#fff;font-size:18px;font-weight:800;letter-spacing:-.3px}.hdr-sub{color:rgba(255,255,255,.45);font-size:11px;margin-top:2px}.body{padding:32px}.eyebrow{font-size:11px;font-weight:700;color:${accentLight};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}.amount{font-size:34px;font-weight:900;color:#0f172a;letter-spacing:-1px;margin:4px 0 20px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}.meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 14px}.meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.meta-val{font-size:13px;font-weight:700;color:#0f172a}table{width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}thead tr{background:${accentBg}}th{padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#fff;text-align:left}th:last-child,td:last-child{text-align:right}td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}tr:last-child td{border-bottom:none}.totals{width:260px;margin-left:auto;margin-bottom:24px}.tot-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748b}.balance{border-top:2px solid ${accentBg};margin-top:8px;padding-top:10px;font-size:16px;font-weight:800;color:${accentBg}}.bank{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px}.bank-title{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:4px}.bank-sub{font-size:11px;color:#64748b;margin-bottom:12px}.bank-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.bank-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px}.bank-val{font-size:12px;font-weight:700;color:#0f172a}.alert-box{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;gap:12px;align-items:flex-start}.alert-icon{font-size:20px;flex-shrink:0}.alert-text{font-size:13px;color:#9a3412;line-height:1.6}.dn-items{margin-bottom:20px}.dn-item{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}.dn-item:last-child{border-bottom:none}.dn-name{font-weight:600;color:#0f172a}.dn-qty{font-weight:800;color:${accentLight};font-size:15px}.ftr{background:#f8fafc;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;line-height:1.7}`;

const buildInvoiceEmailHtml = (invoice, lines, subtotal, vatTotal, total) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${_emailCss('#1e1b4b','#818cf8')}</style></head><body><div class="wrap"><div class="hdr"><div class="hdr-mark"><svg width="22" height="22" viewBox="0 0 48 48" fill="none"><rect x="10" y="13" width="28" height="3" rx="1.5" fill="#818cf8"/><rect x="10" y="20" width="20" height="3" rx="1.5" fill="#818cf8" fill-opacity=".6"/><rect x="10" y="27" width="24" height="3" rx="1.5" fill="#818cf8" fill-opacity=".35"/><rect x="30" y="21" width="2.5" height="14" rx="1.25" fill="#60a5fa"/><polygon points="36,27 30,21 30,35" fill="#60a5fa" fill-opacity=".4"/></svg></div><div><div class="hdr-title">Arkham Retail Ltd</div><div class="hdr-sub">VAT Invoice · LedgerOS</div></div></div><div class="body"><div class="eyebrow">Invoice from Arkham Retail Ltd</div><div style="font-size:15px;color:#5c677d;margin-bottom:4px">Amount due from <strong style="color:#0f172a">${escHtml(invoice.customer)}</strong></div><div class="amount">${fmt(total)}</div><div class="meta"><div class="meta-box"><div class="meta-lbl">Invoice #</div><div class="meta-val">${escHtml(invoice.invoice_number)}</div></div><div class="meta-box"><div class="meta-lbl">Issue Date</div><div class="meta-val">${fmtDate(invoice.invoice_date)}</div></div><div class="meta-box"><div class="meta-lbl">Due Date</div><div class="meta-val">${fmtDate(invoice.due_date)||'On receipt'}</div></div><div class="meta-box"><div class="meta-lbl">Status</div><div class="meta-val">${escHtml((invoice.status||'pending').toUpperCase())}</div></div></div><table><thead><tr><th style="width:45%">Description</th><th>VAT</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${lines.map(l=>`<tr><td style="font-weight:600">${escHtml(l.description)}</td><td style="color:#94a3b8;font-size:11px">${l.vat_rate===0?'Exempt':l.vat_rate+'% S'}</td><td style="text-align:right">${escHtml(String(l.qty))}</td><td style="text-align:right">${fmt(l.unit_price)}</td><td style="text-align:right;font-weight:700">${fmt(l.qty*l.unit_price)}</td></tr>`).join('')}</tbody></table><div class="totals"><div class="tot-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div><div class="tot-row"><span>VAT Total</span><span>${fmt(vatTotal)}</span></div><div style=\"border-top:1px solid #e2e8f0;margin-top:8px;padding-top:10px;display:flex;justify-content:space-between;font-weight:600;color:#0f172a;background:#ffffff\"><span>Total</span><span>${fmt(total)}</span></div><div style=\"background:#1e1b4b;border-radius:9px;padding:11px 16px;margin-top:16px;display:flex;justify-content:space-between;align-items:center\"><span style=\"color:rgba(255,255,255,.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px\">Balance Due</span><span style=\"color:#fff;font-size:17px;font-weight:800\">${fmt(total)}</span></div></div><div class="bank"><div class="bank-title">Payment Details</div><div class="bank-sub">Please use <strong>${escHtml(invoice.invoice_number)}</strong> as your payment reference.</div><div class="bank-grid"><div><div class="bank-lbl">Bank</div><div class="bank-val">Tide Bank</div></div><div><div class="bank-lbl">Sort Code</div><div class="bank-val">04-06-05</div></div><div><div class="bank-lbl">Account</div><div class="bank-val">23058246</div></div></div></div></div><div class="ftr">Arkham Retail Ltd · 2 Fieldhead Street, Bradford, BD7 1LW<br>ARKHAMRETAIL@GMAIL.COM · VAT Reg: GB462229106<br>Goods remain property of Arkham Retail Ltd until payment received in full.</div></div></body></html>`;

const buildReminderEmailHtml = (invoice, balance) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${_emailCss('#b45309','#f59e0b')}</style></head><body><div class="wrap"><div class="hdr" style="background:#b45309"><div class="hdr-mark" style="background:#92400e"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div><div class="hdr-title">Payment Reminder</div><div class="hdr-sub">Arkham Retail Ltd · Action Required</div></div></div><div class="body"><div class="alert-box"><div class="alert-icon">⚠️</div><div class="alert-text"><strong>This invoice is overdue.</strong> The payment due date has passed. Please arrange payment at your earliest convenience to avoid any disruption to your account.</div></div><div class="eyebrow" style="color:#b45309">Outstanding balance</div><div style="font-size:15px;color:#5c677d;margin-bottom:4px">Owed by <strong style="color:#0f172a">${escHtml(invoice.customer)}</strong></div><div class="amount" style="color:#b45309">${fmt(balance||invoice.amount)}</div><div class="meta"><div class="meta-box"><div class="meta-lbl">Invoice #</div><div class="meta-val">${escHtml(invoice.invoice_number)}</div></div><div class="meta-box"><div class="meta-lbl">Original Due</div><div class="meta-val" style="color:#dc2626">${fmtDate(invoice.due_date)||'Overdue'}</div></div><div class="meta-box"><div class="meta-lbl">Days Overdue</div><div class="meta-val" style="color:#dc2626">${Math.max(0,Math.floor((Date.now()-new Date(invoice.due_date||invoice.invoice_date).getTime())/86400000))} days</div></div><div class="meta-box"><div class="meta-lbl">Original Amount</div><div class="meta-val">${fmt(invoice.amount)}</div></div></div><div class="bank"><div class="bank-title">How to Pay</div><div class="bank-sub">Please use <strong>${escHtml(invoice.invoice_number)}</strong> as your reference. Contact us if you have already made payment.</div><div class="bank-grid"><div><div class="bank-lbl">Bank</div><div class="bank-val">Tide Bank</div></div><div><div class="bank-lbl">Sort Code</div><div class="bank-val">04-06-05</div></div><div><div class="bank-lbl">Account</div><div class="bank-val">23058246</div></div></div></div></div><div class="ftr">Arkham Retail Ltd · 2 Fieldhead Street, Bradford, BD7 1LW<br>ARKHAMRETAIL@GMAIL.COM · Tel: 07801 567209<br>If you believe this is an error, please contact us immediately.</div></div></body></html>`;

const buildDNEmailHtml = (dn, dnLines) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${_emailCss('#1e1b4b','#818cf8')}</style></head><body><div class="wrap"><div class="hdr"><div class="hdr-mark"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div><div><div class="hdr-title">Delivery Note</div><div class="hdr-sub">Arkham Retail Ltd · ${escHtml(dn.dn_number||'')}</div></div></div><div class="body"><div class="eyebrow">Delivery from Arkham Retail Ltd</div><div style="font-size:15px;color:#5c677d;margin-bottom:20px">For <strong style="color:#0f172a">${escHtml(dn.customer_name||'')}</strong></div><div class="meta"><div class="meta-box"><div class="meta-lbl">DN Number</div><div class="meta-val">${escHtml(dn.dn_number||'')}</div></div><div class="meta-box"><div class="meta-lbl">Delivery Date</div><div class="meta-val">${fmtDate(dn.delivery_date)}</div></div>${dn.invoice_ref?`<div class="meta-box"><div class="meta-lbl">Invoice Ref</div><div class="meta-val">${escHtml(dn.invoice_ref)}</div></div>`:''} ${dn.driver?`<div class="meta-box"><div class="meta-lbl">Driver</div><div class="meta-val">${escHtml(dn.driver)}</div></div>`:''}</div>${dn.delivery_address?`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 14px;margin-bottom:16px"><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Delivery Address</div><div style="font-size:13px;font-weight:600;color:#0f172a">${escHtml(dn.delivery_address)}</div></div>`:''}<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px"><div style="background:#1e1b4b;padding:8px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#fff">Items</div><div class="dn-items">${dnLines.map(l=>`<div class="dn-item"><div><div class="dn-name">${escHtml(l.description||'')}</div><div style="font-size:11px;color:#94a3b8">${escHtml(l.unit||'unit')}</div></div><div class="dn-qty">${escHtml(String(l.qty))}</div></div>`).join('')}</div></div>${dn.notes?`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:#5c677d"><strong style="color:#0f172a">Instructions:</strong> ${escHtml(dn.notes)}</div>`:''}<div style="background:#dbeafe;border:1px solid #bfdbfe;border-radius:9px;padding:12px 16px;font-size:13px;color:#1e40af">Please sign and return a copy upon receipt of goods. Thank you for your business.</div></div><div class="ftr">Arkham Retail Ltd · 2 Fieldhead Street, Bradford, BD7 1LW<br>ARKHAMRETAIL@GMAIL.COM · Tel: 07801 567209</div></div></body></html>`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  /* ── Backgrounds ── */
  --bg:#f4f6f9;
  --bg2:#eef0f5;
  --white:#ffffff;

  /* ── Sidebar ── */
  --sidebar:#060d1f;
  --sidebar-border:rgba(255,255,255,.06);
  --sidebar-hover:rgba(255,255,255,.05);
  --sidebar-active:rgba(37,99,235,.18);
  --sidebar-active-border:rgba(37,99,235,.35);

  /* ── Text ── */
  --text:#0d1117;
  --text2:#5c677d;
  --text3:#9aa5b4;

  /* ── Borders ── */
  --border:#e5e9f0;
  --border2:#d0d7e2;

  /* ── Brand ── */
  --blue:#2563eb;
  --blue-lt:#eff4ff;
  --blue-dk:#1d4ed8;
  --blue-mid:#dbeafe;

  /* ── Semantic ── */
  --green:#10b981;--green-lt:#ecfdf5;--green-dk:#065f46;
  --red:#ef4444;--red-lt:#fff1f1;--red-dk:#991b1b;
  --amber:#f59e0b;--amber-lt:#fffbeb;--amber-dk:#92400e;
  --purple:#7c3aed;--purple-lt:#f5f3ff;--purple-dk:#4c1d95;

  /* ── Elevation ── */
  --sh:0 1px 2px rgba(13,17,23,.04),0 2px 8px rgba(13,17,23,.04);
  --sh2:0 4px 12px rgba(13,17,23,.08),0 1px 3px rgba(13,17,23,.04);
  --sh3:0 24px 64px rgba(13,17,23,.14),0 8px 24px rgba(13,17,23,.08);
  --sh-blue:0 4px 14px rgba(37,99,235,.25);

  /* ── Type ── */
  --sans:'Inter',system-ui,-apple-system,sans-serif;
  --mono:'Inter','SF Mono',monospace;

  /* ── Radius ── */
  --r:8px;--rl:12px;--rxl:18px;--r2:6px;

  /* ── Motion ── */
  --ease:cubic-bezier(.16,1,.3,1);
  --ease-out:cubic-bezier(0,0,.2,1);
}

/* ── Reset & Base ── */
html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}

/* ── Animations ── */
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity: 0.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}

/* ── Layout ── */
.app{display:flex;min-height:100vh}

/* ────────────────────────────────────
   SIDEBAR — Premium dark navigation
   ──────────────────────────────────── */
.sidebar{
  width:234px;min-width:234px;
  background:var(--sidebar);
  display:flex;flex-direction:column;
  padding:16px 10px;
  position:sticky;top:0;height:100vh;overflow-y:auto;
  border-right:1px solid var(--sidebar-border);
  overflow:hidden;
}
.sidebar::before{
  content:'';position:absolute;top:-80px;left:-80px;
  width:240px;height:240px;border-radius:50%;
  background:radial-gradient(circle,rgba(37,99,235,.1) 0%,transparent 70%);
  pointer-events:none;z-index:0;
}
.sidebar>*{position:relative;z-index:1}
.sidebar::-webkit-scrollbar{width:0}

.sidebar-logo{
  display:flex;align-items:center;gap:10px;
  padding:6px 10px 20px;
  border-bottom:1px solid rgba(255,255,255,.06);
  margin-bottom:8px;
}
.logo-mark{
  width:34px;height:34px;background:#1e1b4b;border-radius:9px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.logo-text{
  font-size:14px;font-weight:800;color:#fff;
  letter-spacing:-.3px;line-height:1.1;
}
.logo-sub{font-size:10px;color:rgba(255,255,255,.28);margin-top:2px}

.nav-section{margin-bottom:24px}
.nav-label{
  font-size:10px;font-weight:600;
  color:rgba(255,255,255,.25);
  text-transform:uppercase;letter-spacing:1.4px;
  padding:0 12px 8px;
}

.nav-item{
  display:flex;align-items:center;gap:10px;
  padding:10px 12px;border-radius:var(--r);
  color:rgba(255,255,255,.42);font-size:13px;font-weight:500;
  cursor:pointer;
  transition:color .12s var(--ease),background .12s var(--ease);
  margin-bottom:2px;user-select:none;letter-spacing:-.1px;
  border-left:2px solid transparent;
  line-height:1.4;
}
.nav-item:hover{
  background:var(--sidebar-hover);
  color:rgba(255,255,255,.78);
}
.nav-item.active{
  background:var(--sidebar-active);
  color:#93c5fd;font-weight:700;
  border:1px solid rgba(37,99,235,.25);
  border-radius:var(--r);
}
.nav-item i{font-size:16px;flex-shrink:0;opacity: 0.9}
.nav-badge{
  margin-left:auto;background:var(--red);color:#fff;
  font-size:10px;font-weight:700;
  padding:1px 6px;border-radius:20px;min-width:18px;text-align:center;
}

.nav-bottom{
  margin-top:auto;padding-top:12px;
  border-top:1px solid var(--sidebar-border);
}
.user-row{
  display:flex;align-items:center;gap:10px;
  padding:10px 12px;border-radius:var(--r);
  cursor:pointer;transition:background .12s;
}
.user-row:hover{background:var(--sidebar-hover)}
.user-av{
  width:30px;height:30px;border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;color:#fff;flex-shrink:0;
}
.user-name{font-size:12px;font-weight:600;color:rgba(255,255,255,.82)}
.user-role{font-size:10px;color:rgba(255,255,255,.3);margin-top:1px}
.signout-btn{
  margin-left:auto;background:none;border:none;
  color:rgba(255,255,255,.22);cursor:pointer;
  padding:4px;border-radius:6px;transition:color .12s;
}
.signout-btn:hover{color:var(--red)}
.signout-btn i{font-size:15px}

/* ────────────────────────────────────
   MAIN AREA
   ──────────────────────────────────── */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:100vh}

/* ── Topbar ── */
.topbar{
  height:54px;
  background:#0d1829;
  border-bottom:1px solid rgba(255,255,255,.07);
  display:flex;align-items:center;
  padding:0 24px;gap:12px;
  position:sticky;top:0;z-index:50;
}

.search-wrap{position:relative;flex:1;max-width:340px}
.search-wrap i{
  position:absolute;left:10px;top:50%;
  transform:translateY(-50%);
  color:rgba(255,255,255,.28);font-size:15px;pointer-events:none;
}
.search-input{
  width:100%;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.09);
  border-radius:var(--r);
  padding:7px 12px 7px 32px;
  font-size:13px;color:rgba(255,255,255,.55);
  font-family:var(--sans);outline:none;
  transition:border .14s,box-shadow .14s,background .14s;
}
.search-input:focus{
  border-color:rgba(37,99,235,.5);
  background:rgba(255,255,255,.08);
  box-shadow:0 0 0 3px rgba(37,99,235,.12);
}
.search-input::placeholder{color:rgba(255,255,255,.25)}

.topbar-right{margin-left:auto;display:flex;align-items:center;gap:6px}
.tb-btn{
  width:32px;height:32px;border-radius:var(--r);
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.06);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:rgba(255,255,255,.5);
  transition:all .12s;position:relative;
}
.tb-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.14);color:rgba(255,255,255,.8)}
.tb-btn i{font-size:16px}
.tb-notif::after{
  content:'';position:absolute;top:6px;right:6px;
  width:6px;height:6px;
  background:var(--red);border-radius:50%;
  border:1.5px solid #0d1829;
}
.tb-av{
  width:32px;height:32px;border-radius:50%;
  background:linear-gradient(135deg,#2563eb,#7c3aed);
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:800;color:#fff;
  cursor:pointer;
  box-shadow:0 0 0 2px #0d1829,0 0 0 3.5px rgba(37,99,235,.4);
}
.tb-role{
  font-size:11px;font-weight:700;
  background:rgba(255,255,255,.07);color:rgba(255,255,255,.55);
  padding:3px 10px;border-radius:20px;
  text-transform:uppercase;letter-spacing:.4px;
  border:1px solid rgba(255,255,255,.08);
}

/* ── Content ── */
.content{
  flex:1;padding:26px 28px;
  overflow-y:auto;
  max-width:1440px;width:100%;margin:0 auto;
  animation:fadeIn .22s var(--ease) both;
}

/* ────────────────────────────────────
   DASHBOARD ELEMENTS
   ──────────────────────────────────── */
.welcome-row{
  display:flex;align-items:flex-start;justify-content:space-between;
  margin-bottom:26px;flex-wrap:wrap;gap:14px;
}
.welcome-h{
  font-size:22px;font-weight:800;color:var(--text);
  letter-spacing:-.6px;line-height:1.2;
}
.welcome-sub{
  font-size:13px;color:var(--text2);
  margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
}
.trend-pill{
  background:var(--green-lt);color:var(--green-dk);
  padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;
}

.quick-actions{display:flex;gap:8px;flex-wrap:wrap}
.qa-btn{
  display:flex;align-items:center;gap:7px;
  padding:7px 15px;border-radius:var(--r);
  font-size:13px;font-weight:500;cursor:pointer;
  border:1px solid var(--border);
  background:var(--white);color:var(--text2);
  transition:all .14s var(--ease);
  font-family:var(--sans);
  box-shadow:var(--sh);
}
.qa-btn:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-lt);transform:translateY(-1px);box-shadow:var(--sh2)}
.qa-btn.primary{
  background:var(--blue);color:#fff;
  border-color:var(--blue);
  box-shadow:var(--sh-blue);
}
.qa-btn.primary:hover{background:var(--blue-dk);transform:translateY(-1px)}
.qa-btn i{font-size:15px}

/* ── KPI Grid ── */
.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}

.kpi{
  background:var(--white);
  border:1px solid var(--border);
  border-radius:var(--rl);
  padding:18px 20px;
  box-shadow:var(--sh);
  cursor:pointer;
  transition:transform .18s var(--ease),box-shadow .18s var(--ease),border-color .18s;
  position:relative;overflow:hidden;
}
.kpi::before{
  content:'';position:absolute;top:0;left:0;right:0;
  height:2.5px;border-radius:var(--rl) var(--rl) 0 0;
  background:var(--kpi-accent,var(--blue));
  transform:scaleX(0);transform-origin:left;
  transition:transform .22s var(--ease);
}
.kpi:hover{transform:translateY(-2px);box-shadow:var(--sh2);border-color:var(--border2)}
.kpi:hover::before{transform:scaleX(1)}
.kpi:hover::after{content:'↗';position:absolute;top:12px;right:14px;font-size:13px;color:var(--text3);opacity:0.6;line-height:1}
.kpi-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.kpi-icon{
  width:38px;height:38px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
}
.kpi-icon i{font-size:19px}
.kpi-badge{padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600}
.kpi-val{
  font-size:22px;font-weight:700;color:var(--text);
  letter-spacing:-.6px;margin-bottom:3px;
  font-variant-numeric:tabular-nums;
}
.kpi-label{font-size:12px;color:var(--text3);font-weight:500;margin-bottom:10px}
.spark{height:36px;width:100%}

/* ────────────────────────────────────
   CARDS
   ──────────────────────────────────── */
.card{
  background:var(--white);
  border:1px solid var(--border);
  border-radius:var(--rl);
  box-shadow:var(--sh);
  overflow:hidden;
  margin-bottom:18px;
  animation:fadeIn .2s var(--ease) both;
}
.ch{
  padding:16px 22px;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  flex-wrap:wrap;gap:8px;
  background:var(--white);
}
.ct{font-size:14px;font-weight:700;color:var(--text);letter-spacing:-.2px}
.cs{font-size:12px;color:var(--text3);margin-top:2px}

/* ────────────────────────────────────
   TABLES
   ──────────────────────────────────── */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{
  text-align:left;font-size:10px;font-weight:800;
  color:var(--text3);text-transform:uppercase;letter-spacing:1px;
  padding:11px 16px;
  border-bottom:1px solid var(--border);
  background:#f8fafd;white-space:nowrap;
  position:sticky;top:0;
  cursor:pointer;user-select:none;
}
th:hover{color:var(--text2);background:#f0f3f8}
td{
  padding:14px 16px;font-size:13px;
  border-bottom:1px solid #f0f3f8;
  transition:background .08s;
  min-height:52px;
}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f8fafd}

/* ── Avatar ── */
.c-av{
  width:30px;height:30px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;color:#fff;flex-shrink:0;
}

/* ── Badges ── */
.badge{
  padding:2px 9px;border-radius:20px;
  font-size:11px;font-weight:600;
  display:inline-flex;align-items:center;gap:4px;
  width:fit-content;white-space:nowrap;
}
.badge::before{content:'';width:5px;height:5px;border-radius:50%}
.b-green{background:var(--green-lt);color:var(--green-dk)}.b-green::before{background:var(--green)}
.b-red{background:var(--red-lt);color:var(--red-dk)}.b-red::before{background:var(--red)}
.b-amber{background:var(--amber-lt);color:var(--amber-dk)}.b-amber::before{background:var(--amber)}
.b-blue{background:var(--blue-lt);color:#1e40af}.b-blue::before{background:var(--blue)}
.b-purple{background:var(--purple-lt);color:var(--purple-dk)}.b-purple::before{background:var(--purple)}
.b-gray{background:#f1f5f9;color:var(--text2)}.b-gray::before{background:var(--text3)}

/* ────────────────────────────────────
   BUTTONS
   ──────────────────────────────────── */
.btn{
  padding:7px 16px;border-radius:var(--r);
  font-size:13px;font-weight:500;cursor:pointer;border:none;
  transition:all .14s var(--ease);
  font-family:var(--sans);
  display:inline-flex;align-items:center;gap:6px;
  white-space:nowrap;
}
.btn:active{transform:scale(.98)}
.btn i{font-size:14px}

.bp{
  background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;
  box-shadow:0 2px 8px rgba(37,99,235,.28);
}
.bp:hover{background:linear-gradient(135deg,#1d4ed8,#1e40af);box-shadow:0 4px 14px rgba(37,99,235,.35);transform:translateY(-1px)}
.bp:disabled{opacity: 0.45;cursor:not-allowed;transform:none;box-shadow:none}

.bo{
  background:var(--white);color:var(--text);
  border:1px solid var(--border2);
  box-shadow:0 1px 2px rgba(13,17,23,.04);
}
.bo:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-lt)}

.bd{background:var(--red-lt);color:var(--red-dk);border:1px solid #fca5a5}
.bd:hover{background:#fee2e2}

.bwa{background:#25D366;color:#fff;box-shadow:0 2px 8px rgba(37,211,102,.25)}
.bwa:hover{background:#20BA5A;transform:translateY(-1px)}

.bsm{padding:5px 11px;font-size:12px}

/* ────────────────────────────────────
   FORMS
   ──────────────────────────────────── */
.fg{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px 20px}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:18px 20px}
.fgrp{display:flex;flex-direction:column;gap:5px}
.fgrp.full{grid-column:1/-1}
.fgrp label{font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.2px}
.fgrp input,.fgrp select,.fgrp textarea{
  background:var(--white);
  border:1px solid var(--border);
  border-radius:var(--r);
  padding:8px 11px;
  font-size:13px;color:var(--text);
  font-family:var(--sans);outline:none;
  transition:border .14s,box-shadow .14s;width:100%;
}
.fgrp input:focus,.fgrp select:focus,.fgrp textarea:focus{
  border-color:var(--blue);
  box-shadow:0 0 0 3px rgba(37,99,235,.1);
}
.fgrp input::placeholder,.fgrp textarea::placeholder{color:var(--text3)}
.ff{
  padding:12px 20px;border-top:1px solid var(--border);
  display:flex;gap:8px;justify-content:flex-end;
  background:#fafbfd;flex-wrap:wrap;
}

/* ── Layout Grids ── */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:18px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
.g23{display:grid;grid-template-columns:2fr 1fr;gap:18px;margin-bottom:18px}

/* ── Activity Feed ── */
.act-item{
  display:flex;align-items:flex-start;gap:12px;
  padding:12px 18px;
  border-bottom:1px solid #f0f3f8;
  transition:background .1s;
}
.act-item:last-child{border-bottom:none}
.act-item:hover{background:#f8fafd}
.act-icon{
  width:34px;height:34px;border-radius:9px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.act-icon i{font-size:16px}
.act-title{font-size:13px;font-weight:500;color:var(--text);line-height:1.3}
.act-sub{font-size:11px;color:var(--text3);margin-top:2px}
.act-amt{font-size:13px;font-weight:600;margin-left:auto;flex-shrink:0;padding-top:1px}

/* ── Page Header ── */
.ph{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:22px;flex-wrap:wrap;gap:12px;
}
.pt{font-size:24px;font-weight:800;letter-spacing:-.6px;color:var(--text);line-height:1.15}
.psub{font-size:13px;color:var(--text2);margin-top:4px;font-weight:400}

/* ────────────────────────────────────
   CONTACTS
   ──────────────────────────────────── */
.contact-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.contact-card{
  background:var(--white);border:1px solid var(--border);
  border-radius:var(--rl);padding:18px;
  box-shadow:var(--sh);cursor:pointer;
  transition:transform .18s var(--ease),box-shadow .18s,border-color .18s;
}
.contact-card:hover{
  border-color:var(--blue);
  box-shadow:var(--sh2);
  transform:translateY(-2px);
}
.cc-av{
  width:44px;height:44px;border-radius:12px;
  display:flex;align-items:center;justify-content:center;
  font-size:16px;font-weight:700;color:#fff;margin-bottom:12px;
}
.cc-name{font-size:14px;font-weight:600;margin-bottom:4px;letter-spacing:-.1px}
.cc-detail{font-size:12px;color:var(--text2);margin-bottom:2px;display:flex;align-items:center;gap:5px}
.cc-detail i{font-size:12px;color:var(--text3)}

/* ────────────────────────────────────
   MODALS
   ──────────────────────────────────── */
.modal-overlay{
  position:fixed;top:0;left:0;width:100vw;height:100vh;
  background:rgba(10,14,26,.55);
  z-index:1000;
  display:flex;align-items:center;justify-content:center;
  padding:20px;
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  animation:fadeIn .18s var(--ease) both;
}
.modal{
  background:var(--white);
  border-radius:var(--rxl);
  width:100%;max-width:740px;max-height:92vh;
  overflow-y:auto;
  box-shadow:var(--sh3);
  animation:scaleIn .2s var(--ease) both;
  border:1px solid var(--border);
}
.modal-header{
  padding:16px 22px;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;
  background:rgba(255,255,255,.95);
  backdrop-filter:blur(8px);
  z-index:10;border-radius:var(--rxl) var(--rxl) 0 0;
}
.modal-actions{
  padding:14px 22px;border-top:1px solid var(--border);
  display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;
  position:sticky;bottom:0;
  background:rgba(255,255,255,.95);
  backdrop-filter:blur(8px);
  border-radius:0 0 var(--rxl) var(--rxl);
}

/* ── Invoice Doc ── */
.inv-doc{padding:32px;background:#ffffff}
.inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
.inv-co-name{font-size:20px;font-weight:800;color:var(--blue);letter-spacing:-.4px;margin-bottom:5px}
.inv-co-detail{font-size:11px;color:var(--text2);line-height:1.7}
.inv-title-block{text-align:right}
.inv-title{font-size:30px;font-weight:800;color:#e8edf4;letter-spacing:-.5px;margin-bottom:5px}
.inv-num{font-size:15px;font-weight:700;color:#0f172a}
.inv-meta{
  display:grid;grid-template-columns:1fr 1fr;gap:20px;
  margin-bottom:28px;padding:16px 18px;
  background:transparent;border-radius:var(--r);border:1px solid #e2e8f0;
}
.inv-meta-lbl{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px}
.inv-meta-val{font-size:13px;font-weight:600;color:#0f172a}
.inv-table{width:100%;border-collapse:collapse;margin-bottom:22px;border-radius:var(--r);overflow:hidden;border:1px solid var(--border)}
.inv-table th{background:#1e1b4b;color:#fff;padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left}
.inv-table th:last-child,.inv-table td:last-child{text-align:right}
.inv-table td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f0f3f8}
.inv-table tr:last-child td{border-bottom:none}
.inv-table tr:nth-child(even) td{background:#f8fafc}
.inv-totals-box{width:280px;margin-left:auto;margin-bottom:24px;background:#ffffff;padding:8px 0}
.inv-tot-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#0f172a}
.inv-tot-row.divider{border-top:2px solid #e2e8f0;margin-top:8px;padding-top:10px;font-size:13px;font-weight:600}
.inv-balance-box{background:#1e1b4b;border-radius:9px;padding:11px 14px;margin-top:16px;display:flex;justify-content:space-between;align-items:center}
.inv-balance-lbl{color:rgba(255,255,255,.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
.inv-balance-val{color:#fff;font-size:17px;font-weight:800}
.inv-footer{border-top:1px solid var(--border);padding-top:18px}
.inv-bank-grid{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;
  margin-top:12px;background:#f8fafc;padding:14px;
  border-radius:var(--r);border:1px solid #e2e8f0;
}
.inv-bank-lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.inv-bank-val{font-size:13px;font-weight:700;color:#0f172a}

/* ── Line Items ── */
.il-header{
  display:grid;grid-template-columns:3.5fr 1fr 1fr 1fr 1fr 30px;
  gap:10px;padding:9px 16px;
  background:#f8fafd;border-bottom:1px solid var(--border);
}
.il-line{
  display:grid;grid-template-columns:3.5fr 1fr 1fr 1fr 1fr 30px;
  gap:10px;align-items:center;
  padding:9px 16px;border-bottom:1px solid var(--border);
}
.il-input{
  background:var(--white);border:1px solid var(--border);
  border-radius:var(--r2);padding:6px 9px;
  font-size:16px;color:var(--text);
  font-family:var(--sans);outline:none;width:100%;
  transition:border .12s,box-shadow .12s;
}
.il-input:focus{border-color:var(--blue);box-shadow:0 0 0 2px rgba(37,99,235,.1)}

.ib{
  background:none;border:none;color:var(--text3);cursor:pointer;
  padding:5px;border-radius:6px;
  transition:all .12s;
  display:flex;align-items:center;justify-content:center;
}
.ib:hover{color:var(--red);background:var(--red-lt)}
.ib i{font-size:14px}

/* ── Reports ── */
.rs-title{font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:1px;padding:13px 20px 7px}
.rrow{display:flex;justify-content:space-between;padding:7px 20px;font-size:13px;transition:background .1s}
.rrow:hover{background:#f8fafd}
.rrow.indent{padding-left:38px;color:var(--text2)}
.rrow.subtotal{border-top:1px solid var(--border);font-weight:600}
.rrow.total{border-top:2px solid var(--border2);font-weight:700;font-size:15px;padding:12px 20px;background:#f8fafd}

.po-line{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 30px;gap:10px;align-items:center;padding:9px 16px;border-bottom:1px solid var(--border)}

/* ── Utility ── */
.mono{font-variant-numeric:tabular-nums}
.tr{text-align:right}
.tg{color:var(--green)}
.tr-c{color:var(--red)}
.tm{color:var(--text2)}

/* ── States ── */
.loading{
  display:flex;align-items:center;justify-content:center;
  padding:72px;color:var(--text3);font-size:13px;
  gap:10px;flex-direction:column;
}
.spin{
  width:22px;height:22px;
  border:2px solid var(--border2);
  border-top-color:var(--blue);
  border-radius:50%;
  animation:spin .65s linear infinite;
}
.empty{
  text-align:center;padding:48px 20px;
  color:var(--text3);font-size:13px;line-height:1.6;
}
.skeleton{
  background:linear-gradient(90deg,#f0f3f8 25%,#e8ecf5 50%,#f0f3f8 75%);
  background-size:200% 100%;
  animation:shimmer 1.4s infinite;
  border-radius:6px;
}

/* ── Misc ── */
.tag{
  display:inline-block;padding:2px 8px;border-radius:5px;
  font-size:11px;font-weight:600;
  background:var(--blue-lt);color:var(--blue);
}
.divider{height:1px;background:var(--border);margin:6px 0}
.stat-row{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid var(--border)}
.stat-row:last-child{border-bottom:none}
.stat-lbl{font-size:13px;color:var(--text2)}
.stat-val{font-size:14px;font-weight:600}

/* ── Tabs ── */
.tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:18px}
.tab{
  padding:10px 16px;font-size:13px;font-weight:500;
  color:var(--text2);cursor:pointer;
  border-bottom:2px solid transparent;margin-bottom:-1px;
  transition:all .14s;
}
.tab:hover{color:var(--text)}
.tab.active{color:var(--blue);border-bottom-color:var(--blue);font-weight:600}

/* ────────────────────────────────────
   MOBILE NAV
   ──────────────────────────────────── */
.mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:200;
background:var(--white);border-top:1px solid var(--border);
padding-bottom:env(safe-area-inset-bottom,0px)}
.mob-nav-inner{display:flex;width:100%;justify-content:space-around;align-items:stretch}
.mob-nav-item{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  padding:10px 4px 8px;cursor:pointer;color:var(--text3);flex:1;min-width:0;
  transition:color .12s;font-size:10px;
}
.mob-nav-item.active{color:var(--blue)}
.mob-nav-item i{font-size:20px}
.mob-nav-lbl{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}

/* ────────────────────────────────────
   RESPONSIVE
   ──────────────────────────────────── */
@media(max-width:768px){
  .sidebar{display:none}
  .mob-nav{display:block}
  .content{padding:12px 12px 76px}
  .kgrid{grid-template-columns:1fr 1fr;gap:10px}
  .g2,.g3,.g23{grid-template-columns:1fr}
  .g4{grid-template-columns:1fr 1fr}
  .hm{display:none!important}
  .kpi-val{font-size:18px}
  .kpi{padding:14px 16px}
  .fg,.fg3{grid-template-columns:1fr}
  .il-line{grid-template-columns:2fr 1fr 1fr 30px}
  .il-header{grid-template-columns:2fr 1fr 1fr 30px}
  .topbar-search{display:none!important}
  .inv-header{flex-direction:column;gap:14px}
  .inv-meta,.inv-bank-grid{grid-template-columns:1fr}
  .modal{max-height:96vh;border-radius:16px;margin:0;width:100%}
  .modal-overlay{padding:0;align-items:flex-end}
  td{padding:9px 10px;font-size:12px;word-break:break-word}
  th{padding:8px 10px;font-size:10px}
  .tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
  table{min-width:400px}
  .ph{margin-bottom:14px}
  .pt{font-size:17px}
  .topbar{padding:0 12px;gap:8px;height:50px}
  .tb-btn{width:30px;height:30px}
  .tb-av{width:30px;height:30px;font-size:11px}
  .content{animation:none}
  .card{border-radius:12px}
  .btn{padding:6px 12px;font-size:12px}
  .bsm{padding:5px 9px;font-size:11px}
  .quick-actions{gap:6px}
  .qa-btn{padding:6px 12px;font-size:12px}
  .welcome-h{font-size:18px}
  .g23{grid-template-columns:1fr}
  .stat-pills-grid{grid-template-columns:1fr 1fr!important}
  .kgrid{grid-template-columns:1fr 1fr}
  .ai-widget{width:calc(100vw - 24px)!important;right:12px!important;left:12px!important}
}
@media(min-width:769px){.mob-nav{display:none!important}}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#d0d7e2;border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:var(--border2)}

/* ── Dark Mode ── */
.dark-mode{
  --bg:#0d1117;--bg2:#161b22;--white:#1c2128;
  --text:#e6edf3;--text2:#8b949e;--text3:#484f58;
  --border:#30363d;--border2:#3d444d;
  --sidebar:#010409;--sidebar-border:rgba(255,255,255,.04);
  --sidebar-hover:rgba(255,255,255,.04);
  --blue-lt:#1c2a4a;--green-lt:#0d2818;--amber-lt:#2a1f00;
  --red-lt:#2a0d0d;--purple-lt:#1a1535;
}
.dark-mode .topbar{background:rgba(22,27,34,.95)}
.dark-mode .card{background:var(--white);border-color:var(--border)}
.dark-mode .kpi{background:var(--white)}
.dark-mode th{background:#161b22}
.dark-mode tr:hover td{background:#161b22}
.dark-mode .modal{background:#1c2128}
.dark-mode .modal-header,.dark-mode .modal-actions{background:rgba(28,33,40,.95)}
.dark-mode input,.dark-mode select,.dark-mode textarea{background:#161b22;border-color:var(--border);color:var(--text)}
.dark-mode .il-input{background:#161b22;border-color:var(--border);color:var(--text)}
.dark-mode .search-input{background:#161b22;color:var(--text)}
.dark-mode .ff{background:#161b22}
.dark-mode .ch{background:#1c2128}

/* ── Skeleton Loader ── */
.skel{
  background:linear-gradient(90deg,#f0f3f8 25%,#e4e8f0 50%,#f0f3f8 75%);
  background-size:400% 100%;
  animation:shimmer 1.4s ease-in-out infinite;
  border-radius:6px;display:inline-block;
}
.dark-mode .skel{
  background:linear-gradient(90deg,#21262d 25%,#2d333b 50%,#21262d 75%);
  background-size:400% 100%;
}
.skel-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)}

/* ── Onboarding ── */
.onboard-overlay{position:fixed;inset:0;background:rgba(10,14,26,.7);z-index:800;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);animation:fadeIn .2s var(--ease)}
.onboard-card{background:var(--white);border-radius:24px;padding:40px;max-width:520px;width:90%;box-shadow:var(--sh3);animation:scaleIn .25s var(--ease)}
.onboard-step{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border)}
.onboard-step:last-child{border-bottom:none}
.onboard-check{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px}

/* ── Empty States ── */
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 32px;text-align:center}
.empty-state-icon{font-size:52px;margin-bottom:16px;opacity: 0.25}
.empty-state-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px}
.empty-state-sub{font-size:13px;color:var(--text3);line-height:1.6;max-width:280px;margin-bottom:20px}

/* ── Version badge ── */
.version-badge{font-size:10px;color:rgba(255,255,255,.2);padding:2px 8px;border:1px solid rgba(255,255,255,.08);border-radius:20px;display:inline-block;margin-top:4px}

/* ── Mobile ── */
@media(max-width:768px){
  .sidebar{display:none}
  .main-content{margin-left:0!important;padding:12px!important}
  .ph{flex-direction:column;align-items:flex-start;gap:8px}
  .g4{grid-template-columns:repeat(2,1fr)!important}
  .tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .tw table{min-width:600px}
  .modal{width:95vw!important;max-width:95vw!important;margin:10px auto}
  .modal-overlay{padding:10px}
  input,select,textarea{font-size:16px!important}
  .hm{display:none!important}
  .il-line{grid-template-columns:1fr!important}
  .mob-nav{display:flex!important}
  .topbar{padding:0 12px!important}
}
@media(min-width:769px){
  .mob-nav{display:none!important}
}

/* ── Toast Notifications ── */
.toast-container{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:var(--rl);box-shadow:0 4px 20px rgba(0,0,0,.15);font-size:13px;font-family:var(--sans);font-weight:500;min-width:280px;max-width:400px;pointer-events:all;animation:slideInRight .25s var(--ease);border:1px solid rgba(0,0,0,.06)}
.toast.success{background:#fff;color:#166534;border-left:3px solid var(--green)}
.toast.error{background:#fff;color:#991b1b;border-left:3px solid var(--red)}
.toast.info{background:#fff;color:#1e40af;border-left:3px solid var(--blue)}
.toast.warn{background:#fff;color:#92400e;border-left:3px solid var(--amber)}
@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
@keyframes slideOutRight{from{opacity:1;transform:none}to{opacity:0;transform:translateX(20px)}}
`;

// ── AUTH ──────────────────────────────────────────────────────────────────────
// ── Modal Portal — renders overlays into document.body to escape overflow containers ──
const ModalPortal = ({ children }) => createPortal(children, document.body);

// ── Command Palette (Cmd+K) ──────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ CommandPalette                                             │
// │ Global search palette — Ctrl+K to open                     │
// └────────────────────────────────────────────────────────────┘
function CommandPalette({ onClose, setPage, invoices, contacts, products }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const commands = [
    { icon: "ti-file-plus",      label: "New Invoice",          action: () => setPage("invoices"),       tag: "Invoices" },
    { icon: "ti-user-plus",      label: "Add Customer",         action: () => setPage("contacts"),       tag: "Contacts" },
    { icon: "ti-package",        label: "Add Product",          action: () => setPage("inventory"),      tag: "Inventory" },
    { icon: "ti-truck-delivery", label: "New Delivery Note",    action: () => setPage("delivery-notes"), tag: "Delivery" },
    { icon: "ti-chart-bar",      label: "View Dashboard",       action: () => setPage("dashboard"),      tag: "Navigation" },
    { icon: "ti-report-money",   label: "Reports",        action: () => setPage("admin-reports"),  tag: "Reports" },
    { icon: "ti-chart-line",     label: "Analytics",            action: () => setPage("analytics"),      tag: "Reports" },
    { icon: "ti-building-bank",  label: "View Accounts",        action: () => setPage("reports"),        tag: "Finance" },
    { icon: "ti-adjustments",    label: "Stock Adjustment",     action: () => setPage("stock-adj"),      tag: "Inventory" },
    { icon: "ti-upload",         label: "Import CSV",           action: () => setPage("import"),         tag: "Data" },
  ];

  const invResults = q.length > 1 ? invoices.filter(i => i.customer?.toLowerCase().includes(q.toLowerCase()) || i.invoice_number?.toLowerCase().includes(q.toLowerCase())).slice(0, 3) : [];
  const custResults = q.length > 1 ? contacts.filter(c => c.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 3) : [];
  const filteredCmds = commands.filter(c => !q || c.label.toLowerCase().includes(q.toLowerCase()) || c.tag.toLowerCase().includes(q.toLowerCase()));

  const all = [
    ...invResults.map(i => ({ icon: "ti-file-invoice", label: i.customer, sub: i.invoice_number + " · " + fmt(i.amount), action: () => setPage("invoices"), tag: "Invoice" })),
    ...custResults.map(c => ({ icon: "ti-user", label: c.name, sub: c.email || c.phone || "Customer", action: () => setPage("contacts"), tag: "Customer" })),
    ...filteredCmds,
  ].slice(0, 10);

  return (<ModalPortal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ alignItems: "flex-start", paddingTop: "12vh" }}>
      <div style={{ background: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "var(--sh3)", overflow: "hidden", border: "1px solid var(--border)", animation: "scaleIn .15s var(--ease)" }}>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <i className="ti ti-search" style={{ color: "var(--text3)", fontSize: 18, flexShrink: 0 }} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Escape") onClose(); if (e.key === "Enter" && all[0]) { all[0].action(); onClose(); } }} placeholder="Search or type a command..." style={{ flex: 1, border: "none", outline: "none", fontSize: 16, fontFamily: "var(--sans)", color: "var(--text)", background: "transparent" }} />
          <kbd style={{ background: "var(--border)", borderRadius: 5, padding: "2px 7px", fontSize: 11, color: "var(--text3)", fontFamily: "var(--sans)", flexShrink: 0 }}>ESC</kbd>
        </div>
        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {all.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No results for "{q}"</div>}
          {all.map((item, i) => (
            <div key={i} onClick={() => { item.action(); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", cursor: "pointer", transition: "background .08s", borderBottom: "1px solid #f8fafd" }} onMouseEnter={e => e.currentTarget.style.background = "var(--blue-lt)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={"ti " + item.icon} style={{ color: "var(--text2)", fontSize: 15 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                {item.sub && <div style={{ fontSize: 11, color: "var(--text3)" }}>{item.sub}</div>}
              </div>
              <span style={{ fontSize: 10, color: "var(--text3)", background: "var(--border)", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{item.tag}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 20px", background: "#f8fafd", borderTop: "1px solid var(--border)", display: "flex", gap: 16, fontSize: 11, color: "var(--text3)" }}>
          <span><kbd style={{ background: "var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "var(--sans)" }}>↵</kbd> Select</span>
          <span><kbd style={{ background: "var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "var(--sans)" }}>ESC</kbd> Close</span>
          <span style={{ marginLeft: "auto" }}>⌘K to open</span>
        </div>
      </div>
    </div></ModalPortal>
  );
}

// ── Skeleton Table Rows ───────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ SkeletonTable                                              │
// │ Loading skeleton placeholder for tables                    │
// └────────────────────────────────────────────────────────────┘
function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>{Array(cols).fill(0).map((_, i) => <th key={i}><div className="skel" style={{ width: ["60%","40%","30%","25%"][i] || "30%", height: 12 }} /></th>)}</tr>
      </thead>
      <tbody>
        {Array(rows).fill(0).map((_, r) => (
          <tr key={r}>
            {Array(cols).fill(0).map((_, c) => (
              <td key={c} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                {c === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="skel" style={{ width: 30, height: 30, borderRadius: "50%" }} />
                    <div className="skel" style={{ width: "60%", height: 13 }} />
                  </div>
                ) : (
                  <div className="skel" style={{ width: ["50%","35%","45%","30%"][c] || "40%", height: 13 }} />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Illustrated Empty State ───────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ EmptyState                                                 │
// │ Empty state UI with icon and message                       │
// └────────────────────────────────────────────────────────────┘
function EmptyState({ icon, title, sub, action, actionLabel }) {
  const icons = {
    invoice: "🧾", customer: "👥", product: "📦", delivery: "🚚",
    report: "📊", stock: "🏭", search: "🔍", activity: "📋",
    default: "✨"
  };
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icons[icon] || icons.default}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-sub">{sub}</div>
      {action && <button className="btn bp" onClick={action}><i className="ti ti-plus" />{actionLabel || "Get started"}</button>}
    </div>
  );
}

// ── Onboarding Checklist ──────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ OnboardingChecklist                                        │
// │ First-run checklist for new users                          │
// └────────────────────────────────────────────────────────────┘
function OnboardingChecklist({ onClose, invoices, contacts, products, setPage }) {
  const steps = [
    { key: "profile",  icon: "ti-user",          label: "Set up your profile",          done: true,                                     page: null },
    { key: "customer", icon: "ti-users",          label: "Add your first customer",      done: contacts.length > 0,                      page: "contacts" },
    { key: "product",  icon: "ti-package",        label: "Add products to inventory",    done: products.length > 0,                      page: "inventory" },
    { key: "invoice",  icon: "ti-file-invoice",   label: "Create your first invoice",    done: invoices.length > 0,                      page: "invoices" },
    { key: "delivery", icon: "ti-truck-delivery", label: "Send a delivery note",         done: false,                                    page: "delivery-notes" },
    { key: "report",   icon: "ti-chart-bar",      label: "Explore Reports",        done: false,                                    page: "admin-reports" },
  ];
  const completed = steps.filter(s => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="onboard-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="onboard-card">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 4 }}>Get started with LedgerOS 🚀</div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>{completed} of {steps.length} steps completed</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 20 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg,var(--blue),#7c3aed)", borderRadius: 3, transition: "width .5s var(--ease)" }} />
        </div>

        {/* Steps */}
        {steps.map(step => (
          <div key={step.key} className="onboard-step" style={{ cursor: step.page ? "pointer" : "default" }} onClick={() => { if (step.page) { setPage(step.page); onClose(); } }}>
            <div className="onboard-check" style={{ background: step.done ? "var(--green-lt)" : "var(--border)", color: step.done ? "var(--green)" : "var(--text3)" }}>
              <i className={"ti " + (step.done ? "ti-check" : step.icon)} style={{ fontSize: 13 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: step.done ? "var(--text3)" : "var(--text)", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</div>
            </div>
            {!step.done && step.page && <i className="ti ti-arrow-right" style={{ color: "var(--text3)", fontSize: 14 }} />}
            {step.done && <span style={{ color: "var(--green)", fontSize: 18 }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>}
          </div>
        ))}

        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn bo" onClick={onClose}>Maybe later</button>
          <button className="btn bp" onClick={onClose}>Let\'s go! 🎉</button>
        </div>
      </div>
    </div>
  );
}


// ┌────────────────────────────────────────────────────────────┐
// │ Auth                                                       │
// │ Login / Signup page                                        │
// └────────────────────────────────────────────────────────────┘
function Auth({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [f, setF] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  const go = async () => {
    setLoading(true); setErr("");
    try {
      const d = mode === "signin"
        ? await sb.signIn(f.email, f.password)
        : await sb.signUp(f.email, f.password, f.full_name, f.role);
      if (d.access_token) {
        if (mode === "signup") {
          setMode("signin");
          setErr("✓ Account created! Please wait for admin approval before signing in.");
          setLoading(false);
          return;
        }
        try {
          const profileRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${d.user.id}&select=approved,role`,
            { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${d.access_token}` } }
          );
          const profiles = await profileRes.json();
          const profile = profiles?.[0];
          if (!profile) { setErr("Account profile not found. Please contact the administrator."); setLoading(false); return; }
          if (profile.role !== "admin" && profile.approved !== true) {
            setErr(profile.approved === false
              ? "Your account access has been revoked. Please contact the administrator."
              : "Your account is pending admin approval. You will be notified once approved.");
            setLoading(false); return;
          }
        } catch (approvalErr) { console.warn("Approval check failed:", approvalErr); }
        logAudit(d.access_token, d.user.id, "user_login", "user", d.user.id, `${d.user.email} signed in`);
        onAuth({ token: d.access_token, user: d.user });
      } else {
        setErr(d.msg || d.error_description || "Authentication failed.");
      }
    } catch { setErr("Network error. Please try again."); }
    setLoading(false);
  };

  const mob = isMobile();
  const isSuccess = err.startsWith("✓");

  // ── Concept B SVG logo mark ──
  const LogoMark = () => (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0 }}>
      <rect width="48" height="48" rx="11" fill="#1e1b4b"/>
      <rect x="10" y="13" width="28" height="3" rx="1.5" fill="#818cf8"/>
      <rect x="10" y="20" width="20" height="3" rx="1.5" fill="#818cf8" fillOpacity=".6"/>
      <rect x="10" y="27" width="24" height="3" rx="1.5" fill="#818cf8" fillOpacity=".35"/>
      <rect x="10" y="34" width="14" height="3" rx="1.5" fill="#818cf8" fillOpacity=".18"/>
      <rect x="30" y="21" width="2.5" height="14" rx="1.25" fill="#60a5fa"/>
      <polygon points="36,27 30,21 30,35" fill="#60a5fa" fillOpacity=".4"/>
    </svg>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: mob ? "column" : "row", fontFamily: "var(--sans)" }}>

      {/* ── LEFT PANEL ── */}
      {!mob && (
        <div style={{ width: 440, minWidth: 440, background: "#060d1f", display: "flex", flexDirection: "column", padding: "44px 48px", position: "relative", overflow: "hidden" }}>
          {/* Glow effects */}
          <div style={{ position: "absolute", top: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(37,99,235,.15) 0%,transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.1) 0%,transparent 70%)", pointerEvents: "none" }} />

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 52, position: "relative" }}>
            <LogoMark />
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-.4px", lineHeight: 1.1 }}>LedgerOS</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2, letterSpacing: ".2px" }}>Arkham Retail Ltd</div>
            </div>
          </div>

          {/* Live tag */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(37,99,235,.15)", border: "1px solid rgba(37,99,235,.3)", borderRadius: 20, padding: "4px 13px", fontSize: 11, fontWeight: 600, color: "#93c5fd", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 22, alignSelf: "flex-start" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", animation: "pulse 2s ease-in-out infinite" }} />
            Business Finance Platform
          </div>

          {/* Headline */}
          <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1.18, letterSpacing: "-.8px", marginBottom: 14 }}>
            Run your business<br />with <span style={{ color: "#60a5fa" }}>total clarity</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.75, marginBottom: 44 }}>
            VAT invoices, inventory, delivery notes and analytics — purpose-built for Arkham Retail.
          </div>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: "auto" }}>
            {[
              { title: "VAT invoices in seconds", desc: "PDF generation, WhatsApp sharing, email delivery",
                svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
              { title: "Live inventory tracking", desc: "Low stock alerts, reorder levels, stock adjustments",
                svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
              { title: "Real-time analytics", desc: "Revenue, aged debtors, agent leaderboard",
                svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              { title: "Delivery management", desc: "Branded delivery notes, driver tracking, signatures",
                svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
            ].map(feat => (
              <div key={feat.title} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {feat.svg}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.82)", marginBottom: 2 }}>{feat.title}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.32)", lineHeight: 1.5 }}>{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 44, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,.07)" }}>
            {[["5s", "Per invoice"], ["Live", "Data sync"], ["100%", "VAT compliant"]].map(([val, lbl]) => (
              <div key={lbl} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: "-.5px" }}>{val}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)", marginTop: 3, textTransform: "uppercase", letterSpacing: ".7px" }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MOBILE TOP PANEL (Option C) ── */}
      {mob && (
        <div style={{ background: "#060d1f", padding: "22px 22px 26px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%)", pointerEvents: "none" }} />
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LogoMark />
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-.3px", lineHeight: 1.1 }}>LedgerOS</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 1 }}>Arkham Retail Ltd</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "3px 10px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".5px" }}>Live</span>
            </div>
          </div>
          {/* Feature grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: "ti-file-invoice", text: "VAT invoices & PDFs" },
              { icon: "ti-package",      text: "Live inventory" },
              { icon: "ti-chart-bar",    text: "Analytics & reports" },
              { icon: "ti-truck-delivery", text: "Delivery notes" },
            ].map(f => (
              <div key={f.text} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                <i className={"ti " + f.icon} style={{ fontSize: 13, color: "rgba(255,255,255,.5)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)", fontWeight: 500, lineHeight: 1.3 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: "flex", alignItems: mob ? "flex-start" : "center", justifyContent: "center", padding: mob ? "28px 24px 40px" : "48px 52px", background: "#fff", minHeight: mob ? "auto" : "auto" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>

          {/* Mobile logo — hidden, rendered in mobile top panel instead */}

          {/* Form header */}
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Secure access</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#0d1117", letterSpacing: "-.6px", marginBottom: 6 }}>
              {mode === "signin" ? "Welcome back" : "Request access"}
            </div>
            <div style={{ fontSize: 13, color: "#5c677d" }}>
              {mode === "signin" ? "Sign in to your Arkham Retail dashboard" : "Join your team on LedgerOS"}
            </div>
          </div>

          {/* Error / success message */}
          {err && (
            <div style={{ background: isSuccess ? "#ecfdf5" : "#fff1f1", border: "1px solid " + (isSuccess ? "#6ee7b7" : "#fca5a5"), borderRadius: 9, padding: "10px 14px", fontSize: 12.5, color: isSuccess ? "#065f46" : "#991b1b", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <i className={"ti " + (isSuccess ? "ti-circle-check" : "ti-alert-circle")} style={{ fontSize: 15, flexShrink: 0 }} />
              {isSuccess ? err.slice(2) : err}
            </div>
          )}

          {/* Full name (signup only) */}
          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Full name</label>
              <div style={{ position: "relative" }}>
                <i className="ti ti-user" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa5b4", fontSize: 15, pointerEvents: "none" }} />
                <input style={{ width: "100%", padding: "11px 14px 11px 38px", background: "#f8fafd", border: "1.5px solid #e5e9f0", borderRadius: 10, fontSize: 14, color: "#0d1117", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box", transition: "border .15s,box-shadow .15s" }} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="Jane Smith" onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; e.target.style.background="#fff"; }} onBlur={e => { e.target.style.borderColor="#e5e9f0"; e.target.style.boxShadow="none"; e.target.style.background="#f8fafd"; }} />
              </div>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Email address</label>
            <div style={{ position: "relative" }}>
              <i className="ti ti-mail" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa5b4", fontSize: 15, pointerEvents: "none" }} />
              <input type="email" style={{ width: "100%", padding: "11px 14px 11px 38px", background: "#f8fafd", border: "1.5px solid #e5e9f0", borderRadius: 10, fontSize: 14, color: "#0d1117", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box", transition: "border .15s,box-shadow .15s" }} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="you@arkhamretail.com" onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; e.target.style.background="#fff"; }} onBlur={e => { e.target.style.borderColor="#e5e9f0"; e.target.style.boxShadow="none"; e.target.style.background="#f8fafd"; }} />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <i className="ti ti-lock" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa5b4", fontSize: 15, pointerEvents: "none" }} />
              <input type={showPw ? "text" : "password"} style={{ width: "100%", padding: "11px 40px 11px 38px", background: "#f8fafd", border: "1.5px solid #e5e9f0", borderRadius: 10, fontSize: 14, color: "#0d1117", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box", transition: "border .15s,box-shadow .15s" }} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="Enter your password" onKeyDown={e => e.key === "Enter" && go()} onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; e.target.style.background="#fff"; }} onBlur={e => { e.target.style.borderColor="#e5e9f0"; e.target.style.boxShadow="none"; e.target.style.background="#f8fafd"; }} />
              <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9aa5b4", padding: 2, display: "flex", alignItems: "center" }}>
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>

          {/* CTA button */}
          <button onClick={go} disabled={loading} style={{ width: "100%", padding: "13px", background: loading ? "#93c5fd" : "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(37,99,235,.35)", transition: "transform .15s,box-shadow .15s", marginTop: 24, marginBottom: 20 }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(37,99,235,.4)"; }}}
            onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 4px 14px rgba(37,99,235,.35)"; }}>
            {loading
              ? <><div className="spin" style={{ width: 16, height: 16, borderWidth: 2 }} />Please wait...</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>{mode === "signin" ? "Sign in to dashboard" : "Request access"}</>}
          </button>

          {/* Switch mode */}
          <div style={{ textAlign: "center", fontSize: 13, color: "#5c677d" }}>
            {mode === "signin"
              ? <>Don't have an account? <span style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode("signup"); setErr(""); }}>Request access</span></>
              : <>Have an account? <span style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode("signin"); setErr(""); }}>Sign in</span></>}
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap", marginTop: 28, paddingTop: 20, borderTop: "1px solid #f0f3f8" }}>
            {[
              { label: "256-bit SSL", svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
              { label: "Supabase auth", svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> },
              { label: "UK servers", svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> },
            ].map(b => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9aa5b4" }}>
                {b.svg}<span>{b.label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
// ── INVOICE MODAL ─────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ InvoiceModal                                               │
// │ Invoice detail modal — 3 tabs: Invoice, Timeline, Actions  │
// └────────────────────────────────────────────────────────────┘
function InvoiceModal({ invoice, onClose, contacts = [], onStatusChange, onDuplicate, onEdit, onPartPay, onLogPartPay }) {
  const [showWaInput, setShowWaInput] = useState(false);
  const [waNumber, setWaNumber] = useState("");
  const [activeTab, setActiveTab] = useState("invoice");
  const [partPayAmount, setPartPayAmount] = useState("");
  const [partPayMethod, setPartPayMethod] = useState("cash");
  const [partPayLoading, setPartPayLoading] = useState(false);
  const [partPayMsg, setPartPayMsg] = useState("");

  const lines = (() => {
    try {
      const l = invoice.lines ? (typeof invoice.lines === "string" ? JSON.parse(invoice.lines) : invoice.lines) : null;
      return Array.isArray(l) && l.length > 0 ? l : [{ description: invoice.description || "Services rendered", qty: 1, unit_price: invoice.amount || 0, vat_rate: 20 }];
    } catch(e) {
      return [{ description: invoice.description || "Services rendered", qty: 1, unit_price: invoice.amount || 0, vat_rate: 20 }];
    }
  })();
  const subtotal = lines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
  const vatTotal = lines.reduce((s, l) => s + (l.qty * l.unit_price * (l.vat_rate / 100)), 0);
  const total = subtotal + vatTotal;

  const customerContact = contacts.find(c => c.name === invoice.customer);
  const savedPhone = customerContact?.phone || "";

  // ── jsPDF invoice generation ──────────────────────────────────────────────
  const handlePrint = () => {
    const invLines = lines;
    const sub = subtotal, vat = vatTotal, tot = total;
    const html = `<!DOCTYPE html><html><head><title>${escHtml(invoice.invoice_number)}</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#ffffff}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;padding:20mm;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1e1b4b}.logo-mark-print{display:flex;align-items:center;gap:10px}.co-detail{font-size:10px;color:#64748b;line-height:1.7;margin-top:8px}.inv-title{font-size:42px;font-weight:900;color:#e8edf4;letter-spacing:-2px;text-align:right;line-height:1}.inv-num{font-size:16px;font-weight:800;text-align:right;color:#0f172a;margin-top:4px}.inv-status{display:inline-block;margin-top:6px;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe}.meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}.meta-box.dk{background:#1e1b4b;border-color:#1e1b4b}.meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}.meta-lbl.lt{color:rgba(255,255,255,.45)}.meta-val{font-size:12px;font-weight:600;color:#0f172a}.meta-val.lg{font-size:18px}.meta-val.lt{color:#fff}.meta-sub{display:grid;grid-template-columns:1fr 1fr;gap:10px}table{width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}thead tr{background:#1e1b4b;color:#fff}th{padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left}th:last-child,td:last-child{text-align:right}td{padding:11px 14px;border-bottom:1px solid #f1f5f9;font-size:12px}tr:last-child td{border-bottom:none}.totals{width:280px;margin-left:auto;margin-bottom:24px;background:#ffffff}.tot-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px}.balance{display:none}.balance-box{background:#1e1b4b;border-radius:9px;padding:11px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center}.balance-lbl{color:rgba(255,255,255,.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}.balance-val{color:#fff;font-size:17px;font-weight:800}.bank{background:#f8fafc;padding:14px;border-radius:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px}.bank-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.bank-val{font-size:12px;font-weight:700;color:#0f172a}.footer{font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between}</style></head><body><div class="header"><div><div style=\"display:flex;align-items:center;gap:10px\"><div style=\"width:52px;height:52px;background:#1e1b4b;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0\"><svg width=\"32\" height=\"32\" viewBox=\"0 0 48 48\" fill=\"none\"><rect x=\"10\" y=\"13\" width=\"28\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\"/><rect x=\"10\" y=\"20\" width=\"20\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".6\"/><rect x=\"10\" y=\"27\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".35\"/><rect x=\"10\" y=\"34\" width=\"14\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".18\"/><rect x=\"30\" y=\"21\" width=\"2.5\" height=\"14\" rx=\"1.25\" fill=\"#60a5fa\"/><polygon points=\"36,27 30,21 30,35\" fill=\"#60a5fa\" fill-opacity=\".4\"/></svg></div><div style=\"margin-left:0\"><div style=\"font-size:14px;font-weight:900;color:#1e1b4b;letter-spacing:-.3px\">${escHtml(COMPANY.name)}</div><div style=\"font-size:10px;color:#94a3b8\">${escHtml(COMPANY.address)}, ${escHtml(COMPANY.postcode)}</div></div></div><div class="co-detail">${escHtml(COMPANY.address)}<br>${escHtml(COMPANY.city)}, ${escHtml(COMPANY.postcode)}<br>Tel: ${escHtml(COMPANY.phone)}<br>${escHtml(COMPANY.email)} · VAT: ${escHtml(COMPANY.vatNumber)}</div></div><div style="text-align:right"><div class="inv-title">INVOICE</div><div class="inv-num">${escHtml(invoice.invoice_number)}</div><div class="inv-status">${escHtml((invoice.status||'pending').toUpperCase())}</div></div></div><div class="meta"><div class="meta-box dk"><div class="meta-lbl lt">Invoice To</div><div class="meta-val lg lt">${escHtml(invoice.customer)}</div></div><div class="meta-sub"><div class="meta-box"><div class="meta-lbl">Invoice #</div><div class="meta-val">${escHtml(invoice.invoice_number)}</div></div><div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${fmtDate(invoice.invoice_date)}</div></div><div class="meta-box"><div class="meta-lbl">Due Date</div><div class="meta-val">${fmtDate(invoice.due_date)}</div></div><div class="meta-box"><div class="meta-lbl">Terms</div><div class="meta-val">Due on receipt</div></div></div></div><table><thead><tr><th style="width:40%">Description</th><th>VAT</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${invLines.map(l=>`<tr><td style="font-weight:600">${escHtml(l.description)}</td><td style="color:#94a3b8;font-size:11px">${l.vat_rate===0?'Exempt':l.vat_rate+'% S'}</td><td style="text-align:right">${escHtml(String(l.qty))}</td><td style="text-align:right">${fmt(l.unit_price)}</td><td style="text-align:right;font-weight:700">${fmt(l.qty*l.unit_price)}</td></tr>`).join('')}</tbody></table><div class="totals"><div class="tot-row"><span style="color:#64748b">Subtotal</span><span>${fmt(sub)}</span></div><div class="tot-row"><span style="color:#64748b">VAT Total</span><span>${fmt(vat)}</span></div><div style="border-top:1px solid #e2e8f0;margin-top:8px;padding-top:10px;display:flex;justify-content:space-between;font-weight:600;color:#0f172a;background:#ffffff"><span>Total</span><span>${fmt(tot)}</span></div><div style="background:#1e1b4b;border-radius:9px;padding:11px 16px;margin-top:16px;display:flex;justify-content:space-between;align-items:center"><span style="color:rgba(255,255,255,.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px">Balance Due</span><span style="color:#fff;font-size:17px;font-weight:800">${fmt(tot)}</span></div></div><div class="bank"><div><div class="bank-lbl">Bank</div><div class="bank-val">${escHtml(COMPANY.bankName)}</div></div><div><div class="bank-lbl">Sort Code</div><div class="bank-val">${escHtml(COMPANY.sortCode)}</div></div><div><div class="bank-lbl">Account</div><div class="bank-val">${escHtml(COMPANY.accountNumber)}</div></div></div><div class="footer"><span>${escHtml(COMPANY.name)} &middot; VAT: ${escHtml(COMPANY.vatNumber)}</span><span>Ref: ${escHtml(invoice.invoice_number)} &middot; Printed: ${new Date().toLocaleDateString('en-GB')}</span></div></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 800);
  };

  const buildWaMsg = () => encodeURIComponent(
    `*VAT Invoice — ${COMPANY.name}*\n\nInvoice: *${invoice.invoice_number}*\nCustomer: ${invoice.customer}\nDate: ${fmtDate(invoice.invoice_date)}\nDue: ${fmtDate(invoice.due_date)}\n\n` +
    lines.map(l => `${l.description} x${l.qty} — ${fmt(l.qty * l.unit_price)}`).join("\n") +
    `\n\nSubtotal: ${fmt(subtotal)}\nVAT: ${fmt(vatTotal)}\n*Total Due: ${fmt(total)}*\n\nPayment to:\nBank: ${COMPANY.bankName}\nSort Code: ${COMPANY.sortCode}\nAcc No: ${COMPANY.accountNumber}\nRef: ${invoice.invoice_number}\n\nThank you for your business! 🙏`
  );

  const sendWhatsApp = (number) => {
    const clean = number.replace(/\s+/g, "").replace(/^0/, "44");
    window.open(`https://wa.me/${clean}?text=${buildWaMsg()}`, "_blank");
    setShowWaInput(false);
  };

  const [emailStatus, setEmailStatus] = useState(null); // null | "sending" | "sent" | "error"
  const handleEmail = async (isReminder = false) => {
    const customerContact = contacts.find(c => c.name === invoice.customer);
    const toEmail = customerContact?.email;
    if (!toEmail) {
      toast.warn(`No email address found for ${invoice.customer}. Please add one in Customers first.`);
      return;
    }
    setEmailStatus("sending");
    const balance = invoice.balance > 0 ? invoice.balance : (invoice.amount || total);
    const html = isReminder
      ? buildReminderEmailHtml(invoice, balance)
      : buildInvoiceEmailHtml(invoice, lines, subtotal, vatTotal, total);
    const subject = isReminder
      ? `Payment Reminder — ${invoice.invoice_number} — ${COMPANY.name}`
      : `Invoice ${invoice.invoice_number} — ${COMPANY.name}`;
    const result = await sendEmail({ to: toEmail, subject, html });
    setEmailStatus(result.success ? "sent" : "error");
    setTimeout(() => setEmailStatus(null), 4000);
  };

  // Timeline events derived from invoice data
  const timeline = [
    { icon: "ti-file-plus", color: "var(--blue)", bg: "var(--blue-lt)", label: "Created", date: invoice.created_at || invoice.invoice_date, desc: `Invoice ${invoice.invoice_number} created` },
    invoice.status === "paid" && { icon: "ti-circle-check", color: "var(--green)", bg: "var(--green-lt)", label: "Paid", date: invoice.updated_at || invoice.invoice_date, desc: `Payment received · ${invoice.payment_method || ""}` },
    invoice.status === "overdue" && { icon: "ti-alert-circle", color: "var(--red)", bg: "var(--red-lt)", label: "Overdue", date: invoice.due_date, desc: "Payment overdue — chase required" },
  ].filter(Boolean);

  const statusConfig = {
    partial:  { label: "Partial",  cls: "b-orange",  icon: "ti-clock-dollar" },
    draft:    { label: "Draft",    cls: "b-gray",   icon: "ti-file" },
    pending:  { label: "Pending",  cls: "b-amber",  icon: "ti-clock" },
    paid:     { label: "Paid",     cls: "b-green",  icon: "ti-circle-check" },
    overdue:  { label: "Overdue",  cls: "b-red",    icon: "ti-alert-circle" },
    cancelled:{ label: "Cancelled",cls: "b-gray",   icon: "ti-ban" },
  };
  const sc = statusConfig[invoice.status] || statusConfig.pending;

  return (<ModalPortal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "var(--blue-lt)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "var(--blue)", fontSize: 17 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span></div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{invoice.invoice_number}</span>
                <span className={"badge " + sc.cls}><i className={"ti " + sc.icon} style={{ fontSize: 10 }} />{sc.label}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{invoice.customer} · {fmtDate(invoice.invoice_date)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", background: "#f4f6f9", borderRadius: "var(--r)", padding: 3, gap: 2 }}>
              {[["invoice","ti-file-text","Invoice"],["timeline","ti-timeline","Timeline"],["actions","ti-bolt","Actions"]].map(([id, icon, lbl]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5, transition: "all .12s", background: activeTab === id ? "var(--white)" : "transparent", color: activeTab === id ? "var(--text)" : "var(--text3)", boxShadow: activeTab === id ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
                  <i className={"ti " + icon} style={{ fontSize: 13 }} />{isMobile() ? null : lbl}
                </button>
              ))}
            </div>
            <button className="btn bo bsm" onClick={onClose} style={{ width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
          </div>
        </div>
        {/* ── INVOICE TAB ── */}
        {activeTab === "invoice" && (
          <div className="inv-doc">
            <div className="inv-header">
              <div>
<div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, background: "#1e1b4b", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                    <rect x="10" y="13" width="28" height="3" rx="1.5" fill="#818cf8"/>
                    <rect x="10" y="20" width="20" height="3" rx="1.5" fill="#818cf8" fillOpacity=".6"/>
                    <rect x="10" y="27" width="24" height="3" rx="1.5" fill="#818cf8" fillOpacity=".35"/>
                    <rect x="10" y="34" width="14" height="3" rx="1.5" fill="#818cf8" fillOpacity=".18"/>
                    <rect x="30" y="21" width="2.5" height="14" rx="1.25" fill="#60a5fa"/>
                    <polygon points="36,27 30,21 30,35" fill="#60a5fa" fillOpacity=".4"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1e1b4b", letterSpacing: "-.3px" }}>{COMPANY.name}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6, marginTop: 2 }}>{COMPANY.address}<br />{COMPANY.city}, {COMPANY.postcode}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>Tel: {COMPANY.phone}<br />{COMPANY.email} · VAT: {COMPANY.vatNumber}</div>
                </div>
              </div>

              </div>
              <div className="inv-title-block">
                <div className="inv-title">INVOICE</div>
                <div className="inv-num">{invoice.invoice_number}</div>
                <div style={{ marginTop: 8 }}><span className={"badge " + sc.cls}>{sc.label}</span></div>
              </div>
            </div>
            <div className="inv-meta">
              <div>
                <div className="inv-meta-lbl">Invoice to</div>
                <div className="inv-meta-val" style={{ fontSize: 17, marginBottom: 4 }}>{invoice.customer}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><div className="inv-meta-lbl">Invoice #</div><div className="inv-meta-val">{invoice.invoice_number}</div></div>
                <div><div className="inv-meta-lbl">Date</div><div className="inv-meta-val">{fmtDate(invoice.invoice_date)}</div></div>
                <div><div className="inv-meta-lbl">Due date</div><div className="inv-meta-val">{fmtDate(invoice.due_date)}</div></div>
                <div><div className="inv-meta-lbl">Terms</div><div className="inv-meta-val">Due on receipt</div></div>
              </div>
            </div>
            <table className="inv-table">
              <thead><tr><th style={{ width: "40%" }}>Description</th><th>VAT</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Rate</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{l.description}</td>
                    <td><span className="tag">{l.vat_rate === 0 ? "Exempt" : `${l.vat_rate}% S`}</span></td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{l.qty}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(l.unit_price)}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{fmt(l.qty * l.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="inv-totals-box">
              <div className="inv-tot-row"><span style={{ color: "#64748b" }}>Subtotal</span><span className="mono">{fmt(subtotal)}</span></div>
              <div className="inv-tot-row"><span style={{ color: "#64748b" }}>VAT Total</span><span className="mono">{fmt(vatTotal)}</span></div>
              <div className="inv-tot-row divider"><span>Total</span><span className="mono">{fmt(total)}</span></div>
              <div className="inv-balance-box"><span className="inv-balance-lbl">Balance Due</span><span className="inv-balance-val mono">{fmt(total)}</span></div>
            </div>
            <div className="inv-footer">
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: "#0f172a" }}>Payment Details</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Please transfer using the invoice number as reference.</div>
              <div className="inv-bank-grid">
                <div><div className="inv-bank-lbl">Bank</div><div className="inv-bank-val">{COMPANY.bankName}</div></div>
                <div><div className="inv-bank-lbl">Sort Code</div><div className="inv-bank-val mono">{COMPANY.sortCode}</div></div>
                <div><div className="inv-bank-lbl">Account</div><div className="inv-bank-val mono">{COMPANY.accountNumber}</div></div>
              </div>
              <div style={{ marginTop: 16, fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>All goods remain our property until payment is received in full. VAT Reg No: {COMPANY.vatNumber}</div>
            </div>
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {activeTab === "timeline" && (
          <div style={{ padding: "28px 32px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Invoice Timeline</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 24 }}>Full history of {invoice.invoice_number}</div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 16, top: 0, bottom: 0, width: 1, background: "var(--border)" }} />
              {timeline.map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 16, marginBottom: 24, position: "relative" }}>
                  <div style={{ width: 33, height: 33, borderRadius: "50%", background: ev.bg, border: `2px solid var(--white)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, boxShadow: "0 0 0 3px " + ev.bg }}>
                    <i className={"ti " + ev.icon} style={{ color: ev.color, fontSize: 15 }} />
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{ev.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>{ev.desc}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{fmtDate(ev.date)}</div>
                  </div>
                </div>
              ))}
              {/* Invoice details summary */}
              <div style={{ background: "#f8fafd", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "16px 20px", marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Invoice Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  {[["Customer", invoice.customer],["Invoice #", invoice.invoice_number],["Amount", fmt(invoice.amount)],["Subtotal", fmt(subtotal)],["VAT", fmt(vatTotal)],["Status", invoice.status?.toUpperCase()]].map(([lbl, val]) => (
                    <div key={lbl}><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".5px" }}>{lbl}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{val}</div></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIONS TAB ── */}
        {activeTab === "actions" && (
          <div style={{ padding: "28px 32px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Invoice Actions</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 24 }}>Manage {invoice.invoice_number}</div>

            {/* Edit Invoice */}
            {onEdit && (
              <div style={{ background:"#f0f4ff", border:"1px solid #c7d7fc", borderRadius:"var(--rl)", padding:"16px 18px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontWeight:600, marginBottom:2 }}>Edit Invoice</div>
                  <div style={{ fontSize:12, color:"var(--text3)" }}>Modify customer, amounts or line items</div>
                </div>
                <button className="btn bp bsm" onClick={() => { onEdit(invoice); onClose(); }}>Edit</button>
              </div>
            )}

            {/* Print & Share */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Print & Share</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Print Invoice", color: "var(--blue)", bg: "var(--blue-lt)", onClick: handlePrint,
                    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> },
                  { label: "Email Invoice", color: "var(--purple)", bg: "var(--purple-lt)", onClick: handleEmail,
                    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
                  { label: "WhatsApp", color: "#25D366", bg: "#f0fdf4", onClick: () => savedPhone ? sendWhatsApp(savedPhone) : setShowWaInput(true),
                    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> },
                ].map(a => (
                  <button key={a.label} onClick={a.onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: a.bg, border: `1px solid ${a.color}22`, borderRadius: "var(--rl)", cursor: "pointer", fontFamily: "var(--sans)", transition: "all .14s" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: a.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {a.svg}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: a.color }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* WA number input */}
            {showWaInput && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "var(--r)", padding: "10px 14px", marginBottom: 16 }}>
                <i className="ti ti-brand-whatsapp" style={{ color: "#25D366", fontSize: 18 }} />
                <input style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} placeholder="Enter WhatsApp number e.g. 07700 900000" value={waNumber} onChange={e => setWaNumber(e.target.value)} onKeyDown={e => e.key === "Enter" && waNumber && sendWhatsApp(waNumber)} autoFocus />
                <button className="btn bwa bsm" onClick={() => sendWhatsApp(waNumber)} disabled={!waNumber}>Send</button>
                <button className="btn bo bsm" onClick={() => setShowWaInput(false)}>Cancel</button>
              </div>
            )}

            {/* Status management */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Update Status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["pending","b-amber","ti-clock"],["paid","b-green","ti-circle-check"],["overdue","b-red","ti-alert-circle"],["draft","b-gray","ti-file"],["cancelled","b-gray","ti-ban"]].map(([s, cls, icon]) => (
                  <button key={s} onClick={() => onStatusChange && onStatusChange(invoice.id, s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid var(--border2)", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, background: invoice.status === s ? "var(--blue)" : "var(--white)", color: invoice.status === s ? "#fff" : "var(--text2)", display: "flex", alignItems: "center", gap: 5, transition: "all .12s" }}>
                    <i className={"ti " + icon} style={{ fontSize: 12 }} />{s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Part payment */}
            {invoice.status !== "paid" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Part Payment</div>
                {partPayMsg && <div style={{ fontSize: 12, color: partPayMsg.startsWith("✓") ? "var(--green)" : "var(--red)", marginBottom: 8, fontWeight: 600 }}>{partPayMsg}</div>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="number" placeholder="Amount £" value={partPayAmount} onChange={e => setPartPayAmount(e.target.value)} style={{ width: 110, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border2)", fontSize: 13, outline: "none", fontFamily: "var(--sans)", background: "var(--white)", color: "var(--text)" }} />
                  <select value={partPayMethod} onChange={e => setPartPayMethod(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border2)", fontSize: 13, outline: "none", fontFamily: "var(--sans)", background: "var(--white)", color: "var(--text)", cursor: "pointer" }}>
                    <option value="cash">💵 Cash</option>
                    <option value="bank">🏦 Bank</option>
                    <option value="card">💳 Card</option>
                    <option value="cheque">📝 Cheque</option>
                  </select>
                  <button className="btn bp" disabled={!partPayAmount || partPayLoading} onClick={async () => {
                    const amt = parseFloat(partPayAmount);
                    if (!amt || amt <= 0) return;
                    setPartPayLoading(true); setPartPayMsg("");
                    try {
                      if (onPartPay) await onPartPay(invoice, amt, partPayMethod);
                      const bal = invoice.balance > 0 ? invoice.balance : total;
                      const newBal = Math.max(0, bal - amt);
                      setPartPayMsg(`✓ £${amt.toFixed(2)} recorded. Balance: £${newBal.toFixed(2)}`);
                      setPartPayAmount("");
                      if (onLogPartPay) onLogPartPay(invoice, amt, partPayMethod, newBal);
                    } catch { setPartPayMsg("Error recording payment"); }
                    setPartPayLoading(false);
                  }} style={{ whiteSpace: "nowrap" }}>
                    {partPayLoading ? "Saving..." : "Record Payment"}
                  </button>
                </div>
                {invoice.balance > 0 && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>Outstanding balance: <strong>£{invoice.balance.toFixed(2)}</strong></div>}
              </div>
            )}

            {/* Other actions */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>More Actions</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn bo" onClick={() => onDuplicate && onDuplicate(invoice)}><i className="ti ti-copy" />Duplicate Invoice</button>
                <button className="btn bo" onClick={() => handleEmail(true)}><i className="ti ti-bell" />Send Reminder</button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={"badge " + sc.cls}>{sc.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{fmt(total)}</span>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>· {invoice.invoice_number}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {savedPhone && <button className="btn bwa bsm" onClick={() => sendWhatsApp(savedPhone)}><i className="ti ti-brand-whatsapp" />{savedPhone}</button>}
              <button className="btn bo bsm" onClick={handleEmail} disabled={emailStatus==="sending"} style={{color:emailStatus==="sent"?"var(--green)":emailStatus==="error"?"var(--red)":undefined,borderColor:emailStatus==="sent"?"var(--green)":emailStatus==="error"?"var(--red)":undefined}}>
                {emailStatus==="sending" ? <div className="spin" style={{width:13,height:13,borderWidth:2,flexShrink:0}}/> : emailStatus==="sent" ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> : emailStatus==="error" ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                {emailStatus==="sending"?"Sending...":emailStatus==="sent"?"Sent!":emailStatus==="error"?"Failed":"Email"}
              </button>
              <button className="btn bp bsm" onClick={handlePrint}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print</button>
            </div>
          </div>
      </div>
    </div>
  </div>
  </ModalPortal>
  );
}

// ── SEARCHABLE DROPDOWN ───────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ SearchDropdown                                             │
// │ Searchable dropdown for product/contact selection          │
// └────────────────────────────────────────────────────────────┘
// shortName: strips namespace/category prefix — "VAPE:DISPOSABLES:HAYATI 6K" → "HAYATI 6K"
const shortName = (n) => { if (!n) return n; const p = n.split(":"); return p[p.length - 1].trim(); };

function SearchDropdown({ placeholder, items, onSelect, displayKey = "name", value = "" }) {
  const [query, setQuery] = useState(shortName(value));
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const filtered = items.filter(i => (i[displayKey] || "").toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "9px 36px 9px 12px", fontSize: 13, color: "var(--text)", fontFamily: "var(--sans)", outline: "none", width: "100%", transition: "border .15s" }} placeholder={placeholder} value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14 }}>⌄</span>
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", boxShadow: "var(--sh2)", zIndex: 100, maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
          {filtered.map((item, i) => (
            <div key={i} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "0.5px solid var(--border)", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} onMouseDown={() => { onSelect(item); setQuery(shortName(item[displayKey])); setOpen(false); }}>
              <div style={{ fontWeight: 500 }}>{shortName(item[displayKey])}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{item[displayKey]}</div>
              {item.city && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.city}{item.postcode ? ` · ${item.postcode}` : ""}</div>}
              {item.code && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.code}{item.sale_price != null ? ` · £${parseFloat(item.sale_price).toFixed(2)}` : ""}{item.category ? ` · ${item.category}` : ""}</div>}
              {!item.code && item.category && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.category}</div>}
            </div>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", boxShadow: "var(--sh2)", zIndex: 100, padding: "12px 14px", fontSize: 13, color: "var(--text3)", marginTop: 4 }}>No results found for "{query}"</div>}
    </div>
  );
}

// ── INVOICE FORM ──────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ InvoiceForm                                                │
// │ Create new invoice form with line items and VAT            │
// └────────────────────────────────────────────────────────────┘
function InvoiceForm({ contacts, products, token, userId, onSave, onClose }) {
  const [f, setF] = useState({ customer: "", invoice_date: today(), due_date: "", status: "pending", notes: "" });
  const [lines, setLines] = useState([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null); // ← success state
  const [creatingDN, setCreatingDN] = useState(false);
  const [dnSaved, setDnSaved] = useState(false);
  const [dnDriver, setDnDriver] = useState("");
  const [dnAddress, setDnAddress] = useState("");
  const [dnNotes, setDnNotes] = useState("");
  const [mobPickerOpen, setMobPickerOpen] = useState(false);
  const [mobPickerSearch, setMobPickerSearch] = useState("");

  const customers = contacts.filter(c => c.type === "customer" || c.type === "both");

  const updateLine = (i, field, val) => {
    const next = [...lines];
    if (field === "product_id") { const p = products.find(x => x.id === val); next[i] = { ...next[i], product_id: val, description: p?.name || "", unit_price: p?.sale_price || "", vat_rate: p?.vat_rate ?? 20, unit: p?.unit || "unit" }; }
    else next[i] = { ...next[i], [field]: val };
    setLines(next);
  };

  const subtotal = lines.reduce((s, l) => s + ((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0)), 0);
  const vatTotal = lines.reduce((s, l) => s + ((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0) * ((parseFloat(l.vat_rate) || 0) / 100)), 0);
  const total = subtotal + vatTotal;

  const save = async () => {
    setSubmitted(true);
    if (!f.customer) return;
    setSaving(true);
    const existing = await sb.get(token, "invoices", "select=invoice_number&order=invoice_number.desc&limit=1");
    let nextNum = 1;
    if (Array.isArray(existing) && existing.length > 0 && existing[0].invoice_number) {
      const lastNum = parseInt(existing[0].invoice_number.replace("INV-", ""), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const invoice_number = `INV-${String(nextNum).padStart(4, "0")}`;
    const inv = await sb.post(token, "invoices", {
      customer: f.customer, invoice_date: f.invoice_date, due_date: f.due_date || null,
      status: f.status, notes: f.notes || null,
      amount: total, subtotal, vat_total: vatTotal, invoice_number, created_by: userId,
      lines: JSON.stringify(lines.filter(l => l.description && l.description.trim() !== ""))
    });
    if (inv[0]) {
      const fullInv = { ...inv[0], lines };
      onSave(fullInv);
      logAudit(token, userId, "invoice_created", "invoice", inv[0].id, `Invoice ${invoice_number} created for ${f.customer} — ${new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(total)}`);
      // Pre-fill DN fields from customer contact
      const cust = contacts.find(c => c.name === f.customer);
      setDnAddress([cust?.address, cust?.city, cust?.postcode].filter(Boolean).join(", "));
      setDnNotes(f.notes || "");
      setSavedInvoice(fullInv);
    } else {
      toast.error("Failed to save invoice. Please try again.");
    }
    setSaving(false);
  };

  // Print the saved invoice as HTML download
  const printInvoice = () => {
    if (!savedInvoice) return;
    const invLines = savedInvoice.lines || [];
    const sub = invLines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
    const vat = invLines.reduce((s, l) => s + (l.qty * l.unit_price * (l.vat_rate / 100)), 0);
    const tot = sub + vat;
    const html = `<!DOCTYPE html><html><head><title>${savedInvoice.invoice_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#ffffff}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;padding:20mm;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1e1b4b}.logo-mark-print{display:flex;align-items:center;gap:10px}.co-detail{font-size:10px;color:#64748b;line-height:1.7;margin-top:8px}.inv-title{font-size:42px;font-weight:900;color:#e8edf4;letter-spacing:-2px;text-align:right;line-height:1}.inv-num{font-size:16px;font-weight:800;text-align:right;color:#0f172a;margin-top:4px}.inv-status{display:inline-block;margin-top:6px;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe}.meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}.meta-box.dk{background:#1e1b4b;border-color:#1e1b4b}.meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}.meta-lbl.lt{color:rgba(255,255,255,.45)}.meta-val{font-size:12px;font-weight:600;color:#0f172a}.meta-val.lg{font-size:18px}.meta-val.lt{color:#fff}.meta-sub{display:grid;grid-template-columns:1fr 1fr;gap:10px}table{width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}thead tr{background:#1e1b4b;color:#fff}th{padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left}th:last-child,td:last-child{text-align:right}td{padding:11px 14px;border-bottom:1px solid #f1f5f9;font-size:12px}tr:last-child td{border-bottom:none}.totals{width:280px;margin-left:auto;margin-bottom:24px;background:#ffffff}.tot-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px}.balance{display:none}.balance-box{background:#1e1b4b;border-radius:9px;padding:11px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center}.balance-lbl{color:rgba(255,255,255,.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}.balance-val{color:#fff;font-size:17px;font-weight:800}.bank{background:#f8fafc;padding:14px;border-radius:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px}.bank-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.bank-val{font-size:12px;font-weight:700;color:#0f172a}.footer{font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between}</style></head><body><div class="header"><div><div style=\"display:flex;align-items:center;gap:10px\"><div style=\"width:52px;height:52px;background:#1e1b4b;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0\"><svg width=\"32\" height=\"32\" viewBox=\"0 0 48 48\" fill=\"none\"><rect x=\"10\" y=\"13\" width=\"28\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\"/><rect x=\"10\" y=\"20\" width=\"20\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".6\"/><rect x=\"10\" y=\"27\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".35\"/><rect x=\"10\" y=\"34\" width=\"14\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".18\"/><rect x=\"30\" y=\"21\" width=\"2.5\" height=\"14\" rx=\"1.25\" fill=\"#60a5fa\"/><polygon points=\"36,27 30,21 30,35\" fill=\"#60a5fa\" fill-opacity=\".4\"/></svg></div><div style=\"margin-left:0\"><div style=\"font-size:14px;font-weight:900;color:#1e1b4b;letter-spacing:-.3px\">${COMPANY.name}</div><div style=\"font-size:10px;color:#94a3b8;line-height:1.6;margin-top:2px\">${COMPANY.address}<br>${COMPANY.city}, ${COMPANY.postcode}</div><div style=\"font-size:10px;color:#94a3b8;margin-top:2px\">Tel: ${COMPANY.phone}<br>${COMPANY.email} · VAT: ${COMPANY.vatNumber}</div></div></div></div><div style="text-align:right"><div class="inv-title">INVOICE</div><div class="inv-num">${escHtml(savedInvoice.invoice_number)}</div><div class="inv-status">${escHtml((savedInvoice.status||'pending').toUpperCase())}</div></div></div><div class="meta"><div class="meta-box dk"><div class="meta-lbl lt">Invoice To</div><div class="meta-val lg lt">${escHtml(savedInvoice.customer)}</div></div><div class="meta-sub"><div class="meta-box"><div class="meta-lbl">Invoice #</div><div class="meta-val">${savedInvoice.invoice_number}</div></div><div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${fmtDate(savedInvoice.invoice_date)}</div></div><div class="meta-box"><div class="meta-lbl">Due Date</div><div class="meta-val">${fmtDate(savedInvoice.due_date)}</div></div><div class="meta-box"><div class="meta-lbl">Terms</div><div class="meta-val">Due on receipt</div></div></div></div><table><thead><tr><th style="width:40%">Description</th><th>VAT</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${invLines.map(l => `<tr><td style="font-weight:600">${escHtml(l.description)}</td><td>${l.vat_rate === 0 ? "Exempt" : l.vat_rate + "% S"}</td><td style="text-align:right">${escHtml(String(l.qty))}</td><td style="text-align:right">${fmt(l.unit_price)}</td><td style="text-align:right;font-weight:700">${fmt(l.qty * l.unit_price)}</td></tr>`).join("")}</tbody></table><div class="totals"><div class="tot-row"><span style="color:#64748b">Subtotal</span><span>${fmt(sub)}</span></div><div class="tot-row"><span style="color:#64748b">VAT Total</span><span>${fmt(vat)}</span></div><div style="border-top:1px solid #e2e8f0;margin-top:8px;padding-top:10px;display:flex;justify-content:space-between;font-weight:600;color:#0f172a;background:#ffffff"><span>Total</span><span>${fmt(tot)}</span></div><div style="background:#1e1b4b;border-radius:9px;padding:11px 16px;margin-top:16px;display:flex;justify-content:space-between;align-items:center"><span style="color:rgba(255,255,255,.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px">Balance Due</span><span style="color:#fff;font-size:17px;font-weight:800">${fmt(tot)}</span></div></div><div class="bank"><div><div class="bank-lbl">Bank</div><div class="bank-val">${COMPANY.bankName}</div></div><div><div class="bank-lbl">Sort Code</div><div class="bank-val">${COMPANY.sortCode}</div></div><div><div class="bank-lbl">Account</div><div class="bank-val">${COMPANY.accountNumber}</div></div></div><div class="footer"><span>${COMPANY.name} &middot; VAT: ${COMPANY.vatNumber}</span><span>Ref: ${savedInvoice.invoice_number} &middot; Printed: ${new Date().toLocaleDateString("en-GB")}</span></div></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 800);
  };

  const downloadInvoicePDF = () => {
    const html = buildInvoiceHtml();
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 800);
  };

  // Create delivery note from invoice
  const createDeliveryNote = async () => {
    if (!savedInvoice) return;
    setCreatingDN(true);
    const existing = await sb.get(token, "delivery_notes", "select=id");
    const count = Array.isArray(existing) ? existing.length + 1 : 1;
    const dn_number = `DN-${String(count).padStart(4, "0")}`;
    const dnLines = (savedInvoice.lines || []).map(l => ({
      description: l.description, qty: l.qty, unit: l.unit || "unit", product_id: l.product_id || null
    }));
    const cust = contacts.find(c => c.name === savedInvoice.customer);
    await sb.post(token, "delivery_notes", {
      dn_number, customer_name: savedInvoice.customer,
      customer_id: cust?.id || null,
      delivery_date: savedInvoice.invoice_date,
      delivery_address: dnAddress,
      driver: dnDriver, notes: dnNotes,
      status: "pending",
      invoice_ref: savedInvoice.invoice_number,
      lines: JSON.stringify(dnLines),
      created_by: userId
    });
    setCreatingDN(false);
    setDnSaved({ dn_number, customer_name: savedInvoice.customer, delivery_date: savedInvoice.invoice_date, delivery_address: dnAddress, driver: dnDriver, notes: dnNotes, invoice_ref: savedInvoice.invoice_number, lines: JSON.stringify(dnLines) });
  };

  const buildDNHtml = (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${dn.dn_number} — Delivery Note</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#0a0f1e;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:780px;margin:0 auto;padding:32px 36px}

  /* Header */
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:3px solid #0a0f1e;margin-bottom:28px}
  .logo-wrap img{height:52px;object-fit:contain}
  .co-detail{font-size:10px;color:#64748b;line-height:1.8;margin-top:8px}
  .doc-title-wrap{text-align:right}
  .doc-title{font-size:42px;font-weight:900;color:#e8edf4;letter-spacing:-2px;line-height:1}
  .doc-num{font-size:18px;font-weight:800;color:#0a0f1e;margin-top:4px;letter-spacing:-.5px}
  .status-pill{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe}
  .inv-badge{display:inline-block;margin-top:6px;padding:3px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;font-weight:600;color:#64748b}

  /* Meta grid */
  .meta-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:16px;margin-bottom:28px}
  .meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
  .meta-box.accent{background:#0a0f1e;border-color:#0a0f1e}
  .meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}
  .meta-lbl.light{color:rgba(255,255,255,.45)}
  .meta-val{font-size:14px;font-weight:700;color:#0a0f1e}
  .meta-val.large{font-size:20px;letter-spacing:-.3px}
  .meta-val.light{color:#fff}
  .meta-val.addr{font-size:12px;font-weight:500;color:#475569;margin-top:4px;line-height:1.6}
  .meta-sub-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}

  /* Table */
  .table-wrap{margin-bottom:28px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#0a0f1e}
  th{padding:12px 16px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#fff;text-align:left}
  th.center{text-align:center}
  td{padding:13px 16px;font-size:13px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:nth-child(even) td{background:#fafbfd}
  .td-desc{font-weight:600;color:#0a0f1e}
  .td-unit{color:#94a3b8;font-size:11px;font-weight:500}
  .td-qty{text-align:center;font-weight:800;font-size:16px;color:#2563eb}
  .td-blank{text-align:center;color:#cbd5e1;font-size:18px}

  /* Signature */
  .sig-section{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px;padding-top:24px;border-top:2px solid #f1f5f9}
  .sig-box{border-bottom:2px solid #0a0f1e;height:64px;margin-bottom:8px;border-radius:2px;background:linear-gradient(to bottom,#fafbfd,#fff)}
  .sig-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}

  /* Notes */
  .notes-box{background:#fef9ec;border:1px solid #fcd34d;border-radius:10px;padding:14px 16px;margin-bottom:24px}
  .notes-lbl{font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}
  .notes-val{font-size:12px;color:#78350f;line-height:1.6}

  /* Footer */
  .footer{margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#94a3b8}
  .footer-brand{font-weight:700;color:#0a0f1e;font-size:10px}

  /* Driver strip */
  .driver-strip{background:#f0f4ff;border:1px solid #c7d7fc;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px}
  .driver-icon{width:34px;height:34px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .driver-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:2px}
  .driver-name{font-size:14px;font-weight:700;color:#1e40af}

  @media print{
    body{padding:0}
    .page{max-width:100%;padding:20px 24px}
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div style="font-size:22px;font-weight:900;color:#0a0f1e;letter-spacing:-1px">AR</div>
      <div class="co-detail">
        2 Fieldhead Street, Fieldhead Business Centre<br>
        Bradford, West Yorkshire BD7 1LW<br>
        Tel: 07801 567209 / 07851 983151<br>
        ARKHAMRETAIL@GMAIL.COM · VAT: GB462229106
      </div>
    </div>
    <div class="doc-title-wrap">
      <div class="doc-title">DELIVERY</div>
      <div style="font-size:42px;font-weight:900;color:#e8edf4;letter-spacing:-2px;line-height:1">NOTE</div>
      <div class="doc-num">${dn.dn_number}</div>
      ${dn.invoice_ref ? "<div class=\"inv-badge\">📄 Invoice: "+dn.invoice_ref+"</div>" : ""}
      <div class="status-pill">${dn.status?.toUpperCase() || "PENDING"}</div>
    </div>
  </div>

  <!-- Driver strip -->
  ${dn.driver ? "<div class=\"driver-strip\"><div class=\"driver-icon\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"1\" y=\"3\" width=\"15\" height=\"13\"/><path d=\"M16 8h4l3 5v3h-7V8z\"/><circle cx=\"5.5\" cy=\"18.5\" r=\"2.5\"/><circle cx=\"18.5\" cy=\"18.5\" r=\"2.5\"/></svg></div><div><div class=\"driver-label\">Driver / Courier</div><div class=\"driver-name\">" + dn.driver + "</div></div></div>" : ""}


  <!-- Meta -->
  <div class="meta-grid">
    <div class="meta-box accent">
      <div class="meta-lbl light">Deliver To</div>
      <div class="meta-val large light">${dn.customer_name}</div>
      ${dn.delivery_address ? "<div class='meta-val addr' style='color:rgba(255,255,255,.55)'>"+dn.delivery_address+"</div>" : ""}
    </div>
    <div class="meta-sub-grid">
      <div class="meta-box"><div class="meta-lbl">DN Number</div><div class="meta-val">${dn.dn_number}</div></div>
      <div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${new Date(dn.delivery_date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div></div>
      <div class="meta-box"><div class="meta-lbl">Invoice Ref</div><div class="meta-val">${dn.invoice_ref || "—"}</div></div>
      <div class="meta-box"><div class="meta-lbl">Items</div><div class="meta-val">${dnLines.length} line${dnLines.length !== 1 ? "s" : ""}</div></div>
    </div>
  </div>

  <!-- Notes -->
  ${dn.notes ? "<div class=\"notes-box\"><div class=\"notes-lbl\">⚡ Delivery Instructions</div><div class=\"notes-val\">"+dn.notes+"</div></div>" : ""}

  <!-- Items table -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:45%">Description</th>
          <th>Unit</th>
          <th class="center">Qty Ordered</th>
          <th class="center">Qty Delivered</th>
          <th class="center">Condition</th>
        </tr>
      </thead>
      <tbody>
        ${dnLines.map(l => "<tr><td class=\"td-desc\">" + (l.description || "—") + "</td><td class=\"td-unit\">" + (l.unit || "unit") + "</td><td class=\"td-qty\">" + l.qty + "</td><td class=\"td-blank\">____</td><td class=\"td-blank\">____</td></tr>").join("")}


      </tbody>
    </table>
  </div>

  <!-- Signatures -->
  <div class="sig-section">
    <div>
      <div class="sig-box"></div>
      <div class="sig-lbl">✍ Delivered by — Signature &amp; Full Name</div>
    </div>
    <div>
      <div class="sig-box"></div>
      <div class="sig-lbl">✍ Received by — Signature, Name &amp; Date</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div><span class="footer-brand">Arkham Retail Ltd</span> · VAT Reg: GB462229106</div>
    <div>${dn.dn_number} · Printed: ${new Date().toLocaleDateString("en-GB")}</div>
    <div>All goods remain property of Arkham Retail Ltd until signed</div>
  </div>

</div>
</body>
</html>`;
  };
  const downloadDN = (dn) => {
    const blob = new Blob([buildDNHtml(dn)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${dn.dn_number}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const emailDN = async (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const cust = contacts.find(c => c.name === dn.customer_name);
    const toEmail = cust?.email;
    if (!toEmail) {
      toast.warn(`No email address found for ${dn.customer_name}. Please add one in Customers first.`);
      return;
    }
    const html = buildDNEmailHtml(dn, dnLines);
    const result = await sendEmail({
      to: toEmail,
      subject: `Delivery Note ${dn.dn_number} — ${COMPANY.name}`,
      html
    });
    if (result.success) toast.success("Delivery note emailed successfully");
    else toast.error("Failed to send email. Please try again.");
  };

  const whatsappDN = (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const cust = contacts.find(c => c.name === dn.customer_name);
    const msg = encodeURIComponent(
      `*Delivery Note — ${COMPANY.name}*\n\n` +
      `DN: *${dn.dn_number}*\n` +
      (dn.invoice_ref ? `Invoice Ref: ${dn.invoice_ref}\n` : "") +
      `Customer: ${dn.customer_name}\n` +
      `Date: ${fmtDate(dn.delivery_date)}\n` +
      (dn.driver ? `Driver: ${dn.driver}\n` : "") +
      (dn.delivery_address ? `Address: ${dn.delivery_address}\n` : "") +
      `\n*Items:*\n` +
      dnLines.map(l => `• ${l.description} — Qty: ${l.qty} ${l.unit || "unit"}`).join("\n") +
      (dn.notes ? `\n\n📋 Instructions: ${dn.notes}` : "") +
      `\n\nPlease confirm receipt. Thank you! 🙏\n${COMPANY.phone}`
    );
    const phone = (cust?.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    else window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  // Build a quick DN object from invoice for immediate printing (no DB save needed)
  const buildQuickDN = () => {
    const dnLines = (savedInvoice.lines || []).map(l => ({
      description: l.description, qty: l.qty, unit: l.unit || "unit"
    }));
    return {
      dn_number: `DN-${savedInvoice.invoice_number.replace("INV-", "")}`,
      customer_name: savedInvoice.customer,
      delivery_date: savedInvoice.invoice_date,
      delivery_address: dnAddress,
      driver: dnDriver,
      notes: dnNotes,
      invoice_ref: savedInvoice.invoice_number,
      lines: JSON.stringify(dnLines)
    };
  };

  const downloadDNpdf = (html, dn_num) => {
    const mobWin = window.open('', '_blank');
    if (!mobWin) return;
    mobWin.document.write(html);
    mobWin.document.close();
    mobWin.focus();
    setTimeout(() => { mobWin.print(); }, 800);
  };

  // ── SUCCESS SCREEN ─────────────────────────────────────────────────────────
  if (savedInvoice) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>

        {/* ── Success banner ── */}
        <div style={{ background: "linear-gradient(135deg,#10b981,#059669)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: 26 }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Invoice Created Successfully!</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>{savedInvoice.invoice_number} · {savedInvoice.customer} · {fmt(savedInvoice.amount)}</div>
          </div>
          <button className="btn bsm" style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }} onClick={onClose}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Close</button>
        </div>

        {/* ── Main action screen (no DN yet) ── */}
        {!dnSaved && (
          <div style={{ padding: "24px 24px 20px" }}>

            {/* Step label */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 16 }}>Print Documents</div>

            {/* Two big print buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>

              {/* Print Invoice */}
              <button onClick={printInvoice} style={{ border: "2px solid var(--blue)", borderRadius: "var(--rl)", padding: "18px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", transition: "all .15s", fontFamily: "var(--sans)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--blue-lt)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <span style={{ color: "#fff", fontSize: 20 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--blue)", marginBottom: 3 }}>Print Invoice</div>
                <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>Download {savedInvoice.invoice_number} as a print-ready file</div>
              </button>

              {/* Print Delivery Note — immediate, no DB save required */}
              <button onClick={() => downloadDNpdf(buildDNHtml(buildQuickDN()), buildQuickDN().dn_number)} style={{ border: "2px solid #0f172a", borderRadius: "var(--rl)", padding: "18px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", transition: "all .15s", fontFamily: "var(--sans)" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <span style={{ color: "#fff", fontSize: 20 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>Print Delivery Note</div>
                <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>Download DN for driver — pre-filled from this invoice</div>
              </button>
            </div>

            {/* DN extra fields — driver, address, notes before printing */}
            <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 12 }}>
                <span style={{ marginRight: 6 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>Delivery Note Details <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — updates the DN print)</span>
              </div>

              {/* Items preview */}
              <div style={{ marginBottom: 12 }}>
                {(savedInvoice.lines || []).map((l, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < (savedInvoice.lines.length - 1) ? "0.5px solid var(--border)" : "none" }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{l.description}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--blue)" }}>× {l.qty}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="fgrp">
                  <label>Driver / Courier</label>
                  <input value={dnDriver} onChange={e => setDnDriver(e.target.value)} placeholder="e.g. John Smith / DPD" />
                </div>
                <div className="fgrp">
                  <label>Delivery Address</label>
                  <input value={dnAddress} onChange={e => setDnAddress(e.target.value)} placeholder="Auto-filled from customer" />
                </div>
                <div className="fgrp" style={{ gridColumn: "1/-1" }}>
                  <label>Delivery Instructions</label>
                  <input value={dnNotes} onChange={e => setDnNotes(e.target.value)} placeholder="e.g. Leave at reception, call before delivery..." />
                </div>
              </div>
            </div>

            {/* Save to DB + share options */}
            <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Save & Share</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn bp" onClick={createDeliveryNote} disabled={creatingDN === true}
                  style={{ background: "#0f172a" }}>
                  {creatingDN === true
                    ? <><div className="spin" style={{ width: 13, height: 13, borderWidth: 2 }} />Saving...</>
                    : <><i className="ti ti-device-floppy" />Save Delivery Note</>}
                </button>
                <button className="btn bo" onClick={() => emailDN(buildQuickDN())}><i className="ti ti-mail" />Email DN</button>
                <button className="btn bwa" onClick={() => whatsappDN(buildQuickDN())}><i className="ti ti-brand-whatsapp" />WhatsApp DN</button>
              </div>
            </div>
          </div>
        )}

        {/* ── DN saved confirmation ── */}
        {dnSaved && (
          <div style={{ padding: "24px 24px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "var(--rl)", padding: "16px 20px", marginBottom: 20 }}>
              <span style={{ color: "var(--green)", fontSize: 26, flexShrink: 0 }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green-dk)", marginBottom: 2 }}>Delivery Note {dnSaved.dn_number} Saved!</div>
                <div style={{ fontSize: 12, color: "var(--green-dk)", opacity: 0.8 }}>Saved to Delivery Notes. Print, email or WhatsApp below.</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <button onClick={printInvoice} style={{ border: "2px solid var(--blue)", borderRadius: "var(--rl)", padding: "14px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", fontFamily: "var(--sans)", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--blue-lt)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--blue)", fontSize: 20 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)" }}>Print Invoice</div><div style={{ fontSize: 11, color: "var(--text2)" }}>{savedInvoice.invoice_number}</div></div>
                </div>
              </button>
              <button onClick={() => downloadDN(dnSaved)} style={{ border: "2px solid #0f172a", borderRadius: "var(--rl)", padding: "14px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", fontFamily: "var(--sans)", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#0f172a", fontSize: 20 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Print Delivery Note</div><div style={{ fontSize: 11, color: "var(--text2)" }}>{dnSaved.dn_number}</div></div>
                </div>
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <button className="btn bo" onClick={() => emailDN(dnSaved)}><i className="ti ti-mail" />Email DN</button>
              <button className="btn bwa" onClick={() => whatsappDN(dnSaved)}><i className="ti ti-brand-whatsapp" />WhatsApp DN</button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn bp" onClick={onClose}><i className="ti ti-check" />Done</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── INVOICE FORM ───────────────────────────────────────────────────────────
  const mobView = isMobile();
  const mobCusts = contacts.filter(c => c.type === "customer" || c.type === "both");
  const mobRecent = products.slice(0, 6);
  const mobFiltered = mobPickerSearch
    ? products.filter(p => p.name.toLowerCase().includes(mobPickerSearch.toLowerCase()) || (p.code||"").toLowerCase().includes(mobPickerSearch.toLowerCase()))
    : mobRecent;
  const mobActiveLines = lines.filter(l => l.description);

  const mobAddProduct = (p) => {
    const idx = lines.findIndex(l => l.product_id === p.id);
    if (idx >= 0) {
      const nxt = [...lines];
      nxt[idx] = { ...nxt[idx], qty: (parseFloat(nxt[idx].qty) || 0) + 1 };
      setLines(nxt);
    } else {
      const nl = { product_id: p.id, description: p.name, qty: 1, unit_price: p.sale_price || 0, vat_rate: p.vat_rate ?? 20 };
      setLines(prev => prev[0]?.description === "" && !prev[0]?.product_id ? [nl] : [...prev, nl]);
    }
    setMobPickerOpen(false);
    setMobPickerSearch("");
  };

  const mobRemoveLine = (i) => setLines(prev => prev.length > 1 ? prev.filter((_, j) => j !== i) : [{ description: "", qty: 1, unit_price: "", vat_rate: 20 }]);
  const mobInc = (i) => { const nxt = [...lines]; nxt[i] = { ...nxt[i], qty: (parseFloat(nxt[i].qty) || 0) + 1 }; setLines(nxt); };
  const mobDec = (i) => { const nxt = [...lines]; const newQty = (parseFloat(nxt[i].qty) || 1) - 1; if (newQty < 1) { mobRemoveLine(i); return; } nxt[i] = { ...nxt[i], qty: newQty }; setLines(nxt); };

  if (mobView) return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"var(--bg)", paddingBottom:160 }}>
      <div style={{ background:"var(--white)", borderBottom:"1px solid var(--border)", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:54, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button style={{ background:"none", border:"none", padding:0, cursor:"pointer", color:"var(--text2)" }} onClick={onClose}><i className="ti ti-arrow-left" style={{ fontSize:20 }} /></button>
          <div><div style={{ fontSize:15, fontWeight:700, color:"var(--text)" }}>New Invoice</div><div style={{ fontSize:11, color:"var(--text3)" }}>{mobActiveLines.length} item{mobActiveLines.length!==1?"s":""}</div></div>
        </div>
        <div style={{ fontSize:16, fontWeight:700, color:"var(--blue)" }}>{fmt(total)}</div>
      </div>

      <div style={{ background:"var(--white)", margin:"12px 12px 0", borderRadius:"var(--rl)", padding:"14px 16px", border:"1px solid var(--border)" }}>
        <div style={{ fontSize:11, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px", marginBottom:8 }}>Customer *</div>
        <SearchDropdown placeholder="Search customers..." items={mobCusts} onSelect={c => setF({ ...f, customer: c.name })} />
        {f.customer && <div style={{ marginTop:8, fontSize:13, fontWeight:600, color:"var(--green)", display:"flex", alignItems:"center", gap:6 }}><span style={{ fontSize:14 }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>{f.customer}</div>}
      </div>

      <div style={{ padding:"12px 12px 0" }}>
        {mobActiveLines.map((l, i) => (
          <div key={i} style={{ background:"var(--white)", borderRadius:"var(--rl)", padding:"14px 16px", marginBottom:10, border:"1px solid var(--border)", boxShadow:"var(--sh)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{l.description}</div>
                <div style={{ fontSize:12, color:"var(--text3)" }}>{fmt(parseFloat(l.unit_price)||0)} each · VAT {l.vat_rate}%</div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"var(--blue)", marginLeft:12 }}>{fmt((parseFloat(l.qty)||0)*(parseFloat(l.unit_price)||0))}</div>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:10, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".5px", display:"block", marginBottom:3 }}>Unit Price £</label>
                <input type="number" step="0.01" min="0" value={l.unit_price} onChange={e => { const nxt=[...lines]; nxt[i]={...nxt[i],unit_price:e.target.value}; setLines(nxt); }} style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid var(--border)", fontSize:14, fontFamily:"var(--sans)", background:"var(--white)", color:"var(--text)" }} />
              </div>
              <div style={{ width:100 }}>
                <label style={{ fontSize:10, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".5px", display:"block", marginBottom:3 }}>VAT Rate</label>
                <select value={l.vat_rate} onChange={e => { const nxt=[...lines]; nxt[i]={...nxt[i],vat_rate:e.target.value}; setLines(nxt); }} style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid var(--border)", fontSize:13, fontFamily:"var(--sans)", background:"var(--white)", color:"var(--text)" }}>
                  <option value="20">20% Std</option>
                  <option value="5">5% Red</option>
                  <option value="0">0% Exempt</option>
                </select>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", background:"var(--bg)", borderRadius:10, border:"1px solid var(--border)", overflow:"hidden" }}>
                <button onClick={() => mobDec(i)} style={{ width:40, height:40, border:"none", background:"none", fontSize:20, cursor:"pointer", color:"var(--text2)", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                <span style={{ minWidth:32, textAlign:"center", fontSize:15, fontWeight:700 }}>{l.qty}</span>
                <button onClick={() => mobInc(i)} style={{ width:40, height:40, border:"none", background:"none", fontSize:20, cursor:"pointer", color:"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
              </div>
              <button onClick={() => mobRemoveLine(i)} style={{ background:"var(--red-lt)", border:"none", borderRadius:8, padding:"8px 14px", color:"var(--red)", fontSize:12, fontWeight:600, cursor:"pointer" }}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:"0 12px" }}>
        <button onClick={() => setMobPickerOpen(true)} style={{ width:"100%", background:"var(--blue)", border:"none", borderRadius:"var(--rl)", padding:"16px", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 4px 14px rgba(37,99,235,.35)" }}>
          <i className="ti ti-plus" style={{ fontSize:20 }} />Add Product
        </button>
      </div>

      <details style={{ margin:"12px 12px 0", background:"var(--white)", borderRadius:"var(--rl)", border:"1px solid var(--border)", overflow:"hidden" }}>
        <summary style={{ padding:"14px 16px", fontSize:13, fontWeight:600, color:"var(--text2)", cursor:"pointer", listStyle:"none", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg></span>Advanced Options
        </summary>
        <div style={{ padding:"0 16px 16px", borderTop:"1px solid var(--border)" }}>
          <div style={{ marginTop:12 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Status</label><select className="il-input" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
          <div style={{ marginTop:10 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Invoice Date</label><input className="il-input" type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
          <div style={{ marginTop:10 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Due Date</label><input className="il-input" type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} /></div>
          <div style={{ marginTop:10 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Notes</label><input className="il-input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Any notes..." /></div>
        </div>
      </details>

      <div style={{ position:"fixed", bottom:76, left:0, right:0, background:"var(--white)", borderTop:"1px solid var(--border)", padding:"12px 16px", zIndex:100, boxShadow:"0 -4px 20px rgba(0,0,0,.08)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:13 }}>
          <span style={{ color:"var(--text2)" }}>{mobActiveLines.length} items · Subtotal {fmt(subtotal)}</span>
          <span style={{ color:"var(--text3)" }}>VAT {fmt(vatTotal)}</span>
        </div>
        <button onClick={save} disabled={saving || !f.customer || !mobActiveLines.length} style={{ width:"100%", background:(!f.customer || !mobActiveLines.length) ? "var(--border2)" : "linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", borderRadius:"var(--rl)", padding:"16px", color:"#fff", fontSize:16, fontWeight:700, cursor:(!f.customer || !mobActiveLines.length) ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span>{saving ? "Creating..." : "Create Invoice"}</span>
          <span style={{ fontSize:18, fontWeight:800 }}>{fmt(total)}</span>
        </button>
      </div>

      {mobPickerOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }} onClick={() => setMobPickerOpen(false)}>
          <div style={{ position:"absolute", inset:0, background:"rgba(10,14,26,.5)", backdropFilter:"blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position:"absolute", bottom:0, left:0, right:0, background:"var(--white)", borderRadius:"20px 20px 0 0", maxHeight:"75vh", display:"flex", flexDirection:"column", boxShadow:"0 -8px 40px rgba(0,0,0,.15)", animation:"slideUp .2s ease" }}>
            <div style={{ padding:"12px 16px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:15, fontWeight:700 }}>Add Product</div>
              <button onClick={() => setMobPickerOpen(false)} style={{ background:"var(--bg)", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div style={{ padding:"10px 16px" }}>
              <input autoFocus value={mobPickerSearch} onChange={e => setMobPickerSearch(e.target.value)} placeholder="Search products..." style={{ width:"100%", padding:"12px 14px", borderRadius:"var(--rl)", border:"1.5px solid var(--blue)", fontSize:14, outline:"none", fontFamily:"var(--sans)", background:"var(--white)" }} />
            </div>
            {!mobPickerSearch && <div style={{ padding:"0 16px 6px", fontSize:11, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px" }}>Recent Products</div>}
            <div style={{ overflowY:"auto", flex:1, padding:"0 12px 16px" }}>
              {mobFiltered.length === 0 && <div style={{ padding:"20px", textAlign:"center", color:"var(--text3)", fontSize:13 }}>No products found</div>}
              {mobFiltered.map(p => {
                const inBasket = lines.find(l => l.product_id === p.id);
                return (
                  <button key={p.id} onClick={() => mobAddProduct(p)} style={{ width:"100%", background: inBasket ? "var(--blue-lt)" : "var(--white)", border: inBasket ? "1.5px solid var(--blue)" : "1px solid var(--border)", borderRadius:"var(--rl)", padding:"14px 16px", marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left", fontFamily:"var(--sans)" }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{p.name}</div>
                      <div style={{ fontSize:12, color:"var(--text3)" }}>{p.code ? `${p.code} · ` : ""}{fmt(p.sale_price||0)} · VAT {p.vat_rate ?? 20}% · Stock: {p.stock_qty}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {inBasket && <span style={{ fontSize:12, fontWeight:700, color:"var(--blue)", background:"var(--blue-lt)", padding:"3px 8px", borderRadius:20 }}>×{inBasket.qty}</span>}
                      <div style={{ width:36, height:36, borderRadius:10, background: inBasket ? "var(--blue)" : "var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <i className="ti ti-plus" style={{ color: inBasket ? "#fff" : "var(--text3)", fontSize:16 }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="card">
      <div className="ch"><div><div className="ct">New VAT Invoice</div><div className="cs">Add line items with VAT rates</div></div><button className="btn bo bsm" onClick={onClose}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Cancel</button></div>
      <div className="fg">
        <div className="fgrp"><label style={{ color: submitted && !f.customer ? "var(--red)" : undefined }}>Customer *</label><SearchDropdown placeholder="Search customers..." items={customers} onSelect={c => setF({ ...f, customer: c.name })} />{submitted && !f.customer && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>Please select a customer</div>}</div>
        <div className="fgrp"><label>Status</label><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
        <div className="fgrp"><label>Invoice Date</label><input type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
        <div className="fgrp"><label>Due Date</label><input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} /></div>
        <div className="fgrp full"><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Any notes for this invoice..." /></div>
      </div>
      <div style={{ borderTop: "0.5px solid var(--border)" }}>
        <div className="il-header">{["Product / Description", "Qty", "Unit Price", "VAT", "Total", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</span>)}</div>
        {lines.map((l, i) => (
          <div key={`${i}-${l.product_id||"empty"}`} className="il-line">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <SearchDropdown key={`line-${i}-${l.product_id||"empty"}`} placeholder="Search products..." items={products} onSelect={p => updateLine(i, "product_id", p.id)} displayKey="name" value={l.description} />
            </div>
            <input type="number" className="il-input mono" value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} />
            <input type="number" className="il-input mono" placeholder="0.00" value={l.unit_price} onChange={e => updateLine(i, "unit_price", e.target.value)} />
            <select className="il-input" value={l.vat_rate} onChange={e => updateLine(i, "vat_rate", e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">Exempt</option></select>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmt((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0))}</span>
            <button className="ib" onClick={() => lines.length > 1 ? setLines(lines.filter((_, j) => j !== i)) : setLines([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        ))}
        <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfc", borderTop: "0.5px solid var(--border)" }}>
          <button className="btn bo bsm" onClick={() => setLines([...lines, { description: "", qty: 1, unit_price: "", vat_rate: 20 }])}><i className="ti ti-plus" />Add Line</button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>Subtotal: {fmt(subtotal)} &nbsp;·&nbsp; VAT: {fmt(vatTotal)}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Total: {fmt(total)}</div>
          </div>
        </div>
      </div>
      <div className="ff">
        <button className="btn bo" onClick={onClose}>Cancel</button>
        <button className="btn bp" onClick={save} disabled={saving || !f.customer}>
          {saving ? <><div className="spin" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />Creating Invoice...</> : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>Create Invoice</>}
        </button>
      </div>
    </div>
  );
}

// ── AGENT DASHBOARD ───────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ AgentDashboard                                             │
// │ Dashboard view for agent role users                        │
// └────────────────────────────────────────────────────────────┘
function AgentDashboard({ invoices, setInvoices, contacts, profile, setPage, token }) {
  const [viewInvoice, setViewInvoice] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState({});
  const [partPayId, setPartPayId] = useState(null);
  const [partPayAmount, setPartPayAmount] = useState({});
  const myInv = invoices.filter(i => i.created_by === profile?.id);
  const myPaid = myInv.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const myPending = myInv.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const myOverdue = myInv.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const myCusts = contacts.filter(c => c.created_by === profile?.id);
  const name = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const markPaid = async (id, method) => {
    const inv = invoices.find(i => i.id === id);
    await sb.patch(token, "invoices", id, { status: "paid", payment_method: method || "cash", amount_paid: inv?.amount || 0, balance: 0 });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: method || "cash", amount_paid: i.amount, balance: 0 } : i));
    setPayingId(null);
    if (inv) logAudit(token, userId, "payment_received", "invoice", id, `${inv.invoice_number} marked paid via ${method||"cash"} — £${inv.amount}`);
  };

  const recordPartPayment = async (inv, amount) => {
    const paid = parseFloat(amount);
    if (!paid || paid <= 0 || paid > 999999) { toast.warn("Enter a valid amount between £0.01 and £999,999."); return; }
    const prevPaid = parseFloat(inv.amount_paid || 0);
    const totalPaid = prevPaid + paid;
    const balance = parseFloat(inv.amount) - totalPaid;
    const newStatus = balance <= 0 ? "paid" : "partial";
    await sb.patch(token, "invoices", inv.id, { amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus, payment_method: payMethod[inv.id] || "cash" });
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus } : i));
    setPartPayId(null);
    setPartPayAmount({});
  };
  return (
    <div>
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} contacts={contacts} onPartPay={recordPartPayment} />}
      <div className="welcome-row">
        <div><div className="welcome-h">{greeting}, {name} 👋</div><div className="welcome-sub"><span className="trend-pill">Your personal dashboard</span></div></div>
        <div className="quick-actions">
          <div className="qa-btn" onClick={() => setPage("invoices")}><i className="ti ti-plus" />New Invoice</div>
          <div className="qa-btn" onClick={() => setPage("contacts")}><i className="ti ti-user-plus" />Add Customer</div>
        </div>
      </div>
      <div className="kgrid">
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--blue-lt)" }}><span style={{ color: "var(--blue)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span></div><span className="kpi-badge" style={{ background: "var(--blue-lt)", color: "#1e40af" }}>{myInv.length} total</span></div><div className="kpi-val">{myInv.length}</div><div className="kpi-label">My Invoices</div></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--green-lt)" }}><span style={{ color: "var(--green)" }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span></div><span className="kpi-badge" style={{ background: "var(--green-lt)", color: "var(--green-dk)" }}>Paid</span></div><div className="kpi-val" style={{ color: "var(--green)" }}>{fmt(myPaid)}</div><div className="kpi-label">Total Sales</div></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--amber-lt)" }}><span style={{ color: "var(--amber)" }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span></div><span className="kpi-badge" style={{ background: "var(--amber-lt)", color: "var(--amber-dk)" }}>Pending</span></div><div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(myPending)}</div><div className="kpi-label">Awaiting Payment</div></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--purple-lt)" }}><span style={{ color: "var(--purple)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></div><span className="kpi-badge" style={{ background: "var(--purple-lt)", color: "var(--purple-dk)" }}>{myCusts.length}</span></div><div className="kpi-val" style={{ color: "var(--purple)" }}>{myCusts.length}</div><div className="kpi-label">My Customers</div></div>
      </div>
      {myOverdue > 0 && <div style={{ background: "var(--red-lt)", border: "0.5px solid #fca5a5", borderRadius: "var(--rl)", padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-alert-triangle" style={{ color: "#fff", fontSize: 20 }} /></div><div><div style={{ fontWeight: 600, color: "var(--red-dk)", marginBottom: 2 }}>Overdue invoices: {fmt(myOverdue)}</div><div style={{ fontSize: 12, color: "var(--red-dk)", opacity: 0.7 }}>Please follow up with your customers</div></div></div>}
      <div className="card">
        <div className="ch"><div className="ct">My Recent Invoices</div><button className="btn bo bsm" onClick={() => setPage("invoices")}><i className="ti ti-arrow-right" />View all</button></div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Customer</th><th>Invoice #</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {myInv.slice(0, 8).map(inv => (
            <tr key={inv.id}>
              <td style={{ fontWeight: 500 }}>{inv.customer}</td>
              <td className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{inv.invoice_number}</td>
              <td className="mono">{fmt(inv.amount)}{inv.status === "partial" && inv.balance > 0 && <div style={{ fontSize:10, color:"var(--orange)", fontWeight:600 }}>Bal: {fmt(inv.balance)}</div>}</td>
              <td><div style={{ display: "flex", flexDirection: "column", gap: 3 }}><span className={"badge " + (inv.status === "paid" ? "b-green" : inv.status === "overdue" ? "b-red" : inv.status === "pending" ? "b-amber" : "b-gray")}>{inv.status}</span>{inv.payment_method && <span style={{ fontSize: 10, color: "var(--text3)" }}>{inv.payment_method === "cash" ? "💵" : inv.payment_method === "bank" ? "🏦" : inv.payment_method === "card" ? "💳" : "📝"} {inv.payment_method}</span>}</div></td>
              <td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="btn bo bsm" onClick={() => setViewInvoice(inv)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>View</button>
                {inv.status !== "paid" && (payingId === inv.id ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <select style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "4px 8px", fontSize: 11, outline: "none" }} value={payMethod[inv.id] || "cash"} onChange={e => setPayMethod(prev => ({ ...prev, [inv.id]: e.target.value }))}>
                      <option value="cash">💵 Cash</option><option value="bank">🏦 Bank</option><option value="card">💳 Card</option><option value="cheque">📝 Cheque</option>
                    </select>
                    <button className="btn bp bsm" onClick={() => markPaid(inv.id, payMethod[inv.id] || "cash")}>✓</button>
                    <button className="btn bo bsm" onClick={() => setPayingId(null)}>✕</button>
                  </div>
                ) : (
                    <button className="btn bp bsm" onClick={() => setPayingId(inv.id)}>Mark Paid</button>
                  )
                )}
              </div></td>
            </tr>
          ))}
          {myInv.length === 0 && <tr><td colSpan={5} className="empty">No invoices yet — create your first one!</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Dashboard                                                  │
// │ Admin dashboard with KPIs, charts and AI insights          │
// └────────────────────────────────────────────────────────────┘
function Dashboard({ accounts, invoices, setInvoices, contacts, products, profile, setPage, allProfiles, token }) {
  const isAdmin = profile?.role === "admin";
  if (!isAdmin) return <AgentDashboard invoices={invoices} setInvoices={setInvoices} contacts={contacts} profile={profile} setPage={setPage} token={token} />;

  // ── Computed metrics ──
  const revenue = accounts.filter(a => a.type === "Revenue").reduce((s, a) => s + a.balance, 0);
  const expenses = accounts.filter(a => a.type === "Expense").reduce((s, a) => s + a.balance, 0);
  const cash = accounts.find(a => a.code === "1000")?.balance || 0;
  const net = revenue - expenses;
  const unpaid = invoices.filter(i => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  
  // Trend calculations — compare last 30 days vs previous 30 days
  const now = new Date();
  const d30 = new Date(now - 30*24*60*60*1000);
  const d60 = new Date(now - 60*24*60*60*1000);
  const last30Paid = invoices.filter(i => i.status==="paid" && new Date(i.invoice_date) >= d30).reduce((s,i)=>s+i.amount,0);
  const prev30Paid = invoices.filter(i => i.status==="paid" && new Date(i.invoice_date) >= d60 && new Date(i.invoice_date) < d30).reduce((s,i)=>s+i.amount,0);
  const last30Inv = invoices.filter(i => new Date(i.invoice_date||i.created_at) >= d30).length;
  const prev30Inv = invoices.filter(i => new Date(i.invoice_date||i.created_at) >= d60 && new Date(i.invoice_date||i.created_at) < d30).length;
  const trendPct = (curr, prev) => prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);
  const revTrend = trendPct(last30Paid, prev30Paid);
  const invTrend = trendPct(last30Inv, prev30Inv);
  const TrendBadge = ({ pct }) => {
    if (pct === null) return null;
    const up = pct >= 0;
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:2, fontSize:11, fontWeight:600, color: up ? "var(--green)" : "var(--red)", background: up ? "var(--green-lt)" : "var(--red-lt)", padding:"2px 6px", borderRadius:10 }}>
        <i className={`ti ${up ? "ti-trending-up" : "ti-trending-down"}`} style={{ fontSize:11 }} />
        {Math.abs(pct)}%
      </span>
    );
  };
  const paidCount = invoices.filter(i => i.status === "paid").length;
  const pendingCount = invoices.filter(i => i.status === "pending").length;
  const overdueCount = invoices.filter(i => i.status === "overdue").length;
  const lowStock = products.filter(p => p.stock_qty <= (p.reorder_level || DEFAULT_REORDER));
  const customers = contacts.filter(c => c.type === "customer" || c.type === "both");
  const name = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const maxAgentSales = Math.max(...allProfiles.map(a => invoices.filter(i => i.created_by === a.id).reduce((s, i) => s + i.amount, 0)), 1);
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRevenue = invoices.filter(i => i.status === "paid" && i.invoice_date === todayStr).reduce((s, i) => s + i.amount, 0);
  const avgInvoice = paidCount > 0 ? paid / paidCount : 0;

  // ── Drill-down modal state ──
  const [drill, setDrill] = useState(null); // { title, rows, cols, summary }

  const openDrill = (title, rows, cols, summary) => setDrill({ title, rows, cols, summary });

  const drillRevenue = () => openDrill("Total Revenue", accounts.filter(a => a.type === "Revenue").map(a => ({ name: a.name, code: a.code, value: fmt(a.balance) })), ["Account", "Code", "Balance"], `Total: ${fmt(revenue)} from ${accounts.filter(a => a.type==="Revenue").length} revenue accounts`);
  const drillPaid = () => openDrill("Collected Revenue — Paid Invoices", invoices.filter(i => i.status === "paid").map(i => ({ name: i.customer, code: i.invoice_number, value: fmt(i.amount), extra: fmtDate(i.invoice_date) })), ["Customer", "Invoice", "Amount", "Date"], `${paidCount} paid invoices · Total: ${fmt(paid)}`);
  const drillOutstanding = () => openDrill("Outstanding Invoices", invoices.filter(i => i.status !== "paid" && i.status !== "draft").map(i => ({ name: i.customer, code: i.invoice_number, value: fmt(i.amount), extra: i.status })), ["Customer", "Invoice", "Amount", "Status"], `${pendingCount + overdueCount} open invoices · Total owed: ${fmt(unpaid)}`);
  const drillNet = () => openDrill("Net Position Breakdown", [...accounts.filter(a => a.type === "Revenue").map(a => ({ name: a.name, code: "Revenue", value: fmt(a.balance), extra: "+" })), ...accounts.filter(a => a.type === "Expense").map(a => ({ name: a.name, code: "Expense", value: fmt(a.balance), extra: "-" }))], ["Account", "Type", "Amount", ""], `Revenue: ${fmt(revenue)} · Expenses: ${fmt(expenses)} · Net: ${fmt(net)}`);
  const drillCustomers = () => openDrill("All Customers", customers.map(c => ({ name: c.name, code: c.type, value: c.phone || "—", extra: c.email || "—" })), ["Name", "Type", "Phone", "Email"], `${customers.length} customers`);
  const drillProducts = () => openDrill("All Products", products.map(p => ({ name: p.name, code: p.stock_qty + " " + (p.unit||"units"), value: fmt(p.sale_price||0), extra: p.stock_qty <= (p.reorder_level || DEFAULT_REORDER) ? "⚠ Low" : "✓ OK" })), ["Product", "Stock", "Price", "Status"], `${products.length} products`);
  const drillLowStock = () => openDrill("Low Stock Alerts", lowStock.map(p => ({ name: p.name, code: p.stock_qty + " " + (p.unit||"units"), value: fmt(p.sale_price||0), extra: "Reorder: " + (p.reorder_level||5) })), ["Product", "Current Stock", "Price", "Reorder Level"], `${lowStock.length} products need restocking`);
  const drillCash = () => openDrill("Cash & Bank Accounts", accounts.filter(a => a.type === "Asset").map(a => ({ name: a.name, code: a.code, value: fmt(a.balance), extra: a.type })), ["Account", "Code", "Balance", "Type"], `Total cash: ${fmt(cash)}`);
  const drillToday = () => openDrill("Today's Sales", invoices.filter(i => i.status === "paid" && i.invoice_date === todayStr).map(i => ({ name: i.customer, code: i.invoice_number, value: fmt(i.amount), extra: i.payment_method || "—" })), ["Customer", "Invoice", "Amount", "Method"], `${invoices.filter(i => i.status==="paid" && i.invoice_date===todayStr).length} sales today · Total: ${fmt(todayRevenue)}`);

  // ── AI Insights ──
  const insights = [
    overdueCount > 0 && { icon: "ti-alert-circle", color: "var(--red)", bg: "var(--red-lt)", text: `${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} totalling ${fmt(overdue)} — chase now` },
    lowStock.length > 0 && { icon: "ti-package-off", color: "var(--amber)", bg: "var(--amber-lt)", text: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} running low on stock — reorder soon` },
    pendingCount > 0 && { icon: "ti-clock", color: "var(--blue)", bg: "var(--blue-lt)", text: `${pendingCount} pending invoice${pendingCount > 1 ? "s" : ""} worth ${fmt(unpaid - overdue)} awaiting payment` },
    paidCount > 0 && { icon: "ti-trending-up", color: "var(--green)", bg: "var(--green-lt)", text: `Average invoice value is ${fmt(avgInvoice)} — top performer this period` },
  ].filter(Boolean).slice(0, 3);

  return (
    <div>
      {/* ── Drill-down Modal ── */}
      {drill && (
        <ModalPortal><div className="modal-overlay" onClick={() => setDrill(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{drill.title}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{drill.summary}</div>
              </div>
              <button className="btn bo bsm" onClick={() => setDrill(null)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="tw" style={{ maxHeight: 420, overflowY: "auto" }}>
              <table>
                <thead><tr>{drill.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {drill.rows.length === 0 && <tr><td colSpan={drill.cols.length} className="empty">No data</td></tr>}
                  {drill.rows.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{row.name}</td>
                      {row.code !== undefined && <td style={{ color: "var(--text2)", fontSize: 12 }}>{row.code}</td>}
                      {row.value !== undefined && <td className="mono" style={{ fontWeight: 600 }}>{row.value}</td>}
                      {row.extra !== undefined && <td style={{ fontSize: 12, color: row.extra === "⚠ Low" ? "var(--red)" : row.extra?.startsWith("✓") ? "var(--green)" : "var(--text2)" }}>{row.extra}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.5px", color: "var(--text)", marginBottom: 4 }}>{greeting}, {name} 👋</div>
          <div style={{ fontSize: 13, color: "var(--text2)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ background: "var(--green-lt)", color: "var(--green-dk)", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>● Live</span>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="qa-btn" onClick={() => setPage("invoices")}><i className="ti ti-plus" />New Invoice</button>
          <button className="qa-btn" onClick={() => setPage("contacts")}><i className="ti ti-user-plus" />Add Customer</button>
          <button className="qa-btn" onClick={() => setPage("delivery-notes")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Delivery</button>
          <button className="qa-btn primary" onClick={() => setPage("analytics")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Analytics</button>
        </div>
      </div>

      {/* ── AI Insights strip ── */}
      {insights.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {insights.map((ins, i) => (
            <div key={i} onClick={() => i === 0 ? drillOutstanding() : i === 1 ? drillLowStock() : drillOutstanding()} style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 10, background: ins.bg, border: `1px solid ${ins.color}22`, borderRadius: "var(--rl)", padding: "11px 14px", cursor: "pointer", transition: "opacity .15s" }} onMouseEnter={e => e.currentTarget.style.opacity=".85"} onMouseLeave={e => e.currentTarget.style.opacity="1"}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: ins.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${ins.icon}`} style={{ color: ins.color, fontSize: 16 }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4, fontWeight: 500 }}>{ins.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Row 1 ── */}
      <div className="kgrid" style={{ marginBottom: 14 }}>
        {/* Revenue */}
        <div className="kpi" style={{ "--kpi-accent": "var(--blue)" }} onClick={drillRevenue}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: "var(--blue-lt)" }}><span style={{ color: "var(--blue)" }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 7a4 4 0 0 0-8 0v9"/><path d="M6 17h12"/><path d="M6 13h8"/></svg></span></div>
            <span className="kpi-badge" style={{ background: "var(--blue-lt)", color: "#1e40af" }}>Total</span>
          </div>
          <div className="kpi-val">{fmt(paid + unpaid)}</div>
          <div className="kpi-label">Total Revenue</div>
          <svg className="spark" viewBox="0 0 120 40">
            <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".3"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0"/></linearGradient></defs>
            <polygon points="0,32 20,26 40,28 60,18 80,20 100,12 120,8 120,40 0,40" fill="url(#g1)" />
            <polyline points="0,32 20,26 40,28 60,18 80,20 100,12 120,8" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        {/* Paid */}
        <div className="kpi" style={{ "--kpi-accent": "var(--green)" }} onClick={drillPaid}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: "var(--green-lt)" }}><span style={{ color: "var(--green)" }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span></div>
            <span className="kpi-badge" style={{ background: "var(--green-lt)", color: "var(--green-dk)" }}>{paidCount} invoices</span>
          </div>
          <div className="kpi-val tg">{fmt(paid)}</div>
          <div className="kpi-label" style={{ display:"flex", alignItems:"center", gap:6 }}>Collected Revenue <TrendBadge pct={revTrend} /></div>
          <svg className="spark" viewBox="0 0 120 40">
            <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".3"/><stop offset="100%" stopColor="#10b981" stopOpacity="0"/></linearGradient></defs>
            <polygon points="0,34 20,28 40,22 60,20 80,14 100,10 120,6 120,40 0,40" fill="url(#g2)" />
            <polyline points="0,34 20,28 40,22 60,20 80,14 100,10 120,6" fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        {/* Outstanding */}
        <div className="kpi" style={{ "--kpi-accent": "var(--amber)" }} onClick={drillOutstanding}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: "var(--amber-lt)" }}><span style={{ color: "var(--amber)" }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span></div>
            <span className="kpi-badge" style={{ background: "var(--amber-lt)", color: "var(--amber-dk)" }}>{pendingCount + overdueCount} open</span>
          </div>
          <div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(unpaid)}</div>
          <div className="kpi-label" style={{ display:"flex", alignItems:"center", gap:6 }}>Outstanding <TrendBadge pct={invTrend} /></div>
          <div style={{ marginTop: 8, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", display: "flex" }}>
              <div style={{ width: `${overdue / (unpaid || 1) * 100}%`, background: "var(--red)", transition: "width .5s" }} />
              <div style={{ flex: 1, background: "var(--amber)", opacity: 0.6 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 600 }}>↑ {fmt(overdue)} overdue</div>
          </div>
        </div>
        {/* Net Profit */}
        <div className="kpi" style={{ "--kpi-accent": paid >= 0 ? "var(--green)" : "var(--red)" }} onClick={drillNet}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: paid >= 0 ? "var(--green-lt)" : "var(--red-lt)" }}><span style={{ color: paid >= 0 ? "var(--green)" : "var(--red)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></span></div>
            <span className="kpi-badge" style={{ background: paid >= 0 ? "var(--green-lt)" : "var(--red-lt)", color: paid >= 0 ? "var(--green-dk)" : "var(--red-dk)" }}>Profit</span>
          </div>
          <div className="kpi-val" style={{ color: "var(--green)" }}>{fmt(paid)}</div>
          <div className="kpi-label">Net Position</div>
          <svg className="spark" viewBox="0 0 120 40">
            <defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity=".3"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/></linearGradient></defs>
            <polygon points="0,20 20,18 40,22 60,16 80,18 100,14 120,16 120,40 0,40" fill="url(#g3)" />
            <polyline points="0,20 20,18 40,22 60,16 80,18 100,14 120,16" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ── Stat pills row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }} className="stat-pills-grid">
        {[
          { label: "Customers", val: customers.length, icon: "ti-users", color: "var(--blue)", onClick: drillCustomers },
          { label: "Products", val: products.length, icon: "ti-package", color: "var(--purple)", onClick: drillProducts },
          { label: "Low Stock", val: lowStock.length, icon: "ti-alert-triangle", color: lowStock.length > 0 ? "var(--red)" : "var(--green)", onClick: drillLowStock },
          { label: "Cash", val: fmt(cash), icon: "ti-building-bank", color: "var(--green)", onClick: drillCash },
          { label: "Today's Sales", val: fmt(todayRevenue), icon: "ti-sun", color: "var(--amber)", onClick: drillToday },
        ].map(s => (
          <div key={s.label} onClick={s.onClick} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "14px 16px", boxShadow: "var(--sh)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor="var(--blue)"; e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="var(--sh2)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="var(--sh)"; }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px" }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue Chart Widget ── */}
      {(() => {
        const months = Array.from({length:6},(_,i)=>{
          const d = new Date(new Date().getFullYear(), new Date().getMonth()-5+i, 1);
          const lbl = d.toLocaleDateString("en-GB",{month:"short"});
          const mPaid = invoices.filter(inv=>{
            const id = new Date(inv.invoice_date||inv.created_at);
            return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear()&&inv.status==="paid";
          }).reduce((s,i)=>s+i.amount,0);
          const mPending = invoices.filter(inv=>{
            const id = new Date(inv.invoice_date||inv.created_at);
            return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear()&&inv.status!=="paid";
          }).reduce((s,i)=>s+i.amount,0);
          return {lbl, paid: mPaid, pending: mPending};
        });
        const maxVal = Math.max(...months.map(m=>Math.max(m.paid,m.pending)),1);
        const H = 100;
        const W = 100/months.length;
        const paidPts = months.map((m,i)=>`${i*(W)+W/2},${H-(m.paid/maxVal*H)}`).join(" ");
        const pendPts = months.map((m,i)=>`${i*(W)+W/2},${H-(m.pending/maxVal*H)}`).join(" ");
        const totalPaid6 = months.reduce((s,m)=>s+m.paid,0);
        const totalPend6 = months.reduce((s,m)=>s+m.pending,0);
        const bestMonth = months.reduce((a,b)=>b.paid>a.paid?b:a,months[0]);
        return (
          <div className="card" style={{marginBottom:18}}>
            <div className="ch">
              <div>
                <div className="ct">Revenue Overview</div>
                <div className="cs">6-month performance · {new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</div>
              </div>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:"#2563eb"}} />Collected
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:"#f59e0b",opacity: 0.6}} />Pending
                </div>
                <button className="btn bo bsm" onClick={()=>setPage("admin-reports")}><i className="ti ti-arrow-right"/>Reports</button>
              </div>
            </div>
            <div style={{padding:"20px 24px"}}>
              {/* SVG Chart */}
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:8,alignItems:"stretch"}}>
                {/* Y-axis labels */}
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",paddingBottom:24,height:140}}>
                  {[maxVal, Math.round(maxVal*75/100), Math.round(maxVal*50/100), Math.round(maxVal*25/100), 0].map((v,i)=>(
                    <div key={i} style={{fontSize:9,color:"var(--text3)",textAlign:"right",lineHeight:1}}>{v>0?fmt(v).replace("£","£"):"£0"}</div>
                  ))}
                </div>
                {/* Chart area */}
                <div style={{position:"relative"}}>
                  <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{width:"100%",height:120,display:"block"}}>
                    <defs>
                      <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity=".25"/>
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="pendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity=".15"/>
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[0,25,50,75,100].map(y=>(
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border)" strokeWidth="0.3" vectorEffect="non-scaling-stroke"/>
                    ))}
                    {/* Pending area */}
                    <polygon points={`0,${H} ${pendPts} 100,${H}`} fill="url(#pendGrad)"/>
                    <polyline points={pendPts} fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" vectorEffect="non-scaling-stroke"/>
                    {/* Paid area */}
                    <polygon points={`0,${H} ${paidPts} 100,${H}`} fill="url(#paidGrad)"/>
                    <polyline points={paidPts} fill="none" stroke="#2563eb" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
                    {/* Data dots */}
                    {months.map((m,i)=>(
                      <circle key={i} cx={i*W+W/2} cy={H-(m.paid/maxVal*H)} r="1.2" fill="#2563eb" vectorEffect="non-scaling-stroke"/>
                    ))}
                  </svg>
                  {/* X-axis labels */}
                  <div style={{display:"flex",justifyContent:"space-around",marginTop:4}}>
                    {months.map(m=><div key={m.lbl} style={{fontSize:10,color:"var(--text3)",textAlign:"center"}}>{m.lbl}</div>)}
                  </div>
                </div>
              </div>
              {/* Summary stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginTop:16,paddingTop:16,borderTop:"1px solid var(--border)"}}>
                <div>
                  <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:3}}>6-Month Collected</div>
                  <div style={{fontSize:18,fontWeight:700,color:"var(--green)"}}>{fmt(totalPaid6)}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:3}}>6-Month Pending</div>
                  <div style={{fontSize:18,fontWeight:700,color:"var(--amber)"}}>{fmt(totalPend6)}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:3}}>Best Month</div>
                  <div style={{fontSize:18,fontWeight:700,color:"var(--blue)"}}>{bestMonth?.lbl} · {fmt(bestMonth?.paid||0)}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Main content: Invoices + Activity ── */}
      <div className="g23" style={{ marginBottom: 0 }}>
        {/* Recent invoices */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="ch">
            <div><div className="ct">Recent Invoices</div><div className="cs">{invoices.length} total · {paidCount} paid · {pendingCount} pending</div></div>
            <button className="btn bo bsm" onClick={() => setPage("invoices")}><i className="ti ti-arrow-right" />View all</button>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Customer</th><th className="hm">Invoice</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.slice(0, 8).map(inv => (
                  <tr key={inv.id} style={{ cursor: "pointer" }} onClick={() => setViewInvoice(inv)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div className="c-av" style={{ background: ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][inv.customer?.charCodeAt(0) % 5] || "#6366f1", width: 28, height: 28, fontSize: 11 }}>{inv.customer?.[0]?.toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.customer}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{fmtDate(inv.invoice_date)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hm" style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>{inv.invoice_number}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{fmt(inv.amount)}</td>
                    <td>
                      <span className={"badge " + (inv.status === "paid" ? "b-green" : inv.status === "overdue" ? "b-red" : inv.status === "pending" ? "b-amber" : "b-gray")}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={4} className="empty">No invoices yet — create your first one</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity + Quick stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Revenue breakdown mini card */}
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "16px 18px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Revenue Breakdown</div>
            {[
              { label: "Collected", val: paid, total: revenue, color: "var(--green)", onClick: drillPaid },
              { label: "Pending", val: unpaid - overdue, total: revenue, color: "var(--amber)", onClick: drillOutstanding },
              { label: "Overdue", val: overdue, total: revenue, color: "var(--red)", onClick: drillOutstanding },
            ].map(r => (
              <div key={r.label} onClick={r.onClick} style={{ marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.color }}>{fmt(r.val)}</span>
                </div>
                <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(r.val / (revenue || 1) * 100, 100)}%`, background: r.color, borderRadius: 3, transition: "width .6s var(--ease)" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Activity feed */}
          <div className="card" style={{ marginBottom: 0, flex: 1 }}>
            <div className="ch"><div className="ct">Activity Feed</div><div className="cs">Latest events</div></div>
            {[
              ...invoices.slice(0, 4).map(inv => ({
                key: inv.id, type: inv.status === "paid" ? "paid" : "invoice",
                icon: inv.status === "paid" ? "ti-circle-check" : "ti-file-invoice",
                color: inv.status === "paid" ? "var(--green)" : "var(--blue)",
                bg: inv.status === "paid" ? "var(--green-lt)" : "var(--blue-lt)",
                title: inv.status === "paid" ? "Payment received" : "Invoice created",
                sub: `${inv.customer} · ${inv.invoice_number}`,
                amt: fmt(inv.amount), amtColor: inv.status === "paid" ? "var(--green)" : "var(--text2)"
              })),
              ...lowStock.slice(0, 2).map(p => ({
                key: p.id, type: "stock",
                icon: "ti-alert-triangle", color: "var(--amber)", bg: "var(--amber-lt)",
                title: "Low stock alert",
                sub: `${p.name} · ${p.stock_qty} ${p.unit || "units"} remaining`,
                amt: null
              }))
            ].slice(0, 5).map(item => (
              <div key={item.key} className="act-item">
                <div className="act-icon" style={{ background: item.bg }}>
                  <i className={`ti ${item.icon}`} style={{ color: item.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="act-title">{item.title}</div>
                  <div className="act-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</div>
                </div>
                {item.amt && <span className="act-amt" style={{ color: item.amtColor }}>{item.amt}</span>}
              </div>
            ))}
            {invoices.length === 0 && lowStock.length === 0 && <div className="empty">No recent activity</div>}
          </div>
        </div>
      </div>

      {/* ── Agent Leaderboard ── */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="ch">
          <div><div className="ct">🏆 Agent Leaderboard</div><div className="cs">Ranked by total sales value</div></div>
          <button className="btn bo bsm" onClick={() => setPage("agent-report")}><i className="ti ti-arrow-right" />Full report</button>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>#</th><th>Agent</th><th className="hm">Invoices</th><th>Total Sales</th><th className="hm">Paid</th><th>Performance</th></tr></thead>
            <tbody>
              {[...allProfiles].sort((a, b) =>
                invoices.filter(i => i.created_by === b.id).reduce((s, i) => s + i.amount, 0) -
                invoices.filter(i => i.created_by === a.id).reduce((s, i) => s + i.amount, 0)
              ).map((agent, i) => {
                const agentInv = invoices.filter(inv => inv.created_by === agent.id);
                const agentTotal = agentInv.reduce((s, inv) => s + inv.amount, 0);
                const agentPaid = agentInv.filter(inv => inv.status === "paid").reduce((s, inv) => s + inv.amount, 0);
                const pct = Math.round(agentTotal / maxAgentSales * 100);
                const medals = ["🥇","🥈","🥉"];
                const colors = ["#f59e0b","#9ca3af","#cd7f32"];
                return (
                  <tr key={agent.id}>
                    <td><span style={{ fontSize: i < 3 ? 18 : 13, fontWeight: 700, color: colors[i] || "var(--text3)" }}>{medals[i] || i + 1}</span></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][i % 5]},${["#8b5cf6","#34d399","#fbbf24","#a78bfa","#f87171"][i % 5]})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{(agent.full_name || "U")[0].toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{agent.full_name || "Unknown"}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "capitalize" }}>{agent.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hm mono" style={{ color: "var(--text2)" }}>{agentInv.length}</td>
                    <td className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(agentTotal)}</td>
                    <td className="hm mono" style={{ color: "var(--text2)" }}>{fmt(agentPaid)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", minWidth: 60 }}>
                          <div style={{ width: pct + "%", height: "100%", background: i === 0 ? "var(--blue)" : "var(--border2)", borderRadius: 3, transition: "width .6s var(--ease)" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text3)", minWidth: 30, fontWeight: 600 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {allProfiles.length === 0 && <tr><td colSpan={6} className="empty">No agents yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── INVOICES ──────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Invoices                                                   │
// │ Invoice list — filter, sort, mark paid, part pay, edit     │
// └────────────────────────────────────────────────────────────┘
function Invoices({ invoices, setInvoices, contacts, products, token, userId, profile, pendingInvoiceView, onClearPending }) {
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [viewMode, setViewMode] = useState("table"); // table | card
  const [editInvoice, setEditInvoice] = useState(null);
  const [partPayId, setPartPayId] = useState(null);
  const [partPayAmount, setPartPayAmount] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)));

  const bulkMarkPaid = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    for (const id of selectedIds) {
      await sb.patch(token, "invoices", id, { status: "paid", payment_method: "cash" });
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: "cash" } : i));
    }
    logAudit(token, userId, "bulk_paid", "invoice", null, `${selectedIds.size} invoices marked paid in bulk`);
    toast.success(`${selectedIds.size} invoice${selectedIds.size > 1 ? "s" : ""} marked as paid`);
    setSelectedIds(new Set());
    setBulkLoading(false);
  };

  const bulkSendReminder = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    let sent = 0;
    for (const id of selectedIds) {
      const inv = invoices.find(i => i.id === id);
      if (!inv) continue;
      const cust = contacts.find(c => c.name === inv.customer);
      if (!cust?.email) continue;
      const balance = inv.balance > 0 ? inv.balance : inv.amount;
      const html = buildReminderEmailHtml(inv, balance);
      const result = await sendEmail({ to: cust.email, subject: `Payment Reminder — ${inv.invoice_number} — ${COMPANY.name}`, html });
      if (result.success) {
        sent++;
        logAudit(token, userId, "reminder_sent", "invoice", id, `Reminder sent to ${cust.email} for ${inv.invoice_number}`);
      }
    }
    toast.success(`Reminder sent to ${sent} customer${sent > 1 ? "s" : ""}`);
    setSelectedIds(new Set());
    setBulkLoading(false);
  };

  useEffect(() => {
    if (pendingInvoiceView) { setViewInvoice(pendingInvoiceView); onClearPending && onClearPending(); }
  }, [pendingInvoiceView]);

  const markPaid = async (id, method) => {
    await sb.patch(token, "invoices", id, { status: "paid", payment_method: method || "cash" });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: method || "cash" } : i));
    toast.success("Invoice marked as paid");
    const inv = invoices.find(i => i.id === id);
    if (inv) logAudit(token, userId, "payment_received", "invoice", id, `${inv.invoice_number} marked paid via ${method||"cash"} — ${new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(inv.amount)}`);
    setPayingId(null); setPayMethod(prev => ({ ...prev, [id]: "" }));
  };

  const deleteInvoice = async (inv) => {
    if (!confirm(`Delete ${inv.invoice_number} (${fmt(inv.amount)}) for ${inv.customer}?\n\nThis cannot be undone.`)) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${inv.id}`, { method: "DELETE", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
    if (res.ok || res.status === 204) {
      setInvoices(prev => prev.filter(i => i.id !== inv.id));
      toast.success(`${inv.invoice_number} deleted`);
      logAudit(token, userId, "invoice_deleted", "invoice", inv.id, `${inv.invoice_number} deleted — ${fmt(inv.amount)}`);
    } else { toast.error("Failed to delete invoice"); }
  };

  const recordPartPayment = async (inv, amount) => {
    const paid = parseFloat(amount);
    if (!paid || paid <= 0 || paid > 999999) { toast.warn("Enter a valid amount between £0.01 and £999,999."); return; }
    const prevPaid = parseFloat(inv.amount_paid || 0);
    const totalPaid = prevPaid + paid;
    const balance = parseFloat(inv.amount) - totalPaid;
    const newStatus = balance <= 0 ? "paid" : "partial";
    await sb.patch(token, "invoices", inv.id, { amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus, payment_method: payMethod[inv.id] || "cash" });
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus } : i));
    setPartPayId(null);
    setPartPayAmount({});
  };

  // Generate and download a delivery note from any invoice
  const printDNFromInvoice = (inv) => {
    const rawLines = (() => { try { return inv.lines ? (typeof inv.lines === "string" ? JSON.parse(inv.lines) : inv.lines) : null; } catch(e) { return null; } })();
    const invLines = (Array.isArray(rawLines) && rawLines.length > 0) ? rawLines : [{ description: inv.description || "See invoice", qty: 1, unit: "unit" }];
    const dnLines = invLines.filter(l => l.description && l.description.trim() !== "").map(l => ({
      description: l.description, qty: l.qty, unit: l.unit || "unit"
    }));
    const cust = contacts.find(c => c.name === inv.customer);
    const address = [cust?.address, cust?.city, cust?.postcode].filter(Boolean).join(", ");
    const dn_number = `DN-${inv.invoice_number.replace("INV-", "")}`;
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${dn_number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#ffffff}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#0a0f1e;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{max-width:780px;margin:0 auto;padding:32px 36px}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:3px solid #1e1b4b;margin-bottom:28px}.logo-wrap img{height:52px;object-fit:contain}.co-detail{font-size:10px;color:#64748b;line-height:1.8;margin-top:8px}.doc-title{font-size:42px;font-weight:900;color:#e8edf4;letter-spacing:-2px;line-height:1}.doc-num{font-size:18px;font-weight:800;color:#1e1b4b;margin-top:4px}.inv-badge{display:inline-block;margin-top:6px;padding:3px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;font-weight:600;color:#64748b}.status-pill{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe}.meta-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:16px;margin-bottom:28px}.meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}.meta-box.dark{background:#1e1b4b;border-color:#1e1b4b}.meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}.meta-lbl.light{color:rgba(255,255,255,.45)}.meta-val{font-size:14px;font-weight:700;color:#0a0f1e}.meta-val.large{font-size:20px}.meta-val.light{color:#fff}.meta-val.addr{font-size:12px;font-weight:500;color:rgba(255,255,255,.55);margin-top:4px;line-height:1.6}.meta-sub{display:grid;grid-template-columns:1fr 1fr;gap:10px}.table-wrap{margin-bottom:28px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}table{width:100%;border-collapse:collapse}thead tr{background:#1e1b4b}th{padding:12px 16px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#fff;text-align:left}th.c{text-align:center}td{padding:13px 16px;font-size:13px;border-bottom:1px solid #f1f5f9}tr:last-child td{border-bottom:none}tr:nth-child(even) td{background:#fafbfd}.td-desc{font-weight:600}.td-unit{color:#94a3b8;font-size:11px}.td-qty{text-align:center;font-weight:800;font-size:16px;color:#2563eb}.td-blank{text-align:center;color:#cbd5e1}.sig-section{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px;padding-top:24px;border-top:2px solid #f1f5f9}.sig-box{border-bottom:2px solid #1e1b4b;height:64px;margin-bottom:8px}.sig-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}.footer{margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}.footer-brand{font-weight:700;color:#1e1b4b;font-size:10px}</style>
</head><body><div class="page">
<div class="header">
  <div><div style=\"display:flex;align-items:center;gap:10px\"><div style=\"width:52px;height:52px;background:#1e1b4b;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0\"><svg width=\"32\" height=\"32\" viewBox=\"0 0 48 48\" fill=\"none\"><rect x=\"10\" y=\"13\" width=\"28\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\"/><rect x=\"10\" y=\"20\" width=\"20\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".6\"/><rect x=\"10\" y=\"27\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".35\"/><rect x=\"10\" y=\"34\" width=\"14\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".18\"/><rect x=\"30\" y=\"21\" width=\"2.5\" height=\"14\" rx=\"1.25\" fill=\"#60a5fa\"/><polygon points=\"36,27 30,21 30,35\" fill=\"#60a5fa\" fill-opacity=\".4\"/></svg></div><div style=\"margin-left:0\"><div style=\"font-size:14px;font-weight:900;color:#1e1b4b;letter-spacing:-.3px\">${COMPANY.name}</div><div style=\"font-size:10px;color:#94a3b8;line-height:1.6;margin-top:2px\">${COMPANY.address}<br>${COMPANY.city}, ${COMPANY.postcode}</div><div style=\"font-size:10px;color:#94a3b8;margin-top:2px\">Tel: ${COMPANY.phone}<br>${COMPANY.email} · VAT: ${COMPANY.vatNumber}</div></div></div><div style="display:none">${COMPANY.address}<br>${COMPANY.city}, ${COMPANY.postcode}<br>Tel: ${COMPANY.phone} · ${COMPANY.email}<br>VAT: ${COMPANY.vatNumber}</div></div>
  <div style="text-align:right"><div class="doc-title">DELIVERY</div><div class="doc-title">NOTE</div><div class="doc-num">${dn_number}</div><div class="inv-badge">📄 Invoice: ${inv.invoice_number}</div><div class="status-pill">${(inv.status||"pending").toUpperCase()}</div></div>
</div>
<div class="meta-grid">
  <div class="meta-box dark"><div class="meta-lbl light">Deliver To</div><div class="meta-val large light">${escHtml(inv.customer)}</div>${address?"<div class=\"meta-val addr\">"+address+"</div>":""}</div>
  <div class="meta-sub">
    <div class="meta-box"><div class="meta-lbl">DN Number</div><div class="meta-val">${dn_number}</div></div>
    <div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${fmtDate(inv.invoice_date)}</div></div>
    <div class="meta-box"><div class="meta-lbl">Invoice Ref</div><div class="meta-val">${inv.invoice_number}</div></div>
    <div class="meta-box"><div class="meta-lbl">Items</div><div class="meta-val">${dnLines.length} line${dnLines.length!==1?"s":""}</div></div>
  </div>
</div>
<div class="table-wrap"><table>
  <thead><tr><th style="width:45%">Description</th><th>Unit</th><th class="c">Qty Ordered</th><th class="c">Qty Delivered</th><th class="c">Condition</th></tr></thead>
  <tbody>${dnLines.map(l=>"<tr><td class=\"td-desc\">" + escHtml(l.description) + "</td><td class=\"td-unit\">" + escHtml(l.unit||"unit") + "</td><td class=\"td-qty\">" + escHtml(String(l.qty)) + "</td><td class=\"td-blank\">____</td><td class=\"td-blank\">____</td></tr>").join("")}
</table></div>
<div class="sig-section">
  <div><div class="sig-box"></div><div class="sig-lbl">✍ Delivered by — Signature &amp; Full Name</div></div>
  <div><div class="sig-box"></div><div class="sig-lbl">✍ Received by — Signature, Name &amp; Date</div></div>
</div>
<div class="footer"><span><span class="footer-brand">${COMPANY.name}</span> · VAT: ${COMPANY.vatNumber}</span><span>${dn_number} · Printed: ${new Date().toLocaleDateString("en-GB")}</span><span>Goods remain property of ${COMPANY.name} until signed</span></div>
</div></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 800);
  };

  const downloadDNpdf = (html, dn_number) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 800);
  };

  const totals = { paid: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0), pending: invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0), overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0) };
  const filtered = invoices.filter(i => {
    const matchStatus = filterStatus === "all" || i.status === filterStatus;
    const matchSearch = !searchQ || i.customer?.toLowerCase().includes(searchQ.toLowerCase()) || i.invoice_number?.toLowerCase().includes(searchQ.toLowerCase());
    return matchStatus && matchSearch;
  }).sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (sortCol === "amount") { av = parseFloat(av)||0; bv = parseFloat(bv)||0; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
  const sortToggle = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const SortIcon = ({ col }) => <i className={"ti " + (sortCol !== col ? "ti-arrows-sort" : sortDir === "asc" ? "ti-sort-ascending" : "ti-sort-descending")} style={{ fontSize: 11, marginLeft: 4 }} />;
  return (
    <div>
      {editInvoice && <EditInvoiceModal
        invoice={editInvoice}
        onClose={() => setEditInvoice(null)}
        contacts={contacts}
        products={products}
        token={token}
        onSaved={() => {
          sb.get(token, "invoices", "order=created_at.desc&limit=1000").then(d => Array.isArray(d) && setInvoices(d));
          setEditInvoice(null);
        }}
      />}
      {viewInvoice && <InvoiceModal
        invoice={viewInvoice}
        onClose={() => setViewInvoice(null)}
        contacts={contacts}
        onEdit={(inv) => { setEditInvoice(inv); setViewInvoice(null); }}
        onStatusChange={async (id, status) => {
          await sb.patch(token, "invoices", id, { status });
          setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
          setViewInvoice(prev => prev?.id === id ? { ...prev, status } : prev);
          const inv = invoices.find(i => i.id === id);
          if (inv) logAudit(auth.token, auth.user.id, "status_changed", "invoice", id, `${inv.invoice_number} status changed to ${status.toUpperCase()} for ${inv.customer}`);
        }}
        onDuplicate={(inv) => {
          setViewInvoice(null);
          setShowForm(true);
        }}
        onPartPay={async (inv, amt, method) => {
          const prevPaid = parseFloat(inv.amount_paid || 0);
          const totalPaid = prevPaid + amt;
          const balance = parseFloat(inv.amount) - totalPaid;
          const newStatus = balance <= 0 ? "paid" : "partial";
          await sb.patch(token, "invoices", inv.id, { amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus, payment_method: method });
          setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus } : i));
          setViewInvoice(prev => prev?.id === inv.id ? { ...prev, amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus } : prev);
        }}
        onLogPartPay={(inv, amt, method, newBal) => logAudit(token, userId, "part_payment", "invoice", inv.id, `${inv.invoice_number} — £${amt.toFixed(2)} received via ${method}. Remaining: £${newBal.toFixed(2)}`)}
      />}
      <div className="ph">
        <div><div className="pt">Invoices</div><div className="psub">{filtered.length} of {invoices.length} invoices</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14, pointerEvents: "none" }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search invoices..." style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: "1px solid var(--border)", borderRadius: "var(--r)", fontSize: 13, fontFamily: "var(--sans)", outline: "none", color: "var(--text)", background: "var(--white)", width: 200 }} />
          </div>
          <button className="btn bp" onClick={() => setShowForm(!showForm)}><i className="ti ti-plus" />New Invoice</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="g3" style={{ marginBottom: 16 }}>
        <div className="kpi" style={{ marginBottom: 0, cursor: "pointer", "--kpi-accent": "var(--green)" }} onClick={() => setFilterStatus(filterStatus === "paid" ? "all" : "paid")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="kpi-label" style={{ marginBottom: 0 }}>Paid</div>
            {filterStatus === "paid" && <span style={{ fontSize: 10, color: "var(--green)", fontWeight: 700 }}>● Active</span>}
          </div>
          <div className="kpi-val tg" style={{ marginTop: 6 }}>{fmt(totals.paid)}</div>
        </div>
        <div className="kpi" style={{ marginBottom: 0, cursor: "pointer", "--kpi-accent": "var(--amber)" }} onClick={() => setFilterStatus(filterStatus === "pending" ? "all" : "pending")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="kpi-label" style={{ marginBottom: 0 }}>Pending</div>
            {filterStatus === "pending" && <span style={{ fontSize: 10, color: "var(--amber)", fontWeight: 700 }}>● Active</span>}
          </div>
          <div className="kpi-val" style={{ color: "var(--amber)", marginTop: 6 }}>{fmt(totals.pending)}</div>
        </div>
        <div className="kpi" style={{ marginBottom: 0, cursor: "pointer", "--kpi-accent": "var(--red)" }} onClick={() => setFilterStatus(filterStatus === "overdue" ? "all" : "overdue")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="kpi-label" style={{ marginBottom: 0 }}>Overdue</div>
            {filterStatus === "overdue" && <span style={{ fontSize: 10, color: "var(--red)", fontWeight: 700 }}>● Active</span>}
          </div>
          <div className="kpi-val tr-c" style={{ marginTop: 6 }}>{fmt(totals.overdue)}</div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all","All",invoices.length],["pending","Pending",invoices.filter(i=>i.status==="pending").length],["paid","Paid",invoices.filter(i=>i.status==="paid").length],["overdue","Overdue",invoices.filter(i=>i.status==="overdue").length],["draft","Draft",invoices.filter(i=>i.status==="draft").length]].map(([s, lbl, cnt]) => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid " + (filterStatus === s ? "var(--blue)" : "var(--border)"), background: filterStatus === s ? "var(--blue)" : "var(--white)", color: filterStatus === s ? "#fff" : "var(--text2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)", display: "flex", alignItems: "center", gap: 5, transition: "all .12s" }}>
            {lbl} <span style={{ background: filterStatus === s ? "rgba(255,255,255,.2)" : "var(--border)", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{cnt}</span>
          </button>
        ))}
      </div>
      {showForm && !isMobile() && <InvoiceForm contacts={contacts} products={products} token={token} userId={userId} onSave={inv => { setInvoices(prev => { if (prev.find(i=>i.id===inv.id)) return prev; return [inv,...prev]; }); setTimeout(() => sb.get(token,"invoices","order=created_at.desc&limit=1000").then(d=>Array.isArray(d)&&setInvoices(d)), 1000); }} onClose={() => setShowForm(false)} />}
      {showForm && isMobile() && <ModalPortal><div style={{position:"fixed",inset:0,zIndex:500,background:"var(--bg)",overflowY:"auto"}}><InvoiceForm contacts={contacts} products={products} token={token} userId={userId} onSave={inv => { setInvoices(prev => { if (prev.find(i=>i.id===inv.id)) return prev; return [inv,...prev]; }); setTimeout(() => sb.get(token,"invoices","order=created_at.desc&limit=1000").then(d=>Array.isArray(d)&&setInvoices(d)), 1000); }} onClose={() => setShowForm(false)} /></div></ModalPortal>}
      <div className="card">
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{filtered.length} invoice{filtered.length!==1?"s":""}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setViewMode("table")} style={{ width:30,height:30,borderRadius:"var(--r)",border:"1px solid "+(viewMode==="table"?"var(--blue)":"var(--border)"),background:viewMode==="table"?"var(--blue-lt)":"var(--white)",color:viewMode==="table"?"var(--blue)":"var(--text3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><i className="ti ti-table" style={{fontSize:14}} /></button>
            <button onClick={() => setViewMode("card")} style={{ width:30,height:30,borderRadius:"var(--r)",border:"1px solid "+(viewMode==="card"?"var(--blue)":"var(--border)"),background:viewMode==="card"?"var(--blue-lt)":"var(--white)",color:viewMode==="card"?"var(--blue)":"var(--text3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><i className="ti ti-layout-grid" style={{fontSize:14}} /></button>
          </div>
        </div>
        {viewMode === "card" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14, padding: 16 }}>
            {filtered.map(inv => (
              <div key={inv.id} style={{ background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:18,boxShadow:"var(--sh)",cursor:"pointer",transition:"all .15s" }}
                onClick={() => setViewInvoice(inv)}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--blue)";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.transform="none";}}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <div className="c-av" style={{ background:["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][inv.customer?.charCodeAt(0)%5]||"#6366f1",width:30,height:30,fontSize:11 }}>{inv.customer?.[0]?.toUpperCase()}</div>
                    <span style={{ fontWeight:600,fontSize:13 }}>{inv.customer}</span>
                  </div>
                  <span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span>
                </div>
                <div style={{ fontSize:22,fontWeight:800,letterSpacing:"-.5px",marginBottom:4 }}>
                {inv.status === "partial" ? fmt(inv.balance || 0) : fmt(inv.amount)}
                {inv.status === "partial" && <span style={{ fontSize:12, color:"var(--text3)", fontWeight:400, marginLeft:6 }}>of {fmt(inv.amount)}</span>}
              </div>
                <div style={{ fontSize:11,color:"var(--text3)",marginBottom:12 }}>{inv.invoice_number} · {fmtDate(inv.invoice_date)}</div>
                <div style={{ display:"flex",gap:6 }}>
                  <button className="btn bp bsm" style={{flex:1}} onClick={e=>{e.stopPropagation();setViewInvoice(inv);}}>View</button>
                  <button className="btn bsm" style={{background:"#0f172a",color:"#fff"}} onClick={e=>{e.stopPropagation();printDNFromInvoice(inv);}}>DN</button>
                </div>
              </div>
            ))}
            {filtered.length===0&&<EmptyState icon="invoice" title="No invoices" sub="No invoices match your current filter" />}
          </div>
        ) : (
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:460}}><thead><tr>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("customer")}>Customer <i className={"ti "+(sortCol!=="customer"?"ti-arrows-sort":sortDir==="asc"?"ti-sort-ascending-letters":"ti-sort-descending-letters")} style={{fontSize:10,marginLeft:3,opacity:sortCol==="customer"?1:.3}} /></th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("invoice_number")}>Invoice # <i className={"ti "+(sortCol!=="invoice_number"?"ti-arrows-sort":sortDir==="asc"?"ti-sort-ascending":"ti-sort-descending")} style={{fontSize:10,marginLeft:3,opacity:sortCol==="invoice_number"?1:.3}} /></th>
          <th className="hm" style={{cursor:"pointer"}} onClick={()=>sortToggle("invoice_date")}>Date <i className={"ti "+(sortCol!=="invoice_date"?"ti-arrows-sort":"ti-calendar")} style={{fontSize:10,marginLeft:3,opacity:sortCol==="invoice_date"?1:.3}} /></th>
          <th className="hm">Due</th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("amount")}>Amount <i className={"ti "+(sortCol!=="amount"?"ti-arrows-sort":sortDir==="asc"?"ti-sort-ascending-numbers":"ti-sort-descending-numbers")} style={{fontSize:10,marginLeft:3,opacity:sortCol==="amount"?1:.3}} /></th>
          <th>Status</th><th>Actions</th>
        </tr></thead><tbody>
          {filtered.map(inv => (
            <tr key={inv.id}>
              <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="c-av hm" style={{ background: ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][inv.customer?.charCodeAt(0) % 5] || "#6366f1" }}>{inv.customer?.[0]?.toUpperCase()}</div><span style={{ fontWeight: 500 }}>{inv.customer}</span></div></td>
              <td className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{inv.invoice_number}</td>
              <td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(inv.invoice_date)}</td>
              <td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(inv.due_date)}</td>
              <td className="mono" style={{ fontWeight: 600 }}>
                {inv.status === "partial"
                  ? <span>{fmt(inv.balance || 0)} <span style={{ fontSize:10, color:"var(--text3)", fontWeight:400 }}>of {fmt(inv.amount)}</span></span>
                  : fmt(inv.amount)}
              </td>
              <td><div style={{ display: "flex", flexDirection: "column", gap: 3 }}><span className={"badge " + (inv.status === "paid" ? "b-green" : inv.status === "overdue" ? "b-red" : inv.status === "pending" ? "b-amber" : "b-gray")}>{inv.status}</span>{inv.payment_method && <span style={{ fontSize: 10, color: "var(--text3)" }}>{inv.payment_method === "cash" ? "💵" : inv.payment_method === "bank" ? "🏦" : inv.payment_method === "card" ? "💳" : "📝"} {inv.payment_method}</span>}</div></td>
              <td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn bo bsm" onClick={() => setViewInvoice(inv)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>View</button>
                  <button className="btn bsm" style={{ background: "#0f172a", color: "#fff" }} onClick={() => printDNFromInvoice(inv)} title="Download Delivery Note"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>DN</button>
                  {(profile?.role === "admin") && (
                    <button className="btn bo bsm" style={{ color: "var(--red)", borderColor: "var(--red)", minWidth: 32, display: "inline-flex", alignItems: "center", justifyContent: "center" }} onClick={() => deleteInvoice(inv)} title="Delete invoice"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
                  )}
                  {inv.status !== "paid" && payingId === inv.id ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <select className="il-input" style={{ padding: "4px 8px", fontSize: 11, width: 80 }} value={payMethod[inv.id] || "cash"} onChange={e => setPayMethod(prev => ({ ...prev, [inv.id]: e.target.value }))}>
                        <option value="cash">💵 Cash</option><option value="bank">🏦 Bank</option><option value="card">💳 Card</option><option value="cheque">📝 Cheque</option>
                      </select>
                      <button className="btn bp bsm" onClick={() => markPaid(inv.id, payMethod[inv.id] || "cash")}>✓</button>
                      <button className="btn bo bsm" onClick={() => setPayingId(null)}>✕</button>
                    </div>
                  ) : (
                    <button className="btn bp bsm" onClick={() => setPayingId(inv.id)}>Mark Paid</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={7}><EmptyState icon="invoice" title={searchQ || filterStatus !== "all" ? "No invoices match" : "No invoices yet"} sub={searchQ || filterStatus !== "all" ? "Try adjusting your search or filter" : "Create your first VAT invoice to get started"} /></td></tr>}
        </tbody></table></div>
        )}
      </div>
    </div>
  );
}

// ── CONTACTS ──────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Contacts                                                   │
// │ Customer and supplier contact management                   │
// └────────────────────────────────────────────────────────────┘
function Contacts({ contacts, setContacts, token, userId, invoices = [] }) {
  const [tab, setTab] = useState("customer");
  const [contactView, setContactView] = useState("grid");
  const [viewContact, setViewContact] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "" });
  const filtered = contacts.filter(c => c.type === tab || c.type === "both");
  const save = async () => {
    if (!f.name) return; setSaving(true);
    const data = await sb.post(token, "contacts", { ...f, created_by: userId });
    if (data[0]) { setContacts(prev => [data[0], ...prev]); logAudit(token, userId, "contact_created", "contact", data[0].id, `${f.type} contact created: ${f.name}${f.email ? ' · ' + f.email : ''}`); }
    setF({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "" });
    setShowForm(false); setSaving(false);
  };
  const avatarColors = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444","#2563eb","#ec4899"];
  return (
    <div>
      {viewContact && (
        <ModalPortal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewContact(null)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:44,height:44,borderRadius:"50%",background:["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][viewContact.name?.charCodeAt(0)%5]||"#6366f1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff" }}>{viewContact.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight:700,fontSize:16 }}>{viewContact.name}</div>
                  <div style={{ fontSize:12,color:"var(--text3)",marginTop:2 }}>{viewContact.type||"customer"} · {viewContact.city||"No location"}</div>
                </div>
              </div>
              <button className="btn bo bsm" onClick={() => setViewContact(null)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div style={{ padding:"20px 24px" }}>
              {/* KPI row */}
              {(() => {
                const custInvoices = invoices.filter(i => i.customer === viewContact.name);
                const totalSpend = custInvoices.reduce((s,i)=>s+i.amount,0);
                const paid = custInvoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0);
                const outstanding = custInvoices.filter(i=>i.status==="pending"||i.status==="overdue").reduce((s,i)=>s+i.amount,0);
                return (
                  <div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:20 }}>
                      {[{l:"Total Spend",v:fmt(totalSpend),c:"var(--blue)"},{l:"Invoices",v:custInvoices.length,c:"var(--text)"},{l:"Paid",v:fmt(paid),c:"var(--green)"},{l:"Outstanding",v:fmt(outstanding),c:outstanding>0?"var(--amber)":"var(--green)"}].map(k=>(
                        <div key={k.l} style={{ background:"#f8fafd",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:"12px 14px" }}>
                          <div style={{ fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.l}</div>
                          <div style={{ fontSize:16,fontWeight:700,color:k.c }}>{k.v}</div>
                        </div>
                      ))}
                    </div>
                    {/* Contact details */}
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
                      {[
                        {icon:"ti-mail",label:"Email",val:viewContact.email},
                        {icon:"ti-phone",label:"Phone",val:viewContact.phone},
                        {icon:"ti-map-pin",label:"Address",val:[viewContact.address,viewContact.city,viewContact.postcode].filter(Boolean).join(", ")},
                        {icon:"ti-file-invoice",label:"VAT Number",val:viewContact.vat_number},
                      ].filter(d=>d.val).map(d=>(
                        <div key={d.label} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--r)" }}>
                          <i className={"ti "+d.icon} style={{ color:"var(--blue)",fontSize:15,marginTop:1,flexShrink:0 }} />
                          <div>
                            <div style={{ fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:2 }}>{d.label}</div>
                            <div style={{ fontSize:13,fontWeight:500,color:"var(--text)" }}>{d.val}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Transaction history */}
                    <div style={{ fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:10 }}>Transaction History</div>
                    {custInvoices.length===0 ? (
                      <div style={{ padding:24,textAlign:"center",color:"var(--text3)",background:"#f8fafd",borderRadius:"var(--rl)",border:"1px solid var(--border)" }}>
                        <i className="ti ti-file-off" style={{ fontSize:28,display:"block",marginBottom:8,opacity: 0.3 }} />
                        No invoices yet for this customer
                      </div>
                    ) : (
                      <div style={{ border:"1px solid var(--border)",borderRadius:"var(--rl)",overflow:"hidden" }}>
                        <table style={{ width:"100%",borderCollapse:"collapse" }}>
                          <thead><tr style={{ background:"#f8fafd" }}>
                            {["Invoice","Date","Amount","Status"].map(h=><th key={h} style={{ padding:"9px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textAlign:h==="Amount"?"right":"left",textTransform:"uppercase",letterSpacing:".6px" }}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {custInvoices.map(inv=>(
                              <tr key={inv.id} style={{ borderTop:"1px solid var(--border)" }}>
                                <td style={{ padding:"10px 14px",fontSize:12,color:"var(--blue)",fontWeight:600 }}>{inv.invoice_number}</td>
                                <td style={{ padding:"10px 14px",fontSize:12,color:"var(--text2)" }}>{fmtDate(inv.invoice_date)}</td>
                                <td style={{ padding:"10px 14px",fontSize:13,fontWeight:700,textAlign:"right" }}>{fmt(inv.amount)}</td>
                                <td style={{ padding:"10px 14px" }}><span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="modal-actions">
              <div style={{ display:"flex",gap:8 }}>
                <button className="btn bo bsm" onClick={()=>{setViewContact(null);setF({...viewContact});setShowForm(true);}}><i className="ti ti-edit" />Edit</button>
                {viewContact.email&&<button className="btn bo bsm" onClick={()=>window.open("mailto:"+viewContact.email)}><i className="ti ti-mail" />Email</button>}
                {viewContact.phone&&<button className="btn bwa bsm" onClick={()=>window.open("https://wa.me/"+viewContact.phone.split("").filter(c=>c>="0"&&c<="9").join(""))}><i className="ti ti-brand-whatsapp" />WhatsApp</button>}
              </div>
              <button className="btn bp bsm" onClick={()=>setViewContact(null)}>Close</button>
            </div>
          </div>
        </div></ModalPortal>
      )}
      <div className="ph">
        <div><div className="pt">Customers & Suppliers</div><div className="psub">Manage your business contacts</div></div>
        <div style={{display:"flex",gap:8}}>
          <div style={{display:"flex",gap:4}}>
            <button onClick={() => setContactView("grid")} style={{width:32,height:32,borderRadius:"var(--r)",border:"1px solid "+(contactView==="grid"?"var(--blue)":"var(--border)"),background:contactView==="grid"?"var(--blue-lt)":"var(--white)",color:contactView==="grid"?"var(--blue)":"var(--text3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti ti-layout-grid" style={{fontSize:15}} /></button>
            <button onClick={() => setContactView("list")} style={{width:32,height:32,borderRadius:"var(--r)",border:"1px solid "+(contactView==="list"?"var(--blue)":"var(--border)"),background:contactView==="list"?"var(--blue-lt)":"var(--white)",color:contactView==="list"?"var(--blue)":"var(--text3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti ti-list" style={{fontSize:15}} /></button>
          </div>
          <button className="btn bp" onClick={() => { setShowForm(!showForm); setF({ ...f, type: tab }); }}><i className="ti ti-user-plus" />Add {tab === "customer" ? "Customer" : "Supplier"}</button>
        </div>
      </div>
      <div className="tabs">{[["customer","👥 Customers"],["supplier","🏭 Suppliers"]].map(([k,l]) => <div key={k} className={"tab " + (tab === k ? "active" : "")} onClick={() => setTab(k)}>{l} <span style={{ color: "var(--text3)", fontSize: 12 }}>({contacts.filter(c => c.type === k || c.type === "both").length})</span></div>)}</div>
      {showForm && <div className="card" style={{ marginBottom: 20 }}><div className="ch"><div className="ct">New Contact</div></div><div className="fg"><div className="fgrp"><label>Type</label><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Both</option></select></div><div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Business name" /></div><div className="fgrp"><label>Email</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="email@example.com" /></div><div className="fgrp"><label>Phone</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+44..." /></div><div className="fgrp"><label>Address</label><input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></div><div className="fgrp"><label>City</label><input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></div><div className="fgrp"><label>Postcode</label><input value={f.postcode} onChange={e => setF({ ...f, postcode: e.target.value })} /></div><div className="fgrp"><label>VAT Number</label><input value={f.vat_number} onChange={e => setF({ ...f, vat_number: e.target.value })} placeholder="GB123456789" /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Contact"}</button></div></div>}
      {contactView === "list" ? (
        <div className="card">
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Name</th><th>Email</th><th className="hm">Phone</th><th className="hm">Location</th><th>Actions</th></tr></thead><tbody>
            {filtered.map(c=>(
              <tr key={c.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:10}}><div className="c-av" style={{background:["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][c.name?.charCodeAt(0)%5]||"#6366f1",width:30,height:30,fontSize:11}}>{c.name?.[0]?.toUpperCase()}</div><span style={{fontWeight:600}}>{c.name}</span></div></td>
                <td style={{fontSize:12,color:"var(--text2)"}}>{c.email||"—"}</td>
                <td className="hm" style={{fontSize:12,color:"var(--text2)"}}>{c.phone||"—"}</td>
                <td className="hm" style={{fontSize:12,color:"var(--text2)"}}>{[c.city,c.postcode].filter(Boolean).join(", ")||"—"}</td>
                <td><button className="btn bo bsm" onClick={()=>window.open(`mailto:${c.email}`)}><i className="ti ti-mail" />Email</button></td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      ) : (
      <div className="contact-grid">
        {filtered.map(c => <div key={c.id} className="contact-card" onClick={() => setViewContact(c)}><div className="cc-av" style={{ background: avatarColors[c.name?.charCodeAt(0) % avatarColors.length] || "#6366f1" }}>{c.name?.[0]?.toUpperCase()}</div><div className="cc-name">{c.name}</div>{c.email && <div className="cc-detail"><i className="ti ti-mail" />{c.email}</div>}{c.phone && <div className="cc-detail"><i className="ti ti-phone" />{c.phone}</div>}{c.city && <div className="cc-detail"><i className="ti ti-map-pin" />{c.city}{c.postcode ? `, ${c.postcode}` : ""}</div>}{c.vat_number && <div style={{ marginTop: 10 }}><span className="tag">VAT: {c.vat_number}</span></div>}</div>)}
        {filtered.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "var(--text3)", gridColumn: "1/-1" }}>No {tab}s yet — add your first one!</div>}
      </div>
      )}
    </div>
  );
}

// ── INVENTORY ─────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Inventory                                                  │
// │ Product stock management                                   │
// └────────────────────────────────────────────────────────────┘
function Inventory({ products, setProducts, token, userId }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
  const save = async () => {
    if (!f.name) return; setSaving(true);
    const data = await sb.post(token, "products", { ...f, cost_price: parseFloat(f.cost_price)||0, sale_price: parseFloat(f.sale_price)||0, vat_rate: parseFloat(f.vat_rate)||20, stock_qty: parseFloat(f.stock_qty)||0, reorder_level: parseFloat(f.reorder_level)||0, created_by: userId });
    if (data[0]) { setProducts(prev => [data[0], ...prev]); logAudit(token, userId, "product_created", "product", data[0].id, `Product added: ${f.name} · Sale £${parseFloat(f.sale_price)||0} · Stock: ${parseFloat(f.stock_qty)||0}`); }
    setF({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
    setShowForm(false); setSaving(false);
  };
  const lowStock = products.filter(p => p.stock_qty <= (p.reorder_level || DEFAULT_REORDER));
  return (
    <div>
      <div className="ph"><div><div className="pt">Stock & Inventory</div><div className="psub">Track your products and stock levels</div></div><button className="btn bp" onClick={() => setShowForm(!showForm)}><i className="ti ti-plus" />Add Product</button></div>
      <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom: 20 }}><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Products</div><div className="kpi-val">{products.length}</div></div><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Low Stock</div><div className="kpi-val" style={{ color: lowStock.length > 0 ? "var(--red)" : "var(--green)" }}>{lowStock.length}</div></div><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Stock Value</div><div className="kpi-val">{fmt(products.reduce((s,p) => s+p.stock_qty*p.cost_price,0))}</div></div><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Retail Value</div><div className="kpi-val">{fmt(products.reduce((s,p) => s+p.stock_qty*p.sale_price,0))}</div></div></div>
      {showForm && <div className="card" style={{ marginBottom: 20 }}><div className="ch"><div className="ct">New Product</div></div><div className="fg3"><div className="fgrp"><label>Code</label><input value={f.code} onChange={e => setF({...f,code:e.target.value})} placeholder="SKU001" /></div><div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({...f,name:e.target.value})} placeholder="Product name" /></div><div className="fgrp"><label>Category</label><input value={f.category} onChange={e => setF({...f,category:e.target.value})} placeholder="e.g. Vapes, Pods..." /></div><div className="fgrp"><label>Unit</label><select value={f.unit} onChange={e => setF({...f,unit:e.target.value})}><option>unit</option><option>pack</option><option>box</option><option>kg</option><option>litre</option></select></div><div className="fgrp"><label>Cost Price (£)</label><input type="number" value={f.cost_price} onChange={e => setF({...f,cost_price:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>Sale Price (£)</label><input type="number" value={f.sale_price} onChange={e => setF({...f,sale_price:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>VAT Rate</label><select value={f.vat_rate} onChange={e => setF({...f,vat_rate:e.target.value})}><option value="20">20% Standard</option><option value="5">5% Reduced</option><option value="0">0% Exempt</option></select></div><div className="fgrp"><label>Stock Qty</label><input type="number" value={f.stock_qty} onChange={e => setF({...f,stock_qty:e.target.value})} placeholder="0" /></div><div className="fgrp"><label>Reorder Level</label><input type="number" value={f.reorder_level} onChange={e => setF({...f,reorder_level:e.target.value})} placeholder="0" /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Product"}</button></div></div>}
      <div className="card"><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Code</th><th>Product</th><th>Category</th><th className="hm">Cost</th><th>Sale Price</th><th>VAT</th><th>In Stock</th><th>Status</th></tr></thead><tbody>
        {products.map(p => <tr key={p.id}><td className="mono tm" style={{fontSize:12}}>{p.code||"—"}</td><td style={{fontWeight:500}}>{p.name}</td><td className="tm">{p.category||"—"}</td><td className="mono hm">{fmt(p.cost_price)}</td><td className="mono">{fmt(p.sale_price)}</td><td><span className="tag">{p.vat_rate}%</span></td><td className="mono">{p.stock_qty} {p.unit}</td><td><span className={"badge "+(p.stock_qty<=p.reorder_level?"b-red":p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)*2?"b-amber":"b-green")}>{p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)?"Low Stock":p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)*2?"Running Low":"In Stock"}</span></td></tr>)}
        {products.length===0&&<tr><td colSpan={8} className="empty">No products yet</td></tr>}
      </tbody></table></div></div>
    </div>
  );
}

// ── PURCHASES ─────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Purchases                                                  │
// │ Purchase orders                                            │
// └────────────────────────────────────────────────────────────┘
function Purchases({ contacts, products, token, userId }) {
  const [pos, setPOs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState([{ product_id: "", product_name: "", qty: "", unit_cost: "", vat_rate: "20" }]);
  const [f, setF] = useState({ supplier_id: "", order_date: today(), expected_date: "", notes: "" });
  useEffect(() => { sb.get(token, "purchase_orders", "order=created_at.desc").then(d => Array.isArray(d) && setPOs(d)); }, [token]);
  const suppliers = contacts.filter(c => c.type === "supplier" || c.type === "both");
  const updateLine = (i, field, val) => { const next = [...lines]; if (field === "product_id") { const p = products.find(x => x.id === val); next[i] = { ...next[i], product_id: val, product_name: p?.name||"", unit_cost: p?.cost_price||"", vat_rate: String(p?.vat_rate||20) }; } else next[i] = { ...next[i], [field]: val }; setLines(next); };
  const lineTotal = (l) => (parseFloat(l.qty)||0)*(parseFloat(l.unit_cost)||0);
  const total = lines.reduce((s,l) => s+lineTotal(l),0);
  const vatTotal = lines.reduce((s,l) => s+lineTotal(l)*(parseFloat(l.vat_rate)||0)/100,0);
  const save = async () => {
    if (!f.supplier_id) return; setSaving(true);
    const num = `PO-${String(pos.length+1).padStart(3,"0")}`;
    const sup = suppliers.find(s => s.id === f.supplier_id);
    const po = await sb.post(token, "purchase_orders", { ...f, po_number: num, supplier_name: sup?.name, total: total+vatTotal, created_by: userId });
    if (po[0]) { for (const l of lines) if (l.product_id) await sb.post(token, "purchase_order_lines", { po_id: po[0].id, product_id: l.product_id, product_name: l.product_name, qty: parseFloat(l.qty)||0, unit_cost: parseFloat(l.unit_cost)||0, vat_rate: parseFloat(l.vat_rate)||0, total: lineTotal(l) }); setPOs(prev => [po[0],...prev]); logAudit(token, userId, "purchase_created", "purchase_order", po[0].id, `${num} raised for ${sup?.name} — £${(total+vatTotal).toFixed(2)}`); }
    setLines([{ product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20" }]);
    setF({ supplier_id:"",order_date:today(),expected_date:"",notes:"" });
    setShowForm(false); setSaving(false);
  };
  const updateStatus = async (id, status) => { await sb.patch(token,"purchase_orders",id,{status}); setPOs(prev => prev.map(p => p.id===id?{...p,status}:p)); };
  return (
    <div>
      <div className="ph"><div><div className="pt">Purchase Orders</div><div className="psub">Order stock from your suppliers</div></div><button className="btn bp" onClick={() => setShowForm(!showForm)}><i className="ti ti-plus" />New PO</button></div>
      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Purchase Order</div></div><div className="fg"><div className="fgrp"><label>Supplier *</label><select value={f.supplier_id} onChange={e => setF({...f,supplier_id:e.target.value})}><option value="">Select supplier...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="fgrp"><label>Order Date</label><input type="date" value={f.order_date} onChange={e => setF({...f,order_date:e.target.value})} /></div><div className="fgrp"><label>Expected Delivery</label><input type="date" value={f.expected_date} onChange={e => setF({...f,expected_date:e.target.value})} /></div><div className="fgrp"><label>Notes</label><input value={f.notes} onChange={e => setF({...f,notes:e.target.value})} placeholder="Any notes..." /></div></div><div style={{borderTop:"0.5px solid var(--border)"}}><div className="po-line" style={{background:"#fafbfc"}}>{["Product","Qty","Unit Cost","VAT %","Total",""].map(h => <span key={h} style={{fontSize:11,fontWeight:600,color:"var(--text3)",textTransform:"uppercase"}}>{h}</span>)}</div>{lines.map((l,i) => <div key={i} className="po-line"><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.product_id} onChange={e => updateLine(i,"product_id",e.target.value)}><option value="">Select product...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0" value={l.qty} onChange={e => updateLine(i,"qty",e.target.value)} /><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0.00" value={l.unit_cost} onChange={e => updateLine(i,"unit_cost",e.target.value)} /><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.vat_rate} onChange={e => updateLine(i,"vat_rate",e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">0%</option></select><span className="mono" style={{fontSize:12,fontWeight:600}}>{fmt(lineTotal(l))}</span><button className="ib" onClick={() => lines.length>1&&setLines(lines.filter((_,j) => j!==i))}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>)}<div style={{padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafbfc",borderTop:"0.5px solid var(--border)"}}><button className="btn bo bsm" onClick={() => setLines([...lines,{product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20"}])}><i className="ti ti-plus" />Add Line</button><div style={{textAlign:"right"}}><div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>Subtotal: {fmt(total)} · VAT: {fmt(vatTotal)}</div><div style={{fontSize:16,fontWeight:700}}>Total: {fmt(total+vatTotal)}</div></div></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Create PO"}</button></div></div>}
      <div className="card"><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>PO #</th><th>Supplier</th><th className="hm">Order Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {pos.map(po => <tr key={po.id}><td className="mono" style={{color:"var(--blue)",fontSize:12}}>{po.po_number}</td><td style={{fontWeight:500}}>{po.supplier_name}</td><td className="hm tm" style={{fontSize:12}}>{fmtDate(po.order_date)}</td><td className="mono" style={{fontWeight:600}}>{fmt(po.total)}</td><td><span className={"badge "+(po.status==="received"?"b-green":po.status==="sent"?"b-blue":po.status==="cancelled"?"b-red":"b-gray")}>{po.status}</span></td><td>{po.status==="draft"&&<button className="btn bo bsm" onClick={() => updateStatus(po.id,"sent")}>Mark Sent</button>}{po.status==="sent"&&<button className="btn bp bsm" onClick={() => updateStatus(po.id,"received")}>Mark Received</button>}</td></tr>)}
        {pos.length===0&&<tr><td colSpan={6}><EmptyState icon="report" title="No purchase orders yet" sub="Create your first purchase order to start ordering from suppliers" action={() => setShowForm(true)} actionLabel="New PO" /></td></tr>}
      </tbody></table></div></div>
    </div>
  );
}

// ── CREDIT NOTES ──────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ CreditNotes                                                │
// │ Issue and apply credit notes to invoices                   │
// └────────────────────────────────────────────────────────────┘
function CreditNotes({ contacts, invoices, token, userId }) {
  const [cns, setCNs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ customer_id: "", invoice_id: "", reason: "", amount: "", issue_date: today() });
  useEffect(() => { sb.get(token,"credit_notes","order=created_at.desc").then(d => Array.isArray(d)&&setCNs(d)); }, [token]);
  const customers = contacts.filter(c => c.type==="customer"||c.type==="both");
  const save = async () => {
    if (!f.customer_id||!f.amount) return; setSaving(true);
    const num = `CN-${String(cns.length+1).padStart(3,"0")}`;
    const cust = customers.find(c => c.id===f.customer_id);
    const data = await sb.post(token,"credit_notes",{...f,cn_number:num,customer_name:cust?.name,amount:parseFloat(f.amount),created_by:userId});
    if (data[0]) { setCNs(prev => [data[0],...prev]); logAudit(token, userId, "credit_note_created", "credit_note", data[0].id, `${num} issued to ${cust?.name} — £${parseFloat(f.amount).toFixed(2)}${f.reason ? ' · ' + f.reason : ''}`); }
    setF({ customer_id:"",invoice_id:"",reason:"",amount:"",issue_date:today() });
    setShowForm(false); setSaving(false);
  };
  const updateStatus = async (id,status) => { await sb.patch(token,"credit_notes",id,{status}); setCNs(prev => prev.map(c => c.id===id?{...c,status}:c)); };
  return (
    <div>
      <div className="ph"><div><div className="pt">Credit Notes</div><div className="psub">Issue and apply credit notes</div></div><button className="btn bp" onClick={() => setShowForm(!showForm)}><i className="ti ti-plus" />New Credit Note</button></div>
      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Credit Note</div></div><div className="fg"><div className="fgrp"><label>Customer *</label><select value={f.customer_id} onChange={e => setF({...f,customer_id:e.target.value})}><option value="">Select customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="fgrp"><label>Related Invoice</label><select value={f.invoice_id} onChange={e => setF({...f,invoice_id:e.target.value})}><option value="">Select invoice (optional)...</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {fmt(i.amount)}</option>)}</select></div><div className="fgrp"><label>Amount (£) *</label><input type="number" value={f.amount} onChange={e => setF({...f,amount:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>Issue Date</label><input type="date" value={f.issue_date} onChange={e => setF({...f,issue_date:e.target.value})} /></div><div className="fgrp full"><label>Reason *</label><input value={f.reason} onChange={e => setF({...f,reason:e.target.value})} placeholder="Reason for credit note..." /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Issue Credit Note"}</button></div></div>}
      <div className="card"><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>CN #</th><th>Customer</th><th className="hm">Date</th><th>Amount</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {cns.map(cn => <tr key={cn.id}><td className="mono" style={{color:"var(--purple)",fontSize:12}}>{cn.cn_number}</td><td style={{fontWeight:500}}>{cn.customer_name}</td><td className="hm tm" style={{fontSize:12}}>{fmtDate(cn.issue_date)}</td><td className="mono tr-c" style={{fontWeight:600}}>{fmt(cn.amount)}</td><td className="tm">{cn.reason}</td><td><span className={"badge "+(cn.status==="applied"?"b-green":cn.status==="issued"?"b-blue":"b-gray")}>{cn.status}</span></td><td>{cn.status==="draft"&&<button className="btn bo bsm" onClick={() => updateStatus(cn.id,"issued")}>Issue</button>}{cn.status==="issued"&&<button className="btn bp bsm" onClick={() => updateStatus(cn.id,"applied")}>Apply</button>}</td></tr>)}
        {cns.length===0&&<tr><td colSpan={7}><EmptyState icon="report" title="No credit notes yet" sub="Issue a credit note to refund or adjust a customer invoice" action={() => setShowForm(true)} actionLabel="New Credit Note" /></td></tr>}
      </tbody></table></div></div>
    </div>
  );
}

// ── REPORTS ───────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Reports                                                    │
// │ Reports router — delegates to AdminReports                 │
// └────────────────────────────────────────────────────────────┘
function Reports({ accounts }) {
  const revenue = accounts.filter(a => a.type==="Revenue");
  const expenses = accounts.filter(a => a.type==="Expense");
  const totalRev = revenue.reduce((s,a) => s+a.balance,0);
  const totalExp = expenses.reduce((s,a) => s+a.balance,0);
  const net = totalRev-totalExp;
  const [tab, setTab] = useState("pl");
  return (
    <div>
      <div className="ph"><div><div className="pt">Financial Reports</div><div className="psub">Profit & Loss and Balance Sheet</div></div></div>
      <div style={{display:"flex",gap:10,marginBottom:20}}>{[["pl","Profit & Loss"],["bs","Balance Sheet"]].map(([k,l]) => <button key={k} className={"btn "+(tab===k?"bp":"bo")} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab==="pl"&&<div className="card"><div className="ch"><div className="ct">Profit & Loss Statement</div><div className="cs">Year to date</div></div><div className="rs-title">Income</div>{revenue.map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tg">{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total Income</span><span className="mono tg">{fmt(totalRev)}</span></div><div style={{height:12}}/><div className="rs-title">Expenses</div>{expenses.map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tr-c">{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total Expenses</span><span className="mono tr-c">{fmt(totalExp)}</span></div><div className="rrow total"><span>Net {net>=0?"Profit":"Loss"}</span><span className={"mono "+(net>=0?"tg":"tr-c")}>{fmt(Math.abs(net))}</span></div></div>}
      {tab==="bs"&&<div className="g2">{[["Assets & Liabilities",[["Asset","tg"],["Liability","tr-c"]]],["Equity",[["Equity","tg"]]]].map(([title,groups]) => <div key={title} className="card"><div className="ch"><div className="ct">{title}</div></div>{groups.map(([type,cls]) => <span key={type}><div className="rs-title">{type}</div>{accounts.filter(a => a.type===type).map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className={"mono "+cls}>{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total {type}</span><span className={"mono "+cls}>{fmt(accounts.filter(a => a.type===type).reduce((s,a) => s+a.balance,0))}</span></div></span>)}</div>)}</div>}
    </div>
  );
}

// ── CUSTOMER STATEMENT ────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ CustomerStatement                                          │
// │ Printable customer statement                               │
// └────────────────────────────────────────────────────────────┘
function CustomerStatement({ contacts, invoices, token }) {
  const [selectedContact, setSelectedContact] = useState(null);
  const [query, setQuery] = useState("");
  const customers = contacts.filter(c => c.type === "customer" || c.type === "both");
  const filtered = customers.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const [showDropdown, setShowDropdown] = useState(false);
  const custInvoices = selectedContact ? invoices.filter(i => i.customer === selectedContact.name) : [];
  const totalOwed = custInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  const totalPaid = custInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const handleWhatsApp = () => {
    if (!selectedContact) return;
    const lines = custInvoices.map(inv => `${inv.invoice_number} — ${fmtDate(inv.invoice_date)} — ${fmt(inv.amount)} — ${inv.status.toUpperCase()}`).join("\n");
    const msg = encodeURIComponent(`*Account Statement — ${COMPANY.name}*\nCustomer: *${selectedContact.name}*\nDate: ${fmtDate(new Date().toISOString())}\n\n${lines}\n\nTotal Paid: ${fmt(totalPaid)}\n*Balance Outstanding: ${fmt(totalOwed)}*\n\nPlease contact us at ${COMPANY.phone} for any queries.`);
    const clean = (selectedContact.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    if (clean) window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
    else window.open(`https://wa.me/?text=${msg}`, "_blank");
  };
  return (
    <div>
      <div className="ph"><div><div className="pt">Customer Statement</div><div className="psub">View and share full account statements</div></div></div>
      <div className="card" style={{ marginBottom: 20, overflow: "visible" }}>
        <div className="ch"><div className="ct">Select Customer</div></div>
        <div style={{ padding: 20, overflow: "visible" }}>
          <div style={{ position: "relative", maxWidth: 500 }}>
            <input style={{ width: "100%", background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }} placeholder="Search customers by name..." value={query} onChange={e => { setQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
            {showDropdown && filtered.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 200, maxHeight: 300, overflowY: "auto", marginTop: 4 }}>
                {filtered.map(c => <div key={c.id} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "0.5px solid var(--border)", fontSize: 13 }} onMouseDown={() => { setSelectedContact(c); setQuery(c.name); setShowDropdown(false); }}><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{c.phone || ""} {c.city ? `· ${c.city}` : ""}</div></div>)}
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedContact && (
        <div className="card">
          <div className="ch">
            <div><div className="ct">Statement — {selectedContact.name}</div><div className="cs">{selectedContact.phone || ""} {selectedContact.email ? `· ${selectedContact.email}` : ""}</div></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn bwa bsm" onClick={handleWhatsApp}><i className="ti ti-brand-whatsapp" />Send Statement</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "16px 20px", borderBottom: "0.5px solid var(--border)" }}>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Total Invoiced</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalPaid + totalOwed)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Total Paid</div><div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{fmt(totalPaid)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Balance Due</div><div style={{ fontSize: 20, fontWeight: 700, color: totalOwed > 0 ? "var(--red)" : "var(--green)" }}>{fmt(totalOwed)}</div></div>
          </div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Invoice #</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            {custInvoices.map(inv => <tr key={inv.id}><td className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{inv.invoice_number}</td><td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(inv.invoice_date)}</td><td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(inv.due_date)}</td><td className="mono" style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td><td><span className={"badge " + (inv.status === "paid" ? "b-green" : inv.status === "overdue" ? "b-red" : "b-amber")}>{inv.status}</span></td></tr>)}
            {custInvoices.length === 0 && <tr><td colSpan={5} className="empty">No invoices found for this customer</td></tr>}
          </tbody></table></div>
          {custInvoices.length > 0 && <div style={{ padding: "14px 20px", borderTop: "2px solid var(--border2)", display: "flex", justifyContent: "flex-end" }}><div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "var(--text3)" }}>BALANCE DUE</div><div style={{ fontSize: 20, fontWeight: 700, color: totalOwed > 0 ? "var(--red)" : "var(--green)" }}>{fmt(totalOwed)}</div></div></div>}
        </div>
      )}
    </div>
  );
}

// ── STOCK ADJUSTMENT ──────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ StockAdjustment                                            │
// │ Adjust stock quantities                                    │
// └────────────────────────────────────────────────────────────┘
function StockAdjustment({ products, setProducts, token }) {
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(null);
  const [adjustments, setAdjustments] = useState({});
  const [reasons, setReasons] = useState({});
  const [success, setSuccess] = useState(null);
  const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || (p.code || "").toLowerCase().includes(query.toLowerCase()) || (p.category || "").toLowerCase().includes(query.toLowerCase()));
  const adjust = async (product, delta, reason) => {
    const newQty = Math.max(0, (product.stock_qty || 0) + delta);
    setSaving(product.id);
    await sb.patch(token, "products", product.id, { stock_qty: newQty });
    logAudit(token, userId, "stock_adjusted", "product", product.id, `${product.name} stock ${reason}: ${product.stock_qty} → ${newQty} ${product.unit||"units"}`);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock_qty: newQty } : p));
    setAdjustments(prev => ({ ...prev, [product.id]: "" }));
    setSuccess(product.id);
    setTimeout(() => setSuccess(null), 2000);
    setSaving(null);
  };
  return (
    <div>
      <div className="ph"><div><div className="pt">Stock Adjustment</div><div className="psub">Quickly update stock levels from anywhere</div></div></div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--border)" }}>
          <input style={{ width: "100%", background: "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }} placeholder="🔍  Search products by name, SKU or category..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Adjust By</th><th>Reason</th><th>Action</th></tr></thead><tbody>
          {filtered.slice(0, 30).map(p => {
            const adj = adjustments[p.id] || "";
            const delta = parseInt(adj) || 0;
            const newQty = Math.max(0, (p.stock_qty || 0) + delta);
            return (
              <tr key={p.id} style={{ background: success === p.id ? "var(--green-lt)" : "transparent" }}>
                <td><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{p.code || ""}</div></td>
                <td><span className="tag">{p.category || "General"}</span></td>
                <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="mono" style={{ fontWeight: 600, fontSize: 15 }}>{p.stock_qty || 0}</span>{delta !== 0 && <span style={{ fontSize: 11, color: delta > 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>→ {newQty}</span>}</div>{p.stock_qty <= (p.reorder_level || DEFAULT_REORDER) && <div style={{ fontSize: 10, color: "var(--red)", fontWeight: 600, marginTop: 2 }}>LOW STOCK</div>}</td>
                <td><div style={{ display: "flex", gap: 6, alignItems: "center" }}><button style={{ width: 28, height: 28, borderRadius: 6, border: "0.5px solid var(--border2)", background: "var(--white)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setAdjustments(prev => ({ ...prev, [p.id]: String((parseInt(prev[p.id] || 0)) - 1) }))}>−</button><input type="number" style={{ width: 60, textAlign: "center", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "5px 6px", fontSize: 13, outline: "none", fontFamily: "var(--mono)" }} value={adj} onChange={e => setAdjustments(prev => ({ ...prev, [p.id]: e.target.value }))} placeholder="0" /><button style={{ width: 28, height: 28, borderRadius: 6, border: "0.5px solid var(--border2)", background: "var(--white)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setAdjustments(prev => ({ ...prev, [p.id]: String((parseInt(prev[p.id] || 0)) + 1) }))}>+</button></div></td>
                <td><select style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none" }} value={reasons[p.id] || ""} onChange={e => setReasons(prev => ({ ...prev, [p.id]: e.target.value }))}><option value="">Select reason...</option><option value="stock_received">Stock Received</option><option value="sold">Sold</option><option value="damaged">Damaged</option><option value="returned">Returned</option><option value="count_adjustment">Count Adjustment</option></select></td>
                <td>{success === p.id ? <span style={{ color: "var(--green)", fontSize: 13, fontWeight: 600 }}>✓ Updated</span> : <button className="btn bp bsm" disabled={!adj || delta === 0 || saving === p.id} onClick={() => adjust(p, delta, reasons[p.id])}>{saving === p.id ? "..." : "Update"}</button>}</td>
              </tr>
            );
          })}
          {filtered.length === 0 && <tr><td colSpan={6} className="empty">No products found</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}

// ── SALES BY AGENT ────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ AgentReport                                                │
// │ Agent performance report                                   │
// └────────────────────────────────────────────────────────────┘
function AgentReport({ invoices, allProfiles, contacts }) {
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [period, setPeriod] = useState("all");
  const now = new Date();
  const filterByPeriod = (inv) => {
    if (period === "all") return true;
    const d = new Date(inv.invoice_date || inv.created_at);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "week") return (now - d) < 7 * 86400000;
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };
  const agentInvoices = (agentId) => invoices.filter(i => (agentId === "all" || i.created_by === agentId) && filterByPeriod(i));
  const displayInvoices = agentInvoices(selectedAgent);
  const totalSales = displayInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = displayInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = displayInvoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = displayInvoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  return (
    <div>
      <div className="ph"><div><div className="pt">Sales by Agent</div><div className="psub">Detailed agent performance breakdown</div></div></div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "8px 14px", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
          <option value="all">All Agents</option>
          {allProfiles.map(a => <option key={a.id} value={a.id}>{a.full_name || "Unknown"}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: "var(--r)", padding: 4 }}>
          {[["all","All Time"],["month","This Month"],["week","This Week"],["today","Today"]].map(([k,l]) => <button key={k} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)", background: period === k ? "var(--white)" : "transparent", color: period === k ? "var(--text)" : "var(--text3)", boxShadow: period === k ? "var(--sh)" : "none" }} onClick={() => setPeriod(k)}>{l}</button>)}
        </div>
      </div>
      <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom: 20 }}>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Total Sales</div><div className="kpi-val">{fmt(totalSales)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Collected</div><div className="kpi-val tg">{fmt(totalPaid)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Pending</div><div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(totalPending)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Overdue</div><div className="kpi-val tr-c">{fmt(totalOverdue)}</div></div>
      </div>
      <div className="card">
        <div className="ch"><div className="ct">Invoice Detail</div><div className="cs">{displayInvoices.length} records</div></div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Customer</th><th className="hm">Agent</th><th className="hm">Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
          {displayInvoices.slice(0, 50).map(inv => {
            const agent = allProfiles.find(a => a.id === inv.created_by);
            return <tr key={inv.id}>
              <td><div style={{ fontWeight: 600, fontSize: 13 }}>{inv.customer}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{inv.invoice_number}</div></td>
              <td className="hm" style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>{agent?.full_name || "—"}</td>
              <td className="hm" style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>{fmtDate(inv.invoice_date)}</td>
              <td className="mono" style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td>
              <td><span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span></td>
            </tr>;
          })}
          {displayInvoices.length === 0 && <tr><td colSpan={5} className="empty">No invoices for this period</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}

// ── ADMIN REPORTS SUITE ───────────────────────────────────────────────────────
// ── Product Sales Tracker ────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ ProductSalesTracker                                        │
// │ Product sales analytics tracker                            │
// └────────────────────────────────────────────────────────────┘
function ProductSalesTracker({ invoices, products, allProfiles }) {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [quickRange, setQuickRange] = useState("month");

  const setRange = (range) => {
    setQuickRange(range);
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    let from;
    if (range === "week") { const d = new Date(); d.setDate(d.getDate()-7); from = d.toISOString().split("T")[0]; }
    else if (range === "month") { const d = new Date(); d.setMonth(d.getMonth()-1); from = d.toISOString().split("T")[0]; }
    else if (range === "quarter") { const d = new Date(); d.setMonth(d.getMonth()-3); from = d.toISOString().split("T")[0]; }
    else if (range === "year") { const d = new Date(); d.setFullYear(d.getFullYear()-1); from = d.toISOString().split("T")[0]; }
    else { from = "2020-01-01"; }
    setDateFrom(from); setDateTo(to);
  };

  // Filter invoices by date range
  const rangedInvoices = invoices.filter(inv => {
    const d = inv.invoice_date || inv.created_at?.split("T")[0];
    return d >= dateFrom && d <= dateTo;
  });

  // Build product sales data from line items
  const productSales = {};
  rangedInvoices.forEach(inv => {
    let lines = inv.lines ? (typeof inv.lines === "string" ? JSON.parse(inv.lines) : inv.lines) : [];
    if (!lines || lines.length === 0) {
      lines = [{ description: inv.description || "Invoice " + inv.invoice_number, qty: 1, unit_price: inv.amount || 0 }];
    }
    const agent = allProfiles.find(a => a.id === inv.created_by);
    lines.forEach(l => {
      if (!l.description) return;
      const key = l.description;
      if (!productSales[key]) productSales[key] = {
        description: key,
        totalQty: 0, totalValue: 0, invoiceCount: 0,
        agentBreakdown: {}, dailySales: {}
      };
      const qty = parseFloat(l.qty) || 1;
      const val = qty * (parseFloat(l.unit_price) || 0);
      productSales[key].totalQty += qty;
      productSales[key].totalValue += val;
      productSales[key].invoiceCount += 1;
      const agentName = agent?.full_name || "Unknown";
      productSales[key].agentBreakdown[agentName] = (productSales[key].agentBreakdown[agentName] || 0) + qty;
      const day = inv.invoice_date || inv.created_at?.split("T")[0];
      if (day) productSales[key].dailySales[day] = (productSales[key].dailySales[day] || 0) + qty;
    });
  });

  const allProducts = Object.values(productSales).sort((a,b) => b.totalQty - a.totalQty);
  const selected = selectedProduct ? productSales[selectedProduct] : null;
  const maxQty = Math.max(...allProducts.map(p => p.totalQty), 1);

  return (
    <div>
      {/* Controls */}
      <div className="card" style={{ marginBottom: 18, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--text)" }}>🔍 Product Sales Tracker</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="fgrp">
            <label>Product / Description</label>
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
              <option value="">All Products</option>
              {allProducts.map(p => <option key={p.description} value={p.description}>{p.description}</option>)}
            </select>
          </div>
          <div className="fgrp">
            <label>Date From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setQuickRange("custom"); }} />
          </div>
          <div className="fgrp">
            <label>Date To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setQuickRange("custom"); }} />
          </div>
        </div>
        {/* Quick range buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["week","Last 7 Days"],["month","Last Month"],["quarter","Last Quarter"],["year","Last Year"],["all","All Time"]].map(([k,l]) => (
            <button key={k} onClick={() => setRange(k)} style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid " + (quickRange===k?"var(--blue)":"var(--border)"), background: quickRange===k?"var(--blue)":"var(--white)", color: quickRange===k?"#fff":"var(--text2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)", transition: "all .12s" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom: 18 }}>
        <div className="kpi" style={{ marginBottom: 0 }}>
          <div className="kpi-label">Products Sold</div>
          <div className="kpi-val" style={{ color: "var(--blue)" }}>{allProducts.length}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>unique items</div>
        </div>
        <div className="kpi" style={{ marginBottom: 0 }}>
          <div className="kpi-label">Total Units</div>
          <div className="kpi-val" style={{ color: "var(--purple)" }}>{allProducts.reduce((s,p)=>s+p.totalQty,0)}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>across all products</div>
        </div>
        <div className="kpi" style={{ marginBottom: 0 }}>
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-val tg">{fmt(allProducts.reduce((s,p)=>s+p.totalValue,0))}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>from product sales</div>
        </div>
        <div className="kpi" style={{ marginBottom: 0 }}>
          <div className="kpi-label">Invoices</div>
          <div className="kpi-val">{rangedInvoices.length}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>in date range</div>
        </div>
      </div>

      {/* Selected product detail */}
      {selected && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="ch">
            <div><div className="ct">📦 {selected.description}</div><div className="cs">{fmtDate(dateFrom)} — {fmtDate(dateTo)}</div></div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>Units Sold</div><div style={{ fontSize: 22, fontWeight: 800, color: "var(--blue)" }}>{selected.totalQty}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>Revenue</div><div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)" }}>{fmt(selected.totalValue)}</div></div>
            </div>
          </div>
          {/* Agent breakdown */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Sales by Agent</div>
            {Object.entries(selected.agentBreakdown).sort((a,b)=>b[1]-a[1]).map(([name, qty]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{name[0]?.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)" }}>{qty} units</span>
                  </div>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: Math.round((qty/selected.totalQty)*100)+"%", height: "100%", background: "var(--blue)", borderRadius: 3, transition: "width .5s var(--ease)" }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "var(--text3)", minWidth: 36 }}>{Math.round((qty/selected.totalQty)*100)}%</span>
              </div>
            ))}
          </div>
          {/* Daily sales mini chart */}
          {Object.keys(selected.dailySales).length > 1 && (
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Daily Sales</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
                {Object.entries(selected.dailySales).sort((a,b)=>a[0].localeCompare(b[0])).map(([day, qty]) => {
                  const maxDay = Math.max(...Object.values(selected.dailySales));
                  return (
                    <div key={day} title={fmtDate(day) + ": " + qty + " units"} style={{ flex: 1, background: "var(--blue)", borderRadius: "2px 2px 0 0", height: Math.max(4, Math.round((qty/maxDay)*56))+"px", opacity: 0.75, cursor: "pointer", transition: "opacity .1s" }} onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=.75} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All products table */}
      <div className="card">
        <div className="ch">
          <div><div className="ct">All Products — {fmtDate(dateFrom)} to {fmtDate(dateTo)}</div><div className="cs">{allProducts.length} products · {rangedInvoices.length} invoices</div></div>
        </div>
        {allProducts.length === 0 ? (
          <EmptyState icon="product" title="No sales data" sub="No products found for this date range. Try expanding the date range or selecting All Time." />
        ) : (
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}>
            <thead><tr><th>#</th><th>Product / Description</th><th>Units Sold</th><th>Revenue</th><th className="hm">Invoices</th><th className="hm">Avg/Invoice</th><th className="hm">Top Agent</th></tr></thead>
            <tbody>
              {allProducts.map((p, i) => (
                <tr key={p.description} style={{ cursor: "pointer", background: selectedProduct===p.description?"var(--blue-lt)":"transparent" }} onClick={() => setSelectedProduct(selectedProduct===p.description?"":p.description)}>
                  <td style={{ fontWeight: 700, color: "var(--text3)", fontSize: 12 }}>{i+1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.description}</div>
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 5, overflow: "hidden", maxWidth: 120 }}>
                      <div style={{ width: Math.round((p.totalQty/maxQty)*100)+"%", height: "100%", background: "var(--blue)", borderRadius: 2 }} />
                    </div>
                  </td>
                  <td><span className="mono" style={{ fontWeight: 800, color: "var(--blue)", fontSize: 15 }}>{p.totalQty}</span></td>
                  <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(p.totalValue)}</td>
                  <td className="hm mono" style={{ color: "var(--text2)" }}>{p.invoiceCount}</td>
                  <td className="hm mono" style={{ color: "var(--text2)" }}>{fmt(p.invoiceCount>0?p.totalValue/p.invoiceCount:0)}</td>
                  <td className="hm" style={{ fontSize: 12, color: "var(--text2)" }}>
                    {Object.entries(p.agentBreakdown).sort((a,b)=>b[1]-a[1])[0]?.[0]?.split(" ")[0] || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}


// ┌────────────────────────────────────────────────────────────┐
// │ AgentProductsReport                                        │
// │ Agent products breakdown report                            │
// └────────────────────────────────────────────────────────────┘
function AgentProductsReport({ invoices, allProfiles, period, filteredInv, periodLabels }) {
  const [selectedAgent, setSelectedAgent] = useState("all");

  // Include ALL invoices - even those not matching a profile
  const knownIds = new Set(allProfiles.map(a => a.id));
  const unknownInvs = filteredInv.filter(i => !knownIds.has(i.created_by));
  const profilesWithUnknown = unknownInvs.length > 0
    ? [...allProfiles, { id: "unknown", full_name: "Other / Unknown" }]
    : allProfiles;

  const agentData = profilesWithUnknown.map(agent => {
    const agentInvs = agent.id === "unknown"
      ? unknownInvs
      : filteredInv.filter(i => i.created_by === agent.id);
    const productMap = {};
    agentInvs.forEach(inv => {
      let lines = inv.lines ? (typeof inv.lines === "string" ? JSON.parse(inv.lines) : inv.lines) : [];
      // Fallback for old invoices with no lines - use invoice description or customer
      if (!lines || lines.length === 0) {
        lines = [{ description: inv.description || "Invoice " + inv.invoice_number, qty: 1, unit_price: inv.amount || 0 }];
      }
      lines.forEach(l => {
        if (!l.description) return;
        if (!productMap[l.description]) productMap[l.description] = { description: l.description, totalQty: 0, totalValue: 0, invoiceCount: 0 };
        productMap[l.description].totalQty += parseFloat(l.qty) || 1;
        productMap[l.description].totalValue += (parseFloat(l.qty)||1) * (parseFloat(l.unit_price)||0);
        productMap[l.description].invoiceCount += 1;
      });
    });
    const productLines = Object.values(productMap).sort((a,b) => b.totalValue - a.totalValue);
    return { agent, productLines, totalSales: agentInvs.reduce((s,i)=>s+i.amount,0), totalInvoices: agentInvs.length };
  }).filter(a => a.totalInvoices > 0).sort((a,b) => b.totalSales - a.totalSales);

  const globalProductMap = {};
  filteredInv.forEach(inv => {
    const agent = allProfiles.find(a => a.id === inv.created_by) || { full_name: "Other" };
    let lines = inv.lines ? (typeof inv.lines === "string" ? JSON.parse(inv.lines) : inv.lines) : [];
    if (!lines || lines.length === 0) lines = [{ description: inv.description || "Invoice " + inv.invoice_number, qty: 1, unit_price: inv.amount || 0 }];
    lines.forEach(l => {
      if (!l.description) return;
      if (!globalProductMap[l.description]) globalProductMap[l.description] = { description: l.description, totalQty: 0, totalValue: 0, agents: {} };
      globalProductMap[l.description].totalQty += parseFloat(l.qty)||0;
      globalProductMap[l.description].totalValue += (parseFloat(l.qty)||0)*(parseFloat(l.unit_price)||0);
      if (agent) globalProductMap[l.description].agents[agent.full_name] = (globalProductMap[l.description].agents[agent.full_name]||0) + (parseFloat(l.qty)||0);
    });
  });
  const globalProducts = Object.values(globalProductMap).sort((a,b) => b.totalValue - a.totalValue);
  const displayData = selectedAgent === "all" ? agentData : agentData.filter(d => d.agent.id === selectedAgent);

  return (
    <div>
      <div style={{ display:"flex",gap:12,alignItems:"flex-end",marginBottom:20,flexWrap:"wrap" }}>
        <div>
          <label style={{ fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",display:"block",marginBottom:5 }}>Filter by Agent</label>
          <select value={selectedAgent} onChange={e=>setSelectedAgent(e.target.value)} style={{ background:"var(--white)",border:"1px solid var(--border2)",borderRadius:"var(--r)",padding:"8px 14px",fontSize:13,fontFamily:"var(--sans)",outline:"none",minWidth:200 }}>
            <option value="all">All Agents</option>
            {allProfiles.map(a=><option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>
        <div style={{fontSize:12,color:"var(--text3)"}}>{filteredInv.length} invoices · {periodLabels[period]}</div>
      </div>

      {selectedAgent==="all" && globalProducts.length>0 && (
        <div className="card" style={{marginBottom:18}}>
          <div className="ch"><div><div className="ct">📦 Top Products — All Agents</div><div className="cs">Ranked by total sales value · {periodLabels[period]}</div></div></div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}>
            <thead><tr><th>#</th><th>Product / Description</th><th>Total Qty</th><th>Total Value</th><th className="hm">Top Sellers</th></tr></thead>
            <tbody>
              {globalProducts.slice(0,20).map((p,i)=>(
                <tr key={p.description}>
                  <td style={{fontWeight:700,color:"var(--text3)",fontSize:12}}>{i+1}</td>
                  <td style={{fontWeight:600}}>{p.description}</td>
                  <td className="mono" style={{fontWeight:700,color:"var(--blue)",fontSize:14}}>{p.totalQty}</td>
                  <td className="mono" style={{fontWeight:700,color:"var(--green)"}}>{fmt(p.totalValue)}</td>
                  <td className="hm" style={{fontSize:11,color:"var(--text2)"}}>{Object.entries(p.agents).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n,q])=>`${n.split(" ")[0]} (${q})`).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {displayData.length===0 && (
        <div className="card">
          <EmptyState icon="report" title="No product data yet" sub="Create new invoices with product line items and they will appear here" />
        </div>
      )}

      {displayData.map(({agent,productLines,totalSales,totalInvoices})=>(
        <div key={agent.id} className="card" style={{marginBottom:18}}>
          <div className="ch">
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0}}>{(agent.full_name||"U")[0].toUpperCase()}</div>
              <div>
                <div className="ct">{agent.full_name||"Unknown Agent"}</div>
                <div className="cs">{totalInvoices} invoice{totalInvoices!==1?"s":""} · {productLines.length} product{productLines.length!==1?"s":""} sold</div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:2}}>Total Sales</div>
              <div style={{fontSize:20,fontWeight:800,color:"var(--green)",letterSpacing:"-.4px"}}>{fmt(totalSales)}</div>
            </div>
          </div>
          {productLines.length>0 ? (
            <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}>
              <thead><tr><th>#</th><th>Product / Description</th><th>Qty Sold</th><th>Total Value</th><th className="hm">Invoices</th><th className="hm">Avg/Invoice</th></tr></thead>
              <tbody>
                {productLines.map((p,i)=>{
                  const maxQty = Math.max(...productLines.map(x=>x.totalQty),1);
                  return (
                    <tr key={p.description}>
                      <td style={{fontSize:12,color:"var(--text3)",fontWeight:600}}>{i+1}</td>
                      <td style={{fontWeight:600}}>{p.description}</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span className="mono" style={{fontWeight:700,color:"var(--blue)",fontSize:14,minWidth:30}}>{p.totalQty}</span>
                          <div style={{height:6,width:Math.max(12,Math.round((p.totalQty/maxQty)*80))+"px",background:"var(--blue)",borderRadius:3,opacity: 0.35}} />
                        </div>
                      </td>
                      <td className="mono" style={{fontWeight:700,color:"var(--green)"}}>{fmt(p.totalValue)}</td>
                      <td className="hm mono" style={{color:"var(--text2)"}}>{p.invoiceCount}</td>
                      <td className="hm mono" style={{color:"var(--text2)"}}>{fmt(p.invoiceCount > 0 ? p.totalValue/p.invoiceCount : 0)}</td>
                    </tr>
                  );
                })}
                <tr style={{background:"#f8fafd"}}>
                  <td colSpan={2} style={{fontWeight:700,fontSize:13}}>TOTAL</td>
                  <td className="mono" style={{fontWeight:700,color:"var(--blue)"}}>{productLines.reduce((s,p)=>s+p.totalQty,0)}</td>
                  <td className="mono" style={{fontWeight:700,color:"var(--green)"}}>{fmt(productLines.reduce((s,p)=>s+p.totalValue,0))}</td>
                  <td className="hm mono" style={{fontWeight:600}}>{totalInvoices}</td>
                  <td className="hm mono" style={{fontWeight:600}}>{fmt(totalInvoices > 0 ? totalSales/totalInvoices : 0)}</td>
                </tr>
              </tbody>
            </table></div>
          ) : (
            <div className="empty" style={{padding:24}}>No product line items saved on invoices for this agent in this period</div>
          )}
        </div>
      ))}
    </div>
  );
}


// ┌────────────────────────────────────────────────────────────┐
// │ AdminReports                                               │
// │ Full 13-tab reports suite                                  │
// └────────────────────────────────────────────────────────────┘
function AdminReports({ invoices, products, contacts, accounts, allProfiles }) {
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("month");
  const now = new Date();
  const filterByPeriod = (inv) => {
    const d = new Date(inv.invoice_date || inv.created_at);
    if (period === "week") return (now - d) < 7 * 86400000;
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "quarter") return Math.floor(d.getMonth()/3) === Math.floor(now.getMonth()/3) && d.getFullYear() === now.getFullYear();
    if (period === "year") return d.getFullYear() === now.getFullYear();
    return true;
  };
  const filteredInv = invoices.filter(filterByPeriod);
  const totalSales = filteredInv.reduce((s,i) => s+i.amount, 0);
  const totalPaid = filteredInv.filter(i=>i.status==="paid").reduce((s,i) => s+i.amount, 0);
  const totalPending = filteredInv.filter(i=>i.status==="pending").reduce((s,i) => s+i.amount, 0);
  const totalOverdue = filteredInv.filter(i=>i.status==="overdue").reduce((s,i) => s+i.amount, 0);
  const monthlySales = Array.from({length:12}, (_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-11+i, 1);
    const month = d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"});
    const invs = invoices.filter(inv => { const id = new Date(inv.invoice_date || inv.created_at); return id.getMonth()===d.getMonth() && id.getFullYear()===d.getFullYear(); });
    return { month, total: invs.reduce((s,i)=>s+i.amount,0), paid: invs.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0), count: invs.length };
  });
  const maxMonthly = Math.max(...monthlySales.map(m=>m.total), 1);
  const customerSales = contacts.filter(c=>c.type==="customer"||c.type==="both").map(c => ({ name: c.name, total: filteredInv.filter(i=>i.customer===c.name).reduce((s,i)=>s+i.amount,0), count: filteredInv.filter(i=>i.customer===c.name).length, paid: filteredInv.filter(i=>i.customer===c.name&&i.status==="paid").reduce((s,i)=>s+i.amount,0) })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
  const categories = [...new Set(products.map(p=>p.category||"General"))];
  const catData = categories.map(cat => ({ name: cat, products: products.filter(p=>(p.category||"General")===cat).length, stockValue: products.filter(p=>(p.category||"General")===cat).reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0), retailValue: products.filter(p=>(p.category||"General")===cat).reduce((s,p)=>s+(p.stock_qty||0)*(p.sale_price||0),0), lowStock: products.filter(p=>(p.category||"General")===cat && p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)).length })).sort((a,b)=>b.retailValue-a.retailValue);
  const totalStockValue = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0);
  const totalRetailValue = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.sale_price||0),0);
  const lowStockItems = products.filter(p=>p.stock_qty<=(p.reorder_level||DEFAULT_REORDER));
  const productSales = products.map(p => ({ ...p, stockValue: (p.stock_qty||0)*(p.cost_price||0), retailValue: (p.stock_qty||0)*(p.sale_price||0), margin: p.sale_price > 0 ? Math.round(((p.sale_price-p.cost_price)/p.sale_price)*100) : 0 })).sort((a,b)=>b.stockValue-a.stockValue);
  const periodLabels = { week:"This Week", month:"This Month", quarter:"This Quarter", year:"This Year", all:"All Time" };
  return (
    <div>
      <div className="ph">
        <div><div className="pt">Admin Reports</div><div className="psub">Comprehensive business analytics</div></div>
        <div style={{display:"flex",gap:6,background:"#f1f5f9",borderRadius:"var(--r)",padding:4}}>
          {[["week","Week"],["month","Month"],["quarter","Quarter"],["year","Year"],["all","All"]].map(([k,l]) => <button key={k} style={{padding:"5px 12px",borderRadius:6,border:"none",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"var(--sans)",background:period===k?"var(--white)":"transparent",color:period===k?"var(--text)":"var(--text3)",boxShadow:period===k?"var(--sh)":"none"}} onClick={()=>setPeriod(k)}>{l}</button>)}
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
      </div>
      {/* Tab bar — 2 rows */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
        {[["overview","📊 Overview"],["monthly","📅 Monthly"],["pl","📈 P&L"],["aged-debtors","💰 Aged Debtors"],["aged-creditors","🏦 Aged Creditors"],["cashflow","💵 Cash Flow"],["balance","⚖️ Balance Sheet"],["products","📦 Products"],["customers","👥 Customers"],["agents","🏆 Agents"],["stock","🏭 Stock"],["agent-products","📋 Agent Products"],["product-tracker","🔍 Product Tracker"]].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+(tab===k?"var(--blue)":"var(--border)"),background:tab===k?"var(--blue)":"var(--white)",color:tab===k?"#fff":"var(--text2)",fontSize:12,fontWeight:tab===k?600:400,cursor:"pointer",fontFamily:"var(--sans)",whiteSpace:"nowrap",transition:"all .12s"}}>{l}</button>
        ))}
      </div>
      {tab==="overview" && <div>
        <div className="kgrid">
          <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--blue-lt)"}}><span style={{color:"var(--blue)"}}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 7a4 4 0 0 0-8 0v9"/><path d="M6 17h12"/><path d="M6 13h8"/></svg></span></div><span className="kpi-badge" style={{background:"var(--blue-lt)",color:"#1e40af"}}>{periodLabels[period]}</span></div><div className="kpi-val">{fmt(totalSales)}</div><div className="kpi-label">Total Sales</div></div>
          <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--green-lt)"}}><span style={{color:"var(--green)"}}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span></div></div><div className="kpi-val tg">{fmt(totalPaid)}</div><div className="kpi-label">Collected</div></div>
          <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--amber-lt)"}}><span style={{color:"var(--amber)"}}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span></div></div><div className="kpi-val" style={{color:"var(--amber)"}}>{fmt(totalPending)}</div><div className="kpi-label">Pending</div></div>
          <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--red-lt)"}}><i className="ti ti-alert-circle" style={{color:"var(--red)"}} /></div></div><div className="kpi-val tr-c">{fmt(totalOverdue)}</div><div className="kpi-label">Overdue</div></div>
        </div>
        <div className="card">
          <div className="ch"><div className="ct">Monthly Sales — Last 12 Months</div></div>
          <div style={{padding:"20px 20px 8px"}}>
            <div style={{display:"flex",alignItems:"flex-end",gap:6,height:140,marginBottom:8}}>
              {monthlySales.map((m,i) => <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}><div style={{fontSize:9,color:"var(--text3)"}}>£{Math.round(m.total/1000)}k</div><div style={{width:"100%",background:"var(--blue)",borderRadius:"4px 4px 0 0",height:Math.max(4,(m.total/maxMonthly)*120)+"px",opacity: 0.85}} title={fmt(m.total)} /><div style={{fontSize:9,color:"var(--text3)"}}>{m.month}</div></div>)}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text2)",borderTop:"0.5px solid var(--border)",paddingTop:8}}>
              <span>Total: <strong>{fmt(monthlySales.reduce((s,m)=>s+m.total,0))}</strong></span>
              <span>Best: <strong>{monthlySales.reduce((a,b)=>a.total>b.total?a:b).month}</strong></span>
              <span>Avg: <strong>{fmt(monthlySales.reduce((s,m)=>s+m.total,0)/12)}</strong></span>
            </div>
          </div>
        </div>
      </div>}
      {tab==="monthly" && <div className="card"><div className="ch"><div className="ct">Monthly Sales</div><div className="cs">Last 12 months</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Month</th><th>Invoices</th><th>Total</th><th>Collected</th><th>Rate</th></tr></thead><tbody>{[...monthlySales].reverse().map(m => <tr key={m.month}><td style={{fontWeight:600}}>{m.month}</td><td className="mono">{m.count}</td><td className="mono" style={{fontWeight:600}}>{fmt(m.total)}</td><td className="mono tg">{fmt(m.paid)}</td><td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}><div style={{width:m.total>0?(m.paid/m.total*100)+"%":"0%",height:"100%",background:"var(--green)",borderRadius:3}} /></div><span style={{fontSize:12}}>{m.total>0?Math.round(m.paid/m.total*100):0}%</span></div></td></tr>)}</tbody></table></div></div>}
      {tab==="products" && <div>
        <div className="g3" style={{marginBottom:20}}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Products</div><div className="kpi-val">{products.length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Stock Value</div><div className="kpi-val">{fmt(totalStockValue)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Low Stock</div><div className="kpi-val tr-c">{lowStockItems.length}</div></div>
        </div>
        <div className="card"><div className="ch"><div className="ct">Full Product Report</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Cost</th><th>Sale</th><th>Margin</th><th>Value</th><th>Status</th></tr></thead><tbody>{productSales.map(p => <tr key={p.id}><td style={{fontWeight:500}}>{p.name}</td><td className="mono" style={{fontSize:11,color:"var(--text3)"}}>{p.code||"—"}</td><td><span className="tag" style={{fontSize:10}}>{p.category||"General"}</span></td><td className="mono">{p.stock_qty||0} {p.unit}</td><td className="mono">{fmt(p.cost_price)}</td><td className="mono">{fmt(p.sale_price)}</td><td><span style={{color:p.margin>30?"var(--green)":p.margin>15?"var(--amber)":"var(--red)",fontWeight:600,fontSize:12}}>{p.margin}%</span></td><td className="mono">{fmt(p.stockValue)}</td><td><span className={"badge "+(p.stock_qty<=p.reorder_level?"b-red":p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)*2?"b-amber":"b-green")} style={{fontSize:10}}>{p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)?"Low":"OK"}</span></td></tr>)}</tbody></table></div></div>
      </div>}
      {tab==="customers" && <div className="card"><div className="ch"><div className="ct">Customer Sales</div><div className="cs">{periodLabels[period]} · {customerSales.length} customers</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>#</th><th>Customer</th><th>Invoices</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>{customerSales.slice(0,50).map((c,i) => <tr key={c.name}><td style={{color:"var(--text3)",fontSize:12}}>{i+1}</td><td style={{fontWeight:500}}>{c.name}</td><td className="mono">{c.count}</td><td className="mono" style={{fontWeight:600}}>{fmt(c.total)}</td><td className="mono tg">{fmt(c.paid)}</td><td className="mono" style={{color:c.total-c.paid>0?"var(--red)":"var(--green)"}}>{fmt(c.total-c.paid)}</td></tr>)}{customerSales.length===0&&<tr><td colSpan={6} className="empty">No sales data</td></tr>}</tbody></table></div></div>}
      {tab==="agents" && <div className="card"><div className="ch"><div className="ct">Agent Performance — {periodLabels[period]}</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>#</th><th>Agent</th><th>Invoices</th><th>Total</th><th>Collected</th><th>Pending</th></tr></thead><tbody>{[...allProfiles].sort((a,b) => filteredInv.filter(i=>i.created_by===b.id).reduce((s,i)=>s+i.amount,0) - filteredInv.filter(i=>i.created_by===a.id).reduce((s,i)=>s+i.amount,0)).map((agent,i) => { const agInv = filteredInv.filter(i=>i.created_by===agent.id); const agTotal=agInv.reduce((s,i)=>s+i.amount,0); const agPaid=agInv.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0); const medals=["🥇","🥈","🥉"]; return <tr key={agent.id}><td><span style={{fontSize:16}}>{medals[i]||i+1}</span></td><td><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{(agent.full_name||"U")[0].toUpperCase()}</div><span style={{fontWeight:600}}>{agent.full_name||"Unknown"}</span></div></td><td className="mono">{agInv.length}</td><td className="mono" style={{fontWeight:600,color:"var(--green)"}}>{fmt(agTotal)}</td><td className="mono tg">{fmt(agPaid)}</td><td className="mono" style={{color:"var(--amber)"}}>{fmt(agTotal-agPaid)}</td></tr>; })}</tbody></table></div></div>}
      {tab==="pl" && (() => {
        const revenue = filteredInv.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0);
        const vat = filteredInv.filter(i=>i.status==="paid").reduce((s,i)=>s+(i.vat_total||0),0);
        const netRevenue = revenue - vat;
        const cogs = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0);
        const grossProfit = netRevenue - cogs;
        const grossMargin = netRevenue > 0 ? Math.round((grossProfit/netRevenue)*100) : 0;
        const expenses = accounts.filter(a=>a.type==="Expense").reduce((s,a)=>s+a.balance,0);
        const netProfit = grossProfit - expenses;
        const netMargin = netRevenue > 0 ? Math.round((netProfit/netRevenue)*100) : 0;
        return (
          <div>
            <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom:20 }}>
              {[{l:"Net Revenue",v:fmt(netRevenue),c:"var(--blue)"},{l:"Gross Profit",v:fmt(grossProfit),c:"var(--green)"},{l:"Net Profit",v:fmt(netProfit),c:netProfit>=0?"var(--green)":"var(--red)"},{l:"Net Margin",v:netMargin+"%",c:netProfit>=0?"var(--green)":"var(--red)"}].map(k=>(
                <div key={k.l} className="kpi" style={{marginBottom:0}}><div className="kpi-label">{k.l}</div><div className="kpi-val" style={{color:k.c}}>{k.v}</div></div>
              ))}
            </div>
            <div className="card">
              <div className="ch"><div className="ct">Profit & Loss Statement</div><div className="cs">{periodLabels[period]}</div></div>
              <div className="rs-title">Revenue</div>
              <div className="rrow"><span>Gross Sales</span><span className="mono">{fmt(revenue)}</span></div>
              <div className="rrow indent"><span>Less: VAT</span><span className="mono tr-c">({fmt(vat)})</span></div>
              <div className="rrow subtotal"><span>Net Revenue</span><span className="mono">{fmt(netRevenue)}</span></div>
              <div className="rs-title">Cost of Goods Sold</div>
              <div className="rrow"><span>Stock Cost Value</span><span className="mono tr-c">({fmt(cogs)})</span></div>
              <div className="rrow subtotal"><span style={{fontWeight:700}}>Gross Profit</span><span className="mono tg">{fmt(grossProfit)}</span></div>
              <div className="rrow indent"><span style={{color:"var(--text3)"}}>Gross Margin</span><span style={{color:"var(--green)",fontWeight:600}}>{grossMargin}%</span></div>
              <div className="rs-title">Operating Expenses</div>
              {accounts.filter(a=>a.type==="Expense").map(a=>(<div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tr-c">({fmt(a.balance)})</span></div>))}
              <div className="rrow subtotal"><span>Total Expenses</span><span className="mono tr-c">({fmt(expenses)})</span></div>
              <div className="rrow total"><span style={{color:netProfit>=0?"var(--green)":"var(--red)"}}>Net {netProfit>=0?"Profit":"Loss"}</span><span className="mono" style={{color:netProfit>=0?"var(--green)":"var(--red)"}}>{fmt(Math.abs(netProfit))}</span></div>
              <div className="rrow indent"><span style={{color:"var(--text3)"}}>Net Margin</span><span style={{color:netProfit>=0?"var(--green)":"var(--red)",fontWeight:600}}>{netMargin}%</span></div>
            </div>
          </div>
        );
      })()}

      {tab==="aged-debtors" && (() => {
        const nowD = new Date();
        const unpaidInv = invoices.filter(i=>i.status!=="paid"&&i.status!=="draft"&&i.status!=="cancelled");
        const age = inv => Math.floor((nowD - new Date(inv.due_date||inv.invoice_date)) / 86400000);
        const buckets = [
          {label:"Current",    color:"var(--green)", invs: unpaidInv.filter(i=>age(i)<=0)},
          {label:"1–30 days",  color:"var(--amber)", invs: unpaidInv.filter(i=>age(i)>0&&age(i)<=30)},
          {label:"31–60 days", color:"#f97316",      invs: unpaidInv.filter(i=>age(i)>30&&age(i)<=60)},
          {label:"61–90 days", color:"var(--red)",   invs: unpaidInv.filter(i=>age(i)>60&&age(i)<=90)},
          {label:"90+ days",   color:"#7f1d1d",      invs: unpaidInv.filter(i=>age(i)>90)},
        ];
        const total = unpaidInv.reduce((s,i)=>s+i.amount,0);
        const customerBuckets = [...new Set(unpaidInv.map(i=>i.customer))].map(cust=>({
          name:cust,
          current:buckets[0].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+i.amount,0),
          d30:buckets[1].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+i.amount,0),
          d60:buckets[2].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+i.amount,0),
          d90:buckets[3].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+i.amount,0),
          d90p:buckets[4].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+i.amount,0),
          total:unpaidInv.filter(i=>i.customer===cust).reduce((s,i)=>s+i.amount,0),
        })).sort((a,b)=>b.total-a.total);
        return (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
              {buckets.map(b=>(
                <div key={b.label} className="kpi" style={{marginBottom:0}}>
                  <div className="kpi-label" style={{fontSize:11}}>{b.label}</div>
                  <div className="kpi-val" style={{color:b.color,fontSize:18}}>{fmt(b.invs.reduce((s,i)=>s+i.amount,0))}</div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>{b.invs.length} invoice{b.invs.length!==1?"s":""}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="ch"><div className="ct">Aged Debtors Report</div><div className="cs">Total outstanding: {fmt(total)}</div></div>
              <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}>
                <thead><tr><th>Customer</th><th>Current</th><th>1–30 Days</th><th className="hm">31–60 Days</th><th className="hm">61–90 Days</th><th className="hm">90+ Days</th><th>Total</th></tr></thead>
                <tbody>
                  {customerBuckets.map(c=>(<tr key={c.name}><td style={{fontWeight:600}}>{c.name}</td><td className="mono" style={{color:"var(--green)"}}>{c.current>0?fmt(c.current):"—"}</td><td className="mono" style={{color:"var(--amber)"}}>{c.d30>0?fmt(c.d30):"—"}</td><td className="mono hm" style={{color:"#f97316"}}>{c.d60>0?fmt(c.d60):"—"}</td><td className="mono hm" style={{color:"var(--red)"}}>{c.d90>0?fmt(c.d90):"—"}</td><td className="mono hm" style={{color:"#7f1d1d"}}>{c.d90p>0?fmt(c.d90p):"—"}</td><td className="mono" style={{fontWeight:700,color:"var(--red)"}}>{fmt(c.total)}</td></tr>))}
                  {customerBuckets.length===0&&<tr><td colSpan={7} className="empty">No outstanding invoices 🎉</td></tr>}
                </tbody>
              </table></div>
            </div>
          </div>
        );
      })()}

      {tab==="aged-creditors" && (() => {
        const suppliers = contacts.filter(c=>c.type==="supplier"||c.type==="both");
        const supplierAccounts = accounts.filter(a=>a.type==="Liability"||a.type==="Payable");
        const totalOwed = supplierAccounts.reduce((s,a)=>s+a.balance,0);
        return (
          <div>
            <div className="g3" style={{marginBottom:20}}>
              <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Suppliers</div><div className="kpi-val">{suppliers.length}</div></div>
              <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Owed</div><div className="kpi-val tr-c">{fmt(totalOwed)}</div></div>
              <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Liability Accounts</div><div className="kpi-val">{supplierAccounts.length}</div></div>
            </div>
            <div className="card">
              <div className="ch"><div className="ct">Aged Creditors Report</div><div className="cs">What you owe suppliers</div></div>
              <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}>
                <thead><tr><th>Supplier / Account</th><th>Type</th><th>Balance Owed</th><th>Status</th></tr></thead>
                <tbody>
                  {supplierAccounts.map(a=>(<tr key={a.id}><td style={{fontWeight:600}}>{a.name}</td><td><span className="tag" style={{fontSize:10}}>{a.type}</span></td><td className="mono" style={{fontWeight:700,color:"var(--red)"}}>{fmt(a.balance)}</td><td><span className={"badge "+(a.balance>0?"b-red":"b-green")}>{a.balance>0?"Outstanding":"Clear"}</span></td></tr>))}
                  {suppliers.filter(s=>!supplierAccounts.find(a=>a.name===s.name)).map(s=>(<tr key={s.id}><td style={{fontWeight:600}}>{s.name}</td><td><span className="tag" style={{fontSize:10}}>Supplier</span></td><td className="mono" style={{color:"var(--text3)"}}>£0.00</td><td><span className="badge b-green">Clear</span></td></tr>))}
                  {supplierAccounts.length===0&&suppliers.length===0&&<tr><td colSpan={4} className="empty">No supplier data</td></tr>}
                </tbody>
              </table></div>
            </div>
          </div>
        );
      })()}

      {tab==="cashflow" && (() => {
        const cfMonths = Array.from({length:6},(_,i)=>{
          const d = new Date(new Date().getFullYear(), new Date().getMonth()-5+i, 1);
          const lbl = d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"});
          const inflow = invoices.filter(inv=>{const id=new Date(inv.invoice_date||inv.created_at);return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear()&&inv.status==="paid";}).reduce((s,i)=>s+i.amount,0);
          const pending = invoices.filter(inv=>{const id=new Date(inv.invoice_date||inv.created_at);return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear()&&inv.status!=="paid";}).reduce((s,i)=>s+i.amount,0);
          const exp = accounts.filter(a=>a.type==="Expense").reduce((s,a)=>s+a.balance/12,0);
          return {lbl, inflow, pending, expenses:Math.round(exp), net:inflow-Math.round(exp)};
        });
        const totalInflow = cfMonths.reduce((s,m)=>s+m.inflow,0);
        const totalExp = cfMonths.reduce((s,m)=>s+m.expenses,0);
        const totalNet = totalInflow - totalExp;
        const maxVal = Math.max(...cfMonths.map(m=>Math.max(m.inflow,m.expenses)),1);
        return (
          <div>
            <div className="g3" style={{marginBottom:20}}>
              <div className="kpi" style={{marginBottom:0,"--kpi-accent":"var(--green)"}}><div className="kpi-label">6-Month Inflow</div><div className="kpi-val tg">{fmt(totalInflow)}</div></div>
              <div className="kpi" style={{marginBottom:0,"--kpi-accent":"var(--red)"}}><div className="kpi-label">6-Month Expenses</div><div className="kpi-val tr-c">{fmt(totalExp)}</div></div>
              <div className="kpi" style={{marginBottom:0,"--kpi-accent":totalNet>=0?"var(--green)":"var(--red)"}}><div className="kpi-label">Net Cash Flow</div><div className="kpi-val" style={{color:totalNet>=0?"var(--green)":"var(--red)"}}>{fmt(totalNet)}</div></div>
            </div>
            <div className="card">
              <div className="ch"><div className="ct">Cash Flow — Last 6 Months</div></div>
              <div style={{padding:"20px",display:"flex",alignItems:"flex-end",gap:10,height:160}}>
                {cfMonths.map((m,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
                    <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",justifyContent:"center"}}>
                      <div style={{flex:1,background:"var(--green)",borderRadius:"3px 3px 0 0",height:Math.max(4,(m.inflow/maxVal)*120)+"px",opacity: 0.85}} />
                      <div style={{flex:1,background:"var(--red)",borderRadius:"3px 3px 0 0",height:Math.max(4,(m.expenses/maxVal)*120)+"px",opacity:0.7}} />
                    </div>
                    <div style={{fontSize:9,color:"var(--text3)",marginTop:4}}>{m.lbl}</div>
                  </div>
                ))}
              </div>
              <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}>
                <thead><tr><th>Month</th><th>Cash In</th><th>Pending</th><th>Expenses</th><th>Net</th></tr></thead>
                <tbody>
                  {cfMonths.map(m=>(<tr key={m.lbl}><td style={{fontWeight:600}}>{m.lbl}</td><td className="mono tg">{fmt(m.inflow)}</td><td className="mono" style={{color:"var(--amber)"}}>{fmt(m.pending)}</td><td className="mono tr-c">{fmt(m.expenses)}</td><td className="mono" style={{fontWeight:700,color:m.net>=0?"var(--green)":"var(--red)"}}>{fmt(m.net)}</td></tr>))}
                  <tr style={{background:"#f8fafd",fontWeight:700}}><td>TOTAL</td><td className="mono tg">{fmt(totalInflow)}</td><td className="mono" style={{color:"var(--amber)"}}>{fmt(cfMonths.reduce((s,m)=>s+m.pending,0))}</td><td className="mono tr-c">{fmt(totalExp)}</td><td className="mono" style={{color:totalNet>=0?"var(--green)":"var(--red)"}}>{fmt(totalNet)}</td></tr>
                </tbody>
              </table></div>
            </div>
          </div>
        );
      })()}

      {tab==="balance" && (() => {
        const bAssets = accounts.filter(a=>a.type==="Asset");
        const bLiabilities = accounts.filter(a=>a.type==="Liability"||a.type==="Payable");
        const bEquity = accounts.filter(a=>a.type==="Equity");
        const totalAssets = bAssets.reduce((s,a)=>s+a.balance,0);
        const totalLiab = bLiabilities.reduce((s,a)=>s+a.balance,0);
        const totalEq = bEquity.reduce((s,a)=>s+a.balance,0);
        const stockVal = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0);
        const debtors = invoices.filter(i=>i.status!=="paid"&&i.status!=="draft").reduce((s,i)=>s+i.amount,0);
        const totalAssetsCalc = totalAssets + stockVal + debtors;
        const netWorth = totalAssetsCalc - totalLiab;
        return (
          <div>
            <div className="g3" style={{marginBottom:20}}>
              <div className="kpi" style={{marginBottom:0,"--kpi-accent":"var(--blue)"}}><div className="kpi-label">Total Assets</div><div className="kpi-val" style={{color:"var(--blue)"}}>{fmt(totalAssetsCalc)}</div></div>
              <div className="kpi" style={{marginBottom:0,"--kpi-accent":"var(--red)"}}><div className="kpi-label">Total Liabilities</div><div className="kpi-val tr-c">{fmt(totalLiab)}</div></div>
              <div className="kpi" style={{marginBottom:0,"--kpi-accent":netWorth>=0?"var(--green)":"var(--red)"}}><div className="kpi-label">Net Worth</div><div className="kpi-val" style={{color:netWorth>=0?"var(--green)":"var(--red)"}}>{fmt(netWorth)}</div></div>
            </div>
            <div className="g2" style={{marginBottom:0}}>
              <div className="card" style={{marginBottom:0}}>
                <div className="ch"><div className="ct" style={{color:"var(--blue)"}}>Assets</div><div className="cs">{fmt(totalAssetsCalc)}</div></div>
                <div className="rs-title">Current Assets</div>
                {bAssets.map(a=><div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono">{fmt(a.balance)}</span></div>)}
                <div className="rrow indent"><span>Stock Inventory</span><span className="mono">{fmt(stockVal)}</span></div>
                <div className="rrow indent"><span>Trade Debtors</span><span className="mono">{fmt(debtors)}</span></div>
                <div className="rrow subtotal"><span>Total Assets</span><span className="mono" style={{color:"var(--blue)"}}>{fmt(totalAssetsCalc)}</span></div>
              </div>
              <div className="card" style={{marginBottom:0}}>
                <div className="ch"><div className="ct" style={{color:"var(--red)"}}>Liabilities & Equity</div></div>
                <div className="rs-title">Liabilities</div>
                {bLiabilities.length>0?bLiabilities.map(a=><div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tr-c">{fmt(a.balance)}</span></div>):<div className="rrow indent"><span style={{color:"var(--text3)"}}>None recorded</span><span>—</span></div>}
                <div className="rrow subtotal"><span>Total Liabilities</span><span className="mono tr-c">{fmt(totalLiab)}</span></div>
                <div className="rs-title">Equity</div>
                {bEquity.map(a=><div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono">{fmt(a.balance)}</span></div>)}
                <div className="rrow indent"><span>Retained Earnings</span><span className="mono" style={{color:netWorth>=0?"var(--green)":"var(--red)"}}>{fmt(netWorth)}</span></div>
                <div className="rrow total"><span>Total Equity</span><span className="mono tg">{fmt(totalEq+netWorth)}</span></div>
              </div>
            </div>
          </div>
        );
      })()}

      {tab==="stock" && <div>
        <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom:20 }}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Products</div><div className="kpi-val">{products.length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Cost Value</div><div className="kpi-val">{fmt(totalStockValue)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Retail Value</div><div className="kpi-val tg">{fmt(totalRetailValue)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Potential Profit</div><div className="kpi-val" style={{color:"var(--purple)"}}>{fmt(totalRetailValue-totalStockValue)}</div></div>
        </div>
        {lowStockItems.length > 0 && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct" style={{color:"var(--red)"}}>⚠️ Low Stock — {lowStockItems.length} items</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Product</th><th>In Stock</th><th>Reorder At</th><th>Est. Cost to Restock</th></tr></thead><tbody>{lowStockItems.map(p => <tr key={p.id}><td style={{fontWeight:500}}>{p.name}</td><td className="mono tr-c" style={{fontWeight:600}}>{p.stock_qty}</td><td className="mono">{p.reorder_level}</td><td className="mono">{fmt(Math.max(0,p.reorder_level*2-p.stock_qty)*p.cost_price)}</td></tr>)}</tbody></table></div></div>}
        <div className="card"><div className="ch"><div className="ct">Stock by Category</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}><thead><tr><th>Category</th><th>Products</th><th>Cost Value</th><th>Retail Value</th><th>Margin</th><th>Low Stock</th></tr></thead><tbody>{catData.map(c => <tr key={c.name}><td style={{fontWeight:600}}>{c.name}</td><td className="mono">{c.products}</td><td className="mono">{fmt(c.stockValue)}</td><td className="mono tg">{fmt(c.retailValue)}</td><td><span style={{color:c.stockValue>0&&Math.round((c.retailValue-c.stockValue)/c.retailValue*100)>30?"var(--green)":"var(--amber)",fontWeight:600,fontSize:12}}>{c.stockValue>0?Math.round((c.retailValue-c.stockValue)/c.retailValue*100):0}%</span></td><td>{c.lowStock>0?<span className="badge b-red">{c.lowStock}</span>:<span className="badge b-green">✓</span>}</td></tr>)}</tbody></table></div></div>
      </div>}
      {tab === "agent-products" && <AgentProductsReport invoices={invoices} allProfiles={allProfiles} period={period} filteredInv={period === "month" && filteredInv.length === 0 ? invoices : filteredInv} periodLabels={periodLabels} />}
      {tab === "product-tracker" && <ProductSalesTracker invoices={invoices} products={products} allProfiles={allProfiles} />}
    </div>
  );
}

// ── DELIVERY NOTES ────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ DeliveryNotes                                              │
// │ Create, print and email delivery notes                     │
// └────────────────────────────────────────────────────────────┘
function DeliveryNotes({ contacts, products, token, userId }) {
  const [dns, setDNs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ customer_id: "", delivery_date: today(), delivery_address: "", notes: "", driver: "" });
  const [lines, setLines] = useState([{ product_id: "", description: "", qty: 1, unit: "unit" }]);

  useEffect(() => {
    sb.get(token, "delivery_notes", "order=created_at.desc")
      .then(d => Array.isArray(d) && setDNs(d));
  }, [token]);

  const customers = contacts.filter(c => c.type === "customer" || c.type === "both");

  const updateLine = (i, field, val) => {
    const next = [...lines];
    if (field === "product_id") {
      const p = products.find(x => x.id === val);
      next[i] = { ...next[i], product_id: val, description: p?.name || "", unit: p?.unit || "unit" };
    } else {
      next[i] = { ...next[i], [field]: val };
    }
    setLines(next);
  };

  const save = async () => {
    if (!f.customer_id) return;
    setSaving(true);
    const existing = await sb.get(token, "delivery_notes", "select=id");
    const count = Array.isArray(existing) ? existing.length + 1 : 1;
    const dn_number = `DN-${String(count).padStart(4, "0")}`;
    const cust = customers.find(c => c.id === f.customer_id);
    const data = await sb.post(token, "delivery_notes", {
      dn_number, customer_name: cust?.name, customer_id: f.customer_id,
      delivery_date: f.delivery_date, delivery_address: f.delivery_address || cust?.address || "",
      notes: f.notes, driver: f.driver, status: "pending",
      lines: JSON.stringify(lines), created_by: userId
    });
    if (data[0]) { setDNs(prev => [{ ...data[0], lines }, ...prev]); logAudit(token, userId, "delivery_created", "delivery_note", data[0].id, `${dn_number} created for ${cust?.name}${f.driver ? ' · Driver: ' + f.driver : ''}`); }
    setF({ customer_id: "", delivery_date: today(), delivery_address: "", notes: "", driver: "" });
    setLines([{ product_id: "", description: "", qty: 1, unit: "unit" }]);
    setShowForm(false);
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    await sb.patch(token, "delivery_notes", id, { status });
    setDNs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const printDN = (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const html = `<!DOCTYPE html><html><head><title>${dn.dn_number}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;font-size:12px;padding:16mm;color:#0f172a}
      .header{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #0f172a}
      .co-name{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px}
      .co-detail{font-size:10px;color:#64748b;line-height:1.7}
      .dn-title{font-size:32px;font-weight:900;color:#e2e8f0;text-align:right;letter-spacing:-1px}
      .dn-num{font-size:15px;font-weight:700;text-align:right;color:#0f172a}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
      .meta-box{background:#f8fafc;padding:14px;border-radius:6px;border:1px solid #e2e8f0}
      .meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
      .meta-val{font-size:13px;font-weight:600;color:#0f172a}
      .meta-val.large{font-size:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      thead tr{background:#0f172a;color:#fff}
      th{padding:10px 12px;font-size:10px;font-weight:600;text-transform:uppercase;text-align:left;letter-spacing:0.5px}
      td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px}
      tr:nth-child(even) td{background:#fafbfc}
      .qty-col{text-align:center;font-weight:700;font-size:14px}
      .sig-section{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0}
      .sig-box{border-bottom:1.5px solid #0f172a;height:50px;margin-bottom:6px}
      .sig-lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px}
      .footer{margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}
      .status-badge{display:inline-block;background:#f1f5f9;border:1.5px solid #0f172a;border-radius:4px;padding:3px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
    </style></head><body>
    <div class="header">
      <div>
        <div class="co-name">${COMPANY.name}</div>
        <div class="co-detail">${COMPANY.address}<br>${COMPANY.city}, ${COMPANY.postcode}<br>Tel: ${COMPANY.phone}<br>${COMPANY.email}</div>
      </div>
      <div style="text-align:right">
        <div class="dn-title">DELIVERY NOTE</div>
        <div class="dn-num">${dn.dn_number}</div>
        <div class="status-badge" style="margin-top:8px">${dn.status?.toUpperCase() || "PENDING"}</div>
      </div>
    </div>
    <div class="meta">
      <div class="meta-box">
        <div class="meta-lbl">Deliver To</div>
        <div class="meta-val large">${dn.customer_name}</div>
        ${dn.delivery_address ? "<div style=\"font-size:11px;color:#64748b;margin-top:4px;line-height:1.6\">" + dn.delivery_address.replace(/\n/g, "<br>") + "</div>" : ""}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="meta-box"><div class="meta-lbl">DN Number</div><div class="meta-val">${dn.dn_number}</div></div>
        <div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${fmtDate(dn.delivery_date)}</div></div>
        ${dn.driver ? "<div class=\"meta-box\" style=\"grid-column:1/-1\"><div class=\"meta-lbl\">Driver / Courier</div><div class=\"meta-val\">" + dn.driver + "</div></div>" : ""}
      </div>
    </div>
    <table>
      <thead><tr><th style="width:50%">Description</th><th>Unit</th><th style="text-align:center">Qty Ordered</th><th style="text-align:center">Qty Delivered</th><th style="text-align:center">Condition</th></tr></thead>
      <tbody>
        ${dnLines.map(l => "<tr><td style=\"font-weight:600\">" + (l.description || "—") + "</td><td style=\"color:#64748b\">" + (l.unit || "unit") + "</td><td class=\"qty-col\">" + l.qty + "</td><td class=\"qty-col\" style=\"color:#94a3b8\">____</td><td style=\"text-align:center;color:#94a3b8\">____</td></tr>").join("")}


      </tbody>
    </table>
    ${dn.notes ? "<div style=\"background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:12px;margin-bottom:20px\"><div style=\"font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;margin-bottom:4px\">Delivery Notes</div><div style=\"font-size:12px;color:#78350f\">" + dn.notes + "</div></div>" : ""}
    <div class="sig-section">
      <div>
        <div class="sig-box"></div>
        <div class="sig-lbl">Delivered by (Signature & Name)</div>
      </div>
      <div>
        <div class="sig-box"></div>
        <div class="sig-lbl">Received by (Signature, Name & Date)</div>
      </div>
    </div>
    <div class="footer">
      <span>${COMPANY.name} · ${COMPANY.vatNumber}</span>
      <span>Printed: ${new Date().toLocaleDateString("en-GB")}</span>
      <span>${dn.dn_number}</span>
    </div>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dn.dn_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendWhatsApp = (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const msg = encodeURIComponent(
      `*Delivery Note — ${COMPANY.name}*\n\n` +
      `DN: *${dn.dn_number}*\n` +
      (dn.invoice_ref ? `Invoice Ref: ${dn.invoice_ref}\n` : "") +
      `Customer: ${dn.customer_name}\n` +
      `Date: ${fmtDate(dn.delivery_date)}\n` +
      (dn.driver ? `Driver: ${dn.driver}\n` : "") +
      (dn.delivery_address ? `Address: ${dn.delivery_address}\n` : "") +
      `\n*Items:*\n` +
      dnLines.map(l => `• ${l.description} — Qty: ${l.qty} ${l.unit || "unit"}`).join("\n") +
      (dn.notes ? `\n\n📋 Instructions: ${dn.notes}` : "") +
      `\n\nPlease confirm receipt. Thank you! 🙏\n${COMPANY.phone}`
    );
    const cust = contacts.find(c => c.name === dn.customer_name);
    const phone = (cust?.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    else window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const sendEmail = (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const cust = contacts.find(c => c.name === dn.customer_name);
    const subject = encodeURIComponent(`Delivery Note ${dn.dn_number} — ${COMPANY.name}`);
    const body = encodeURIComponent(
      `Dear ${dn.customer_name},\n\nPlease find your delivery note details below.\n\n` +
      `Delivery Note: ${dn.dn_number}\n` +
      (dn.invoice_ref ? `Invoice Reference: ${dn.invoice_ref}\n` : "") +
      `Date: ${fmtDate(dn.delivery_date)}\n` +
      (dn.driver ? `Driver: ${dn.driver}\n` : "") +
      (dn.delivery_address ? `Delivery Address: ${dn.delivery_address}\n` : "") +
      `\nItems:\n` +
      dnLines.map(l => `• ${l.description} — Qty: ${l.qty} ${l.unit || "unit"}`).join("\n") +
      (dn.notes ? `\n\nInstructions: ${dn.notes}` : "") +
      `\n\nPlease sign and return a copy upon receipt.\n\n${COMPANY.name}\n${COMPANY.phone}\n${COMPANY.email}`
    );
    window.open(`mailto:${cust?.email || ""}?subject=${subject}&body=${body}`);
  };

  return (
    <div>
      <div className="ph">
        <div><div className="pt">Delivery Notes</div><div className="psub">Create and manage delivery notes</div></div>
        <button className="btn bp" onClick={() => setShowForm(!showForm)}><i className="ti ti-plus" />New Delivery Note</button>
      </div>

      {/* Summary KPIs */}
      <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom: 20 }}>
        {[
          { label: "Total", val: dns.length, color: "var(--text)" },
          { label: "Pending", val: dns.filter(d => d.status === "pending").length, color: "var(--amber)" },
          { label: "In Transit", val: dns.filter(d => d.status === "in_transit").length, color: "var(--blue)" },
          { label: "Delivered", val: dns.filter(d => d.status === "delivered").length, color: "var(--green)" },
        ].map(k => (
          <div key={k.label} className="kpi" style={{ marginBottom: 0 }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="ch"><div className="ct">New Delivery Note</div><button className="btn bo bsm" onClick={() => setShowForm(false)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Cancel</button></div>
          <div className="fg">
            <div className="fgrp">
              <label>Customer *</label>
              <select value={f.customer_id} onChange={e => {
                const cust = customers.find(c => c.id === e.target.value);
                setF({ ...f, customer_id: e.target.value, delivery_address: [cust?.address, cust?.city, cust?.postcode].filter(Boolean).join(", ") });
              }}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="fgrp"><label>Delivery Date</label><input type="date" value={f.delivery_date} onChange={e => setF({ ...f, delivery_date: e.target.value })} /></div>
            <div className="fgrp"><label>Driver / Courier</label><input value={f.driver} onChange={e => setF({ ...f, driver: e.target.value })} placeholder="e.g. John Smith or DPD" /></div>
            <div className="fgrp"><label>Delivery Address</label><input value={f.delivery_address} onChange={e => setF({ ...f, delivery_address: e.target.value })} placeholder="Auto-filled from customer" /></div>
            <div className="fgrp full"><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Special delivery instructions..." /></div>
          </div>

          {/* Line items */}
          <div style={{ borderTop: "0.5px solid var(--border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 30px", gap: 10, padding: "10px 18px", background: "#fafbfc", borderBottom: "0.5px solid var(--border)" }}>
              {["Product / Description", "Qty", "Unit", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</span>)}
            </div>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 30px", gap: 10, alignItems: "center", padding: "10px 18px", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <select className="il-input" value={l.product_id} onChange={e => updateLine(i, "product_id", e.target.value)}>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input className="il-input" placeholder="Or type description..." value={l.description} onChange={e => updateLine(i, "description", e.target.value)} />
                </div>
                <input type="number" className="il-input mono" value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} />
                <select className="il-input" value={l.unit} onChange={e => updateLine(i, "unit", e.target.value)}>
                  <option>unit</option><option>pack</option><option>box</option><option>kg</option><option>litre</option><option>pallet</option><option>carton</option>
                </select>
                <button className="ib" onClick={() => lines.length > 1 ? setLines(lines.filter((_, j) => j !== i)) : setLines([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
            ))}
            <div style={{ padding: "12px 18px", background: "#fafbfc", borderTop: "0.5px solid var(--border)" }}>
              <button className="btn bo bsm" onClick={() => setLines([...lines, { product_id: "", description: "", qty: 1, unit: "unit" }])}><i className="ti ti-plus" />Add Item</button>
            </div>
          </div>
          <div className="ff">
            <button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn bp" onClick={save} disabled={saving || !f.customer_id}>{saving ? "Saving..." : "Create Delivery Note"}</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:580}}>
          <thead><tr><th>DN #</th><th>Customer</th><th className="hm">Date</th><th className="hm">Driver</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {dns.map(dn => {
              const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
              return (
                <tr key={dn.id}>
                  <td className="mono" style={{ color: "var(--blue)", fontSize: 12, fontWeight: 600 }}>{dn.dn_number}</td>
                  <td style={{ fontWeight: 500 }}>{dn.customer_name}</td>
                  <td className="hm" style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(dn.delivery_date)}</td>
                  <td className="hm" style={{ fontSize: 12, color: "var(--text2)" }}>{dn.driver || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }}>{dnLines.length} item{dnLines.length !== 1 ? "s" : ""}</td>
                  <td>
                    <select
                      style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "4px 8px", fontSize: 11, outline: "none", cursor: "pointer" }}
                      value={dn.status || "pending"}
                      onChange={e => updateStatus(dn.id, e.target.value)}>
                      <option value="pending">⏳ Pending</option>
                      <option value="in_transit">🚚 In Transit</option>
                      <option value="delivered">✅ Delivered</option>
                      <option value="failed">❌ Failed</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn bo bsm" onClick={() => printDN(dn)}><i className="ti ti-file-download" />Download</button>
                      <button className="btn bo bsm" onClick={() => sendEmail(dn)}><i className="ti ti-mail" />Email</button>
                      <button className="btn bwa bsm" onClick={() => sendWhatsApp(dn)}><i className="ti ti-brand-whatsapp" />WhatsApp</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {dns.length === 0 && <tr><td colSpan={7}><EmptyState icon="delivery" title="No delivery notes yet" sub="Create a delivery note after generating an invoice" /></td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}


// ── AI ASSISTANT ──────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ AIAssistant                                                │
// │ AI chat assistant — hover to open, local smart responses   │
// └────────────────────────────────────────────────────────────┘
function AIAssistant({ invoices, contacts, products, accounts, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I am your LedgerOS AI assistant. Ask me anything about your invoices, customers, stock or finances." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const q = userMsg.toLowerCase();

    let reply = "";
    if (q.includes("owe") || q.includes("most money") || q.includes("outstanding") || q.includes("unpaid")) {
      const byCustomer = invoices.filter(i => i.status !== "paid").reduce((acc, i) => { acc[i.customer] = (acc[i.customer]||0) + i.amount; return acc; }, {});
      const sorted = Object.entries(byCustomer).sort((a,b) => b[1]-a[1]);
      reply = sorted.length > 0
        ? "Top customers with outstanding balances:\n\n" + sorted.slice(0,5).map(([name,amt],i) => (i+1) + ". " + name + " - " + fmt(amt)).join("\n") + "\n\nTotal outstanding: " + fmt(sorted.reduce((s,[,a])=>s+a,0))
        : "No outstanding invoices at the moment.";
    } else if (q.includes("overdue")) {
      const ov = invoices.filter(i => i.status === "overdue");
      reply = ov.length > 0
        ? "You have " + ov.length + " overdue invoice" + (ov.length>1?"s":"") + ":\n\n" + ov.map(i => "- " + i.customer + " - " + fmt(i.amount) + " (" + i.invoice_number + ")").join("\n")
        : "No overdue invoices.";
    } else if (q.includes("low stock") || q.includes("running low") || q.includes("stock")) {
      const low = products.filter(p => p.stock_qty <= (p.reorder_level || DEFAULT_REORDER));
      reply = low.length > 0
        ? low.length + " products low on stock:\n\n" + low.map(p => "- " + p.name + " - " + p.stock_qty + " " + (p.unit||"units") + " remaining").join("\n")
        : "All products are well stocked.";
    } else if (q.includes("revenue") || q.includes("total") || q.includes("sales") || q.includes("made")) {
      const paid = invoices.filter(i => i.status==="paid").reduce((s,i)=>s+i.amount,0);
      const pending = invoices.filter(i=>i.status==="pending").reduce((s,i)=>s+i.amount,0);
      reply = "Revenue Summary:\n\nCollected: " + fmt(paid) + "\nPending: " + fmt(pending) + "\nTotal invoiced: " + fmt(paid+pending) + "\nTotal invoices: " + invoices.length;
    } else if (q.includes("customer") || q.includes("top") || q.includes("best")) {
      const top = Object.entries(invoices.reduce((acc,i)=>{ acc[i.customer]=(acc[i.customer]||0)+i.amount; return acc; },{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
      reply = top.length > 0
        ? "Top customers by spend:\n\n" + top.map(([name,amt],i)=>(i+1)+". "+name+" - "+fmt(amt)).join("\n")
        : "No customer data yet.";
    } else if (q.includes("paid") || q.includes("collected")) {
      const paidInv = invoices.filter(i=>i.status==="paid");
      reply = "Paid invoices: " + paidInv.length + "\nTotal collected: " + fmt(paidInv.reduce((s,i)=>s+i.amount,0));
    } else if (q.includes("product") || q.includes("inventory")) {
      reply = "You have " + products.length + " products.\n\nTop by price:\n" + products.sort((a,b)=>(b.sale_price||0)-(a.sale_price||0)).slice(0,5).map(p=>"- "+p.name+" - "+fmt(p.sale_price||0)).join("\n");
    } else {
      reply = "I can help you with:\n\n- Who owes the most money?\n- Show overdue invoices\n- Which products are low on stock?\n- What is my total revenue?\n- Who are my top customers?";
    }

    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  const suggestions = ["Who owes the most money?", "Which products are low on stock?", "What is my total revenue?", "Show overdue invoices"];

  return (
    <>
    <div style={{ width: 360, height: 520, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 20, boxShadow: "var(--sh3)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "scaleIn .2s var(--ease) both", transformOrigin: "bottom right", outline: "none" }}>
      <div style={{ padding: "14px 16px", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, outline: "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}>
          <span style={{ color: "#fff", display: "flex", pointerEvents: "none" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg></span>
        </div>
        <div style={{ flex: "1" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>AI Assistant</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>Live business data</div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12, outline: "none" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}>
                <span style={{ color: "#fff", display: "flex", pointerEvents: "none" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg></span>
              </div>
            )}
            <div style={{ maxWidth: "80%", padding: "10px 13px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "var(--blue)" : "#f4f6f9", color: msg.role === "user" ? "#fff" : "var(--text)", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ padding: "8px 14px" }}>
            <span style={{ fontSize: 13, color: "var(--text3)" }}>Thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{ padding: "0 14px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)} style={{ padding: "5px 10px", background: "var(--blue-lt)", border: "1px solid var(--blue-mid)", borderRadius: 20, fontSize: 11, color: "var(--blue)", cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 500, whiteSpace: "nowrap" }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0, outline: "none" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask anything about your business..."
          style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", fontSize: 13, fontFamily: "var(--sans)", outline: "none", color: "var(--text)", background: "#f8fafd" }}
        />
        <button onClick={send} disabled={!input.trim() || loading} style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: "var(--blue)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="ti ti-send" style={{ fontSize: 15, color: "#fff" }} />
        </button>
      </div>
    </div>
  </>
  );
}


// ── NAV CONFIG ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "ti-home" },
  { id: "invoices", label: "Invoices", icon: "ti-file-invoice" },
  { id: "contacts", label: "Customers", icon: "ti-users" },
  { id: "inventory", label: "Inventory", icon: "ti-package" },
  { id: "purchases", label: "Purchases", icon: "ti-shopping-cart", adminOnly: true },
  { id: "credits", label: "Credits", icon: "ti-receipt-refund", adminOnly: true },
  { id: "reports", label: "P&L", icon: "ti-chart-bar", adminOnly: true },
  { id: "analytics", label: "Analytics", icon: "ti-trending-up", adminOnly: true },
  { id: "admin-reports", label: "Reports", icon: "ti-report-money", adminOnly: true },
  { id: "statement", label: "Statements", icon: "ti-user-check", adminOnly: true },
  { id: "stock-adj", label: "Stock In/Out", icon: "ti-adjustments", adminOnly: true },
  { id: "agent-report", label: "Agent Sales", icon: "ti-report-analytics", adminOnly: true },
  { id: "import", label: "Import", icon: "ti-upload", adminOnly: true },
  { id: "delivery-notes", label: "Delivery Notes", icon: "ti-truck-delivery" },
  { id: "settings", label: "Settings", icon: "ti-settings", adminOnly: true },
];

const MOBILE_NAV = [
  { id: "dashboard", label: "Home", icon: "ti-home" },
  { id: "invoices", label: "Invoices", icon: "ti-file-invoice" },
  { id: "contacts", label: "Contacts", icon: "ti-users" },
  { id: "inventory", label: "Stock", icon: "ti-package" },
  { id: "analytics", label: "Analytics", icon: "ti-trending-up" },
];

// ── APP ───────────────────────────────────────────────────────────────────────
// ── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("LedgerOS Error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:16,fontFamily:"sans-serif",color:"#333" }}>
          <i className="ti ti-alert-triangle" style={{ fontSize:48,color:"#ef4444" }} />
          <div style={{ fontSize:20,fontWeight:600 }}>Something went wrong</div>
          <div style={{ fontSize:14,color:"#666",maxWidth:400,textAlign:"center" }}>{this.state.error?.message || "An unexpected error occurred."}</div>
          <button style={{ padding:"10px 20px",background:"#2563eb",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14 }} onClick={() => this.setState({ hasError:false, error:null })}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [pendingInvoiceView, setPendingInvoiceView] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ledgeros_dark") === "1");
  const toggleDark = () => { const n = !darkMode; setDarkMode(n); localStorage.setItem("ledgeros_dark", n?"1":"0"); document.documentElement.setAttribute("data-theme", n?"dark":"light"); };
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCmdK, setShowCmdK] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_notifs") || "[]"); } catch { return []; }
  });
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showMobMore, setShowMobMore] = useState(false);
  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setShowInstallBanner(false); }
  };

  const [realtimeStatus, setRealtimeStatus] = useState("connecting"); // connecting | live | offline

  useEffect(() => {
    if (!auth) return; setLoading(true);
    // Step 1: fetch profile FIRST to know the role before fetching invoices
    sb.get(auth.token, "profiles", `id=eq.${auth.user.id}`).then(async profs => {
      const userProfile = Array.isArray(profs) && profs[0] ? profs[0] : null;
      // Re-validate approval on every data load (catches revoked access while logged in)
      if (userProfile && userProfile.role !== "admin" && userProfile.approved !== true) {
        setAuth(null);
        return;
      }
      if (userProfile) setProfile(userProfile);
      // isAdmin: check role OR if profile is missing assume admin
      const isAdmin = !userProfile || userProfile?.role === "admin" || userProfile?.role === "manager";
      const invQuery = isAdmin
        ? "order=created_at.desc&limit=1000"
        : `created_by=eq.${auth.user?.id}&order=created_at.desc`;
      // Step 2: now fetch everything else with correct invoice filter
      const [accs, invs, cnts, prods, allProfs] = await Promise.all([
        sb.get(auth.token, "accounts", "order=code.asc"),
        sb.get(auth.token, "invoices", invQuery),
        sb.get(auth.token, "contacts", "order=name.asc"),
        sb.get(auth.token, "products", "order=name.asc"),
        sb.get(auth.token, "profiles", "order=full_name.asc"),
      ]);
      if (Array.isArray(accs)) setAccounts(accs);
      if (Array.isArray(invs)) {
        if (isAdmin) {
          setInvoices(invs);
        } else {
          setInvoices(invs.filter(i => i.created_by === auth.user?.id));
        }
      }
      if (Array.isArray(cnts)) setContacts(cnts);
      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(allProfs)) setAllProfiles(allProfs);
      setLoading(false);
    });
  }, [auth]);

  // ── Auto-reminder disabled — triggered manually via Send Reminder button ─────
  // useEffect auto-reminder removed to prevent login hang

  // ── Auto-refresh invoices every 5 seconds ────────────────────────────────
  useEffect(() => {
    if (!auth) return;
    const poll = setInterval(() => {
      if (document.hidden) return;
      const adminRoles = ["admin", "manager"];
      const isAdminPoll = !profile || adminRoles.includes(profile?.role);
      const invQuery = isAdminPoll
        ? "order=created_at.desc&limit=1000"
        : `created_by=eq.${auth.user?.id}&order=created_at.desc`;
      sb.get(auth.token, "invoices", invQuery).then(freshInvs => {
        if (Array.isArray(freshInvs)) {
          setInvoices(isAdminPoll ? freshInvs : freshInvs.filter(i => i.created_by === auth.user?.id));
        }
      });
    }, 3000);
    return () => clearInterval(poll);
  }, [auth, profile]);

  // ── Supabase Real-time Subscriptions ─────────────────────────────────────
  useEffect(() => {
    if (!auth) return;
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const wsUrl = SUPABASE_URL.replace("https://", "wss://") + "/realtime/v1/websocket?apikey=" + SUPABASE_KEY + "&vsn=1.0.0";

    let ws;
    let heartbeat;
    let reconnectTimer;
    let isAlive = true;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setRealtimeStatus("live");
          // Join realtime channels for invoices and products
          const joinInvoices = JSON.stringify({ topic: "realtime:public:invoices", event: "phx_join", payload: { config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [{ event: "*", schema: "public", table: "invoices" }] } }, ref: "1" });
          const joinProducts = JSON.stringify({ topic: "realtime:public:products", event: "phx_join", payload: { config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [{ event: "*", schema: "public", table: "products" }] } }, ref: "2" });
          ws.send(joinInvoices);
          ws.send(joinProducts);
          // Heartbeat every 25s
          heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" }));
            }
          }, 25000);
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            const payload = msg.payload;
            if (!payload?.data) return;
            const { eventType, record, old_record } = payload.data;
            const table = payload.data?.schema === "public" ? msg.topic?.split(":")?.[2] : null;

            if (msg.topic === "realtime:public:invoices") {
              if (eventType === "INSERT") {
                // Short delay so invoice_lines are also written before we refetch
                setTimeout(() => {
                  const adminRoles = ["admin", "manager"];
                  const isAdm = !profile || adminRoles.includes(profile?.role);
                  const q = isAdm ? "order=created_at.desc&limit=1000" : `created_by=eq.${auth.user?.id}&order=created_at.desc`;
                  sb.get(auth.token, "invoices", q).then(fresh => {
                    if (Array.isArray(fresh)) setInvoices(fresh);
                  });
                }, 800);
              } else if (eventType === "UPDATE") {
                setInvoices(prev => prev.map(i => i.id === record.id ? { ...i, ...record } : i));
              } else if (eventType === "DELETE") {
                setInvoices(prev => prev.filter(i => i.id !== old_record?.id));
              }
            }

            if (msg.topic === "realtime:public:products") {
              if (eventType === "INSERT") {
                setProducts(prev => {
                  if (prev.find(p => p.id === record.id)) return prev;
                  return [...prev, record].sort((a,b) => a.name.localeCompare(b.name));
                });
              } else if (eventType === "UPDATE") {
                setProducts(prev => prev.map(p => p.id === record.id ? { ...p, ...record } : p));
              } else if (eventType === "DELETE") {
                setProducts(prev => prev.filter(p => p.id !== old_record?.id));
              }
            }
          } catch(err) { /* ignore parse errors */ }
        };

        ws.onclose = () => {
          setRealtimeStatus("offline");
          clearInterval(heartbeat);
          if (isAlive) reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          setRealtimeStatus("offline");
          ws.close();
        };
      } catch(e) {
        setRealtimeStatus("offline");
        if (isAlive) reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      isAlive = false;
      clearInterval(heartbeat);
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [auth]);

  const signOut = async () => { await sb.signOut(auth.token); setAuth(null); };

  // Cmd+K global keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCmdK(v => !v);
      }
      if (e.key === "Escape") setShowCmdK(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Show onboarding for new users (first login)
  useEffect(() => {
    if (auth && !loading) {
      const seen = localStorage.getItem("ledgeros_onboarded");
      if (!seen) {
        setTimeout(() => setShowOnboarding(true), 800);
        localStorage.setItem("ledgeros_onboarded", "1");
      }
    }
  }, [auth, loading]);
  const initials = (profile?.full_name||auth?.user?.email||"U")[0]?.toUpperCase();

  if (!auth) return <><style>{CSS}</style><Auth onAuth={setAuth} /></>;

  // ── Mobile PWA install banner rendered inline in JSX ──────────────────────

  return (
    <>
      <style>{CSS}</style>
      <div className={"app" + (darkMode ? " dark-mode" : "")}>
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <rect x="10" y="13" width="28" height="3" rx="1.5" fill="#818cf8"/>
                <rect x="10" y="20" width="20" height="3" rx="1.5" fill="#818cf8" fillOpacity=".6"/>
                <rect x="10" y="27" width="24" height="3" rx="1.5" fill="#818cf8" fillOpacity=".35"/>
                <rect x="30" y="21" width="2.5" height="14" rx="1.25" fill="#60a5fa"/>
                <polygon points="36,27 30,21 30,35" fill="#60a5fa" fillOpacity=".4"/>
              </svg>
            </div>
            <div>
              <div className="logo-text">LedgerOS</div>
              <div className="logo-sub">Arkham Retail Ltd</div>
            </div>
          </div>
          <div className="nav-section">
            <div className="nav-label">Main</div>
            {NAV.slice(0,5).map(n => <div key={n.id} className={"nav-item "+(page===n.id?"active":"")} onClick={() => setPage(n.id)}><i className={"ti "+n.icon} />{n.label}{n.id==="invoices"&&invoices.filter(i=>i.status==="overdue").length>0&&<span className="nav-badge">{invoices.filter(i=>i.status==="overdue").length}</span>}</div>)}
          </div>
          <div className="nav-section">
            <div className="nav-label">Finance</div>
            {NAV.slice(5).filter(n => !n.adminOnly || profile?.role === "admin" || profile?.role === "manager").map(n => <div key={n.id} className={"nav-item "+(page===n.id?"active":"")} onClick={() => setPage(n.id)}><i className={"ti "+n.icon} />{n.label}</div>)}
          </div>
          <div className="nav-bottom">
            {/* Dark mode + version */}
            <div style={{ padding: "6px 12px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "4px 0" }} onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("ledgeros_dark", next?"1":"0"); }}>
                <i className={"ti " + (darkMode ? "ti-sun" : "ti-moon")} style={{ color: "rgba(255,255,255,.35)", fontSize: 14 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)", fontWeight: 500 }}>{darkMode ? "Light mode" : "Dark mode"}</span>
              </div>
              <span className="version-badge">v2.1</span>
            </div>
            <div className="user-row">
              <div className="user-av">{initials}</div>
              <div><div className="user-name">{profile?.full_name||auth.user.email}</div><div className="user-role">{profile?.role||"agent"}</div></div>
              <button className="signout-btn" onClick={signOut} title="Sign out"><i className="ti ti-logout" /></button>
            </div>
          </div>
        </aside>
        <div className="main">
          <div className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 16 }} className="hm">
<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, background: "#1e1b4b", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                    <rect x="10" y="13" width="28" height="3" rx="1.5" fill="#818cf8"/>
                    <rect x="10" y="20" width="20" height="3" rx="1.5" fill="#818cf8" fillOpacity=".6"/>
                    <rect x="10" y="27" width="24" height="3" rx="1.5" fill="#818cf8" fillOpacity=".35"/>
                    <rect x="30" y="21" width="2.5" height="12" rx="1.25" fill="#60a5fa"/>
                    <polygon points="36,26 30,21 30,33" fill="#60a5fa" fillOpacity=".4"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="search-wrap topbar-search" style={{ position: "relative" }}>
              <i className="ti ti-search" />
              <input
                className="search-input"
                placeholder="Search invoices, customers, products..."
                value={globalSearch}
                onChange={e => { setGlobalSearch(e.target.value); setShowSearchResults(e.target.value.length > 0); }}
                onFocus={e => { if (globalSearch.length > 0) setShowSearchResults(true); else e.currentTarget.closest('.search-wrap').querySelector('.search-hints')?.style && (e.currentTarget.closest('.search-wrap').querySelector('.search-hints').style.display = 'flex'); }}
                onBlur={e => { setTimeout(() => { setShowSearchResults(false); const h = e.currentTarget.closest('.search-wrap')?.querySelector('.search-hints'); if (h) h.style.display = 'none'; }, 200); }}
              />
              <div className="search-hints" style={{ display: "none", position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rl)", boxShadow: "var(--sh2)", padding: "10px 12px", zIndex: 200, gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text3)", marginRight: 4 }}>Try:</span>
                {["overdue", "pending", "low stock", "paid"].map(hint => (
                  <button key={hint} onMouseDown={() => { setGlobalSearch(hint); setShowSearchResults(true); }} style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text2)", fontSize: 12, cursor: "pointer", fontFamily: "var(--sans)", transition: "all .12s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.color = "var(--blue)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}>{hint}</button>
                ))}
              </div>
              {showSearchResults && globalSearch.length > 0 && (() => {
                const q = globalSearch.toLowerCase();
                // Natural language patterns
                const isOverdue = q.includes("overdue") || q.includes("late") || q.includes("unpaid");
                const isPaid = q.includes("paid") || q.includes("collected");
                const isLowStock = q.includes("low stock") || q.includes("running low") || q.includes("out of");
                const isCustomer = q.includes("customer") || q.includes("client");
                const isProduct = q.includes("product") || q.includes("stock") || q.includes("inventory");
                const isPending = q.includes("pending") || q.includes("outstanding") || q.includes("owe");
                
                let invResults = [];
                if (isOverdue) invResults = invoices.filter(i => i.status === "overdue").slice(0, 5);
                else if (isPaid) invResults = invoices.filter(i => i.status === "paid").slice(0, 4);
                else if (isPending) invResults = invoices.filter(i => i.status === "pending" || i.status === "overdue").slice(0, 4);
                else invResults = invoices.filter(i => i.customer?.toLowerCase().includes(q) || i.invoice_number?.toLowerCase().includes(q)).slice(0, 4);

                let custResults = [];
                if (!isProduct && !isOverdue) custResults = contacts.filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || (isCustomer && (c.type === "customer" || c.type === "both"))).slice(0, 3);

                let prodResults = [];
                if (isLowStock) prodResults = products.filter(p => p.stock_qty <= (p.reorder_level || DEFAULT_REORDER)).slice(0, 4);
                else if (isProduct || !isOverdue) prodResults = products.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 3);
                const total = invResults.length + custResults.length + prodResults.length;
                return (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rl)", boxShadow: "var(--sh3)", zIndex: 200, overflow: "hidden", minWidth: 360 }}>
                    {total === 0 && <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text3)" }}>No results for "{globalSearch}"</div>}
                    {invResults.length > 0 && <>
                      <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", borderBottom: "1px solid var(--border)", background: "#f8fafd" }}>Invoices</div>
                      {invResults.map(inv => (
                        <div key={inv.id} onMouseDown={() => { setPage("invoices"); setPendingInvoiceView(inv); setGlobalSearch(""); setShowSearchResults(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f0f3f8", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background="#f8fafd"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--blue-lt)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: "var(--blue)", fontSize: 13 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{inv.customer}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>{inv.invoice_number} · {new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(inv.amount||0)}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: inv.status==="paid"?"var(--green-lt)":inv.status==="overdue"?"var(--red-lt)":"var(--amber-lt)", color: inv.status==="paid"?"var(--green-dk)":inv.status==="overdue"?"var(--red-dk)":"var(--amber-dk)" }}>{inv.status}</span>
                        </div>
                      ))}
                    </>}
                    {custResults.length > 0 && <>
                      <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", borderBottom: "1px solid var(--border)", background: "#f8fafd" }}>Customers</div>
                      {custResults.map(c => (
                        <div key={c.id} onMouseDown={() => { setPage("contacts"); setGlobalSearch(""); setShowSearchResults(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f0f3f8", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background="#f8fafd"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][c.name?.charCodeAt(0)%5]||"#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{c.name?.[0]?.toUpperCase()}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.email || c.phone || c.type}</div>
                          </div>
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>→ Contacts</span>
                        </div>
                      ))}
                    </>}
                    {prodResults.length > 0 && <>
                      <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", borderBottom: "1px solid var(--border)", background: "#f8fafd" }}>Products</div>
                      {prodResults.map(p => (
                        <div key={p.id} onMouseDown={() => { setPage("inventory"); setGlobalSearch(""); setShowSearchResults(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f0f3f8", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background="#f8fafd"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--purple-lt)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: "var(--purple)", fontSize: 13 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>{p.stock_qty} {p.unit||"units"} · {new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p.sale_price||0)}</div>
                          </div>
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>→ Inventory</span>
                        </div>
                      ))}
                    </>}
                    <div style={{ padding: "8px 16px", fontSize: 11, color: "var(--text3)", background: "#f8fafd", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{total} result{total !== 1 ? "s" : ""} for "{globalSearch}"</span>
                      <span style={{ color: "var(--blue)", fontWeight: 500 }}>Try: "overdue", "low stock", "pending"</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="topbar-right">
              <span className="tb-role hm">{profile?.role||"agent"}</span>
              {/* Live status dot */}
              <div title={realtimeStatus==="live"?"Real-time connected":"Reconnecting..."} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: realtimeStatus==="live" ? "var(--green-lt)" : "var(--amber-lt)", border: `1px solid ${realtimeStatus==="live" ? "#86efac" : "#fcd34d"}`, cursor: "default" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: realtimeStatus==="live" ? "var(--green)" : "var(--amber)", animation: realtimeStatus==="live" ? "pulse 2s ease-in-out infinite" : "none" }} />
                <span className="hm" style={{ fontSize: 10, fontWeight: 600, color: realtimeStatus==="live" ? "var(--green-dk)" : "var(--amber-dk)" }}>{realtimeStatus==="live" ? "Live" : "Syncing..."}</span>
              </div>
              {(() => {
                const notifs = [
                  ...invoices.filter(i=>i.status==="overdue").map(i=>({ id:"ov-"+i.id, type:"overdue", icon:"ti-alert-circle", color:"var(--red)", bg:"var(--red-lt)", title:"Overdue Invoice", body:`${i.customer} — ${fmt(i.amount)} overdue`, action:()=>setPage("invoices") })),
                  ...products.filter(p=>p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)).map(p=>({ id:"ls-"+p.id, type:"lowstock", icon:"ti-package-off", color:"var(--amber)", bg:"var(--amber-lt)", title:"Low Stock Alert", body:`${p.name} — only ${p.stock_qty} ${p.unit||"units"} left`, action:()=>setPage("inventory") })),
                  ...invoices.filter(i=>i.status==="paid").slice(0,3).map(i=>({ id:"pd-"+i.id, type:"paid", icon:"ti-circle-check", color:"var(--green)", bg:"var(--green-lt)", title:"Payment Received", body:`${i.customer} paid ${fmt(i.amount)}`, action:()=>setPage("invoices") })),
                ].filter(n=>!dismissedNotifs.includes(n.id));
                const unread = notifs.length;
                return (
                  <div style={{position:"relative"}}>
                    <div className={"tb-btn"+(unread>0?" tb-notif":"")} onClick={()=>setShowNotifications(v=>!v)} style={{cursor:"pointer"}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      {unread>0&&<span style={{position:"absolute",top:-4,right:-4,background:"var(--red)",color:"#fff",fontSize:9,fontWeight:700,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--white)"}}>{unread>9?"9+":unread}</span>}
                    </div>
                    {showNotifications && (
                      <div style={{position:"absolute",top:"calc(100% + 10px)",right:0,width:340,background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--rxl)",boxShadow:"var(--sh3)",zIndex:300,overflow:"hidden",animation:"scaleIn .15s var(--ease) both",transformOrigin:"top right"}}>
                        <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{fontWeight:700,fontSize:14}}>Notifications</div>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            {notifs.length>0&&<button onClick={()=>{const ids=notifs.map(n=>n.id);setDismissedNotifs(prev=>{const next=[...prev,...ids];localStorage.setItem("dismissed_notifs",JSON.stringify(next));return next;});}} style={{fontSize:11,color:"var(--text3)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--sans)"}}>Clear all</button>}
                            <button onClick={()=>setShowNotifications(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",fontSize:16,display:"flex",alignItems:"center"}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                          </div>
                        </div>
                        <div style={{maxHeight:400,overflowY:"auto"}}>
                          {notifs.length===0?(
                            <div style={{padding:"32px 16px",textAlign:"center",color:"var(--text3)"}}>
                              <i className="ti ti-bell-check" style={{fontSize:32,display:"block",marginBottom:8,opacity: 0.4}} />
                              <div style={{fontSize:13}}>All caught up!</div>
                            </div>
                          ):notifs.map(n=>(
                            <div key={n.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 16px",borderBottom:"1px solid #f0f3f8",cursor:"pointer",transition:"background .1s"}} onClick={()=>{n.action();setShowNotifications(false);}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafd"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                              <div style={{width:34,height:34,borderRadius:9,background:n.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                <i className={"ti "+n.icon} style={{color:n.color,fontSize:16}} />
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{n.title}</div>
                                <div style={{fontSize:12,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.body}</div>
                              </div>
                              <button onClick={e=>{e.stopPropagation();setDismissedNotifs(prev=>{const next=[...prev,n.id];localStorage.setItem("dismissed_notifs",JSON.stringify(next));return next;});}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",padding:4,fontSize:14,flexShrink:0,display:"flex",alignItems:"center"}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                            </div>
                          ))}
                        </div>
                        {notifs.length>0&&(
                          <div style={{padding:"10px 16px",background:"#f8fafd",borderTop:"1px solid var(--border)",fontSize:11,color:"var(--text3)",textAlign:"center"}}>
                            {unread} alert{unread!==1?"s":""} · Click to navigate · Dismiss to clear
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="tb-btn" onClick={() => setShowOnboarding(true)} title="Getting started guide"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg></div>
              <div className="tb-btn" onClick={() => setPage("settings")} title="Settings"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
              <button onClick={async () => {
                if (!showActivity && profile?.role !== "admin" && profile?.role !== "manager") return;
                setShowActivity(v => {
                  if (!v) {
                    setLoadingAudit(true);
                    fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/audit_log?order=created_at.desc&limit=50`, {
                      headers: { "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY, "Authorization": `Bearer ${auth.token}` }
                    }).then(r=>r.json()).then(d=>{ setAuditLog(Array.isArray(d)?d:[]); setLoadingAudit(false); }).catch(()=>setLoadingAudit(false));
                  }
                  return !v;
                });
              }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--r)", border: "none", cursor: "pointer", background: showActivity ? "linear-gradient(135deg,#059669,#10b981)" : "linear-gradient(135deg,#ecfdf5,#d1fae5)", color: showActivity ? "#fff" : "var(--green)", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, transition: "all .15s" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                <span className="hm">Activity</span>
              </button>
              <button onMouseEnter={() => setShowAI(true)} onClick={() => setShowAI(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--r)", border: "none", cursor: "pointer", background: showAI ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : "linear-gradient(135deg,#eff4ff,#f5f3ff)", color: showAI ? "#fff" : "var(--blue)", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, transition: "all .15s", boxShadow: showAI ? "0 2px 8px rgba(99,102,241,.35)" : "none" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                <span className="hm">AI</span>
              </button>
              <div className="tb-av">{initials}</div>
            </div>
          </div>
          <div className="content">
            {loading ? (
              <div style={{ padding: "24px 28px" }}>
                {/* Skeleton KPI cards */}
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "18px 20px", boxShadow: "var(--sh)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                      <div className="skel" style={{ width: 38, height: 38, borderRadius: 10 }} />
                      <div className="skel" style={{ width: 60, height: 22, borderRadius: 20 }} />
                    </div>
                    <div className="skel" style={{ width: "55%", height: 24, marginBottom: 8 }} />
                    <div className="skel" style={{ width: "40%", height: 13 }} />
                  </div>)}
                </div>
                {/* Skeleton table */}
                <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rl)", overflow: "hidden", boxShadow: "var(--sh)" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                    <div className="skel" style={{ width: 140, height: 16 }} />
                    <div className="skel" style={{ width: 90, height: 30, borderRadius: "var(--r)" }} />
                  </div>
                  <SkeletonTable rows={6} cols={5} />
                </div>
              </div>
            ) : (
              <>
                {page==="dashboard"&&<Dashboard accounts={accounts} invoices={invoices} setInvoices={setInvoices} contacts={contacts} products={products} profile={profile} setPage={setPage} allProfiles={allProfiles} token={auth.token} />}
                {page==="invoices"&&<Invoices invoices={invoices} setInvoices={setInvoices} contacts={contacts} products={products} token={auth.token} userId={auth.user.id} profile={profile} pendingInvoiceView={pendingInvoiceView} onClearPending={() => setPendingInvoiceView(null)} />}
                {page==="contacts"&&<Contacts contacts={contacts} setContacts={setContacts} token={auth.token} userId={auth.user.id} invoices={invoices} />}
                {page==="inventory"&&<Inventory products={products} setProducts={setProducts} token={auth.token} userId={auth.user.id} />}
                {page==="purchases"&&<Purchases contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
                {page==="credits"&&<CreditNotes contacts={contacts} invoices={invoices} token={auth.token} userId={auth.user.id} />}
                {page==="reports"&&<Reports accounts={accounts} />}
                {page==="analytics"&&<Analytics invoices={invoices} products={products} contacts={contacts} />}
                {page==="import"&&<div style={{padding:40,textAlign:"center",color:"var(--text3)"}}><span style={{fontSize:40,display:"block",marginBottom:12}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></span><div style={{fontSize:16,fontWeight:600,marginBottom:6}}>CSV Import</div><div style={{fontSize:13}}>Coming soon — import contacts and products from CSV</div></div>}
                {page==="statement"&&<CustomerStatement contacts={contacts} invoices={invoices} token={auth.token} />}
                {page==="admin-reports"&&<AdminReports invoices={invoices} products={products} contacts={contacts} accounts={accounts} allProfiles={allProfiles} />}
                {page==="stock-adj"&&<StockAdjustment products={products} setProducts={setProducts} token={auth.token} />}
                {page==="agent-report"&&<AgentReport invoices={invoices} allProfiles={allProfiles} contacts={contacts} />}
                {page==="delivery-notes"&&<DeliveryNotes contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
                {page==="settings"&&<Settings auth={auth} profile={profile} darkMode={darkMode} toggleDark={toggleDark} />}
              </>
            )}
          </div>
        </div>
        {showCmdK && <CommandPalette onClose={() => setShowCmdK(false)} setPage={setPage} invoices={invoices} contacts={contacts} products={products} />}
        {showInstallBanner && isMobile() && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, padding: "12px 16px 20px", background: "#060d1f", borderTop: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 -4px 24px rgba(0,0,0,.4)" }}>
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0, borderRadius: 9 }}><rect width="32" height="32" rx="7" fill="#1e1b4b"/><rect x="9" y="7" width="4" height="18" rx="2" fill="#ffffff"/><rect x="9" y="21" width="14" height="4" rx="2" fill="#ffffff"/><rect x="18" y="7" width="4" height="9" rx="2" fill="#60a5fa"/></svg>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Add LedgerOS to your home screen</div><div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", lineHeight: 1.4 }}>Get instant access — works offline too</div></div>
            <button onClick={handleInstall} style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--sans)", whiteSpace: "nowrap", flexShrink: 0 }}>Add</button>
            <button onClick={() => setShowInstallBanner(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", cursor: "pointer", padding: 4, flexShrink: 0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        )}
        {showOnboarding && <OnboardingChecklist onClose={() => setShowOnboarding(false)} invoices={invoices} contacts={contacts} products={products} setPage={setPage} />}
        {showAI && <div onMouseLeave={() => setShowAI(false)} style={{ position:"fixed", bottom:24, right:24, zIndex:9999 }}><AIAssistant invoices={invoices} contacts={contacts} products={products} accounts={accounts} onClose={() => setShowAI(false)} /></div>}
        {showActivity && (
          <div style={{ position: "fixed", top: 54, right: 24, width: 420, maxHeight: "calc(100vh - 80px)", background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rxl)", boxShadow: "var(--sh3)", display: "flex", flexDirection: "column", zIndex: 490, overflow: "hidden", animation: "scaleIn .18s var(--ease) both", transformOrigin: "top right" }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>Recent Activity</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Audit trail — last 50 events</div>
              </div>
              <button onClick={() => setShowActivity(false)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text2)", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {loadingAudit ? (
                <div style={{ padding: 32, textAlign: "center" }}><div className="spin" style={{ margin: "0 auto 10px" }} /><div style={{ fontSize: 12, color: "var(--text3)" }}>Loading activity...</div></div>
              ) : auditLog.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--text3)" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                  <div style={{ fontSize: 13 }}>No activity recorded yet</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Actions will appear here as you use the app</div>
                </div>
              ) : auditLog.map((log, i) => {
                const iconMap = {
                  "invoice_created":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>', color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "invoice_paid":       { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', color: "var(--green)",  bg: "var(--green-lt)" },
                  "invoice_updated":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', color: "var(--purple)", bg: "var(--purple-lt)" },
                  "invoice_emailed":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>', color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "status_changed":     { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>', color: "var(--amber)",  bg: "var(--amber-lt)" },
                  "stock_adjusted":     { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', color: "var(--amber)",  bg: "var(--amber-lt)" },
                  "product_created":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><line x1="12" y1="22" x2="12" y2="12"/></svg>', color: "var(--green)",  bg: "var(--green-lt)" },
                  "customer_created":   { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>', color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "delivery_created":   { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>', color: "var(--purple)", bg: "var(--purple-lt)" },
                  "payment_received":   { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>', color: "var(--green)",  bg: "var(--green-lt)" },
                  "part_payment":       { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>', color: "var(--green)",  bg: "var(--green-lt)" },
                  "user_login":         { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>', color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "contact_created":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>', color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "purchase_created":   { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>', color: "var(--amber)",  bg: "var(--amber-lt)" },
                  "credit_note_created":{ svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M9 13l3-3 3 3"/><path d="M12 10v6"/></svg>', color: "var(--red)",    bg: "var(--red-lt)" },
                  "invoice_deleted":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>', color: "var(--red)",    bg: "var(--red-lt)" },
                };
                const cfg = iconMap[log.action] || { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', color: "var(--text2)", bg: "#f1f5f9" };
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(log.created_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hrs = Math.floor(mins / 60);
                  const days = Math.floor(hrs / 24);
                  if (days > 0) return days + "d ago";
                  if (hrs > 0) return hrs + "h ago";
                  if (mins > 0) return mins + "m ago";
                  return "Just now";
                })();
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 20px", borderBottom: "1px solid #f0f3f8", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background="#f8fafd"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: cfg.color, display: "flex" }} dangerouslySetInnerHTML={{ __html: cfg.svg }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{(log.action || "").split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</div>
                      <div style={{ fontSize: 11, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.details || log.entity || "—"}</div>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)", flexShrink: 0, paddingTop: 2, textAlign: "right" }}>
                      <div>{timeAgo}</div>
                      <div style={{ marginTop: 2, fontSize: 9 }}>{new Date(log.created_at).toLocaleDateString("en-GB")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", background: "#f8fafd", fontSize: 11, color: "var(--text3)", display: "flex", justifyContent: "space-between" }}>
              <span>{auditLog.length} events recorded</span>
              <span>Showing last 50</span>
            </div>
          </div>
        )}
        <nav className="mob-nav">
          <div className="mob-nav-inner">
            {MOBILE_NAV.filter(n => !n.adminOnly || profile?.role === "admin").map(n => <div key={n.id} className={"mob-nav-item "+(page===n.id?"active":"")} onClick={() => setPage(n.id)}><i className={"ti "+n.icon} style={{fontSize:20}} /><span className="mob-nav-lbl">{n.label}</span></div>)}
            <div className={"mob-nav-item "+(showMobMore?"active":"")} onClick={() => setShowMobMore(v => !v)}><i className="ti ti-dots" style={{fontSize:20}} /><span className="mob-nav-lbl">More</span></div>
          </div>
        </nav>
        {showMobMore && (
          <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.45)" }} onClick={() => setShowMobMore(false)}>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"var(--white)", borderRadius:"16px 16px 0 0", padding:"16px 0 32px", boxShadow:"0 -4px 24px rgba(0,0,0,.15)" }} onClick={e => e.stopPropagation()}>
              <div style={{ width:36, height:4, background:"var(--border2)", borderRadius:2, margin:"0 auto 16px" }} />
              <div style={{ padding:"0 8px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4 }}>
                {NAV.filter(n => !MOBILE_NAV.find(m => m.id===n.id) && (!n.adminOnly || profile?.role==="admin" || profile?.role==="manager")).map(n => (
                  <div key={n.id} className={"mob-nav-item "+(page===n.id?"active":"")} onClick={() => { setPage(n.id); setShowMobMore(false); }} style={{ flexDirection:"column", padding:"10px 4px" }}>
                    <i className={"ti "+n.icon} style={{fontSize:22}} />
                    <span className="mob-nav-lbl" style={{marginTop:4,fontSize:9,textAlign:"center"}}>{n.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
// ── EDIT INVOICE MODAL ──────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ EditInvoiceModal                                           │
// │ Edit existing invoice — customer, lines, status            │
// └────────────────────────────────────────────────────────────┘
function EditInvoiceModal({ invoice, onClose, onSaved, contacts, products, token }) {
  const existing = (() => { try { return invoice.lines ? (typeof invoice.lines === "string" ? JSON.parse(invoice.lines) : invoice.lines) : []; } catch(e) { return []; } })();
  const [customer, setCustomer] = useState(invoice.customer || "");
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date || "");
  const [status, setStatus] = useState(invoice.status || "pending");
  const [notes, setNotes] = useState(invoice.notes || "");
  const [lines, setLines] = useState(existing.length > 0 ? existing : [{ description:"", qty:1, unit_price:"", vat_rate:20 }]);
  const [saving, setSaving] = useState(false);

  const updateLine = (i, key, val) => setLines(prev => prev.map((l, idx) => idx === i ? {...l, [key]: val} : l));
  const addLine = () => setLines(prev => [...prev, { description:"", qty:1, unit_price:"", vat_rate:20 }]);
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.qty)||0) * (parseFloat(l.unit_price)||0), 0);
  const vatTotal = lines.reduce((s, l) => s + (parseFloat(l.qty)||0) * (parseFloat(l.unit_price)||0) * ((parseFloat(l.vat_rate)||0) / 100), 0);
  const total = subtotal + vatTotal;

  const save = async () => {
    setSaving(true);
    const validLines = lines.filter(l => l.description && l.unit_price);
    await sb.patch(token, "invoices", invoice.id, {
      customer,
      invoice_date: invoiceDate,
      status,
      notes,
      lines: JSON.stringify(validLines),
      amount: total,
      subtotal,
      vat_total: vatTotal,
    });
    onSaved();
    onClose();
    setSaving(false);
  };

  return (<ModalPortal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <div>
            <div className="ct">Edit Invoice</div>
            <div className="cs">{invoice.invoice_number}</div>
          </div>
          <button className="btn bo bsm" onClick={onClose} style={{ width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div className="fgrp">
              <label>Customer</label>
              <select value={customer} onChange={e => setCustomer(e.target.value)}>
                <option value="">Select customer</option>
                {contacts.filter(c => c.type === "customer" || c.type === "both").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="fgrp">
              <label>Invoice Date</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
            <div className="fgrp">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "3fr 0.6fr 1fr 1fr 0.8fr 30px", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
              {["PRODUCT","QTY","PRICE","VAT","TOTAL",""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" }}>{h}</div>)}
            </div>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 0.6fr 1fr 1fr 0.8fr 30px", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <SearchDropdown placeholder="Search products..." items={products} onSelect={p => { updateLine(i, "description", p.name); updateLine(i, "unit_price", p.sale_price || p.cost_price || ""); }} displayKey="name" />
                <input className="il-input mono" type="number" value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} />
                <input className="il-input mono" type="number" value={l.unit_price} onChange={e => updateLine(i, "unit_price", e.target.value)} />
                <select className="il-input" value={l.vat_rate} onChange={e => updateLine(i, "vat_rate", e.target.value)}>
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={20}>20%</option>
                </select>
                <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{fmt((parseFloat(l.qty)||0) * (parseFloat(l.unit_price)||0) * (1 + (parseFloat(l.vat_rate)||0) / 100))}</div>
                <button onClick={() => removeLine(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16 }}>x</button>
              </div>
            ))}
            <button className="btn bo bsm" onClick={addLine} style={{ marginTop: 12 }}><i className="ti ti-plus" /> Add Line</button>
          </div>
          <div style={{ textAlign: "right", padding: "12px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Subtotal: {fmt(subtotal)} · VAT: {fmt(vatTotal)}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Total: {fmt(total)}</div>
          </div>
          <div className="fgrp" style={{ marginTop: 12 }}>
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--r)", border: "1px solid var(--border2)", fontSize: 13, fontFamily: "var(--sans)", resize: "vertical", minHeight: 60 }} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn bo bsm" onClick={onClose}>Cancel</button>
          <button className="btn bp bsm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div></ModalPortal>
  );
}


// ── USER APPROVAL ────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ UserApproval                                               │
// │ Admin user approval panel — approve/revoke agents          │
// └────────────────────────────────────────────────────────────┘
function UserApproval({ token, profile }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  if (profile?.role !== "admin") return (
    <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--text3)" }}>
      <i className="ti ti-lock" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
      <div style={{ fontWeight: 600, fontSize: 13 }}>Admin access required</div>
    </div>
  );
  useEffect(() => {
    sb.get(token, "profiles", "order=created_at.desc").then(d => {
      if (Array.isArray(d)) setUsers(d);
      setLoading(false);
    });
  }, [token]);
  const approve = async (id) => {
    const res = await sb.patch(token, "profiles", id, { approved: true });
    if (res && !res.error && !res.message?.includes("error")) {
      setUsers(prev => prev.map(u => u.id===id ? {...u, approved:true} : u));
      toast.success("User approved successfully");
    } else {
      toast.error("Failed to approve user. Check Supabase RLS policies on profiles table.");
      console.error("Approve error:", res);
    }
  };
  const revoke = async (id) => {
    const user = users.find(u => u.id === id);
    const isPending = user && (user.approved === false || user.approved === null);
    if (isPending) {
      // Delete profile row entirely so they can't reappear via re-fetch
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, { method: "DELETE", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
      if (res.ok || res.status === 204) {
        setUsers(prev => prev.filter(u => u.id !== id));
        toast.warn("User rejected");
      } else {
        toast.error("Failed to reject user. Check Supabase RLS policies.");
      }
    } else {
      const res = await sb.patch(token, "profiles", id, { approved: false });
      if (res && !res.error && !res.message?.includes("error")) {
        setUsers(prev => prev.map(u => u.id===id ? {...u, approved:false} : u));
        toast.warn("User access revoked");
      } else {
        toast.error("Failed to revoke user. Check Supabase RLS policies on profiles table.");
        console.error("Revoke error:", res);
      }
    }
  };
  const pending = users.filter(u => u.approved===false||u.approved===null);
  const approved = users.filter(u => u.approved===true);
  return (
    <div>
      {loading ? <div style={{ padding:24,color:"var(--text3)" }}>Loading users...</div> : (
        <div>
          <div className="card" style={{ marginBottom:16,padding:20 }}>
            <div className="ct" style={{ marginBottom:4 }}>Pending Approval</div>
            <div className="cs" style={{ marginBottom:16 }}>{pending.length} user{pending.length!==1?"s":""} waiting</div>
            {pending.length===0 ? <div style={{ padding:"16px 0",color:"var(--text3)",fontSize:13 }}>No pending users</div> : pending.map(u=>(
              <div key={u.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#ef4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff" }}>{(u.full_name||u.email||"U")[0].toUpperCase()}</div>
                  <div><div style={{ fontWeight:600,fontSize:14 }}>{u.full_name||"Unknown"}</div><div style={{ fontSize:12,color:"var(--text3)" }}>{u.email||u.id}</div></div>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button className="btn bp bsm" onClick={()=>approve(u.id)} style={{ background:"var(--green)",border:"none",color:"#fff" }}>Approve</button>
                  <button className="btn bo bsm" onClick={()=>revoke(u.id)} style={{ color:"var(--red)" }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:20 }}>
            <div className="ct" style={{ marginBottom:4 }}>Approved Users</div>
            <div className="cs" style={{ marginBottom:16 }}>{approved.length} active user{approved.length!==1?"s":""}</div>
            {approved.map(u=>(
              <div key={u.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff" }}>{(u.full_name||"U")[0].toUpperCase()}</div>
                  <div><div style={{ fontWeight:600,fontSize:14 }}>{u.full_name||"Unknown"}</div><div style={{ fontSize:12,color:"var(--text3)" }}>{u.role||"agent"}</div></div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <span className="badge b-green">Active</span>
                  <button className="btn bo bsm" onClick={()=>revoke(u.id)} style={{ fontSize:11,color:"var(--text3)" }}>Revoke</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SETTINGS ─────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Settings                                                   │
// │ Settings page — company, appearance, account, users        │
// └────────────────────────────────────────────────────────────┘
function Settings({ auth, profile, darkMode: darkModeProp, toggleDark }) {
  const darkMode = darkModeProp;
  const [activeTab, setActiveTab] = useState("company");
  if (profile?.role !== "admin" && profile?.role !== "manager") return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text3)" }}>
      <i className="ti ti-lock" style={{ fontSize: 32, marginBottom: 12, display: "block" }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Access restricted</div>
      <div style={{ fontSize: 13 }}>Settings are only available to admins.</div>
    </div>
  );
  return (
    <div style={{ maxWidth:720,margin:"0 auto",padding:"0 0 40px" }}>
      <div className="ph"><div><div className="pt">Settings</div><div className="ps">Manage your LedgerOS configuration</div></div></div>
      <div style={{ display:"flex",gap:8,marginBottom:24,flexWrap:"wrap" }}>
        {[["company","Company"],["appearance","Appearance"],["account","Account"],["users","Users"]].map(([k,l])=>(
          <button key={k} onClick={()=>setActiveTab(k)} style={{ padding:"7px 16px",borderRadius:20,border:"1px solid "+(activeTab===k?"var(--blue)":"var(--border)"),background:activeTab===k?"var(--blue)":"var(--white)",color:activeTab===k?"#fff":"var(--text2)",fontSize:13,fontWeight:activeTab===k?600:400,cursor:"pointer",fontFamily:"var(--sans)" }}>{l}</button>
        ))}
      </div>
      {activeTab==="company" && (
        <div className="card" style={{ padding:24 }}>
          <div className="ct" style={{ marginBottom:20 }}>Company Information</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
            {[{label:"Company Name",val:"Arkham Retail Ltd"},{label:"VAT Number",val:"GB462229106"},{label:"Address",val:"2 Fieldhead Street, Fieldhead Business Centre"},{label:"City",val:"Bradford, West Yorkshire BD7 1LW"},{label:"Phone",val:"07801 567209 / 07851 983151"},{label:"Email",val:"ARKHAMRETAIL@GMAIL.COM"},{label:"Bank",val:"Tide Bank"},{label:"Sort Code / Account",val:"04-06-05 / 23058246"}].map(f=>(
              <div key={f.label}><div style={{ fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:5 }}>{f.label}</div><div style={{ fontSize:14,fontWeight:600,color:"var(--text)",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--r)",padding:"10px 14px" }}>{f.val}</div></div>
            ))}
          </div>
        </div>
      )}
      {activeTab==="appearance" && (
        <div className="card" style={{ padding:24 }}>
          <div className="ct" style={{ marginBottom:20 }}>Appearance</div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0",borderBottom:"1px solid var(--border)" }}>
            <div><div style={{ fontWeight:600,marginBottom:3 }}>Dark Mode</div><div style={{ fontSize:12,color:"var(--text3)" }}>Switch between light and dark theme</div></div>
            <div onClick={toggleDark} style={{ width:48,height:26,borderRadius:13,background:darkMode?"var(--blue)":"var(--border)",cursor:"pointer",position:"relative",transition:"background .2s" }}>
              <div style={{ position:"absolute",top:3,left:darkMode?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
            </div>
          </div>
        </div>
      )}
      {activeTab==="account" && (
        <div className="card" style={{ padding:24 }}>
          <div className="ct" style={{ marginBottom:20 }}>Account</div>
          <div style={{ display:"flex",alignItems:"center",gap:16,padding:"16px 0",borderBottom:"1px solid var(--border)" }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff" }}>{auth?.user?.email?.[0]?.toUpperCase()}</div>
            <div><div style={{ fontWeight:700,fontSize:16 }}>{auth?.user?.email}</div><div style={{ fontSize:12,color:"var(--text3)",marginTop:3 }}>Administrator</div></div>
          </div>
          <div style={{ marginTop:16,display:"flex",gap:10 }}>
            <button className="btn bo bsm" style={{ background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca" }} onClick={async()=>{ await sb.signOut(auth?.token); setAuth(null); }}>Sign Out</button>
          </div>
        </div>
      )}
      {activeTab==="users" && <UserApproval token={auth?.token} profile={profile} />}
    </div>
  );
}
