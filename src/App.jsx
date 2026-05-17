import Analytics from "./Analytics.jsx";
import CSVImport from "./CSVImport.jsx";
import { useState, useEffect, useRef } from "react";

const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://szcogfyrhlrsxnwepnea.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

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

const LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MjAgMTIwIj4KICA8IS0tIEJhY2tncm91bmQgLS0+CiAgPHJlY3Qgd2lkdGg9IjQyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMwNjBmMDkiLz4KCiAgPCEtLSBBIC0gZ3JlZW4gLS0+CiAgPHRleHQgeD0iMjAiIHk9Ijg4IiBmb250LWZhbWlseT0iQXJpYWwgQmxhY2ssIEFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjgyIiBmaWxsPSIjMjJjNTVlIj5BPC90ZXh0PgogIDwhLS0gUiAtIGJsdWUgLS0+CiAgPHRleHQgeD0iNzAiIHk9Ijg4IiBmb250LWZhbWlseT0iQXJpYWwgQmxhY2ssIEFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjgyIiBmaWxsPSIjMWU5MGZmIj5SPC90ZXh0PgoKICA8IS0tIFZlcnRpY2FsIGRpdmlkZXIgLS0+CiAgPHJlY3QgeD0iMTY0IiB5PSIxNiIgd2lkdGg9IjIiIGhlaWdodD0iODgiIGZpbGw9IiMyMmM1NWUiIG9wYWNpdHk9IjAuNSIvPgoKICA8IS0tIEFSS0hBTSAtLT4KICA8dGV4dCB4PSIxODIiIHk9IjUyIiBmb250LWZhbWlseT0iQXJpYWwgQmxhY2ssIEFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjM0IiBsZXR0ZXItc3BhY2luZz0iMyIgZmlsbD0iI2ZmZmZmZiI+QVJLSEFNPC90ZXh0PgoKICA8IS0tIEdyZWVuIHJ1bGUgLS0+CiAgPHJlY3QgeD0iMTgyIiB5PSI2MCIgd2lkdGg9IjIyMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMjJjNTVlIi8+CgogIDwhLS0gUkVUQUlMIExURCAtLT4KICA8dGV4dCB4PSIxODIiIHk9IjgyIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtc2l6ZT0iMTQiIGxldHRlci1zcGFjaW5nPSI2IiBmaWxsPSIjMjJjNTVlIj5SRVRBSUwgIExURDwvdGV4dD4KCiAgPCEtLSBXSE9MRVNBTEUgwrcgUkVUQUlMIC0tPgogIDx0ZXh0IHg9IjE4MiIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIGZvbnQtc2l6ZT0iMTAiIGxldHRlci1zcGFjaW5nPSIzIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMzUpIj5XSE9MRVNBTEUgIMK3ICBSRVRBSUw8L3RleHQ+Cjwvc3ZnPg==";

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

const buildInvoiceEmailHtml = (invoice, lines, subtotal, vatTotal, total) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:20px}.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}.header{background:#0b1120;padding:28px 32px}.header-title{color:#fff;font-size:20px;font-weight:700}.header-sub{color:rgba(255,255,255,.5);font-size:12px;margin-top:2px}.body{padding:32px}.badge{background:#eff4ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;display:inline-block;margin-bottom:16px}.amount{font-size:32px;font-weight:800;color:#0b1120;margin:8px 0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafd;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #e5e9f0}.meta-lbl{font-size:10px;color:#9aa5b4;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}.meta-val{font-size:13px;font-weight:600;color:#0b1120}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#2563eb;color:#fff;padding:10px 14px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.5px}td{padding:10px 14px;border-bottom:1px solid #f0f3f8;font-size:13px}.tot-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}.balance{border-top:2px solid #0b1120;margin-top:8px;padding-top:10px;font-size:16px;font-weight:700}.bank{background:#f8fafd;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #e5e9f0}.bank-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px}.bank-lbl{font-size:10px;color:#9aa5b4;text-transform:uppercase;margin-bottom:3px}.bank-val{font-size:13px;font-weight:600}.footer{background:#f8fafd;padding:16px 32px;text-align:center;font-size:11px;color:#9aa5b4;border-top:1px solid #e5e9f0}</style></head><body><div class="wrap"><div class="header"><div class="header-title">Arkham Retail Ltd</div><div class="header-sub">VAT Invoice</div></div><div class="body"><div class="badge">Invoice \${invoice.invoice_number}</div><div style="font-size:14px;color:#5c677d;margin-bottom:4px">Amount due from <strong>\${invoice.customer}</strong></div><div class="amount">\${fmt(total)}</div><div class="meta"><div><div class="meta-lbl">Invoice #</div><div class="meta-val">\${invoice.invoice_number}</div></div><div><div class="meta-lbl">Date</div><div class="meta-val">\${fmtDate(invoice.invoice_date)}</div></div><div><div class="meta-lbl">Due Date</div><div class="meta-val">\${fmtDate(invoice.due_date)}</div></div><div><div class="meta-lbl">Status</div><div class="meta-val">\${(invoice.status||"pending").toUpperCase()}</div></div></div><table><thead><tr><th style="width:45%">Description</th><th>VAT</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>\${lines.map(l=>\`<tr><td style="font-weight:600">\${l.description}</td><td>\${l.vat_rate===0?"Exempt":l.vat_rate+"% S"}</td><td style="text-align:right">\${l.qty}</td><td style="text-align:right">\${fmt(l.unit_price)}</td><td style="text-align:right;font-weight:700">\${fmt(l.qty*l.unit_price)}</td></tr>\`).join("")}</tbody></table><div style="width:260px;margin-left:auto"><div class="tot-row"><span style="color:#5c677d">Subtotal</span><span>\${fmt(subtotal)}</span></div><div class="tot-row"><span style="color:#5c677d">VAT Total</span><span>\${fmt(vatTotal)}</span></div><div class="tot-row balance"><span>Balance Due</span><span style="color:#2563eb">\${fmt(total)}</span></div></div><div class="bank"><div style="font-size:12px;font-weight:600;margin-bottom:4px">Payment Details</div><div style="font-size:12px;color:#5c677d;margin-bottom:8px">Please use the invoice number as your reference.</div><div class="bank-grid"><div><div class="bank-lbl">Bank</div><div class="bank-val">Tide Bank</div></div><div><div class="bank-lbl">Sort Code</div><div class="bank-val">04-06-05</div></div><div><div class="bank-lbl">Account</div><div class="bank-val">23058246</div></div></div></div><p style="font-size:12px;color:#9aa5b4">VAT Reg: GB462229106 · All goods remain our property until payment received in full.</p></div><div class="footer">Arkham Retail Ltd · 2 Fieldhead Street, Bradford, BD7 1LW · ARKHAMRETAIL@GMAIL.COM</div></div></body></html>`;

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
  --sidebar:#0b1120;
  --sidebar-border:rgba(255,255,255,.06);
  --sidebar-hover:rgba(255,255,255,.05);
  --sidebar-active:rgba(99,102,241,.15);
  --sidebar-active-border:rgba(99,102,241,.5);

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
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
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
}
.sidebar::-webkit-scrollbar{width:0}

.sidebar-logo{
  display:flex;align-items:center;gap:10px;
  padding:6px 10px 24px;
}
.logo-text{
  font-size:15px;font-weight:700;color:#fff;
  letter-spacing:-.3px;
}

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
  color:rgba(255,255,255,.38);font-size:13px;font-weight:500;
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
  color:#a5b4fc;font-weight:600;
  border-left-color:var(--sidebar-active-border);
}
.nav-item i{font-size:16px;flex-shrink:0;opacity:.9}
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
  background:rgba(255,255,255,.92);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;
  padding:0 24px;gap:12px;
  position:sticky;top:0;z-index:50;
}

.search-wrap{position:relative;flex:1;max-width:340px}
.search-wrap i{
  position:absolute;left:10px;top:50%;
  transform:translateY(-50%);
  color:var(--text3);font-size:15px;pointer-events:none;
}
.search-input{
  width:100%;
  background:#f4f6f9;
  border:1px solid var(--border);
  border-radius:var(--r);
  padding:7px 12px 7px 32px;
  font-size:13px;color:var(--text2);
  font-family:var(--sans);outline:none;
  transition:border .14s,box-shadow .14s,background .14s;
}
.search-input:focus{
  border-color:var(--blue);
  background:var(--white);
  box-shadow:0 0 0 3px rgba(37,99,235,.1);
}
.search-input::placeholder{color:var(--text3)}

.topbar-right{margin-left:auto;display:flex;align-items:center;gap:6px}
.tb-btn{
  width:32px;height:32px;border-radius:var(--r);
  border:1px solid var(--border);
  background:var(--white);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--text2);
  transition:all .12s;position:relative;
}
.tb-btn:hover{background:#f4f6f9;border-color:var(--border2);color:var(--text)}
.tb-btn i{font-size:16px}
.tb-notif::after{
  content:'';position:absolute;top:6px;right:6px;
  width:6px;height:6px;
  background:var(--red);border-radius:50%;
  border:1.5px solid var(--white);
}
.tb-av{
  width:32px;height:32px;border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;color:#fff;
  cursor:pointer;
  box-shadow:0 0 0 2px var(--white),0 0 0 3.5px rgba(99,102,241,.35);
}
.tb-role{
  font-size:11px;font-weight:600;
  background:var(--blue-lt);color:var(--blue);
  padding:3px 10px;border-radius:20px;
  text-transform:uppercase;letter-spacing:.4px;
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
  font-size:22px;font-weight:700;color:var(--text);
  letter-spacing:-.5px;line-height:1.2;
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
  background:var(--blue);color:#fff;
  box-shadow:0 1px 2px rgba(37,99,235,.2),0 2px 8px rgba(37,99,235,.15);
}
.bp:hover{background:var(--blue-dk);box-shadow:var(--sh-blue);transform:translateY(-1px)}
.bp:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}

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
  position:fixed;inset:0;
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
.inv-doc{padding:32px}
.inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
.inv-co-name{font-size:20px;font-weight:800;color:var(--blue);letter-spacing:-.4px;margin-bottom:5px}
.inv-co-detail{font-size:11px;color:var(--text2);line-height:1.7}
.inv-title-block{text-align:right}
.inv-title{font-size:30px;font-weight:800;color:#e8edf4;letter-spacing:-.5px;margin-bottom:5px}
.inv-num{font-size:15px;font-weight:700;color:var(--text)}
.inv-meta{
  display:grid;grid-template-columns:1fr 1fr;gap:20px;
  margin-bottom:28px;padding:18px;
  background:#f8fafd;border-radius:var(--r);border:1px solid var(--border);
}
.inv-meta-lbl{font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px}
.inv-meta-val{font-size:13px;font-weight:600;color:var(--text)}
.inv-table{width:100%;border-collapse:collapse;margin-bottom:22px;border-radius:var(--r);overflow:hidden;border:1px solid var(--border)}
.inv-table th{background:var(--blue);color:#fff;padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;text-align:left}
.inv-table th:last-child,.inv-table td:last-child{text-align:right}
.inv-table td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f0f3f8}
.inv-table tr:last-child td{border-bottom:none}
.inv-table tr:nth-child(even) td{background:#f8fafd}
.inv-totals-box{width:280px;margin-left:auto;margin-bottom:24px}
.inv-tot-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
.inv-tot-row.divider{border-top:1px solid var(--border);margin-top:5px;padding-top:10px}
.inv-tot-row.balance{border-top:2px solid var(--text);margin-top:5px;padding-top:10px;font-size:16px;font-weight:700}
.inv-footer{border-top:1px solid var(--border);padding-top:18px}
.inv-bank-grid{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;
  margin-top:12px;background:#f8fafd;padding:13px;
  border-radius:var(--r);border:1px solid var(--border);
}
.inv-bank-lbl{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.inv-bank-val{font-size:13px;font-weight:600;color:var(--text)}

/* ── Line Items ── */
.il-header{
  display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr 1fr 30px;
  gap:10px;padding:9px 16px;
  background:#f8fafd;border-bottom:1px solid var(--border);
}
.il-line{
  display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr 1fr 30px;
  gap:10px;align-items:center;
  padding:9px 16px;border-bottom:1px solid var(--border);
}
.il-input{
  background:var(--white);border:1px solid var(--border);
  border-radius:var(--r2);padding:6px 9px;
  font-size:12px;color:var(--text);
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
.mob-nav{
  display:none;position:fixed;bottom:0;left:0;right:0;z-index:100;
  background:rgba(255,255,255,.95);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border-top:1px solid var(--border);
  padding:5px 0 env(safe-area-inset-bottom,5px);
  box-shadow:0 -4px 24px rgba(13,17,23,.1);
}
.mob-nav-inner{display:flex}
.mob-nav-item{
  display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:5px 0;cursor:pointer;color:var(--text3);flex:1;
  transition:color .12s;
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
.empty-state-icon{font-size:52px;margin-bottom:16px;opacity:.25}
.empty-state-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px}
.empty-state-sub{font-size:13px;color:var(--text3);line-height:1.6;max-width:280px;margin-bottom:20px}

/* ── Version badge ── */
.version-badge{font-size:10px;color:rgba(255,255,255,.2);padding:2px 8px;border:1px solid rgba(255,255,255,.08);border-radius:20px;display:inline-block;margin-top:4px}
`;

// ── AUTH ──────────────────────────────────────────────────────────────────────
// ── Command Palette (Cmd+K) ──────────────────────────────────────────────────
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
    { icon: "ti-report-money",   label: "Reports Suite",        action: () => setPage("admin-reports"),  tag: "Reports" },
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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ alignItems: "flex-start", paddingTop: "12vh" }}>
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
    </div>
  );
}

// ── Skeleton Table Rows ───────────────────────────────────────────────────────
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
function OnboardingChecklist({ onClose, invoices, contacts, products, setPage }) {
  const steps = [
    { key: "profile",  icon: "ti-user",          label: "Set up your profile",          done: true,                                     page: null },
    { key: "customer", icon: "ti-users",          label: "Add your first customer",      done: contacts.length > 0,                      page: "contacts" },
    { key: "product",  icon: "ti-package",        label: "Add products to inventory",    done: products.length > 0,                      page: "inventory" },
    { key: "invoice",  icon: "ti-file-invoice",   label: "Create your first invoice",    done: invoices.length > 0,                      page: "invoices" },
    { key: "delivery", icon: "ti-truck-delivery", label: "Send a delivery note",         done: false,                                    page: "delivery-notes" },
    { key: "report",   icon: "ti-chart-bar",      label: "Explore Reports Suite",        done: false,                                    page: "admin-reports" },
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
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 20 }}><i className="ti ti-x" /></button>
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
            {step.done && <i className="ti ti-circle-check" style={{ color: "var(--green)", fontSize: 18 }} />}
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

function Auth({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [f, setF] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setLoading(true); setErr("");
    try {
      const d = mode === "signin" ? await sb.signIn(f.email, f.password) : await sb.signUp(f.email, f.password, f.full_name);
      if (d.access_token) onAuth({ token: d.access_token, user: d.user });
      else setErr(d.msg || d.error_description || "Authentication failed.");
    } catch { setErr("Network error. Please try again."); }
    setLoading(false);
  };
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row", background: "var(--bg)", fontFamily: "var(--sans)" }}>
      {/* Left panel */}
      <div style={{ width: isMobile ? "100%" : 460, minWidth: isMobile ? "unset" : 460, background: "var(--sidebar)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: isMobile ? "36px 24px" : 56, color: "#fff" }}>
        <div style={{ textAlign: "center", maxWidth: 360, width: "100%" }}>
          <img src={LOGO} alt="Arkham Retail" style={{ width: isMobile ? 200 : 180, height: isMobile ? 58 : 52, borderRadius: 10, objectFit: "contain", margin: "0 auto 24px", display: "block" }} />
          <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, marginBottom: 12, lineHeight: 1.2, letterSpacing: "-.5px" }}>Built for modern businesses</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: isMobile ? 20 : 36 }}>VAT invoices, inventory, analytics and more — all in one place.</p>
          {!isMobile && ["VAT Invoice PDF with WhatsApp share", "Customer & Supplier management", "Stock & Inventory with low stock alerts", "Agent dashboards & leaderboard", "Daily email notifications"].map(feat => (
            <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,.8)", marginBottom: 10, textAlign: "left" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(37,99,235,.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><i className="ti ti-check" style={{ fontSize: 12, color: "#93c5fd" }} /></div>{feat}
            </div>
          ))}

        </div>
      </div>

      {/* Right panel - login form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "32px 20px" : 48 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
              <img src={LOGO} alt="Arkham Retail" style={{ width: 140, height: 40, borderRadius: 8, objectFit: "contain" }} />
              <div><div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.4px" }}>LedgerOS</div><div style={{ fontSize: 12, color: "var(--text3)" }}>Business Accounting</div></div>
            </div>
          )}
          <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, marginBottom: 6, letterSpacing: "-.4px" }}>{mode === "signin" ? "Sign in" : "Create account"}</div>
          <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 28 }}>{mode === "signin" ? "Welcome back — sign in to your dashboard" : "Join your team on LedgerOS"}</div>
          {err && <div style={{ background: "var(--red-lt)", border: "0.5px solid #fca5a5", borderRadius: "var(--r)", padding: "11px 14px", fontSize: 13, color: "var(--red-dk)", marginBottom: 16 }}>{err}</div>}
          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>Full Name</label>
              <input style={{ width: "100%", background: "var(--white)", border: "1px solid var(--border2)", borderRadius: "var(--r)", padding: "11px 14px", fontSize: 14, color: "var(--text)", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box" }} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="Jane Smith" />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>Email address</label>
            <input type="email" style={{ width: "100%", background: "var(--white)", border: "1px solid var(--border2)", borderRadius: "var(--r)", padding: "11px 14px", fontSize: 14, color: "var(--text)", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box" }} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="you@company.com" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>Password</label>
            <input type="password" style={{ width: "100%", background: "var(--white)", border: "1px solid var(--border2)", borderRadius: "var(--r)", padding: "11px 14px", fontSize: 14, color: "var(--text)", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box" }} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && go()} />
          </div>
          <button style={{ width: "100%", padding: "13px", background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: "var(--r)", cursor: "pointer", fontFamily: "var(--sans)", transition: "background .15s", boxShadow: "var(--sh-blue)" }} onClick={go} disabled={loading}>
            {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><div className="spin" style={{ width: 16, height: 16, borderWidth: 2 }} />Please wait...</span> : mode === "signin" ? "Sign In →" : "Create Account →"}
          </button>
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text2)" }}>
            {mode === "signin" ? <>No account? <span style={{ color: "var(--blue)", cursor: "pointer", fontWeight: 600 }} onClick={() => setMode("signup")}>Sign up free</span></> : <>Have account? <span style={{ color: "var(--blue)", cursor: "pointer", fontWeight: 600 }} onClick={() => setMode("signin")}>Sign in</span></>}
          </div>
          {/* Trust badges */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            {[
              { icon: "ti-lock", label: "256-bit SSL" },
              { icon: "ti-shield-check", label: "Secured by Supabase" },
              { icon: "ti-server", label: "UK Data Storage" },
            ].map(b => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text3)" }}>
                <i className={"ti " + b.icon} style={{ fontSize: 13, color: "var(--text3)" }} />
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── INVOICE MODAL ─────────────────────────────────────────────────────────────
function InvoiceModal({ invoice, onClose, contacts = [], onStatusChange, onDuplicate }) {
  const [showWaInput, setShowWaInput] = useState(false);
  const [waNumber, setWaNumber] = useState("");
  const [activeTab, setActiveTab] = useState("invoice");

  const lines = invoice.lines || [{ description: invoice.description || "Services rendered", qty: 1, unit_price: invoice.amount || 0, vat_rate: 20 }];
  const subtotal = lines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
  const vatTotal = lines.reduce((s, l) => s + (l.qty * l.unit_price * (l.vat_rate / 100)), 0);
  const total = subtotal + vatTotal;

  const customerContact = contacts.find(c => c.name === invoice.customer);
  const savedPhone = customerContact?.phone || "";

  // ── jsPDF invoice generation ──────────────────────────────────────────────
  const handlePrint = async () => {
    if (!window.jspdf) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = JSPDF_URL; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 14, cw = W - M * 2;
    let y = 14;

    // Top rule
    doc.setFillColor(37, 99, 235);
    doc.rect(M, y, cw, 1, "F");
    y += 6;

    // Company name
    doc.setFontSize(16).setFont(undefined, "bold").setTextColor(37, 99, 235);
    doc.text(COMPANY.name, M, y);
    y += 6;

    // Company details
    doc.setFontSize(8).setFont(undefined, "normal").setTextColor(80, 80, 80);
    doc.text([COMPANY.address, `${COMPANY.city}, ${COMPANY.postcode}`, `Tel: ${COMPANY.phone}`, COMPANY.email, `VAT: ${COMPANY.vatNumber}`], M, y);

    // INVOICE title top-right
    doc.setFontSize(28).setFont(undefined, "bold").setTextColor(220, 220, 220);
    doc.text("INVOICE", W - M, y - 2, { align: "right" });
    doc.setFontSize(11).setFont(undefined, "bold").setTextColor(30, 30, 30);
    doc.text(invoice.invoice_number, W - M, y + 10, { align: "right" });
    y += 28;

    // Meta box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M, y, cw, 22, 2, 2, "F");
    doc.setFontSize(8).setTextColor(100, 100, 100).setFont(undefined, "normal");
    doc.text("INVOICE TO", M + 4, y + 5);
    doc.setFontSize(11).setFont(undefined, "bold").setTextColor(15, 23, 42);
    doc.text(invoice.customer || "—", M + 4, y + 11);
    doc.setFontSize(8).setFont(undefined, "normal").setTextColor(100, 100, 100);
    const metaCols = ["Invoice #", "Date", "Due Date", "Terms"];
    const metaVals = [invoice.invoice_number, fmtDate(invoice.invoice_date), fmtDate(invoice.due_date), "Due on receipt"];
    metaCols.forEach((c, i) => {
      const x = M + cw / 2 + (i % 2) * (cw / 4);
      const ry = y + (i < 2 ? 5 : 13);
      doc.text(c, x, ry);
      doc.setFont(undefined, "bold").setTextColor(15, 23, 42).setFontSize(9);
      doc.text(metaVals[i], x, ry + 5);
      doc.setFont(undefined, "normal").setTextColor(100, 100, 100).setFontSize(8);
    });
    y += 28;

    // Table header
    doc.setFillColor(37, 99, 235);
    doc.rect(M, y, cw, 8, "F");
    doc.setTextColor(255, 255, 255).setFontSize(8).setFont(undefined, "bold");
    const tCols = ["Description", "VAT", "Qty", "Rate", "Amount"];
    const tXs = [M + 2, M + 80, M + 100, M + 120, W - M - 2];
    const tAligns = ["left", "left", "left", "left", "right"];
    tCols.forEach((c, i) => doc.text(c, tXs[i], y + 5.5, { align: tAligns[i] }));
    y += 8;

    // Table rows
    lines.forEach((l, i) => {
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(M, y, cw, 8, "F"); }
      doc.setTextColor(15, 23, 42).setFont(undefined, "normal").setFontSize(9);
      doc.text(l.description || "—", tXs[0], y + 5.5);
      doc.setFontSize(8);
      doc.text(`${l.vat_rate}%`, tXs[1], y + 5.5);
      doc.text(String(l.qty), tXs[2], y + 5.5);
      doc.text(fmt(l.unit_price), tXs[3], y + 5.5);
      doc.setFont(undefined, "bold");
      doc.text(fmt(l.qty * l.unit_price), tXs[4], y + 5.5, { align: "right" });
      y += 8;
    });
    y += 4;

    // Totals
    const totRows = [["Subtotal", fmt(subtotal)], ["VAT Total", fmt(vatTotal)], ["Balance Due", fmt(total)]];
    totRows.forEach(([label, val], i) => {
      if (i === 2) {
        doc.setFillColor(37, 99, 235);
        doc.rect(W - M - 70, y - 1, 70, 9, "F");
        doc.setTextColor(255, 255, 255).setFont(undefined, "bold").setFontSize(10);
      } else {
        doc.setTextColor(80, 80, 80).setFont(undefined, "normal").setFontSize(9);
      }
      doc.text(label, W - M - 68, y + 5);
      doc.text(val, W - M - 2, y + 5, { align: "right" });
      y += 9;
    });
    y += 6;

    // Bank details
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M, y, cw, 20, 2, 2, "F");
    doc.setFontSize(9).setFont(undefined, "bold").setTextColor(15, 23, 42);
    doc.text("Payment Details", M + 4, y + 6);
    doc.setFontSize(8).setFont(undefined, "normal").setTextColor(80, 80, 80);
    doc.text(`Bank: ${COMPANY.bankName}`, M + 4, y + 12);
    doc.text(`Sort Code: ${COMPANY.sortCode}`, M + 55, y + 12);
    doc.text(`Account: ${COMPANY.accountNumber}`, M + 110, y + 12);
    doc.text(`Reference: ${invoice.invoice_number}`, M + 4, y + 17);
    y += 24;

    // Footer
    doc.setFontSize(7).setTextColor(150, 150, 150);
    doc.text(`VAT Reg: ${COMPANY.vatNumber} · All goods remain property of ${COMPANY.name} until payment received in full.`, M, y);
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(M, y + 3, W - M, y + 3);

    doc.save(`${invoice.invoice_number}.pdf`);
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
  const handleEmail = async () => {
    const customerContact = contacts.find(c => c.name === invoice.customer);
    const toEmail = customerContact?.email;
    if (!toEmail) {
      alert(`No email address found for ${invoice.customer}. Please add one in Customers first.`);
      return;
    }
    setEmailStatus("sending");
    const html = buildInvoiceEmailHtml(invoice, lines, subtotal, vatTotal, total);
    const result = await sendEmail({
      to: toEmail,
      subject: `Invoice ${invoice.invoice_number} — ${COMPANY.name}`,
      html
    });
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
    draft:    { label: "Draft",    cls: "b-gray",   icon: "ti-file" },
    pending:  { label: "Pending",  cls: "b-amber",  icon: "ti-clock" },
    paid:     { label: "Paid",     cls: "b-green",  icon: "ti-circle-check" },
    overdue:  { label: "Overdue",  cls: "b-red",    icon: "ti-alert-circle" },
    cancelled:{ label: "Cancelled",cls: "b-gray",   icon: "ti-ban" },
  };
  const sc = statusConfig[invoice.status] || statusConfig.pending;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "var(--blue-lt)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-file-invoice" style={{ color: "var(--blue)", fontSize: 17 }} /></div>
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
                  <i className={"ti " + icon} style={{ fontSize: 13 }} />{lbl}
                </button>
              ))}
            </div>
            <button className="btn bo bsm" onClick={onClose}><i className="ti ti-x" /></button>
          </div>
        </div>
        {/* ── INVOICE TAB ── */}
        {activeTab === "invoice" && (
          <div className="inv-doc">
            <div className="inv-header">
              <div>
                <img src={LOGO} alt={COMPANY.name} style={{ width: 160, height: 44, objectFit: "contain", marginBottom: 14, borderRadius: 6 }} />
                <div className="inv-co-name">{COMPANY.name}</div>
                <div className="inv-co-detail">{COMPANY.address}<br />{COMPANY.city}, {COMPANY.postcode}<br />Tel: {COMPANY.phone}<br />{COMPANY.email}<br />VAT: {COMPANY.vatNumber}</div>
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
              <div className="inv-tot-row"><span style={{ color: "var(--text2)" }}>Subtotal</span><span className="mono">{fmt(subtotal)}</span></div>
              <div className="inv-tot-row"><span style={{ color: "var(--text2)" }}>VAT Total</span><span className="mono">{fmt(vatTotal)}</span></div>
              <div className="inv-tot-row divider"><span>Total</span><span className="mono">{fmt(total)}</span></div>
              <div className="inv-tot-row balance"><span>Balance Due</span><span className="mono" style={{ color: "var(--blue)" }}>{fmt(total)}</span></div>
            </div>
            <div className="inv-footer">
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Payment Details</div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>Please transfer using the invoice number as reference.</div>
              <div className="inv-bank-grid">
                <div><div className="inv-bank-lbl">Bank</div><div className="inv-bank-val">{COMPANY.bankName}</div></div>
                <div><div className="inv-bank-lbl">Sort Code</div><div className="inv-bank-val mono">{COMPANY.sortCode}</div></div>
                <div><div className="inv-bank-lbl">Account</div><div className="inv-bank-val mono">{COMPANY.accountNumber}</div></div>
              </div>
              <div style={{ marginTop: 16, fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>All goods remain our property until payment is received in full. VAT Reg No: {COMPANY.vatNumber}</div>
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

            {/* Print & Share */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Print & Share</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { icon: "ti-file-download", label: "Print Invoice", color: "var(--blue)", bg: "var(--blue-lt)", onClick: handlePrint },
                  { icon: "ti-mail", label: "Email Invoice", color: "var(--purple)", bg: "var(--purple-lt)", onClick: handleEmail },
                  { icon: "ti-brand-whatsapp", label: "WhatsApp", color: "#25D366", bg: "#f0fdf4", onClick: () => savedPhone ? sendWhatsApp(savedPhone) : setShowWaInput(true) },
                ].map(a => (
                  <button key={a.label} onClick={a.onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: a.bg, border: `1px solid ${a.color}22`, borderRadius: "var(--rl)", cursor: "pointer", fontFamily: "var(--sans)", transition: "all .14s" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: a.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className={"ti " + a.icon} style={{ color: a.color, fontSize: 20 }} />
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

            {/* Other actions */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>More Actions</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn bo" onClick={() => onDuplicate && onDuplicate(invoice)}><i className="ti ti-copy" />Duplicate Invoice</button>
                <button className="btn bo" onClick={handleEmail}><i className="ti ti-bell" />Send Reminder</button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              <span className={"badge " + sc.cls} style={{ marginRight: 8 }}>{sc.label}</span>
              {fmt(total)} · {invoice.invoice_number}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {savedPhone && <button className="btn bwa bsm" onClick={() => sendWhatsApp(savedPhone)}><i className="ti ti-brand-whatsapp" />{savedPhone}</button>}
              <button className="btn bo bsm" onClick={handleEmail} disabled={emailStatus==="sending"} style={{color:emailStatus==="sent"?"var(--green)":emailStatus==="error"?"var(--red)":undefined,borderColor:emailStatus==="sent"?"var(--green)":emailStatus==="error"?"var(--red)":undefined}}>
                <i className={"ti "+(emailStatus==="sending"?"ti-loader-2":emailStatus==="sent"?"ti-circle-check":emailStatus==="error"?"ti-alert-circle":"ti-mail")} style={{animation:emailStatus==="sending"?"spin .7s linear infinite":undefined}} />
                {emailStatus==="sending"?"Sending...":emailStatus==="sent"?"Sent!":emailStatus==="error"?"Failed":"Email"}
              </button>
              <button className="btn bp bsm" onClick={handlePrint}><i className="ti ti-printer" />Print</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SEARCHABLE DROPDOWN ───────────────────────────────────────────────────────
function SearchDropdown({ placeholder, items, onSelect, displayKey = "name", value = "" }) {
  const [query, setQuery] = useState(value);
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
            <div key={i} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "0.5px solid var(--border)", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} onMouseDown={() => { onSelect(item); setQuery(item[displayKey]); setOpen(false); }}>
              <div style={{ fontWeight: 500 }}>{item[displayKey]}</div>
              {item.city && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.city}{item.postcode ? ` · ${item.postcode}` : ""}</div>}
              {item.category && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.category} · {item.code || ""}</div>}
            </div>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", boxShadow: "var(--sh2)", zIndex: 100, padding: "12px 14px", fontSize: 13, color: "var(--text3)", marginTop: 4 }}>No results found for "{query}"</div>}
    </div>
  );
}

// ── INVOICE FORM ──────────────────────────────────────────────────────────────
function InvoiceForm({ contacts, products, token, userId, onSave, onClose }) {
  const [f, setF] = useState({ customer: "", invoice_date: today(), due_date: "", status: "pending", notes: "" });
  const [lines, setLines] = useState([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }]);
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null); // ← success state
  const [creatingDN, setCreatingDN] = useState(false);
  const [dnSaved, setDnSaved] = useState(false);
  const [dnDriver, setDnDriver] = useState("");
  const [dnAddress, setDnAddress] = useState("");
  const [dnNotes, setDnNotes] = useState("");

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
    if (!f.customer) return;
    setSaving(true);
    const existing = await sb.get(token, "invoices", "select=id");
    const count = Array.isArray(existing) ? existing.length + 1 : 1;
    const invoice_number = `INV-${String(count).padStart(4, "0")}`;
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
      alert("Failed to save invoice. Please try again.");
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
    const html = `<!DOCTYPE html><html><head><title>${savedInvoice.invoice_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;padding:20mm;color:#0f172a}.header{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #2563eb}.co-name{font-size:18px;font-weight:800;color:#2563eb;margin-bottom:4px}.co-detail{font-size:10px;color:#64748b;line-height:1.6}.inv-title{font-size:36px;font-weight:900;color:#ddd;text-align:right}.inv-num{font-size:14px;font-weight:700;text-align:right}.meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#f8fafc;padding:14px;border-radius:6px;margin-bottom:20px;border:1px solid #e2e8f0}.meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px}.meta-val{font-size:12px;font-weight:600}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#2563eb;color:#fff}th{padding:8px 10px;font-size:10px;text-transform:uppercase;text-align:left}th:last-child,td:last-child{text-align:right}td{padding:8px 10px;border-bottom:1px solid #f1f5f9}.totals{width:260px;margin-left:auto;margin-bottom:20px}.tot-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px}.balance{border-top:2px solid #000;margin-top:6px;padding-top:8px;font-size:15px;font-weight:700}.bank{background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}.bank-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:2px}.bank-val{font-size:12px;font-weight:600}.footer{font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}</style></head><body><div class="header"><div><div class="co-name">${COMPANY.name}</div><div class="co-detail">${COMPANY.address}<br>${COMPANY.city}, ${COMPANY.postcode}<br>Tel: ${COMPANY.phone}<br>${COMPANY.email}<br>VAT: ${COMPANY.vatNumber}</div></div><div><div class="inv-title">INVOICE</div><div class="inv-num">${savedInvoice.invoice_number}</div></div></div><div class="meta"><div><div class="meta-lbl">Invoice To</div><div class="meta-val" style="font-size:15px">${savedInvoice.customer}</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><div class="meta-lbl">Invoice #</div><div class="meta-val">${savedInvoice.invoice_number}</div></div><div><div class="meta-lbl">Date</div><div class="meta-val">${fmtDate(savedInvoice.invoice_date)}</div></div><div><div class="meta-lbl">Due Date</div><div class="meta-val">${fmtDate(savedInvoice.due_date)}</div></div><div><div class="meta-lbl">Terms</div><div class="meta-val">Due on receipt</div></div></div></div><table><thead><tr><th style="width:40%">Description</th><th>VAT</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${invLines.map(l => `<tr><td style="font-weight:600">${l.description}</td><td>${l.vat_rate === 0 ? "Exempt" : l.vat_rate + "% S"}</td><td style="text-align:right">${l.qty}</td><td style="text-align:right">${fmt(l.unit_price)}</td><td style="text-align:right;font-weight:700">${fmt(l.qty * l.unit_price)}</td></tr>`).join("")}</tbody></table><div class="totals"><div class="tot-row"><span style="color:#64748b">Subtotal</span><span>${fmt(sub)}</span></div><div class="tot-row"><span style="color:#64748b">VAT Total</span><span>${fmt(vat)}</span></div><div class="tot-row balance"><span>Balance Due</span><span style="color:#2563eb">${fmt(tot)}</span></div></div><div class="bank"><div><div class="bank-lbl">Bank</div><div class="bank-val">${COMPANY.bankName}</div></div><div><div class="bank-lbl">Sort Code</div><div class="bank-val">${COMPANY.sortCode}</div></div><div><div class="bank-lbl">Account</div><div class="bank-val">${COMPANY.accountNumber}</div></div></div><div class="footer">VAT Reg: ${COMPANY.vatNumber} · Ref: ${savedInvoice.invoice_number}</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${savedInvoice.invoice_number}.html`; a.click();
    URL.revokeObjectURL(url);
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
    return `<!DOCTYPE html><html><head><title>${dn.dn_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;padding:16mm;color:#0f172a}.header{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #0f172a}.co-name{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px}.co-detail{font-size:10px;color:#64748b;line-height:1.7}.dn-title{font-size:32px;font-weight:900;color:#e2e8f0;text-align:right;letter-spacing:-1px}.dn-num{font-size:15px;font-weight:700;text-align:right;color:#0f172a}.meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}.meta-box{background:#f8fafc;padding:14px;border-radius:6px;border:1px solid #e2e8f0}.meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}.meta-val{font-size:13px;font-weight:600;color:#0f172a}.meta-val.large{font-size:16px}table{width:100%;border-collapse:collapse;margin-bottom:24px}thead tr{background:#0f172a;color:#fff}th{padding:10px 12px;font-size:10px;font-weight:600;text-transform:uppercase;text-align:left;letter-spacing:0.5px}td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px}tr:nth-child(even) td{background:#fafbfc}.qty-col{text-align:center;font-weight:700;font-size:14px}.sig-section{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0}.sig-box{border-bottom:1.5px solid #0f172a;height:50px;margin-bottom:6px}.sig-lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px}.footer{margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}.ref-badge{display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:3px 8px;font-size:10px;font-weight:600;margin-top:6px}</style></head><body><div class="header"><div><div class="co-name">${COMPANY.name}</div><div class="co-detail">${COMPANY.address}<br>${COMPANY.city}, ${COMPANY.postcode}<br>Tel: ${COMPANY.phone}<br>${COMPANY.email}</div></div><div style="text-align:right"><div class="dn-title">DELIVERY NOTE</div><div class="dn-num">${dn.dn_number}</div>${dn.invoice_ref ? `<div class="ref-badge">Invoice: ${dn.invoice_ref}</div>` : ""}</div></div><div class="meta"><div class="meta-box"><div class="meta-lbl">Deliver To</div><div class="meta-val large">${dn.customer_name}</div>${dn.delivery_address ? `<div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.6">${dn.delivery_address}</div>` : ""}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="meta-box"><div class="meta-lbl">DN Number</div><div class="meta-val">${dn.dn_number}</div></div><div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${fmtDate(dn.delivery_date)}</div></div>${dn.driver ? `<div class="meta-box" style="grid-column:1/-1"><div class="meta-lbl">Driver / Courier</div><div class="meta-val">${dn.driver}</div></div>` : ""}</div></div><table><thead><tr><th style="width:50%">Description</th><th>Unit</th><th style="text-align:center">Qty Ordered</th><th style="text-align:center">Qty Delivered</th><th style="text-align:center">Condition</th></tr></thead><tbody>${dnLines.map(l => `<tr><td style="font-weight:600">${l.description || "—"}</td><td style="color:#64748b">${l.unit || "unit"}</td><td class="qty-col">${l.qty}</td><td class="qty-col" style="color:#94a3b8">____</td><td style="text-align:center;color:#94a3b8">____</td></tr>`).join("")}</tbody></table>${dn.notes ? `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:12px;margin-bottom:20px"><div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;margin-bottom:4px">Delivery Instructions</div><div style="font-size:12px;color:#78350f">${dn.notes}</div></div>` : ""}<div class="sig-section"><div><div class="sig-box"></div><div class="sig-lbl">Delivered by (Signature & Name)</div></div><div><div class="sig-box"></div><div class="sig-lbl">Received by (Signature, Name & Date)</div></div></div><div class="footer"><span>${COMPANY.name} · ${COMPANY.vatNumber}</span><span>Printed: ${new Date().toLocaleDateString("en-GB")}</span><span>${dn.dn_number}</span></div></body></html>`;
  };

  const downloadDN = (dn) => {
    const blob = new Blob([buildDNHtml(dn)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${dn.dn_number}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const emailDN = (dn) => {
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

  // ── SUCCESS SCREEN ─────────────────────────────────────────────────────────
  if (savedInvoice) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>

        {/* ── Success banner ── */}
        <div style={{ background: "linear-gradient(135deg,#10b981,#059669)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-circle-check" style={{ color: "#fff", fontSize: 26 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Invoice Created Successfully!</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>{savedInvoice.invoice_number} · {savedInvoice.customer} · {fmt(savedInvoice.amount)}</div>
          </div>
          <button className="btn bsm" style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }} onClick={onClose}><i className="ti ti-x" />Close</button>
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
                  <i className="ti ti-file-invoice" style={{ color: "#fff", fontSize: 20 }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--blue)", marginBottom: 3 }}>Print Invoice</div>
                <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>Download {savedInvoice.invoice_number} as a print-ready file</div>
              </button>

              {/* Print Delivery Note — immediate, no DB save required */}
              <button onClick={() => downloadDN(buildQuickDN())} style={{ border: "2px solid #0f172a", borderRadius: "var(--rl)", padding: "18px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", transition: "all .15s", fontFamily: "var(--sans)" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <i className="ti ti-truck-delivery" style={{ color: "#fff", fontSize: 20 }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>Print Delivery Note</div>
                <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>Download DN for driver — pre-filled from this invoice</div>
              </button>
            </div>

            {/* DN extra fields — driver, address, notes before printing */}
            <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 12 }}>
                <i className="ti ti-truck-delivery" style={{ marginRight: 6 }} />Delivery Note Details <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — updates the DN print)</span>
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
              <i className="ti ti-circle-check" style={{ color: "var(--green)", fontSize: 26, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green-dk)", marginBottom: 2 }}>Delivery Note {dnSaved.dn_number} Saved!</div>
                <div style={{ fontSize: 12, color: "var(--green-dk)", opacity: .8 }}>Saved to Delivery Notes. Print, email or WhatsApp below.</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <button onClick={printInvoice} style={{ border: "2px solid var(--blue)", borderRadius: "var(--rl)", padding: "14px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", fontFamily: "var(--sans)", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--blue-lt)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="ti ti-file-invoice" style={{ color: "var(--blue)", fontSize: 20 }} />
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)" }}>Print Invoice</div><div style={{ fontSize: 11, color: "var(--text2)" }}>{savedInvoice.invoice_number}</div></div>
                </div>
              </button>
              <button onClick={() => downloadDN(dnSaved)} style={{ border: "2px solid #0f172a", borderRadius: "var(--rl)", padding: "14px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", fontFamily: "var(--sans)", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="ti ti-truck-delivery" style={{ color: "#0f172a", fontSize: 20 }} />
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
  return (
    <div className="card">
      <div className="ch"><div><div className="ct">New VAT Invoice</div><div className="cs">Add line items with VAT rates</div></div><button className="btn bo bsm" onClick={onClose}><i className="ti ti-x" />Cancel</button></div>
      <div className="fg">
        <div className="fgrp"><label>Customer *</label><SearchDropdown placeholder="Search customers..." items={customers} onSelect={c => setF({ ...f, customer: c.name })} /></div>
        <div className="fgrp"><label>Status</label><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
        <div className="fgrp"><label>Invoice Date</label><input type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
        <div className="fgrp"><label>Due Date</label><input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} /></div>
        <div className="fgrp full"><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Any notes for this invoice..." /></div>
      </div>
      <div style={{ borderTop: "0.5px solid var(--border)" }}>
        <div className="il-header">{["Product / Description", "Qty", "Unit Price", "VAT", "Total", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</span>)}</div>
        {lines.map((l, i) => (
          <div key={i} className="il-line">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <SearchDropdown placeholder="Search products..." items={products} onSelect={p => updateLine(i, "product_id", p.id)} displayKey="name" />
              <input className="il-input" placeholder="Or type description..." value={l.description} onChange={e => updateLine(i, "description", e.target.value)} />
            </div>
            <input type="number" className="il-input mono" value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} />
            <input type="number" className="il-input mono" placeholder="0.00" value={l.unit_price} onChange={e => updateLine(i, "unit_price", e.target.value)} />
            <select className="il-input" value={l.vat_rate} onChange={e => updateLine(i, "vat_rate", e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">Exempt</option></select>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmt((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0))}</span>
            <button className="ib" onClick={() => lines.length > 1 && setLines(lines.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
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
          {saving ? <><div className="spin" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />Creating Invoice...</> : <><i className="ti ti-file-invoice" />Create Invoice</>}
        </button>
      </div>
    </div>
  );
}

// ── AGENT DASHBOARD ───────────────────────────────────────────────────────────
function AgentDashboard({ invoices, setInvoices, contacts, profile, setPage, token }) {
  const [viewInvoice, setViewInvoice] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState({});
  const myInv = invoices.filter(i => i.created_by === profile?.id);
  const myPaid = myInv.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const myPending = myInv.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const myOverdue = myInv.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const myCusts = contacts.filter(c => c.created_by === profile?.id);
  const name = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const markPaid = async (id, method) => {
    await sb.patch(token, "invoices", id, { status: "paid", payment_method: method || "cash" });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: method || "cash" } : i));
    setPayingId(null);
  };
  return (
    <div>
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} contacts={contacts} />}
      <div className="welcome-row">
        <div><div className="welcome-h">{greeting}, {name} 👋</div><div className="welcome-sub"><span className="trend-pill">Your personal dashboard</span></div></div>
        <div className="quick-actions">
          <div className="qa-btn" onClick={() => setPage("invoices")}><i className="ti ti-plus" />New Invoice</div>
          <div className="qa-btn" onClick={() => setPage("contacts")}><i className="ti ti-user-plus" />Add Customer</div>
        </div>
      </div>
      <div className="kgrid">
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--blue-lt)" }}><i className="ti ti-file-invoice" style={{ color: "var(--blue)" }} /></div><span className="kpi-badge" style={{ background: "var(--blue-lt)", color: "#1e40af" }}>{myInv.length} total</span></div><div className="kpi-val">{myInv.length}</div><div className="kpi-label">My Invoices</div></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--green-lt)" }}><i className="ti ti-circle-check" style={{ color: "var(--green)" }} /></div><span className="kpi-badge" style={{ background: "var(--green-lt)", color: "var(--green-dk)" }}>Paid</span></div><div className="kpi-val" style={{ color: "var(--green)" }}>{fmt(myPaid)}</div><div className="kpi-label">Total Sales</div></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--amber-lt)" }}><i className="ti ti-clock" style={{ color: "var(--amber)" }} /></div><span className="kpi-badge" style={{ background: "var(--amber-lt)", color: "var(--amber-dk)" }}>Pending</span></div><div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(myPending)}</div><div className="kpi-label">Awaiting Payment</div></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--purple-lt)" }}><i className="ti ti-users" style={{ color: "var(--purple)" }} /></div><span className="kpi-badge" style={{ background: "var(--purple-lt)", color: "var(--purple-dk)" }}>{myCusts.length}</span></div><div className="kpi-val" style={{ color: "var(--purple)" }}>{myCusts.length}</div><div className="kpi-label">My Customers</div></div>
      </div>
      {myOverdue > 0 && <div style={{ background: "var(--red-lt)", border: "0.5px solid #fca5a5", borderRadius: "var(--rl)", padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-alert-triangle" style={{ color: "#fff", fontSize: 20 }} /></div><div><div style={{ fontWeight: 600, color: "var(--red-dk)", marginBottom: 2 }}>Overdue invoices: {fmt(myOverdue)}</div><div style={{ fontSize: 12, color: "var(--red-dk)", opacity: .7 }}>Please follow up with your customers</div></div></div>}
      <div className="card">
        <div className="ch"><div className="ct">My Recent Invoices</div><button className="btn bo bsm" onClick={() => setPage("invoices")}><i className="ti ti-arrow-right" />View all</button></div>
        <div className="tw"><table><thead><tr><th>Customer</th><th>Invoice #</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {myInv.slice(0, 8).map(inv => (
            <tr key={inv.id}>
              <td style={{ fontWeight: 500 }}>{inv.customer}</td>
              <td className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{inv.invoice_number}</td>
              <td className="mono">{fmt(inv.amount)}</td>
              <td><div style={{ display: "flex", flexDirection: "column", gap: 3 }}><span className={"badge " + (inv.status === "paid" ? "b-green" : inv.status === "overdue" ? "b-red" : inv.status === "pending" ? "b-amber" : "b-gray")}>{inv.status}</span>{inv.payment_method && <span style={{ fontSize: 10, color: "var(--text3)" }}>{inv.payment_method === "cash" ? "💵" : inv.payment_method === "bank" ? "🏦" : inv.payment_method === "card" ? "💳" : "📝"} {inv.payment_method}</span>}</div></td>
              <td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="btn bo bsm" onClick={() => setViewInvoice(inv)}><i className="ti ti-file-invoice" />View</button>
                {inv.status !== "paid" && (payingId === inv.id ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <select style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "4px 8px", fontSize: 11, outline: "none" }} value={payMethod[inv.id] || "cash"} onChange={e => setPayMethod(prev => ({ ...prev, [inv.id]: e.target.value }))}>
                      <option value="cash">💵 Cash</option><option value="bank">🏦 Bank</option><option value="card">💳 Card</option><option value="cheque">📝 Cheque</option>
                    </select>
                    <button className="btn bp bsm" onClick={() => markPaid(inv.id, payMethod[inv.id] || "cash")}>✓</button>
                    <button className="btn bo bsm" onClick={() => setPayingId(null)}>✕</button>
                  </div>
                ) : <button className="btn bp bsm" onClick={() => setPayingId(inv.id)}>Mark Paid</button>)}
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
  const paidCount = invoices.filter(i => i.status === "paid").length;
  const pendingCount = invoices.filter(i => i.status === "pending").length;
  const overdueCount = invoices.filter(i => i.status === "overdue").length;
  const lowStock = products.filter(p => p.stock_qty <= p.reorder_level);
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
  const drillProducts = () => openDrill("All Products", products.map(p => ({ name: p.name, code: p.stock_qty + " " + (p.unit||"units"), value: fmt(p.sale_price||0), extra: p.stock_qty <= (p.reorder_level||5) ? "⚠ Low" : "✓ OK" })), ["Product", "Stock", "Price", "Status"], `${products.length} products`);
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
        <div className="modal-overlay" onClick={() => setDrill(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{drill.title}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{drill.summary}</div>
              </div>
              <button className="btn bo bsm" onClick={() => setDrill(null)}><i className="ti ti-x" /></button>
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
        </div>
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
          <button className="qa-btn" onClick={() => setPage("delivery-notes")}><i className="ti ti-truck-delivery" />Delivery</button>
          <button className="qa-btn primary" onClick={() => setPage("analytics")}><i className="ti ti-chart-bar" />Analytics</button>
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
            <div className="kpi-icon" style={{ background: "var(--blue-lt)" }}><i className="ti ti-currency-pound" style={{ color: "var(--blue)" }} /></div>
            <span className="kpi-badge" style={{ background: "var(--blue-lt)", color: "#1e40af" }}>Total</span>
          </div>
          <div className="kpi-val">{fmt(revenue)}</div>
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
            <div className="kpi-icon" style={{ background: "var(--green-lt)" }}><i className="ti ti-circle-check" style={{ color: "var(--green)" }} /></div>
            <span className="kpi-badge" style={{ background: "var(--green-lt)", color: "var(--green-dk)" }}>{paidCount} invoices</span>
          </div>
          <div className="kpi-val tg">{fmt(paid)}</div>
          <div className="kpi-label">Collected Revenue</div>
          <svg className="spark" viewBox="0 0 120 40">
            <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".3"/><stop offset="100%" stopColor="#10b981" stopOpacity="0"/></linearGradient></defs>
            <polygon points="0,34 20,28 40,22 60,20 80,14 100,10 120,6 120,40 0,40" fill="url(#g2)" />
            <polyline points="0,34 20,28 40,22 60,20 80,14 100,10 120,6" fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        {/* Outstanding */}
        <div className="kpi" style={{ "--kpi-accent": "var(--amber)" }} onClick={drillOutstanding}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: "var(--amber-lt)" }}><i className="ti ti-clock" style={{ color: "var(--amber)" }} /></div>
            <span className="kpi-badge" style={{ background: "var(--amber-lt)", color: "var(--amber-dk)" }}>{pendingCount + overdueCount} open</span>
          </div>
          <div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(unpaid)}</div>
          <div className="kpi-label">Outstanding</div>
          <div style={{ marginTop: 8, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", display: "flex" }}>
              <div style={{ width: `${overdue / (unpaid || 1) * 100}%`, background: "var(--red)", transition: "width .5s" }} />
              <div style={{ flex: 1, background: "var(--amber)", opacity: .6 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 600 }}>↑ {fmt(overdue)} overdue</div>
          </div>
        </div>
        {/* Net Profit */}
        <div className="kpi" style={{ "--kpi-accent": net >= 0 ? "var(--green)" : "var(--red)" }} onClick={drillNet}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: net >= 0 ? "var(--green-lt)" : "var(--red-lt)" }}><i className="ti ti-trending-up" style={{ color: net >= 0 ? "var(--green)" : "var(--red)" }} /></div>
            <span className="kpi-badge" style={{ background: net >= 0 ? "var(--green-lt)" : "var(--red-lt)", color: net >= 0 ? "var(--green-dk)" : "var(--red-dk)" }}>{net >= 0 ? "Profit" : "Loss"}</span>
          </div>
          <div className="kpi-val" style={{ color: net >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(net)}</div>
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
                  <div style={{width:10,height:10,borderRadius:2,background:"#f59e0b",opacity:.6}} />Pending
                </div>
                <button className="btn bo bsm" onClick={()=>setPage("admin-reports")}><i className="ti ti-arrow-right"/>Reports</button>
              </div>
            </div>
            <div style={{padding:"20px 24px"}}>
              {/* SVG Chart */}
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:8,alignItems:"stretch"}}>
                {/* Y-axis labels */}
                <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",paddingBottom:24,height:140}}>
                  {[maxVal,maxVal*0.75,maxVal*0.5,maxVal*0.25,0].map((v,i)=>(
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
                  <tr key={inv.id} style={{ cursor: "pointer" }}>
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
function Invoices({ invoices, setInvoices, contacts, products, token, userId }) {
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [viewMode, setViewMode] = useState("table"); // table | card

  const markPaid = async (id, method) => {
    await sb.patch(token, "invoices", id, { status: "paid", payment_method: method || "cash" });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: method || "cash" } : i));
    const inv = invoices.find(i => i.id === id);
    if (inv) logAudit(token, userId, "payment_received", "invoice", id, `${inv.invoice_number} marked paid via ${method||"cash"} — ${new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(inv.amount)}`);
    setPayingId(null); setPayMethod(prev => ({ ...prev, [id]: "" }));
  };

  // Generate and download a delivery note from any invoice
  const printDNFromInvoice = (inv) => {
    const invLines = inv.lines || [{ description: inv.description || "See invoice", qty: 1, unit: "unit" }];
    const dnLines = invLines.filter(l => l.description && l.description.trim() !== "").map(l => ({
      description: l.description, qty: l.qty, unit: l.unit || "unit"
    }));
    const cust = contacts.find(c => c.name === inv.customer);
    const address = [cust?.address, cust?.city, cust?.postcode].filter(Boolean).join(", ");
    const dn_number = `DN-${inv.invoice_number.replace("INV-", "")}`;
    const html = `<!DOCTYPE html><html><head><title>${dn_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;padding:16mm;color:#0f172a}.header{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #0f172a}.co-name{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px}.co-detail{font-size:10px;color:#64748b;line-height:1.7}.dn-title{font-size:32px;font-weight:900;color:#e2e8f0;text-align:right;letter-spacing:-1px}.dn-num{font-size:15px;font-weight:700;text-align:right;color:#0f172a}.meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}.meta-box{background:#f8fafc;padding:14px;border-radius:6px;border:1px solid #e2e8f0}.meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}.meta-val{font-size:13px;font-weight:600;color:#0f172a}.large{font-size:16px}table{width:100%;border-collapse:collapse;margin-bottom:24px}thead tr{background:#0f172a;color:#fff}th{padding:10px 12px;font-size:10px;font-weight:600;text-transform:uppercase;text-align:left;letter-spacing:0.5px}td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px}tr:nth-child(even) td{background:#fafbfc}.qty-col{text-align:center;font-weight:700;font-size:14px}.sig-section{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0}.sig-box{border-bottom:1.5px solid #0f172a;height:50px;margin-bottom:6px}.sig-lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px}.footer{margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}.ref-badge{display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:3px 8px;font-size:10px;font-weight:600;margin-top:6px}</style></head><body>
    <div class="header">
      <div><div class="co-name">${COMPANY.name}</div><div class="co-detail">${COMPANY.address}<br>${COMPANY.city}, ${COMPANY.postcode}<br>Tel: ${COMPANY.phone}<br>${COMPANY.email}</div></div>
      <div style="text-align:right"><div class="dn-title">DELIVERY NOTE</div><div class="dn-num">${dn_number}</div><div class="ref-badge">Invoice: ${inv.invoice_number}</div></div>
    </div>
    <div class="meta">
      <div class="meta-box"><div class="meta-lbl">Deliver To</div><div class="meta-val large">${inv.customer}</div>${address ? `<div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.6">${address}</div>` : ""}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="meta-box"><div class="meta-lbl">DN Number</div><div class="meta-val">${dn_number}</div></div>
        <div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${fmtDate(inv.invoice_date)}</div></div>
        <div class="meta-box"><div class="meta-lbl">Invoice Ref</div><div class="meta-val">${inv.invoice_number}</div></div>
        <div class="meta-box"><div class="meta-lbl">Status</div><div class="meta-val">${inv.status?.toUpperCase()}</div></div>
      </div>
    </div>
    <table>
      <thead><tr><th style="width:50%">Description</th><th>Unit</th><th style="text-align:center">Qty Ordered</th><th style="text-align:center">Qty Delivered</th><th style="text-align:center">Condition</th></tr></thead>
      <tbody>${dnLines.map(l => `<tr><td style="font-weight:600">${l.description}</td><td style="color:#64748b">${l.unit}</td><td class="qty-col">${l.qty}</td><td class="qty-col" style="color:#94a3b8">____</td><td style="text-align:center;color:#94a3b8">____</td></tr>`).join("")}</tbody>
    </table>
    <div class="sig-section">
      <div><div class="sig-box"></div><div class="sig-lbl">Delivered by (Signature &amp; Name)</div></div>
      <div><div class="sig-box"></div><div class="sig-lbl">Received by (Signature, Name &amp; Date)</div></div>
    </div>
    <div class="footer"><span>${COMPANY.name} · ${COMPANY.vatNumber}</span><span>Printed: ${new Date().toLocaleDateString("en-GB")}</span><span>${dn_number}</span></div>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${dn_number}.html`; a.click();
    URL.revokeObjectURL(url);
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
  const SortIcon = ({ col }) => <i className={"ti " + (sortCol !== col ? "ti-arrows-sort" : sortDir === "asc" ? "ti-sort-ascending" : "ti-sort-descending")} style={{ fontSize: 11, marginLeft: 4, opacity: sortCol === col ? 1 : 0.3 }} />;
  return (
    <div>
      {viewInvoice && <InvoiceModal
        invoice={viewInvoice}
        onClose={() => setViewInvoice(null)}
        contacts={contacts}
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
      {showForm && <InvoiceForm contacts={contacts} products={products} token={token} userId={userId} onSave={inv => setInvoices(prev => [inv, ...prev])} onClose={() => setShowForm(false)} />}
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
                <div style={{ fontSize:22,fontWeight:800,letterSpacing:"-.5px",marginBottom:4 }}>{fmt(inv.amount)}</div>
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
        <div className="tw"><table><thead><tr>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("customer")}>Customer <i className={"ti "+(sortCol!=="customer"?"ti-arrows-sort":sortDir==="asc"?"ti-sort-ascending-letters":"ti-sort-descending-letters")} style={{fontSize:10,marginLeft:3,opacity:sortCol==="customer"?1:.3}} /></th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("invoice_number")}>Invoice # <i className={"ti "+(sortCol!=="invoice_number"?"ti-arrows-sort":sortDir==="asc"?"ti-sort-ascending":"ti-sort-descending")} style={{fontSize:10,marginLeft:3,opacity:sortCol==="invoice_number"?1:.3}} /></th>
          <th className="hm" style={{cursor:"pointer"}} onClick={()=>sortToggle("invoice_date")}>Date <i className={"ti "+(sortCol!=="invoice_date"?"ti-arrows-sort":"ti-calendar")} style={{fontSize:10,marginLeft:3,opacity:sortCol==="invoice_date"?1:.3}} /></th>
          <th className="hm">Due</th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("amount")}>Amount <i className={"ti "+(sortCol!=="amount"?"ti-arrows-sort":sortDir==="asc"?"ti-sort-ascending-numbers":"ti-sort-descending-numbers")} style={{fontSize:10,marginLeft:3,opacity:sortCol==="amount"?1:.3}} /></th>
          <th>Status</th><th>Actions</th>
        </tr></thead><tbody>
          {filtered.map(inv => (
            <tr key={inv.id}>
              <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="c-av" style={{ background: ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][inv.customer?.charCodeAt(0) % 5] || "#6366f1" }}>{inv.customer?.[0]?.toUpperCase()}</div><span style={{ fontWeight: 500 }}>{inv.customer}</span></div></td>
              <td className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{inv.invoice_number}</td>
              <td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(inv.invoice_date)}</td>
              <td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(inv.due_date)}</td>
              <td className="mono" style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td>
              <td><div style={{ display: "flex", flexDirection: "column", gap: 3 }}><span className={"badge " + (inv.status === "paid" ? "b-green" : inv.status === "overdue" ? "b-red" : inv.status === "pending" ? "b-amber" : "b-gray")}>{inv.status}</span>{inv.payment_method && <span style={{ fontSize: 10, color: "var(--text3)" }}>{inv.payment_method === "cash" ? "💵" : inv.payment_method === "bank" ? "🏦" : inv.payment_method === "card" ? "💳" : "📝"} {inv.payment_method}</span>}</div></td>
              <td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn bo bsm" onClick={() => setViewInvoice(inv)}><i className="ti ti-file-invoice" />View</button>
                  <button className="btn bsm" style={{ background: "#0f172a", color: "#fff" }} onClick={() => printDNFromInvoice(inv)} title="Download Delivery Note"><i className="ti ti-truck-delivery" />DN</button>
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
function Contacts({ contacts, setContacts, token, userId }) {
  const [tab, setTab] = useState("customer");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "" });
  const filtered = contacts.filter(c => c.type === tab || c.type === "both");
  const save = async () => {
    if (!f.name) return; setSaving(true);
    const data = await sb.post(token, "contacts", { ...f, created_by: userId });
    if (data[0]) setContacts(prev => [data[0], ...prev]);
    setF({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "" });
    setShowForm(false); setSaving(false);
  };
  const avatarColors = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444","#2563eb","#ec4899"];
  return (
    <div>
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
          <div className="tw"><table><thead><tr><th>Name</th><th>Email</th><th className="hm">Phone</th><th className="hm">Location</th><th>Actions</th></tr></thead><tbody>
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
        {filtered.map(c => <div key={c.id} className="contact-card"><div className="cc-av" style={{ background: avatarColors[c.name?.charCodeAt(0) % avatarColors.length] || "#6366f1" }}>{c.name?.[0]?.toUpperCase()}</div><div className="cc-name">{c.name}</div>{c.email && <div className="cc-detail"><i className="ti ti-mail" />{c.email}</div>}{c.phone && <div className="cc-detail"><i className="ti ti-phone" />{c.phone}</div>}{c.city && <div className="cc-detail"><i className="ti ti-map-pin" />{c.city}{c.postcode ? `, ${c.postcode}` : ""}</div>}{c.vat_number && <div style={{ marginTop: 10 }}><span className="tag">VAT: {c.vat_number}</span></div>}</div>)}
        {filtered.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "var(--text3)", gridColumn: "1/-1" }}>No {tab}s yet — add your first one!</div>}
      </div>
      )}
    </div>
  );
}

// ── INVENTORY ─────────────────────────────────────────────────────────────────
function Inventory({ products, setProducts, token, userId }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
  const save = async () => {
    if (!f.name) return; setSaving(true);
    const data = await sb.post(token, "products", { ...f, cost_price: parseFloat(f.cost_price)||0, sale_price: parseFloat(f.sale_price)||0, vat_rate: parseFloat(f.vat_rate)||20, stock_qty: parseFloat(f.stock_qty)||0, reorder_level: parseFloat(f.reorder_level)||0, created_by: userId });
    if (data[0]) setProducts(prev => [data[0], ...prev]);
    setF({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
    setShowForm(false); setSaving(false);
  };
  const lowStock = products.filter(p => p.stock_qty <= p.reorder_level);
  return (
    <div>
      <div className="ph"><div><div className="pt">Stock & Inventory</div><div className="psub">Track your products and stock levels</div></div><button className="btn bp" onClick={() => setShowForm(!showForm)}><i className="ti ti-plus" />Add Product</button></div>
      <div className="g4" style={{ marginBottom: 20 }}><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Products</div><div className="kpi-val">{products.length}</div></div><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Low Stock</div><div className="kpi-val" style={{ color: lowStock.length > 0 ? "var(--red)" : "var(--green)" }}>{lowStock.length}</div></div><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Stock Value</div><div className="kpi-val">{fmt(products.reduce((s,p) => s+p.stock_qty*p.cost_price,0))}</div></div><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Retail Value</div><div className="kpi-val">{fmt(products.reduce((s,p) => s+p.stock_qty*p.sale_price,0))}</div></div></div>
      {showForm && <div className="card" style={{ marginBottom: 20 }}><div className="ch"><div className="ct">New Product</div></div><div className="fg3"><div className="fgrp"><label>Code</label><input value={f.code} onChange={e => setF({...f,code:e.target.value})} placeholder="SKU001" /></div><div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({...f,name:e.target.value})} placeholder="Product name" /></div><div className="fgrp"><label>Category</label><input value={f.category} onChange={e => setF({...f,category:e.target.value})} placeholder="e.g. Vapes, Pods..." /></div><div className="fgrp"><label>Unit</label><select value={f.unit} onChange={e => setF({...f,unit:e.target.value})}><option>unit</option><option>pack</option><option>box</option><option>kg</option><option>litre</option></select></div><div className="fgrp"><label>Cost Price (£)</label><input type="number" value={f.cost_price} onChange={e => setF({...f,cost_price:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>Sale Price (£)</label><input type="number" value={f.sale_price} onChange={e => setF({...f,sale_price:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>VAT Rate</label><select value={f.vat_rate} onChange={e => setF({...f,vat_rate:e.target.value})}><option value="20">20% Standard</option><option value="5">5% Reduced</option><option value="0">0% Exempt</option></select></div><div className="fgrp"><label>Stock Qty</label><input type="number" value={f.stock_qty} onChange={e => setF({...f,stock_qty:e.target.value})} placeholder="0" /></div><div className="fgrp"><label>Reorder Level</label><input type="number" value={f.reorder_level} onChange={e => setF({...f,reorder_level:e.target.value})} placeholder="0" /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Product"}</button></div></div>}
      <div className="card"><div className="tw"><table><thead><tr><th>Code</th><th>Product</th><th>Category</th><th className="hm">Cost</th><th>Sale Price</th><th>VAT</th><th>In Stock</th><th>Status</th></tr></thead><tbody>
        {products.map(p => <tr key={p.id}><td className="mono tm" style={{fontSize:12}}>{p.code||"—"}</td><td style={{fontWeight:500}}>{p.name}</td><td className="tm">{p.category||"—"}</td><td className="mono hm">{fmt(p.cost_price)}</td><td className="mono">{fmt(p.sale_price)}</td><td><span className="tag">{p.vat_rate}%</span></td><td className="mono">{p.stock_qty} {p.unit}</td><td><span className={"badge "+(p.stock_qty<=p.reorder_level?"b-red":p.stock_qty<=p.reorder_level*2?"b-amber":"b-green")}>{p.stock_qty<=p.reorder_level?"Low Stock":p.stock_qty<=p.reorder_level*2?"Running Low":"In Stock"}</span></td></tr>)}
        {products.length===0&&<tr><td colSpan={8} className="empty">No products yet</td></tr>}
      </tbody></table></div></div>
    </div>
  );
}

// ── PURCHASES ─────────────────────────────────────────────────────────────────
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
    if (po[0]) { for (const l of lines) if (l.product_id) await sb.post(token, "purchase_order_lines", { po_id: po[0].id, product_id: l.product_id, product_name: l.product_name, qty: parseFloat(l.qty)||0, unit_cost: parseFloat(l.unit_cost)||0, vat_rate: parseFloat(l.vat_rate)||0, total: lineTotal(l) }); setPOs(prev => [po[0],...prev]); }
    setLines([{ product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20" }]);
    setF({ supplier_id:"",order_date:today(),expected_date:"",notes:"" });
    setShowForm(false); setSaving(false);
  };
  const updateStatus = async (id, status) => { await sb.patch(token,"purchase_orders",id,{status}); setPOs(prev => prev.map(p => p.id===id?{...p,status}:p)); };
  return (
    <div>
      <div className="ph"><div><div className="pt">Purchase Orders</div><div className="psub">Order stock from your suppliers</div></div><button className="btn bp" onClick={() => setShowForm(!showForm)}><i className="ti ti-plus" />New PO</button></div>
      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Purchase Order</div></div><div className="fg"><div className="fgrp"><label>Supplier *</label><select value={f.supplier_id} onChange={e => setF({...f,supplier_id:e.target.value})}><option value="">Select supplier...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="fgrp"><label>Order Date</label><input type="date" value={f.order_date} onChange={e => setF({...f,order_date:e.target.value})} /></div><div className="fgrp"><label>Expected Delivery</label><input type="date" value={f.expected_date} onChange={e => setF({...f,expected_date:e.target.value})} /></div><div className="fgrp"><label>Notes</label><input value={f.notes} onChange={e => setF({...f,notes:e.target.value})} placeholder="Any notes..." /></div></div><div style={{borderTop:"0.5px solid var(--border)"}}><div className="po-line" style={{background:"#fafbfc"}}>{["Product","Qty","Unit Cost","VAT %","Total",""].map(h => <span key={h} style={{fontSize:11,fontWeight:600,color:"var(--text3)",textTransform:"uppercase"}}>{h}</span>)}</div>{lines.map((l,i) => <div key={i} className="po-line"><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.product_id} onChange={e => updateLine(i,"product_id",e.target.value)}><option value="">Select product...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0" value={l.qty} onChange={e => updateLine(i,"qty",e.target.value)} /><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0.00" value={l.unit_cost} onChange={e => updateLine(i,"unit_cost",e.target.value)} /><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.vat_rate} onChange={e => updateLine(i,"vat_rate",e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">0%</option></select><span className="mono" style={{fontSize:12,fontWeight:600}}>{fmt(lineTotal(l))}</span><button className="ib" onClick={() => lines.length>1&&setLines(lines.filter((_,j) => j!==i))}><i className="ti ti-x" /></button></div>)}<div style={{padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafbfc",borderTop:"0.5px solid var(--border)"}}><button className="btn bo bsm" onClick={() => setLines([...lines,{product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20"}])}><i className="ti ti-plus" />Add Line</button><div style={{textAlign:"right"}}><div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>Subtotal: {fmt(total)} · VAT: {fmt(vatTotal)}</div><div style={{fontSize:16,fontWeight:700}}>Total: {fmt(total+vatTotal)}</div></div></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Create PO"}</button></div></div>}
      <div className="card"><div className="tw"><table><thead><tr><th>PO #</th><th>Supplier</th><th className="hm">Order Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {pos.map(po => <tr key={po.id}><td className="mono" style={{color:"var(--blue)",fontSize:12}}>{po.po_number}</td><td style={{fontWeight:500}}>{po.supplier_name}</td><td className="hm tm" style={{fontSize:12}}>{fmtDate(po.order_date)}</td><td className="mono" style={{fontWeight:600}}>{fmt(po.total)}</td><td><span className={"badge "+(po.status==="received"?"b-green":po.status==="sent"?"b-blue":po.status==="cancelled"?"b-red":"b-gray")}>{po.status}</span></td><td>{po.status==="draft"&&<button className="btn bo bsm" onClick={() => updateStatus(po.id,"sent")}>Mark Sent</button>}{po.status==="sent"&&<button className="btn bp bsm" onClick={() => updateStatus(po.id,"received")}>Mark Received</button>}</td></tr>)}
        {pos.length===0&&<tr><td colSpan={6} className="empty">No purchase orders yet</td></tr>}
      </tbody></table></div></div>
    </div>
  );
}

// ── CREDIT NOTES ──────────────────────────────────────────────────────────────
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
    if (data[0]) setCNs(prev => [data[0],...prev]);
    setF({ customer_id:"",invoice_id:"",reason:"",amount:"",issue_date:today() });
    setShowForm(false); setSaving(false);
  };
  const updateStatus = async (id,status) => { await sb.patch(token,"credit_notes",id,{status}); setCNs(prev => prev.map(c => c.id===id?{...c,status}:c)); };
  return (
    <div>
      <div className="ph"><div><div className="pt">Credit Notes</div><div className="psub">Issue and apply credit notes</div></div><button className="btn bp" onClick={() => setShowForm(!showForm)}><i className="ti ti-plus" />New Credit Note</button></div>
      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Credit Note</div></div><div className="fg"><div className="fgrp"><label>Customer *</label><select value={f.customer_id} onChange={e => setF({...f,customer_id:e.target.value})}><option value="">Select customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="fgrp"><label>Related Invoice</label><select value={f.invoice_id} onChange={e => setF({...f,invoice_id:e.target.value})}><option value="">Select invoice (optional)...</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {fmt(i.amount)}</option>)}</select></div><div className="fgrp"><label>Amount (£) *</label><input type="number" value={f.amount} onChange={e => setF({...f,amount:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>Issue Date</label><input type="date" value={f.issue_date} onChange={e => setF({...f,issue_date:e.target.value})} /></div><div className="fgrp full"><label>Reason *</label><input value={f.reason} onChange={e => setF({...f,reason:e.target.value})} placeholder="Reason for credit note..." /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Issue Credit Note"}</button></div></div>}
      <div className="card"><div className="tw"><table><thead><tr><th>CN #</th><th>Customer</th><th className="hm">Date</th><th>Amount</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {cns.map(cn => <tr key={cn.id}><td className="mono" style={{color:"var(--purple)",fontSize:12}}>{cn.cn_number}</td><td style={{fontWeight:500}}>{cn.customer_name}</td><td className="hm tm" style={{fontSize:12}}>{fmtDate(cn.issue_date)}</td><td className="mono tr-c" style={{fontWeight:600}}>{fmt(cn.amount)}</td><td className="tm">{cn.reason}</td><td><span className={"badge "+(cn.status==="applied"?"b-green":cn.status==="issued"?"b-blue":"b-gray")}>{cn.status}</span></td><td>{cn.status==="draft"&&<button className="btn bo bsm" onClick={() => updateStatus(cn.id,"issued")}>Issue</button>}{cn.status==="issued"&&<button className="btn bp bsm" onClick={() => updateStatus(cn.id,"applied")}>Apply</button>}</td></tr>)}
        {cns.length===0&&<tr><td colSpan={7} className="empty">No credit notes yet</td></tr>}
      </tbody></table></div></div>
    </div>
  );
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
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
          <div className="tw"><table><thead><tr><th>Invoice #</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
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
        <div className="tw"><table><thead><tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Adjust By</th><th>Reason</th><th>Action</th></tr></thead><tbody>
          {filtered.slice(0, 30).map(p => {
            const adj = adjustments[p.id] || "";
            const delta = parseInt(adj) || 0;
            const newQty = Math.max(0, (p.stock_qty || 0) + delta);
            return (
              <tr key={p.id} style={{ background: success === p.id ? "var(--green-lt)" : "transparent" }}>
                <td><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{p.code || ""}</div></td>
                <td><span className="tag">{p.category || "General"}</span></td>
                <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="mono" style={{ fontWeight: 600, fontSize: 15 }}>{p.stock_qty || 0}</span>{delta !== 0 && <span style={{ fontSize: 11, color: delta > 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>→ {newQty}</span>}</div>{p.stock_qty <= p.reorder_level && <div style={{ fontSize: 10, color: "var(--red)", fontWeight: 600, marginTop: 2 }}>LOW STOCK</div>}</td>
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
      <div className="g4" style={{ marginBottom: 20 }}>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Total Sales</div><div className="kpi-val">{fmt(totalSales)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Collected</div><div className="kpi-val tg">{fmt(totalPaid)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Pending</div><div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(totalPending)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Overdue</div><div className="kpi-val tr-c">{fmt(totalOverdue)}</div></div>
      </div>
      <div className="card">
        <div className="ch"><div className="ct">Invoice Detail</div><div className="cs">{displayInvoices.length} records</div></div>
        <div className="tw"><table><thead><tr><th>Customer</th><th className="hm">Agent</th><th className="hm">Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
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
      <div className="g4" style={{ marginBottom: 18 }}>
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
                    <div key={day} title={fmtDate(day) + ": " + qty + " units"} style={{ flex: 1, background: "var(--blue)", borderRadius: "2px 2px 0 0", height: Math.max(4, Math.round((qty/maxDay)*56))+"px", opacity: .75, cursor: "pointer", transition: "opacity .1s" }} onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=.75} />
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
          <div className="tw"><table>
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
          <div className="tw"><table>
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
            <div className="tw"><table>
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
                          <div style={{height:6,width:Math.max(12,Math.round((p.totalQty/maxQty)*80))+"px",background:"var(--blue)",borderRadius:3,opacity:.35}} />
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
  const catData = categories.map(cat => ({ name: cat, products: products.filter(p=>(p.category||"General")===cat).length, stockValue: products.filter(p=>(p.category||"General")===cat).reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0), retailValue: products.filter(p=>(p.category||"General")===cat).reduce((s,p)=>s+(p.stock_qty||0)*(p.sale_price||0),0), lowStock: products.filter(p=>(p.category||"General")===cat && p.stock_qty<=p.reorder_level).length })).sort((a,b)=>b.retailValue-a.retailValue);
  const totalStockValue = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0);
  const totalRetailValue = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.sale_price||0),0);
  const lowStockItems = products.filter(p=>p.stock_qty<=p.reorder_level);
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
          <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--blue-lt)"}}><i className="ti ti-currency-pound" style={{color:"var(--blue)"}} /></div><span className="kpi-badge" style={{background:"var(--blue-lt)",color:"#1e40af"}}>{periodLabels[period]}</span></div><div className="kpi-val">{fmt(totalSales)}</div><div className="kpi-label">Total Sales</div></div>
          <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--green-lt)"}}><i className="ti ti-circle-check" style={{color:"var(--green)"}} /></div></div><div className="kpi-val tg">{fmt(totalPaid)}</div><div className="kpi-label">Collected</div></div>
          <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--amber-lt)"}}><i className="ti ti-clock" style={{color:"var(--amber)"}} /></div></div><div className="kpi-val" style={{color:"var(--amber)"}}>{fmt(totalPending)}</div><div className="kpi-label">Pending</div></div>
          <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--red-lt)"}}><i className="ti ti-alert-circle" style={{color:"var(--red)"}} /></div></div><div className="kpi-val tr-c">{fmt(totalOverdue)}</div><div className="kpi-label">Overdue</div></div>
        </div>
        <div className="card">
          <div className="ch"><div className="ct">Monthly Sales — Last 12 Months</div></div>
          <div style={{padding:"20px 20px 8px"}}>
            <div style={{display:"flex",alignItems:"flex-end",gap:6,height:140,marginBottom:8}}>
              {monthlySales.map((m,i) => <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}><div style={{fontSize:9,color:"var(--text3)"}}>£{Math.round(m.total/1000)}k</div><div style={{width:"100%",background:"var(--blue)",borderRadius:"4px 4px 0 0",height:Math.max(4,(m.total/maxMonthly)*120)+"px",opacity:.85}} title={fmt(m.total)} /><div style={{fontSize:9,color:"var(--text3)"}}>{m.month}</div></div>)}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text2)",borderTop:"0.5px solid var(--border)",paddingTop:8}}>
              <span>Total: <strong>{fmt(monthlySales.reduce((s,m)=>s+m.total,0))}</strong></span>
              <span>Best: <strong>{monthlySales.reduce((a,b)=>a.total>b.total?a:b).month}</strong></span>
              <span>Avg: <strong>{fmt(monthlySales.reduce((s,m)=>s+m.total,0)/12)}</strong></span>
            </div>
          </div>
        </div>
      </div>}
      {tab==="monthly" && <div className="card"><div className="ch"><div className="ct">Monthly Sales</div><div className="cs">Last 12 months</div></div><div className="tw"><table><thead><tr><th>Month</th><th>Invoices</th><th>Total</th><th>Collected</th><th>Rate</th></tr></thead><tbody>{[...monthlySales].reverse().map(m => <tr key={m.month}><td style={{fontWeight:600}}>{m.month}</td><td className="mono">{m.count}</td><td className="mono" style={{fontWeight:600}}>{fmt(m.total)}</td><td className="mono tg">{fmt(m.paid)}</td><td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}><div style={{width:m.total>0?(m.paid/m.total*100)+"%":"0%",height:"100%",background:"var(--green)",borderRadius:3}} /></div><span style={{fontSize:12}}>{m.total>0?Math.round(m.paid/m.total*100):0}%</span></div></td></tr>)}</tbody></table></div></div>}
      {tab==="products" && <div>
        <div className="g3" style={{marginBottom:20}}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Products</div><div className="kpi-val">{products.length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Stock Value</div><div className="kpi-val">{fmt(totalStockValue)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Low Stock</div><div className="kpi-val tr-c">{lowStockItems.length}</div></div>
        </div>
        <div className="card"><div className="ch"><div className="ct">Full Product Report</div></div><div className="tw"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Cost</th><th>Sale</th><th>Margin</th><th>Value</th><th>Status</th></tr></thead><tbody>{productSales.map(p => <tr key={p.id}><td style={{fontWeight:500}}>{p.name}</td><td className="mono" style={{fontSize:11,color:"var(--text3)"}}>{p.code||"—"}</td><td><span className="tag" style={{fontSize:10}}>{p.category||"General"}</span></td><td className="mono">{p.stock_qty||0} {p.unit}</td><td className="mono">{fmt(p.cost_price)}</td><td className="mono">{fmt(p.sale_price)}</td><td><span style={{color:p.margin>30?"var(--green)":p.margin>15?"var(--amber)":"var(--red)",fontWeight:600,fontSize:12}}>{p.margin}%</span></td><td className="mono">{fmt(p.stockValue)}</td><td><span className={"badge "+(p.stock_qty<=p.reorder_level?"b-red":p.stock_qty<=p.reorder_level*2?"b-amber":"b-green")} style={{fontSize:10}}>{p.stock_qty<=p.reorder_level?"Low":"OK"}</span></td></tr>)}</tbody></table></div></div>
      </div>}
      {tab==="customers" && <div className="card"><div className="ch"><div className="ct">Customer Sales</div><div className="cs">{periodLabels[period]} · {customerSales.length} customers</div></div><div className="tw"><table><thead><tr><th>#</th><th>Customer</th><th>Invoices</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>{customerSales.slice(0,50).map((c,i) => <tr key={c.name}><td style={{color:"var(--text3)",fontSize:12}}>{i+1}</td><td style={{fontWeight:500}}>{c.name}</td><td className="mono">{c.count}</td><td className="mono" style={{fontWeight:600}}>{fmt(c.total)}</td><td className="mono tg">{fmt(c.paid)}</td><td className="mono" style={{color:c.total-c.paid>0?"var(--red)":"var(--green)"}}>{fmt(c.total-c.paid)}</td></tr>)}{customerSales.length===0&&<tr><td colSpan={6} className="empty">No sales data</td></tr>}</tbody></table></div></div>}
      {tab==="agents" && <div className="card"><div className="ch"><div className="ct">Agent Performance — {periodLabels[period]}</div></div><div className="tw"><table><thead><tr><th>#</th><th>Agent</th><th>Invoices</th><th>Total</th><th>Collected</th><th>Pending</th></tr></thead><tbody>{[...allProfiles].sort((a,b) => filteredInv.filter(i=>i.created_by===b.id).reduce((s,i)=>s+i.amount,0) - filteredInv.filter(i=>i.created_by===a.id).reduce((s,i)=>s+i.amount,0)).map((agent,i) => { const agInv = filteredInv.filter(i=>i.created_by===agent.id); const agTotal=agInv.reduce((s,i)=>s+i.amount,0); const agPaid=agInv.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0); const medals=["🥇","🥈","🥉"]; return <tr key={agent.id}><td><span style={{fontSize:16}}>{medals[i]||i+1}</span></td><td><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{(agent.full_name||"U")[0].toUpperCase()}</div><span style={{fontWeight:600}}>{agent.full_name||"Unknown"}</span></div></td><td className="mono">{agInv.length}</td><td className="mono" style={{fontWeight:600,color:"var(--green)"}}>{fmt(agTotal)}</td><td className="mono tg">{fmt(agPaid)}</td><td className="mono" style={{color:"var(--amber)"}}>{fmt(agTotal-agPaid)}</td></tr>; })}</tbody></table></div></div>}
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
            <div className="g4" style={{marginBottom:20}}>
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
              <div className="tw"><table>
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
              <div className="tw"><table>
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
                      <div style={{flex:1,background:"var(--green)",borderRadius:"3px 3px 0 0",height:Math.max(4,(m.inflow/maxVal)*120)+"px",opacity:.85}} />
                      <div style={{flex:1,background:"var(--red)",borderRadius:"3px 3px 0 0",height:Math.max(4,(m.expenses/maxVal)*120)+"px",opacity:.7}} />
                    </div>
                    <div style={{fontSize:9,color:"var(--text3)",marginTop:4}}>{m.lbl}</div>
                  </div>
                ))}
              </div>
              <div className="tw"><table>
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
        <div className="g4" style={{marginBottom:20}}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Products</div><div className="kpi-val">{products.length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Cost Value</div><div className="kpi-val">{fmt(totalStockValue)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Retail Value</div><div className="kpi-val tg">{fmt(totalRetailValue)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Potential Profit</div><div className="kpi-val" style={{color:"var(--purple)"}}>{fmt(totalRetailValue-totalStockValue)}</div></div>
        </div>
        {lowStockItems.length > 0 && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct" style={{color:"var(--red)"}}>⚠️ Low Stock — {lowStockItems.length} items</div></div><div className="tw"><table><thead><tr><th>Product</th><th>In Stock</th><th>Reorder At</th><th>Est. Cost to Restock</th></tr></thead><tbody>{lowStockItems.map(p => <tr key={p.id}><td style={{fontWeight:500}}>{p.name}</td><td className="mono tr-c" style={{fontWeight:600}}>{p.stock_qty}</td><td className="mono">{p.reorder_level}</td><td className="mono">{fmt(Math.max(0,p.reorder_level*2-p.stock_qty)*p.cost_price)}</td></tr>)}</tbody></table></div></div>}
        <div className="card"><div className="ch"><div className="ct">Stock by Category</div></div><div className="tw"><table><thead><tr><th>Category</th><th>Products</th><th>Cost Value</th><th>Retail Value</th><th>Margin</th><th>Low Stock</th></tr></thead><tbody>{catData.map(c => <tr key={c.name}><td style={{fontWeight:600}}>{c.name}</td><td className="mono">{c.products}</td><td className="mono">{fmt(c.stockValue)}</td><td className="mono tg">{fmt(c.retailValue)}</td><td><span style={{color:c.stockValue>0&&Math.round((c.retailValue-c.stockValue)/c.retailValue*100)>30?"var(--green)":"var(--amber)",fontWeight:600,fontSize:12}}>{c.stockValue>0?Math.round((c.retailValue-c.stockValue)/c.retailValue*100):0}%</span></td><td>{c.lowStock>0?<span className="badge b-red">{c.lowStock}</span>:<span className="badge b-green">✓</span>}</td></tr>)}</tbody></table></div></div>
      </div>}
      {tab === "agent-products" && <AgentProductsReport invoices={invoices} allProfiles={allProfiles} period={period} filteredInv={period === "month" && filteredInv.length === 0 ? invoices : filteredInv} periodLabels={periodLabels} />}
      {tab === "product-tracker" && <ProductSalesTracker invoices={invoices} products={products} allProfiles={allProfiles} />}
    </div>
  );
}

// ── DELIVERY NOTES ────────────────────────────────────────────────────────────
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
    if (data[0]) setDNs(prev => [{ ...data[0], lines }, ...prev]);
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
        ${dn.delivery_address ? `<div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.6">${dn.delivery_address.replace(/\n/g, "<br>")}</div>` : ""}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="meta-box"><div class="meta-lbl">DN Number</div><div class="meta-val">${dn.dn_number}</div></div>
        <div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${fmtDate(dn.delivery_date)}</div></div>
        ${dn.driver ? `<div class="meta-box" style="grid-column:1/-1"><div class="meta-lbl">Driver / Courier</div><div class="meta-val">${dn.driver}</div></div>` : ""}
      </div>
    </div>
    <table>
      <thead><tr><th style="width:50%">Description</th><th>Unit</th><th style="text-align:center">Qty Ordered</th><th style="text-align:center">Qty Delivered</th><th style="text-align:center">Condition</th></tr></thead>
      <tbody>
        ${dnLines.map(l => `<tr>
          <td style="font-weight:600">${l.description || "—"}</td>
          <td style="color:#64748b">${l.unit || "unit"}</td>
          <td class="qty-col">${l.qty}</td>
          <td class="qty-col" style="color:#94a3b8">____</td>
          <td style="text-align:center;color:#94a3b8">____</td>
        </tr>`).join("")}
      </tbody>
    </table>
    ${dn.notes ? `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:12px;margin-bottom:20px"><div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;margin-bottom:4px">Delivery Notes</div><div style="font-size:12px;color:#78350f">${dn.notes}</div></div>` : ""}
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
      <div className="g4" style={{ marginBottom: 20 }}>
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
          <div className="ch"><div className="ct">New Delivery Note</div><button className="btn bo bsm" onClick={() => setShowForm(false)}><i className="ti ti-x" />Cancel</button></div>
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
                <button className="ib" onClick={() => lines.length > 1 && setLines(lines.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
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
        <div className="tw"><table>
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
function AIAssistant({ invoices, contacts, products, accounts, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I\'m your LedgerOS AI assistant. Ask me anything about your invoices, customers, stock or finances.\n\nTry: *\"Who owes the most money?\"* or *\"Which products are low on stock?\"*" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const buildContext = () => {
    const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
    const outstanding = invoices.filter(i => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + i.amount, 0);
    const overdue = invoices.filter(i => i.status === "overdue");
    const lowStock = products.filter(p => p.stock_qty <= p.reorder_level);
    const topCustomers = Object.entries(
      invoices.reduce((acc, inv) => { acc[inv.customer] = (acc[inv.customer] || 0) + inv.amount; return acc; }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return `You are an AI assistant for LedgerOS, a business accounting app for Arkham Retail Ltd (Bradford, UK).

LIVE BUSINESS DATA:
- Total invoices: ${invoices.length}
- Paid revenue: £${totalRevenue.toFixed(2)}
- Outstanding: £${outstanding.toFixed(2)}
- Overdue invoices: ${overdue.length} (${overdue.map(i => i.customer + " £" + i.amount).join(", ") || "none"})
- Total customers: ${contacts.filter(c => c.type === "customer" || c.type === "both").length}
- Total products: ${products.length}
- Low stock items: ${lowStock.length} (${lowStock.map(p => p.name + " (" + p.stock_qty + " left)").join(", ") || "none"})
- Top customers by spend: ${topCustomers.map(([name, amt]) => name + " £" + amt.toFixed(2)).join(", ")}
- Recent invoices: ${invoices.slice(0, 5).map(i => i.invoice_number + " " + i.customer + " £" + i.amount + " " + i.status).join("; ")}
- Products: ${products.slice(0, 10).map(p => p.name + " (stock: " + p.stock_qty + ", price: £" + p.sale_price + ")").join("; ")}

Answer concisely and helpfully. Use £ for currency. Format numbers clearly. If asked about specific data, reference the actual numbers above. Keep responses short and actionable.`;
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const history = messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildContext(),
          messages: [...history, { role: "user", content: userMsg }]
        })
      });
      // Fallback: if no proxy, use built-in smart responses
      if (!res.ok) throw new Error("no proxy");
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn\'t process that. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      // Smart local fallback when API unavailable
      const q = userMsg.toLowerCase();
      const invData = invoices;
      const prodData = products;
      const contData = contacts;
      
      let reply = "";
      if (q.includes("owe") || q.includes("most money") || q.includes("outstanding") || q.includes("unpaid")) {
        const byCustomer = invData.filter(i => i.status !== "paid").reduce((acc, i) => { acc[i.customer] = (acc[i.customer]||0) + i.amount; return acc; }, {});
        const sorted = Object.entries(byCustomer).sort((a,b) => b[1]-a[1]);
        reply = sorted.length > 0
          ? `Top customers with outstanding balances:\n\n${sorted.slice(0,5).map(([name,amt],i) => `${i+1}. ${name} — ${fmt(amt)}`).join("\n")}\n\nTotal outstanding: ${fmt(sorted.reduce((s,[,a])=>s+a,0))}`
          : "No outstanding invoices at the moment. 🎉";
      } else if (q.includes("overdue")) {
        const ov = invData.filter(i => i.status === "overdue");
        reply = ov.length > 0
          ? `You have ${ov.length} overdue invoice${ov.length>1?"s":""}:\n\n${ov.map(i => `• ${i.customer} — ${fmt(i.amount)} (${i.invoice_number})`).join("\n")}`
          : "No overdue invoices. 👍";
      } else if (q.includes("low stock") || q.includes("running low") || q.includes("stock")) {
        const low = prodData.filter(p => p.stock_qty <= (p.reorder_level||5));
        reply = low.length > 0
          ? `${low.length} product${low.length>1?"s":""} low on stock:\n\n${low.map(p => `• ${p.name} — ${p.stock_qty} ${p.unit||"units"} remaining`).join("\n")}`
          : "All products are well stocked. 📦";
      } else if (q.includes("revenue") || q.includes("total") || q.includes("sales") || q.includes("made")) {
        const paid = invData.filter(i => i.status==="paid").reduce((s,i)=>s+i.amount,0);
        const pending = invData.filter(i=>i.status==="pending").reduce((s,i)=>s+i.amount,0);
        reply = `Revenue Summary:\n\n💰 Collected: ${fmt(paid)}\n⏳ Pending: ${fmt(pending)}\n📊 Total invoiced: ${fmt(paid+pending)}\n📋 Total invoices: ${invData.length}`;
      } else if (q.includes("customer") || q.includes("top") || q.includes("best")) {
        const top = Object.entries(invData.reduce((acc,i)=>{ acc[i.customer]=(acc[i.customer]||0)+i.amount; return acc; },{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
        reply = top.length > 0
          ? `Top customers by spend:\n\n${top.map(([name,amt],i)=>`${["🥇","🥈","🥉","4.","5."][i]} ${name} — ${fmt(amt)}`).join("\n")}`
          : "No customer data yet.";
      } else if (q.includes("paid") || q.includes("collected")) {
        const paidInv = invData.filter(i=>i.status==="paid");
        reply = `Paid invoices: ${paidInv.length}\nTotal collected: ${fmt(paidInv.reduce((s,i)=>s+i.amount,0))}\n\nMost recent:\n${paidInv.slice(0,3).map(i=>`• ${i.customer} ${fmt(i.amount)}`).join("\n")}`;
      } else if (q.includes("product") || q.includes("inventory")) {
        reply = `You have ${prodData.length} products.\n\nTop products by price:\n${prodData.sort((a,b)=>(b.sale_price||0)-(a.sale_price||0)).slice(0,5).map(p=>`• ${p.name} — ${fmt(p.sale_price||0)}`).join("\n")}`;
      } else {
        reply = `I can answer questions about your business data. Try asking:\n\n• "Who owes the most money?"\n• "Show overdue invoices"\n• "Which products are low on stock?"\n• "What\'s my total revenue?"\n• "Who are my top customers?"`;
      }
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    }
    setLoading(false);
  };

  const suggestions = [
    "Who owes the most money?",
    "Which products are low on stock?",
    "Show me overdue invoices",
    "What\'s my total revenue?",
    "Who are my top customers?",
  ];

  const renderMsg = (text) => text.replace(/\*([^*]+)\*/g, "$1");

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, width: 380, height: 540, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 20, boxShadow: "var(--sh3)", display: "flex", flexDirection: "column", zIndex: 500, overflow: "hidden", animation: "scaleIn .2s var(--ease) both", transformOrigin: "bottom right" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="ti ti-sparkles" style={{ color: "#fff", fontSize: 17 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>AI Assistant</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>Powered by Claude · Live data</div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}><i className="ti ti-x" /></button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="ti ti-sparkles" style={{ color: "#fff", fontSize: 12 }} />
              </div>
            )}
            <div style={{ maxWidth: "80%", padding: "10px 13px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "var(--blue)" : "#f4f6f9", color: msg.role === "user" ? "#fff" : "var(--text)", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {renderMsg(msg.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-sparkles" style={{ color: "#fff", fontSize: 12 }} />
            </div>
            <div style={{ padding: "10px 14px", background: "#f4f6f9", borderRadius: "16px 16px 16px 4px", display: "flex", gap: 4, alignItems: "center" }}>
              {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text3)", animation: "pulse 1.2s ease-in-out " + (j*0.2) + "s infinite" }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: "0 14px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => { setInput(s); }} style={{ padding: "5px 10px", background: "var(--blue-lt)", border: "1px solid var(--blue-mid)", borderRadius: 20, fontSize: 11, color: "var(--blue)", cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 500, whiteSpace: "nowrap" }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask anything about your business..."
          style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", fontSize: 13, fontFamily: "var(--sans)", outline: "none", color: "var(--text)", background: "#f8fafd" }}
        />
        <button onClick={send} disabled={!input.trim() || loading} style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() && !loading ? "var(--blue)" : "var(--border)", border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .14s" }}>
          <i className="ti ti-send" style={{ color: input.trim() && !loading ? "#fff" : "var(--text3)", fontSize: 15 }} />
        </button>
      </div>
      {tab === "agent-products" && <AgentProductsReport invoices={invoices} allProfiles={allProfiles} period={period} filteredInv={filteredInv} periodLabels={periodLabels} />}

    </div>
  );
}


// ── NAV CONFIG ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "ti-home" },
  { id: "invoices", label: "Invoices", icon: "ti-file-invoice" },
  { id: "contacts", label: "Customers", icon: "ti-users" },
  { id: "inventory", label: "Inventory", icon: "ti-package" },
  { id: "purchases", label: "Purchases", icon: "ti-shopping-cart" },
  { id: "credits", label: "Credits", icon: "ti-receipt-refund" },
  { id: "reports", label: "Reports", icon: "ti-chart-bar" },
  { id: "analytics", label: "Analytics", icon: "ti-trending-up" },
  { id: "admin-reports", label: "Reports Suite", icon: "ti-report-money" },
  { id: "statement", label: "Statements", icon: "ti-user-check" },
  { id: "stock-adj", label: "Stock In/Out", icon: "ti-adjustments" },
  { id: "agent-report", label: "Agent Sales", icon: "ti-report-analytics" },
  { id: "import", label: "Import", icon: "ti-upload" },
  { id: "delivery-notes", label: "Delivery Notes", icon: "ti-truck-delivery" },
];

const MOBILE_NAV = [
  { id: "dashboard", label: "Home", icon: "ti-home" },
  { id: "invoices", label: "Invoices", icon: "ti-file-invoice" },
  { id: "contacts", label: "Contacts", icon: "ti-users" },
  { id: "inventory", label: "Stock", icon: "ti-package" },
  { id: "analytics", label: "Analytics", icon: "ti-trending-up" },
];

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ledgeros_dark") === "1");
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

  const [realtimeStatus, setRealtimeStatus] = useState("connecting"); // connecting | live | offline

  useEffect(() => {
    if (!auth) return; setLoading(true);
    Promise.all([
      sb.get(auth.token, "accounts", "order=code.asc"),
      sb.get(auth.token, "invoices", "order=created_at.desc"),
      sb.get(auth.token, "contacts", "order=name.asc"),
      sb.get(auth.token, "products", "order=name.asc"),
      sb.get(auth.token, "profiles", `id=eq.${auth.user.id}`),
      sb.get(auth.token, "profiles", "order=full_name.asc"),
    ]).then(([accs,invs,cnts,prods,profs,allProfs]) => {
      if (Array.isArray(accs)) setAccounts(accs);
      const userProfile = Array.isArray(profs) && profs[0] ? profs[0] : null;
      if (userProfile) setProfile(userProfile);
      if (Array.isArray(invs)) {
        setInvoices(userProfile?.role === "admin" ? invs : invs.filter(i => i.created_by === auth.user.id));
      }
      if (Array.isArray(cnts)) setContacts(cnts);
      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(allProfs)) setAllProfiles(allProfs);
      setLoading(false);
    });
  }, [auth]);

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
                setInvoices(prev => {
                  if (prev.find(i => i.id === record.id)) return prev;
                  return [record, ...prev];
                });
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

  return (
    <>
      <style>{CSS}</style>
      <div className={"app" + (darkMode ? " dark-mode" : "")}>
        <aside className="sidebar">
          <div className="sidebar-logo" style={{ paddingBottom: 20 }}>
            <img src={LOGO} alt="Arkham Retail" style={{ width: 190, height: 54, objectFit: "contain", borderRadius: 8 }} />
          </div>
          <div className="nav-section">
            <div className="nav-label">Main</div>
            {NAV.slice(0,5).map(n => <div key={n.id} className={"nav-item "+(page===n.id?"active":"")} onClick={() => setPage(n.id)}><i className={"ti "+n.icon} />{n.label}{n.id==="invoices"&&invoices.filter(i=>i.status==="overdue").length>0&&<span className="nav-badge">{invoices.filter(i=>i.status==="overdue").length}</span>}</div>)}
          </div>
          <div className="nav-section">
            <div className="nav-label">Finance</div>
            {NAV.slice(5).map(n => <div key={n.id} className={"nav-item "+(page===n.id?"active":"")} onClick={() => setPage(n.id)}><i className={"ti "+n.icon} />{n.label}</div>)}
          </div>
          <div className="nav-bottom">
            {/* Dark mode + version */}
            <div style={{ padding: "6px 12px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "4px 0" }} onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("ledgeros_dark", next?"1":"0"); }}>
                <i className={"ti " + (darkMode ? "ti-sun" : "ti-moon")} style={{ color: "rgba(255,255,255,.35)", fontSize: 14 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)", fontWeight: 500 }}>{darkMode ? "Light mode" : "Dark mode"}</span>
              </div>
              <span className="version-badge">v2.0</span>
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
              <img src={LOGO} alt="Arkham Retail" style={{ width: 90, height: 26, borderRadius: 6, objectFit: "contain" }} />
            </div>
            <div className="search-wrap topbar-search" style={{ position: "relative" }}>
              <i className="ti ti-search" />
              <input
                className="search-input"
                placeholder="Search invoices, customers, products..."
                value={globalSearch}
                onChange={e => { setGlobalSearch(e.target.value); setShowSearchResults(e.target.value.length > 0); }}
                onFocus={() => globalSearch.length > 0 && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              />
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
                if (isLowStock) prodResults = products.filter(p => p.stock_qty <= p.reorder_level).slice(0, 4);
                else if (isProduct || !isOverdue) prodResults = products.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 3);
                const total = invResults.length + custResults.length + prodResults.length;
                return (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rl)", boxShadow: "var(--sh3)", zIndex: 200, overflow: "hidden", minWidth: 360 }}>
                    {total === 0 && <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text3)" }}>No results for "{globalSearch}"</div>}
                    {invResults.length > 0 && <>
                      <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", borderBottom: "1px solid var(--border)", background: "#f8fafd" }}>Invoices</div>
                      {invResults.map(inv => (
                        <div key={inv.id} onMouseDown={() => { setPage("invoices"); setGlobalSearch(""); setShowSearchResults(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f0f3f8", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background="#f8fafd"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--blue-lt)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><i className="ti ti-file-invoice" style={{ color: "var(--blue)", fontSize: 13 }} /></div>
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
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--purple-lt)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><i className="ti ti-package" style={{ color: "var(--purple)", fontSize: 13 }} /></div>
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
                  ...products.filter(p=>p.stock_qty<=(p.reorder_level||5)).map(p=>({ id:"ls-"+p.id, type:"lowstock", icon:"ti-package-off", color:"var(--amber)", bg:"var(--amber-lt)", title:"Low Stock Alert", body:`${p.name} — only ${p.stock_qty} ${p.unit||"units"} left`, action:()=>setPage("inventory") })),
                  ...invoices.filter(i=>i.status==="paid").slice(0,3).map(i=>({ id:"pd-"+i.id, type:"paid", icon:"ti-circle-check", color:"var(--green)", bg:"var(--green-lt)", title:"Payment Received", body:`${i.customer} paid ${fmt(i.amount)}`, action:()=>setPage("invoices") })),
                ].filter(n=>!dismissedNotifs.includes(n.id));
                const unread = notifs.length;
                return (
                  <div style={{position:"relative"}}>
                    <div className={"tb-btn"+(unread>0?" tb-notif":"")} onClick={()=>setShowNotifications(v=>!v)} style={{cursor:"pointer"}}>
                      <i className="ti ti-bell" />
                      {unread>0&&<span style={{position:"absolute",top:-4,right:-4,background:"var(--red)",color:"#fff",fontSize:9,fontWeight:700,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--white)"}}>{unread>9?"9+":unread}</span>}
                    </div>
                    {showNotifications && (
                      <div style={{position:"absolute",top:"calc(100% + 10px)",right:0,width:340,background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--rxl)",boxShadow:"var(--sh3)",zIndex:300,overflow:"hidden",animation:"scaleIn .15s var(--ease) both",transformOrigin:"top right"}}>
                        <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{fontWeight:700,fontSize:14}}>Notifications</div>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            {notifs.length>0&&<button onClick={()=>{const ids=notifs.map(n=>n.id);setDismissedNotifs(prev=>{const next=[...prev,...ids];localStorage.setItem("dismissed_notifs",JSON.stringify(next));return next;});}} style={{fontSize:11,color:"var(--text3)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--sans)"}}>Clear all</button>}
                            <button onClick={()=>setShowNotifications(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",fontSize:16,display:"flex",alignItems:"center"}}><i className="ti ti-x" /></button>
                          </div>
                        </div>
                        <div style={{maxHeight:400,overflowY:"auto"}}>
                          {notifs.length===0?(
                            <div style={{padding:"32px 16px",textAlign:"center",color:"var(--text3)"}}>
                              <i className="ti ti-bell-check" style={{fontSize:32,display:"block",marginBottom:8,opacity:.4}} />
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
                              <button onClick={e=>{e.stopPropagation();setDismissedNotifs(prev=>{const next=[...prev,n.id];localStorage.setItem("dismissed_notifs",JSON.stringify(next));return next;});}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",padding:4,fontSize:14,flexShrink:0,display:"flex",alignItems:"center"}}><i className="ti ti-x" /></button>
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
              <div className="tb-btn" onClick={() => setShowOnboarding(true)} title="Getting started guide"><i className="ti ti-rocket" /></div>
              <div className="tb-btn" onClick={() => setPage("import")}><i className="ti ti-settings" /></div>
              <button onClick={async () => {
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
                <i className="ti ti-history" style={{ fontSize: 14 }} />
                <span className="hm">Activity</span>
              </button>
              <button onClick={() => setShowAI(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--r)", border: "none", cursor: "pointer", background: showAI ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : "linear-gradient(135deg,#eff4ff,#f5f3ff)", color: showAI ? "#fff" : "var(--blue)", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, transition: "all .15s", boxShadow: showAI ? "0 2px 8px rgba(99,102,241,.35)" : "none" }}>
                <i className="ti ti-sparkles" style={{ fontSize: 14 }} />
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
                {page==="invoices"&&<Invoices invoices={invoices} setInvoices={setInvoices} contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
                {page==="contacts"&&<Contacts contacts={contacts} setContacts={setContacts} token={auth.token} userId={auth.user.id} />}
                {page==="inventory"&&<Inventory products={products} setProducts={setProducts} token={auth.token} userId={auth.user.id} />}
                {page==="purchases"&&<Purchases contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
                {page==="credits"&&<CreditNotes contacts={contacts} invoices={invoices} token={auth.token} userId={auth.user.id} />}
                {page==="reports"&&<Reports accounts={accounts} />}
                {page==="analytics"&&<Analytics invoices={invoices} products={products} contacts={contacts} />}
                {page==="import"&&<CSVImport token={auth.token} contacts={contacts} setContacts={setContacts} products={products} setProducts={setProducts} />}
                {page==="statement"&&<CustomerStatement contacts={contacts} invoices={invoices} token={auth.token} />}
                {page==="admin-reports"&&<AdminReports invoices={invoices} products={products} contacts={contacts} accounts={accounts} allProfiles={allProfiles} />}
                {page==="stock-adj"&&<StockAdjustment products={products} setProducts={setProducts} token={auth.token} />}
                {page==="agent-report"&&<AgentReport invoices={invoices} allProfiles={allProfiles} contacts={contacts} />}
                {page==="delivery-notes"&&<DeliveryNotes contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
              </>
            )}
          </div>
        </div>
        {showCmdK && <CommandPalette onClose={() => setShowCmdK(false)} setPage={setPage} invoices={invoices} contacts={contacts} products={products} />}
        {showOnboarding && <OnboardingChecklist onClose={() => setShowOnboarding(false)} invoices={invoices} contacts={contacts} products={products} setPage={setPage} />}
        {showAI && <AIAssistant invoices={invoices} contacts={contacts} products={products} accounts={accounts} onClose={() => setShowAI(false)} />}
        {showActivity && (
          <div style={{ position: "fixed", top: 54, right: 24, width: 420, maxHeight: "calc(100vh - 80px)", background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rxl)", boxShadow: "var(--sh3)", display: "flex", flexDirection: "column", zIndex: 490, overflow: "hidden", animation: "scaleIn .18s var(--ease) both", transformOrigin: "top right" }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><i className="ti ti-history" style={{ color: "var(--green)", fontSize: 16 }} />Recent Activity</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Audit trail — last 50 events</div>
              </div>
              <button onClick={() => setShowActivity(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18, display: "flex", alignItems: "center" }}><i className="ti ti-x" /></button>
            </div>
            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {loadingAudit ? (
                <div style={{ padding: 32, textAlign: "center" }}><div className="spin" style={{ margin: "0 auto 10px" }} /><div style={{ fontSize: 12, color: "var(--text3)" }}>Loading activity...</div></div>
              ) : auditLog.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--text3)" }}>
                  <i className="ti ti-history" style={{ fontSize: 32, display: "block", marginBottom: 8, opacity: .3 }} />
                  <div style={{ fontSize: 13 }}>No activity recorded yet</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Actions will appear here as you use the app</div>
                </div>
              ) : auditLog.map((log, i) => {
                const iconMap = {
                  "invoice_created":   { icon: "ti-file-plus",     color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "invoice_paid":      { icon: "ti-circle-check",   color: "var(--green)",  bg: "var(--green-lt)" },
                  "invoice_updated":   { icon: "ti-edit",           color: "var(--purple)", bg: "var(--purple-lt)" },
                  "invoice_emailed":   { icon: "ti-mail",           color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "status_changed":    { icon: "ti-refresh",        color: "var(--amber)",  bg: "var(--amber-lt)" },
                  "stock_adjusted":    { icon: "ti-package",        color: "var(--amber)",  bg: "var(--amber-lt)" },
                  "product_created":   { icon: "ti-package-import", color: "var(--green)",  bg: "var(--green-lt)" },
                  "customer_created":  { icon: "ti-user-plus",      color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "delivery_created":  { icon: "ti-truck-delivery", color: "var(--purple)", bg: "var(--purple-lt)" },
                  "payment_received":  { icon: "ti-coins",          color: "var(--green)",  bg: "var(--green-lt)" },
                };
                const cfg = iconMap[log.action] || { icon: "ti-activity", color: "var(--text2)", bg: "#f1f5f9" };
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
                      <i className={"ti " + cfg.icon} style={{ color: cfg.color, fontSize: 15 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{(log.action || "").replace(/_/g, " ").replace(/\w/g, c => c.toUpperCase())}</div>
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
            {MOBILE_NAV.map(n => <div key={n.id} className={"mob-nav-item "+(page===n.id?"active":"")} onClick={() => setPage(n.id)}><i className={"ti "+n.icon} style={{fontSize:20}} /><span className="mob-nav-lbl">{n.label}</span></div>)}
          </div>
        </nav>
      </div>
    </>
  );
}
