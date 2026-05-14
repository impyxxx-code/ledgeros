import Analytics from "./Analytics.jsx";
import CSVImport from "./CSVImport.jsx";
import { useState, useEffect, useRef } from "react";

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

const LOGO = "data:image/jpeg;base64,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";

const sb = {
  h: (t) => ({ "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${t || SUPABASE_ANON_KEY}` }),
  async signIn(e, p) { return (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: sb.h(), body: JSON.stringify({ email: e, password: p }) })).json(); },
  async signUp(e, p, n) {
    const d = await (await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: sb.h(), body: JSON.stringify({ email: e, password: p, data: { full_name: n } }) })).json();
    if (d.access_token && d.user) {
      // Try to create profile, retry if needed
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles`, { 
          method: "POST", 
          headers: { ...sb.h(d.access_token), "Prefer": "return=representation" }, 
          body: JSON.stringify({ id: d.user.id, full_name: n, role: "agent" }) 
        });
      } catch(err) {
        console.log("Profile creation failed, will retry on login");
      }
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

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f8fafc;--sidebar:#0f172a;--sidebar-hover:rgba(255,255,255,.07);--sidebar-active:rgba(99,102,241,.2);
  --white:#fff;--border:#e2e8f0;--border2:#cbd5e1;
  --text:#0f172a;--text2:#64748b;--text3:#94a3b8;
  --blue:#2563eb;--blue-lt:#dbeafe;--blue-dk:#1d4ed8;
  --green:#10b981;--green-lt:#d1fae5;--green-dk:#065f46;
  --red:#ef4444;--red-lt:#fee2e2;--red-dk:#991b1b;
  --amber:#f59e0b;--amber-lt:#fef3c7;--amber-dk:#92400e;
  --purple:#8b5cf6;--purple-lt:#ede9fe;--purple-dk:#5b21b6;
  --qb:#2563eb;--qb-dark:#0f172a;
  --sh:0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04);
  --sh2:0 4px 16px rgba(15,23,42,.08),0 2px 4px rgba(15,23,42,.04);
  --sh3:0 20px 60px rgba(15,23,42,.15),0 4px 16px rgba(15,23,42,.08);
  --sans:'Inter',sans-serif;--mono:'Inter',monospace;
  --r:8px;--rl:14px;--rxl:18px;
}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;-webkit-font-smoothing:antialiased}
.app{display:flex;min-height:100vh}

/* ── SIDEBAR ── */
.sidebar{width:240px;min-width:240px;background:var(--sidebar);display:flex;flex-direction:column;padding:20px 14px;position:sticky;top:0;height:100vh;overflow-y:auto}
.sidebar-logo{display:flex;align-items:center;gap:10px;padding:4px 8px 28px}
.logo-box{width:32px;height:32px;background:var(--blue);border-radius:9px;display:flex;align-items:center;justify-content:center}
.logo-box i{color:#fff;font-size:17px}
.logo-text{font-size:16px;font-weight:700;color:#fff;letter-spacing:-.4px}
.nav-section{margin-bottom:28px}
.nav-label{font-size:10px;font-weight:600;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1.2px;padding:0 10px 10px}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r);color:rgba(255,255,255,.45);font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;margin-bottom:1px;user-select:none;letter-spacing:-.1px}
.nav-item:hover{background:var(--sidebar-hover);color:rgba(255,255,255,.85)}
.nav-item.active{background:var(--sidebar-active);color:#c7d2fe;font-weight:600}
.nav-item i{font-size:17px;flex-shrink:0}
.nav-badge{margin-left:auto;background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;min-width:18px;text-align:center}
.nav-bottom{margin-top:auto;padding-top:16px;border-top:0.5px solid rgba(255,255,255,.08)}
.user-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--r);cursor:pointer;transition:background .15s}
.user-row:hover{background:var(--sidebar-hover)}
.user-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;flex-shrink:0}
.user-name{font-size:13px;font-weight:500;color:rgba(255,255,255,.85)}
.user-role{font-size:11px;color:rgba(255,255,255,.35);margin-top:1px}
.signout-btn{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;padding:4px;border-radius:6px;transition:color .15s}
.signout-btn:hover{color:var(--red)}
.signout-btn i{font-size:16px}

/* ── MAIN ── */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:100vh}

/* ── TOPBAR ── */
.topbar{height:56px;background:var(--white);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 28px;gap:14px;position:sticky;top:0;z-index:50;box-shadow:0 1px 0 var(--border)}
.search-wrap{position:relative;flex:1;max-width:360px}
.search-wrap i{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:16px}
.search-input{width:100%;background:#f8fafc;border:0.5px solid var(--border);border-radius:var(--r);padding:8px 14px 8px 34px;font-size:13px;color:var(--text2);font-family:var(--sans);outline:none;transition:all .15s}
.search-input:focus{border-color:var(--blue);background:var(--white);box-shadow:0 0 0 3px rgba(37,99,235,.08)}
.search-input::placeholder{color:var(--text3)}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px}
.tb-btn{width:34px;height:34px;border-radius:var(--r);border:0.5px solid var(--border);background:var(--white);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);transition:all .15s;position:relative}
.tb-btn:hover{background:#f8fafc;border-color:var(--border2)}
.tb-btn i{font-size:17px}
.tb-notif::after{content:'';position:absolute;top:7px;right:7px;width:7px;height:7px;background:var(--red);border-radius:50%;border:1.5px solid var(--white)}
.tb-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;cursor:pointer;box-shadow:0 0 0 2px var(--white),0 0 0 3px rgba(99,102,241,.3)}
.tb-role{font-size:11px;font-weight:600;background:var(--blue-lt);color:var(--blue);padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.4px}

/* ── CONTENT ── */
.content{flex:1;padding:28px;overflow-y:auto;max-width:1400px;width:100%;margin:0 auto}

/* ── WELCOME ── */
.welcome-row{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:16px}
.welcome-h{font-size:24px;font-weight:700;color:var(--text);letter-spacing:-.5px}
.welcome-sub{font-size:13px;color:var(--text2);margin-top:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.trend-pill{background:var(--green-lt);color:var(--green-dk);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
.quick-actions{display:flex;gap:8px;flex-wrap:wrap}
.qa-btn{display:flex;align-items:center;gap:7px;padding:8px 16px;border-radius:var(--r);font-size:13px;font-weight:500;cursor:pointer;border:0.5px solid var(--border);background:var(--white);color:var(--text2);transition:all .15s;font-family:var(--sans)}
.qa-btn:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-lt)}
.qa-btn.primary{background:var(--blue);color:#fff;border-color:var(--blue)}
.qa-btn.primary:hover{background:var(--blue-dk)}
.qa-btn i{font-size:15px}

/* ── KPI CARDS ── */
.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.kpi{background:var(--white);border:0.5px solid var(--border);border-radius:var(--rl);padding:20px 22px;box-shadow:var(--sh);cursor:pointer;transition:all .2s;position:relative;overflow:hidden;border-top:2px solid transparent}
.kpi:hover{box-shadow:var(--sh2);transform:translateY(-2px);border-color:var(--border2)}
.kpi-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.kpi-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.kpi-icon i{font-size:20px}
.kpi-badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
.kpi-val{font-size:24px;font-weight:700;color:var(--text);letter-spacing:-.6px;margin-bottom:4px}
.kpi-label{font-size:12px;color:var(--text3);font-weight:500;margin-bottom:12px}
.spark{height:40px;width:100%}

/* ── CARDS ── */
.card{background:var(--white);border:1px solid var(--border);border-radius:var(--rl);box-shadow:0 1px 4px rgba(15,23,42,.06);overflow:hidden;margin-bottom:20px}
.ch{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;background:#fafbfc}
.ct{font-size:14px;font-weight:600;color:var(--text)}
.cs{font-size:12px;color:var(--text3)}
.period-sel{display:flex;gap:3px;background:#f8fafc;border:0.5px solid var(--border);border-radius:var(--r);padding:3px}
.psel{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;color:var(--text3);border:none;background:none;transition:all .15s;font-family:var(--sans)}
.psel.active{background:var(--white);color:var(--text);box-shadow:var(--sh)}

/* ── TABLE ── */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;padding:10px 18px;border-bottom:1px solid var(--border);background:#f8fafc;white-space:nowrap}
td{padding:12px 18px;font-size:13px;border-bottom:1px solid #f1f5f9}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f8fafc;transition:background .1s}
.c-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;flex-shrink:0}

/* ── BADGES ── */
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px;width:fit-content;white-space:nowrap}
.badge::before{content:'';width:5px;height:5px;border-radius:50%}
.b-green{background:var(--green-lt);color:var(--green-dk)}.b-green::before{background:var(--green)}
.b-red{background:var(--red-lt);color:var(--red-dk)}.b-red::before{background:var(--red)}
.b-amber{background:var(--amber-lt);color:var(--amber-dk)}.b-amber::before{background:var(--amber)}
.b-blue{background:var(--blue-lt);color:#1e40af}.b-blue::before{background:var(--blue)}
.b-purple{background:var(--purple-lt);color:var(--purple-dk)}.b-purple::before{background:var(--purple)}
.b-gray{background:#f1f5f9;color:var(--text2)}.b-gray::before{background:var(--text3)}

/* ── BUTTONS ── */
.btn{padding:8px 18px;border-radius:var(--r);font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .15s;font-family:var(--sans);display:inline-flex;align-items:center;gap:7px}
.bp{background:var(--blue);color:#fff;box-shadow:0 1px 3px rgba(37,99,235,.3)}.bp:hover{background:var(--blue-dk);box-shadow:0 2px 6px rgba(37,99,235,.4)}.bp:disabled{opacity:.4;cursor:not-allowed}
.bo{background:var(--white);color:var(--text);border:0.5px solid var(--border2)}.bo:hover{border-color:var(--blue);color:var(--blue)}
.bd{background:var(--red-lt);color:var(--red-dk);border:0.5px solid #fca5a5}
.bwa{background:#25D366;color:#fff}.bwa:hover{background:#20BA5A}
.bsm{padding:5px 12px;font-size:12px}
.btn i{font-size:15px}

/* ── FORM ── */
.fg{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:20px 22px}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:20px 22px}
.fgrp{display:flex;flex-direction:column;gap:6px}
.fgrp.full{grid-column:1/-1}
.fgrp label{font-size:12px;font-weight:500;color:var(--text2)}
.fgrp input,.fgrp select,.fgrp textarea{background:var(--white);border:0.5px solid var(--border2);border-radius:var(--r);padding:9px 12px;font-size:13px;color:var(--text);font-family:var(--sans);outline:none;transition:all .15s;width:100%}
.fgrp input:focus,.fgrp select:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.08)}
.ff{padding:14px 22px;border-top:0.5px solid var(--border);display:flex;gap:10px;justify-content:flex-end;background:#fafbfc;flex-wrap:wrap}

/* ── GRID LAYOUTS ── */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}
.g23{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px}

/* ── ACTIVITY ── */
.act-item{display:flex;align-items:flex-start;gap:14px;padding:14px 22px;border-bottom:0.5px solid var(--border);transition:background .15s}
.act-item:last-child{border-bottom:none}
.act-item:hover{background:#fafbfc}
.act-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.act-icon i{font-size:17px}
.act-title{font-size:13px;font-weight:500;color:var(--text)}
.act-sub{font-size:12px;color:var(--text3);margin-top:2px}
.act-time{font-size:11px;color:var(--text3);margin-top:3px}
.act-amt{font-size:13px;font-weight:600;margin-left:auto;flex-shrink:0;padding-top:2px}

/* ── PAGE HEADER ── */
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.pt{font-size:22px;font-weight:700;letter-spacing:-.4px}
.psub{font-size:13px;color:var(--text2);margin-top:3px}

/* ── CONTACT CARDS ── */
.contact-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.contact-card{background:var(--white);border:0.5px solid var(--border);border-radius:var(--rl);padding:20px;box-shadow:var(--sh);cursor:pointer;transition:all .2s}
.contact-card:hover{border-color:var(--blue);box-shadow:var(--sh2);transform:translateY(-1px)}
.cc-av{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#fff;margin-bottom:14px}
.cc-name{font-size:15px;font-weight:600;margin-bottom:5px}
.cc-detail{font-size:12px;color:var(--text2);margin-bottom:3px;display:flex;align-items:center;gap:6px}
.cc-detail i{font-size:13px;color:var(--text3)}

/* ── INVOICE MODAL ── */
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
.modal{background:var(--white);border-radius:var(--rxl);width:100%;max-width:740px;max-height:92vh;overflow-y:auto;box-shadow:var(--sh3)}
.modal-header{padding:18px 24px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--white);z-index:10;border-radius:var(--rxl) var(--rxl) 0 0}
.modal-actions{padding:16px 24px;border-top:0.5px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;position:sticky;bottom:0;background:var(--white);border-radius:0 0 var(--rxl) var(--rxl)}

/* ── VAT INVOICE ── */
.inv-doc{padding:36px}
.inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
.inv-co-name{font-size:22px;font-weight:800;color:var(--blue);letter-spacing:-.4px;margin-bottom:6px}
.inv-co-detail{font-size:12px;color:var(--text2);line-height:1.7}
.inv-title-block{text-align:right}
.inv-title{font-size:32px;font-weight:800;color:#e2e8f0;letter-spacing:-.5px;margin-bottom:6px}
.inv-num{font-size:16px;font-weight:700;color:var(--text)}
.inv-meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;padding:22px;background:#f8fafc;border-radius:var(--r);border:0.5px solid var(--border)}
.inv-meta-lbl{font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
.inv-meta-val{font-size:14px;font-weight:600;color:var(--text)}
.inv-table{width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:var(--r);overflow:hidden;border:0.5px solid var(--border)}
.inv-table th{background:var(--blue);color:#fff;padding:11px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;text-align:left}
.inv-table th:last-child,.inv-table td:last-child{text-align:right}
.inv-table td{padding:11px 16px;font-size:13px;border-bottom:0.5px solid var(--border)}
.inv-table tr:last-child td{border-bottom:none}
.inv-table tr:nth-child(even) td{background:#fafbfc}
.inv-totals-box{width:300px;margin-left:auto;margin-bottom:28px}
.inv-tot-row{display:flex;justify-content:space-between;padding:7px 0;font-size:13px}
.inv-tot-row.divider{border-top:0.5px solid var(--border);margin-top:6px;padding-top:12px}
.inv-tot-row.balance{border-top:2px solid var(--text);margin-top:6px;padding-top:12px;font-size:17px;font-weight:700}
.inv-footer{border-top:0.5px solid var(--border);padding-top:20px}
.inv-bank-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px;background:#f8fafc;padding:14px;border-radius:var(--r);border:0.5px solid var(--border)}
.inv-bank-lbl{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.inv-bank-val{font-size:13px;font-weight:600;color:var(--text)}

/* ── LINE ITEMS FORM ── */
.il-header{display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr 1fr 30px;gap:10px;padding:10px 18px;background:#fafbfc;border-bottom:0.5px solid var(--border)}
.il-line{display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr 1fr 30px;gap:10px;align-items:center;padding:10px 18px;border-bottom:0.5px solid var(--border)}
.il-input{background:var(--white);border:0.5px solid var(--border2);border-radius:6px;padding:7px 10px;font-size:12px;color:var(--text);font-family:var(--sans);outline:none;width:100%;transition:border .15s}
.il-input:focus{border-color:var(--blue)}
.ib{background:none;border:none;color:var(--text3);cursor:pointer;padding:5px;border-radius:6px;font-size:14px;transition:all .15s;display:flex;align-items:center;justify-content:center}
.ib:hover{color:var(--red);background:var(--red-lt)}
.ib i{font-size:15px}

/* ── REPORTS ── */
.rs-title{font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:1px;padding:14px 22px 8px}
.rrow{display:flex;justify-content:space-between;padding:8px 22px;font-size:13px;transition:background .15s}
.rrow:hover{background:#fafbfc}
.rrow.indent{padding-left:40px;color:var(--text2)}
.rrow.subtotal{border-top:0.5px solid var(--border);font-weight:600}
.rrow.total{border-top:2px solid var(--border2);font-weight:700;font-size:16px;padding:14px 22px;background:#fafbfc}

/* ── JOURNAL ── */
.po-line{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 30px;gap:10px;align-items:center;padding:10px 18px;border-bottom:0.5px solid var(--border)}

/* ── MISC ── */
.mono{font-variant-numeric:tabular-nums}
.tr{text-align:right}
.tg{color:var(--green)}
.tr-c{color:var(--red)}
.tm{color:var(--text2)}
.loading{display:flex;align-items:center;justify-content:center;padding:80px;color:var(--text3);font-size:13px;gap:12px;flex-direction:column}
.spin{width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.empty{text-align:center;padding:48px;color:var(--text3);font-size:13px}
.tag{display:inline-block;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;background:var(--blue-lt);color:#1e40af}
.divider{height:0.5px;background:var(--border);margin:8px 0}
.stat-row{display:flex;align-items:center;justify-content:space-between;padding:11px 22px;border-bottom:0.5px solid var(--border)}
.stat-row:last-child{border-bottom:none}
.stat-lbl{font-size:13px;color:var(--text2)}
.stat-val{font-size:14px;font-weight:600}
.tabs{display:flex;border-bottom:0.5px solid var(--border);margin-bottom:20px}
.tab{padding:11px 18px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-0.5px;transition:all .15s}
.tab:hover{color:var(--text)}
.tab.active{color:var(--blue);border-bottom-color:var(--blue)}

/* ── MOBILE ── */
.mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--white);border-top:0.5px solid var(--border);padding:6px 0 env(safe-area-inset-bottom,6px);box-shadow:0 -4px 20px rgba(15,23,42,.08)}
.mob-nav-inner{display:flex}
.mob-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0;cursor:pointer;color:var(--text3);flex:1;transition:color .15s}
.mob-nav-item.active{color:var(--blue)}
.mob-nav-item i{font-size:20px}
.mob-nav-lbl{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}

@media(max-width:768px){
  .sidebar{display:none}
  .mob-nav{display:block}
  .content{padding:16px 14px 80px}
  .kgrid{grid-template-columns:1fr 1fr;gap:12px}
  .g2{grid-template-columns:1fr}
  .g3{grid-template-columns:1fr}
  .g4{grid-template-columns:1fr 1fr}
  .g23{grid-template-columns:1fr}
  .hm{display:none}
  .kpi-val{font-size:20px}
  .fg{grid-template-columns:1fr}
  .fg3{grid-template-columns:1fr}
  .il-line{grid-template-columns:2fr 1fr 1fr 1fr 30px}
  .il-header{grid-template-columns:2fr 1fr 1fr 1fr 30px}
  .topbar-search{display:none}
  .inv-header{flex-direction:column;gap:16px}
  .inv-meta{grid-template-columns:1fr}
  .inv-bank-grid{grid-template-columns:1fr}
}
@media(min-width:769px){.mob-nav{display:none!important}}

@media print{
  .modal-header,.modal-actions,.sidebar,.topbar,.mob-nav{display:none!important}
  .modal-overlay{position:static!important;background:none!important;padding:0!important}
  .modal{box-shadow:none!important;max-height:none!important}
}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
`;

// ── AUTH ──────────────────────────────────────────────────────────────────────
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
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)", fontFamily: "var(--sans)" }}>
      <div style={{ width: 460, background: "var(--sidebar)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 56, color: "#fff" }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <img src={LOGO} alt="Arkham Retail" style={{ width: 72, height: 72, borderRadius: 16, objectFit: "contain", background: "#fff", padding: 6, margin: "0 auto 24px", display: "block" }} />
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, lineHeight: 1.2, letterSpacing: "-.5px" }}>Built for modern businesses</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: 36 }}>VAT invoices, inventory, analytics and more — all in one place.</p>
          {["VAT Invoice PDF with WhatsApp share", "Customer & Supplier management", "Stock & Inventory with low stock alerts", "Agent dashboards & leaderboard", "Daily email notifications"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,.8)", marginBottom: 10, textAlign: "left" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(37,99,235,.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><i className="ti ti-check" style={{ fontSize: 12, color: "#93c5fd" }} /></div>{f}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <img src={LOGO} alt="Arkham Retail" style={{ width: 40, height: 40, borderRadius: 11, objectFit: "contain", background: "#f0fdf4", padding: 2 }} />
            <div><div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.4px" }}>LedgerOS</div><div style={{ fontSize: 12, color: "var(--text3)" }}>Business Accounting</div></div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, letterSpacing: "-.4px" }}>{mode === "signin" ? "Sign in" : "Create account"}</div>
          <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 28 }}>{mode === "signin" ? "Welcome back — sign in to your dashboard" : "Join your team on LedgerOS"}</div>
          {err && <div style={{ background: "var(--red-lt)", border: "0.5px solid #fca5a5", borderRadius: "var(--r)", padding: "11px 14px", fontSize: 13, color: "var(--red-dk)", marginBottom: 16 }}>{err}</div>}
          {mode === "signup" && <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text2)", marginBottom: 6 }}>Full Name</label><input style={{ width: "100%", background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 14, color: "var(--text)", fontFamily: "var(--sans)", outline: "none" }} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="Jane Smith" /></div>}
          <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text2)", marginBottom: 6 }}>Email address</label><input type="email" style={{ width: "100%", background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 14, color: "var(--text)", fontFamily: "var(--sans)", outline: "none" }} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="you@company.com" /></div>
          <div style={{ marginBottom: 24 }}><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text2)", marginBottom: 6 }}>Password</label><input type="password" style={{ width: "100%", background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 14, color: "var(--text)", fontFamily: "var(--sans)", outline: "none" }} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && go()} /></div>
          <button style={{ width: "100%", padding: "12px", background: "var(--blue)", color: "#fff", fontWeight: 600, fontSize: 15, border: "none", borderRadius: "var(--r)", cursor: "pointer", fontFamily: "var(--sans)", transition: "background .15s" }} onClick={go} disabled={loading}>{loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}</button>
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text2)" }}>{mode === "signin" ? <>No account? <span style={{ color: "var(--blue)", cursor: "pointer", fontWeight: 500 }} onClick={() => setMode("signup")}>Sign up free</span></> : <>Have account? <span style={{ color: "var(--blue)", cursor: "pointer", fontWeight: 500 }} onClick={() => setMode("signin")}>Sign in</span></>}</div>
        </div>
      </div>
    </div>
  );
}

// ── INVOICE MODAL ─────────────────────────────────────────────────────────────
function InvoiceModal({ invoice, onClose, contacts = [] }) {
  const invRef = useRef();
  const [showWaInput, setShowWaInput] = useState(false);
  const [waNumber, setWaNumber] = useState("");

  const lines = invoice.lines || [{ description: invoice.description || "Services rendered", qty: 1, unit_price: invoice.amount || 0, vat_rate: 20 }];
  const subtotal = lines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
  const vatTotal = lines.reduce((s, l) => s + (l.qty * l.unit_price * (l.vat_rate / 100)), 0);
  const total = subtotal + vatTotal;

  // Find saved customer phone number
  const customerContact = contacts.find(c => c.name === invoice.customer);
  const savedPhone = customerContact?.phone || "";

  const handlePrint = () => window.print();

  const buildWaMsg = () => encodeURIComponent(
    `*VAT Invoice — ${COMPANY.name}*\n\n` +
    `Invoice: *${invoice.invoice_number}*\n` +
    `Customer: ${invoice.customer}\n` +
    `Date: ${fmtDate(invoice.invoice_date)}\n` +
    `Due: ${fmtDate(invoice.due_date)}\n\n` +
    lines.map(l => `${l.description} x${l.qty} — ${fmt(l.qty * l.unit_price)}`).join("\n") +
    `\n\nSubtotal: ${fmt(subtotal)}\nVAT: ${fmt(vatTotal)}\n*Total Due: ${fmt(total)}*\n\n` +
    `Payment to:\nBank: ${COMPANY.bankName}\nSort Code: ${COMPANY.sortCode}\nAcc No: ${COMPANY.accountNumber}\nRef: ${invoice.invoice_number}\n\nThank you for your business! 🙏`
  );

  const sendWhatsApp = (number) => {
    const clean = number.replace(/\s+/g, "").replace(/^0/, "44");
    window.open(`https://wa.me/${clean}?text=${buildWaMsg()}`, "_blank");
    setShowWaInput(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} — ${COMPANY.name}`);
    const body = encodeURIComponent(
      `Dear ${invoice.customer},\n\nPlease find your invoice details below.\n\n` +
      `Invoice: ${invoice.invoice_number}\nDate: ${fmtDate(invoice.invoice_date)}\nDue: ${fmtDate(invoice.due_date)}\n\n` +
      lines.map(l => `${l.description} (x${l.qty}) — ${fmt(l.qty * l.unit_price)}`).join("\n") +
      `\n\nSubtotal: ${fmt(subtotal)}\nVAT: ${fmt(vatTotal)}\nTotal Due: ${fmt(total)}\n\n` +
      `Payment Details:\nBank: ${COMPANY.bankName}\nSort Code: ${COMPANY.sortCode}\nAccount: ${COMPANY.accountNumber}\nReference: ${invoice.invoice_number}\n\n` +
      `Thank you for your business.\n\n${COMPANY.name}\n${COMPANY.phone}\n${COMPANY.email}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "var(--blue-lt)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-file-invoice" style={{ color: "var(--blue)", fontSize: 16 }} /></div>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>VAT Invoice</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{invoice.invoice_number} · {invoice.customer}</div></div>
          </div>
          <button className="btn bo bsm" onClick={onClose}><i className="ti ti-x" />Close</button>
        </div>
        <div className="inv-doc" ref={invRef}>
          <div className="inv-header">
            <div>
              <img src={LOGO} alt={COMPANY.name} style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 12, borderRadius: 8 }} />
              <div className="inv-co-name">{COMPANY.name}</div>
              <div className="inv-co-detail">{COMPANY.address}<br />{COMPANY.city}, {COMPANY.postcode}<br />Tel: {COMPANY.phone}<br />{COMPANY.email}<br />VAT: {COMPANY.vatNumber}</div>
            </div>
            <div className="inv-title-block">
              <div className="inv-title">INVOICE</div>
              <div className="inv-num">{invoice.invoice_number}</div>
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
        <div className="modal-actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {showWaInput && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#f0fdf4", border: "0.5px solid #86efac", borderRadius: "var(--r)", padding: "10px 14px" }}>
                <i className="ti ti-brand-whatsapp" style={{ color: "#25D366", fontSize: 18 }} />
                <input
                  style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }}
                  placeholder="Enter WhatsApp number e.g. 07700 900000"
                  value={waNumber}
                  onChange={e => setWaNumber(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && waNumber && sendWhatsApp(waNumber)}
                  autoFocus
                />
                <button className="btn bwa bsm" onClick={() => sendWhatsApp(waNumber)} disabled={!waNumber}>Send</button>
                <button className="btn bo bsm" onClick={() => setShowWaInput(false)}>Cancel</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {savedPhone && !showWaInput && (
                <button className="btn bwa" onClick={() => sendWhatsApp(savedPhone)}>
                  <i className="ti ti-brand-whatsapp" />WhatsApp {savedPhone}
                </button>
              )}
              <button className="btn" style={{ background: "#128C7E", color: "#fff" }} onClick={() => { setShowWaInput(true); setWaNumber(""); }}>
                <i className="ti ti-brand-whatsapp" />{savedPhone ? "Different number" : "WhatsApp"}
              </button>
              <button className="btn bo" onClick={handleEmail}><i className="ti ti-mail" />Email</button>
              <button className="btn bo" onClick={handlePrint}><i className="ti ti-printer" />Print / PDF</button>
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

  const filtered = items.filter(i => 
    (i[displayKey] || "").toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "9px 36px 9px 12px", fontSize: 13, color: "var(--text)", fontFamily: "var(--sans)", outline: "none", width: "100%", transition: "border .15s" }}
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14 }}>⌄</span>
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", boxShadow: "var(--sh2)", zIndex: 100, maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
          {filtered.map((item, i) => (
            <div key={i}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "0.5px solid var(--border)", transition: "background .1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onMouseDown={() => { onSelect(item); setQuery(item[displayKey]); setOpen(false); }}
            >
              <div style={{ fontWeight: 500 }}>{item[displayKey]}</div>
              {item.city && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.city}{item.postcode ? ` · ${item.postcode}` : ""}</div>}
              {item.category && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.category} · {item.code || ""}</div>}
            </div>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", boxShadow: "var(--sh2)", zIndex: 100, padding: "12px 14px", fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}

// ── INVOICE FORM ──────────────────────────────────────────────────────────────
function InvoiceForm({ contacts, products, token, userId, onSave, onClose }) {
  const [f, setF] = useState({ customer: "", invoice_date: today(), due_date: "", status: "pending", notes: "" });
  const [lines, setLines] = useState([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }]);
  const [saving, setSaving] = useState(false);
  const customers = contacts.filter(c => c.type === "customer" || c.type === "both");
  const updateLine = (i, field, val) => {
    const next = [...lines];
    if (field === "product_id") { const p = products.find(x => x.id === val); next[i] = { ...next[i], product_id: val, description: p?.name || "", unit_price: p?.sale_price || "", vat_rate: p?.vat_rate ?? 20 }; }
    else next[i] = { ...next[i], [field]: val };
    setLines(next);
  };
  const subtotal = lines.reduce((s, l) => s + ((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0)), 0);
  const vatTotal = lines.reduce((s, l) => s + ((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0) * ((parseFloat(l.vat_rate) || 0) / 100)), 0);
  const total = subtotal + vatTotal;
  const save = async () => {
    if (!f.customer) return; setSaving(true);
    // Get current invoice count for sequential numbering
    const existing = await sb.get(token, "invoices", "select=id");
    const count = Array.isArray(existing) ? existing.length + 1 : 1;
    const invoice_number = `INV-${String(count).padStart(4, "0")}`;
    const inv = await sb.post(token, "invoices", { 
      customer: f.customer,
      invoice_date: f.invoice_date,
      due_date: f.due_date || null,
      status: f.status,
      notes: f.notes || null,
      amount: total, 
      subtotal, 
      vat_total: vatTotal, 
      invoice_number, 
      created_by: userId 
    });
    if (inv[0]) onSave({ ...inv[0], lines });
    else { alert("Failed to save invoice. Please try again."); }
    setSaving(false); onClose();
  };
  return (
    <div className="card">
      <div className="ch"><div><div className="ct">New VAT Invoice</div><div className="cs">Add line items with VAT rates</div></div><button className="btn bo bsm" onClick={onClose}><i className="ti ti-x" />Cancel</button></div>
      <div className="fg">
        <div className="fgrp"><label>Customer * <span style={{color:"var(--text3)",fontWeight:400}}>— type to search</span></label><SearchDropdown placeholder="Search customers..." items={customers} onSelect={c => setF({...f, customer: c.name})} /></div>
        <div className="fgrp"><label>Status</label><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
        <div className="fgrp"><label>Invoice Date</label><input type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
        <div className="fgrp"><label>Due Date</label><input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} /></div>
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
      <div className="ff"><button className="btn bo" onClick={onClose}>Cancel</button><button className="btn bp" onClick={save} disabled={saving || !f.customer}>{saving ? "Saving..." : "Create Invoice"}</button></div>
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
                      <option value="cash">💵 Cash</option>
                      <option value="bank">🏦 Bank</option>
                      <option value="card">💳 Card</option>
                      <option value="cheque">📝 Cheque</option>
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
  const revenue = accounts.filter(a => a.type === "Revenue").reduce((s, a) => s + a.balance, 0);
  const expenses = accounts.filter(a => a.type === "Expense").reduce((s, a) => s + a.balance, 0);
  const cash = accounts.find(a => a.code === "1000")?.balance || 0;
  const net = revenue - expenses;
  const unpaid = invoices.filter(i => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const lowStock = products.filter(p => p.stock_qty <= p.reorder_level);
  const name = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const maxAgentSales = Math.max(...allProfiles.map(a => invoices.filter(i => i.created_by === a.id).reduce((s, i) => s + i.amount, 0)), 1);
  return (
    <div>
      <div className="welcome-row">
        <div><div className="welcome-h">{greeting}, {name} 👋</div><div className="welcome-sub"><span className="trend-pill">↑ 18% this month</span>Revenue is trending up. Great work!</div></div>
        <div className="quick-actions">
          <div className="qa-btn" onClick={() => setPage("invoices")}><i className="ti ti-plus" />New Invoice</div>
          <div className="qa-btn" onClick={() => setPage("contacts")}><i className="ti ti-user-plus" />Add Customer</div>
          <div className="qa-btn" onClick={() => setPage("inventory")}><i className="ti ti-package" />Add Product</div>
          <div className="qa-btn primary" onClick={() => setPage("analytics")}><i className="ti ti-chart-bar" />Analytics</div>
        </div>
      </div>
      <div className="kgrid">
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--blue-lt)" }}><i className="ti ti-currency-pound" style={{ color: "var(--blue)" }} /></div><span className="kpi-badge" style={{ background: "var(--blue-lt)", color: "#1e40af" }}>↑ 18.4%</span></div><div className="kpi-val">{fmt(revenue)}</div><div className="kpi-label">Total Revenue</div><svg className="spark" viewBox="0 0 120 40" style={{ display: "block" }}><polyline points="0,32 20,26 40,28 60,18 80,20 100,12 120,8" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /><polygon points="0,32 20,26 40,28 60,18 80,20 100,12 120,8 120,40 0,40" fill="#dbeafe" opacity=".5" /></svg></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--red-lt)" }}><i className="ti ti-arrow-up-right" style={{ color: "var(--red)" }} /></div><span className="kpi-badge" style={{ background: "var(--red-lt)", color: "var(--red-dk)" }}>↑ 4.2%</span></div><div className="kpi-val">{fmt(expenses)}</div><div className="kpi-label">Total Expenses</div><svg className="spark" viewBox="0 0 120 40" style={{ display: "block" }}><polyline points="0,22 20,28 40,20 60,24 80,18 100,22 120,16" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /><polygon points="0,22 20,28 40,20 60,24 80,18 100,22 120,16 120,40 0,40" fill="#fee2e2" opacity=".5" /></svg></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--green-lt)" }}><i className="ti ti-trending-up" style={{ color: "var(--green)" }} /></div><span className="kpi-badge" style={{ background: "var(--green-lt)", color: "var(--green-dk)" }}>↑ 28.4%</span></div><div className="kpi-val" style={{ color: net >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(net)}</div><div className="kpi-label">Net Profit</div><svg className="spark" viewBox="0 0 120 40" style={{ display: "block" }}><polyline points="0,34 20,28 40,22 60,20 80,14 100,10 120,6" fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /><polygon points="0,34 20,28 40,22 60,20 80,14 100,10 120,6 120,40 0,40" fill="#d1fae5" opacity=".5" /></svg></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--purple-lt)" }}><i className="ti ti-building-bank" style={{ color: "var(--purple)" }} /></div><span className="kpi-badge" style={{ background: "var(--purple-lt)", color: "var(--purple-dk)" }}>Stable</span></div><div className="kpi-val">{fmt(cash)}</div><div className="kpi-label">Cash Balance</div><svg className="spark" viewBox="0 0 120 40" style={{ display: "block" }}><polyline points="0,20 20,18 40,22 60,16 80,18 100,14 120,16" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /><polygon points="0,20 20,18 40,22 60,16 80,18 100,14 120,16 120,40 0,40" fill="#ede9fe" opacity=".5" /></svg></div>
      </div>
      <div className="g23">
        <div>
          <div className="g3" style={{ marginBottom: 0 }}>
            <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label" style={{ marginBottom: 6 }}>Customers</div><div className="kpi-val" style={{ fontSize: 28 }}>{contacts.filter(c => c.type === "customer" || c.type === "both").length}</div></div>
            <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label" style={{ marginBottom: 6 }}>Suppliers</div><div className="kpi-val" style={{ fontSize: 28 }}>{contacts.filter(c => c.type === "supplier" || c.type === "both").length}</div></div>
            <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label" style={{ marginBottom: 6 }}>Low Stock</div><div className="kpi-val" style={{ fontSize: 28, color: lowStock.length > 0 ? "var(--red)" : "var(--green)" }}>{lowStock.length}</div></div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "var(--white)", border: "0.5px solid var(--border)", borderRadius: "var(--rl)", padding: "18px 22px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".5px" }}>Invoices owed</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--green)", marginBottom: 10 }}>{fmt(unpaid)}</div>
            <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${overdue / (unpaid || 1) * 100}%`, background: "var(--red)", borderRadius: 4 }} />
              <div style={{ width: `${(unpaid - overdue) / (unpaid || 1) * 100}%`, background: "var(--green)", borderRadius: 4 }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div><div style={{ fontSize: 11, color: "var(--red)", marginBottom: 1 }}>● Overdue</div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--red)" }}>{fmt(overdue)}</div></div>
              <div><div style={{ fontSize: 11, color: "var(--green)", marginBottom: 1 }}>● Not yet due</div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>{fmt(unpaid - overdue)}</div></div>
            </div>
          </div>
          <div style={{ background: "var(--white)", border: "0.5px solid var(--border)", borderRadius: "var(--rl)", padding: "18px 22px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".5px" }}>Paid invoices</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--blue)", marginBottom: 10 }}>{fmt(paid)}</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div><div style={{ fontSize: 11, color: "var(--text3)" }}>Total paid</div><div style={{ fontSize: 14, fontWeight: 600 }}>{invoices.filter(i => i.status === "paid").length}</div></div>
              <div><div style={{ fontSize: 11, color: "var(--text3)" }}>Average</div><div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(paid / (invoices.filter(i => i.status === "paid").length || 1))}</div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="g23">
        <div className="card">
          <div className="ch"><div className="ct">Recent Invoices</div><button className="btn bo bsm" onClick={() => setPage("invoices")}><i className="ti ti-arrow-right" />View all</button></div>
          <div className="tw"><table><thead><tr><th>Customer</th><th className="hm">Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            {invoices.slice(0, 6).map(inv => <tr key={inv.id}><td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="c-av" style={{ background: ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][inv.customer?.charCodeAt(0) % 5] || "#6366f1" }}>{inv.customer?.[0]?.toUpperCase()}</div><div><div style={{ fontWeight: 500 }}>{inv.customer}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{inv.invoice_number}</div></div></div></td><td className="hm" style={{ fontSize: 12, color: "var(--text3)" }}>{fmtDate(inv.invoice_date)}</td><td className="mono" style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td><td><span className={"badge " + (inv.status === "paid" ? "b-green" : inv.status === "overdue" ? "b-red" : inv.status === "pending" ? "b-amber" : "b-gray")}>{inv.status}</span></td></tr>)}
            {invoices.length === 0 && <tr><td colSpan={4} className="empty">No invoices yet</td></tr>}
          </tbody></table></div>
        </div>
        <div className="card">
          <div className="ch"><div className="ct">Activity Feed</div></div>
          {invoices.slice(0, 4).map((inv, i) => (
            <div key={inv.id} className="act-item">
              <div className="act-icon" style={{ background: inv.status === "paid" ? "var(--green-lt)" : inv.status === "overdue" ? "var(--red-lt)" : "var(--blue-lt)" }}><i className={"ti " + (inv.status === "paid" ? "ti-circle-check" : "ti-file-invoice")} style={{ color: inv.status === "paid" ? "var(--green)" : inv.status === "overdue" ? "var(--red)" : "var(--blue)" }} /></div>
              <div style={{ flex: 1 }}><div className="act-title">{inv.status === "paid" ? "Invoice paid" : "Invoice raised"}</div><div className="act-sub">{inv.customer} · {inv.invoice_number}</div></div>
              <span className="act-amt" style={{ color: inv.status === "paid" ? "var(--green)" : "var(--text2)" }}>{inv.status === "paid" ? "+" : ""}{fmt(inv.amount)}</span>
            </div>
          ))}
          {lowStock.slice(0, 2).map(p => (
            <div key={p.id} className="act-item">
              <div className="act-icon" style={{ background: "var(--amber-lt)" }}><i className="ti ti-alert-triangle" style={{ color: "var(--amber)" }} /></div>
              <div style={{ flex: 1 }}><div className="act-title">Low stock alert</div><div className="act-sub">{p.name} · {p.stock_qty} {p.unit} left</div></div>
            </div>
          ))}
          {invoices.length === 0 && lowStock.length === 0 && <div className="empty">No recent activity</div>}
        </div>
      </div>
      <div className="card">
        <div className="ch"><div className="ct">🏆 Agent Leaderboard</div><div className="cs">Ranked by total sales</div></div>
        <div className="tw"><table><thead><tr><th>#</th><th>Agent</th><th>Invoices</th><th>Total Sales</th><th>Paid</th><th className="hm">Performance</th></tr></thead><tbody>
          {[...allProfiles].sort((a, b) => invoices.filter(i => i.created_by === b.id).reduce((s, i) => s + i.amount, 0) - invoices.filter(i => i.created_by === a.id).reduce((s, i) => s + i.amount, 0)).map((agent, i) => {
            const agentInv = invoices.filter(inv => inv.created_by === agent.id);
            const agentTotal = agentInv.reduce((s, inv) => s + inv.amount, 0);
            const agentPaid = agentInv.filter(inv => inv.status === "paid").reduce((s, inv) => s + inv.amount, 0);
            const pct = Math.round(agentTotal / maxAgentSales * 100);
            const medals = ["🥇","🥈","🥉"];
            return (
              <tr key={agent.id}>
                <td><span style={{ fontSize: 16 }}>{medals[i] || i + 1}</span></td>
                <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{(agent.full_name || "U")[0].toUpperCase()}</div><div><div style={{ fontWeight: 600 }}>{agent.full_name || "Unknown"}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{agent.role}</div></div></div></td>
                <td className="mono">{agentInv.length}</td>
                <td className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>{fmt(agentTotal)}</td>
                <td className="mono">{fmt(agentPaid)}</td>
                <td className="hm"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", minWidth: 80 }}><div style={{ width: pct + "%", height: "100%", background: "var(--blue)", borderRadius: 3, transition: "width .5s" }} /></div><span style={{ fontSize: 12, color: "var(--text3)", minWidth: 36 }}>{pct}%</span></div></td>
              </tr>
            );
          })}
          {allProfiles.length === 0 && <tr><td colSpan={6} className="empty">No agents yet</td></tr>}
        </tbody></table></div>
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

  const markPaid = async (id, method) => {
    await sb.patch(token, "invoices", id, { status: "paid", payment_method: method || "cash" });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: method || "cash" } : i));
    setPayingId(null);
    setPayMethod(prev => ({ ...prev, [id]: "" }));
  };
  const totals = { paid: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0), pending: invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0), overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0) };
  return (
    <div>
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} contacts={contacts} />}
      <div className="ph"><div><div className="pt">Invoices</div><div className="psub">Create and manage VAT invoices</div></div><button className="btn bp" onClick={() => setShowForm(!showForm)}><i className="ti ti-plus" />New VAT Invoice</button></div>
      <div className="g3"><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Paid</div><div className="kpi-val tg">{fmt(totals.paid)}</div></div><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Pending</div><div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(totals.pending)}</div></div><div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Overdue</div><div className="kpi-val tr-c">{fmt(totals.overdue)}</div></div></div>
      <div style={{ marginTop: 20 }} />
      {showForm && <InvoiceForm contacts={contacts} products={products} token={token} userId={userId} onSave={inv => setInvoices(prev => [inv, ...prev])} onClose={() => setShowForm(false)} />}
      <div className="card">
        <div className="tw"><table><thead><tr><th>Customer</th><th>Invoice #</th><th className="hm">Date</th><th className="hm">Due</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {invoices.map(inv => <tr key={inv.id}><td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="c-av" style={{ background: ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][inv.customer?.charCodeAt(0) % 5] || "#6366f1" }}>{inv.customer?.[0]?.toUpperCase()}</div><span style={{ fontWeight: 500 }}>{inv.customer}</span></div></td><td className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{inv.invoice_number}</td><td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(inv.invoice_date)}</td><td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(inv.due_date)}</td><td className="mono" style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td><td><div style={{ display: "flex", flexDirection: "column", gap: 3 }}><span className={"badge " + (inv.status === "paid" ? "b-green" : inv.status === "overdue" ? "b-red" : inv.status === "pending" ? "b-amber" : "b-gray")}>{inv.status}</span>{inv.payment_method && <span style={{ fontSize: 10, color: "var(--text3)" }}>{inv.payment_method === "cash" ? "💵" : inv.payment_method === "bank" ? "🏦" : inv.payment_method === "card" ? "💳" : "📝"} {inv.payment_method}</span>}</div></td><td><div style={{ display: "flex", gap: 6 }}><button className="btn bo bsm" onClick={() => setViewInvoice(inv)}><i className="ti ti-file-invoice" />View</button>{inv.status !== "paid" && payingId === inv.id ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <select className="il-input" style={{ padding: "4px 8px", fontSize: 11, width: 80 }}
                          value={payMethod[inv.id] || "cash"}
                          onChange={e => setPayMethod(prev => ({ ...prev, [inv.id]: e.target.value }))}>
                          <option value="cash">💵 Cash</option>
                          <option value="bank">🏦 Bank</option>
                          <option value="card">💳 Card</option>
                          <option value="cheque">📝 Cheque</option>
                        </select>
                        <button className="btn bp bsm" onClick={() => markPaid(inv.id, payMethod[inv.id] || "cash")}>✓</button>
                        <button className="btn bo bsm" onClick={() => setPayingId(null)}>✕</button>
                      </div>
                    ) : (
                      <button className="btn bp bsm" onClick={() => setPayingId(inv.id)}>Mark Paid</button>
                    )}</div></td></tr>)}
          {invoices.length === 0 && <tr><td colSpan={7} className="empty">No invoices yet — create your first VAT invoice!</td></tr>}
        </tbody></table></div>
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
      <div className="ph"><div><div className="pt">Customers & Suppliers</div><div className="psub">Manage your business contacts</div></div><button className="btn bp" onClick={() => { setShowForm(!showForm); setF({ ...f, type: tab }); }}><i className="ti ti-user-plus" />Add {tab === "customer" ? "Customer" : "Supplier"}</button></div>
      <div className="tabs">{[["customer","👥 Customers"],["supplier","🏭 Suppliers"]].map(([k,l]) => <div key={k} className={"tab " + (tab === k ? "active" : "")} onClick={() => setTab(k)}>{l} <span style={{ color: "var(--text3)", fontSize: 12 }}>({contacts.filter(c => c.type === k || c.type === "both").length})</span></div>)}</div>
      {showForm && <div className="card" style={{ marginBottom: 20 }}><div className="ch"><div className="ct">New Contact</div></div><div className="fg"><div className="fgrp"><label>Type</label><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Both</option></select></div><div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Business name" /></div><div className="fgrp"><label>Email</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="email@example.com" /></div><div className="fgrp"><label>Phone</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+44..." /></div><div className="fgrp"><label>Address</label><input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></div><div className="fgrp"><label>City</label><input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></div><div className="fgrp"><label>Postcode</label><input value={f.postcode} onChange={e => setF({ ...f, postcode: e.target.value })} /></div><div className="fgrp"><label>VAT Number</label><input value={f.vat_number} onChange={e => setF({ ...f, vat_number: e.target.value })} placeholder="GB123456789" /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Contact"}</button></div></div>}
      <div className="contact-grid">
        {filtered.map(c => <div key={c.id} className="contact-card"><div className="cc-av" style={{ background: avatarColors[c.name?.charCodeAt(0) % avatarColors.length] || "#6366f1" }}>{c.name?.[0]?.toUpperCase()}</div><div className="cc-name">{c.name}</div>{c.email && <div className="cc-detail"><i className="ti ti-mail" />{c.email}</div>}{c.phone && <div className="cc-detail"><i className="ti ti-phone" />{c.phone}</div>}{c.city && <div className="cc-detail"><i className="ti ti-map-pin" />{c.city}{c.postcode ? `, ${c.postcode}` : ""}</div>}{c.vat_number && <div style={{ marginTop: 10 }}><span className="tag">VAT: {c.vat_number}</span></div>}</div>)}
        {filtered.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "var(--text3)", gridColumn: "1/-1" }}>No {tab}s yet — add your first one!</div>}
      </div>
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
      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Purchase Order</div></div><div className="fg"><div className="fgrp"><label>Supplier *</label><select value={f.supplier_id} onChange={e => setF({...f,supplier_id:e.target.value})}><option value="">Select supplier...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="fgrp"><label>Order Date</label><input type="date" value={f.order_date} onChange={e => setF({...f,order_date:e.target.value})} /></div><div className="fgrp"><label>Expected Delivery</label><input type="date" value={f.expected_date} onChange={e => setF({...f,expected_date:e.target.value})} /></div><div className="fgrp"><label>Notes</label><input value={f.notes} onChange={e => setF({...f,notes:e.target.value})} placeholder="Any notes..." /></div></div><div style={{borderTop:"0.5px solid var(--border)"}}><div className="po-line" style={{background:"#fafbfc"}}>{["Product","Qty","Unit Cost","VAT %","Total",""].map(h => <span key={h} style={{fontSize:11,fontWeight:600,color:"var(--text3)",textTransform:"uppercase"}}>{h}</span>)}</div>{lines.map((l,i) => <div key={i} className="po-line"><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.product_id} onChange={e => updateLine(i,"product_id",e.target.value)}><option value="">Select product...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%",fontVariantNumeric:"tabular-nums"}} placeholder="0" value={l.qty} onChange={e => updateLine(i,"qty",e.target.value)} /><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%",fontVariantNumeric:"tabular-nums"}} placeholder="0.00" value={l.unit_cost} onChange={e => updateLine(i,"unit_cost",e.target.value)} /><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.vat_rate} onChange={e => updateLine(i,"vat_rate",e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">0%</option></select><span className="mono" style={{fontSize:12,fontWeight:600}}>{fmt(lineTotal(l))}</span><button className="ib" onClick={() => lines.length>1&&setLines(lines.filter((_,j) => j!==i))}><i className="ti ti-x" /></button></div>)}<div style={{padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafbfc",borderTop:"0.5px solid var(--border)"}}><button className="btn bo bsm" onClick={() => setLines([...lines,{product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20"}])}><i className="ti ti-plus" />Add Line</button><div style={{textAlign:"right"}}><div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>Subtotal: {fmt(total)} · VAT: {fmt(vatTotal)}</div><div style={{fontSize:16,fontWeight:700}}>Total: {fmt(total+vatTotal)}</div></div></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Create PO"}</button></div></div>}
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
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        {[["pl","Profit & Loss"],["bs","Balance Sheet"]].map(([k,l]) => <button key={k} className={"btn "+(tab===k?"bp":"bo")} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab==="pl"&&<div className="card"><div className="ch"><div className="ct">Profit & Loss Statement</div><div className="cs">Year to date</div></div><div className="rs-title">Income</div>{revenue.map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tg">{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total Income</span><span className="mono tg">{fmt(totalRev)}</span></div><div style={{height:12}}/><div className="rs-title">Expenses</div>{expenses.map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tr-c">{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total Expenses</span><span className="mono tr-c">{fmt(totalExp)}</span></div><div className="rrow total"><span>Net {net>=0?"Profit":"Loss"}</span><span className={"mono "+(net>=0?"tg":"tr-c")}>{fmt(Math.abs(net))}</span></div></div>}
      {tab==="bs"&&<div className="g2">{[["Assets & Liabilities",[["Asset","tg"],["Liability","tr-c"]]],["Equity",[["Equity","tg"]]]].map(([title,groups]) => <div key={title} className="card"><div className="ch"><div className="ct">{title}</div></div>{groups.map(([type,cls]) => <span key={type}><div className="rs-title">{type}</div>{accounts.filter(a => a.type===type).map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className={"mono "+cls}>{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total {type}</span><span className={"mono "+cls}>{fmt(accounts.filter(a => a.type===type).reduce((s,a) => s+a.balance,0))}</span></div></span>)}</div>)}</div>}
    </div>
  );
}

// ── CUSTOMER STATEMENT ───────────────────────────────────────────────────────
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
    const lines = custInvoices.map(inv =>
      `${inv.invoice_number} — ${fmtDate(inv.invoice_date)} — ${fmt(inv.amount)} — ${inv.status.toUpperCase()}`
    ).join("\n");
    const msg = encodeURIComponent(
      `*Account Statement — ${COMPANY.name}*\n` +
      `Customer: *${selectedContact.name}*\n` +
      `Date: ${fmtDate(new Date().toISOString())}\n\n` +
      `${lines}\n\n` +
      `Total Paid: ${fmt(totalPaid)}\n` +
      `*Balance Outstanding: ${fmt(totalOwed)}*\n\n` +
      `Please contact us at ${COMPANY.phone} for any queries.`
    );
    const clean = (selectedContact.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    if (clean) window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
    else window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handlePrint = () => window.print();

  return (
    <div>
      <div className="ph"><div><div className="pt">Customer Statement</div><div className="psub">View and share full account statements</div></div></div>
      <div className="card" style={{ marginBottom: 20, overflow: "visible" }}>
        <div className="ch"><div className="ct">Select Customer</div></div>
        <div style={{ padding: 20, overflow: "visible" }}>
          <div style={{ position: "relative", maxWidth: 500 }}>
            <input
              style={{ width: "100%", background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }}
              placeholder="Search customers by name..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && filtered.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 200, maxHeight: 300, overflowY: "auto", marginTop: 4 }}>
                {filtered.map(c => (
                  <div key={c.id} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "0.5px solid var(--border)", fontSize: 13 }}
                    onMouseDown={() => { setSelectedContact(c); setQuery(c.name); setShowDropdown(false); }}>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.phone || ""} {c.city ? `· ${c.city}` : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedContact && (
        <div className="card">
          <div className="ch">
            <div>
              <div className="ct">Statement — {selectedContact.name}</div>
              <div className="cs">{selectedContact.phone || ""} {selectedContact.email ? `· ${selectedContact.email}` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn bwa bsm" onClick={handleWhatsApp}><i className="ti ti-brand-whatsapp" />Send Statement</button>
              <button className="btn bo bsm" onClick={handlePrint}><i className="ti ti-printer" />Print</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "16px 20px", borderBottom: "0.5px solid var(--border)" }}>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Total Invoiced</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalPaid + totalOwed)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Total Paid</div><div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{fmt(totalPaid)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Balance Due</div><div style={{ fontSize: 20, fontWeight: 700, color: totalOwed > 0 ? "var(--red)" : "var(--green)" }}>{fmt(totalOwed)}</div></div>
          </div>
          <div className="tw"><table>
            <thead><tr><th>Invoice #</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {custInvoices.map(inv => (
                <tr key={inv.id}>
                  <td className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{inv.invoice_number}</td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(inv.invoice_date)}</td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(inv.due_date)}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td>
                  <td><span className={"badge " + (inv.status === "paid" ? "b-green" : inv.status === "overdue" ? "b-red" : "b-amber")}>{inv.status}</span></td>
                </tr>
              ))}
              {custInvoices.length === 0 && <tr><td colSpan={5} className="empty">No invoices found for this customer</td></tr>}
            </tbody>
          </table></div>
          {custInvoices.length > 0 && (
            <div style={{ padding: "14px 20px", borderTop: "2px solid var(--border2)", display: "flex", justifyContent: "flex-end", gap: 32 }}>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "var(--text3)" }}>BALANCE DUE</div><div style={{ fontSize: 20, fontWeight: 700, color: totalOwed > 0 ? "var(--red)" : "var(--green)" }}>{fmt(totalOwed)}</div></div>
            </div>
          )}
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

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.code || "").toLowerCase().includes(query.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(query.toLowerCase())
  );

  const adjust = async (product, delta, reason) => {
    const newQty = Math.max(0, (product.stock_qty || 0) + delta);
    setSaving(product.id);
    await sb.patch(token, "products", product.id, { stock_qty: newQty });
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
          <input
            style={{ width: "100%", background: "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }}
            placeholder="🔍  Search products by name, SKU or category..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="tw"><table>
          <thead><tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Adjust By</th><th>Reason</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.slice(0, 30).map(p => {
              const adj = adjustments[p.id] || "";
              const delta = parseInt(adj) || 0;
              const newQty = Math.max(0, (p.stock_qty || 0) + delta);
              return (
                <tr key={p.id} style={{ background: success === p.id ? "var(--green-lt)" : "transparent" }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{p.code || ""}</div>
                  </td>
                  <td><span className="tag">{p.category || "General"}</span></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontWeight: 600, fontSize: 15 }}>{p.stock_qty || 0}</span>
                      {delta !== 0 && <span style={{ fontSize: 11, color: delta > 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>→ {newQty}</span>}
                    </div>
                    {p.stock_qty <= p.reorder_level && <div style={{ fontSize: 10, color: "var(--red)", fontWeight: 600, marginTop: 2 }}>LOW STOCK</div>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button style={{ width: 28, height: 28, borderRadius: 6, border: "0.5px solid var(--border2)", background: "var(--white)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => setAdjustments(prev => ({ ...prev, [p.id]: String((parseInt(prev[p.id] || 0)) - 1) }))}>−</button>
                      <input
                        type="number"
                        style={{ width: 60, textAlign: "center", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "5px 6px", fontSize: 13, outline: "none", fontFamily: "var(--mono)" }}
                        value={adj}
                        onChange={e => setAdjustments(prev => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="0"
                      />
                      <button style={{ width: 28, height: 28, borderRadius: 6, border: "0.5px solid var(--border2)", background: "var(--white)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => setAdjustments(prev => ({ ...prev, [p.id]: String((parseInt(prev[p.id] || 0)) + 1) }))}>+</button>
                    </div>
                  </td>
                  <td>
                    <select style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none" }}
                      value={reasons[p.id] || ""} onChange={e => setReasons(prev => ({ ...prev, [p.id]: e.target.value }))}>
                      <option value="">Select reason...</option>
                      <option value="stock_received">Stock Received</option>
                      <option value="sold">Sold</option>
                      <option value="damaged">Damaged</option>
                      <option value="returned">Returned</option>
                      <option value="count_adjustment">Count Adjustment</option>
                    </select>
                  </td>
                  <td>
                    {success === p.id ? (
                      <span style={{ color: "var(--green)", fontSize: 13, fontWeight: 600 }}>✓ Updated</span>
                    ) : (
                      <button className={"btn bp bsm"} disabled={!adj || delta === 0 || saving === p.id}
                        onClick={() => adjust(p, delta, reasons[p.id])}>
                        {saving === p.id ? "..." : "Update"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="empty">No products found</td></tr>}
          </tbody>
        </table></div>
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

  const agents = allProfiles;
  const displayInvoices = agentInvoices(selectedAgent);

  const totalSales = displayInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = displayInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = displayInvoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = displayInvoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="ph"><div><div className="pt">Sales by Agent</div><div className="psub">Detailed agent performance breakdown</div></div></div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "8px 14px", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }}
          value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
          <option value="all">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || "Unknown"}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: "var(--r)", padding: 4 }}>
          {[["all","All Time"],["month","This Month"],["week","This Week"],["today","Today"]].map(([k,l]) => (
            <button key={k} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)", background: period === k ? "var(--white)" : "transparent", color: period === k ? "var(--text)" : "var(--text3)", boxShadow: period === k ? "var(--sh)" : "none" }}
              onClick={() => setPeriod(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="g4" style={{ marginBottom: 20 }}>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Total Sales</div><div className="kpi-val">{fmt(totalSales)}</div><div className="ks">{displayInvoices.length} invoices</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Collected</div><div className="kpi-val tg">{fmt(totalPaid)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Pending</div><div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(totalPending)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Overdue</div><div className="kpi-val tr-c">{fmt(totalOverdue)}</div></div>
      </div>

      {selectedAgent === "all" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="ch"><div className="ct">Agent Breakdown</div></div>
          <div className="tw"><table>
            <thead><tr><th>Agent</th><th>Invoices</th><th>Total Sales</th><th>Paid</th><th>Pending</th><th>Overdue</th><th>Performance</th></tr></thead>
            <tbody>
              {[...agents].sort((a, b) => agentInvoices(b.id).reduce((s,i) => s+i.amount,0) - agentInvoices(a.id).reduce((s,i) => s+i.amount,0)).map((agent, idx) => {
                const agInv = agentInvoices(agent.id);
                const agTotal = agInv.reduce((s,i) => s+i.amount,0);
                const agPaid = agInv.filter(i => i.status==="paid").reduce((s,i) => s+i.amount,0);
                const agPending = agInv.filter(i => i.status==="pending").reduce((s,i) => s+i.amount,0);
                const agOverdue = agInv.filter(i => i.status==="overdue").reduce((s,i) => s+i.amount,0);
                const maxSales = Math.max(...agents.map(a => agentInvoices(a.id).reduce((s,i) => s+i.amount,0)), 1);
                const medals = ["🥇","🥈","🥉"];
                return (
                  <tr key={agent.id}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{medals[idx] || ""}</span>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{(agent.full_name||"U")[0].toUpperCase()}</div>
                      <div><div style={{ fontWeight: 600 }}>{agent.full_name||"Unknown"}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{agent.role}</div></div>
                    </div></td>
                    <td className="mono">{agInv.length}</td>
                    <td className="mono" style={{ fontWeight: 600, color: "var(--green)" }}>{fmt(agTotal)}</td>
                    <td className="mono tg">{fmt(agPaid)}</td>
                    <td className="mono" style={{ color: "var(--amber)" }}>{fmt(agPending)}</td>
                    <td className="mono tr-c">{fmt(agOverdue)}</td>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 80, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}><div style={{ width: (agTotal/maxSales*100)+"%", height: "100%", background: "var(--blue)", borderRadius: 3 }} /></div><span style={{ fontSize: 11, color: "var(--text3)" }}>{Math.round(agTotal/maxSales*100)}%</span></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}

      <div className="card">
        <div className="ch"><div className="ct">Invoice Detail</div><div className="cs">{displayInvoices.length} records</div></div>
        <div className="tw"><table>
          <thead><tr><th>Invoice #</th><th>Customer</th><th>Agent</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {displayInvoices.slice(0, 50).map(inv => {
              const agent = allProfiles.find(a => a.id === inv.created_by);
              return (
                <tr key={inv.id}>
                  <td className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{inv.invoice_number}</td>
                  <td style={{ fontWeight: 500 }}>{inv.customer}</td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }}>{agent?.full_name || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(inv.invoice_date)}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td>
                  <td><span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span></td>
                </tr>
              );
            })}
            {displayInvoices.length === 0 && <tr><td colSpan={6} className="empty">No invoices for this period</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ── ADMIN REPORTS SUITE ───────────────────────────────────────────────────────
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

  // Monthly sales breakdown (last 12 months)
  const monthlySales = Array.from({length:12}, (_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-11+i, 1);
    const month = d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"});
    const invs = invoices.filter(inv => {
      const id = new Date(inv.invoice_date || inv.created_at);
      return id.getMonth()===d.getMonth() && id.getFullYear()===d.getFullYear();
    });
    return { month, total: invs.reduce((s,i)=>s+i.amount,0), paid: invs.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0), count: invs.length };
  });

  const maxMonthly = Math.max(...monthlySales.map(m=>m.total), 1);

  // Top customers
  const customerSales = contacts.filter(c=>c.type==="customer"||c.type==="both").map(c => ({
    name: c.name,
    total: filteredInv.filter(i=>i.customer===c.name).reduce((s,i)=>s+i.amount,0),
    count: filteredInv.filter(i=>i.customer===c.name).length,
    paid: filteredInv.filter(i=>i.customer===c.name&&i.status==="paid").reduce((s,i)=>s+i.amount,0),
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  // Product performance (from invoice descriptions matching product names)
  const productSales = products.map(p => ({
    ...p,
    invoiceCount: filteredInv.filter(i => i.description && i.description.toLowerCase().includes(p.name.toLowerCase())).length,
    stockValue: (p.stock_qty||0) * (p.cost_price||0),
    retailValue: (p.stock_qty||0) * (p.sale_price||0),
    margin: p.sale_price > 0 ? Math.round(((p.sale_price - p.cost_price) / p.sale_price) * 100) : 0,
  })).sort((a,b) => b.stockValue - a.stockValue);

  // Category breakdown
  const categories = [...new Set(products.map(p=>p.category||"General"))];
  const catData = categories.map(cat => ({
    name: cat,
    products: products.filter(p=>(p.category||"General")===cat).length,
    stockValue: products.filter(p=>(p.category||"General")===cat).reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0),
    retailValue: products.filter(p=>(p.category||"General")===cat).reduce((s,p)=>s+(p.stock_qty||0)*(p.sale_price||0),0),
    lowStock: products.filter(p=>(p.category||"General")===cat && p.stock_qty<=p.reorder_level).length,
  })).sort((a,b)=>b.retailValue-a.retailValue);

  const totalStockValue = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0);
  const totalRetailValue = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.sale_price||0),0);
  const lowStockItems = products.filter(p=>p.stock_qty<=p.reorder_level);

  const periodLabels = { week:"This Week", month:"This Month", quarter:"This Quarter", year:"This Year", all:"All Time" };

  return (
    <div>
      <div className="ph">
        <div><div className="pt">Admin Reports</div><div className="psub">Comprehensive business analytics</div></div>
        <div style={{display:"flex",gap:6,background:"#f1f5f9",borderRadius:"var(--r)",padding:4}}>
          {[["week","Week"],["month","Month"],["quarter","Quarter"],["year","Year"],["all","All"]].map(([k,l]) => (
            <button key={k} style={{padding:"5px 12px",borderRadius:6,border:"none",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"var(--sans)",background:period===k?"var(--white)":"transparent",color:period===k?"var(--text)":"var(--text3)",boxShadow:period===k?"var(--sh)":"none"}}
              onClick={()=>setPeriod(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[["overview","📊 Overview"],["monthly","📅 Monthly Sales"],["products","📦 Product Report"],["customers","👥 Customer Report"],["agents","🏆 Agent Report"],["stock","🏭 Stock Report"]].map(([k,l]) => (
          <button key={k} className={"btn "+(tab===k?"bp":"bo")} style={{fontSize:12,padding:"6px 14px"}} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==="overview" && (
        <div>
          <div className="kgrid">
            <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--blue-lt)"}}><i className="ti ti-currency-pound" style={{color:"var(--blue)"}} /></div><span className="kpi-badge" style={{background:"var(--blue-lt)",color:"#1e40af"}}>{periodLabels[period]}</span></div><div className="kpi-val">{fmt(totalSales)}</div><div className="kpi-label">Total Sales</div><div className="ks">{filteredInv.length} invoices</div></div>
            <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--green-lt)"}}><i className="ti ti-circle-check" style={{color:"var(--green)"}} /></div></div><div className="kpi-val tg">{fmt(totalPaid)}</div><div className="kpi-label">Collected</div><div className="ks">{filteredInv.filter(i=>i.status==="paid").length} paid</div></div>
            <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--amber-lt)"}}><i className="ti ti-clock" style={{color:"var(--amber)"}} /></div></div><div className="kpi-val" style={{color:"var(--amber)"}}>{fmt(totalPending)}</div><div className="kpi-label">Pending</div></div>
            <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{background:"var(--red-lt)"}}><i className="ti ti-alert-circle" style={{color:"var(--red)"}} /></div></div><div className="kpi-val tr-c">{fmt(totalOverdue)}</div><div className="kpi-label">Overdue</div></div>
          </div>
          <div className="g2">
            <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Stock Value (Cost)</div><div className="kpi-val">{fmt(totalStockValue)}</div><div className="ks">{products.length} products</div></div>
            <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Retail Value</div><div className="kpi-val tg">{fmt(totalRetailValue)}</div><div className="ks">Potential revenue</div></div>
          </div>
          <div style={{marginBottom:20}} />
          <div className="card">
            <div className="ch"><div className="ct">Monthly Sales — Last 12 Months</div></div>
            <div style={{padding:"20px 20px 8px"}}>
              <div style={{display:"flex",alignItems:"flex-end",gap:6,height:140,marginBottom:8}}>
                {monthlySales.map((m,i) => (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
                    <div style={{fontSize:9,color:"var(--text3)",fontFamily:"var(--mono)"}}>£{Math.round(m.total/1000)}k</div>
                    <div style={{width:"100%",background:"var(--blue)",borderRadius:"4px 4px 0 0",height:Math.max(4,(m.total/maxMonthly)*120)+"px",opacity:.85,transition:"height .5s"}} title={fmt(m.total)} />
                    <div style={{fontSize:9,color:"var(--text3)"}}>{m.month}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text2)",borderTop:"0.5px solid var(--border)",paddingTop:8}}>
                <span>Total: <strong>{fmt(monthlySales.reduce((s,m)=>s+m.total,0))}</strong></span>
                <span>Best month: <strong>{monthlySales.reduce((a,b)=>a.total>b.total?a:b).month}</strong></span>
                <span>Avg/month: <strong>{fmt(monthlySales.reduce((s,m)=>s+m.total,0)/12)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==="monthly" && (
        <div className="card">
          <div className="ch"><div className="ct">Monthly Sales Breakdown</div><div className="cs">Last 12 months</div></div>
          <div className="tw"><table>
            <thead><tr><th>Month</th><th>Invoices</th><th>Total Sales</th><th>Collected</th><th>Collection Rate</th><th>vs Prev Month</th></tr></thead>
            <tbody>
              {[...monthlySales].reverse().map((m,i,arr) => {
                const prev = arr[i+1];
                const change = prev && prev.total > 0 ? ((m.total-prev.total)/prev.total*100).toFixed(1) : null;
                return (
                  <tr key={m.month}>
                    <td style={{fontWeight:600}}>{m.month}</td>
                    <td className="mono">{m.count}</td>
                    <td className="mono" style={{fontWeight:600}}>{fmt(m.total)}</td>
                    <td className="mono tg">{fmt(m.paid)}</td>
                    <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}><div style={{width:m.total>0?(m.paid/m.total*100)+"%":"0%",height:"100%",background:"var(--green)",borderRadius:3}} /></div><span style={{fontSize:12}}>{m.total>0?Math.round(m.paid/m.total*100):0}%</span></div></td>
                    <td>{change!==null?<span style={{color:parseFloat(change)>=0?"var(--green)":"var(--red)",fontWeight:600,fontSize:12}}>{parseFloat(change)>=0?"↑":"↓"} {Math.abs(change)}%</span>:<span style={{color:"var(--text3)",fontSize:12}}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}

      {tab==="products" && (
        <div>
          <div className="g3" style={{marginBottom:20}}>
            <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Products</div><div className="kpi-val">{products.length}</div></div>
            <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Stock Value</div><div className="kpi-val">{fmt(totalStockValue)}</div></div>
            <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Low Stock Items</div><div className="kpi-val tr-c">{lowStockItems.length}</div></div>
          </div>
          <div className="card" style={{marginBottom:20}}>
            <div className="ch"><div className="ct">Sales by Category</div></div>
            <div className="tw"><table>
              <thead><tr><th>Category</th><th>Products</th><th>Stock Value</th><th>Retail Value</th><th>Potential Profit</th><th>Low Stock</th></tr></thead>
              <tbody>
                {catData.map(c => (
                  <tr key={c.name}>
                    <td style={{fontWeight:600}}>{c.name}</td>
                    <td className="mono">{c.products}</td>
                    <td className="mono">{fmt(c.stockValue)}</td>
                    <td className="mono tg">{fmt(c.retailValue)}</td>
                    <td className="mono" style={{color:"var(--purple)",fontWeight:600}}>{fmt(c.retailValue-c.stockValue)}</td>
                    <td>{c.lowStock>0?<span className="badge b-red">{c.lowStock} items</span>:<span className="badge b-green">All stocked</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
          <div className="card">
            <div className="ch"><div className="ct">Full Product Report</div><div className="cs">{products.length} products</div></div>
            <div className="tw"><table>
              <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>In Stock</th><th>Cost Price</th><th>Sale Price</th><th>Margin</th><th>Stock Value</th><th>Status</th></tr></thead>
              <tbody>
                {productSales.map(p => (
                  <tr key={p.id}>
                    <td style={{fontWeight:500}}>{p.name}</td>
                    <td className="mono" style={{fontSize:11,color:"var(--text3)"}}>{p.code||"—"}</td>
                    <td><span className="tag" style={{fontSize:10}}>{p.category||"General"}</span></td>
                    <td className="mono">{p.stock_qty||0} {p.unit}</td>
                    <td className="mono">{fmt(p.cost_price)}</td>
                    <td className="mono">{fmt(p.sale_price)}</td>
                    <td><span style={{color:p.margin>30?"var(--green)":p.margin>15?"var(--amber)":"var(--red)",fontWeight:600,fontSize:12}}>{p.margin}%</span></td>
                    <td className="mono">{fmt(p.stockValue)}</td>
                    <td><span className={"badge "+(p.stock_qty<=p.reorder_level?"b-red":p.stock_qty<=p.reorder_level*2?"b-amber":"b-green")} style={{fontSize:10}}>{p.stock_qty<=p.reorder_level?"Low":p.stock_qty<=p.reorder_level*2?"Low":"OK"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      {tab==="customers" && (
        <div className="card">
          <div className="ch"><div className="ct">Customer Sales Report</div><div className="cs">{periodLabels[period]} · {customerSales.length} active customers</div></div>
          <div className="tw"><table>
            <thead><tr><th>#</th><th>Customer</th><th>Invoices</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Share</th></tr></thead>
            <tbody>
              {customerSales.slice(0,50).map((c,i) => {
                const outstanding = c.total - c.paid;
                const pct = Math.round(c.total/totalSales*100);
                return (
                  <tr key={c.name}>
                    <td style={{color:"var(--text3)",fontSize:12}}>{i+1}</td>
                    <td style={{fontWeight:500}}>{c.name}</td>
                    <td className="mono">{c.count}</td>
                    <td className="mono" style={{fontWeight:600}}>{fmt(c.total)}</td>
                    <td className="mono tg">{fmt(c.paid)}</td>
                    <td className="mono" style={{color:outstanding>0?"var(--red)":"var(--green)"}}>{fmt(outstanding)}</td>
                    <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:5,background:"var(--border)",borderRadius:3,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:"var(--blue)",borderRadius:3}} /></div><span style={{fontSize:11,color:"var(--text3)"}}>{pct}%</span></div></td>
                  </tr>
                );
              })}
              {customerSales.length===0&&<tr><td colSpan={7} className="empty">No sales data for this period</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}

      {tab==="agents" && (
        <div>
          <div className="card" style={{marginBottom:20}}>
            <div className="ch"><div className="ct">Agent Performance — {periodLabels[period]}</div></div>
            <div className="tw"><table>
              <thead><tr><th>#</th><th>Agent</th><th>Role</th><th>Invoices</th><th>Total Sales</th><th>Collected</th><th>Pending</th><th>Performance</th></tr></thead>
              <tbody>
                {[...allProfiles].sort((a,b) => {
                  const aTotal = filteredInv.filter(i=>i.created_by===b.id).reduce((s,i)=>s+i.amount,0);
                  const bTotal = filteredInv.filter(i=>i.created_by===a.id).reduce((s,i)=>s+i.amount,0);
                  return aTotal - bTotal;
                }).map((agent,i) => {
                  const agInv = filteredInv.filter(i=>i.created_by===agent.id);
                  const agTotal = agInv.reduce((s,i)=>s+i.amount,0);
                  const agPaid = agInv.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0);
                  const agPending = agInv.filter(i=>i.status!=="paid").reduce((s,i)=>s+i.amount,0);
                  const maxT = Math.max(...allProfiles.map(a=>filteredInv.filter(i=>i.created_by===a.id).reduce((s,i)=>s+i.amount,0)),1);
                  const medals=["🥇","🥈","🥉"];
                  return (
                    <tr key={agent.id}>
                      <td><span style={{fontSize:16}}>{medals[i]||i+1}</span></td>
                      <td><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{(agent.full_name||"U")[0].toUpperCase()}</div><span style={{fontWeight:600}}>{agent.full_name||"Unknown"}</span></div></td>
                      <td><span className="badge b-blue" style={{fontSize:10}}>{agent.role}</span></td>
                      <td className="mono">{agInv.length}</td>
                      <td className="mono" style={{fontWeight:600,color:"var(--green)"}}>{fmt(agTotal)}</td>
                      <td className="mono tg">{fmt(agPaid)}</td>
                      <td className="mono" style={{color:"var(--amber)"}}>{fmt(agPending)}</td>
                      <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:80,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}><div style={{width:(agTotal/maxT*100)+"%",height:"100%",background:"var(--blue)",borderRadius:3}} /></div><span style={{fontSize:11,color:"var(--text3)"}}>{Math.round(agTotal/maxT*100)}%</span></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      {tab==="stock" && (
        <div>
          <div className="g4" style={{marginBottom:20}}>
            <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Products</div><div className="kpi-val">{products.length}</div></div>
            <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Stock Cost Value</div><div className="kpi-val">{fmt(totalStockValue)}</div></div>
            <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Retail Value</div><div className="kpi-val tg">{fmt(totalRetailValue)}</div></div>
            <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Potential Profit</div><div className="kpi-val" style={{color:"var(--purple)"}}>{fmt(totalRetailValue-totalStockValue)}</div></div>
          </div>
          {lowStockItems.length > 0 && (
            <div className="card" style={{marginBottom:20}}>
              <div className="ch"><div className="ct" style={{color:"var(--red)"}}>⚠️ Low Stock Items — {lowStockItems.length} products</div></div>
              <div className="tw"><table>
                <thead><tr><th>Product</th><th>Category</th><th>In Stock</th><th>Reorder At</th><th>Units Needed</th><th>Est. Cost</th></tr></thead>
                <tbody>
                  {lowStockItems.map(p => (
                    <tr key={p.id}>
                      <td style={{fontWeight:500}}>{p.name}</td>
                      <td><span className="tag" style={{fontSize:10}}>{p.category||"General"}</span></td>
                      <td className="mono tr-c" style={{fontWeight:600}}>{p.stock_qty} {p.unit}</td>
                      <td className="mono">{p.reorder_level} {p.unit}</td>
                      <td className="mono" style={{color:"var(--amber)",fontWeight:600}}>{Math.max(0, p.reorder_level*2 - p.stock_qty)} {p.unit}</td>
                      <td className="mono">{fmt(Math.max(0, p.reorder_level*2-p.stock_qty)*p.cost_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}
          <div className="card">
            <div className="ch"><div className="ct">Full Stock Report by Category</div></div>
            <div className="tw"><table>
              <thead><tr><th>Category</th><th>Products</th><th>Total Units</th><th>Cost Value</th><th>Retail Value</th><th>Margin</th><th>Low Stock</th></tr></thead>
              <tbody>
                {catData.map(c => (
                  <tr key={c.name}>
                    <td style={{fontWeight:600}}>{c.name}</td>
                    <td className="mono">{c.products}</td>
                    <td className="mono">{products.filter(p=>(p.category||"General")===c.name).reduce((s,p)=>s+(p.stock_qty||0),0)}</td>
                    <td className="mono">{fmt(c.stockValue)}</td>
                    <td className="mono tg">{fmt(c.retailValue)}</td>
                    <td><span style={{color:c.stockValue>0?((c.retailValue-c.stockValue)/c.retailValue*100).toFixed(0)>30?"var(--green)":"var(--amber)":"var(--text3)",fontWeight:600,fontSize:12}}>{c.stockValue>0?Math.round((c.retailValue-c.stockValue)/c.retailValue*100):0}%</span></td>
                    <td>{c.lowStock>0?<span className="badge b-red">{c.lowStock}</span>:<span className="badge b-green">✓</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}
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
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

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
      // Agents only see their own invoices
      if (Array.isArray(invs)) {
        const filteredInvs = userProfile?.role === "admin" 
          ? invs 
          : invs.filter(i => i.created_by === auth.user.id);
        setInvoices(filteredInvs);
      }
      // All users see all contacts (needed for invoice creation)
      if (Array.isArray(cnts)) setContacts(cnts);
      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(allProfs)) setAllProfiles(allProfs);
      setLoading(false);
    });
  }, [auth]);

  const signOut = async () => { await sb.signOut(auth.token); setAuth(null); };
  const initials = (profile?.full_name||auth?.user?.email||"U")[0]?.toUpperCase();

  if (!auth) return <><style>{CSS}</style><Auth onAuth={setAuth} /></>;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <img src={LOGO} alt="Arkham Retail" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain", background: "#fff" }} />
            <span className="logo-text">LedgerOS</span>
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
              <img src={LOGO} alt="Arkham Retail" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "contain" }} />
            </div>
            <div className="search-wrap topbar-search">
              <i className="ti ti-search" />
              <input className="search-input" placeholder="Search invoices, customers, products..." />
            </div>
            <div className="topbar-right">
              <span className="tb-role">{profile?.role||"agent"}</span>
              <div className="tb-btn tb-notif" title="Notifications"><i className="ti ti-bell" /></div>
              <div className="tb-btn" title="Settings" onClick={() => setPage("import")}><i className="ti ti-settings" /></div>
              <div className="tb-av" title={profile?.full_name}>{initials}</div>
            </div>
          </div>

          <div className="content">
            {loading ? (
              <div className="loading"><div className="spin" /><span>Loading your data...</span></div>
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
              </>
            )}
          </div>
        </div>

        <nav className="mob-nav">
          <div className="mob-nav-inner">
            {MOBILE_NAV.map(n => <div key={n.id} className={"mob-nav-item "+(page===n.id?"active":"")} onClick={() => setPage(n.id)}><i className={"ti "+n.icon} style={{fontSize:20}} /><span className="mob-nav-lbl">{n.label}</span></div>)}
          </div>
        </nav>
      </div>
    </>
  );
}
