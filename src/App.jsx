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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, Clock, Package, CheckCircle2, FileText, AlertTriangle, Users, ShoppingBag, Landmark, Sun } from "lucide-react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "./lib/supabase.js";
import { fmt, fmtDate, fmtShort, fmtTime, fmtRelative, dueDelta, today, isMobile, escHtml, DEFAULT_REORDER } from "./lib/utils.js";
import { sendEmail, buildInvoiceEmailHtml, buildReminderEmailHtml, buildDNEmailHtml } from "./lib/email.js";
import { logAudit } from "./lib/audit.js";
import { COMPANY, LOGO, JSPDF_URL, toast } from "./lib/constants.js";

// ── All shared utilities, constants, sb, email builders now imported from lib/ ──
// CSS stays here until App.jsx is further split (it's only used in the style tag inject below)


const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  /* ── Backgrounds ── */
  --bg:#fafbff;
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
  --indigo:#818cf8;--indigo-dim:rgba(129,140,248,.15);
  --orange:#f97316;--orange-lt:#fff7ed;--orange-dk:#c2410c;

  /* ── Elevation ── */
  --sh:0 1px 3px rgba(13,17,23,.06),0 2px 12px rgba(13,17,23,.07);
  --sh2:0 4px 16px rgba(13,17,23,.12),0 1px 4px rgba(13,17,23,.06);
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
  width:240px;min-width:240px;
  background:var(--sidebar);
  display:flex;flex-direction:column;
  padding:0;
  position:sticky;top:0;height:100vh;overflow-y:auto;
  border-right:1px solid var(--sidebar-border);
}
.sidebar::before{
  content:'';position:absolute;top:-100px;left:-100px;
  width:360px;height:360px;border-radius:50%;
  background:radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%);
  pointer-events:none;z-index:0;
}
.sidebar::after{
  content:'';position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
  background-size:52px 52px;
  pointer-events:none;z-index:0;
}
.sidebar>*{position:relative;z-index:1}
.sidebar::-webkit-scrollbar{width:0}

.sidebar-logo{
  padding:20px 16px 14px;
  border-bottom:1px solid rgba(255,255,255,.05);
  margin-bottom:6px;
}
.logo-mark{
  width:38px;height:38px;
  background:linear-gradient(145deg,#1e1b4b,#2d2a6e);
  border-radius:11px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  box-shadow:0 3px 12px rgba(99,102,241,.3),inset 0 1px 0 rgba(255,255,255,.07);
}
.logo-inner{display:flex;align-items:center;gap:12px}
.logo-wm{display:flex;flex-direction:column;gap:1px}
.logo-wm-row{display:flex;align-items:baseline;gap:1px}
.logo-wm-l{font-size:15px;font-weight:800;color:#fff;letter-spacing:-.5px;line-height:1}
.logo-wm-os{font-size:15px;font-weight:300;color:rgba(255,255,255,.35);letter-spacing:-.3px;line-height:1}
.logo-sub{font-size:9px;color:rgba(255,255,255,.2);letter-spacing:.3px;margin-top:2px}
.logo-live{
  display:inline-flex;align-items:center;gap:5px;
  background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.15);
  border-radius:20px;padding:3px 8px;margin-top:10px;
}
.logo-live-dot{width:5px;height:5px;border-radius:50%;background:#22c55e}
.logo-live-txt{font-size:9px;font-weight:600;color:rgba(34,197,94,.8);letter-spacing:.8px;text-transform:uppercase}

.nav-section{margin-bottom:4px}
.nav-label{
  font-size:9px;font-weight:700;
  color:rgba(255,255,255,.18);
  text-transform:uppercase;letter-spacing:1.5px;
  padding:12px 18px 4px;
}

.nav-item{
  display:flex;align-items:center;gap:10px;
  padding:9px 16px;border-radius:8px;
  color:rgba(255,255,255,.4);font-size:13px;font-weight:500;
  cursor:pointer;
  transition:color .12s var(--ease),background .12s var(--ease);
  margin-bottom:1px;user-select:none;letter-spacing:-.1px;
  position:relative;overflow:hidden;
}
.nav-item::before{
  content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);
  width:0;height:16px;border-radius:0 3px 3px 0;
  background:#818cf8;transition:width .12s;
}
.nav-item:hover{
  background:rgba(255,255,255,.05);
  color:rgba(255,255,255,.7);
}
.nav-item.active{
  background:linear-gradient(90deg,rgba(99,102,241,.22),rgba(99,102,241,.06));
  color:#a5b4fc;font-weight:600;
}
.nav-item.active::before{width:3px}
.nav-item svg{flex-shrink:0;opacity:.85;width:15px;height:15px}
.nav-item.active svg{opacity:1}
.nav-badge{
  margin-left:auto;background:var(--red);color:#fff;
  font-size:9px;font-weight:700;
  padding:1px 6px;border-radius:20px;min-width:18px;text-align:center;
}

.nav-bottom{
  margin-top:auto;padding:0 8px 12px;
}
.nav-bottom-divider{height:1px;background:rgba(255,255,255,.05);margin:8px 0}
.user-row{
  display:flex;align-items:center;gap:10px;
  padding:10px 8px;border-radius:10px;
  cursor:pointer;transition:background .12s;
}
.user-row:hover{background:rgba(255,255,255,.05)}
.user-av-wrap{position:relative;flex-shrink:0}
.user-av{
  width:32px;height:32px;border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;color:#fff;
}
.user-av-online{
  position:absolute;bottom:0;right:0;
  width:9px;height:9px;border-radius:50%;
  background:#22c55e;border:1.5px solid #060d1f;
}
.user-name{font-size:12px;font-weight:600;color:rgba(255,255,255,.82);line-height:1.2}
.user-role-badge{
  display:inline-flex;font-size:9px;font-weight:700;letter-spacing:.4px;
  text-transform:uppercase;padding:1px 6px;border-radius:3px;
  background:rgba(37,99,235,.15);color:#93c5fd;margin-top:2px;
}
.signout-btn{
  margin-left:auto;background:none;border:none;
  color:rgba(255,255,255,.2);cursor:pointer;
  padding:6px;border-radius:6px;
  transition:color .12s,background .12s;display:flex;
}
.signout-btn:hover{color:var(--red);background:rgba(239,68,68,.08)}

/* ────────────────────────────────────
   MAIN AREA
   ──────────────────────────────────── */
.main{flex:1;display:flex;flex-direction:column;overflow-x:clip;min-height:100vh}

/* ── Page utility bar (within sub-nav or standalone) ── */

.search-wrap{position:relative;flex:1;max-width:340px;display:flex;align-items:center}
.search-wrap i,.search-wrap>svg{
  position:absolute;left:10px;top:50%;
  transform:translateY(-50%);
  color:rgba(255,255,255,.28);pointer-events:none;
  width:15px;height:15px;flex-shrink:0;
}
.search-input{
  width:100%;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.09);
  border-radius:var(--r);
  padding:0 12px 0 32px;
  height:34px;
  font-size:13px;color:rgba(255,255,255,.55);
  font-family:var(--sans);outline:none;
  transition:border .14s,box-shadow .14s,background .14s;
  box-sizing:border-box;
}
.search-input:focus{
  border-color:rgba(37,99,235,.5);
  background:rgba(255,255,255,.08);
  box-shadow:0 0 0 3px rgba(37,99,235,.12);
}
.search-input::placeholder{color:rgba(255,255,255,.25)}

.tb-btn{
  width:30px;height:30px;border-radius:var(--r);
  border:1px solid rgba(255,255,255,.1);
  background:rgba(255,255,255,.07);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:rgba(255,255,255,.5);
  transition:all .12s;position:relative;
  flex-shrink:0;
}
.tb-btn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18);color:rgba(255,255,255,.85)}
.tb-btn i{font-size:15px}

/* ── Content ── */
.content{
  flex:1;padding:26px 28px;
  width:100%;
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
  overflow:clip;
  margin-bottom:18px;
  animation:fadeIn .2s var(--ease) both;
}

/* Page hero banners — drop shadow bridges dark→light transition */
.page-hero{filter:drop-shadow(0 6px 18px rgba(0,0,0,.22))}
.page-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:52px 52px;pointer-events:none;z-index:0}
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
.b-orange{background:var(--orange-lt);color:var(--orange-dk)}.b-orange::before{background:var(--orange)}

/* ────────────────────────────────────
   BUTTONS
   ──────────────────────────────────── */

/* ── Shine glint keyframe (primary buttons) ── */
@keyframes btn-glint{
  0%{background-position:-200% center}
  100%{background-position:200% center}
}
/* ── Shake warning keyframe (danger buttons) ── */
@keyframes btn-shake{
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-3px)}
  40%{transform:translateX(3px)}
  60%{transform:translateX(-2px)}
  80%{transform:translateX(2px)}
}
/* ── Bounce keyframe (WhatsApp button) ── */
@keyframes btn-bounce{
  0%,100%{transform:translateY(0)}
  40%{transform:translateY(-4px)}
  70%{transform:translateY(-2px)}
}
/* ── Count flash keyframe (qty numbers) ── */
@keyframes qty-flash{
  0%{transform:scale(1);color:var(--text)}
  50%{transform:scale(1.35);color:var(--blue)}
  100%{transform:scale(1);color:var(--text)}
}

.btn{
  padding:7px 16px;border-radius:var(--r);
  font-size:13px;font-weight:500;cursor:pointer;border:none;
  transition:all .14s var(--ease);
  font-family:var(--sans);
  display:inline-flex;align-items:center;gap:6px;
  white-space:nowrap;
  position:relative;overflow:hidden;
}
.btn:active{transform:scale(.98)}
.btn i{font-size:14px}

/* 1 · PRIMARY — Shine Glint */
.bp{
  background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;
  box-shadow:0 2px 8px rgba(37,99,235,.28);
}
.bp::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.28) 50%,transparent 60%);
  background-size:200% 100%;background-position:-200% center;
  transition:none;pointer-events:none;border-radius:inherit;
}
.bp:hover{background:linear-gradient(135deg,#1d4ed8,#1e40af);box-shadow:0 4px 14px rgba(37,99,235,.35);transform:translateY(-1px)}
.bp:hover::after{animation:btn-glint .55s ease forwards}
.bp:disabled{opacity:0.45;cursor:not-allowed;transform:none;box-shadow:none}
.bp:disabled::after{display:none}

/* 2 · OUTLINE — Subtle Lift */
.bo{
  background:var(--white);color:var(--text);
  border:1px solid var(--border2);
  box-shadow:0 1px 2px rgba(13,17,23,.04);
}
.bo:hover{
  border-color:var(--blue);color:var(--blue);background:var(--blue-lt);
  box-shadow:0 4px 12px rgba(37,99,235,.10);
  transform:translateY(-1px);
}

/* 3 · DANGER — Shake Warning */
.bd{background:var(--red-lt);color:var(--red-dk);border:1px solid #fca5a5}
.bd:hover{background:#fee2e2;animation:btn-shake .22s ease}

/* 4 · WHATSAPP — Bounce */
.bwa{background:#25D366;color:#fff;box-shadow:0 2px 8px rgba(37,211,102,.25)}
.bwa:hover{background:#20BA5A;animation:btn-bounce .38s ease}

.bsm{padding:5px 11px;font-size:12px}

/* 5 · ICON ACTION BUTTONS — Scale Pop (apply .bicon to 28×28 action buttons) */
.bicon{
  transition:transform .12s var(--ease),box-shadow .12s var(--ease),background .12s var(--ease);
}
.bicon:hover{transform:scale(1.18);box-shadow:0 2px 8px rgba(0,0,0,.12)}
.bicon:active{transform:scale(.94)}

/* 6 · STATUS PILLS — Sliding indicator handled inline via JS state */
/* The pill group uses .pill-group; active pill transitions handled by background/color */
.pill-group{position:relative;display:flex;gap:4px}
.pill-group button{transition:background .18s var(--ease),color .18s var(--ease),border-color .18s var(--ease),box-shadow .18s var(--ease)}

/* 7 · QTY COUNTER — Count Flash on the display span */
.qty-flash{animation:qty-flash .25s ease}

/* 8 · DARK HEADER SEMI-TRANSPARENT BUTTONS — Frost Deepen */
.bfrost{
  transition:background .16s var(--ease),backdrop-filter .16s var(--ease),box-shadow .16s var(--ease);
}
.bfrost:hover{
  background:rgba(255,255,255,.18) !important;
  box-shadow:0 0 0 1px rgba(255,255,255,.18),0 4px 16px rgba(0,0,0,.18);
}

/* 9 · TEXT / LINK BUTTONS — Underline Wipe */
.blink{
  position:relative;background:none;border:none;cursor:pointer;
  font-family:var(--sans);padding:0;
}
.blink::after{
  content:"";position:absolute;bottom:-1px;left:0;width:0;height:1.5px;
  background:currentColor;transition:width .2s var(--ease);
}
.blink:hover::after{width:100%}

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
.inp-error{border-color:var(--red)!important;background:var(--red-lt)!important;box-shadow:0 0 0 3px rgba(239,68,68,.1)!important}
.inp-valid{border-color:var(--green)!important}
.field-error-msg{font-size:11px;color:var(--red);margin-top:4px;display:flex;align-items:center;gap:4px}
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
  box-shadow:0 8px 40px rgba(99,102,241,.12),var(--sh3);
  animation:scaleIn .2s var(--ease) both;
  border:1px solid rgba(99,102,241,.2);
  border-top:3px solid #818cf8;
}
.modal-header{
  padding:16px 22px;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;
  background:rgba(255,255,255,.97);
  backdrop-filter:blur(8px);
  z-index:10;border-radius:0;
}
.modal-actions{
  padding:14px 22px;border-top:1px solid var(--border);
  display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;
  position:sticky;bottom:0;
  background:#f8fafc;
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
.inv-table tbody tr{transition:background .12s;cursor:pointer}
.inv-table tbody tr:hover td{background:rgba(37,99,235,.04)!important}
.inventory-table{width:100%;border-collapse:collapse}
.inventory-table th{padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);text-align:left;border-bottom:1px solid var(--border);white-space:nowrap}
.inventory-table td{padding:10px 14px;font-size:13px;border-bottom:0.5px solid var(--border)}
.inventory-table tbody tr{transition:background .12s;cursor:default}
.inventory-table tbody tr:hover td{background:rgba(37,99,235,.03)!important}
.inv-thead th{position:sticky;top:54px;z-index:49;background:var(--white);box-shadow:inset 0 -1px 0 var(--border)}
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
  padding:10px 4px 8px;cursor:pointer;color:#475569;flex:1;min-width:0;
  transition:color .12s;font-size:10px;
}
.mob-nav-item.active{color:var(--blue)}
.mob-nav-item i,.mob-nav-item svg{font-size:20px;width:20px;height:20px}
.mob-nav-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#475569}
.mob-nav-fab-slot{justify-content:flex-start;padding-top:0}
.mob-nav-fab{
  width:48px;height:48px;border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#818cf8);
  display:flex;align-items:center;justify-content:center;color:#fff;
  box-shadow:0 4px 14px rgba(99,102,241,.4);
  transform:translateY(-14px);
}

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
.empty-state-icon{margin-bottom:16px;opacity:0.25}
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
  /* ── Mobile agent leaderboard cards ── */
  /* ── Sprint 2: Modal, grid, and button fixes ── */
  /* Contact modal — full width on mobile */
  .contact-modal { max-width:calc(100vw - 16px)!important; margin:8px!important; }
  /* Invoice action buttons — stack to 1 column on mobile */
  .inv-action-grid { grid-template-columns:1fr!important; }
  /* Inventory table — hide Code column on mobile */
  .inventory-table thead th:nth-child(1),
  .inventory-table tbody td:nth-child(1) { display:none!important; }
  /* Contacts customer grid — 2 columns max */
  .cust-grid { grid-template-columns:1fr 1fr!important; }
  /* KPI strip on contacts/inventory pages */
  .kpi-strip { grid-template-columns:1fr 1fr!important; }
  /* Modals — ensure they fit on mobile screen */
  .modal { max-height:90vh!important; overflow-y:auto!important; }
  .modal-overlay { padding:8px!important; }
  /* Contact modal — full width centered */
  .contact-modal { border-radius:16px!important; width:calc(100vw - 16px)!important; }
  /* Purchase form — stack fields */
  .purchase-form-grid { grid-template-columns:1fr!important; }
  /* ── Sprint 1: Table mobile fixes ── */
  /* Stock Adj — hide non-essential columns */
  .tw table { min-width:unset!important; }
  .tw table td, .tw table th { font-size:11px!important; padding:7px 8px!important; }
  /* Banking — smaller transaction table */
  .bk-table td, .bk-table th { font-size:11px!important; padding:6px 8px!important; white-space:nowrap!important; }
  /* Delivery Notes list — hide driver/date on mobile */
  .dn-list-table thead th:nth-child(3),
  .dn-list-table thead th:nth-child(4),
  .dn-list-table tbody td:nth-child(3),
  .dn-list-table tbody td:nth-child(4) { display:none!important; }
  /* ── Sprint 3: Polish fixes ── */
  /* Settings company info — 1-col on mobile */
  .settings-info-grid { grid-template-columns:1fr!important; gap:10px!important; }
  /* Page section headers — smaller on mobile */
  .ph { font-size:14px!important; }
  .cs { font-size:11px!important; }
  /* Invoice filter tabs — allow wrap */
  .inv-tabs { flex-wrap:wrap!important; gap:4px!important; }
  /* Dashboard stat pills row — horizontal scroll if needed */
  .kpi-strip { overflow-x:auto!important; -webkit-overflow-scrolling:touch!important; }
  /* Action button groups — wrap on mobile */
  .quick-actions { flex-wrap:wrap!important; gap:6px!important; }
  .qa-btn { flex:1 1 auto!important; min-width:80px!important; justify-content:center!important; }

  /* ── Sprint 2: Contact modal + Inventory + Purchases ── */
  /* Contact modal — full width on mobile */
  .contact-modal { max-width: calc(100vw - 16px)!important; width: 100%!important; margin: 8px!important; }
  /* Contact modal KPI grid — 2×2 on mobile */
  .ct-modal-kpi { grid-template-columns:1fr 1fr!important; gap:8px!important; }
  /* Inventory table — hide Code and VAT on mobile */
  .inventory-table thead th:nth-child(1),
  .inventory-table tbody td:nth-child(1) { display:none!important; }
  .inventory-table thead th:nth-child(6),
  .inventory-table tbody td:nth-child(6) { display:none!important; }
  /* Purchases po-line — stack on mobile */
  .po-line { grid-template-columns:2fr 1fr 1fr 30px!important; }
  .po-line > *:nth-child(4) { display:none!important; }
  /* Contacts search bar — mobile fixes */
  .ct-hdr-search { display:none!important; }
  .ct-search-bar { flex-wrap:wrap!important; padding:8px 12px!important; gap:6px!important; }
  .ct-search-bar > div:first-child { max-width:100%!important; width:100%!important; order:1; }
  .ct-search-bar > div:nth-child(2) { order:2; flex-wrap:wrap!important; gap:4px!important; }
  .ct-search-bar > div:last-child { order:3; margin-left:0!important; }

  /* Contacts list — mobile card layout */
  .ct-list-header { display:none!important; }
  .ct-list-row { grid-template-columns:1fr auto!important; gap:8px!important; padding:10px 12px!important; }
  /* Show: col1 (customer name+avatar) and col4 (status badge) only */
  .ct-list-row > div:nth-child(2),
  .ct-list-row > div:nth-child(3),
  .ct-list-row > div:nth-child(5),
  .ct-list-row > div:nth-child(6),
  .ct-list-row > div:nth-child(7) { display:none!important; }
  .ct-list-row > div:nth-child(4) { display:flex!important; align-items:center!important; justify-content:flex-end!important; }

  /* Stock Adj table — hide Category on mobile */
  .sa-table thead th:nth-child(2),
  .sa-table tbody td:nth-child(2) { display:none!important; }
  /* Agent Report table — hide Date on mobile, keep Amount + Status */
  .ar-table thead th:nth-child(3),
  .ar-table tbody td:nth-child(3) { display:none!important; }
  /* Credits table — hide Date and Reason on mobile, keep Amount + Status */
  .cr-table thead th:nth-child(3),
  .cr-table thead th:nth-child(5),
  .cr-table tbody td:nth-child(3),
  .cr-table tbody td:nth-child(5) { display:none!important; }
  .lb-thead { display:none!important; }
  .lb-tr { display:flex!important; align-items:center!important; padding:12px 14px!important; border-bottom:1px solid var(--border)!important; background:var(--white)!important; gap:10px!important; width:100%!important; }
  .lb-tr td { display:none!important; padding:0!important; border:none!important; }
  .lb-tr td:nth-child(1) { display:flex!important; align-items:center!important; justify-content:center!important; flex-shrink:0!important; width:30px!important; }
  .lb-tr td:nth-child(2) { display:flex!important; align-items:center!important; flex:1!important; min-width:0!important; }
  .lb-tr td:nth-child(2) > div > div:first-child { display:none!important; }
  .lb-tr td:nth-child(2) > div > div:nth-child(2) > div:nth-child(2) { display:none!important; }
  .lb-tr td:nth-child(4) { display:block!important; flex-shrink:0!important; font-size:14px!important; font-weight:700!important; text-align:right!important; white-space:nowrap!important; }
  .lb-tr td:nth-child(6) { display:none!important; }

  /* ── Mobile invoice card rows — CSS only ── */
  .inv-thead th { display:none!important; }
  .inv-tr td { display:none!important; padding:0!important; border:none!important; vertical-align:middle!important; }
  .inv-tr { display:flex!important; align-items:center!important; padding:12px 14px!important; border-bottom:1px solid var(--border)!important; background:var(--white)!important; cursor:pointer!important; gap:8px!important; width:100%!important; }
  /* td3 = customer name — takes up remaining space */
  .inv-tr td:nth-child(3) { display:flex!important; flex-direction:column!important; justify-content:center!important; flex:1!important; min-width:0!important; min-height:40px!important; }
  .inv-tr td:nth-child(3) > div { display:flex!important; align-items:center!important; gap:6px!important; width:100%!important; }
  .inv-tr td:nth-child(3) > div > div:first-child { display:none!important; }
  /* Customer name text div */
  .inv-tr td:nth-child(3) > div > div:nth-child(2) > div:first-child { display:block!important; font-size:13px!important; font-weight:600!important; color:var(--text)!important; overflow:hidden!important; text-overflow:ellipsis!important; white-space:nowrap!important; }
  /* Hide email */
  .inv-tr td:nth-child(3) > div > div:nth-child(2) > div:nth-child(2) { display:none!important; }
  /* td6 = amount — right side */
  .inv-tr td:nth-child(6) { display:block!important; flex-shrink:0!important; font-size:14px!important; font-weight:700!important; text-align:right!important; }
  .inv-tr td:nth-child(6) .mono { font-size:14px!important; font-weight:700!important; }
  /* Hide partial bar on mobile */
  .inv-tr td:nth-child(6) > div > div:nth-child(2) { display:none!important; }
  /* td7 = status badge */
  .inv-tr td:nth-child(7) { display:block!important; flex-shrink:0!important; }
  /* table full width */
  .tw table { min-width:unset!important; width:100%!important; }
  .inv-thead { display:none!important; }
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

/* ═══════════════════════════════════════════════════
   MOBILE BLOCKER FIXES — v1.8
   SCOPE: @media only — zero impact on desktop (769px+)
   ═══════════════════════════════════════════════════ */

/* BLOCKER 1 — Tablet nav dead zone (769px–1023px)
   iPad Air / Galaxy Tab S9 had zero navigation.
   Show sidebar on tablets, hide mob nav. */
@media(min-width:769px) and (max-width:1023px){
  .sidebar{display:flex!important;flex-direction:column;width:200px;flex-shrink:0}
  .mob-nav{display:none!important}
  .content{margin-left:0}
}

/* BLOCKER 2 — KPI strip clips on small phones (≤390px)
   4th KPI card was invisible on iPhone SE.
   Wrap to 2×2 grid. */
@media(max-width:768px){
  /* ── KPI strip — mobile 2×2 premium cards ── */
  .kpi-strip{
    grid-template-columns:1fr 1fr!important;
    gap:0!important;
    border-radius:16px!important;
    overflow:hidden!important;
    border:1px solid rgba(255,255,255,.1)!important;
    box-shadow:0 4px 24px rgba(0,0,0,.25)!important;
  }
  .kpi-strip > div{
    border-radius:0!important;
    border:none!important;
    border-right:1px solid rgba(255,255,255,.08)!important;
    border-bottom:1px solid rgba(255,255,255,.08)!important;
    padding:16px 14px!important;
    min-height:90px!important;
    position:relative!important;
    overflow:hidden!important;
  }
  .kpi-strip > div:nth-child(2){ border-right:none!important; }
  .kpi-strip > div:nth-child(3){ border-bottom:none!important; }
  .kpi-strip > div:nth-child(4){ border-right:none!important; border-bottom:none!important; }
  .kpi-strip > div > div:first-child{
    font-size:9px!important;
    letter-spacing:.8px!important;
    margin-bottom:6px!important;
  }
  .kpi-strip > div > div:nth-child(2){
    font-size:20px!important;
    font-weight:800!important;
    letter-spacing:-.5px!important;
    margin-bottom:4px!important;
  }
  .kpi-strip > div > div:nth-child(3){
    font-size:10px!important;
    line-height:1.3!important;
  }
  /* Mobile invoice form — customer search visibility fix */
  .mob-customer-search input{
    height:48px!important;
    font-size:15px!important;
    border:2px solid var(--blue)!important;
    border-radius:10px!important;
    padding:0 40px 0 14px!important;
    background:var(--white)!important;
  }
  .mob-customer-search input:focus{
    border-color:var(--blue)!important;
    box-shadow:0 0 0 3px rgba(37,99,235,.15)!important;
  }
}

/* BLOCKER 3 — Touch targets below 44px minimum
   All interactive elements on mobile need min 44px height/width.
   Covers filter pills, tabs, search input, buttons. */
@media(max-width:768px){
  /* Search input */
  input[type="text"],input[type="search"],input[type="email"],
  input[type="password"],input[type="number"],select,textarea{
    min-height:44px!important;
    font-size:16px!important; /* prevents iOS zoom on focus */
    padding-top:10px!important;
    padding-bottom:10px!important;
  }
  /* Filter tabs and pills */
  .tab, [class*="filter-pill"], [class*="fpill"],
  .ar2-tab, .ar2-group, .opt-c-tab, .opt-c-group-btn{
    min-height:44px!important;
    display:inline-flex!important;
    align-items:center!important;
  }
  /* All buttons */
  button:not(.act-btn):not(.mob-nav-item):not(.signout-btn){
    min-height:44px!important;
  }
  /* Checkbox wrapper — make tap zone bigger */
  input[type="checkbox"]{
    width:20px!important;
    height:20px!important;
    cursor:pointer;
  }
  /* KPI cards — make them tappable */
  .kpi{min-height:80px!important;padding:14px!important}
  .kpi-val{font-size:20px!important;letter-spacing:-.5px!important}
  .kpi-label{font-size:11px!important}
  .kpi-icon{width:32px!important;height:32px!important}
  .kgrid{grid-template-columns:1fr 1fr!important;gap:10px!important}
  /* Stat pills — 2 col on mobile */
  .stat-pills-grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
  /* Invoice filter tab row */
  .il-line button, [class*="tab"] button{min-height:44px!important}
  /* Dashboard header — hide quick action buttons on mobile, show below */
  .dash-quick-actions{flex-wrap:wrap!important;gap:6px!important}
  .dash-quick-actions button{padding:8px 12px!important;font-size:12px!important;min-height:40px!important;flex:1!important;justify-content:center!important}
  /* Dashboard greeting smaller on mobile */
  .dash-greeting{font-size:16px!important}
  /* Stat pills label smaller */
  .stat-pills-grid > div > div > div:first-child{font-size:10px!important}
  .stat-pills-grid > div > div > div:nth-child(2){font-size:14px!important}
}

/* BLOCKER 4 — Table overflow on mobile
   Tables extending past viewport. Force contained scroll. */
@media(max-width:768px){
  .tw{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;max-width:100vw!important}
  table{min-width:unset!important}
  /* Hide non-essential columns on very small screens */
  .col-hide-mobile{display:none!important}
}

/* BLOCKER 5 — Ultra-wide screens (2560px+)
   Content was stretching to fill full 3440px.
   Max-width constraint on the layout. */
@media(min-width:2560px){
  .app-root, [class*="app-wrap"], body > div:first-child{
    max-width:1800px;
    margin:0 auto;
  }
}

/* HIGH — Mobile invoice rows: show amount + status without tapping */
@media(max-width:768px){
  /* Make invoice table rows show key data */
  td.mono{font-size:13px!important;font-weight:600!important}
  /* Status badges always visible */
  .badge{display:inline-flex!important}
  /* Mob nav More drawer — increase item size */
  .mob-more-item{min-height:60px!important;font-size:12px!important}
  /* Hide desktop-only invoice columns on mobile */
  .hm-actions{display:none!important}
  /* Make invoice table full width on mobile */
  .tw table{min-width:unset!important;width:100%!important;}
  .inv-thead{display:none!important;}
}

/* HIGH — Bottom nav improvements on small phones */
@media(max-width:375px){
  .mob-nav-lbl{font-size:8px!important;letter-spacing:0!important}
  .mob-nav-item{padding:8px 2px 6px!important}
}

/* MEDIUM — Modal safe area on iPhone notch */
@media(max-width:768px){
  .modal-overlay{
    padding-bottom:max(16px, env(safe-area-inset-bottom))!important;
  }
  .modal{
    margin-bottom:env(safe-area-inset-bottom,0px)!important;
  }
  /* Mob nav safe area */
  .mob-nav{
    padding-bottom:max(8px, env(safe-area-inset-bottom))!important;
  }
}

/* ═══════════════════════════════════════════════════
   END MOBILE BLOCKER FIXES v1.8
   ═══════════════════════════════════════════════════ */

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
      <div style={{ background: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 8px 40px rgba(99,102,241,.12),var(--sh3)", overflow: "hidden", border: "1px solid rgba(99,102,241,.2)", borderTop: "3px solid #818cf8", animation: "scaleIn .15s var(--ease)" }}>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
  const S = { fill:"none", stroke:"var(--text3)", strokeWidth:1.5, strokeLinecap:"round", strokeLinejoin:"round" };
  const icons = {
    invoice:  <svg width="52" height="52" viewBox="0 0 24 24" {...S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    customer: <svg width="52" height="52" viewBox="0 0 24 24" {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    product:  <svg width="52" height="52" viewBox="0 0 24 24" {...S}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    delivery: <svg width="52" height="52" viewBox="0 0 24 24" {...S}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    report:   <svg width="52" height="52" viewBox="0 0 24 24" {...S}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    stock:    <svg width="52" height="52" viewBox="0 0 24 24" {...S}><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>,
    search:   <svg width="52" height="52" viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    activity: <svg width="52" height="52" viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>,
    default:  <svg width="52" height="52" viewBox="0 0 24 24" {...S}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  };
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icons[icon] || icons.default}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-sub">{sub}</div>
      {action && <button className="btn bp" onClick={action}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{actionLabel || "Get started"}</button>}
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
            {!step.done && step.page && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
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
function Auth({ onAuth, sessionExpired }) {
  const [mode, setMode] = useState("signin");
  const [f, setF] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(sessionExpired ? "Your session has expired — please sign in again." : "");
  const [showPw, setShowPw] = useState(false);
  const [mfaStep, setMfaStep] = useState("none"); // "none" | "enroll" | "verify"
  const [mfaCode, setMfaCode] = useState("");
  const [mfaErr, setMfaErr] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaQr, setMfaQr] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaSession, setMfaSession] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(() => {
    const hash = window.location.hash;
    return hash.includes("type=recovery");
  });
  const [recoveryToken] = useState(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.replace("#","?"));
      const token = params.get("access_token");
      if (token) window.history.replaceState(null,"",window.location.pathname);
      return token || "";
    }
    return "";
  });
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const submitNewPassword = async () => {
    if (newPw.length < 12) { setErr("Password must be at least 12 characters."); return; }
    if (!/[0-9]/.test(newPw)) { setErr("Password must contain at least one number."); return; }
    if (!/[^A-Za-z0-9]/.test(newPw)) { setErr("Password must contain at least one special character."); return; }
    if (newPw !== confirmPw) { setErr("Passwords do not match."); return; }
    setLoading(true);
    const res = await sb.updatePassword(recoveryToken, newPw);
    if (res.id || res.email) { setErr("✓ Password updated — you can now sign in."); setRecoveryMode(false); setNewPw(""); setConfirmPw(""); }
    else { setErr("Failed — the reset link may have expired. Request a new one."); }
    setLoading(false);
  };

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
        // ── MFA check ──
        let factors = [];
        try { const ur = await sb.mfaGetUser(d.access_token); factors = Array.isArray(ur.factors) ? ur.factors : []; } catch {}
        const verifiedTotp = factors.find(f => f.factor_type === "totp" && f.status === "verified");
        if (verifiedTotp) {
          // User has verified MFA → challenge them
          const ch = await sb.mfaChallenge(d.access_token, verifiedTotp.id);
          if (!ch.id) { setErr("MFA challenge failed. Please try again."); setLoading(false); return; }
          setMfaSession(d);
          setMfaFactorId(verifiedTotp.id);
          setMfaChallengeId(ch.id);
          setMfaStep("verify");
          setLoading(false);
          return;
        } else {
          // No verified MFA → delete any pending unverified factors then force fresh enrollment
          const unverified = factors.filter(f => f.factor_type === "totp" && f.status === "unverified");
          await Promise.all(unverified.map(f => sb.mfaUnenroll(d.access_token, f.id)));
          const enroll = await sb.mfaEnroll(d.access_token);
          if (!enroll.id) { setErr("MFA setup failed. Please try again."); setLoading(false); return; }
          setMfaSession(d);
          setMfaFactorId(enroll.id);
          setMfaQr(enroll.totp?.qr_code || "");
          setMfaSecret(enroll.totp?.secret || "");
          setMfaStep("enroll");
          setLoading(false);
          return;
        }
        // (unreachable — kept for structure)
        logAudit(d.access_token, d.user.id, "user_login", "user", d.user.id, `${d.user.email} signed in`);
        if (d.refresh_token) localStorage.setItem('ledgeros_rt', d.refresh_token);
        onAuth({ token: d.access_token, user: d.user });
      } else {
        setErr(d.msg || d.error_description || "Authentication failed.");
      }
    } catch { setErr("Network error. Please try again."); }
    setLoading(false);
  };

  const sendReset = async () => {
    if (!f.email) { setErr("Enter your email address first."); return; }
    setLoading(true);
    await sb.resetPassword(f.email);
    setErr("✓ Reset email sent — check your inbox.");
    setLoading(false);
  };

  const verifyMfa = async () => {
    const code = mfaCode.replace(/\s/g, "");
    if (code.length !== 6 || !/^\d+$/.test(code)) { setMfaErr("Enter the 6-digit code from your authenticator app."); return; }
    setMfaLoading(true); setMfaErr("");
    const res = await sb.mfaVerify(mfaSession.access_token, mfaFactorId, mfaChallengeId, code);
    if (res.access_token) {
      const d = res;
      logAudit(d.access_token, mfaSession.user.id, "user_login", "user", mfaSession.user.id, `${mfaSession.user.email} signed in (MFA)`);
      if (d.refresh_token) localStorage.setItem('ledgeros_rt', d.refresh_token);
      onAuth({ token: d.access_token, user: mfaSession.user });
    } else {
      setMfaErr("Incorrect code — please try again.");
      // Create a new challenge for the next attempt
      try {
        const ch = await sb.mfaChallenge(mfaSession.access_token, mfaFactorId);
        if (ch.id) setMfaChallengeId(ch.id);
      } catch {}
    }
    setMfaCode("");
    setMfaLoading(false);
  };

  const confirmEnrollment = async () => {
    const code = mfaCode.replace(/\s/g, "");
    if (code.length !== 6 || !/^\d+$/.test(code)) { setMfaErr("Enter the 6-digit code shown in your authenticator app."); return; }
    setMfaLoading(true); setMfaErr("");
    // Create challenge for the unverified factor
    const ch = await sb.mfaChallenge(mfaSession.access_token, mfaFactorId);
    if (!ch.id) { setMfaErr("Challenge failed. Please reload and try again."); setMfaLoading(false); return; }
    const res = await sb.mfaVerify(mfaSession.access_token, mfaFactorId, ch.id, code);
    if (res.access_token) {
      const d = res;
      logAudit(d.access_token, mfaSession.user.id, "user_login", "user", mfaSession.user.id, `${mfaSession.user.email} signed in (MFA enrolled)`);
      if (d.refresh_token) localStorage.setItem('ledgeros_rt', d.refresh_token);
      onAuth({ token: d.access_token, user: mfaSession.user });
    } else {
      setMfaErr("Incorrect code — scan the QR code again and enter the 6-digit number.");
    }
    setMfaCode("");
    setMfaLoading(false);
  };

  const mob = isMobile();
  const isSuccess = err.startsWith("✓");

  if (recoveryMode) return (
    <div style={{ minHeight:"100vh",background:"#f4f6f9",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:"#fff",borderRadius:16,padding:32,maxWidth:400,width:"100%",boxShadow:"0 4px 24px rgba(0,0,0,.08)" }}>
        <div style={{ width:44,height:44,background:"#1e1b4b",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none"><rect x="10" y="13" width="28" height="3" rx="1.5" fill="#818cf8"/><rect x="10" y="20" width="20" height="3" rx="1.5" fill="#818cf8" fillOpacity=".6"/><rect x="30" y="21" width="2.5" height="12" rx="1.25" fill="#60a5fa"/><polygon points="36,26 30,21 30,33" fill="#60a5fa" fillOpacity=".4"/></svg>
        </div>
        <div style={{ fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:4 }}>Set New Password</div>
        <div style={{ fontSize:13,color:"#64748b",marginBottom:24 }}>Choose a new password for your account.</div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <input type="password" placeholder="New password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{ padding:"10px 14px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,outline:"none",color:"#0f172a" }} />
          <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} style={{ padding:"10px 14px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,outline:"none",color:"#0f172a" }} onKeyDown={e=>e.key==="Enter"&&submitNewPassword()} />
          {err && <div style={{ fontSize:13,color:err.startsWith("✓")?"#16a34a":"#dc2626",padding:"8px 12px",background:err.startsWith("✓")?"#f0fdf4":"#fef2f2",borderRadius:6 }}>{err}</div>}
          <button onClick={submitNewPassword} disabled={loading} style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:14,fontWeight:600,cursor:"pointer" }}>{loading?"Updating...":"Set New Password"}</button>
        </div>
      </div>
    </div>
  );

  // ── MFA screens ──
  const MfaCard = ({ title, subtitle, children }) => (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:"#fff",borderRadius:20,padding:"40px 36px",maxWidth:420,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:28 }}>
          <div style={{ width:44,height:44,background:"linear-gradient(135deg,#1e1b4b,#2d1f6e)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1" fill="#818cf8"/></svg>
          </div>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:"#0f172a",lineHeight:1.2 }}>{title}</div>
            <div style={{ fontSize:13,color:"#64748b",marginTop:2 }}>{subtitle}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (mfaStep === "verify") return (
    <MfaCard title="Two-Factor Authentication" subtitle="Enter the 6-digit code from your authenticator app.">
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          maxLength={7}
          placeholder="000 000"
          value={mfaCode}
          onChange={e=>setMfaCode(e.target.value.replace(/[^\d\s]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&verifyMfa()}
          style={{ padding:"14px",border:"2px solid #e2e8f0",borderRadius:10,fontSize:28,fontWeight:700,letterSpacing:8,textAlign:"center",outline:"none",color:"#0f172a",fontVariantNumeric:"tabular-nums" }}
        />
        {mfaErr && <div style={{ fontSize:13,color:"#dc2626",padding:"8px 12px",background:"#fef2f2",borderRadius:6,textAlign:"center" }}>{mfaErr}</div>}
        <button onClick={verifyMfa} disabled={mfaLoading} style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",transition:"opacity .15s",opacity:mfaLoading?.7:1 }}>
          {mfaLoading ? "Verifying…" : "Verify & Sign In"}
        </button>
        <button onClick={()=>{setMfaStep("none");setMfaCode("");setMfaErr("");}} className="blink" style={{ color:"#64748b",fontSize:13 }}>
          ← Back to sign in
        </button>
      </div>
    </MfaCard>
  );

  if (mfaStep === "enroll") return (
    <MfaCard title="Set Up Two-Factor Auth" subtitle="Scan the QR code with Google Authenticator, Authy, or any TOTP app.">
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {mfaQr ? (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"16px",background:"#f8fafc",borderRadius:12,border:"1px solid #e2e8f0" }}>
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(mfaQr)}`} alt="MFA QR Code" width={180} height={180} style={{ borderRadius:8,display:"block" }} />
            {mfaSecret && (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:11,color:"#94a3b8",marginBottom:4 }}>Or enter manually:</div>
                <div style={{ fontSize:13,fontWeight:700,color:"#0f172a",letterSpacing:2,fontFamily:"monospace",background:"#e2e8f0",padding:"4px 10px",borderRadius:6 }}>{mfaSecret}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign:"center",padding:20,color:"#64748b" }}>Loading QR code…</div>
        )}
        <div style={{ fontSize:13,color:"#475569",padding:"10px 14px",background:"#f1f5f9",borderRadius:8 }}>
          Once scanned, enter the 6-digit code below to confirm setup.
        </div>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          maxLength={7}
          placeholder="000 000"
          value={mfaCode}
          onChange={e=>setMfaCode(e.target.value.replace(/[^\d\s]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&confirmEnrollment()}
          style={{ padding:"14px",border:"2px solid #e2e8f0",borderRadius:10,fontSize:28,fontWeight:700,letterSpacing:8,textAlign:"center",outline:"none",color:"#0f172a",fontVariantNumeric:"tabular-nums" }}
        />
        {mfaErr && <div style={{ fontSize:13,color:"#dc2626",padding:"8px 12px",background:"#fef2f2",borderRadius:6,textAlign:"center" }}>{mfaErr}</div>}
        <button onClick={confirmEnrollment} disabled={mfaLoading} style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",opacity:mfaLoading?.7:1 }}>
          {mfaLoading ? "Confirming…" : "Confirm & Activate MFA"}
        </button>
        <button onClick={()=>{setMfaStep("none");setMfaCode("");setMfaErr("");}} className="blink" style={{ color:"#64748b",fontSize:13 }}>
          ← Back to sign in
        </button>
      </div>
    </MfaCard>
  );

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
        <div style={{ width: 500, minWidth: 500, background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 45%,#2d1f6e 100%)", display: "flex", flexDirection: "column", padding: "52px 56px", position: "relative", overflow: "hidden", justifyContent: "space-between" }}>
          {/* Grid overlay */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          {/* Orb top-left */}
          <div style={{ position: "absolute", top: -120, left: -120, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.28) 0%,transparent 65%)", pointerEvents: "none" }} />
          {/* Orb bottom-right */}
          <div style={{ position: "absolute", bottom: -80, right: -60, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.2) 0%,transparent 65%)", pointerEvents: "none" }} />

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1 }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: "linear-gradient(145deg,#1e1b4b,#2d2a6e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 20px rgba(99,102,241,.35),inset 0 1px 0 rgba(255,255,255,.08)" }}>
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                <rect x="9" y="12" width="30" height="3.5" rx="1.75" fill="#818cf8"/>
                <rect x="9" y="19.5" width="22" height="3.5" rx="1.75" fill="#818cf8" fillOpacity=".58"/>
                <rect x="9" y="27" width="26" height="3.5" rx="1.75" fill="#818cf8" fillOpacity=".32"/>
                <rect x="9" y="34.5" width="15" height="3.5" rx="1.75" fill="#818cf8" fillOpacity=".16"/>
                <rect x="31" y="20" width="3" height="16" rx="1.5" fill="url(#lgGrad)"/>
                <polygon points="38,28 31,20 31,36" fill="#60a5fa" fillOpacity=".45"/>
                <defs><linearGradient id="lgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#818cf8"/></linearGradient></defs>
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-.6px", lineHeight: 1 }}>Ledger</span>
                <span style={{ fontSize: 20, fontWeight: 300, color: "rgba(255,255,255,.38)", letterSpacing: "-.3px", lineHeight: 1 }}>OS</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.22)", letterSpacing: ".4px", marginTop: 2 }}>Arkham Retail Ltd</div>
            </div>
          </div>

          {/* Hero */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 0 32px", position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(167,139,250,.85)", marginBottom: 20 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />
              Business Finance Platform
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 1.04, marginBottom: 20 }}>
              Run every<br />invoice.<br />Know every<br /><span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>number.</span>
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,.38)", lineHeight: 1.75, maxWidth: 320 }}>
              Purpose-built for Arkham Retail. VAT invoices, inventory, delivery notes and real-time analytics — all in one platform.
            </div>
            {/* Feature pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 32 }}>
              {[
                { label: "VAT Invoices", svg: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
                { label: "Inventory", svg: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
                { label: "Analytics", svg: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
                { label: "Delivery Notes", svg: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
              ].map(p => (
                <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "7px 14px", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,.55)" }}>
                  {p.svg}{p.label}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.18)", lineHeight: 1.7, position: "relative", zIndex: 1 }}>
            © 2026 Arkham Retail Ltd
          </div>
        </div>
      )}

      {/* ── MOBILE TOP PANEL ── */}
      {mob && (
        <div style={{ background: "linear-gradient(160deg,#0f172a 0%,#1e1b4b 50%,#2d1f6e 100%)", padding: "28px 24px 36px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: -80, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(145deg,#1e1b4b,#2d2a6e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(99,102,241,.3)" }}>
                <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                  <rect x="9" y="12" width="30" height="3.5" rx="1.75" fill="#818cf8"/>
                  <rect x="9" y="19.5" width="22" height="3.5" rx="1.75" fill="#818cf8" fillOpacity=".58"/>
                  <rect x="9" y="27" width="26" height="3.5" rx="1.75" fill="#818cf8" fillOpacity=".32"/>
                  <rect x="31" y="20" width="3" height="16" rx="1.5" fill="url(#mgGrad)"/>
                  <polygon points="38,28 31,20 31,36" fill="#60a5fa" fillOpacity=".45"/>
                  <defs><linearGradient id="mgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#818cf8"/></linearGradient></defs>
                </svg>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-.5px", lineHeight: 1 }}>Ledger</span>
                  <span style={{ fontSize: 17, fontWeight: 300, color: "rgba(255,255,255,.35)", letterSpacing: "-.3px", lineHeight: 1 }}>OS</span>
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,.2)", letterSpacing: ".3px", marginTop: 2 }}>Arkham Retail Ltd</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "4px 10px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".5px" }}>Live</span>
            </div>
          </div>
          {/* Headline */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 8 }}>
              Run every invoice.<br /><span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Know every number.</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", lineHeight: 1.6 }}>Purpose-built for Arkham Retail.</div>
          </div>
        </div>
      )}

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: "flex", alignItems: mob ? "flex-start" : "center", justifyContent: "center", padding: mob ? "28px 24px 40px" : "48px 52px", background: "#fff", minHeight: mob ? "auto" : "auto" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>

          {/* Mobile logo — hidden, rendered in mobile top panel instead */}

          {/* Form header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>Secure access</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0d1117", letterSpacing: "-.7px", marginBottom: 7, lineHeight: 1.15 }}>
              {mode === "signin" ? "Welcome back" : "Request access"}
            </div>
            <div style={{ fontSize: 13, color: "#5c677d", lineHeight: 1.55 }}>
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
                <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa5b4", pointerEvents: "none", display: "flex" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input style={{ width: "100%", padding: "11px 14px 11px 38px", background: "#f8fafd", border: "1.5px solid #e5e9f0", borderRadius: 10, fontSize: 14, color: "#0d1117", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box", transition: "border .15s,box-shadow .15s" }} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="Jane Smith" onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; e.target.style.background="#fff"; }} onBlur={e => { e.target.style.borderColor="#e5e9f0"; e.target.style.boxShadow="none"; e.target.style.background="#f8fafd"; }} />
              </div>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Email address</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa5b4", pointerEvents: "none", display: "flex" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
              <input type="email" style={{ width: "100%", padding: "11px 14px 11px 38px", background: "#f8fafd", border: "1.5px solid #e5e9f0", borderRadius: 10, fontSize: 14, color: "#0d1117", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box", transition: "border .15s,box-shadow .15s" }} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="you@arkhamretail.com" onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; e.target.style.background="#fff"; }} onBlur={e => { e.target.style.borderColor="#e5e9f0"; e.target.style.boxShadow="none"; e.target.style.background="#f8fafd"; }} />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Password</label>
              {mode === "signin" && <button onClick={sendReset} className="blink" style={{ fontSize: 12, color: "#2563eb", fontWeight: 500, fontFamily: "var(--sans)" }}>Forgot password?</button>}
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa5b4", pointerEvents: "none", display: "flex" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
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

          {/* Forgot password */}
          {mode === "signin" && (
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <span style={{ color: "#2563eb", cursor: "pointer", fontSize: 13 }} onClick={sendReset}>Forgot password?</span>
            </div>
          )}

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
function InvoiceModal({ invoice, onClose, contacts = [], onStatusChange, onDuplicate, onEdit, onPartPay, onLogPartPay, token, profile }) {
  const [showWaInput, setShowWaInput] = useState(false);
  const [waNumber, setWaNumber] = useState("");
  const [activeTab, setActiveTab] = useState("invoice");
  const [partPayAmount, setPartPayAmount] = useState("");
  const [partPayMethod, setPartPayMethod] = useState("cash");
  const [partPayDate, setPartPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [partPayLoading, setPartPayLoading] = useState(false);
  const [partPayMsg, setPartPayMsg] = useState("");
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsRefresh, setPaymentsRefresh] = useState(0);

  const refreshPayments = () => setPaymentsRefresh(n => n + 1);

  React.useEffect(() => {
    if (invoice?.id && token) {
      setPaymentsLoading(true);
      sb.getPayments(token, invoice.id)
        .then(d => setPayments(Array.isArray(d) ? d : []))
        .catch(() => setPayments([]))
        .finally(() => setPaymentsLoading(false));
    }
  }, [activeTab, invoice?.id, paymentsRefresh]);

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
  const handlePrint = async () => {
    const invLines = lines;
    const sub = subtotal, vat = vatTotal, tot = total;
    const bal = invoice.balance > 0 && invoice.balance < tot ? invoice.balance : tot;
    let paymentsHtml = "";
    if (payments.length > 0) {
      const totalPaid = payments.reduce((s,p)=>s+parseFloat(p.amount||0),0);
      const rows = payments.map(p => { const d=p.created_at||p.payment_date; const ds=d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—"; const m=p.method==="cash"?"Cash":p.method==="bank"?"Bank":p.method==="card"?"Card":"Cheque"; const amt="£"+parseFloat(p.amount||0).toFixed(2); return '<div style="display:flex;justify-content:space-between;padding:7px 12px;border-bottom:.5px solid #f1f5f9;font-size:11px"><span style="color:#64748b">'+ds+'</span><span style="color:#64748b">'+m+'</span><span style="font-weight:700;color:#16a34a">-'+amt+'</span></div>'; }).join("");
      const totalRow = '<div style="display:flex;justify-content:space-between;padding:7px 12px;background:#f0fdf4;border-top:.5px solid #bbf7d0;font-size:11px;font-weight:700;color:#15803d"><span>Total paid</span><span>£'+totalPaid.toFixed(2)+'</span></div>';
      paymentsHtml = '<div style="border:.5px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:14px;width:260px;margin-left:auto"><div style="background:#f8fafc;padding:7px 12px;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;border-bottom:.5px solid #e2e8f0">Payments Received</div>'+rows+totalRow+'</div>';
    }
    const contactRecord = contacts.find(c => c.name === invoice.customer);
    const totalOutstanding = parseFloat(contactRecord?.total_outstanding || 0);
    let overdueInvs = [];
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/invoices?customer=eq.${encodeURIComponent(invoice.customer)}&status=in.(overdue,pending,partial)&order=invoice_date.asc&select=invoice_number,invoice_date,amount,amount_paid,balance,status`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) overdueInvs = data.filter(i => i.invoice_number !== invoice.invoice_number);
    } catch(e) { overdueInvs = []; }
    const fmtV = v => '£' + parseFloat(v||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    const badgeMap = { overdue: '<span class="overdue-badge">Overdue</span>', partial: '<span class="partial-badge">Partial</span>', pending: '<span class="pending-badge">Pending</span>' };
    const overdueSection = (overdueInvs.length > 0 || totalOutstanding > 0) ? `
      <div class="os-section">
        <div class="os-hdr">
          <div class="os-lbl">Outstanding account balance</div>
          <div class="os-total">${fmtV(totalOutstanding)} outstanding</div>
        </div>
        <table class="os-table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Balance</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>${overdueInvs.map(i => `<tr><td style="font-weight:600">${i.invoice_number}</td><td>${fmtD(i.invoice_date)}</td><td>${fmtV(i.amount)}</td><td style="font-weight:700;color:#dc2626">${fmtV(i.balance)}</td><td>${daysSince(i.invoice_date)}d</td><td>${badgeMap[i.status]||i.status}</td></tr>`).join('')}</tbody>
        </table>
        <div class="os-notice">⚠ This account has outstanding balances. Payment is required before further credit can be extended. Goods remain the property of Arkham Retail Ltd until all invoices are paid in full.</div>
      </div>` : '';
    const html = `<!DOCTYPE html><html><head><title>${escHtml(invoice.invoice_number)}</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;padding:30mm 20mm 20mm;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent-bar{height:5px;background:linear-gradient(90deg,#1e1b4b 0%,#4f46e5 60%,#818cf8 100%);margin:-30mm -20mm 0}.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 0 20px;border-bottom:.5px solid #e2e8f0;margin-bottom:20px}.logo-wrap{display:flex;align-items:center;gap:14px;flex:1;min-width:0}.logo-box{width:48px;height:48px;background:#1e1b4b;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.co-name{font-size:15px;font-weight:700;color:#0f172a}.co-det{font-size:10.5px;color:#64748b;line-height:1.6;margin-top:2px;word-break:break-word}.inv-title{font-size:28px;font-weight:900;color:#e2e8f0;letter-spacing:-1.5px;text-align:right;line-height:1}.inv-num{font-size:16px;font-weight:800;text-align:right;color:#0f172a;margin-top:2px}.inv-status{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;background:#fef3c7;color:#92400e;border:.5px solid #fcd34d}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.meta-dk{background:#1e1b4b;border-radius:8px;padding:14px 16px}.meta-dk .lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}.meta-dk .val{font-size:18px;font-weight:700;color:#fff;line-height:1.2}.meta-dk .sub{font-size:11px;color:rgba(255,255,255,.5);margin-top:4px}.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mbox{background:#f8fafc;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 12px}.mbox .lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.mbox .val{font-size:12px;font-weight:600;color:#0f172a}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#1e1b4b}th{padding:9px 12px;font-size:9px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;text-align:left}th:first-child{border-radius:6px 0 0 6px}th:last-child{border-radius:0 6px 6px 0;text-align:right}td{padding:11px 12px;border-bottom:.5px solid #f1f5f9;font-size:12px}tr:last-child td{border-bottom:none}td:last-child{text-align:right;font-weight:600}.totals{width:260px;margin-left:auto;margin-bottom:20px}.tr{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#64748b}.tr span:last-child{color:#0f172a}.tt{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;border-top:.5px solid #e2e8f0;margin-top:4px}.bb{background:#1e1b4b;border-radius:8px;padding:12px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center}.bb-l{color:rgba(255,255,255,.5);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}.bb-v{color:#fff;font-size:18px;font-weight:800}.nb{background:#fef9ec;border:.5px solid #fcd34d;border-radius:8px;padding:12px 14px;margin-bottom:14px}.nb .lbl{font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.nb .val{font-size:12px;color:#78350f;line-height:1.6}.tb{border:.5px solid #e2e8f0;border-left:3px solid #4f46e5;border-radius:0 8px 8px 0;padding:12px 14px;background:#f8fafc;margin-bottom:14px}.tb .lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}.tb .val{font-size:11px;color:#64748b;line-height:1.7}.bank{background:#f8fafc;border:.5px solid #e2e8f0;padding:12px 16px;border-radius:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px}.bank .lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.bank .val{font-size:12px;font-weight:700;color:#0f172a}.footer{font-size:10px;color:#94a3b8;border-top:.5px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between}.bta{position:fixed;top:0;left:0;right:0;z-index:9999;background:#0d1829;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,.4)}.bta a{width:36px;height:36px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:300;text-decoration:none;cursor:pointer;flex-shrink:0;line-height:1}.bta a:hover{background:rgba(255,255,255,.22)}.bta-l{font-size:13px;color:rgba(255,255,255,.5);margin-top:2px}.bta-t{font-size:16px;font-weight:700;color:#fff}body{padding-top:calc(30mm + 54px)}.os-section{margin-top:24px;margin-bottom:20px}.os-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.os-lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px}.os-total{background:#fee2e2;border:.5px solid #fca5a5;border-radius:8px;padding:4px 14px;font-size:13px;font-weight:700;color:#991b1b}.os-table{width:100%;border-collapse:collapse;margin-bottom:12px}.os-table thead tr{background:#f8fafc;border-bottom:.5px solid #e2e8f0}.os-table th{padding:6px 8px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;text-align:left;border-radius:0}.os-table td{padding:7px 8px;border-bottom:.5px solid #f8fafc;font-size:11px}.os-table tr:last-child td{border-bottom:none}.overdue-badge{background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.partial-badge{background:#ede9fe;color:#5b21b6;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.pending-badge{background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.os-notice{border:.5px solid #fca5a5;border-left:3px solid #dc2626;border-radius:0 8px 8px 0;padding:10px 14px;background:#fff7f7;margin-bottom:20px;font-size:11px;color:#991b1b;line-height:1.6}@media print{.bta{display:none!important}body{padding-top:0!important}}</style></head><body><div class="bta"><div><div class="bta-t">LedgerOS</div><div class="bta-l">Arkham Retail Ltd</div></div><a href="#" onclick="try{if(window.opener&&window.opener.__closePrintWin){window.opener.__closePrintWin();return;}if(window.opener){window.opener.postMessage('__ledgeros_close__','*');}window.close();}catch(e){window.close();}">&#x2715;</a></div><div class="accent-bar"></div><div class="hdr"><div class="logo-wrap"><div class="logo-box"><svg width=\"28\" height=\"28\" viewBox=\"0 0 48 48\" fill=\"none\"><rect x=\"10\" y=\"13\" width=\"28\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\"/><rect x=\"10\" y=\"20\" width=\"20\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".6\"/><rect x=\"10\" y=\"27\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".35\"/><rect x=\"10\" y=\"34\" width=\"14\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".18\"/><rect x=\"30\" y=\"21\" width=\"2.5\" height=\"14\" rx=\"1.25\" fill=\"#60a5fa\"/><polygon points=\"36,27 30,21 30,35\" fill=\"#60a5fa\" fill-opacity=\".4\"/></svg></div><div><div class="co-name">${escHtml(COMPANY.name)}</div><div class="co-det">${escHtml(COMPANY.address)}<br>${escHtml(COMPANY.city)}, ${escHtml(COMPANY.postcode)}<br>Tel: ${escHtml(COMPANY.phone)} &middot; ${escHtml(COMPANY.email)}<br>VAT: ${escHtml(COMPANY.vatNumber)}</div></div></div><div style="text-align:right;flex-shrink:0;max-width:160px"><div class="inv-title">INVOICE</div><div class="inv-num">${escHtml(invoice.invoice_number)}</div><div class="inv-status">${escHtml((invoice.status||'pending').toUpperCase())}</div></div></div><div class="meta"><div class="meta-dk"><div class="lbl">Invoice to</div><div class="val">${escHtml(invoice.customer)}</div></div><div class="mgrid"><div class="mbox"><div class="lbl">Invoice #</div><div class="val">${escHtml(invoice.invoice_number)}</div></div><div class="mbox"><div class="lbl">Invoice date</div><div class="val">${fmtDate(invoice.invoice_date)}</div></div><div class="mbox"><div class="lbl">Due date</div><div class="val">${fmtDate(invoice.due_date)}</div></div><div class="mbox"><div class="lbl">Terms</div><div class="val">Due on receipt</div></div></div></div><table><thead><tr><th style="width:40%">Description</th><th style="text-align:center">VAT</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th>Amount</th></tr></thead><tbody>${invLines.map(l=>`<tr><td style="font-weight:600">${escHtml(l.description)}</td><td style="text-align:center;color:#94a3b8">${l.vat_rate===0?'Exempt':l.vat_rate+'% S'}</td><td style="text-align:right">${escHtml(String(l.qty))}</td><td style="text-align:right">${fmt(l.unit_price)}</td><td>${fmt(l.qty*l.unit_price)}</td></tr>`).join('')}</tbody></table><div class="totals"><div class="tr"><span>Subtotal</span><span>${fmt(sub)}</span></div><div class="tr"><span>VAT total</span><span>${fmt(vat)}</span></div><div class="tt"><span>Total</span><span>${fmt(tot)}</span></div></div>${paymentsHtml}<div class="bb"><span class="bb-l">Balance due</span><span class="bb-v">${fmt(bal)}</span></div>${overdueSection}${invoice.notes?'<div class="nb"><div class="lbl">Notes</div><div class="val">'+escHtml(invoice.notes)+'</div></div>':""} <div class="tb"><div class="lbl">Payment terms</div><div class="val">Payment due within 7 days of invoice date unless otherwise agreed in writing. Late payments may be subject to interest and recovery costs in accordance with the Late Payment of Commercial Debts (Interest) Act 1998. Goods remain the property of Arkham Retail Ltd until paid for in full.</div></div><div class="bank"><div><div class="lbl">Bank</div><div class="val">${escHtml(COMPANY.bankName)}</div></div><div><div class="lbl">Sort code</div><div class="val">${escHtml(COMPANY.sortCode)}</div></div><div><div class="lbl">Account</div><div class="val">${escHtml(COMPANY.accountNumber)}</div></div></div><div class="footer"><span>${escHtml(COMPANY.name)} &middot; VAT: ${escHtml(COMPANY.vatNumber)}</span><span>Ref: ${escHtml(invoice.invoice_number)} &middot; Printed: ${new Date().toLocaleDateString('en-GB')}</span></div></body></html>`;
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  const buildWaMsg = () => encodeURIComponent(
    `*VAT Invoice — ${COMPANY.name}*\n\nInvoice: *${invoice.invoice_number}*\nCustomer: ${invoice.customer}\nDate: ${fmtDate(invoice.invoice_date)}\nDue: ${fmtDate(invoice.due_date)}\n\n` +
    lines.map(l => { const s = l.description && l.description.includes(':') ? l.description.split(':').pop().trim() : (l.description || ''); const short = s.length > 22 ? s.slice(0,22)+'\u2026' : s; return `${short} x${l.qty} — ${fmt(l.qty * l.unit_price)}`; }).join("\n") +
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
    const result = await sendEmail({ to: toEmail, subject, html, token });
    setEmailStatus(result.success ? "sent" : "error");
    setTimeout(() => setEmailStatus(null), 4000);
  };

  // Timeline events derived from invoice data
  const timeline = [
    { icon: "ti-file-plus", color: "var(--blue)", bg: "var(--blue-lt)", label: "Created", date: invoice.created_at || invoice.invoice_date, desc: `Invoice ${invoice.invoice_number} created · ${fmt(invoice.amount)}` },
    ...payments.map((p, idx) => {
      const runningTotal = payments.slice(0, idx + 1).reduce((s, x) => s + parseFloat(x.amount || 0), 0);
      const remaining = Math.max(0, parseFloat(invoice.amount || 0) - runningTotal);
      const methodIcon = p.method === "cash" ? "💵" : p.method === "bank" ? "🏦" : p.method === "card" ? "💳" : "📝";
      const isFinal = remaining <= 0;
      return {
        icon: isFinal ? "ti-circle-check" : "ti-credit-card",
        color: isFinal ? "var(--green)" : "#2563eb",
        bg: isFinal ? "var(--green-lt)" : "var(--blue-lt)",
        label: isFinal ? "Paid in Full" : "Partial Payment",
        date: p.created_at || p.payment_date,
        desc: `${fmt(p.amount)} received ${methodIcon} ${p.method}${p.recorded_by_name ? " · by " + p.recorded_by_name : ""}`,
        sub: remaining > 0 ? `Balance after: ${fmt(remaining)}` : "Invoice fully settled",
      };
    }),
    invoice.status === "overdue" && (!payments.length) && { icon: "ti-alert-circle", color: "var(--red)", bg: "var(--red-lt)", label: "Overdue", date: invoice.due_date, desc: "Payment overdue — chase required" },
  ].filter(Boolean).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

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
              {[
                ["invoice","Invoice",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>],
                ["payments","Payments",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>],
                ["timeline","Timeline",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>],
                ["actions","Actions",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>],
              ].filter(([id])=>!(id==="actions"&&profile?.role==="agent")).map(([id, lbl, svgIcon]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5, transition: "all .12s", background: activeTab === id ? "var(--white)" : "transparent", color: activeTab === id ? "var(--text)" : "var(--text3)", boxShadow: activeTab === id ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
                  {svgIcon}{lbl}
                </button>
              ))}
            </div>
            <button className="btn bo bsm" onClick={onClose} style={{ width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
          </div>
        </div>
        {/* ── PAYMENTS TAB ── */}
        {activeTab === "payments" && (
          <div style={{padding:"20px 24px"}}>
            {/* Payment Summary */}
            {(invoice.status === "partial" || invoice.status === "paid") && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                {[
                  { label:"Invoice Total", val:fmt(invoice.amount), accent:"#2563eb" },
                  { label:"Amount Paid", val:fmt(invoice.amount_paid||0), accent:"#16a34a" },
                  { label:"Balance Owing", val:fmt(Math.max(0,(invoice.balance||invoice.amount))), accent:invoice.balance>0?"#dc2626":"#16a34a" },
                ].map((k,i) => (
                  <div key={i} style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:"12px 16px",borderTop:`3px solid ${k.accent}`}}>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:6}}>{k.label}</div>
                    <div style={{fontSize:18,fontWeight:800,color:"var(--text)",fontFamily:"var(--mono)"}}>{k.val}</div>
                  </div>
                ))}
              </div>
            )}
            {invoice.amount_paid > 0 && invoice.amount > 0 && (
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text3)",marginBottom:6}}>
                  <span>Collection progress</span>
                  <span>{Math.round((invoice.amount_paid/invoice.amount)*100)}% collected</span>
                </div>
                <div style={{height:6,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:Math.min(100,Math.round((invoice.amount_paid/invoice.amount)*100))+"%",background:invoice.status==="paid"?"#16a34a":"#2563eb",borderRadius:4,transition:"width .4s"}} />
                </div>
              </div>
            )}
            {/* Payment History */}
            <div style={{marginBottom:16,fontWeight:700,fontSize:13,color:"var(--text)"}}>Payment History</div>
            {paymentsLoading ? (
              <div style={{display:"flex",flexDirection:"column",gap:10,padding:"4px 0"}}>
                {[1,2,3].map(i => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid var(--border)"}}>
                    <div className="skel" style={{width:90,height:13,borderRadius:4}}/>
                    <div className="skel" style={{width:64,height:13,borderRadius:4}}/>
                    <div className="skel" style={{width:48,height:13,borderRadius:4}}/>
                    <div className="skel" style={{width:120,height:13,borderRadius:4,marginLeft:"auto"}}/>
                  </div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div style={{textAlign:"center",padding:"32px 0",color:"var(--text3)"}}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.3,marginBottom:8,display:"block",margin:"0 auto 8px"}}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                <div style={{fontSize:13}}>No payments recorded yet</div>
                <div style={{fontSize:11,marginTop:4}}>Payments will appear here when recorded</div>
              </div>
            ) : (
              <div style={{border:"1px solid var(--border)",borderRadius:"var(--rl)",overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{background:"var(--bg)"}}>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Date & Time</th>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Amount</th>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Method</th>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Notes</th>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Received By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p,i) => {
                      const ts = p.created_at || p.payment_date;
                      const d = ts ? new Date(ts) : null;
                      const dateStr = d ? d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";
                      const timeStr = d ? d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : "";
                      const agentName = p.recorded_by_name || "—";
                      const agentInitial = agentName[0]?.toUpperCase() || "?";
                      const agentColors = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#2563eb"];
                      const agentCol = agentColors[agentName.charCodeAt(0)%5] || "#64748b";
                      return (
                        <tr key={p.id} style={{borderBottom: i<payments.length-1?"1px solid var(--border)":"none"}}>
                          <td style={{padding:"10px 14px"}}>
                            <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{dateStr}</div>
                            <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{timeStr}</div>
                          </td>
                          <td style={{padding:"10px 14px"}}><span style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:13,color:"#16a34a"}}>{fmt(p.amount)}</span></td>
                          <td style={{padding:"10px 14px"}}><span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12}}>{p.method==="cash"?"💵":p.method==="bank"?"🏦":p.method==="card"?"💳":"📝"} {p.method}</span></td>
                          <td style={{padding:"10px 14px",fontSize:12,color:"var(--text2)"}}>{p.notes||"—"}</td>
                          <td style={{padding:"10px 14px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:26,height:26,borderRadius:"50%",background:agentCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{agentInitial}</div>
                              <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{agentName}</div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{padding:"10px 14px",background:"var(--bg)",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span style={{color:"var(--text3)"}}>{payments.length} payment{payments.length!==1?"s":""}</span>
                  <span style={{fontFamily:"var(--mono)",fontWeight:700}}>{fmt(payments.reduce((s,p)=>s+(parseFloat(p.amount)||0),0))} total</span>
                </div>
              </div>
            )}
          </div>
        )}
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
                    <td style={{whiteSpace:'nowrap'}}><span className="tag">{l.vat_rate === 0 ? "Exempt" : `${l.vat_rate}% S`}</span></td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{l.qty}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace:'nowrap' }}>{fmt(l.unit_price)}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, whiteSpace:'nowrap' }}>{fmt(l.qty * l.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="inv-totals-box">
              <div className="inv-tot-row"><span style={{ color: "#64748b" }}>Subtotal</span><span className="mono">{fmt(subtotal)}</span></div>
              <div className="inv-tot-row"><span style={{ color: "#64748b" }}>VAT Total</span><span className="mono">{fmt(vatTotal)}</span></div>
              <div className="inv-tot-row divider"><span>Total</span><span className="mono">{fmt(total)}</span></div>
            </div>
            {payments.length > 0 && (
              <div style={{ margin:"0 0 16px", border:".5px solid #e2e8f0", borderRadius:9, overflow:"hidden" }}>
                <div style={{ background:"#f8fafc", padding:"8px 14px", fontSize:9, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".8px", borderBottom:".5px solid #e2e8f0" }}>Payments Received</div>
                {payments.map((p, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 14px", borderBottom: i < payments.length-1 ? ".5px solid #f1f5f9" : "none", fontSize:12 }}>
                    <span style={{ color:"#64748b" }}>{fmtDate(p.created_at || p.payment_date)}</span>
                    <span style={{ color:"#64748b" }}>{p.method==="cash"?"💵":p.method==="bank"?"🏦":p.method==="card"?"💳":"📝"} {p.method}</span>
                    <span style={{ fontWeight:700, color:"#16a34a", fontFamily:"var(--mono)" }}>-{fmt(parseFloat(p.amount||0))}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 14px", background:"#f0fdf4", borderTop:".5px solid #bbf7d0", fontSize:12, fontWeight:700, color:"#15803d" }}>
                  <span>Total paid</span>
                  <span style={{ fontFamily:"var(--mono)" }}>{fmt(payments.reduce((s,p)=>s+parseFloat(p.amount||0),0))}</span>
                </div>
              </div>
            )}
            <div className="inv-balance-box"><span className="inv-balance-lbl">Balance Due</span><span className="inv-balance-val mono">{fmt(invoice.balance > 0 && invoice.balance < total ? invoice.balance : total)}</span></div>
            {invoice.notes && (
              <div style={{ background:"#fef9ec",border:"1px solid #fcd34d",borderRadius:9,padding:"12px 14px",marginBottom:16 }}>
                <div style={{ fontSize:9,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:".8px",marginBottom:4 }}>Notes</div>
                <div style={{ fontSize:12,color:"#78350f",lineHeight:1.6 }}>{invoice.notes}</div>
              </div>
            )}
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
              {timeline.map((ev, i) => {
                const d = ev.date ? new Date(ev.date) : null;
                const dateStr = d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
                const timeStr = d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <div key={i} style={{ display: "flex", gap: 16, marginBottom: 24, position: "relative" }}>
                    <div style={{ width: 33, height: 33, borderRadius: "50%", background: ev.bg, border: "2px solid var(--white)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, boxShadow: "0 0 0 3px " + ev.bg }}>
                      <span style={{ color: ev.color, fontSize: 15 }}>
                        {ev.icon === "ti-file-plus" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        : ev.icon === "ti-circle-check" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        : ev.icon === "ti-credit-card" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                      </span>
                    </div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: ev.color }}>{ev.label}</div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>{dateStr}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{timeStr}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: ev.sub ? 4 : 0 }}>{ev.desc}</div>
                      {ev.sub && <div style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>{ev.sub}</div>}
                    </div>
                  </div>
                );
              })}
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
              <div className="inv-action-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
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
                  <input type="date" value={partPayDate} onChange={e => setPartPayDate(e.target.value)} title="Date payment was received" style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border2)", fontSize: 13, outline: "none", fontFamily: "var(--sans)", background: "var(--white)", color: "var(--text)", cursor: "pointer" }} />
                  <button className="btn bp" disabled={!partPayAmount || partPayLoading} onClick={async () => {
                    const amt = parseFloat(partPayAmount);
                    if (!amt || amt <= 0) return;
                    setPartPayLoading(true); setPartPayMsg("");
                    try {
                      if (onPartPay) await onPartPay(invoice, amt, partPayMethod, partPayDate);
                      const currentBalance = invoice.balance != null ? parseFloat(invoice.balance) : parseFloat(invoice.amount || 0);
                      const prevPaid = parseFloat(invoice.amount_paid || 0);
                      const bal = currentBalance > 0 ? currentBalance : Math.max(0, parseFloat(invoice.amount || 0) - prevPaid);
                      const newBal = Math.max(0, bal - amt);
                      setPartPayMsg(`✓ £${amt.toFixed(2)} recorded. Balance: £${newBal.toFixed(2)}`);
                      setPartPayAmount("");
                      setPartPayDate(new Date().toISOString().split("T")[0]);
                      refreshPayments();
                      if (onLogPartPay) onLogPartPay(invoice, amt, partPayMethod, newBal);
                    } catch(err) { console.error("Part payment error:", err); setPartPayMsg("Error recording payment: " + (err?.message || String(err))); }
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
                <button className="btn bo" onClick={() => onDuplicate && onDuplicate(invoice)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Duplicate Invoice</button>
                <button className="btn bo" onClick={() => handleEmail(true)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>Send Reminder</button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={"badge " + sc.cls}>{sc.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{fmt(invoice.balance > 0 && invoice.balance < total ? invoice.balance : total)}</span>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>· {invoice.invoice_number}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {savedPhone && <button className="btn bwa bsm" onClick={() => sendWhatsApp(savedPhone)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>{savedPhone}</button>}
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

function SearchDropdown({ placeholder, items, onSelect, onCreateNew, displayKey = "name", value = "" }) {
  const [query, setQuery] = useState(shortName(value));
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const allMatches = items.filter(i => (i[displayKey] || "").toLowerCase().includes(query.toLowerCase()));
  const filtered = allMatches.slice(0, 12);
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
      {open && filtered.length > 0 && allMatches.length > 12 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderTop: "none", borderRadius: "0 0 var(--r) var(--r)", boxShadow: "var(--sh2)", zIndex: 100, padding: "7px 14px", fontSize: 11, color: "var(--text3)" }}>
          Showing 12 of {allMatches.length} — type more to narrow results
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"var(--white)", border:"0.5px solid var(--border2)", borderRadius:"var(--r)", boxShadow:"var(--sh2)", zIndex:100, marginTop:4, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", fontSize:13, color:"var(--text3)" }}>No results for "{query}"</div>
          {onCreateNew && (
            <div onMouseDown={() => { onCreateNew(query); setQuery(query); setOpen(false); }}
              style={{ padding:"10px 14px", cursor:"pointer", fontSize:13, fontWeight:600, color:"var(--blue)", background:"var(--blue-lt)", display:"flex", alignItems:"center", gap:7, borderTop:"0.5px solid var(--border)" }}
              onMouseEnter={e => e.currentTarget.style.background="#dbeafe"}
              onMouseLeave={e => e.currentTarget.style.background="var(--blue-lt)"}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create "{query}" as new customer
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── INVOICE FORM ──────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ InvoiceForm                                                │
// │ Create new invoice form with line items and VAT            │
// └────────────────────────────────────────────────────────────┘
function InvoiceForm({ contacts, products, token, userId, onSave, onClose, invoices = [] }) {
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
  const [localContacts, setLocalContacts] = useState(contacts);

  const quickAddCustomer = async (name) => {
    const data = await sb.post(token, "contacts", { name, type: "customer", created_by: userId });
    if (data[0]) {
      setLocalContacts(prev => [...prev, data[0]]);
      setF(prev => ({ ...prev, customer: name }));
      logAudit(token, userId, "contact_created", "contact", data[0].id, `${name} quick-added from invoice form`);
      toast.success(`${name} added as customer`);
    } else { toast.error("Failed to create customer"); }
  };
  const [mobPickerOpen, setMobPickerOpen] = useState(false);
  const [mobPickerSearch, setMobPickerSearch] = useState("");

  const customers = localContacts.filter(c => c.type === "customer" || c.type === "both");

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
    // Safety net — if anything hangs >15s on mobile network, reset button
    const saveTimeout = setTimeout(() => {
      setSaving(false);
      toast.error("Request timed out. Check your connection and try again.");
    }, 15000);
    try {
      const existing = await sb.get(token, "invoices", "select=invoice_number&order=invoice_number.desc&limit=1");
      let nextNum = 1;
      if (Array.isArray(existing) && existing.length > 0 && existing[0].invoice_number) {
        const lastNum = parseInt(existing[0].invoice_number.replace("INV-", ""), 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      const invoice_number = `INV-${String(nextNum).padStart(4, "0")}`;
      const inv = await sb.post(token, "invoices", {
        customer: f.customer, invoice_date: f.invoice_date, due_date: f.due_date || f.invoice_date || null,
        status: f.status, notes: f.notes || null,
        amount: total, subtotal, vat_total: vatTotal, balance: total, amount_paid: 0, invoice_number, created_by: userId,
        lines: JSON.stringify(lines.filter(l => l.description && l.description.trim() !== ""))
      });
      if (inv && inv[0]) {
        const fullInv = { ...inv[0], lines };
        onSave(fullInv);
        logAudit(token, userId, "invoice_created", "invoice", inv[0].id, `Invoice ${invoice_number} created for ${f.customer} — ${new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(total)}`);
        // Pre-fill DN fields from customer contact
        const cust = contacts.find(c => c.name === f.customer);
        setDnAddress([cust?.address, cust?.city, cust?.postcode].filter(Boolean).join(", "));
        setDnNotes(f.notes || "");
        setSavedInvoice(fullInv);
      } else {
        const errMsg = inv?.message || inv?.error || inv?.msg || "Failed to save invoice";
        toast.error(errMsg + ". Please try again.");
      }
    } catch (err) {
      console.error("Invoice save error:", err);
      toast.error("Network error — check your connection and try again.");
    } finally {
      clearTimeout(saveTimeout);
      setSaving(false);
    }
  };

  // Print the saved invoice as HTML download
  const printInvoice = async () => {
    if (!savedInvoice) return;
    const invLines = savedInvoice.lines || [];
    const sub = invLines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
    const vat = invLines.reduce((s, l) => s + (l.qty * l.unit_price * (l.vat_rate / 100)), 0);
    const tot = sub + vat;
    const contactRecord = contacts.find(c => c.name === savedInvoice.customer);
    const totalOutstanding = parseFloat(contactRecord?.total_outstanding || 0);
    let overdueInvs = [];
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/invoices?customer=eq.${encodeURIComponent(savedInvoice.customer)}&status=in.(overdue,pending,partial)&order=invoice_date.asc&select=invoice_number,invoice_date,amount,amount_paid,balance,status`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) overdueInvs = data.filter(i => i.invoice_number !== savedInvoice.invoice_number);
    } catch(e) { overdueInvs = []; }
    const fmtV = v => '£' + parseFloat(v||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    const badgeMap = { overdue: '<span class="overdue-badge">Overdue</span>', partial: '<span class="partial-badge">Partial</span>', pending: '<span class="pending-badge">Pending</span>' };
    const overdueSection = (overdueInvs.length > 0 || totalOutstanding > 0) ? `
      <div class="os-section">
        <div class="os-hdr">
          <div class="os-lbl">Outstanding account balance</div>
          <div class="os-total">${fmtV(totalOutstanding)} outstanding</div>
        </div>
        <table class="os-table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Balance</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>${overdueInvs.map(i => `<tr><td style="font-weight:600">${i.invoice_number}</td><td>${fmtD(i.invoice_date)}</td><td>${fmtV(i.amount)}</td><td style="font-weight:700;color:#dc2626">${fmtV(i.balance)}</td><td>${daysSince(i.invoice_date)}d</td><td>${badgeMap[i.status]||i.status}</td></tr>`).join('')}</tbody>
        </table>
        <div class="os-notice">⚠ This account has outstanding balances. Payment is required before further credit can be extended. Goods remain the property of Arkham Retail Ltd until all invoices are paid in full.</div>
      </div>` : '';
    const html = `<!DOCTYPE html><html><head><title>${savedInvoice.invoice_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;padding:30mm 20mm 20mm;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent-bar{height:5px;background:linear-gradient(90deg,#1e1b4b 0%,#4f46e5 60%,#818cf8 100%);margin:-30mm -20mm 0}.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 0 20px;border-bottom:.5px solid #e2e8f0;margin-bottom:20px}.logo-wrap{display:flex;align-items:center;gap:14px;flex:1;min-width:0}.logo-box{width:48px;height:48px;background:#1e1b4b;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.co-name{font-size:15px;font-weight:700;color:#0f172a}.co-det{font-size:10.5px;color:#64748b;line-height:1.6;margin-top:2px;word-break:break-word}.inv-title{font-size:28px;font-weight:900;color:#e2e8f0;letter-spacing:-1.5px;text-align:right;line-height:1}.inv-num{font-size:16px;font-weight:800;text-align:right;color:#0f172a;margin-top:2px}.inv-status{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;background:#fef3c7;color:#92400e;border:.5px solid #fcd34d}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.meta-dk{background:#1e1b4b;border-radius:8px;padding:14px 16px}.meta-dk .lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}.meta-dk .val{font-size:18px;font-weight:700;color:#fff;line-height:1.2}.meta-dk .sub{font-size:11px;color:rgba(255,255,255,.5);margin-top:4px}.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mbox{background:#f8fafc;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 12px}.mbox .lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.mbox .val{font-size:12px;font-weight:600;color:#0f172a}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#1e1b4b}th{padding:9px 12px;font-size:9px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;text-align:left}th:first-child{border-radius:6px 0 0 6px}th:last-child{border-radius:0 6px 6px 0;text-align:right}td{padding:11px 12px;border-bottom:.5px solid #f1f5f9;font-size:12px}tr:last-child td{border-bottom:none}td:last-child{text-align:right;font-weight:600}.totals{width:260px;margin-left:auto;margin-bottom:20px}.tr{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#64748b}.tr span:last-child{color:#0f172a}.tt{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;border-top:.5px solid #e2e8f0;margin-top:4px}.bb{background:#1e1b4b;border-radius:8px;padding:12px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center}.bb-l{color:rgba(255,255,255,.5);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}.bb-v{color:#fff;font-size:18px;font-weight:800}.nb{background:#fef9ec;border:.5px solid #fcd34d;border-radius:8px;padding:12px 14px;margin-bottom:14px}.nb .lbl{font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.nb .val{font-size:12px;color:#78350f;line-height:1.6}.tb{border:.5px solid #e2e8f0;border-left:3px solid #4f46e5;border-radius:0 8px 8px 0;padding:12px 14px;background:#f8fafc;margin-bottom:14px}.tb .lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}.tb .val{font-size:11px;color:#64748b;line-height:1.7}.bank{background:#f8fafc;border:.5px solid #e2e8f0;padding:12px 16px;border-radius:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px}.bank .lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.bank .val{font-size:12px;font-weight:700;color:#0f172a}.footer{font-size:10px;color:#94a3b8;border-top:.5px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between}.bta{position:fixed;top:0;left:0;right:0;z-index:9999;background:#0d1829;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,.4)}.bta a{width:36px;height:36px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:300;text-decoration:none;cursor:pointer;flex-shrink:0;line-height:1}.bta a:hover{background:rgba(255,255,255,.22)}.bta-l{font-size:13px;color:rgba(255,255,255,.5);margin-top:2px}.bta-t{font-size:16px;font-weight:700;color:#fff}body{padding-top:calc(30mm + 54px)}.os-section{margin-top:24px;margin-bottom:20px}.os-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.os-lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px}.os-total{background:#fee2e2;border:.5px solid #fca5a5;border-radius:8px;padding:4px 14px;font-size:13px;font-weight:700;color:#991b1b}.os-table{width:100%;border-collapse:collapse;margin-bottom:12px}.os-table thead tr{background:#f8fafc;border-bottom:.5px solid #e2e8f0}.os-table th{padding:6px 8px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;text-align:left;border-radius:0}.os-table td{padding:7px 8px;border-bottom:.5px solid #f8fafc;font-size:11px}.os-table tr:last-child td{border-bottom:none}.overdue-badge{background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.partial-badge{background:#ede9fe;color:#5b21b6;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.pending-badge{background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.os-notice{border:.5px solid #fca5a5;border-left:3px solid #dc2626;border-radius:0 8px 8px 0;padding:10px 14px;background:#fff7f7;margin-bottom:20px;font-size:11px;color:#991b1b;line-height:1.6}@media print{.bta{display:none!important}body{padding-top:0!important}}</style></head><body><div class="bta"><div><div class="bta-t">LedgerOS</div><div class="bta-l">Arkham Retail Ltd</div></div><a href="#" onclick="try{if(window.opener&&window.opener.__closePrintWin){window.opener.__closePrintWin();return;}if(window.opener){window.opener.postMessage('__ledgeros_close__','*');}window.close();}catch(e){window.close();}">&#x2715;</a></div><div class="accent-bar"></div><div class="hdr"><div class="logo-wrap"><div class="logo-box"><svg width=\"28\" height=\"28\" viewBox=\"0 0 48 48\" fill=\"none\"><rect x=\"10\" y=\"13\" width=\"28\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\"/><rect x=\"10\" y=\"20\" width=\"20\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".6\"/><rect x=\"10\" y=\"27\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".35\"/><rect x=\"10\" y=\"34\" width=\"14\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".18\"/><rect x=\"30\" y=\"21\" width=\"2.5\" height=\"14\" rx=\"1.25\" fill=\"#60a5fa\"/><polygon points=\"36,27 30,21 30,35\" fill=\"#60a5fa\" fill-opacity=\".4\"/></svg></div><div><div class="co-name">${COMPANY.name}</div><div class="co-det">${COMPANY.address}<br>${COMPANY.city}, ${COMPANY.postcode}<br>Tel: ${COMPANY.phone} &middot; ${COMPANY.email}<br>VAT: ${COMPANY.vatNumber}</div></div></div><div style="text-align:right;flex-shrink:0;max-width:160px"><div class="inv-title">INVOICE</div><div class="inv-num">${savedInvoice.invoice_number}</div><div class="inv-status">${(savedInvoice.status||'pending').toUpperCase()}</div></div></div><div class="meta"><div class="meta-dk"><div class="lbl">Invoice to</div><div class="val">${escHtml(savedInvoice.customer)}</div></div><div class="mgrid"><div class="mbox"><div class="lbl">Invoice #</div><div class="val">${savedInvoice.invoice_number}</div></div><div class="mbox"><div class="lbl">Invoice date</div><div class="val">${fmtDate(savedInvoice.invoice_date)}</div></div><div class="mbox"><div class="lbl">Due date</div><div class="val">${fmtDate(savedInvoice.due_date)}</div></div><div class="mbox"><div class="lbl">Terms</div><div class="val">Due on receipt</div></div></div></div><table><thead><tr><th style="width:40%">Description</th><th style="text-align:center">VAT</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th>Amount</th></tr></thead><tbody>${invLines.map(l=>`<tr><td style="font-weight:600">${escHtml(l.description)}</td><td style="text-align:center;color:#94a3b8">${l.vat_rate===0?'Exempt':l.vat_rate+'% S'}</td><td style="text-align:right">${escHtml(String(l.qty))}</td><td style="text-align:right">${fmt(l.unit_price)}</td><td>${fmt(l.qty*l.unit_price)}</td></tr>`).join('')}</tbody></table><div class="totals"><div class="tr"><span>Subtotal</span><span>${fmt(sub)}</span></div><div class="tr"><span>VAT total</span><span>${fmt(vat)}</span></div><div class="tt"><span>Total</span><span>${fmt(tot)}</span></div><div class="bb"><span class="bb-l">Balance due</span><span class="bb-v">${fmt(tot)}</span></div></div>${overdueSection}${savedInvoice.notes?'<div class="nb"><div class="lbl">Notes</div><div class="val">'+escHtml(savedInvoice.notes)+'</div></div>':""} <div class="tb"><div class="lbl">Payment terms</div><div class="val">Payment due within 7 days of invoice date unless otherwise agreed in writing. Late payments may be subject to interest and recovery costs in accordance with the Late Payment of Commercial Debts (Interest) Act 1998. Goods remain the property of Arkham Retail Ltd until paid for in full.</div></div><div class="bank"><div><div class="lbl">Bank</div><div class="val">${COMPANY.bankName}</div></div><div><div class="lbl">Sort code</div><div class="val">${COMPANY.sortCode}</div></div><div><div class="lbl">Account</div><div class="val">${COMPANY.accountNumber}</div></div></div><div class="footer"><span>${COMPANY.name} &middot; VAT: ${COMPANY.vatNumber}</span><span>Ref: ${savedInvoice.invoice_number} &middot; Printed: ${new Date().toLocaleDateString('en-GB')}</span></div></body></html>`;
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  const downloadInvoicePDF = () => {
    const html = buildInvoiceHtml();
    window.__ledgerosPrint && window.__ledgerosPrint(html);
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

  const buildDNHtml = (dn, overdueSection = '') => {
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

  /* Outstanding balance section */
  .os-section{margin-top:24px;margin-bottom:20px}.os-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.os-lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px}.os-total{background:#fee2e2;border:.5px solid #fca5a5;border-radius:8px;padding:4px 14px;font-size:13px;font-weight:700;color:#991b1b}.os-table{width:100%;border-collapse:collapse;margin-bottom:12px}.os-table thead tr{background:#f8fafc;border-bottom:.5px solid #e2e8f0}.os-table th{padding:6px 8px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;text-align:left}.os-table td{padding:7px 8px;border-bottom:.5px solid #f8fafc;font-size:11px}.os-table tr:last-child td{border-bottom:none}.overdue-badge{background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.partial-badge{background:#ede9fe;color:#5b21b6;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.pending-badge{background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.os-notice{border:.5px solid #fca5a5;border-left:3px solid #dc2626;border-radius:0 8px 8px 0;padding:10px 14px;background:#fff7f7;margin-bottom:20px;font-size:11px;color:#991b1b;line-height:1.6}

  /* Driver strip */
  .driver-strip{background:#f0f4ff;border:1px solid #c7d7fc;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px}
  .driver-icon{width:34px;height:34px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .driver-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:2px}
  .driver-name{font-size:14px;font-weight:700;color:#1e40af}

  @media print{
    body{padding:0}
    .page{max-width:100%;padding:20px 24px}
  }
.back-to-app{position:fixed;top:0;left:0;right:0;z-index:9999;background:#0d1829;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,.4)}.back-to-app a{width:36px;height:36px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:300;text-decoration:none;cursor:pointer;flex-shrink:0;line-height:1}.back-to-app a:hover{background:rgba(255,255,255,.22)}.back-to-app-label{font-size:13px;color:rgba(255,255,255,.5);margin-top:2px}.back-to-app-title{font-size:16px;font-weight:700;color:#fff}body{padding-top:calc(30mm + 54px)}@media print{.back-to-app{display:none!important}body{padding-top:0!important}}</style>
</head>
<body><div class="back-to-app"><div><div class="back-to-app-title">LedgerOS</div><div class="back-to-app-label">Arkham Retail Ltd</div></div><a href="#" onclick="try{if(window.opener&&window.opener.__closePrintWin){window.opener.__closePrintWin();return;}if(window.opener){window.opener.postMessage('__ledgeros_close__','*');}window.close();}catch(e){window.close();}">&#x2715;</a></div>
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

  <!-- Outstanding balance -->
  ${overdueSection}

  <!-- Notes -->
  ${inv.notes ? `<div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:9px;padding:12px 16px;margin-bottom:20px"><div style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Invoice Notes</div><div style="font-size:12px;color:#78350f;line-height:1.6">${inv.notes}</div></div>` : ""}
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

  const printDNFromForm = async (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const contactRecord = contacts.find(c => c.name === dn.customer_name);
    const totalOutstanding = parseFloat(contactRecord?.total_outstanding || 0);
    let overdueInvs = [];
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/invoices?customer=eq.${encodeURIComponent(dn.customer_name)}&status=in.(overdue,pending,partial)&order=invoice_date.asc&select=invoice_number,invoice_date,amount,amount_paid,balance,status`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) overdueInvs = data;
    } catch(e) { overdueInvs = []; }
    const fmtV = v => '£' + parseFloat(v||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    const deliveryTotal = dnLines.reduce((s,l) => s + (parseFloat(l.unit_price||0) * parseFloat(l.qty||0)), 0);
    const hasPrice = dnLines.some(l => l.unit_price);
    const badgeMap = {
      overdue: '<span class="overdue-badge">Overdue</span>',
      partial: '<span class="partial-badge">Partial</span>',
      pending: '<span class="pending-badge">Pending</span>',
    };
    const overdueSection = (overdueInvs.length > 0 || totalOutstanding > 0) ? `
      <div class="os-section">
        <div class="os-hdr">
          <div class="os-lbl">Outstanding account balance</div>
          <div class="os-total">${fmtV(totalOutstanding)} overdue</div>
        </div>
        <table class="os-table">
          <thead><tr>
            <th>Invoice</th><th>Date</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance</th><th style="text-align:right">Days</th><th style="text-align:center">Status</th>
          </tr></thead>
          <tbody>
            ${overdueInvs.map(i => `<tr>
              <td style="font-weight:600">${i.invoice_number}</td>
              <td style="color:#64748b">${fmtD(i.invoice_date)}</td>
              <td style="text-align:right">${fmtV(i.amount)}</td>
              <td style="text-align:right;font-weight:600;color:#991b1b">${fmtV(i.balance||i.amount)}</td>
              <td style="text-align:right;color:#991b1b">${daysSince(i.invoice_date)}d</td>
              <td style="text-align:center">${badgeMap[i.status]||''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="os-notice">Goods are delivered subject to full payment of all outstanding balances. Please arrange settlement of overdue invoices immediately. Continued supply may be withheld until account is brought up to date.</div>
      </div>` : '';
    const html = buildDNHtml(dn, overdueSection);
    window.__ledgerosPrint && window.__ledgerosPrint(html);
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
      html, token
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
      dnLines.map(l => { const s = l.description && l.description.includes(':') ? l.description.split(':').pop().trim() : (l.description || ''); const short = s.length > 22 ? s.slice(0,22)+'\u2026' : s; return `• ${short} — Qty: ${l.qty} ${l.unit || 'unit'}`; }).join("\n") +
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

            {/* ── Back to LedgerOS — BIG prominent button ── */}
            <button onClick={onClose} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", background:"#0d1829", border:"none", borderRadius:12, padding:"18px 20px", cursor:"pointer", fontFamily:"var(--sans)", marginBottom:16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:"-.2px" }}>Back to Invoices</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:1 }}>Return to LedgerOS</div>
              </div>
            </button>

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
              <button onClick={() => printDNFromForm(buildQuickDN())} style={{ border: "2px solid #0f172a", borderRadius: "var(--rl)", padding: "18px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", transition: "all .15s", fontFamily: "var(--sans)" }}
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
                    : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save Delivery Note</>}
                </button>
                <button className="btn bo" onClick={() => emailDN(buildQuickDN())}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email DN</button>
                <button className="btn bwa" onClick={() => whatsappDN(buildQuickDN())}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp DN</button>
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
              <button onClick={() => printDNFromForm(dnSaved)} style={{ border: "2px solid #0f172a", borderRadius: "var(--rl)", padding: "14px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", fontFamily: "var(--sans)", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#0f172a", fontSize: 20 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Print Delivery Note</div><div style={{ fontSize: 11, color: "var(--text2)" }}>{dnSaved.dn_number}</div></div>
                </div>
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <button className="btn bo" onClick={() => emailDN(dnSaved)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email DN</button>
              <button className="btn bwa" onClick={() => whatsappDN(dnSaved)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp DN</button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn bp" onClick={onClose}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Done</button>
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
      {/* ── IMPROVED HEADER — dark, shows running total ── */}
      <div style={{ background:"#0d1829", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:50, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button style={{ background:"none", border:"none", padding:0, cursor:"pointer", color:"rgba(255,255,255,.5)" }} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>New Invoice</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.4)" }}>{mobActiveLines.length > 0 ? `${mobActiveLines.length} item${mobActiveLines.length!==1?"s":""}` : "Select customer & add products"}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#60a5fa", fontFamily:"var(--mono)" }}>{fmt(total)}</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.35)" }}>running total</div>
        </div>
      </div>
      {/* Progress bar — sticky so it stays visible */}
      <div style={{ height:3, background:"rgba(0,0,0,.08)", display:"flex", gap:2, position:"sticky", top:98, zIndex:49 }}>
        <div style={{ flex:1, height:3, background: f.customer ? "#2563eb" : "rgba(255,255,255,.15)", transition:"background .3s" }} />
        <div style={{ flex:1, height:3, background: mobActiveLines.length > 0 ? "#2563eb" : "rgba(255,255,255,.1)", transition:"background .3s" }} />
      </div>

      {/* ── CUSTOMER SECTION — with recent list ── */}
      <div style={{ background:"var(--white)", margin:"10px 12px 0", borderRadius:"var(--rl)", border:"1px solid var(--border)", overflow:"hidden", scrollMarginTop:110 }}>
        <div style={{ padding:"10px 14px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px" }}>Customer *</div>
          {f.customer && <button onClick={() => setF({...f, customer:""})} style={{ background:"none", border:"none", fontSize:11, color:"var(--blue)", cursor:"pointer", fontWeight:600, padding:0 }}>Change</button>}
        </div>
        {f.customer ? (
          <div style={{ padding:"10px 14px 12px", display:"flex", alignItems:"center", gap:10, background:"#f0fdf4" }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>{f.customer?.[0]?.toUpperCase()}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{f.customer}</div>
              <div style={{ fontSize:10, color:"var(--green)", fontWeight:500 }}>✓ Selected</div>
            </div>
          </div>
        ) : (
          <div style={{ padding:"8px 14px 12px" }}>
            <div className="mob-customer-search" style={{ position:"relative" }}>
          <SearchDropdown placeholder="🔍  Search customers..." items={mobCusts} onSelect={c => setF({ ...f, customer: c.name })} />
        </div>
            {/* Recent customers — quick tap */}
            {mobCusts.length > 0 && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:9, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:6 }}>Recent</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {[...mobCusts].sort((a,b) => { const la = invoices.filter(i=>i.customer===a.name).reduce((m,i)=>i.created_at>m?i.created_at:m,""); const lb = invoices.filter(i=>i.customer===b.name).reduce((m,i)=>i.created_at>m?i.created_at:m,""); return lb.localeCompare(la); }).slice(0, 4).map(c => (
                    <button key={c.id} onClick={() => setF({...f, customer: c.name})} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, border:"1px solid var(--border)", background:"var(--bg)", cursor:"pointer", textAlign:"left", fontFamily:"var(--sans)" }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][c.name?.charCodeAt(0)%5]||"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{c.name?.[0]?.toUpperCase()}</div>
                      <span style={{ fontSize:12, fontWeight:500, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DUE DATE — visible by default, not hidden ── */}
      <div style={{ background:"var(--white)", margin:"8px 12px 0", borderRadius:"var(--rl)", border:"1px solid var(--border)", padding:"10px 14px 12px" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px", marginBottom:8 }}>Due Date</div>
        <div style={{ display:"flex", gap:5, marginBottom:f.due_date ? 6 : 0 }}>
          {[{label:"Today",days:0},{label:"7 days",days:7},{label:"14 days",days:14},{label:"30 days",days:30}].map(({label,days}) => {
            const d = new Date(); d.setDate(d.getDate()+days);
            const val = d.toISOString().split("T")[0];
            const active = f.due_date === val;
            return <button key={days} type="button" onClick={() => setF({...f, due_date: val})} style={{ flex:1, padding:"7px 2px", borderRadius:7, border:`1px solid ${active?"var(--blue)":"var(--border)"}`, background:active?"var(--blue)":"var(--white)", color:active?"#fff":"var(--text2)", fontSize:11, fontWeight:active?600:400, cursor:"pointer", fontFamily:"var(--sans)" }}>{label}</button>;
          })}
        </div>
        {f.due_date && <div style={{ fontSize:11, color:"var(--text3)", marginTop:4 }}>Due: {new Date(f.due_date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>}
      </div>

      <div style={{ margin:"0 12px", background:"var(--white)", borderRadius:"0 0 var(--rl) var(--rl)", border:"1px solid var(--border)", borderTop:"none" }}>
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
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <button onClick={() => mobDec(i)} style={{ width:44, height:44, border:"1.5px solid var(--border)", borderRadius:10, background:"var(--bg)", fontSize:22, cursor:"pointer", color:"var(--text2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontWeight:300 }}>−</button>
                <span key={`qty-${i}-${l.qty}`} className="qty-flash" style={{ width:64, height:44, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, fontFamily:"var(--mono)", color:"var(--text)" }}>{l.qty}</span>
                <button onClick={() => mobInc(i)} style={{ width:44, height:44, border:"1.5px solid var(--blue)", borderRadius:10, background:"var(--blue)", fontSize:22, cursor:"pointer", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontWeight:300 }}>+</button>
              </div>
              <button onClick={() => mobRemoveLine(i)} style={{ background:"var(--red-lt)", border:"none", borderRadius:8, padding:"8px 14px", color:"var(--red)", fontSize:12, fontWeight:600, cursor:"pointer" }}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── ADD PRODUCT — compact, lives inside the products card ── */}
      <div style={{ margin:"8px 12px 0", background:"var(--white)", borderRadius:"var(--rl)", border:"1px solid var(--border)", overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom: mobActiveLines.length > 0 ? "1px solid var(--border)" : "none" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px" }}>Products {mobActiveLines.length > 0 ? `(${mobActiveLines.length})` : ""}</div>
          <button onClick={() => setMobPickerOpen(true)} style={{ display:"flex", alignItems:"center", gap:5, background:"var(--blue)", border:"none", borderRadius:7, padding:"6px 12px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"var(--sans)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Product
          </button>
        </div>
        {mobActiveLines.length === 0 && (
          <div style={{ padding:"20px", textAlign:"center", color:"var(--text3)", fontSize:12 }}>
            <div style={{ fontSize:24, marginBottom:6 }}>📦</div>
            <div style={{ fontWeight:500 }}>No products yet</div>
            <div style={{ fontSize:11, marginTop:3 }}>Tap Add Product above to get started</div>
          </div>
        )}
      </div>

      <details style={{ margin:"8px 12px 0", background:"var(--white)", borderRadius:"var(--rl)", border:"1px solid var(--border)", overflow:"hidden" }}>
        <summary style={{ padding:"12px 16px", fontSize:12, fontWeight:600, color:"var(--text2)", cursor:"pointer", listStyle:"none", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <span>More options</span>
          <span style={{ fontSize:10, color:"var(--text3)", fontWeight:400 }}>Status · Invoice date · Notes ▾</span>
        </summary>
        <div style={{ padding:"0 16px 16px", borderTop:"1px solid var(--border)" }}>
          <div style={{ marginTop:12 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Status</label><select className="il-input" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
          <div style={{ marginTop:10 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Invoice Date</label><input className="il-input" type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
          <div style={{ marginTop:10 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Notes</label><input className="il-input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Any notes..." /></div>
        </div>
      </details>

      <div style={{ position:"fixed", bottom:76, left:0, right:0, background:"var(--white)", borderTop:"1px solid var(--border)", padding:"12px 16px", zIndex:100, boxShadow:"0 -4px 20px rgba(0,0,0,.08)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:13 }}>
          <span style={{ color:"var(--text2)" }}>{mobActiveLines.length} items · Subtotal {fmt(subtotal)}</span>
          <span style={{ color:"var(--text3)" }}>VAT {fmt(vatTotal)}</span>
        </div>
        {/* Hint when CTA is disabled */}
        {(!f.customer || !mobActiveLines.length) && (
          <div style={{ fontSize:11, color:"var(--text3)", textAlign:"center", marginBottom:6 }}>
            {!f.customer ? "👆 Select a customer to continue" : "👆 Add at least one product"}
          </div>
        )}
        <button onClick={save} disabled={saving || !f.customer || !mobActiveLines.length} style={{ width:"100%", background:(!f.customer || !mobActiveLines.length) ? "var(--border2)" : "linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", borderRadius:"var(--rl)", padding:"16px", color:(!f.customer || !mobActiveLines.length) ? "var(--text3)" : "#fff", fontSize:16, fontWeight:700, cursor:(!f.customer || !mobActiveLines.length) ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:(!f.customer || !mobActiveLines.length) ? "none" : "0 4px 14px rgba(37,99,235,.35)" }}>
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
        <div className="fgrp"><label style={{ color: submitted && !f.customer ? "var(--red)" : undefined }}>Customer *</label><SearchDropdown placeholder="Search customers..." items={customers} onSelect={c => setF({ ...f, customer: c.name })} onCreateNew={quickAddCustomer} />{submitted && !f.customer && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>Please select a customer</div>}</div>
        <div className="fgrp"><label>Status</label><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
        <div className="fgrp"><label>Invoice Date</label><input type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
        <div className="fgrp">
          <label>Due Date</label>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",gap:6}}>
              {[{label:"Today",days:0},{label:"7 days",days:7},{label:"14 days",days:14},{label:"30 days",days:30}].map(({label,days})=>{
                const d = new Date(); d.setDate(d.getDate()+days);
                const val = d.toISOString().split("T")[0];
                const active = f.due_date === val;
                return <button key={days} type="button" onClick={()=>setF({...f,due_date:val})} style={{flex:1,padding:"5px 0",borderRadius:6,border:"1px solid "+(active?"var(--blue)":"var(--border)"),background:active?"var(--blue)":"var(--white)",color:active?"#fff":"var(--text2)",fontSize:11,fontWeight:active?600:400,cursor:"pointer",fontFamily:"var(--sans)"}}>{label}</button>;
              })}
            </div>
            <input type="date" value={f.due_date} onChange={e=>setF({...f,due_date:e.target.value})} style={{fontSize:13}} className={f.due_date && f.invoice_date && f.due_date < f.invoice_date ? "inp-error" : f.due_date ? "inp-valid" : ""} />
            {f.due_date && f.invoice_date && f.due_date < f.invoice_date && (
              <div className="field-error-msg">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Due date cannot be before the invoice date
              </div>
            )}
          </div>
        </div>
        <div className="fgrp full"><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Any notes for this invoice..." /></div>
      </div>
      <div style={{ borderTop: "0.5px solid var(--border)" }}>
        <div className="il-header">{["Product / Description", "Qty", "Unit Price", "VAT", "Total", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</span>)}</div>
        {lines.map((l, i) => (
          <div key={`${i}-${l.product_id||"empty"}`} className="il-line">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <SearchDropdown key={`line-${i}-${l.product_id||"empty"}`} placeholder="Search products..." items={products} onSelect={async p => {
                      // Check for customer-specific price first, then do single atomic update
                      let customPrice = null;
                      const custName = f?.customer || f?.customer_name;
                      if (custName) {
                        const contact = contacts?.find(c => c.name === custName);
                        if (contact) {
                          const prices = await sb.get(token, "customer_prices", `contact_id=eq.${contact.id}&product_id=eq.${p.id}`);
                          if (Array.isArray(prices) && prices[0]) {
                            customPrice = prices[0].custom_price;
                          }
                        }
                      }
                      // Single atomic update — avoids stale state from multiple setLines calls
                      setLines(prev => {
                        const next = [...prev];
                        next[i] = {
                          ...next[i],
                          product_id: p.id,
                          description: p.name || "",
                          unit_price: customPrice !== null ? customPrice : (p.sale_price || ""),
                          vat_rate: p.vat_rate ?? 20,
                          unit: p.unit || "unit",
                          custom_price_applied: customPrice !== null,
                        };
                        return next;
                      });
                    }} displayKey="name" value={l.description} />
            </div>
            <input type="number" className="il-input mono" value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} />
            <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
              <input type="number" className="il-input mono" placeholder="0.00" value={l.unit_price} onChange={e => { updateLine(i, "unit_price", e.target.value); updateLine(i, "custom_price_applied", false); }} />
              {l.custom_price_applied && <span style={{ fontSize:10,fontWeight:600,color:"#2563eb",background:"#eff6ff",padding:"1px 6px",borderRadius:4,alignSelf:"flex-start" }}>★ Custom price</span>}
            </div>
            <select className="il-input" value={l.vat_rate} onChange={e => updateLine(i, "vat_rate", e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">Exempt</option></select>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmt((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0))}</span>
            <button className="ib" onClick={() => lines.length > 1 ? setLines(lines.filter((_, j) => j !== i)) : setLines([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        ))}
        <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfc", borderTop: "0.5px solid var(--border)" }}>
          <button className="btn bo bsm" onClick={() => setLines([...lines, { description: "", qty: 1, unit_price: "", vat_rate: 20 }])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Line</button>
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
function AgentDashboard({ invoices, setInvoices, contacts, profile, setPage, token, userId }) {
  const [viewInvoice, setViewInvoice] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [markingPaidId, setMarkingPaidId] = useState(null);
  const [payMethod, setPayMethod] = useState({});
  const [partPayId, setPartPayId] = useState(null);
  const [partPayAmount, setPartPayAmount] = useState({});
  const [agentSearch, setAgentSearch] = useState("");
  const myInv = invoices.filter(i => i.created_by === profile?.id);
  const filteredMyInv = agentSearch
    ? myInv.filter(i => i.customer?.toLowerCase().includes(agentSearch.toLowerCase()) || i.invoice_number?.toLowerCase().includes(agentSearch.toLowerCase()))
    : myInv;
  const myPaid = myInv.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const myPending = myInv.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const myOverdue = myInv.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const myCusts = contacts.filter(c => c.created_by === profile?.id);
  const name = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const markPaid = async (id, method) => {
    setMarkingPaidId(id);
    const inv = invoices.find(i => i.id === id);
    await sb.patch(token, "invoices", id, { status: "paid", payment_method: method || "cash", amount_paid: inv?.amount || 0, balance: 0 });
    const prevPaidAmt = parseFloat(inv?.amount_paid || 0);
    const remainingAmt = parseFloat(inv?.amount || 0) - prevPaidAmt;
    if (remainingAmt > 0) {
      const isUUID3 = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const markPayRow = { invoice_id: id, invoice_number: inv?.invoice_number, customer: inv?.customer, amount: remainingAmt, method: method || "cash", payment_date: new Date().toISOString().split("T")[0], notes: "Full payment", recorded_by_name: profile?.full_name || "Admin" };
    if (isUUID3(userId)) markPayRow.recorded_by = userId;
    const markPayRes = await sb.addPayment(token, markPayRow).catch(e => ({ error: e }));
    if (markPayRes?.error || markPayRes?.code) console.error("Payment ledger insert failed:", markPayRes);
    }
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: method || "cash", amount_paid: i.amount, balance: 0 } : i));
    setPayingId(null);
    setMarkingPaidId(null);
    if (inv) logAudit(token, userId, "payment_received", "invoice", id, `${inv.invoice_number} marked paid via ${method||"cash"} — £${inv.amount}`);
  };

  const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const recordPartPayment = async (inv, amount, method, payDate) => {
    const paid = parseFloat(amount);
    if (!paid || paid <= 0 || paid > 999999) { toast.warn("Enter a valid amount between £0.01 and £999,999."); return; }
    const resolvedMethod = method || payMethod[inv.id] || "cash";
    const resolvedDate = payDate || new Date().toISOString().split("T")[0];
    const prevPaid = parseFloat(inv.amount_paid || 0);
    const totalPaid = prevPaid + paid;
    const invAmount = parseFloat(inv.amount || 0);
    const balance = invAmount - totalPaid;
    const overpayment = totalPaid > invAmount ? totalPaid - invAmount : 0;
    const actualPaid = overpayment > 0 ? invAmount : totalPaid;
    const newStatus = balance <= 0 ? "paid" : "partial";
    const newBalance = Math.max(0, balance);
    await sb.patch(token, "invoices", inv.id, { amount_paid: actualPaid, balance: newBalance, status: newStatus, payment_method: resolvedMethod });
    const payRow = {
      invoice_id: inv.id, invoice_number: inv.invoice_number, customer: inv.customer,
      amount: paid, method: resolvedMethod,
      payment_date: resolvedDate,
      notes: overpayment > 0 ? `Full payment + £${overpayment.toFixed(2)} overpayment` : newStatus === "paid" ? "Full payment" : "Partial payment",
      recorded_by_name: profile?.full_name || "Admin"
    };
    if (isUUID(userId)) payRow.recorded_by = userId;
    const payRes = await sb.addPayment(token, payRow).catch(e => ({ error: e }));
    if (payRes?.error || payRes?.code) { /* payment ledger error suppressed */ }
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount_paid: actualPaid, balance: newBalance, status: newStatus } : i));
    setPartPayId(null);
    setPartPayAmount({});
  };

  if (isMobile()) {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayInv = myInv.filter(i => (i.invoice_date===todayStr || (i.created_at||"").startsWith(todayStr)));
    const todayCollected = todayInv.filter(i=>i.status==="paid").reduce((s,i)=>s+parseFloat(i.amount||0),0);
    const myOutstanding = myInv.filter(i => i.status!=="paid" && i.status!=="draft");
    const myOverdueInv = myInv.filter(i => i.status==="overdue").sort((a,b)=>new Date(a.due_date||a.invoice_date)-new Date(b.due_date||b.invoice_date));
    const recentInvoices = [...myInv].sort((a,b)=>new Date(b.created_at||b.invoice_date)-new Date(a.created_at||a.invoice_date)).slice(0,5);
    const phoneFor = (custName) => contacts.find(c=>c.name===custName)?.phone;
    const waLink = (phone, msg) => `https://wa.me/${(phone||"").replace(/\s+/g,"").replace(/^0/,"44")}?text=${encodeURIComponent(msg)}`;
    return (
      <div>
        {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} contacts={contacts} token={token} profile={profile}
          onStatusChange={async (id, status) => { await sb.patch(token, "invoices", id, { status }); setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i)); setViewInvoice(prev => prev?.id === id ? { ...prev, status } : prev); }}
          onLogPartPay={(inv, amt, method, newBal) => logAudit(token, userId, "part_payment", "invoice", inv.id, `${inv.invoice_number} — £${amt.toFixed(2)} received via ${method}. Remaining: £${newBal.toFixed(2)}`)}
        />}
        <div style={{ display:"flex", flexDirection:"column", gap:18, paddingBottom:8 }}>
          <div style={{ background:"linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", borderRadius:"var(--rl)", padding:"20px 18px", color:"#fff" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.4px", textTransform:"uppercase", color:"rgba(165,180,252,.8)", marginBottom:6 }}>{greeting}, {name}</div>
            <div style={{ display:"flex", gap:24 }}>
              <div>
                <div style={{ fontSize:24, fontWeight:900, letterSpacing:"-1px" }}>{todayInv.length}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.55)" }}>Invoices today</div>
              </div>
              <div>
                <div style={{ fontSize:24, fontWeight:900, letterSpacing:"-1px" }}>{fmt(todayCollected)}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.55)" }}>Collected today</div>
              </div>
            </div>
          </div>

          {myOverdueInv.length > 0 && (() => { const top = myOverdueInv[0]; const phone = phoneFor(top.customer); const days = Math.max(0, Math.floor((new Date()-new Date(top.due_date||top.invoice_date))/(1000*60*60*24)));
            return (
              <div style={{ background:"var(--red-lt)", border:"1px solid #fecaca", borderRadius:"var(--rl)", padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
                <AlertCircle size={20} color="var(--red)" />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--red)" }}>{top.customer} — {fmt(top.balance||top.amount)}</div>
                  <div style={{ fontSize:12, color:"var(--text2)" }}>{days} day{days!==1?"s":""} overdue{myOverdueInv.length>1?` · +${myOverdueInv.length-1} more`:""}</div>
                </div>
                {phone && <a href={waLink(phone, `Hi ${top.customer}, this is a reminder that ${fmt(top.balance||top.amount)} (${top.invoice_number}) is overdue with Arkham Retail Ltd. Please arrange payment at your earliest convenience. Thank you.`)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                  style={{ flexShrink:0, padding:"8px 14px", borderRadius:8, background:"var(--red)", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none", minHeight:36, display:"flex", alignItems:"center" }}>Chase</a>}
              </div>
            );
          })()}

          {myOutstanding.length > 0 && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:10 }}>Outstanding</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {myOutstanding.slice(0,6).map(inv => {
                  const phone = phoneFor(inv.customer);
                  return (
                    <div key={inv.id} role="button" tabIndex={0} onClick={()=>setViewInvoice(inv)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setViewInvoice(inv);}}
                      style={{ background:"var(--white)", border:"1px solid var(--border)", borderRadius:"var(--rl)", padding:"14px 16px", boxShadow:"var(--sh)", cursor:"pointer", display:"flex", flexDirection:"column", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                        <span style={{ fontWeight:700, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inv.customer}</span>
                        <span style={{ fontWeight:800, fontSize:16, fontFamily:"var(--mono)", flexShrink:0, marginLeft:8 }}>{fmt(inv.status==="partial"?(inv.balance||0):inv.amount)}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                        <span className={"badge "+(inv.status==="overdue"?"b-red":"b-amber")}>{inv.status}</span>
                        {phone && <div style={{ display:"flex", gap:8 }}>
                          <a href={`tel:${phone}`} onClick={e=>e.stopPropagation()} style={{ width:36, height:36, borderRadius:8, border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text2)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></a>
                          <a href={waLink(phone, `Hi ${inv.customer}, this is a reminder that ${fmt(inv.status==="partial"?(inv.balance||0):inv.amount)} (${inv.invoice_number}) is ${inv.status} with Arkham Retail Ltd. Please arrange payment at your earliest convenience. Thank you.`)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                            style={{ width:36, height:36, borderRadius:8, border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", color:"#16a34a" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></a>
                        </div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Recent Invoices</div>
              <span role="button" tabIndex={0} onClick={()=>setPage("invoices")} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setPage("invoices");}} style={{ fontSize:12, fontWeight:600, color:"var(--blue)", cursor:"pointer" }}>View all</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {recentInvoices.map(inv => (
                <div key={inv.id} role="button" tabIndex={0} onClick={()=>setViewInvoice(inv)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setViewInvoice(inv);}}
                  style={{ background:"var(--white)", border:"1px solid var(--border)", borderRadius:"var(--rl)", padding:"14px 16px", boxShadow:"var(--sh)", cursor:"pointer", minHeight:64, display:"flex", flexDirection:"column", justifyContent:"center", gap:6 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                    <span style={{ fontWeight:700, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inv.customer}</span>
                    <span style={{ fontWeight:800, fontSize:16, fontFamily:"var(--mono)", flexShrink:0, marginLeft:8 }}>{inv.status==="partial"?fmt(inv.balance||0):fmt(inv.amount)}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                    <span style={{ fontSize:12, color:"var(--text3)" }}>{inv.invoice_number} · {fmtDate(inv.invoice_date)}</span>
                    <span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span>
                  </div>
                </div>
              ))}
              {recentInvoices.length===0 && <EmptyState icon="invoice" title="No invoices yet" sub="Create your first invoice to get started" />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} contacts={contacts} token={token} profile={profile}
        onStatusChange={async (id, status) => { await sb.patch(token, "invoices", id, { status }); setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i)); setViewInvoice(prev => prev?.id === id ? { ...prev, status } : prev); }}
        onLogPartPay={(inv, amt, method, newBal) => logAudit(token, userId, "part_payment", "invoice", inv.id, `${inv.invoice_number} — £${amt.toFixed(2)} received via ${method}. Remaining: £${newBal.toFixed(2)}`)}
      />}
      <div className="welcome-row">
        <div><div className="welcome-h">{greeting}, {name} 👋</div><div className="welcome-sub"><span className="trend-pill">Your personal dashboard</span></div></div>
        <div className="quick-actions">
          <div className="qa-btn" onClick={() => setPage("invoices")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Invoice</div>
          <div className="qa-btn" onClick={() => setPage("contacts")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>Add Customer</div>
        </div>
      </div>
      <div className="kgrid">
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--blue-lt)" }}><span style={{ color: "var(--blue)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span></div><span className="kpi-badge" style={{ background: "var(--blue-lt)", color: "#1e40af" }}>{myInv.length} total</span></div><div className="kpi-val">{myInv.length}</div><div className="kpi-label">My Invoices</div></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--green-lt)" }}><span style={{ color: "var(--green)" }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span></div><span className="kpi-badge" style={{ background: "var(--green-lt)", color: "var(--green-dk)" }}>Paid</span></div><div className="kpi-val" style={{ color: "var(--green)" }}>{fmt(myPaid)}</div><div className="kpi-label">Total Sales</div></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--amber-lt)" }}><span style={{ color: "var(--amber)" }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span></div><span className="kpi-badge" style={{ background: "var(--amber-lt)", color: "var(--amber-dk)" }}>Pending</span></div><div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(myPending)}</div><div className="kpi-label">Awaiting Payment</div></div>
        <div className="kpi"><div className="kpi-top"><div className="kpi-icon" style={{ background: "var(--purple-lt)" }}><span style={{ color: "var(--purple)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></div><span className="kpi-badge" style={{ background: "var(--purple-lt)", color: "var(--purple-dk)" }}>{myCusts.length}</span></div><div className="kpi-val" style={{ color: "var(--purple)" }}>{myCusts.length}</div><div className="kpi-label">My Customers</div></div>
      </div>
      {myOverdue > 0 && <div style={{ background: "var(--red-lt)", border: "0.5px solid #fca5a5", borderRadius: "var(--rl)", padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div style={{ fontWeight: 600, color: "var(--red-dk)", marginBottom: 2 }}>Overdue invoices: {fmt(myOverdue)}</div><div style={{ fontSize: 12, color: "var(--red-dk)", opacity: 0.7 }}>Please follow up with your customers</div></div></div>}
      <div className="card">
        <div className="ch">
          <div className="ct">My Invoices <span style={{fontSize:12,fontWeight:400,color:"var(--text3)",marginLeft:4}}>{filteredMyInv.length} of {myInv.length}</span></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{position:"relative"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",pointerEvents:"none"}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={agentSearch} onChange={e=>setAgentSearch(e.target.value)} placeholder="Search invoices..." style={{paddingLeft:28,paddingRight:agentSearch?26:10,height:30,border:"1px solid var(--border)",borderRadius:"var(--r)",fontSize:12,background:"var(--white)",color:"var(--text)",width:160,outline:"none"}} />
              {agentSearch && <button onClick={()=>setAgentSearch("")} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text3)",display:"flex",alignItems:"center",padding:0}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
            </div>
            <button className="btn bo bsm" onClick={() => setPage("invoices")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>View all</button>
          </div>
        </div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Customer</th><th>Invoice #</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {filteredMyInv.slice(0, 20).map(inv => (
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
                    <button className="btn bp bsm" disabled={markingPaidId === inv.id} onClick={() => markPaid(inv.id, payMethod[inv.id] || "cash")} style={{opacity: markingPaidId === inv.id ? 0.6 : 1, cursor: markingPaidId === inv.id ? "not-allowed" : "pointer"}}>
                      {markingPaidId === inv.id ? <div className="spin" style={{width:12,height:12,borderWidth:2}}/> : "✓"}
                    </button>
                    <button className="btn bo bsm" disabled={markingPaidId === inv.id} onClick={() => setPayingId(null)}>✕</button>
                  </div>
                ) : (
                    <button className="btn bp bsm" onClick={() => setPayingId(inv.id)}>Mark Paid</button>
                  )
                )}
              </div></td>
            </tr>
          ))}
          {filteredMyInv.length === 0 && <tr><td colSpan={5} className="empty">{agentSearch ? `No invoices found for "${agentSearch}"` : "No invoices yet — create your first one!"}</td></tr>}
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
function Dashboard({ accounts, invoices, setInvoices, contacts, products, profile, setPage, setPendingFilter, allProfiles, token, userId }) {
  const isAdmin = profile?.role === "admin";
  if (!isAdmin) return <AgentDashboard invoices={invoices} setInvoices={setInvoices} contacts={contacts} profile={profile} setPage={setPage} token={token} userId={userId} />;

  const [viewInvoice, setViewInvoice] = useState(null);
  const [overpaymentData, setOverpaymentData] = useState(null);

  // ── Computed metrics ──
  const revenue = accounts.filter(a => a.type === "Revenue").reduce((s, a) => s + a.balance, 0);
  const expenses = accounts.filter(a => a.type === "Expense").reduce((s, a) => s + a.balance, 0);
  const cash = accounts.find(a => a.code === "1000")?.balance || 0;
  // Total cash received — all amount_paid across every invoice
  const paid = invoices.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
  // Outstanding — sum of balance on non-paid invoices
  const unpaid = invoices.filter(i => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0);
  const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0);
  // Cash/bank collected — all payments by method across all invoices
  const cashCollected = invoices.reduce((s, i) => i.payment_method === "cash" ? s + parseFloat(i.amount_paid || 0) : s, 0);
  const bankCollected = invoices.reduce((s, i) => i.payment_method === "bank" ? s + parseFloat(i.amount_paid || 0) : s, 0);
  const net = revenue - expenses;
  
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
        {up ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>}
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
  const todayRevenue = invoices.filter(i => (i.invoice_date === todayStr || (i.created_at || "").startsWith(todayStr))).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const todayPaid = invoices.filter(i => i.status === "paid" && (i.invoice_date === todayStr || (i.created_at || "").startsWith(todayStr))).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const todayCount = invoices.filter(i => (i.invoice_date === todayStr || (i.created_at || "").startsWith(todayStr))).length;
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
  const drillToday = () => openDrill("Today's Invoices", invoices.filter(i=>(i.invoice_date===todayStr||(i.created_at||"").startsWith(todayStr))).map(i=>({ name:i.customer, code:i.invoice_number, value:fmt(i.amount), extra:i.status })), ["Customer","Invoice","Amount","Status"], `${todayCount} invoices today · Total: ${fmt(todayRevenue)}`);

  // ── AI Insights ──
  const insights = [
    overdueCount > 0 && { Icon: AlertCircle, color: "var(--red)", bg: "var(--red-lt)", text: `${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} totalling ${fmt(overdue)} — chase now` },
    lowStock.length > 0 && { Icon: Package, color: "var(--amber)", bg: "var(--amber-lt)", text: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} running low on stock — reorder soon` },
    pendingCount > 0 && { Icon: Clock, color: "var(--blue)", bg: "var(--blue-lt)", text: `${pendingCount} pending invoice${pendingCount > 1 ? "s" : ""} worth ${fmt(unpaid - overdue)} awaiting payment` },
    paidCount > 0 && { Icon: TrendingUp, color: "var(--green)", bg: "var(--green-lt)", text: `Average invoice value is ${fmt(avgInvoice)} — top performer this period` },
  ].filter(Boolean).slice(0, 3);

  if (isMobile()) {
    const totalRevenue = invoices.filter(i=>i.status!=="draft").reduce((s,i)=>s+parseFloat(i.amount||0),0);
    const recentInvoices = [...invoices].sort((a,b)=>new Date(b.created_at||b.invoice_date)-new Date(a.created_at||a.invoice_date)).slice(0,5);
    const kpiTiles = [
      { label:"Total Revenue", val:fmt(totalRevenue), accent:"#2563eb", onClick:()=>{setPendingFilter("all");setPage("invoices");} },
      { label:"Outstanding", val:fmt(unpaid), accent:"#ef4444", onClick:()=>{setPendingFilter("overdue");setPage("invoices");} },
      { label:"Collected", val:fmt(paid), accent:"#22c55e", onClick:()=>{setPendingFilter("paid");setPage("invoices");} },
      { label:"Pending", val:String(pendingCount), accent:"#f59e0b", onClick:()=>{setPendingFilter("pending");setPage("invoices");} },
      { label:"Today", val:fmt(todayRevenue), accent:"#7c3aed", onClick:()=>{setPendingFilter("all");setPage("invoices");} },
    ];
    return (
      <>
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} contacts={contacts} token={token} profile={profile}
        onStatusChange={async (id, status) => { await sb.patch(token, "invoices", id, { status }); setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i)); setViewInvoice(prev => prev?.id === id ? { ...prev, status } : prev); }} />}
      <div style={{ display:"flex", flexDirection:"column", gap:18, paddingBottom:8 }}>
        <div style={{ background:"linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", borderRadius:"var(--rl)", padding:"20px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.4px", textTransform:"uppercase", color:"rgba(165,180,252,.8)", marginBottom:6 }}>{greeting}, {name}</div>
          <div style={{ fontSize:32, fontWeight:900, letterSpacing:"-1px", marginBottom:6 }}>{fmt(totalRevenue)}</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.55)" }}>
            {fmt(unpaid)} outstanding{overdueCount>0?` · ${overdueCount} overdue`:""}
          </div>
        </div>

        {overdueCount > 0 && (
          <div role="button" tabIndex={0} onClick={()=>{setPendingFilter("overdue");setPage("invoices");}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){setPendingFilter("overdue");setPage("invoices");}}}
            style={{ display:"flex", alignItems:"center", gap:12, background:"var(--red-lt)", border:"1px solid #fecaca", borderRadius:"var(--rl)", padding:"12px 16px", cursor:"pointer" }}>
            <AlertCircle size={20} color="var(--red)" />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--red)" }}>{overdueCount} overdue invoice{overdueCount>1?"s":""}</div>
              <div style={{ fontSize:12, color:"var(--text2)" }}>Totalling {fmt(overdue)} — tap to review</div>
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:4, marginRight:-16 }}>
          {kpiTiles.map(k => (
            <div key={k.label} role="button" tabIndex={0} onClick={k.onClick} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")k.onClick();}}
              style={{ flex:"0 0 auto", minWidth:128, background:"var(--white)", border:"1px solid var(--border)", borderRadius:"var(--rl)", padding:"14px 16px", boxShadow:"var(--sh)", cursor:"pointer", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px", marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:18, fontWeight:800, fontFamily:"var(--mono)" }}>{k.val}</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Recent Invoices</div>
            <span role="button" tabIndex={0} onClick={()=>setPage("invoices")} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setPage("invoices");}} style={{ fontSize:12, fontWeight:600, color:"var(--blue)", cursor:"pointer" }}>View all</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {recentInvoices.map(inv => (
              <div key={inv.id} role="button" tabIndex={0} onClick={()=>setViewInvoice(inv)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setViewInvoice(inv);}}
                style={{ background:"var(--white)", border:"1px solid var(--border)", borderRadius:"var(--rl)", padding:"14px 16px", boxShadow:"var(--sh)", cursor:"pointer", minHeight:64, display:"flex", flexDirection:"column", justifyContent:"center", gap:6 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                  <span style={{ fontWeight:700, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inv.customer}</span>
                  <span style={{ fontWeight:800, fontSize:16, fontFamily:"var(--mono)", flexShrink:0, marginLeft:8 }}>{inv.status==="partial"?fmt(inv.balance||0):fmt(inv.amount)}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                  <span style={{ fontSize:12, color:"var(--text3)" }}>{inv.invoice_number} · {fmtDate(inv.invoice_date)}</span>
                  <span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span>
                </div>
              </div>
            ))}
            {recentInvoices.length===0 && <EmptyState icon="invoice" title="No invoices yet" sub="Create your first invoice to get started" />}
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
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

      {/* ── Header Option C — dark banner with embedded KPIs ── */}
      <div className="page-hero" style={{ margin: "-26px -28px 24px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        {/* orb top-right */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        {/* orb bottom-left */}
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        {/* top row: greeting + quick actions */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Dashboard</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 4 }}>{greeting}, <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{name}</span></div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 8 }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              Arkham Retail Ltd
              <span style={{ background: "rgba(22,163,74,.2)", color: "#86efac", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>● Live</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <button onClick={() => setPage("invoices")} className="bfrost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.85)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Invoice
            </button>
            <button onClick={() => setPage("contacts")} className="bfrost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.85)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>Add Customer
            </button>
            <button onClick={() => setPage("delivery-notes")} className="bfrost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.85)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Delivery
            </button>
            <button onClick={() => setPage("analytics")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Analytics
            </button>
          </div>
        </div>
        {/* KPI strip embedded in banner */}
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)", position: "relative", zIndex: 1 }}>
          {[
            { label: "Total Revenue", val: fmt(invoices.filter(i=>i.status!=="draft").reduce((s,i)=>s+parseFloat(i.amount||0),0)), delta: revTrend !== null ? `${revTrend >= 0 ? "+" : ""}${revTrend}% vs last month` : `${invoices.filter(i=>i.status!=="draft").length} invoices`, deltaColor: revTrend !== null && revTrend >= 0 ? "#86efac" : "#fca5a5", onClick: () => { setPendingFilter("all"); setPage("invoices"); }, accent: "#2563eb" },
            { label: "Outstanding", val: fmt(unpaid), delta: `${overdueCount} overdue · ${pendingCount} pending`, deltaColor: overdueCount > 0 ? "#fca5a5" : "rgba(255,255,255,.35)", onClick: () => { setPendingFilter("overdue"); setPage("invoices"); }, accent: "#ef4444" },
            { label: "Collected", val: fmt(paid), delta: (() => { const tot = invoices.filter(i=>i.status!=="draft").reduce((s,i)=>s+parseFloat(i.amount||0),0); return tot > 0 ? `${Math.round(paid/tot*100)}% collection rate` : "0% collection rate"; })(), deltaColor: "rgba(255,255,255,.35)", onClick: () => { setPendingFilter("paid"); setPage("invoices"); }, accent: "#22c55e" },
            { label: "Cash Collected", val: fmt(cashCollected), delta: `${invoices.filter(i=>i.status==="paid"&&i.payment_method==="cash").length} cash payments`, deltaColor: "rgba(255,255,255,.35)", onClick: () => { setPendingFilter("paid"); setPage("invoices"); }, accent: "#22c55e" },
          ].map((k, i) => (
            <div key={i} onClick={k.onClick} style={{ padding: "14px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", cursor: "pointer", transition: "all .15s", borderTop: "3px solid transparent" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop=`3px solid ${k.accent}`; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderTop="3px solid transparent"; }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 5 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", letterSpacing: "-.5px", marginBottom: 3 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: k.deltaColor }}>{k.delta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Insights strip ── */}
      {insights.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {insights.map((insight, i) => {
            const InsightIcon = insight.Icon;
            return (
              <div key={i} onClick={() => i === 0 ? drillOutstanding() : i === 1 ? drillLowStock() : drillOutstanding()} style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 12, background: "#0d1829", border: `1px solid ${insight.color}33`, borderLeft: `3px solid ${insight.color}`, borderRadius: "var(--rl)", padding: "12px 16px", cursor: "pointer", transition: "all .18s", boxShadow: `0 2px 12px ${insight.color}11` }} onMouseEnter={e => { e.currentTarget.style.background="#111c35"; e.currentTarget.style.boxShadow=`0 4px 20px ${insight.color}22`; }} onMouseLeave={e => { e.currentTarget.style.background="#0d1829"; e.currentTarget.style.boxShadow=`0 2px 12px ${insight.color}11`; }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: insight.color + "20", border: `1px solid ${insight.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <InsightIcon size={17} color={insight.color} strokeWidth={2}/>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", lineHeight: 1.5, fontWeight: 500 }}>{insight.text}</div>
              </div>
            );
          })}
        </div>
      )}


      {/* ── Stat pills row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 20 }} className="stat-pills-grid">
        {[
          { label: "Customers", val: customers.length, Icon: Users, color: "var(--blue)", onClick: drillCustomers },
          { label: "Products", val: products.length, Icon: ShoppingBag, color: "var(--purple)", onClick: drillProducts },
          { label: "Low Stock", val: lowStock.length, Icon: AlertTriangle, color: lowStock.length > 0 ? "var(--red)" : "var(--green)", onClick: drillLowStock },
          { label: "Cash Collected", val: fmt(cashCollected), Icon: Landmark, color: "var(--green)", onClick: () => openDrill("Cash Collections", invoices.filter(i=>i.status==="paid"&&i.payment_method==="cash").map(i=>({ name:i.customer, code:i.invoice_number, value:fmt(i.amount), extra:fmtDate(i.invoice_date) })), ["Customer","Invoice","Amount","Date"], `${invoices.filter(i=>i.status==="paid"&&i.payment_method==="cash").length} cash payments · Total: ${fmt(cashCollected)}`) },
          { label: "Today's Invoices", val: fmt(todayRevenue), Icon: Sun, color: "var(--amber)", onClick: () => openDrill("Today's Invoices", invoices.filter(i=>(i.invoice_date===todayStr||(i.created_at||"").startsWith(todayStr))).map(i=>({ name:i.customer, code:i.invoice_number, value:fmt(i.amount), extra:i.status })), ["Customer","Invoice","Amount","Status"], `${todayCount} invoices today · Total: ${fmt(todayRevenue)}`) },
        ].map(pill => {
          const PillIcon = pill.Icon;
          return (
            <div key={pill.label} onClick={pill.onClick} style={{ background: "var(--white)", border: "1px solid var(--border)", borderTop: "2px solid " + pill.color, borderRadius: "var(--rl)", padding: "14px 16px", boxShadow: "var(--sh)", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all .18s" }} onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)"; }} onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="var(--sh)"; }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: pill.color + "15", border: "1px solid " + pill.color + "30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PillIcon size={17} color={pill.color} strokeWidth={2}/>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500, marginBottom: 2 }}>{pill.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px" }}>{pill.val}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Revenue Chart Widget ── */}
      {(() => {
        const months = Array.from({length:6},(_,i)=>{
          const d = new Date(new Date().getFullYear(), new Date().getMonth()-5+i, 1);
          const lbl = d.toLocaleDateString("en-GB",{month:"short"});
          const mPaid = invoices.filter(inv=>{
            const id = new Date(inv.invoice_date||inv.created_at);
            return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear();
          }).reduce((s,i)=>s+parseFloat(i.amount_paid||0),0);
          const mPending = invoices.filter(inv=>{
            const id = new Date(inv.invoice_date||inv.created_at);
            return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear()&&inv.status!=="paid"&&inv.status!=="draft";
          }).reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0);
          return {lbl, Collected: Math.round(mPaid*100)/100, Pending: Math.round(mPending*100)/100};
        });
        const totalPaid6 = months.reduce((s,m)=>s+m.Collected,0);
        const totalPend6 = months.reduce((s,m)=>s+m.Pending,0);
        const bestMonth = months.reduce((a,b)=>b.Collected>a.Collected?b:a,months[0]);
        const ChartTooltip = ({ active, payload, label }) => {
          if (!active || !payload || !payload.length) return null;
          return (
            <div style={{background:"#0d1829",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,padding:"10px 14px",fontSize:12}}>
              <div style={{color:"rgba(255,255,255,.5)",marginBottom:6,fontWeight:600}}>{label}</div>
              {payload.map(p=>(
                <div key={p.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <div style={{width:8,height:8,borderRadius:2,background:p.color}}/>
                  <span style={{color:"rgba(255,255,255,.7)"}}>{p.name}:</span>
                  <span style={{color:"#fff",fontWeight:700}}>£{(p.value||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
              ))}
            </div>
          );
        };
        return (
          <div className="card" style={{marginBottom:18}}>
            <div className="ch">
              <div>
                <div className="ct">Revenue Overview</div>
                <div className="cs">6-month performance · {new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</div>
              </div>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:"#818cf8"}}/>Collected
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:"#f59e0b"}}/>Pending
                </div>
                <button className="btn bo bsm" onClick={()=>setPage("admin-reports")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>Reports</button>
              </div>
            </div>
            <div style={{padding:"4px 24px 20px"}}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={months} margin={{top:10,right:10,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="lbl" tick={{fontSize:11,fill:"var(--text3)"}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>v===0?"£0":"£"+Math.round(v/1000)+"k"} tick={{fontSize:10,fill:"var(--text3)"}} axisLine={false} tickLine={false} width={40}/>
                  <Tooltip content={ChartTooltip}/>
                  <Area type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gradPending)" strokeOpacity={0.7} dot={false} activeDot={{r:4,fill:"#f59e0b"}}/>
                  <Area type="monotone" dataKey="Collected" stroke="#818cf8" strokeWidth={2} fill="url(#gradCollected)" dot={{r:3,fill:"#818cf8",strokeWidth:0}} activeDot={{r:5,fill:"#818cf8"}}/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginTop:16,paddingTop:16,borderTop:"1px solid var(--border)"}}>
                <div>
                  <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:3}}>6-Month Collected</div>
                  <div style={{fontSize:18,fontWeight:700,color:"#818cf8"}}>{fmt(totalPaid6)}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:3}}>6-Month Pending</div>
                  <div style={{fontSize:18,fontWeight:700,color:"var(--amber)"}}>{fmt(totalPend6)}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:3}}>Best Month</div>
                  <div style={{fontSize:18,fontWeight:700,color:"var(--blue)"}}>{bestMonth?.lbl} · {fmt(bestMonth?.Collected||0)}</div>
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
            <button className="btn bo bsm" onClick={() => setPage("invoices")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>View all</button>
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
                    <td className="hm" style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>{inv.invoice_number}</td>
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
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "16px 18px", boxShadow: "var(--sh)", overflow: "hidden", minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Revenue Breakdown</div>
            {[
              { label: "Collected", val: paid, total: revenue, color: "var(--green)", onClick: drillPaid },
              { label: "Pending", val: unpaid - overdue, total: revenue, color: "var(--amber)", onClick: drillOutstanding },
              { label: "Overdue", val: overdue, total: revenue, color: "var(--red)", onClick: drillOutstanding },
            ].map(r => (
              <div key={r.label} onClick={r.onClick} style={{ marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.color, whiteSpace: "nowrap", flexShrink: 0 }}>{fmt(r.val)}</span>
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
            {(() => {
              const sorted = [...invoices].sort((a, b) => (b.created_at || "") > (a.created_at || "") ? 1 : -1);
              const methodIcon = m => ({ cash: "💵", bank: "🏦", card: "💳", cheque: "📝" }[m] || "");
              const invItems = sorted.slice(0, 6).map(inv => {
                const isPaid = inv.status === "paid";
                const isOverdue = inv.status === "overdue";
                const isPartial = inv.status === "partial";
                return {
                  key: inv.id,
                  Icon: isPaid ? CheckCircle2 : FileText,
                  color: isPaid ? "var(--green)" : isOverdue ? "var(--red)" : isPartial ? "var(--amber)" : "#818cf8",
                  bg: isPaid ? "var(--green-lt)" : isOverdue ? "var(--red-lt)" : isPartial ? "var(--amber-lt)" : "rgba(129,140,248,.12)",
                  title: isPaid ? `Payment received ${methodIcon(inv.payment_method)}` : isOverdue ? "Invoice overdue" : isPartial ? "Partial payment" : "Invoice created",
                  sub: `${inv.customer} · ${inv.invoice_number}`,
                  amt: fmt(inv.amount),
                  amtColor: isPaid ? "var(--green)" : isOverdue ? "var(--red)" : "var(--text2)"
                };
              });
              const stockItems = lowStock.slice(0, 2).map(p => ({
                key: "s-" + p.id,
                Icon: AlertTriangle, color: "var(--amber)", bg: "var(--amber-lt)",
                title: "Low stock alert",
                sub: `${p.name} · ${p.stock_qty} ${p.unit || "units"} remaining`,
                amt: null
              }));
              const all = [...invItems, ...stockItems].slice(0, 6);
              if (!all.length) return <div className="empty">No recent activity</div>;
              return all.map(item => {
                const ActIcon = item.Icon;
                return (
                  <div key={item.key} className="act-item">
                    <div className="act-icon" style={{ background: item.bg }}>
                      <ActIcon size={16} color={item.color} strokeWidth={2}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="act-title">{item.title}</div>
                      <div className="act-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</div>
                    </div>
                    {item.amt && <span className="act-amt" style={{ color: item.amtColor }}>{item.amt}</span>}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* ── Agent Leaderboard ── */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="ch">
          <div><div className="ct">🏆 Agent Leaderboard</div><div className="cs">Ranked by total sales value</div></div>
          <button className="btn bo bsm" onClick={() => setPage("agent-report")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>Full report</button>
        </div>
        <div className="tw">
          <table>
            <thead className="lb-thead"><tr><th>#</th><th>Agent</th><th className="hm">Invoices</th><th>Total Sales</th><th className="hm">Paid</th><th>Performance</th></tr></thead>
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
                  <tr key={agent.id} className="lb-tr">
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
    {overpaymentData && <OverpaymentModal
      inv={overpaymentData.inv}
      overpayment={overpaymentData.overpayment}
      outstandingInvoices={overpaymentData.outstandingInvoices}
      token={token}
      userId={userId}
      profile={profile}
      onClose={() => setOverpaymentData(null)}
      onAllocated={(id, totalPaid, balance, status) => {
        setInvoices(prev => prev.map(i => i.id === id ? { ...i, amount_paid: totalPaid, balance, status } : i));
        setOverpaymentData(null);
      }}
      onCredited={() => setOverpaymentData(null)}
    />}
    {viewInvoice && <InvoiceModal
      invoice={viewInvoice}
      onClose={() => setViewInvoice(null)}
      contacts={contacts}
      token={token}
      profile={profile}
      onStatusChange={async (id, status) => {
        await sb.patch(token, "invoices", id, { status });
        setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
        setViewInvoice(prev => prev?.id === id ? { ...prev, status } : prev);
      }}
      onPartPay={async (inv, amt, method, payDate) => {
        const prevPaid = parseFloat(inv.amount_paid || 0);
        const totalPaid = prevPaid + amt;
        const balance = parseFloat(inv.amount || 0) - totalPaid;
        const newStatus = balance <= 0 ? "paid" : "partial";
        await sb.patch(token, "invoices", inv.id, { amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus, payment_method: method || "cash" });
        const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        const payRow = { invoice_id: inv.id, invoice_number: inv.invoice_number, customer: inv.customer, amount: amt, method: method || "cash", payment_date: new Date().toISOString().split("T")[0], notes: newStatus === "paid" ? "Final payment" : "Partial payment", recorded_by_name: profile?.full_name || "Admin" };
        if (isUUID(userId)) payRow.recorded_by = userId;
        await sb.addPayment(token, payRow).catch(e => console.error("Payment ledger insert failed:", e));
        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus } : i));
        setViewInvoice(prev => prev?.id === inv.id ? { ...prev, amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus } : prev);
      }}
    />}
  </>);
}

// ── INVOICES ──────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Invoices                                                   │
// │ Invoice list — filter, sort, mark paid, part pay, edit     │
// └────────────────────────────────────────────────────────────┘
function Invoices({ invoices, setInvoices, contacts, products, token, userId, profile, allProfiles = [], pendingInvoiceView, onClearPending, pendingFilter, onClearFilter, triggerNewInvoice, onTriggerHandled }) {
  const [overpaymentData, setOverpaymentData] = useState(null);
  const [bulkPayCustomer, setBulkPayCustomer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState({});
  const [mobMarkPaidInv, setMobMarkPaidInv] = useState(null);
  const [mobMarkPaidMethod, setMobMarkPaidMethod] = useState("cash");
  const [mobMarkPaidSaving, setMobMarkPaidSaving] = useState(false);
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
      const result = await sendEmail({ to: cust.email, subject: `Payment Reminder — ${inv.invoice_number} — ${COMPANY.name}`, html, token });
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
    if (pendingFilter) { setFilterStatus(pendingFilter); onClearFilter && onClearFilter(); }
    if (triggerNewInvoice) { setShowForm(true); onTriggerHandled && onTriggerHandled(); }
  }, [pendingInvoiceView, pendingFilter, triggerNewInvoice]);

  const markPaid = async (id, method) => {
    const inv = invoices.find(i => i.id === id);
    await sb.patch(token, "invoices", id, { status: "paid", payment_method: method || "cash", amount_paid: inv?.amount || 0, balance: 0 });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: method || "cash", amount_paid: i.amount, balance: 0 } : i));
    toast.success("Invoice marked as paid");
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

  const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const recordPartPayment = async (inv, amount, method, payDate) => {
    const paid = parseFloat(amount);
    if (!paid || paid <= 0 || paid > 999999) { toast.warn("Enter a valid amount between £0.01 and £999,999."); return; }
    const resolvedMethod = method || payMethod[inv.id] || "cash";
    const resolvedDate = payDate || new Date().toISOString().split("T")[0];
    const prevPaid = parseFloat(inv.amount_paid || 0);
    const totalPaid = prevPaid + paid;
    const invAmount = parseFloat(inv.amount || 0);
    const balance = invAmount - totalPaid;
    const overpayment = totalPaid > invAmount ? totalPaid - invAmount : 0;
    const actualPaid = overpayment > 0 ? invAmount : totalPaid;
    const newStatus = balance <= 0 ? "paid" : "partial";
    const newBalance = Math.max(0, balance);
    await sb.patch(token, "invoices", inv.id, { amount_paid: actualPaid, balance: newBalance, status: newStatus, payment_method: resolvedMethod });
    const payRow = {
      invoice_id: inv.id, invoice_number: inv.invoice_number, customer: inv.customer,
      amount: paid, method: resolvedMethod,
      payment_date: resolvedDate,
      notes: overpayment > 0 ? `Full payment + £${overpayment.toFixed(2)} overpayment` : newStatus === "paid" ? "Full payment" : "Partial payment",
      recorded_by_name: profile?.full_name || "Admin"
    };
    if (isUUID(userId)) payRow.recorded_by = userId;
    const payRes = await sb.addPayment(token, payRow).catch(e => ({ error: e }));
    if (payRes?.error || payRes?.code) { /* payment ledger error suppressed */ }
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount_paid: actualPaid, balance: newBalance, status: newStatus } : i));
    setPartPayId(null);
    setPartPayAmount({});
    if (overpayment > 0) {
      const outstanding = invoices.filter(i => i.customer === inv.customer && i.id !== inv.id && (i.status === "pending" || i.status === "overdue" || i.status === "partial"));
      setOverpaymentData({ inv: { ...inv, amount_paid: actualPaid }, overpayment, outstandingInvoices: outstanding });
    }
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
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  const downloadDNpdf = (html, dn_number) => {
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  const totals = {
    paid: invoices.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0),
    pending: invoices.filter(i => i.status === "pending").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0),
    overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0),
    partial: invoices.filter(i => i.status === "partial").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0),
  };
  const filtered = invoices.filter(i => {
    const matchStatus = filterStatus === "all" || i.status === filterStatus || (filterStatus === "pending" && i.status === "partial");
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
        onSaved={(updatedFields) => {
          if (updatedFields) setInvoices(prev => prev.map(i => i.id === editInvoice.id ? { ...i, ...updatedFields } : i));
          sb.get(token, "invoices", "order=created_at.desc&limit=1000").then(d => Array.isArray(d) && setInvoices(d));
          setEditInvoice(null);
        }}
      />}
      {overpaymentData && <OverpaymentModal
        inv={overpaymentData.inv}
        overpayment={overpaymentData.overpayment}
        outstandingInvoices={overpaymentData.outstandingInvoices}
        token={token}
        userId={userId}
        profile={profile}
        onClose={() => setOverpaymentData(null)}
        onAllocated={(id, totalPaid, balance, status) => {
          setInvoices(prev => prev.map(i => i.id === id ? { ...i, amount_paid: totalPaid, balance, status } : i));
          setOverpaymentData(null);
        }}
        onCredited={() => setOverpaymentData(null)}
      />}
      {bulkPayCustomer && <BulkPaymentModal
        customer={bulkPayCustomer}
        invoices={invoices}
        token={token}
        userId={userId}
        profile={profile}
        onClose={() => setBulkPayCustomer(null)}
        onComplete={(allocs) => {
          setInvoices(prev => prev.map(inv => {
            const a = allocs.find(x => x.inv.id === inv.id);
            if (!a) return inv;
            return { ...inv, amount_paid: parseFloat(inv.amount) - a.newBalance, balance: a.newBalance, status: a.newStatus, payment_method: inv.payment_method };
          }));
          setBulkPayCustomer(null);
        }}
      />}
      {viewInvoice && <InvoiceModal
        invoice={viewInvoice}
        onClose={() => setViewInvoice(null)}
        contacts={contacts}
        token={token}
        profile={profile}
        onEdit={(inv) => { setEditInvoice(inv); setViewInvoice(null); }}
        onStatusChange={async (id, status) => {
          await sb.patch(token, "invoices", id, { status });
          setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
          setViewInvoice(prev => prev?.id === id ? { ...prev, status } : prev);
          const inv = invoices.find(i => i.id === id);
          if (inv) logAudit(token, userId, "status_changed", "invoice", id, `${inv.invoice_number} status changed to ${status.toUpperCase()} for ${inv.customer}`);
        }}
        onDuplicate={(inv) => {
          setViewInvoice(null);
          setShowForm(true);
        }}
        onPartPay={async (inv, amt, method, payDate) => {
          const prevPaid = parseFloat(inv.amount_paid || 0);
          const totalPaid = prevPaid + amt;
          const invAmount = parseFloat(inv.amount || 0);
          const balance = invAmount - totalPaid;
          const newStatus = balance <= 0 ? "paid" : "partial";
          const patchRes = await sb.patch(token, "invoices", inv.id, { amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus, payment_method: method || "cash" });
          if (patchRes?.code && !Array.isArray(patchRes)) throw new Error(patchRes?.message || "Failed to update invoice");
          const isUUID2 = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
          const invAmount2 = parseFloat(inv.amount || 0);
          const overpayment2 = totalPaid > invAmount2 ? totalPaid - invAmount2 : 0;
          const actualPaid2 = overpayment2 > 0 ? invAmount2 : totalPaid;
          const finalStatus2 = overpayment2 > 0 ? "paid" : newStatus;
          const finalBalance2 = overpayment2 > 0 ? 0 : Math.max(0, balance);
          const resolvedDate2 = payDate || new Date().toISOString().split("T")[0];
          const payRow2 = {
            invoice_id: inv.id, invoice_number: inv.invoice_number, customer: inv.customer,
            amount: amt, method: method || "cash",
            payment_date: resolvedDate2,
            notes: overpayment2 > 0 ? `Full payment + £${overpayment2.toFixed(2)} overpayment` : finalStatus2 === "paid" ? "Final payment" : "Partial payment",
            recorded_by_name: profile?.full_name || "Admin"
          };
          if (isUUID2(userId)) payRow2.recorded_by = userId;
          const payRes2 = await sb.addPayment(token, payRow2).catch(e => ({ error: e }));
          if (payRes2?.error || payRes2?.code) console.error("Payment ledger insert failed:", payRes2);
          setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount_paid: actualPaid2, balance: finalBalance2, status: finalStatus2 } : i));
          setViewInvoice(prev => prev?.id === inv.id ? { ...prev, amount_paid: actualPaid2, balance: finalBalance2, status: finalStatus2 } : prev);
          if (overpayment2 > 0) {
            const outstanding2 = invoices.filter(i => i.customer === inv.customer && i.id !== inv.id && (i.status === "pending" || i.status === "overdue" || i.status === "partial"));
            setOverpaymentData({ inv: { ...inv, amount_paid: actualPaid2 }, overpayment: overpayment2, outstandingInvoices: outstanding2 });
          }
        }}
        onLogPartPay={(inv, amt, method, newBal) => logAudit(token, userId, "part_payment", "invoice", inv.id, `${inv.invoice_number} — £${amt.toFixed(2)} received via ${method}. Remaining: £${newBal.toFixed(2)}`)}
      />}
      {/* ── Invoices Page Header ── */}
      <div className="page-hero" style={{ margin: "-26px -28px 0 -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Invoice Management</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Invoices & <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Payments</span></div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 6 }}>
              {invoices.length} total
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              {invoices.filter(i => i.status === "overdue").length} overdue
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              {filtered.length} shown
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search invoices..." style={{ paddingLeft: 29, paddingRight: 10, height: 32, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, fontSize: 12, outline: "none", color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.07)", width: 180, fontFamily: "var(--sans)" }} />
            </div>
            {profile?.role==="admin"&&<button onClick={() => setBulkPayCustomer("__pick__")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.1)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace:"nowrap", fontFamily:"var(--sans)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Bulk Payment
            </button>}
            <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #818cf8", background: "#818cf8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Invoice
            </button>
          </div>
        </div>
        {/* Stats strip — clickable filters */}
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)", position: "relative", zIndex: 1 }}>
          {[
            { label: "Paid", val: fmt(totals.paid), sub: `${invoices.filter(i=>i.status==="paid").length} invoices`, color: "#86efac", filter: "paid", accent: "#16a34a" },
            { label: "Pending", val: fmt(totals.pending + totals.partial), sub: `${invoices.filter(i=>i.status==="pending"||i.status==="partial").length} invoices`, color: "#fcd34d", filter: "pending|partial", accent: "#d97706" },
            { label: "Overdue", val: fmt(totals.overdue), sub: `${invoices.filter(i=>i.status==="overdue").length} invoices`, color: "#fca5a5", filter: "overdue", accent: "#dc2626" },
            { label: "Total Invoiced", val: fmt(totals.paid + totals.pending + totals.overdue + totals.partial), sub: `${invoices.length} all invoices`, color: "rgba(255,255,255,.35)", filter: "all", accent: "#2563eb" },
          ].map((k, i) => {
            const isActive = k.filter === "all" ? filterStatus === "all" : filterStatus === k.filter || (k.filter === "pending|partial" && (filterStatus === "pending" || filterStatus === "partial"));
            const handleClick = () => {
              if (k.filter === "pending|partial") { setFilterStatus(isActive ? "all" : "pending"); }
              else { setFilterStatus(isActive ? "all" : k.filter); }
            };
            return (
            <div key={i} onClick={handleClick}
              title={`Click to filter by ${k.label}`}
              style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", cursor: "pointer", transition: "all .15s", background: isActive ? "rgba(255,255,255,.08)" : "transparent", borderTop: `3px solid ${isActive ? k.accent : "transparent"}`, outline: isActive ? `1px solid ${k.accent}33` : "none" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop=`3px solid ${k.accent}`; }}
              onMouseLeave={e => { e.currentTarget.style.background=isActive?"rgba(255,255,255,.08)":"transparent"; e.currentTarget.style.borderTop=isActive?`3px solid ${k.accent}`:"3px solid transparent"; }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? k.color : "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{k.label}</span>
                {isActive
                  ? <span style={{ color: "#fff", fontSize: 9, fontWeight: 700, background: k.accent, padding: "2px 6px", borderRadius: 4, letterSpacing: ".3px" }}>ACTIVE ✕</span>
                  : <span style={{ color: "rgba(255,255,255,.3)", fontSize: 9 }}>↓ FILTER</span>}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: isActive ? k.color : "rgba(255,255,255,.5)" }}>{k.sub}</div>
            </div>
          );})}
        </div>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#0d1829", borderBottom: "1px solid rgba(99,102,241,.18)", padding: "5px 36px", margin: "0 -28px 16px", flexWrap: "wrap" }}>
        {[["all","All",invoices.length],["pending","Pending",invoices.filter(i=>i.status==="pending").length],["paid","Paid",invoices.filter(i=>i.status==="paid").length],["overdue","Overdue",invoices.filter(i=>i.status==="overdue").length],["draft","Draft",invoices.filter(i=>i.status==="draft").length]].map(([s, lbl, cnt]) => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "5px 13px", borderRadius: 7, border: "none", background: filterStatus === s ? "#818cf8" : "transparent", color: filterStatus === s ? "#fff" : "rgba(255,255,255,.45)", fontSize: 12, fontWeight: filterStatus === s ? 700 : 500, cursor: "pointer", fontFamily: "var(--sans)", display: "flex", alignItems: "center", gap: 5, transition: "all .15s", boxShadow: filterStatus === s ? "0 2px 8px rgba(129,140,248,.35)" : "none" }}>
            {lbl} <span style={{ background: filterStatus === s ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.08)", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: filterStatus === s ? "#fff" : "rgba(255,255,255,.4)" }}>{cnt}</span>
          </button>
        ))}
      </div>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 16px", background: "#0d1829", border: "1px solid rgba(129,140,248,.3)", borderRadius: 10, boxShadow: "0 4px 20px rgba(99,102,241,.15)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>{selectedIds.size} selected</span>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,.12)" }} />
          <button onClick={bulkMarkPaid} disabled={bulkLoading} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Mark Paid
          </button>
          <button onClick={bulkSendReminder} disabled={bulkLoading} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.75)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Send Reminder
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 12, cursor: "pointer", fontFamily: "var(--sans)" }}>Clear</button>
        </div>
      )}
      {showForm && !isMobile() && <InvoiceForm contacts={contacts} products={products} token={token} userId={userId} invoices={invoices} onSave={inv => { setInvoices(prev => { if (prev.find(i=>i.id===inv.id)) return prev; return [inv,...prev]; }); setTimeout(() => sb.get(token,"invoices","order=created_at.desc&limit=1000").then(d=>Array.isArray(d)&&setInvoices(d)), 1000); }} onClose={() => setShowForm(false)} />}
      {showForm && isMobile() && <ModalPortal><div style={{position:"fixed",inset:0,zIndex:500,background:"var(--bg)",overflowY:"auto"}}><InvoiceForm contacts={contacts} products={products} token={token} userId={userId} invoices={invoices} onSave={inv => { setInvoices(prev => { if (prev.find(i=>i.id===inv.id)) return prev; return [inv,...prev]; }); setTimeout(() => sb.get(token,"invoices","order=created_at.desc&limit=1000").then(d=>Array.isArray(d)&&setInvoices(d)), 1000); }} onClose={() => setShowForm(false)} /></div></ModalPortal>}
      <div className="card">
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{filtered.length} invoice{filtered.length!==1?"s":""}</div>
          {!isMobile() && <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setViewMode("table")} style={{ width:30,height:30,borderRadius:"var(--r)",border:"1px solid "+(viewMode==="table"?"var(--blue)":"var(--border)"),background:viewMode==="table"?"var(--blue-lt)":"var(--white)",color:viewMode==="table"?"var(--blue)":"var(--text3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg></button>
            <button onClick={() => setViewMode("card")} style={{ width:30,height:30,borderRadius:"var(--r)",border:"1px solid "+(viewMode==="card"?"var(--blue)":"var(--border)"),background:viewMode==="card"?"var(--blue-lt)":"var(--white)",color:viewMode==="card"?"var(--blue)":"var(--text3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
          </div>}
        </div>
        {(isMobile() || viewMode === "card") ? (
          isMobile() ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10, padding:12 }}>
            {filtered.map(inv => (
              <div key={inv.id} role="button" tabIndex={0}
                onClick={() => setViewInvoice(inv)}
                onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setViewInvoice(inv);}}
                style={{ background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:"14px 16px",boxShadow:"var(--sh)",cursor:"pointer",minHeight:64,display:"flex",flexDirection:"column",justifyContent:"center",gap:6 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
                  <span style={{ fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{inv.customer}</span>
                  <span style={{ fontWeight:800,fontSize:16,fontFamily:"var(--mono)",flexShrink:0,marginLeft:8 }}>
                    {inv.status === "partial" ? fmt(inv.balance || 0) : fmt(inv.amount)}
                  </span>
                </div>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
                  <span style={{ fontSize:12,color:"var(--text3)" }}>{inv.invoice_number} · {fmtDate(inv.invoice_date)}</span>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span>
                    {inv.status!=="paid" && (
                      <button aria-label="More actions" onClick={e=>{e.stopPropagation();setMobMarkPaidInv(inv);}}
                        style={{ width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--white)",color:"var(--text3)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length===0&&<EmptyState icon="invoice" title="No invoices" sub="No invoices match your current filter" />}
            {mobMarkPaidInv && (
              <ModalPortal>
                <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.5)" }} onClick={() => !mobMarkPaidSaving && setMobMarkPaidInv(null)}>
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"var(--white)", borderRadius:"16px 16px 0 0", paddingBottom:"max(20px,env(safe-area-inset-bottom))", boxShadow:"0 -4px 24px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
                    <div style={{ width:36, height:4, background:"var(--border2)", borderRadius:2, margin:"12px auto 0" }} />
                    <div style={{ padding:"14px 20px 4px" }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>Mark as Paid</div>
                      <div style={{ fontSize:12, color:"var(--text3)", marginTop:2 }}>{mobMarkPaidInv.invoice_number} · {mobMarkPaidInv.customer} · {fmt(mobMarkPaidInv.status==="partial"?(mobMarkPaidInv.balance||0):mobMarkPaidInv.amount)}</div>
                    </div>
                    <div style={{ padding:"12px 20px" }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Payment method</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                        {[["cash","Cash"],["card","Card"],["bank_transfer","Bank Transfer"],["cheque","Cheque"]].map(([val,lbl]) => (
                          <div key={val} role="button" tabIndex={0} onClick={() => setMobMarkPaidMethod(val)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setMobMarkPaidMethod(val);}}
                            style={{ padding:"12px 10px", borderRadius:10, border:"2px solid "+(mobMarkPaidMethod===val?"var(--blue)":"var(--border)"), background:mobMarkPaidMethod===val?"var(--blue-lt)":"var(--white)", color:mobMarkPaidMethod===val?"var(--blue)":"var(--text2)", fontSize:13, fontWeight:600, textAlign:"center", cursor:"pointer", minHeight:44, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {lbl}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:10, padding:"4px 20px 20px" }}>
                      <button className="btn bo" style={{ flex:1, minHeight:48 }} disabled={mobMarkPaidSaving} onClick={() => setMobMarkPaidInv(null)}>Cancel</button>
                      <button className="btn bp" style={{ flex:1, minHeight:48 }} disabled={mobMarkPaidSaving} onClick={async () => { setMobMarkPaidSaving(true); await markPaid(mobMarkPaidInv.id, mobMarkPaidMethod); setMobMarkPaidSaving(false); setMobMarkPaidInv(null); setMobMarkPaidMethod("cash"); }}>
                        {mobMarkPaidSaving ? "Saving..." : "Confirm Payment"}
                      </button>
                    </div>
                  </div>
                </div>
              </ModalPortal>
            )}
          </div>
          ) : (
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
          )
        ) : (
        <div className="tw" style={{overflowX:"clip"}}><table style={{minWidth:1000}}><thead className="inv-thead"><tr>
          <th style={{width:36}}><input type="checkbox" checked={selectedIds.size===filtered.length&&filtered.length>0} onChange={()=>toggleSelectAll()} style={{accentColor:"var(--blue)"}} /></th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("invoice_number")}>Invoice<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:3,opacity:0.4,flexShrink:0,verticalAlign:"middle"}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg></th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("customer")}>Customer<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:3,opacity:0.4,flexShrink:0,verticalAlign:"middle"}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg></th>
          <th className="hm" style={{cursor:"pointer"}} onClick={()=>sortToggle("invoice_date")}>Date<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:3,opacity:0.4,flexShrink:0,verticalAlign:"middle"}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg></th>
          <th className="hm">Due</th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("amount")}>Amount<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:3,opacity:0.4,flexShrink:0,verticalAlign:"middle"}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg></th>
          <th>Status</th>
          <th className="hm">Agent</th>
          <th className="hm">Updated</th>
          <th style={{textAlign:"right"}}>Actions</th>
        </tr></thead><tbody>
          {filtered.map(inv => (
            <tr key={inv.id} className="inv-tr" onClick={() => setViewInvoice(inv)}>
              <td style={{width:36}}><input type="checkbox" checked={selectedIds.has(inv.id)} onChange={e=>{e.stopPropagation();toggleSelect(inv.id);}} style={{accentColor:"var(--blue)"}} /></td>
              <td><span className="mono" style={{color:"var(--blue)",fontSize:12,fontWeight:600,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}} onClick={()=>setViewInvoice(inv)}>{inv.invoice_number}</span></td>
              <td>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div className="c-av hm" style={{background:["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][inv.customer?.charCodeAt(0)%5]||"#6366f1",flexShrink:0}}>{inv.customer?.[0]?.toUpperCase()}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{inv.customer}</div>
                    {contacts.find(x=>x.name===inv.customer)?.email
                      ? <div style={{fontSize:11,color:"var(--text3)"}}>{contacts.find(x=>x.name===inv.customer).email}</div>
                      : <div style={{fontSize:11,color:"#94a3b8"}}>No email</div>}
                  </div>
                </div>
              </td>
              <td className="hm" style={{fontSize:12,color:"var(--text2)"}}>{fmtShort(inv.invoice_date)}</td>
              <td className="hm">{(() => {
                if (!inv.due_date) return <span style={{fontSize:12,color:"var(--text3)"}}>—</span>;
                const dd = dueDelta(inv.due_date);
                if (inv.status==="paid") return <span style={{fontSize:12,color:"var(--text3)"}}>{fmtShort(inv.due_date)}</span>;
                if (dd < 0) return <span style={{fontSize:12,fontWeight:600,color:"var(--red)"}}>{fmtShort(inv.due_date)}<span style={{fontSize:10,marginLeft:3}}>↑{Math.abs(dd)}d</span></span>;
                if (dd <= 3) return <span style={{fontSize:12,fontWeight:600,color:"var(--amber)"}}>{fmtShort(inv.due_date)}<span style={{fontSize:10,marginLeft:3}}>{dd}d</span></span>;
                return <span style={{fontSize:12,color:"var(--text2)"}}>{fmtShort(inv.due_date)}</span>;
              })()}</td>
              <td>
                <div className="mono" style={{fontWeight:600,fontSize:13}}>{fmt(inv.amount)}</div>
                {inv.status==="partial"&&(
                  <div style={{marginTop:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text3)",marginBottom:3}}>
                      <span style={{color:"#16a34a"}}>£{(inv.amount_paid||0).toFixed(2)} paid</span>
                      <span style={{color:"var(--red)"}}>£{(inv.balance||0).toFixed(2)} owing</span>
                    </div>
                    <div style={{height:3,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:inv.amount>0?Math.round((inv.amount_paid||0)/inv.amount*100)+"%":"0%",background:"#16a34a",borderRadius:2}} />
                    </div>
                  </div>
                )}
                {inv.payment_method&&inv.status==="paid"&&<div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{inv.payment_method==="cash"?"💵":inv.payment_method==="bank"?"🏦":inv.payment_method==="card"?"💳":"📝"} {inv.payment_method}</div>}
              </td>
              <td><span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span></td>
              <td className="hm">{(()=>{
                const agent=(allProfiles||[]).find(p=>p.id===inv.created_by);
                const aname=agent?.full_name||"—";
                const col=["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444","#2563eb","#ec4899"][aname.charCodeAt(0)%7]||"#64748b";
                return <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:20,background:"var(--bg)",fontSize:11,color:"var(--text2)",fontWeight:500}}>
                  <div style={{width:16,height:16,borderRadius:"50%",background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{aname[0]?.toUpperCase()||"?"}</div>
                  {aname.split(" ")[0]}
                </div>;
              })()}</td>
              <td className="hm">{(()=>{
                const r=fmtRelative(inv.updated_at||inv.created_at);
                return <div style={{fontSize:11,color:"var(--text3)",lineHeight:1.5}}><div>{r.line1}</div><div>{r.line2}</div></div>;
              })()}</td>
              <td style={{textAlign:"right",whiteSpace:"nowrap"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                  <button onClick={()=>setViewInvoice(inv)} title="View" className="bicon" style={{width:28,height:28,borderRadius:6,border:"1px solid var(--blue-lt)",background:"var(--blue-lt)",color:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button onClick={()=>printDNFromInvoice(inv)} title="Delivery note" className="bicon" style={{width:28,height:28,borderRadius:6,border:"1px solid var(--border)",background:"var(--white)",color:"var(--text2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  </button>
                  {profile?.role==="admin"&&inv.status!=="paid"&&(
                    payingId===inv.id?(
                      <div style={{display:"flex",gap:3,alignItems:"center"}}>
                        <select style={{padding:"3px 5px",fontSize:11,border:"1px solid var(--border)",borderRadius:6,outline:"none",background:"var(--white)",color:"var(--text)"}} value={payMethod[inv.id]||"cash"} onChange={e=>setPayMethod(prev=>({...prev,[inv.id]:e.target.value}))}>
                          <option value="cash">💵 Cash</option><option value="bank">🏦 Bank</option><option value="card">💳 Card</option><option value="cheque">📝 Cheque</option>
                        </select>
                        <button onClick={()=>markPaid(inv.id,payMethod[inv.id]||"cash")} style={{padding:"4px 8px",borderRadius:6,background:"#16a34a",color:"#fff",border:"none",fontSize:11,fontWeight:600,cursor:"pointer"}}>✓</button>
                        <button onClick={()=>setPayingId(null)} style={{padding:"4px 6px",borderRadius:6,background:"var(--bg)",color:"var(--text2)",border:"1px solid var(--border)",fontSize:11,cursor:"pointer"}}>✕</button>
                      </div>
                    ):(
                      <button onClick={()=>setPayingId(inv.id)} title="Mark paid" className="bicon" style={{width:28,height:28,borderRadius:6,border:"1px solid #bbf7d0",background:"#f0fdf4",color:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    )
                  )}
                  {profile?.role==="admin"&&(
                    <button onClick={()=>deleteInvoice(inv)} title="Delete" className="bicon" style={{width:28,height:28,borderRadius:6,border:"1px solid #fecaca",background:"#fef2f2",color:"var(--red)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={10}><EmptyState icon="invoice" title={searchQ || filterStatus !== "all" ? "No invoices match" : "No invoices yet"} sub={searchQ || filterStatus !== "all" ? "Try adjusting your search or filter" : "Create your first VAT invoice to get started"} /></td></tr>}
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
function Contacts({ contacts, setContacts, token, userId, invoices = [], products = [], profile, triggerNewContact, onTriggerContactHandled }) {
  const [tab, setTab] = useState("customer");
  const [contactView, setContactView] = useState("grid");
  const [viewContact, setViewContact] = useState(null);
  const [custOutstanding, setCustOutstanding] = useState(null); // kept for legacy compat
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [saving, setSaving] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactFilter, setContactFilter] = useState("all"); // all | no-email | has-email
  const [ctSort, setCtSort] = useState({ field: "name", dir: "asc" });
  const ctSortToggle = (field) => setCtSort(s => ({ field, dir: s.field === field && s.dir === "asc" ? "desc" : "asc" }));
  const [customerPrices, setCustomerPrices] = useState([]);
  const [showPricing, setShowPricing] = useState(false);
  const [priceForm, setPriceForm] = useState({ product_id: "", custom_price: "" });
  const [savingPrice, setSavingPrice] = useState(false);

  React.useEffect(() => {
    if (viewContact) {
      sb.get(token, "customer_prices", `contact_id=eq.${viewContact.id}&select=*`).then(d => {
        if (Array.isArray(d)) setCustomerPrices(d);
      });
    }
  }, [viewContact, token]);

  React.useEffect(() => {
    if (triggerNewContact) { setShowForm(true); onTriggerContactHandled && onTriggerContactHandled(); }
  }, [triggerNewContact]);

  const savePrice = async () => {
    if (!priceForm.product_id || !priceForm.custom_price) return;
    setSavingPrice(true);
    const existing = customerPrices.find(p => p.product_id === priceForm.product_id);
    if (existing) {
      await sb.patch(token, "customer_prices", existing.id, { custom_price: parseFloat(priceForm.custom_price) });
      setCustomerPrices(prev => prev.map(p => p.id === existing.id ? { ...p, custom_price: parseFloat(priceForm.custom_price) } : p));
    } else {
      const data = await sb.post(token, "customer_prices", { contact_id: viewContact.id, contact_name: viewContact.name, product_id: priceForm.product_id, custom_price: parseFloat(priceForm.custom_price) });
      if (data[0]) setCustomerPrices(prev => [...prev, data[0]]);
    }
    setPriceForm({ product_id: "", custom_price: "" });
    setSavingPrice(false);
  };

  const deletePrice = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/customer_prices?id=eq.${id}`, { method: "DELETE", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
    setCustomerPrices(prev => prev.filter(p => p.id !== id));
  };
  const [f, setF] = useState({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "" });
  const filtered = contacts.filter(c => {
    if (c.type !== tab && c.type !== "both") return false;
    if (contactFilter === "no-email" && c.email) return false;
    if (contactFilter === "has-email" && !c.email) return false;
    if (contactFilter === "no-phone" && c.phone) return false;
    if (contactFilter === "has-phone" && !c.phone) return false;
    if (contactSearch) {
      const q = contactSearch.toLowerCase();
      return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q) || c.city?.toLowerCase().includes(q);
    }
    return true;
  });
  const sortedContacts = [...filtered].sort((a, b) => {
    const m = ctSort.dir === "asc" ? 1 : -1;
    if (ctSort.field === "name") return m * (a.name || "").localeCompare(b.name || "");
    if (ctSort.field === "outstanding") return m * ((a.total_outstanding || 0) - (b.total_outstanding || 0));
    if (ctSort.field === "revenue") return m * ((a.total_revenue || 0) - (b.total_revenue || 0));
    return 0;
  });
  const save = async () => {
    if (!f.name) return; setSaving(true);
    if (editingContact) {
      // Update existing contact
      const { id, created_by, created_at, ...updateData } = f;
      const data = await sb.patch(token, "contacts", editingContact.id, updateData);
      if (data) {
        setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...c, ...updateData } : c));
        logAudit(token, userId, "contact_updated", "contact", editingContact.id, `Contact updated: ${f.name}`);
      }
      setEditingContact(null);
    } else {
      // Create new contact
      const data = await sb.post(token, "contacts", { ...f, created_by: userId });
      if (data[0]) { setContacts(prev => [data[0], ...prev]); logAudit(token, userId, "contact_created", "contact", data[0].id, `${f.type} contact created: ${f.name}${f.email ? ' · ' + f.email : ''}`); }
    }
    setF({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "" });
    setShowForm(false); setSaving(false);
  };
  const avatarColors = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444","#2563eb","#ec4899"];
  return (
    <div>
      {viewContact && (
        <ModalPortal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewContact(null)}>
          <div className="modal contact-modal" style={{ maxWidth: 620, width: "100%" }}>
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
                // Use DB trigger columns for all 3 financial KPIs — accurate across ALL agents
                // Falls back to local calculation for admins who see all invoices anyway
                const hasDbValues = viewContact.total_revenue != null;
                const totalSpend = hasDbValues ? parseFloat(viewContact.total_revenue||0)
                  : custInvoices.reduce((s,i)=>s+parseFloat(i.amount||0),0);
                const paid = hasDbValues ? parseFloat(viewContact.total_paid||0)
                  : custInvoices.reduce((s,i)=>s+parseFloat(i.amount_paid||0),0);
                const outstanding = hasDbValues ? parseFloat(viewContact.total_outstanding||0)
                  : custInvoices.filter(i=>i.status==="pending"||i.status==="overdue"||i.status==="partial").reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0);
                return (
                  <div>
                    <div className="ct-modal-kpi" style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:20 }}>
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
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",marginBottom:8,opacity:0.3}}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
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
                                <td style={{ padding:"10px 14px" }}><span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"||inv.status==="partial"?"b-amber":"b-gray")}>{inv.status}</span></td>
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
            {/* Custom Pricing Section — admin only */}
            {(profile?.role === "admin" || profile?.role === "manager") && viewContact.type !== "supplier" && (
              <div style={{ padding:"0 24px 20px" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".8px" }}>
                    Custom Prices <span style={{ fontWeight:400,color:"var(--text3)" }}>({customerPrices.length})</span>
                  </div>
                  <button className="btn bo bsm" onClick={()=>setShowPricing(v=>!v)} style={{ fontSize:11 }}>
                    {showPricing ? "Hide" : "Manage Prices"}
                  </button>
                </div>
                {customerPrices.length > 0 && (
                  <div style={{ border:"1px solid var(--border)",borderRadius:"var(--rl)",overflow:"hidden",marginBottom:12 }}>
                    {customerPrices.map(cp => {
                      const prod = products.find(p => p.id === cp.product_id);
                      return (
                        <div key={cp.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:13 }}>
                          <div>
                            <div style={{ fontWeight:600 }}>{prod?.name || "Unknown product"}</div>
                            <div style={{ fontSize:11,color:"var(--text3)" }}>Default: {fmt(prod?.sale_price||0)} → <span style={{ color:"var(--blue)",fontWeight:600 }}>Custom: {fmt(cp.custom_price)}</span></div>
                          </div>
                          <button onClick={()=>deletePrice(cp.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--red)",fontSize:18,lineHeight:1,padding:"2px 6px" }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showPricing && (
                  <div style={{ background:"#f8fafd",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:"14px 16px" }}>
                    <div style={{ fontSize:12,fontWeight:600,marginBottom:10,color:"var(--text2)" }}>Add custom price for a product</div>
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                      <select value={priceForm.product_id} onChange={e=>setPriceForm(v=>({...v,product_id:e.target.value}))} style={{ flex:2,minWidth:140,padding:"7px 10px",border:"1px solid var(--border)",borderRadius:"var(--r)",fontSize:13,background:"var(--white)",color:"var(--text)",outline:"none" }}>
                        <option value="">Select product...</option>
                        {products.filter(p=>p.name).sort((a,b)=>a.name.localeCompare(b.name)).map(p=>(
                          <option key={p.id} value={p.id}>{p.name} (£{p.sale_price})</option>
                        ))}
                      </select>
                      <input type="number" placeholder="Custom price £" value={priceForm.custom_price} onChange={e=>setPriceForm(v=>({...v,custom_price:e.target.value}))} style={{ flex:1,minWidth:100,padding:"7px 10px",border:"1px solid var(--border)",borderRadius:"var(--r)",fontSize:13,background:"var(--white)",color:"var(--text)",outline:"none" }} />
                      <button className="btn bp bsm" onClick={savePrice} disabled={savingPrice||!priceForm.product_id||!priceForm.custom_price}>{savingPrice?"Saving...":"Save Price"}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="modal-actions">
              <div style={{ display:"flex",gap:8 }}>
                <button className="btn bo bsm" onClick={()=>{setEditingContact(viewContact);setF({...viewContact});setViewContact(null);setShowForm(true);}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                {viewContact.email&&<button className="btn bo bsm" onClick={()=>window.open("mailto:"+viewContact.email)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email</button>}
                {viewContact.phone&&<button className="btn bwa bsm" onClick={()=>window.open("https://wa.me/"+viewContact.phone.replace(/\s+/g,"").replace(/^0/,"44"))}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp</button>}
              </div>
              <button className="btn bp bsm" onClick={()=>setViewContact(null)}>Close</button>
            </div>
          </div>
        </div></ModalPortal>
      )}
      {/* ── Customers Page Header ── */}
      <div className="page-hero" style={{ margin: "-26px -28px 0 -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Contacts</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Customers & <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Suppliers</span></div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 6 }}>
              {contacts.filter(c => c.type === "customer" || c.type === "both").length} customers
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              {contacts.filter(c => c.type === "supplier" || c.type === "both").length} suppliers
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <div className="ct-hdr-search" style={{ position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." style={{ paddingLeft: 29, paddingRight: contactSearch ? 28 : 10, height: 32, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, fontSize: 12, outline: "none", color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.07)", width: 180, fontFamily: "var(--sans)" }} />
              {contactSearch && <button onClick={() => setContactSearch("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", padding: 0 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setContactView("grid")} style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid " + (contactView === "grid" ? "#818cf8" : "rgba(255,255,255,.15)"), background: contactView === "grid" ? "#818cf8" : "rgba(255,255,255,.07)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
              <button onClick={() => setContactView("list")} style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid " + (contactView === "list" ? "#818cf8" : "rgba(255,255,255,.15)"), background: contactView === "list" ? "#818cf8" : "rgba(255,255,255,.07)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
            </div>
            <button onClick={() => { setShowForm(!showForm); setF({ ...f, type: tab }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #818cf8", background: "#818cf8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Add {tab === "customer" ? "Customer" : "Supplier"}
            </button>
          </div>
        </div>
        {/* Stats strip */}
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)", position: "relative", zIndex: 1 }}>
          {[
            { label: "Customers", val: contacts.filter(c => c.type === "customer" || c.type === "both").length, sub: "click to view", color: tab==="customer"?"#60a5fa":"rgba(255,255,255,.35)", accent: "#2563eb", filter: "all", tabSwitch: "customer" },
            { label: "Suppliers", val: contacts.filter(c => c.type === "supplier" || c.type === "both").length, sub: "click to view", color: tab==="supplier"?"#c4b5fd":"rgba(255,255,255,.35)", accent: "#7c3aed", filter: "all", tabSwitch: "supplier" },
            { label: "With Email", val: contacts.filter(c => c.email).length, sub: "can receive reminders", color: "#86efac", accent: "#16a34a", filter: "has-email" },
            { label: "No Email", val: contacts.filter(c => !c.email).length, sub: "missing contact info", color: contacts.filter(c=>!c.email).length > 0 ? "#fca5a5" : "rgba(255,255,255,.35)", accent: contacts.filter(c=>!c.email).length > 0 ? "#dc2626" : "#64748b", filter: "no-email" },
          ].map((k, i) => {
            const isActive = k.tabSwitch ? tab === k.tabSwitch : contactFilter === k.filter && k.filter !== "all";
            const isClickable = k.filter !== "all" || k.tabSwitch;
            return (
            <div key={i} onClick={() => k.tabSwitch ? (setTab(k.tabSwitch), setContactFilter("all"), setContactSearch("")) : k.filter !== "all" && setContactFilter(contactFilter === k.filter ? "all" : k.filter)}
              title={isClickable ? `Click to filter by ${k.label}` : undefined}
              style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", borderTop: `3px solid ${isActive ? k.accent : "transparent"}`, cursor: isClickable ? "pointer" : "default", background: isActive ? "rgba(255,255,255,.08)" : "transparent", transition: "all .15s" }}
              onMouseEnter={e => { if(isClickable){ e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop=`3px solid ${k.accent}`; }}}
              onMouseLeave={e => { if(isClickable){ e.currentTarget.style.background=isActive?"rgba(255,255,255,.08)":"transparent"; e.currentTarget.style.borderTop=isActive?`3px solid ${k.accent}`:"3px solid transparent"; }}}>
              <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? k.color : "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{k.label}</span>
                {isClickable && (isActive
                  ? <span style={{ color: "#fff", fontSize: 9, fontWeight: 700, background: k.accent, padding: "2px 6px", borderRadius: 4, letterSpacing: ".3px" }}>ACTIVE ✕</span>
                  : <span style={{ color: "rgba(255,255,255,.3)", fontSize: 9 }}>↓ FILTER</span>)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: isActive ? k.color : "rgba(255,255,255,.5)" }}>{k.sub}</div>
            </div>
          );})}
        </div>
      </div>
      {/* ── TABS + UTILITY BAR ── */}
      <div style={{ background:"#0d1829", borderBottom:"1px solid rgba(99,102,241,.18)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 36px", margin:"0 -28px", marginTop:0 }}>
        <div style={{ display:"flex", gap:3 }}>
          {[["customer","Customers"],["supplier","Suppliers"]].map(([k,l]) => (
            <div key={k} onClick={() => { setTab(k); setContactSearch(""); setContactFilter("all"); }}
              style={{ padding:"6px 14px", fontSize:12, fontWeight:tab===k?700:500, color:tab===k?"#fff":"rgba(255,255,255,.45)", background:tab===k?"#818cf8":"transparent", borderRadius:7, cursor:"pointer", display:"flex", alignItems:"center", gap:5, transition:"all .15s", boxShadow:tab===k?"0 2px 8px rgba(129,140,248,.35)":"none" }}>
              {l} <span style={{ fontSize:10, fontWeight:700, background:tab===k?"rgba(255,255,255,.2)":"rgba(255,255,255,.08)", padding:"1px 6px", borderRadius:10, color:tab===k?"#fff":"rgba(255,255,255,.4)" }}>{contacts.filter(c=>c.type===k||c.type==="both").length}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, paddingRight:4 }}>
          {contactFilter !== "all" && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"rgba(129,140,248,.15)", color:"#a5b4fc", border:"1px solid rgba(129,140,248,.3)", borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:500 }}>
              {contactFilter === "has-email" ? "Has email" : contactFilter === "no-email" ? "No email" : contactFilter === "has-phone" ? "Has phone" : "No phone"}
              <button onClick={() => setContactFilter("all")} style={{ background:"none", border:"none", cursor:"pointer", color:"#a5b4fc", fontSize:14, lineHeight:1, padding:0 }}>×</button>
            </span>
          )}
          <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{filtered.length}{contactSearch ? ` of ${contacts.filter(c=>c.type===tab||c.type==="both").length}` : ""} result{filtered.length!==1?"s":""}</span>
        </div>
      </div>

      {/* ── SEARCH + SORT BAR ── */}
      <div className="ct-search-bar" style={{ background:"#fff", borderBottom:"1px solid var(--border)", padding:"9px 16px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ position:"relative", flex:1, maxWidth:300 }}>
          <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8", pointerEvents:"none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search name, city, email..."
            style={{ width:"100%", padding:"8px 12px 8px 32px", borderRadius:8, border:"1.5px solid var(--border)", fontSize:12, color:"var(--text)", outline:"none", background:"var(--bg)", fontFamily:"var(--sans)", transition:"border-color .15s" }} />
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {[["all","All"],["has-email","Has Email"],["no-email","No Email"],["has-phone","Has Phone"],["no-phone","No Phone"]].map(([v,l]) => (
            <div key={v} onClick={() => setContactFilter(v)}
              style={{ padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:contactFilter===v?700:500, cursor:"pointer", background:contactFilter===v?"#818cf8":"var(--bg)", color:contactFilter===v?"#fff":"#64748b", border:"1.5px solid "+(contactFilter===v?"#818cf8":"var(--border)"), transition:"all .12s", boxShadow:contactFilter===v?"0 2px 8px rgba(129,140,248,.3)":"none" }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:11, color:"#94a3b8" }}>View</span>
          <select value={contactView} onChange={e => setContactView(e.target.value === "list" ? "list" : "grid")}
            style={{ padding:"6px 10px", borderRadius:7, border:"1.5px solid var(--border)", fontSize:11, color:"var(--text2)", background:"var(--white)", outline:"none", cursor:"pointer", fontFamily:"var(--sans)" }}>
            <option value="grid">Grid view</option>
            <option value="list">List view</option>
          </select>
        </div>
      </div>

      {/* ── ADD / EDIT FORM ── */}
      {showForm && (
        <div className="card" style={{ margin:"12px 0", borderRadius:12, border:"1.5px solid var(--border)" }}>
          <div className="ch"><div className="ct">{editingContact ? "Edit Contact" : "New Contact"}</div></div>
          <div className="fg">
            <div className="fgrp"><label>Type</label><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Both</option></select></div>
            <div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Business name" /></div>
            <div className="fgrp"><label>Email</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="email@example.com" /></div>
            <div className="fgrp"><label>Phone</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+44..." /></div>
            <div className="fgrp"><label>Address</label><input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></div>
            <div className="fgrp"><label>City</label><input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></div>
            <div className="fgrp"><label>Postcode</label><input value={f.postcode} onChange={e => setF({ ...f, postcode: e.target.value })} /></div>
            <div className="fgrp"><label>VAT Number</label><input value={f.vat_number} onChange={e => setF({ ...f, vat_number: e.target.value })} placeholder="GB123456789" /></div>
          </div>
          <div className="ff">
            <button className="btn bo" onClick={() => { setShowForm(false); setEditingContact(null); setF({ type:"customer", name:"", email:"", phone:"", address:"", city:"", postcode:"", vat_number:"", notes:"" }); }}>Cancel</button>
            <button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : editingContact ? "Update Contact" : "Save Contact"}</button>
          </div>
        </div>
      )}

      {/* ── PREMIUM TABLE ROWS ── */}
      {(() => {
        const avatarBg = (name) => ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6"][name?.charCodeAt(0) % 10] || "#6366f1";
        const custInvMap = {};
        (invoices||[]).forEach(inv => {
          if (!custInvMap[inv.customer]) custInvMap[inv.customer] = { count:0, revenue:0, outstanding:0 };
          custInvMap[inv.customer].count++;
          custInvMap[inv.customer].revenue += parseFloat(inv.amount||0);
          custInvMap[inv.customer].outstanding += parseFloat(inv.balance||inv.amount||0) * (inv.status!=="paid"?1:0);
        });
        const fmt = (n) => "£" + parseFloat(n).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
        const hasOverdue = (name) => (invoices||[]).some(i => i.customer===name && i.status==="overdue");
        const isVIP = (name) => (custInvMap[name]?.revenue||0) > 10000;
        if (isMobile()) {
          return (
            <div style={{ display:"flex", flexDirection:"column", gap:10, padding:"12px 0" }}>
              {sortedContacts.map(c => {
                const bg = avatarBg(c.name);
                const ci = custInvMap[c.name] || { count:0, revenue:0, outstanding:0 };
                const overdue = hasOverdue(c.name);
                return (
                  <div key={c.id} role="button" tabIndex={0}
                    onClick={() => setViewContact(c)}
                    onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setViewContact(c);}}
                    style={{ background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:"14px 16px",boxShadow:"var(--sh)",cursor:"pointer",minHeight:64,display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                      <div style={{ fontSize:12, color:"var(--text3)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {c.city || c.phone || c.email || "No details"}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                      <span style={{ fontWeight:800, fontSize:14, fontFamily:"var(--mono)" }}>{ci.outstanding > 0 ? fmt(ci.outstanding) : ci.revenue > 0 ? fmt(ci.revenue) : "—"}</span>
                      {ci.outstanding > 0
                        ? <span className={"badge "+(overdue?"b-red":"b-amber")}>{overdue?"overdue":"owes"}</span>
                        : <span className="badge b-green">settled</span>}
                    </div>
                  </div>
                );
              })}
              {filtered.length===0&&<EmptyState icon="customer" title={`No ${tab}s`} sub="No contacts match your current search or filter" />}
            </div>
          );
        }
        return (
          <>
            {/* Column headers */}
            <div className="ct-list-header" style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 0.8fr 85px 0.85fr 0.75fr 90px", gap:0, padding:"8px 12px", margin:"12px 0 4px" }}>
              {[["Customer","name"],["Contact",null],["Location",null],["Status",null],["Revenue","revenue"],["Health",null],["",""]].map(([h,f],i) => (
                <div key={i} onClick={f ? () => ctSortToggle(f) : undefined}
                  style={{ fontSize:10, fontWeight:600, color: f ? "var(--blue)" : "#94a3b8", textTransform:"uppercase", letterSpacing:".6px", cursor: f ? "pointer" : "default", display:"flex", alignItems:"center", gap:3, userSelect:"none" }}>
                  {h}{f && <span style={{opacity:.6}}>{ctSort.field===f ? (ctSort.dir==="asc"?"↑":"↓") : "↕"}</span>}
                </div>
              ))}
            </div>

            {/* Customer rows */}
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {sortedContacts.map(c => {
                const bg = avatarBg(c.name);
                const ci = custInvMap[c.name] || { count:0, revenue:0, outstanding:0 };
                const overdue = hasOverdue(c.name);
                const vip = isVIP(c.name);
                const health = ci.revenue > 0 ? Math.min(100, Math.round(((ci.revenue - ci.outstanding) / ci.revenue) * 100)) : 50;
                const healthCol = health >= 75 ? "#16a34a" : health >= 45 ? "#d97706" : "#dc2626";
                const statusBg = !c.email ? "rgba(148,163,184,.12)" : overdue ? "#fee2e2" : "#dcfce7";
                const statusText = !c.email ? "#64748b" : overdue ? "#991b1b" : "#15803d";
                const statusDot = !c.email ? "#94a3b8" : overdue ? "#dc2626" : "#16a34a";
                const statusLabel = !c.email ? "No Email" : overdue ? "Overdue" : "Active";
                return (
                  <div key={c.id} className="ct-list-row" onClick={() => setViewContact(c)}
                    style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 0.8fr 85px 0.85fr 0.75fr 90px", gap:0, background:"var(--white)", borderRadius:11, border:"1.5px solid var(--border)", padding:"12px", alignItems:"center", cursor:"pointer", transition:"box-shadow .15s, border-color .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow="0 0 0 2px #818cf8"; e.currentTarget.style.borderColor="#818cf8"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow=""; e.currentTarget.style.borderColor="var(--border)"; }}>

                    {/* Customer */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0, boxShadow:`0 3px 8px ${bg}44` }}>
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                          <span style={{ fontSize:12, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                          {vip && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:20, background:"linear-gradient(135deg,#f59e0b,#ef4444)", color:"#fff" }}>VIP</span>}
                          {overdue && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:20, background:"#fee2e2", color:"#991b1b" }}>OVERDUE</span>}
                        </div>
                        <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{ci.count > 0 ? `${ci.count} invoice${ci.count!==1?"s":""}` : "No invoices"}</div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div>
                      {c.email ? (
                        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#64748b", overflow:"hidden" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.email}</span>
                        </div>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#94a3b8" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          No email
                        </div>
                      )}
                      {c.phone && <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#94a3b8", marginTop:3 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.64 2.76h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.46-1.46a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {c.phone}
                      </div>}
                    </div>

                    {/* Location */}
                    <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#64748b" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.city || "—"}{c.postcode ? `, ${c.postcode}` : ""}</span>
                    </div>

                    {/* Status */}
                    <div>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:statusBg, color:statusText, padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:600 }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:statusDot }} />
                        {statusLabel}
                      </div>
                    </div>

                    {/* Revenue */}
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:"var(--text)" }}>{ci.revenue > 0 ? fmt(ci.revenue) : "—"}</div>
                      {ci.outstanding > 0 && <div style={{ fontSize:10, color:"#dc2626", marginTop:2 }}>{fmt(ci.outstanding)} due</div>}
                    </div>

                    {/* Health bar */}
                    <div>
                      {ci.revenue > 0 ? (
                        <>
                          <div style={{ fontSize:11, fontWeight:600, color:healthCol, marginBottom:3 }}>{health}<span style={{ fontSize:9, color:"#94a3b8", fontWeight:400 }}>/100</span></div>
                          <div style={{ height:4, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${health}%`, background:healthCol, borderRadius:4 }} />
                          </div>
                        </>
                      ) : <span style={{ fontSize:11, color:"#94a3b8" }}>—</span>}
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
                      {[
                        { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>, label:"View", action:() => setViewContact(c) },
                        { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label:"Edit", action:(e) => { e.stopPropagation(); setEditingContact(c); setF({type:c.type||"customer",name:c.name||"",email:c.email||"",phone:c.phone||"",address:c.address||"",city:c.city||"",postcode:c.postcode||"",vat_number:c.vat_number||"",notes:c.notes||""}); setShowForm(true); } },
                        { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, label:"Email", action:(e) => { e.stopPropagation(); if(c.email) window.open(`mailto:${c.email}`); } }
                      ].map(({icon,label,action},idx) => (
                        <button key={idx} title={label} onClick={(e) => { e.stopPropagation(); action(e); }}
                          style={{ width:26, height:26, borderRadius:7, border:"1.5px solid var(--border)", background:"var(--white)", color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .12s" }}
                          onMouseEnter={e=>{ e.currentTarget.style.borderColor="#818cf8"; e.currentTarget.style.color="#818cf8"; e.currentTarget.style.background="rgba(129,140,248,.08)"; }}
                          onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="#64748b"; e.currentTarget.style.background="var(--white)"; }}>
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding:"48px 0", textAlign:"center", color:"#94a3b8" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:"0 auto 12px"}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <div style={{ fontSize:13, fontWeight:500, color:"#64748b", marginBottom:6 }}>No {tab}s found</div>
                  <div style={{ fontSize:12, color:"#94a3b8" }}>Try adjusting your search or filters</div>
                </div>
              )}
            </div>

            {/* Footer summary */}
            {filtered.length > 0 && (
              <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:"#94a3b8" }}>Showing {filtered.length} of {contacts.filter(c=>c.type===tab||c.type==="both").length} {tab}s</span>
                <div style={{ display:"flex", gap:8 }}>
                  {(() => {
                    const totalRev = filtered.reduce((s,c) => s + (custInvMap[c.name]?.revenue||0), 0);
                    const totalDue = filtered.reduce((s,c) => s + (custInvMap[c.name]?.outstanding||0), 0);
                    return <>
                      <span style={{ fontSize:11, fontWeight:500, color:"#15803d", background:"#dcfce7", padding:"3px 10px", borderRadius:20 }}>£{totalRev.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} revenue</span>
                      {totalDue > 0 && <span style={{ fontSize:11, fontWeight:500, color:"#991b1b", background:"#fee2e2", padding:"3px 10px", borderRadius:20 }}>£{totalDue.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} outstanding</span>}
                    </>;
                  })()}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

// ── INVENTORY ─────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Inventory                                                  │
// │ Product stock management                                   │
// └────────────────────────────────────────────────────────────┘
function Inventory({ products, setProducts, token, userId, profile }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invSearch, setInvSearch] = useState("");
  const [editingQty, setEditingQty] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [f, setF] = useState({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
  const [stockFilter, setStockFilter] = useState("all");

  const save = async () => {
    if (!f.name) return; setSaving(true);
    const data = await sb.post(token, "products", { ...f, cost_price: parseFloat(f.cost_price)||0, sale_price: parseFloat(f.sale_price)||0, vat_rate: parseFloat(f.vat_rate)||20, stock_qty: parseFloat(f.stock_qty)||0, reorder_level: parseFloat(f.reorder_level)||0, created_by: userId });
    if (data[0]) { setProducts(prev => [data[0], ...prev]); logAudit(token, userId, "product_created", "product", data[0].id, `Product added: ${f.name} · Sale £${parseFloat(f.sale_price)||0} · Stock: ${parseFloat(f.stock_qty)||0}`); }
    setF({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
    setShowForm(false); setSaving(false);
  };

  const updateStock = async (p, newQty) => {
    const qty = Math.max(0, parseInt(newQty) || 0);
    setUpdatingId(p.id);
    await sb.patch(token, "products", p.id, { stock_qty: qty });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock_qty: qty } : x));
    logAudit(token, userId, "stock_adjusted", "product", p.id, `${p.name} stock updated: ${p.stock_qty} → ${qty} ${p.unit||"units"}`);
    setEditingQty(prev => { const n = {...prev}; delete n[p.id]; return n; });
    setUpdatingId(null);
  };

  const lowStock = products.filter(p => p.stock_qty <= (p.reorder_level || DEFAULT_REORDER));
  const outOfStock = products.filter(p => (p.stock_qty || 0) === 0);
  const filtered = products.filter(p => {
    if (stockFilter === "low") return p.stock_qty <= (p.reorder_level || DEFAULT_REORDER);
    if (stockFilter === "out") return (p.stock_qty || 0) === 0;
    return true;
  }).filter(p => !invSearch || p.name?.toLowerCase().includes(invSearch.toLowerCase()) || p.code?.toLowerCase().includes(invSearch.toLowerCase()) || p.category?.toLowerCase().includes(invSearch.toLowerCase()));

  return (
    <div>
      {/* ── Inventory Page Header ── */}
      <div className="page-hero" style={{ margin: "-26px -28px 0 -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Inventory</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Stock & <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Inventory</span></div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 6 }}>
              {products.length} products
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              {lowStock.length > 0 ? <span style={{ color: "#fca5a5" }}>{lowStock.length} low stock</span> : <span style={{ color: "#86efac" }}>all in stock</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={invSearch} onChange={e => setInvSearch(e.target.value)} placeholder="Search products..." style={{ paddingLeft: 29, paddingRight: invSearch ? 28 : 10, height: 32, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, fontSize: 12, outline: "none", color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.07)", width: 180, fontFamily: "var(--sans)" }} />
              {invSearch && <button onClick={() => setInvSearch("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", padding: 0 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
            </div>
            {(profile?.role === "admin" || profile?.role === "manager") && (
              <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #818cf8", background: "#818cf8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Product
              </button>
            )}
          </div>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)", position: "relative", zIndex: 1 }}>
          {[
            { label: "Products", val: products.length, sub: "in catalogue", color: "rgba(255,255,255,.35)", accent: "#818cf8" },
            { label: "Low Stock", val: lowStock.length, sub: lowStock.length > 0 ? "need restocking" : "all levels ok", color: lowStock.length > 0 ? "#fca5a5" : "#86efac", accent: lowStock.length > 0 ? "#dc2626" : "#16a34a" },
            { label: "Stock Value", val: fmt(products.reduce((s,p) => s+p.stock_qty*p.cost_price, 0)), sub: "at cost price", color: "rgba(255,255,255,.35)", accent: "#7c3aed" },
            { label: "Retail Value", val: fmt(products.reduce((s,p) => s+p.stock_qty*p.sale_price, 0)), sub: "at sale price", color: "#86efac", accent: "#16a34a" },
          ].map((k, i) => (
            <div key={i} style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: k.color }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stock filter tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#0d1829", borderBottom: "1px solid rgba(99,102,241,.18)", padding: "5px 36px", margin: "0 -28px 16px", flexWrap: "wrap" }}>
        {[["all", "All Products", products.length], ["low", "Low Stock", lowStock.length], ["out", "Out of Stock", outOfStock.length]].map(([v, l, cnt]) => (
          <button key={v} onClick={() => setStockFilter(v)} style={{ padding: "5px 13px", borderRadius: 7, border: "none", background: stockFilter === v ? (v === "low" ? "#f59e0b" : v === "out" ? "#ef4444" : "#818cf8") : "transparent", color: stockFilter === v ? "#fff" : "rgba(255,255,255,.45)", fontSize: 12, fontWeight: stockFilter === v ? 700 : 500, cursor: "pointer", fontFamily: "var(--sans)", display: "flex", alignItems: "center", gap: 5, transition: "all .15s", boxShadow: stockFilter === v ? "0 2px 8px rgba(0,0,0,.2)" : "none" }}>
            {l} <span style={{ background: stockFilter === v ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.08)", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: stockFilter === v ? "#fff" : "rgba(255,255,255,.4)" }}>{cnt}</span>
          </button>
        ))}
      </div>

      {showForm && (profile?.role === "admin" || profile?.role === "manager") && <div className="card" style={{ marginBottom: 20 }}><div className="ch"><div className="ct">New Product</div></div><div className="fg3"><div className="fgrp"><label>Code</label><input value={f.code} onChange={e => setF({...f,code:e.target.value})} placeholder="SKU001" /></div><div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({...f,name:e.target.value})} placeholder="Product name" /></div><div className="fgrp"><label>Category</label><input value={f.category} onChange={e => setF({...f,category:e.target.value})} placeholder="e.g. Vapes, Pods..." /></div><div className="fgrp"><label>Unit</label><select value={f.unit} onChange={e => setF({...f,unit:e.target.value})}><option>unit</option><option>pack</option><option>box</option><option>kg</option><option>litre</option></select></div><div className="fgrp"><label>Cost Price (£)</label><input type="number" value={f.cost_price} onChange={e => setF({...f,cost_price:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>Sale Price (£)</label><input type="number" value={f.sale_price} onChange={e => setF({...f,sale_price:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>VAT Rate</label><select value={f.vat_rate} onChange={e => setF({...f,vat_rate:e.target.value})}><option value="20">20% Standard</option><option value="5">5% Reduced</option><option value="0">0% Exempt</option></select></div><div className="fgrp"><label>Stock Qty</label><input type="number" value={f.stock_qty} onChange={e => setF({...f,stock_qty:e.target.value})} placeholder="0" /></div><div className="fgrp"><label>Reorder Level</label><input type="number" value={f.reorder_level} onChange={e => setF({...f,reorder_level:e.target.value})} placeholder="0" /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Product"}</button></div></div>}

      <div className="card">
        <div style={{ padding:"8px 16px",fontSize:12,color:"var(--text3)",borderBottom:"1px solid var(--border)" }}>{invSearch ? `${filtered.length} of ${products.length}` : filtered.length} product{filtered.length!==1?"s":""}</div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table className="inventory-table" style={{minWidth:480}}>
            <thead><tr><th>Code</th><th>Product</th><th>Category</th><th className="hm">Cost</th><th>Sale Price</th><th>VAT</th><th>In Stock</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(p => {
                const isEditing = editingQty[p.id] !== undefined;
                const isUpdating = updatingId === p.id;
                const isLow = p.stock_qty <= (p.reorder_level || DEFAULT_REORDER);
                const isOut = (p.stock_qty || 0) === 0;
                return (
                  <tr key={p.id} style={isOut ? { background: "rgba(239,68,68,.04)", borderLeft: "3px solid #ef4444" } : isLow ? { background: "rgba(245,158,11,.04)", borderLeft: "3px solid #f59e0b" } : {}}>
                    <td className="mono tm" style={{fontSize:12}}>{p.code||"—"}</td>
                    <td style={{fontWeight:500}}>{p.name}</td>
                    <td className="tm">{p.category||"—"}</td>
                    <td className="mono hm">{fmt(p.cost_price)}</td>
                    <td className="mono">{fmt(p.sale_price)}</td>
                    <td><span className="tag">{p.vat_rate}%</span></td>
                    <td>
                      {isEditing ? (
                        <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                          <input
                            type="number"
                            value={editingQty[p.id]}
                            onChange={e => setEditingQty(prev => ({...prev,[p.id]:e.target.value}))}
                            onKeyDown={e => { if(e.key==="Enter") updateStock(p,editingQty[p.id]); if(e.key==="Escape") setEditingQty(prev=>{const n={...prev};delete n[p.id];return n;}); }}
                            style={{ width:60,padding:"3px 6px",border:"1px solid var(--blue)",borderRadius:5,fontSize:12,outline:"none",fontFamily:"var(--mono)" }}
                            autoFocus
                          />
                          <span style={{ fontSize:11,color:"var(--text3)" }}>{p.unit}</span>
                          <button className="btn bp bsm" style={{ padding:"3px 8px",fontSize:11 }} onClick={() => updateStock(p,editingQty[p.id])} disabled={isUpdating}>{isUpdating?"...":"✓"}</button>
                          <button className="btn bo bsm" style={{ padding:"3px 6px",fontSize:11 }} onClick={() => setEditingQty(prev=>{const n={...prev};delete n[p.id];return n;})}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          {(profile?.role === "admin" || profile?.role === "manager") && <button onClick={() => updateStock(p, (p.stock_qty||0)-1)} style={{ width:20,height:20,borderRadius:4,border:"1px solid var(--border)",background:"var(--white)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"var(--text2)",lineHeight:1 }}>−</button>}
                          <span className="mono" style={{ fontWeight:600,fontSize:14,minWidth:28,textAlign:"center",cursor:(profile?.role==="admin"||profile?.role==="manager")?"pointer":"default" }} onClick={() => (profile?.role==="admin"||profile?.role==="manager") && setEditingQty(prev=>({...prev,[p.id]:p.stock_qty}))} title={(profile?.role==="admin"||profile?.role==="manager")?"Click to edit":""}>{p.stock_qty||0}</span>
                          {(profile?.role === "admin" || profile?.role === "manager") && <button onClick={() => updateStock(p, (p.stock_qty||0)+1)} style={{ width:20,height:20,borderRadius:4,border:"1px solid var(--border)",background:"var(--white)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"var(--text2)",lineHeight:1 }}>+</button>}
                          <span style={{ fontSize:11,color:"var(--text3)" }}>{p.unit}</span>
                        </div>
                      )}
                    </td>
                    <td><span className={"badge "+(p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)?"b-red":p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)*2?"b-amber":"b-green")}>{p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)?"Low Stock":p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)*2?"Running Low":"In Stock"}</span></td>
                  </tr>
                );
              })}
              {filtered.length===0&&<tr><td colSpan={8} className="empty">{invSearch ? `No products found for "${invSearch}"` : "No products yet"}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
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
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Purchasing</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Purchase <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Orders</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Order stock from your suppliers</div></div>
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New PO</button>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Total POs",val:pos.length,sub:"all orders",accent:"#2563eb"},{label:"Pending",val:pos.filter(p=>p.status==="pending").length,sub:"awaiting delivery",accent:"#d97706"},{label:"Received",val:pos.filter(p=>p.status==="received").length,sub:"completed",accent:"#16a34a"},{label:"Total Value",val:fmt(pos.reduce((s,p)=>s+(parseFloat(p.total)||0),0)),sub:"all orders",accent:"#7c3aed"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Purchase Order</div></div><div className="fg"><div className="fgrp"><label>Supplier *</label><select value={f.supplier_id} onChange={e => setF({...f,supplier_id:e.target.value})}><option value="">Select supplier...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="fgrp"><label>Order Date</label><input type="date" value={f.order_date} onChange={e => setF({...f,order_date:e.target.value})} /></div><div className="fgrp"><label>Expected Delivery</label><input type="date" value={f.expected_date} onChange={e => setF({...f,expected_date:e.target.value})} /></div><div className="fgrp"><label>Notes</label><input value={f.notes} onChange={e => setF({...f,notes:e.target.value})} placeholder="Any notes..." /></div></div><div style={{borderTop:"0.5px solid var(--border)"}}><div className="po-line" style={{background:"#fafbfc"}}>{["Product","Qty","Unit Cost","VAT %","Total",""].map(h => <span key={h} style={{fontSize:11,fontWeight:600,color:"var(--text3)",textTransform:"uppercase"}}>{h}</span>)}</div>{lines.map((l,i) => <div key={i} className="po-line"><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.product_id} onChange={e => updateLine(i,"product_id",e.target.value)}><option value="">Select product...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0" value={l.qty} onChange={e => updateLine(i,"qty",e.target.value)} /><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0.00" value={l.unit_cost} onChange={e => updateLine(i,"unit_cost",e.target.value)} /><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.vat_rate} onChange={e => updateLine(i,"vat_rate",e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">0%</option></select><span className="mono" style={{fontSize:12,fontWeight:600}}>{fmt(lineTotal(l))}</span><button className="ib" onClick={() => lines.length>1&&setLines(lines.filter((_,j) => j!==i))}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>)}<div style={{padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafbfc",borderTop:"0.5px solid var(--border)"}}><button className="btn bo bsm" onClick={() => setLines([...lines,{product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20"}])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Line</button><div style={{textAlign:"right"}}><div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>Subtotal: {fmt(total)} · VAT: {fmt(vatTotal)}</div><div style={{fontSize:16,fontWeight:700}}>Total: {fmt(total+vatTotal)}</div></div></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Create PO"}</button></div></div>}
      <div className="card"><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>PO #</th><th>Supplier</th><th className="hm">Order Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
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
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Commerce</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Credit <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Notes</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Issue and apply credit notes</div></div>
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Credit Note</button>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Total Credits",val:cns.length,sub:"all credit notes",accent:"#2563eb"},{label:"Open",val:cns.filter(c=>c.status==="open").length,sub:"outstanding",accent:"#d97706"},{label:"Applied",val:cns.filter(c=>c.status==="applied").length,sub:"used",accent:"#16a34a"},{label:"Total Value",val:fmt(cns.reduce((s,c)=>s+(parseFloat(c.amount)||0),0)),sub:"credits issued",accent:"#dc2626"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Credit Note</div></div><div className="fg"><div className="fgrp"><label>Customer *</label><select value={f.customer_id} onChange={e => setF({...f,customer_id:e.target.value})}><option value="">Select customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="fgrp"><label>Related Invoice</label><select value={f.invoice_id} onChange={e => setF({...f,invoice_id:e.target.value})}><option value="">Select invoice (optional)...</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {fmt(i.amount)}</option>)}</select></div><div className="fgrp"><label>Amount (£) *</label><input type="number" value={f.amount} onChange={e => setF({...f,amount:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>Issue Date</label><input type="date" value={f.issue_date} onChange={e => setF({...f,issue_date:e.target.value})} /></div><div className="fgrp full"><label>Reason *</label><input value={f.reason} onChange={e => setF({...f,reason:e.target.value})} placeholder="Reason for credit note..." /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Issue Credit Note"}</button></div></div>}
      <div className="card"><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table className="cr-table" style={{minWidth:420}}><thead><tr><th>CN #</th><th>Customer</th><th className="hm">Date</th><th>Amount</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>
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
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Finance</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Financial <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Reports</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Profit & Loss and Balance Sheet</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Total Income",val:fmt(totalRev),sub:"revenue accounts",accent:"#16a34a"},{label:"Total Expenses",val:fmt(totalExp),sub:"expense accounts",accent:"#dc2626"},{label:"Net Profit",val:fmt(Math.abs(net)),sub:net>=0?"profit":"loss",accent:net>=0?"#16a34a":"#dc2626"},{label:"Accounts",val:accounts.length,sub:"chart of accounts",accent:"#2563eb"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
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
  const [creditBalance, setCreditBalance] = useState(0);
  const custInvoices = selectedContact ? invoices.filter(i => i.customer === selectedContact.name) : [];
  const totalOwed = custInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  const totalPaid = custInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  React.useEffect(() => {
    if (selectedContact && token) {
      sb.getCredits(token, selectedContact.name)
        .then(d => {
          const available = Array.isArray(d) ? d.filter(c => c.status === "available").reduce((s,c) => s + parseFloat(c.amount||0), 0) : 0;
          setCreditBalance(available);
        })
        .catch(() => setCreditBalance(0));
    } else {
      setCreditBalance(0);
    }
  }, [selectedContact, token]);
  const handleWhatsApp = () => {
    if (!selectedContact) return;
    const lines = custInvoices.map(inv => `${inv.invoice_number} — ${fmtDate(inv.invoice_date)} — ${fmt(inv.amount)} — ${inv.status.toUpperCase()}`).join("\n");
    const msg = encodeURIComponent(`*Account Statement — ${COMPANY.name}*\nCustomer: *${selectedContact.name}*\nDate: ${fmtDate(new Date().toISOString())}\n\n${lines}\n\nTotal Paid: ${fmt(totalPaid)}\n*Balance Outstanding: ${fmt(totalOwed)}*\n\nPlease contact us at ${COMPANY.phone} for any queries.`);
    const clean = (selectedContact.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    if (clean) window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
    else window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleEmail = async () => {
    if (!selectedContact) return;
    const toEmail = selectedContact.email;
    if (!toEmail) { toast.warn(`No email address for ${selectedContact.name}. Please add one in Customers first.`); return; }
    const rows = custInvoices.map(inv => {
      const amtPaid = parseFloat(inv.amount_paid||0);
      const bal = inv.status==="paid" ? 0 : parseFloat(inv.balance!=null?inv.balance:inv.amount);
      const statusColor = inv.status==="paid"?"#16a34a":inv.status==="overdue"?"#dc2626":inv.status==="partial"?"#d97706":"#92400e";
      return `<tr><td style="font-family:monospace;color:#2563eb;font-weight:600;padding:9px 12px;border-bottom:1px solid #f1f5f9">${escHtml(inv.invoice_number)}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">${fmtDate(inv.invoice_date)}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-weight:600;text-align:right">${fmt(inv.amount)}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;text-align:right;color:${amtPaid>0?"#16a34a":"#94a3b8"}">${amtPaid>0?fmt(amtPaid):"—"}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-weight:700;text-align:right;color:${inv.status==="paid"?"#16a34a":bal>0?"#dc2626":"#16a34a"}">${inv.status==="paid"?"✓ Cleared":fmt(bal)}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9"><span style="background:${statusColor}22;color:${statusColor};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${inv.status.toUpperCase()}</span></td></tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f0f2f5;margin:0;padding:24px 16px"><div style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09)"><div style="background:#0f172a;padding:24px 32px"><div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px">${escHtml(COMPANY.name)}</div><div style="font-size:12px;color:rgba(255,255,255,.5)">Account Statement · ${fmtDate(new Date().toISOString())}</div></div><div style="padding:28px 32px"><p style="font-size:14px;color:#0f172a;margin:0 0 20px">Dear <strong>${escHtml(selectedContact.name)}</strong>,<br><br>Please find below your account statement as of <strong>${fmtDate(new Date().toISOString())}</strong>.</p><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 16px"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Total Invoiced</div><div style="font-size:18px;font-weight:700;color:#0f172a">${fmt(totalPaid+totalOwed)}</div></div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 16px"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Total Paid</div><div style="font-size:18px;font-weight:700;color:#16a34a">${fmt(totalPaid)}</div></div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 16px"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Balance Due</div><div style="font-size:18px;font-weight:700;color:${totalOwed>0?"#dc2626":"#16a34a"}">${fmt(totalOwed)}</div></div></div><table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:9px;overflow:hidden"><thead><tr style="background:#0f172a"><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:left">Invoice</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:left">Date</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:right">Total</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:right">Paid</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:right">Balance</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:left">Status</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size:12px;color:#64748b;margin:20px 0 0">If you have any queries please contact us at ${escHtml(COMPANY.phone)}.<br><br>Kind regards,<br><strong>${escHtml(COMPANY.name)}</strong></p></div><div style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">${escHtml(COMPANY.name)} · ${escHtml(COMPANY.address)} · VAT: ${escHtml(COMPANY.vatNumber)}</div></div></body></html>`;
    const result = await sendEmail({ to: toEmail, subject: `Account Statement — ${COMPANY.name}`, html, token });
    if (result.success) toast.success(`Statement emailed to ${toEmail}`);
    else toast.error("Failed to send email. Please try again.");
  };

  const handlePrint = () => {
    if (!selectedContact) return;
    const statusColor = (s) => s === "paid" ? "#16a34a" : s === "overdue" ? "#dc2626" : s === "partial" ? "#d97706" : "#92400e";
    const rows = custInvoices.map(inv => {
      const amtPaid = parseFloat(inv.amount_paid || 0);
      const bal = (inv.status === "paid") ? 0 : (inv.balance != null && parseFloat(inv.balance) > 0) ? parseFloat(inv.balance) : parseFloat(inv.amount || 0);
      const method = inv.payment_method || "";
      const methodIcon = method === "cash" ? "Cash" : method === "bank" ? "Bank Transfer" : method === "card" ? "Card" : method || "—";
      return "<tr>" +
      "<td style='font-family:monospace;color:#2563eb;font-weight:600'>" + (inv.invoice_number||"") + "</td>" +
      "<td>" + fmtDate(inv.invoice_date) + "</td>" +
      "<td>" + (inv.due_date ? fmtDate(inv.due_date) : "—") + "</td>" +
      "<td style='text-align:right;font-family:monospace;font-weight:600'>" + fmt(inv.amount) + "</td>" +
      "<td style='text-align:right;font-family:monospace;font-weight:600;color:" + (amtPaid>0?"#16a34a":"#94a3b8") + "'>" + (amtPaid>0?fmt(amtPaid):"—") + "</td>" +
      "<td style='text-align:right;font-family:monospace;font-weight:700;color:" + (inv.status==="paid"?"#16a34a":"#dc2626") + "'>" + (inv.status==="paid"?"Cleared":fmt(bal)) + "</td>" +
      "<td style='font-size:11px;color:#64748b'>" + methodIcon + "</td>" +
      "<td><span style='display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:" + statusColor(inv.status) + "22;color:" + statusColor(inv.status) + "'>" + inv.status.toUpperCase() + "</span></td>" +
      "</tr>";
    }).join("");
    const html =
      "<!DOCTYPE html><html><head><title>Statement — " + selectedContact.name + "</title>" +
      "<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;padding:32px;color:#1e293b}" +
      ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #0d1829}" +
      ".co-name{font-size:22px;font-weight:700;color:#0d1829}.co-sub{font-size:11px;color:#64748b;margin-top:4px}" +
      ".stmt-title{font-size:14px;font-weight:700;color:#0d1829;text-align:right}.stmt-date{font-size:11px;color:#64748b;margin-top:4px;text-align:right}" +
      ".customer-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:24px}" +
      ".customer-name{font-size:14px;font-weight:700;color:#0d1829}.customer-sub{font-size:11px;color:#64748b;margin-top:3px}" +
      ".kpis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}" +
      ".kpi{border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px}" +
      ".kpi-label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}" +
      ".kpi-val{font-size:18px;font-weight:700;font-family:monospace}" +
      "table{width:100%;border-collapse:collapse;margin-bottom:24px}" +
      "th{background:#0d1829;color:#fff;padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}" +
      "td{padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}" +
      "tr:last-child td{border-bottom:none}" +
      "tr:nth-child(even) td{background:#f8fafc}" +
      ".footer{border-top:2px solid #0d1829;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end}" +
      ".footer-note{font-size:11px;color:#64748b;max-width:300px}" +
      ".balance{text-align:right}.balance-label{font-size:11px;color:#64748b;margin-bottom:4px}" +
      ".balance-val{font-size:22px;font-weight:700;font-family:monospace;color:#dc2626}" +
      "@media print{body{padding:20px}button{display:none}}</style></head><body>" +
      "<div class='header'><div><div class='co-name'>" + COMPANY.name + "</div><div class='co-sub'>" + (COMPANY.address||"") + " &bull; VAT: " + (COMPANY.vat||"") + "<br>" + COMPANY.phone + " &bull; " + (COMPANY.email||"") + "</div></div>" +
      "<div><div class='stmt-title'>ACCOUNT STATEMENT</div><div class='stmt-date'>Date: " + fmtDate(new Date().toISOString()) + "</div></div></div>" +
      "<div class='customer-box'><div class='customer-name'>" + selectedContact.name + "</div>" +
      "<div class='customer-sub'>" + (selectedContact.phone||"") + (selectedContact.email ? " &bull; " + selectedContact.email : "") + (selectedContact.city ? " &bull; " + selectedContact.city : "") + "</div></div>" +
      "<div class='kpis'>" +
      "<div class='kpi'><div class='kpi-label'>Total Invoiced</div><div class='kpi-val'>" + fmt(totalPaid+totalOwed) + "</div></div>" +
      "<div class='kpi'><div class='kpi-label'>Total Paid</div><div class='kpi-val' style='color:#16a34a'>" + fmt(totalPaid) + "</div></div>" +
      "<div class='kpi'><div class='kpi-label'>Balance Due</div><div class='kpi-val' style='color:#dc2626'>" + fmt(totalOwed) + "</div></div>" +
      "</div>" +
      "<table><thead><tr><th>Invoice #</th><th>Date</th><th>Due Date</th><th style='text-align:right'>Total</th><th style='text-align:right'>Paid</th><th style='text-align:right'>Balance</th><th>Method</th><th>Status</th></tr></thead><tbody>" + rows + "</tbody></table>" +
      "<div class='footer'><div class='footer-note'>Thank you for your business. Please contact " + COMPANY.phone + " for any queries regarding this statement.</div>" +
      "<div class='balance'><div class='balance-label'>BALANCE DUE</div><div class='balance-val'>" + fmt(totalOwed) + "</div></div></div>" +
      "</body></html>";
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Finance</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Customer <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Statements</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>View and share full account statements</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Customers",val:contacts.filter(c=>c.type==="customer"||c.type==="both").length,sub:"active accounts",accent:"#2563eb"},{label:"With Balance",val:contacts.filter(c=>invoices.some(i=>i.customer===c.name&&i.status!=="paid"&&i.status!=="draft")).length,sub:"outstanding balance",accent:"#d97706"},{label:"Fully Paid",val:contacts.filter(c=>!invoices.some(i=>i.customer===c.name&&i.status!=="paid"&&i.status!=="draft")).length,sub:"clear accounts",accent:"#16a34a"},{label:"Total Outstanding",val:fmt(invoices.filter(i=>i.status!=="paid"&&i.status!=="draft").reduce((s,i)=>s+(parseFloat(i.amount)||0),0)),sub:"across all",accent:"#dc2626"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
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
              <button className="btn bo bsm" onClick={handleEmail} style={{display:"flex",alignItems:"center",gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Email
              </button>
              <button className="btn bo bsm" onClick={handlePrint} style={{display:"flex",alignItems:"center",gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print PDF
              </button>
              <button className="btn bwa bsm" onClick={handleWhatsApp}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: creditBalance > 0 ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 16, padding: "16px 20px", borderBottom: "0.5px solid var(--border)" }}>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Total Invoiced</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalPaid + totalOwed)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Total Paid</div><div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{fmt(totalPaid)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Balance Due</div><div style={{ fontSize: 20, fontWeight: 700, color: totalOwed > 0 ? "var(--red)" : "var(--green)" }}>{fmt(totalOwed)}</div></div>
            {creditBalance > 0 && <div style={{background:"#f0fdf4",borderRadius:8,padding:"12px 14px",border:"1px solid #bbf7d0"}}><div style={{ fontSize: 11, color: "#15803d", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px", fontWeight:700 }}>Credit Available</div><div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{fmt(creditBalance)}</div><div style={{fontSize:10,color:"#15803d",marginTop:2}}>Applied to next invoice</div></div>}
          </div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{minWidth:760}}>
              <thead><tr>
                <th>Invoice #</th><th>Date</th><th>Due Date</th><th>Total</th>
                <th>Paid</th><th>Balance</th><th>Method</th><th>Status</th>
              </tr></thead>
              <tbody>
                {custInvoices.map(inv => {
                  const amtPaid = parseFloat(inv.amount_paid || 0);
                  const balance = (inv.status === "paid") ? 0 : (inv.balance != null && parseFloat(inv.balance) > 0) ? parseFloat(inv.balance) : parseFloat(inv.amount || 0);
                  const method = inv.payment_method;
                  const methodIcon = method === "cash" ? "💵" : method === "bank" ? "🏦" : method === "card" ? "💳" : method ? "📝" : null;
                  return (
                    <tr key={inv.id}>
                      <td className="mono" style={{color:"var(--blue)",fontSize:12,fontWeight:600}}>{inv.invoice_number}</td>
                      <td style={{fontSize:12,color:"var(--text2)"}}>{fmtDate(inv.invoice_date)}</td>
                      <td style={{fontSize:12,color:"var(--text2)"}}>{fmtDate(inv.due_date)}</td>
                      <td className="mono" style={{fontWeight:600}}>{fmt(inv.amount)}</td>
                      <td className="mono" style={{fontWeight:600,color:amtPaid>0?"#16a34a":"var(--text3)"}}>{amtPaid>0?fmt(amtPaid):"—"}</td>
                      <td className="mono" style={{fontWeight:700,color:inv.status==="paid"?"#16a34a":balance>0?"#dc2626":"#16a34a"}}>
                        {inv.status==="paid"?"✓ Cleared":fmt(balance)}
                      </td>
                      <td style={{fontSize:12,color:"var(--text2)"}}>
                        {methodIcon?<span style={{display:"inline-flex",alignItems:"center",gap:4}}>{methodIcon} {method}</span>:"—"}
                      </td>
                      <td>
                        <span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="partial"?"b-amber":"b-amber")}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {custInvoices.length === 0 && <tr><td colSpan={8} className="empty">No invoices found for this customer</td></tr>}
              </tbody>
            </table>
          </div>
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
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Inventory</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Stock <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Adjustment</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Quickly update stock levels from anywhere</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Products",val:products.length,sub:"in catalogue",accent:"#2563eb"},{label:"Low Stock",val:products.filter(p=>p.stock_qty<=(p.reorder_level||5)).length,sub:"need restocking",accent:products.filter(p=>p.stock_qty<=(p.reorder_level||5)).length>0?"#dc2626":"#16a34a"},{label:"Stock Value",val:fmt(products.reduce((s,p)=>s+p.stock_qty*p.cost_price,0)),sub:"at cost price",accent:"#7c3aed"},{label:"Retail Value",val:fmt(products.reduce((s,p)=>s+p.stock_qty*p.sale_price,0)),sub:"at sale price",accent:"#16a34a"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--border)" }}>
          <input style={{ width: "100%", background: "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }} placeholder="🔍  Search products by name, SKU or category..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table className="sa-table" style={{minWidth:420}}><thead><tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Adjust By</th><th>Reason</th><th>Action</th></tr></thead><tbody>
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
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Analytics</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Sales by <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Agent</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Detailed agent performance breakdown</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Active Agents",val:allProfiles.filter(p=>p.role==="agent").length,sub:"field sales team",accent:"#2563eb"},{label:"Total Invoices",val:invoices.length,sub:"raised by all agents",accent:"#7c3aed"},{label:"Total Revenue",val:fmt(invoices.reduce((s,i)=>s+(parseFloat(i.amount)||0),0)),sub:"all agents combined",accent:"#16a34a"},{label:"Avg Per Agent",val:allProfiles.filter(p=>p.role==="agent").length>0?fmt(invoices.reduce((s,i)=>s+(parseFloat(i.amount)||0),0)/allProfiles.filter(p=>p.role==="agent").length):"—",sub:"revenue per agent",accent:"#d97706"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
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
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table className="ar-table" style={{minWidth:420}}><thead><tr><th>Customer</th><th className="hm">Agent</th><th className="hm">Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
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
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}>
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
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}>
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
            <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}>
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
function AdminReports({ invoices, products, contacts, accounts, allProfiles, setPage, setPendingFilter }) {
  const [tab, setTab] = useState("overview");
  const [hoveredBar, setHoveredBar] = React.useState(null);
  const [reconPeriod, setReconPeriod] = useState("week");
  const [reconFrom, setReconFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); });
  const [reconTo, setReconTo] = useState(() => new Date().toISOString().slice(0,10));
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
  const totalSales = filteredInv.reduce((s,i) => s+parseFloat(i.amount||0), 0);
  const totalPaid = filteredInv.reduce((s,i) => s+parseFloat(i.amount_paid||0), 0);
  const totalPending = filteredInv.filter(i=>i.status==="pending"||i.status==="partial").reduce((s,i) => s+parseFloat(i.balance||i.amount||0), 0);
  const totalOverdue = filteredInv.filter(i=>i.status==="overdue").reduce((s,i) => s+parseFloat(i.balance||i.amount||0), 0);
  const monthlySales = Array.from({length:12}, (_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-11+i, 1);
    const month = d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"});
    const invs = invoices.filter(inv => { const id = new Date(inv.invoice_date || inv.created_at); return id.getMonth()===d.getMonth() && id.getFullYear()===d.getFullYear(); });
    return { month, total: invs.reduce((s,i)=>s+parseFloat(i.amount||0),0), paid: invs.reduce((s,i)=>s+parseFloat(i.amount_paid||0),0), count: invs.length };
  });
  const maxMonthly = Math.max(...monthlySales.map(m=>m.total), 1);
  const customerSales = contacts.filter(c=>c.type==="customer"||c.type==="both").map(c => ({ name: c.name, total: filteredInv.filter(i=>i.customer===c.name).reduce((s,i)=>s+parseFloat(i.amount||0),0), count: filteredInv.filter(i=>i.customer===c.name).length, paid: filteredInv.filter(i=>i.customer===c.name).reduce((s,i)=>s+parseFloat(i.amount_paid||0),0) })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
  const categories = [...new Set(products.map(p=>p.category||"General"))];
  const catData = categories.map(cat => ({ name: cat, products: products.filter(p=>(p.category||"General")===cat).length, stockValue: products.filter(p=>(p.category||"General")===cat).reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0), retailValue: products.filter(p=>(p.category||"General")===cat).reduce((s,p)=>s+(p.stock_qty||0)*(p.sale_price||0),0), lowStock: products.filter(p=>(p.category||"General")===cat && p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)).length })).sort((a,b)=>b.retailValue-a.retailValue);
  const totalStockValue = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0);
  const totalRetailValue = products.reduce((s,p)=>s+(p.stock_qty||0)*(p.sale_price||0),0);
  const lowStockItems = products.filter(p=>p.stock_qty<=(p.reorder_level||DEFAULT_REORDER));
  const productSales = products.map(p => ({ ...p, stockValue: (p.stock_qty||0)*(p.cost_price||0), retailValue: (p.stock_qty||0)*(p.sale_price||0), margin: p.sale_price > 0 ? Math.round(((p.sale_price-p.cost_price)/p.sale_price)*100) : 0 })).sort((a,b)=>b.stockValue-a.stockValue);
  const periodLabels = { week:"This Week", month:"This Month", quarter:"This Quarter", year:"This Year", all:"All Time" };
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 1, flexWrap: "wrap", gap: 10 }}>
          <div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Analytics</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Admin <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Reports</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Comprehensive business analytics</div></div>
          <div style={{display:"flex",gap:6,background:"rgba(255,255,255,.08)",borderRadius:8,padding:4}}>{[["week","Week"],["month","Month"],["quarter","Quarter"],["year","Year"],["all","All"]].map(([k,l]) => <button key={k} style={{padding:"5px 12px",borderRadius:6,border:"none",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"var(--sans)",background:period===k?"#2563eb":"transparent",color:period===k?"#fff":"rgba(255,255,255,.5)",transition:"all .12s"}} onClick={()=>setPeriod(k)}>{l}</button>)}</div>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[
            {label:"Total Revenue",val:fmt(invoices.filter(i=>i.status!=="draft").reduce((s,i)=>s+parseFloat(i.amount||0),0)),sub:"all time",accent:"#16a34a",filter:"all"},
            {label:"Outstanding",val:fmt(invoices.filter(i=>i.status!=="paid"&&i.status!=="draft").reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0)),sub:"unpaid invoices",accent:"#dc2626",filter:"overdue"},
            {label:"Overdue",val:invoices.filter(i=>i.status==="overdue").length,sub:"overdue invoices",accent:"#d97706",filter:"overdue"},
            {label:"Active Customers",val:contacts.filter(c=>c.type==="customer"||c.type==="both").length,sub:"in system",accent:"#2563eb",filter:null},
          ].map((k,i)=>{
            const isActive = false;
            return (
            <div key={i} onClick={() => { if(k.filter){ setPendingFilter(k.filter); setPage("invoices"); } }}
              style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}`, cursor:k.filter?"pointer":"default", transition:"background .15s" }}
              onMouseEnter={e=>{ if(k.filter) e.currentTarget.style.background="rgba(255,255,255,.06)"; }}
              onMouseLeave={e=>{ if(k.filter) e.currentTarget.style.background="transparent"; }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <span>{k.label}</span>
                {k.filter && <span style={{fontSize:9,color:"rgba(255,255,255,.25)"}}>↓ FILTER</span>}
              </div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          );})}
        </div>
      </div>
      {/* ── 2-ROW TAB NAV (Option C) — group row + tab row, pure CSS ── */}
      <style>{`
        .ar2-wrap { background: var(--white); border: 1px solid var(--border); border-radius: var(--rl); overflow: hidden; margin-bottom: 20px; }
        .ar2-row1 { display: flex; border-bottom: 1px solid var(--border); background: var(--bg); }
        .ar2-group { padding: 10px 20px; font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: .7px; cursor: pointer; border-bottom: 2.5px solid transparent; border: none; background: none; font-family: var(--sans); display: flex; align-items: center; gap: 6px; transition: color .12s, background .12s; white-space: nowrap; }
        .ar2-group:hover { color: var(--text); background: var(--border); }
        .ar2-group.gr-rev { color: #2563eb; border-bottom: 2.5px solid #2563eb; background: #eff6ff; }
        .ar2-group.gr-deb { color: #dc2626; border-bottom: 2.5px solid #dc2626; background: #fef2f2; }
        .ar2-group.gr-ops { color: #7c3aed; border-bottom: 2.5px solid #7c3aed; background: #f5f3ff; }
        .ar2-badge { font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 10px; background: #fee2e2; color: #991b1b; }
        .ar2-row2 { display: flex; background: var(--white); }
        .ar2-tab { padding: 10px 16px; font-size: 12px; font-weight: 400; color: var(--text2); cursor: pointer; border: none; background: none; font-family: var(--sans); white-space: nowrap; border-bottom: 2px solid transparent; transition: color .12s, background .12s; }
        .ar2-tab:hover { color: var(--text); background: var(--bg); }
        .ar2-tab.on-rev { color: #2563eb; font-weight: 600; border-bottom-color: #2563eb; }
        .ar2-tab.on-deb { color: #dc2626; font-weight: 600; border-bottom-color: #dc2626; }
        .ar2-tab.on-ops { color: #7c3aed; font-weight: 600; border-bottom-color: #7c3aed; }
      `}</style>
      {(() => {
        const groups = [
          { label:"Revenue", key:"rev", icon:"💰", color:"#2563eb", tabs:[["overview","Overview"],["monthly","Monthly"],["pl","P&L"],["balance","Balance Sheet"]] },
          { label:"Debtors", key:"deb", icon:"⚠️", color:"#dc2626", tabs:[["aged-debtors","Aged Debtors",invoices.filter(i=>i.status==="overdue").length],["aged-creditors","Aged Creditors"],["cashflow","Cash Flow"],["cash-recon","Cash Recon"]] },
          { label:"Operations", key:"ops", icon:"⚙️", color:"#7c3aed", tabs:[["products","Products"],["stock","Stock"],["customers","Customers"],["agents","Agents"],["agent-products","Agent Products"],["product-tracker","Product Tracker"]] },
        ];
        const activeGroup = groups.find(g => g.tabs.some(([k]) => k === tab)) || groups[0];
        return (
          <div className="ar2-wrap">
            {/* ROW 1 — group selector */}
            <div className="ar2-row1">
              {groups.map(g => (
                <button key={g.key}
                  className={`ar2-group${activeGroup.key===g.key ? " gr-"+g.key : ""}`}
                  onClick={() => { const firstTab = g.tabs[0][0]; setTab(firstTab); }}>
                  {g.icon} {g.label}
                  {g.key==="deb" && invoices.filter(i=>i.status==="overdue").length > 0 &&
                    <span className="ar2-badge">{invoices.filter(i=>i.status==="overdue").length}</span>}
                </button>
              ))}
            </div>
            {/* ROW 2 — tabs for active group only */}
            <div className="ar2-row2">
              {activeGroup.tabs.map(([k, l, badge]) => (
                <button key={k}
                  className={`ar2-tab${tab===k ? " on-"+activeGroup.key : ""}`}
                  onClick={() => setTab(k)}>
                  {l}
                  {badge > 0 && <span className="ar2-badge" style={{marginLeft:4}}>{badge}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })()}
      {tab==="overview" && <div>
        {/* Section header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text)",letterSpacing:"-.2px"}}>Revenue Overview</div>
            <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>Performance summary · {periodLabels[period]}</div>
          </div>
        </div>
        {/* KPI cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[
            { label:"Total Sales", val:fmt(totalSales), sub:filteredInv.length+" invoices · "+periodLabels[period], accent:"#2563eb", bg:"#eff6ff", icon:"ti-receipt-2", pct:null },
            { label:"Collected", val:fmt(totalPaid), sub:totalSales>0?Math.round(totalPaid/totalSales*100)+"% collection rate":"0% collection rate", accent:"#16a34a", bg:"#f0fdf4", icon:"ti-circle-check", pct:totalSales>0?totalPaid/totalSales:0 },
            { label:"Pending", val:fmt(totalPending), sub:filteredInv.filter(i=>i.status==="pending"||i.status==="partial").length+" invoices awaiting", accent:"#d97706", bg:"#fffbeb", icon:"ti-clock", pct:totalSales>0?totalPending/totalSales:0 },
            { label:"Overdue", val:fmt(totalOverdue), sub:filteredInv.filter(i=>i.status==="overdue").length+" invoices past due", accent:"#dc2626", bg:"#fef2f2", icon:"ti-alert-triangle", pct:totalSales>0?totalOverdue/totalSales:0 },
          ].map((k,i) => (
            <div key={i} style={{background:"var(--white)",border:"1.5px solid var(--border)",borderRadius:12,padding:"16px 18px",borderTop:`3px solid ${k.accent}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px"}}>{k.label}</div>
                <div style={{width:26,height:26,borderRadius:7,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <i className={`ti ${k.icon}`} style={{fontSize:13,color:k.accent}} />
                </div>
              </div>
              <div style={{fontSize:20,fontWeight:800,color:"var(--text)",fontFamily:"var(--mono)",letterSpacing:"-.5px",marginBottom:4}}>{k.val}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginBottom:k.pct!==null?10:0}}>{k.sub}</div>
              {k.pct !== null && (
                <div style={{height:3,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:Math.round(k.pct*100)+"%",background:k.accent,borderRadius:2}} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="card">
          <div className="ch" style={{alignItems:"flex-start"}}>
            <div><div className="ct">Monthly Revenue</div><div className="cs">Last 12 months — invoiced vs collected</div></div>
            <div style={{display:"flex",alignItems:"center",gap:16,fontSize:11,color:"var(--text3)"}}>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:"#2563eb",display:"inline-block"}} />Invoiced</span>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:"#16a34a",display:"inline-block"}} />Collected</span>
            </div>
          </div>
          <div style={{padding:"16px 20px 12px"}}>
            {(() => {
              const CHART_H = 180;
              const yMax = Math.max(...monthlySales.map(m=>m.total), 1);
              const ySteps = 4;
              const yLabels = Array.from({length:ySteps+1},(_,i)=>Math.round(yMax/ySteps*i));
              return (
                <div style={{position:"relative"}}>
                  <div style={{display:"flex",gap:0}}>
                    <div style={{width:44,flexShrink:0,display:"flex",flexDirection:"column-reverse",justifyContent:"space-between",height:CHART_H}}>
                      {yLabels.map((v,i)=>(
                        <div key={i} style={{fontSize:10,color:"var(--text3)",textAlign:"right",lineHeight:1}}>
                          £{v>=1000?Math.round(v/1000)+"k":v}
                        </div>
                      ))}
                    </div>
                    <div style={{flex:1,position:"relative",height:CHART_H,marginLeft:8}}>
                      {yLabels.map((_,i)=>(
                        <div key={i} style={{position:"absolute",left:0,right:0,bottom:(i/ySteps)*CHART_H,borderTop:i===0?"2px solid var(--border)":"1px solid #f1f5f9",zIndex:0}} />
                      ))}
                      <div style={{display:"flex",alignItems:"flex-end",height:"100%",gap:4,position:"relative",zIndex:1}}>
                        {monthlySales.map((m,i)=>{
                          const totalH = Math.max(0,(m.total/yMax)*CHART_H);
                          const paidH = m.total>0?Math.max(0,(m.paid/m.total)*totalH):0;
                          const isHov = hoveredBar===i;
                          return (
                            <div key={i} onMouseEnter={()=>setHoveredBar(i)} onMouseLeave={()=>setHoveredBar(null)}
                              style={{flex:1,display:"flex",alignItems:"flex-end",height:"100%",cursor:"pointer",position:"relative"}}>
                              <div style={{flex:1,height:totalH||2,background:isHov?"#1d4ed8":"#2563eb",borderRadius:"3px 3px 0 0",transition:"all .15s",opacity:isHov?1:0.85,position:"relative"}}>
                                {m.paid>0&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:paidH,background:isHov?"#15803d":"#16a34a",borderRadius:"3px 3px 0 0"}} />}
                              </div>
                              {isHov&&m.total>0&&(
                                <div style={{position:"absolute",bottom:"100%",left:"50%",transform:"translateX(-50%)",background:"#0f172a",color:"#fff",padding:"8px 10px",borderRadius:8,fontSize:11,whiteSpace:"nowrap",zIndex:100,marginBottom:6,boxShadow:"0 4px 12px rgba(0,0,0,.2)"}}>
                                  <div style={{fontWeight:700,marginBottom:3}}>{m.month}</div>
                                  <div style={{color:"#93c5fd"}}>Invoiced: {fmt(m.total)}</div>
                                  <div style={{color:"#86efac"}}>Collected: {fmt(m.paid)}</div>
                                  <div style={{color:"#fca5a5"}}>Pending: {fmt(m.total-m.paid)}</div>
                                  <div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",width:8,height:8,background:"#0f172a",rotate:"45deg"}} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",marginLeft:52,gap:4,marginTop:6}}>
                    {monthlySales.map((m,i)=>(
                      <div key={i} style={{flex:1,textAlign:"center",fontSize:9,color:hoveredBar===i?"var(--blue)":"var(--text3)",fontWeight:hoveredBar===i?700:400,transition:"color .15s"}}>{m.month}</div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text2)",borderTop:"1px solid var(--border)",paddingTop:10,marginTop:12}}>
              <span>Total: <strong style={{color:"var(--text)"}}>{fmt(monthlySales.reduce((s,m)=>s+m.total,0))}</strong></span>
              <span>Best: <strong style={{color:"var(--blue)"}}>{monthlySales.reduce((a,b)=>a.total>b.total?a:b).month}</strong></span>
              <span>Collected: <strong style={{color:"#16a34a"}}>{fmt(monthlySales.reduce((s,m)=>s+m.paid,0))}</strong></span>
              <span>Avg/month: <strong style={{color:"var(--text)"}}>{fmt(monthlySales.reduce((s,m)=>s+m.total,0)/12)}</strong></span>
            </div>
          </div>
        </div>
      </div>}
      {tab==="monthly" && <div className="card"><div className="ch"><div className="ct">Monthly Sales</div><div className="cs">Last 12 months</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Month</th><th>Invoices</th><th>Total</th><th>Collected</th><th>Rate</th></tr></thead><tbody>{[...monthlySales].reverse().map(m => <tr key={m.month}><td style={{fontWeight:600}}>{m.month}</td><td className="mono">{m.count}</td><td className="mono" style={{fontWeight:600}}>{fmt(m.total)}</td><td className="mono tg">{fmt(m.paid)}</td><td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}><div style={{width:m.total>0?(m.paid/m.total*100)+"%":"0%",height:"100%",background:"var(--green)",borderRadius:3}} /></div><span style={{fontSize:12}}>{m.total>0?Math.round(m.paid/m.total*100):0}%</span></div></td></tr>)}</tbody></table></div></div>}
      {tab==="products" && <div>
        <div className="g3" style={{marginBottom:20}}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Products</div><div className="kpi-val">{products.length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Stock Value</div><div className="kpi-val">{fmt(totalStockValue)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Low Stock</div><div className="kpi-val tr-c">{lowStockItems.length}</div></div>
        </div>
        <div className="card"><div className="ch"><div className="ct">Full Product Report</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Cost</th><th>Sale</th><th>Margin</th><th>Value</th><th>Status</th></tr></thead><tbody>{productSales.map(p => <tr key={p.id}><td style={{fontWeight:500}}>{p.name}</td><td className="mono" style={{fontSize:11,color:"var(--text3)"}}>{p.code||"—"}</td><td><span className="tag" style={{fontSize:10}}>{p.category||"General"}</span></td><td className="mono">{p.stock_qty||0} {p.unit}</td><td className="mono">{fmt(p.cost_price)}</td><td className="mono">{fmt(p.sale_price)}</td><td><span style={{color:p.margin>30?"var(--green)":p.margin>15?"var(--amber)":"var(--red)",fontWeight:600,fontSize:12}}>{p.margin}%</span></td><td className="mono">{fmt(p.stockValue)}</td><td><span className={"badge "+(p.stock_qty<=p.reorder_level?"b-red":p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)*2?"b-amber":"b-green")} style={{fontSize:10}}>{p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)?"Low":"OK"}</span></td></tr>)}</tbody></table></div></div>
      </div>}
      {tab==="customers" && <div className="card"><div className="ch"><div className="ct">Customer Sales</div><div className="cs">{periodLabels[period]} · {customerSales.length} customers</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>#</th><th>Customer</th><th>Invoices</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>{customerSales.slice(0,50).map((c,i) => <tr key={c.name}><td style={{color:"var(--text3)",fontSize:12}}>{i+1}</td><td style={{fontWeight:500}}>{c.name}</td><td className="mono">{c.count}</td><td className="mono" style={{fontWeight:600}}>{fmt(c.total)}</td><td className="mono tg">{fmt(c.paid)}</td><td className="mono" style={{color:c.total-c.paid>0?"var(--red)":"var(--green)"}}>{fmt(c.total-c.paid)}</td></tr>)}{customerSales.length===0&&<tr><td colSpan={6} className="empty">No sales data</td></tr>}</tbody></table></div></div>}
      {tab==="agents" && <div className="card"><div className="ch"><div className="ct">Agent Performance — {periodLabels[period]}</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>#</th><th>Agent</th><th>Invoices</th><th>Total</th><th>Collected</th><th>Pending</th></tr></thead><tbody>{[...allProfiles].sort((a,b) => filteredInv.filter(i=>i.created_by===b.id).reduce((s,i)=>s+parseFloat(i.amount||0),0) - filteredInv.filter(i=>i.created_by===a.id).reduce((s,i)=>s+parseFloat(i.amount||0),0)).map((agent,i) => { const agInv = filteredInv.filter(i=>i.created_by===agent.id); const agTotal=agInv.reduce((s,i)=>s+parseFloat(i.amount||0),0); const agPaid=agInv.reduce((s,i)=>s+parseFloat(i.amount_paid||0),0); const medals=["🥇","🥈","🥉"]; return <tr key={agent.id}><td><span style={{fontSize:16}}>{medals[i]||i+1}</span></td><td><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{(agent.full_name||"U")[0].toUpperCase()}</div><span style={{fontWeight:600}}>{agent.full_name||"Unknown"}</span></div></td><td className="mono">{agInv.length}</td><td className="mono" style={{fontWeight:600,color:"var(--green)"}}>{fmt(agTotal)}</td><td className="mono tg">{fmt(agPaid)}</td><td className="mono" style={{color:"var(--amber)"}}>{fmt(agTotal-agPaid)}</td></tr>; })}</tbody></table></div></div>}
      {tab==="pl" && (() => {
        const revenue = filteredInv.reduce((s,i)=>s+parseFloat(i.amount_paid||0),0);
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
          {label:"Current",   sub:"Not yet due",  color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0", invs: unpaidInv.filter(i=>age(i)<=0)},
          {label:"1–15 Days", sub:"Early warning", color:"#d97706", bg:"#fffbeb", border:"#fde68a", invs: unpaidInv.filter(i=>age(i)>0&&age(i)<=15)},
          {label:"16–30 Days",sub:"Chase now",     color:"#ea580c", bg:"#fff7ed", border:"#fed7aa", invs: unpaidInv.filter(i=>age(i)>15&&age(i)<=30)},
          {label:"31–60 Days",sub:"Urgent",        color:"#dc2626", bg:"#fef2f2", border:"#fecaca", invs: unpaidInv.filter(i=>age(i)>30&&age(i)<=60)},
          {label:"61–90 Days",sub:"Critical",      color:"#b91c1c", bg:"#fff1f2", border:"#fecdd3", invs: unpaidInv.filter(i=>age(i)>60&&age(i)<=90)},
          {label:"90+ Days",  sub:"Write-off risk",color:"#7f1d1d", bg:"#fef2f2", border:"#fca5a5", invs: unpaidInv.filter(i=>age(i)>90)},
        ];
        const grandTotal = unpaidInv.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0);
        const maxBucket = Math.max(...buckets.map(b=>b.invs.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0)),1);
        const customerRows = [...new Set(unpaidInv.map(i=>i.customer))].map(cust=>{
          const cinvs = unpaidInv.filter(i=>i.customer===cust);
          return {
            name:cust,
            contact: contacts.find(c=>c.name===cust),
            current: buckets[0].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0),
            d15:     buckets[1].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0),
            d30:     buckets[2].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0),
            d60:     buckets[3].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0),
            d90:     buckets[4].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0),
            d90p:    buckets[5].invs.filter(i=>i.customer===cust).reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0),
            total:   cinvs.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0),
            count:   cinvs.length,
            oldest:  Math.max(...cinvs.map(i=>age(i))),
            invs:    cinvs,
          };
        }).sort((a,b)=>b.total-a.total);
        const riskTotal = buckets.slice(3).reduce((s,b)=>s+b.invs.reduce((ss,i)=>ss+parseFloat(i.balance||i.amount||0),0),0);
        return (
          <div>
            {/* Summary KPI cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:20}}>
              {buckets.map(b=>{
                const amt = b.invs.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0);
                const pct = Math.round((amt/Math.max(grandTotal,1))*100);
                return (
                  <div key={b.label} style={{background:b.bg,border:"1px solid "+b.border,borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:b.color,textTransform:"uppercase",letterSpacing:".6px",marginBottom:4}}>{b.label}</div>
                    <div style={{fontSize:16,fontWeight:800,color:b.color,letterSpacing:"-.5px"}}>{fmt(amt)}</div>
                    <div style={{fontSize:10,color:b.color,opacity:.7,marginTop:3}}>{b.invs.length} inv · {pct}%</div>
                    <div style={{height:3,background:b.border,borderRadius:2,marginTop:8}}><div style={{height:"100%",background:b.color,borderRadius:2,width:Math.round((amt/maxBucket)*100)+"%",transition:"width .3s"}}/></div>
                    <div style={{fontSize:9,color:b.color,opacity:.6,marginTop:4}}>{b.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Risk alert bar */}
            {riskTotal > 0 && (
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,background:"#fee2e2",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:"#dc2626"}}>High risk debt: {fmt(riskTotal)}</div>
                  <div style={{fontSize:11,color:"#ef4444",marginTop:2}}>Invoices over 30 days old — immediate action required</div>
                </div>
                <div style={{marginLeft:"auto",textAlign:"right"}}>
                  <div style={{fontSize:11,color:"#dc2626",fontWeight:600}}>{Math.round((riskTotal/Math.max(grandTotal,1))*100)}% of total debt</div>
                  <div style={{fontSize:10,color:"#ef4444"}}>{buckets.slice(3).reduce((s,b)=>s+b.invs.length,0)} invoices affected</div>
                </div>
              </div>
            )}

            {/* Customer breakdown table */}
            <div className="card">
              <div className="ch">
                <div>
                  <div className="ct">Aged Debtors — Customer Breakdown</div>
                  <div className="cs">Total outstanding: <strong style={{color:"var(--red)"}}>{fmt(grandTotal)}</strong> across {customerRows.length} customer{customerRows.length!==1?"s":""}</div>
                </div>
                <button className="btn bo bsm" onClick={() => {
                  const hdr = ["Customer","Current","1-15d","16-30d","31-60d","61-90d","90+d","Total","Days Oldest"].join(","); const data = customerRows.map(c=>[c.name,c.current,c.d15,c.d30,c.d60,c.d90,c.d90p,c.total,c.oldest].join(",")).join("\n"); const rows = hdr+"\n"+data;
                  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([rows],{type:"text/csv"}));a.download="aged-debtors.csv";a.click();
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export CSV
                </button>
              </div>
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                <table style={{minWidth:700,width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{background:"#f8fafc"}}>
                      <th style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid #e2e8f0"}}>Customer</th>
                      <th style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:"#16a34a",textTransform:"uppercase",letterSpacing:".6px",textAlign:"right",borderBottom:"1px solid #e2e8f0"}}>Current</th>
                      <th style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:"#d97706",textTransform:"uppercase",letterSpacing:".6px",textAlign:"right",borderBottom:"1px solid #e2e8f0"}}>1–15d</th>
                      <th style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:"#ea580c",textTransform:"uppercase",letterSpacing:".6px",textAlign:"right",borderBottom:"1px solid #e2e8f0"}}>16–30d</th>
                      <th style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:"#dc2626",textTransform:"uppercase",letterSpacing:".6px",textAlign:"right",borderBottom:"1px solid #e2e8f0"}}>31–60d</th>
                      <th style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:"#b91c1c",textTransform:"uppercase",letterSpacing:".6px",textAlign:"right",borderBottom:"1px solid #e2e8f0"}}>61–90d</th>
                      <th style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:"#7f1d1d",textTransform:"uppercase",letterSpacing:".6px",textAlign:"right",borderBottom:"1px solid #e2e8f0"}}>90+d</th>
                      <th style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".6px",textAlign:"right",borderBottom:"1px solid #e2e8f0"}}>Total</th>
                      <th style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".6px",textAlign:"center",borderBottom:"1px solid #e2e8f0"}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerRows.map((c,idx)=>(
                      <tr key={c.name} style={{background:idx%2===0?"#fff":"#fafbfc"}}>
                        <td style={{padding:"11px 14px",borderBottom:"1px solid #f1f5f9"}}>
                          <div style={{fontWeight:700,color:"#0f172a",fontSize:13}}>{c.name}</div>
                          <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{c.count} invoice{c.count!==1?"s":""} · oldest {c.oldest}d</div>
                        </td>
                        <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#16a34a",borderBottom:"1px solid #f1f5f9"}}>{c.current>0?fmt(c.current):<span style={{color:"#e2e8f0"}}>—</span>}</td>
                        <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#d97706",borderBottom:"1px solid #f1f5f9"}}>{c.d15>0?fmt(c.d15):<span style={{color:"#e2e8f0"}}>—</span>}</td>
                        <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#ea580c",borderBottom:"1px solid #f1f5f9"}}>{c.d30>0?fmt(c.d30):<span style={{color:"#e2e8f0"}}>—</span>}</td>
                        <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#dc2626",borderBottom:"1px solid #f1f5f9"}}>{c.d60>0?fmt(c.d60):<span style={{color:"#e2e8f0"}}>—</span>}</td>
                        <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#b91c1c",borderBottom:"1px solid #f1f5f9"}}>{c.d90>0?fmt(c.d90):<span style={{color:"#e2e8f0"}}>—</span>}</td>
                        <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#7f1d1d",fontWeight:700,borderBottom:"1px solid #f1f5f9"}}>{c.d90p>0?fmt(c.d90p):<span style={{color:"#e2e8f0"}}>—</span>}</td>
                        <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:13,fontWeight:800,color:c.oldest>30?"#dc2626":c.oldest>15?"#ea580c":"#0f172a",borderBottom:"1px solid #f1f5f9"}}>{fmt(c.total)}</td>
                        <td style={{padding:"11px 14px",textAlign:"center",borderBottom:"1px solid #f1f5f9"}}>
                          <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                            {c.contact?.phone && <button className="btn bo bsm" style={{fontSize:10,padding:"3px 8px"}} onClick={()=>window.open("tel:"+c.contact.phone)}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.64 2.76h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.46-1.46a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              Call
                            </button>}
                            {c.contact?.email && <button className="btn bo bsm" style={{fontSize:10,padding:"3px 8px"}} onClick={async()=>{ const rows=c.invs.map(i=>`<tr><td style="font-family:monospace;color:#2563eb;padding:7px 12px;border-bottom:1px solid #f1f5f9">${escHtml(i.invoice_number)}</td><td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px">${fmtDate(i.invoice_date)}</td><td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-weight:700;text-align:right;color:#dc2626">${fmt(i.balance||i.amount)}</td></tr>`).join(""); const html=`<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f2f5;padding:24px 16px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09)"><div style="background:#b45309;padding:20px 28px"><div style="font-size:16px;font-weight:800;color:#fff">Payment Reminder</div><div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:2px">${escHtml(COMPANY.name)}</div></div><div style="padding:24px 28px"><p style="font-size:13px;color:#0f172a;margin:0 0 16px">Dear <strong>${escHtml(c.name)}</strong>,</p><p style="font-size:13px;color:#64748b;margin:0 0 20px">The following invoices are outstanding on your account. Please arrange payment at your earliest convenience.</p><table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px"><thead><tr style="background:#b45309"><th style="padding:8px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.7);text-align:left;text-transform:uppercase">Invoice</th><th style="padding:8px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.7);text-align:left;text-transform:uppercase">Date</th><th style="padding:8px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.7);text-align:right;text-transform:uppercase">Outstanding</th></tr></thead><tbody>${rows}</tbody></table><div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;margin-bottom:20px"><span style="font-size:13px;font-weight:700;color:#dc2626">Total Outstanding</span><span style="font-size:16px;font-weight:800;color:#dc2626;font-family:monospace">${fmt(c.total)}</span></div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:16px"><div style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:6px">Payment Details</div><div style="font-size:11px;color:#64748b">Bank: ${escHtml(COMPANY.bankName)} · Sort: ${escHtml(COMPANY.sortCode)} · Account: ${escHtml(COMPANY.accountNumber)}</div></div><p style="font-size:12px;color:#64748b;margin:0">If you have already made payment please disregard this notice. Contact us at ${escHtml(COMPANY.phone)} for any queries.</p></div><div style="background:#f8fafc;padding:12px 28px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8">${escHtml(COMPANY.name)} · VAT: ${escHtml(COMPANY.vatNumber)}</div></div></body></html>`; const result=await sendEmail({to:c.contact.email,subject:`Payment Reminder — ${c.invs.map(i=>i.invoice_number).join(", ")} — ${COMPANY.name}`,html,token}); if(result.success)toast.success(`Reminder sent to ${c.contact.email}`); else toast.error("Failed to send email"); }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                              Email
                            </button>}
                            {c.contact?.phone && <button className="btn bo bsm" style={{fontSize:10,padding:"3px 8px",color:"#16a34a",borderColor:"#16a34a"}} onClick={()=>window.open("https://wa.me/"+c.contact.phone.replace(/\s+/g,"").replace(/^0/,"44")+"?text="+encodeURIComponent("Hi "+c.name+", this is a reminder that you have "+c.count+" outstanding invoice"+(c.count!==1?"s":"")+" totalling "+fmt(c.total)+" with Arkham Retail Ltd. Please arrange payment at your earliest convenience. Thank you."))}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                              WA
                            </button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    {customerRows.length > 0 && (
                      <tr style={{background:"#1e1b4b"}}>
                        <td style={{padding:"12px 14px",fontWeight:800,fontSize:13,color:"#fff"}}>TOTALS</td>
                        <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#86efac",fontWeight:700}}>{fmt(buckets[0].invs.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0))}</td>
                        <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#fde68a",fontWeight:700}}>{fmt(buckets[1].invs.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0))}</td>
                        <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#fed7aa",fontWeight:700}}>{fmt(buckets[2].invs.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0))}</td>
                        <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#fca5a5",fontWeight:700}}>{fmt(buckets[3].invs.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0))}</td>
                        <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#fca5a5",fontWeight:700}}>{fmt(buckets[4].invs.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0))}</td>
                        <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"#fca5a5",fontWeight:700}}>{fmt(buckets[5].invs.reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0))}</td>
                        <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"var(--mono)",fontSize:14,color:"#fff",fontWeight:800}}>{fmt(grandTotal)}</td>
                        <td style={{padding:"12px 14px"}}></td>
                      </tr>
                    )}
                    {customerRows.length===0 && <tr><td colSpan={9} style={{padding:40,textAlign:"center",color:"#94a3b8"}}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",margin:"0 auto 10px",color:"#22c55e"}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      No outstanding invoices — all paid up! 🎉
                    </td></tr>}
                  </tbody>
                </table>
              </div>
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
              <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}>
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
          const inflow = invoices.filter(inv=>{const id=new Date(inv.invoice_date||inv.created_at);return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear()&&inv.status==="paid";}).reduce((s,i)=>s+parseFloat(i.amount_paid||0),0);
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
              <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}>
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
        {lowStockItems.length > 0 && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct" style={{color:"var(--red)"}}>⚠️ Low Stock — {lowStockItems.length} items</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Product</th><th>In Stock</th><th>Reorder At</th><th>Est. Cost to Restock</th></tr></thead><tbody>{lowStockItems.map(p => <tr key={p.id}><td style={{fontWeight:500}}>{p.name}</td><td className="mono tr-c" style={{fontWeight:600}}>{p.stock_qty}</td><td className="mono">{p.reorder_level}</td><td className="mono">{fmt(Math.max(0,p.reorder_level*2-p.stock_qty)*p.cost_price)}</td></tr>)}</tbody></table></div></div>}
        <div className="card"><div className="ch"><div className="ct">Stock by Category</div></div><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Category</th><th>Products</th><th>Cost Value</th><th>Retail Value</th><th>Margin</th><th>Low Stock</th></tr></thead><tbody>{catData.map(c => <tr key={c.name}><td style={{fontWeight:600}}>{c.name}</td><td className="mono">{c.products}</td><td className="mono">{fmt(c.stockValue)}</td><td className="mono tg">{fmt(c.retailValue)}</td><td><span style={{color:c.stockValue>0&&Math.round((c.retailValue-c.stockValue)/c.retailValue*100)>30?"var(--green)":"var(--amber)",fontWeight:600,fontSize:12}}>{c.stockValue>0?Math.round((c.retailValue-c.stockValue)/c.retailValue*100):0}%</span></td><td>{c.lowStock>0?<span className="badge b-red">{c.lowStock}</span>:<span className="badge b-green">✓</span>}</td></tr>)}</tbody></table></div></div>
      </div>}
      {tab === "agent-products" && <AgentProductsReport invoices={invoices} allProfiles={allProfiles} period={period} filteredInv={period === "month" && filteredInv.length === 0 ? invoices : filteredInv} periodLabels={periodLabels} />}
      {tab === "product-tracker" && <ProductSalesTracker invoices={invoices} products={products} allProfiles={allProfiles} />}

      {tab==="cash-recon" && (() => {
        const fromDate = new Date(reconFrom + "T00:00:00");
        const toDate = new Date(reconTo + "T23:59:59");
        const paidInv = invoices.filter(inv => {
          if (inv.status !== "paid" && inv.status !== "partial") return false;
          const d = new Date(inv.invoice_date || inv.created_at);
          return d >= fromDate && d <= toDate;
        });
        const methods = ["cash","bank","card","cheque"];
        const methodLabels = { cash:"💵 Cash", bank:"🏦 Bank Transfer", card:"💳 Card", cheque:"📝 Cheque" };
        const methodColors = { cash:"#16a34a", bank:"#2563eb", card:"#7c3aed", cheque:"#d97706" };
        const methodTotals = methods.reduce((acc, m) => {
          const invs = paidInv.filter(i => (i.payment_method||"cash") === m);
          acc[m] = { count: invs.length, total: invs.reduce((s,i)=>s+(parseFloat(i.amount_paid||i.amount)||0),0) };
          return acc;
        }, {});
        const grandTotal = Object.values(methodTotals).reduce((s,m)=>s+m.total,0);
        const agentMap = {};
        paidInv.forEach(inv => {
          const agent = allProfiles?.find(p=>p.id===inv.created_by)?.full_name || inv.created_by || "Unknown";
          if (!agentMap[agent]) agentMap[agent] = { name:agent, cash:0, bank:0, card:0, cheque:0, total:0, count:0 };
          const method = inv.payment_method || "cash";
          const amt = parseFloat(inv.amount_paid || inv.amount) || 0;
          agentMap[agent][method] = (agentMap[agent][method]||0) + amt;
          agentMap[agent].total += amt;
          agentMap[agent].count += 1;
        });
        const agentRows = Object.values(agentMap).sort((a,b)=>b.total-a.total);

        const DonutRecon = () => {
          if (!grandTotal) return <div className="empty">No paid invoices in this period</div>;
          let cum = 0;
          const segs = methods.filter(m=>methodTotals[m].total>0).map(m => {
            const pct = methodTotals[m].total / grandTotal;
            const a1 = cum*360-90; cum+=pct; const a2 = cum*360-90;
            const r=70,cx=85,cy=85,toRad=a=>a*Math.PI/180;
            const x1=cx+r*Math.cos(toRad(a1)),y1=cy+r*Math.sin(toRad(a1));
            const x2=cx+r*Math.cos(toRad(a2)),y2=cy+r*Math.sin(toRad(a2));
            return { m, path:`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${a2-a1>180?1:0} 1 ${x2} ${y2}Z`, pct:Math.round(pct*100) };
          });
          return (
            <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
              <svg width="170" height="170" viewBox="0 0 170 170">
                {segs.map((s,i)=><path key={i} d={s.path} fill={methodColors[s.m]} opacity="0.9"/>)}
                <circle cx="85" cy="85" r="44" fill="white"/>
                <text x="85" y="80" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="sans-serif">Total</text>
                <text x="85" y="98" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a" fontFamily="sans-serif">{fmt(grandTotal)}</text>
              </svg>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {segs.map(s=>(
                  <div key={s.m} style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:12,height:12,borderRadius:3,background:methodColors[s.m],flexShrink:0}}/>
                    <div style={{fontSize:13}}>{methodLabels[s.m]}</div>
                    <div style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:700,marginLeft:"auto",paddingLeft:24}}>{fmt(methodTotals[s.m].total)}</div>
                    <div style={{fontSize:11,color:"var(--text3)",width:32,textAlign:"right"}}>{s.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          );
        };

        const printRecon = () => {
          const w = window.open("","_blank","width=900,height=700");
          w.document.write(`<!DOCTYPE html><html><head><title>Cash Reconciliation</title><style>
            *{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff}
            body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;padding:32px}
            h1{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:4px}
            .sub{font-size:13px;color:#64748b;margin-bottom:24px}
            .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
            .kpi{border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px}
            .kpi-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
            .kpi-val{font-size:20px;font-weight:800;font-family:'Courier New',monospace}
            table{width:100%;border-collapse:collapse;margin-bottom:24px}
            th{text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;padding:8px 12px;border-bottom:2px solid #e2e8f0;background:#f8fafc}
            td{padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
            .mono{font-family:'Courier New',monospace;font-weight:700}
            .total-row td{background:#f8fafc;font-weight:700}
            .sig{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px;padding-top:24px;border-top:2px solid #e2e8f0}
            .sig-box{border-bottom:2px solid #0a0f1e;height:56px;margin-bottom:8px}
            .sig-lbl{font-size:11px;color:#64748b}
          </style></head><body>
          <h1>💵 Cash Reconciliation Report</h1>
          <div class="sub">Period: ${reconFrom} to ${reconTo} · Generated: ${new Date().toLocaleDateString("en-GB")} · Arkham Retail Ltd</div>
          <div class="kpis">
            ${methods.map(m=>`<div class="kpi" style="border-left:4px solid ${methodColors[m]}"><div class="kpi-label">${methodLabels[m]}</div><div class="kpi-val" style="color:${methodColors[m]}">${fmt(methodTotals[m].total)}</div><div style="font-size:11px;color:#94a3b8;margin-top:3px">${methodTotals[m].count} invoices</div></div>`).join("")}
          </div>
          <h2 style="font-size:14px;font-weight:700;margin-bottom:10px;color:#0f172a">Agent Breakdown</h2>
          <table><thead><tr><th>Agent</th><th>Invoices</th><th style="color:#16a34a">Cash</th><th style="color:#2563eb">Bank</th><th style="color:#7c3aed">Card</th><th style="color:#d97706">Cheque</th><th>Total</th></tr></thead>
          <tbody>
            ${agentRows.map(a=>`<tr><td style="font-weight:600">${a.name}</td><td class="mono">${a.count}</td><td class="mono" style="color:#16a34a">${a.cash>0?fmt(a.cash):"—"}</td><td class="mono" style="color:#2563eb">${a.bank>0?fmt(a.bank):"—"}</td><td class="mono" style="color:#7c3aed">${a.card>0?fmt(a.card):"—"}</td><td class="mono" style="color:#d97706">${a.cheque>0?fmt(a.cheque):"—"}</td><td class="mono">${fmt(a.total)}</td></tr>`).join("")}
            <tr class="total-row"><td>TOTAL</td><td class="mono">${paidInv.length}</td><td class="mono" style="color:#16a34a">${fmt(methodTotals.cash.total)}</td><td class="mono" style="color:#2563eb">${fmt(methodTotals.bank.total)}</td><td class="mono" style="color:#7c3aed">${fmt(methodTotals.card.total)}</td><td class="mono" style="color:#d97706">${fmt(methodTotals.cheque.total)}</td><td class="mono">${fmt(grandTotal)}</td></tr>
          </tbody></table>
          <div class="sig"><div><div class="sig-box"></div><div class="sig-lbl">Prepared by — Signature &amp; Name</div></div><div><div class="sig-box"></div><div class="sig-lbl">Approved by — Signature &amp; Name</div></div></div>
          </body></html>`);
          w.document.close(); w.focus(); setTimeout(()=>w.print(),500);
        };

        return (
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="ch" style={{flexWrap:"wrap",gap:10}}>
                <div className="ct">Cash Reconciliation</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  {[["week","This Week"],["month","This Month"],["custom","Custom Range"]].map(([k,l])=>(
                    <button key={k} className={"btn bsm "+(reconPeriod===k?"bp":"bo")} onClick={()=>{
                      setReconPeriod(k);
                      if(k==="week"){const d=new Date();const f=new Date(d);f.setDate(d.getDate()-7);setReconFrom(f.toISOString().slice(0,10));setReconTo(d.toISOString().slice(0,10));}
                      if(k==="month"){const d=new Date();const f=new Date(d.getFullYear(),d.getMonth(),1);setReconFrom(f.toISOString().slice(0,10));setReconTo(d.toISOString().slice(0,10));}
                    }}>{l}</button>
                  ))}
                  {reconPeriod==="custom" && <>
                    <input type="date" value={reconFrom} onChange={e=>setReconFrom(e.target.value)} style={{padding:"5px 10px",border:"1px solid var(--border)",borderRadius:"var(--r)",fontSize:13,outline:"none",background:"var(--white)",color:"var(--text)"}}/>
                    <span style={{fontSize:13,color:"var(--text3)"}}>to</span>
                    <input type="date" value={reconTo} onChange={e=>setReconTo(e.target.value)} style={{padding:"5px 10px",border:"1px solid var(--border)",borderRadius:"var(--r)",fontSize:13,outline:"none",background:"var(--white)",color:"var(--text)"}}/>
                  </>}
                  <button className="btn bp bsm" onClick={printRecon}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print Report
                  </button>
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
              {methods.map(m=>(
                <div key={m} className="kpi" style={{marginBottom:0,borderLeft:`4px solid ${methodColors[m]}`}}>
                  <div className="kpi-label">{methodLabels[m]}</div>
                  <div className="kpi-val" style={{color:methodColors[m]}}>{fmt(methodTotals[m].total)}</div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{methodTotals[m].count} invoice{methodTotals[m].count!==1?"s":""}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:16,alignItems:"start"}}>
              <div className="card" style={{padding:24,marginBottom:0}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:16}}>By Payment Method</div>
                <DonutRecon/>
              </div>
              <div className="card" style={{marginBottom:0}}>
                <div className="ch"><div className="ct">By Agent</div><div className="cs">{paidInv.length} paid invoices · {reconFrom} → {reconTo}</div></div>
                {agentRows.length===0 ? <div className="empty">No paid invoices in this period</div> : (
                  <div className="tw" style={{overflowX:"auto"}}>
                    <table>
                      <thead><tr><th>Agent</th><th>Invoices</th><th style={{color:"#16a34a"}}>Cash</th><th style={{color:"#2563eb"}}>Bank</th><th style={{color:"#7c3aed"}}>Card</th><th style={{color:"#d97706"}}>Cheque</th><th>Total</th></tr></thead>
                      <tbody>
                        {agentRows.map((a,i)=>(
                          <tr key={i}>
                            <td style={{fontWeight:600}}>{a.name}</td>
                            <td className="mono tm">{a.count}</td>
                            <td className="mono" style={{color:"#16a34a"}}>{a.cash>0?fmt(a.cash):"—"}</td>
                            <td className="mono" style={{color:"#2563eb"}}>{a.bank>0?fmt(a.bank):"—"}</td>
                            <td className="mono" style={{color:"#7c3aed"}}>{a.card>0?fmt(a.card):"—"}</td>
                            <td className="mono" style={{color:"#d97706"}}>{a.cheque>0?fmt(a.cheque):"—"}</td>
                            <td className="mono" style={{fontWeight:700}}>{fmt(a.total)}</td>
                          </tr>
                        ))}
                        <tr style={{background:"#f8fafc",fontWeight:700}}>
                          <td>TOTAL</td><td className="mono">{paidInv.length}</td>
                          <td className="mono" style={{color:"#16a34a"}}>{fmt(methodTotals.cash.total)}</td>
                          <td className="mono" style={{color:"#2563eb"}}>{fmt(methodTotals.bank.total)}</td>
                          <td className="mono" style={{color:"#7c3aed"}}>{fmt(methodTotals.card.total)}</td>
                          <td className="mono" style={{color:"#d97706"}}>{fmt(methodTotals.cheque.total)}</td>
                          <td className="mono" style={{fontWeight:700}}>{fmt(grandTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
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

  const printDN = async (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];

    // Use contacts.total_outstanding (maintained by DB trigger) for the balance figure
    // Then fetch the individual overdue invoices using the agent's own JWT — agents may
    // only see their own invoices, but total_outstanding always reflects ALL invoices
    const contactRecord = contacts.find(c => c.name === dn.customer_name);
    const totalOutstanding = parseFloat(contactRecord?.total_outstanding || 0);


    let overdueInvs = [];
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/invoices?customer=eq.${encodeURIComponent(dn.customer_name)}&status=in.(overdue,pending,partial)&order=invoice_date.asc&select=invoice_number,invoice_date,amount,amount_paid,balance,status`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) overdueInvs = data;
    } catch(e) { overdueInvs = []; }
    const fmt = v => '£' + parseFloat(v||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

    // Delivery value totals
    const deliveryTotal = dnLines.reduce((s,l) => s + (parseFloat(l.unit_price||0) * parseFloat(l.qty||0)), 0);
    const hasPrice = dnLines.some(l => l.unit_price);

    const badgeMap = {
      overdue: '<span class="overdue-badge">Overdue</span>',
      partial: '<span class="partial-badge">Partial</span>',
      pending: '<span class="pending-badge">Pending</span>',
    };

    const overdueSection = (overdueInvs.length > 0 || totalOutstanding > 0) ? `
      <div class="os-section">
        <div class="os-hdr">
          <div class="os-lbl">Outstanding account balance</div>
          <div class="os-total">${fmt(totalOutstanding)} overdue</div>
        </div>
        <table class="os-table">
          <thead><tr>
            <th>Invoice</th><th>Date</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance</th><th style="text-align:right">Days</th><th style="text-align:center">Status</th>
          </tr></thead>
          <tbody>
            ${overdueInvs.map(i => `<tr>
              <td style="font-weight:600">${i.invoice_number}</td>
              <td style="color:#64748b">${fmtD(i.invoice_date)}</td>
              <td style="text-align:right">${fmt(i.amount)}</td>
              <td style="text-align:right;font-weight:600;color:#991b1b">${fmt(i.balance||i.amount)}</td>
              <td style="text-align:right;color:#991b1b">${daysSince(i.invoice_date)}d</td>
              <td style="text-align:center">${badgeMap[i.status]||''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="os-notice">Goods are delivered subject to full payment of all outstanding balances. Please arrange settlement of overdue invoices immediately. Continued supply may be withheld until account is brought up to date.</div>
      </div>` : '';

    const itemsTable = `
      <table>
        <thead><tr>
          <th style="width:38%">Description</th>
          <th style="text-align:center">Unit</th>
          <th style="text-align:center">Qty</th>
          ${hasPrice ? '<th style="text-align:right">Unit price</th><th style="text-align:right">Line total</th>' : ''}
          <th style="text-align:center">Delivered</th>
        </tr></thead>
        <tbody>
          ${dnLines.map(l => `<tr>
            <td style="font-weight:600">${l.description||'—'}</td>
            <td style="text-align:center;color:#64748b">${l.unit||'unit'}</td>
            <td style="text-align:center;font-weight:600">${l.qty}</td>
            ${hasPrice ? `<td style="text-align:right">${fmt(l.unit_price)}</td><td style="text-align:right;font-weight:600">${fmt((l.unit_price||0)*(l.qty||0))}</td>` : ''}
            <td style="text-align:center;color:#94a3b8">______</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${hasPrice ? `<div class="deliv-total"><div class="deliv-total-box"><span class="deliv-total-lbl">This delivery value</span><span class="deliv-total-val">${fmt(deliveryTotal)}</span></div></div>` : ''}`;

    const html = `<!DOCTYPE html><html><head><title>${dn.dn_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;padding:30mm 20mm 20mm;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent-bar{height:5px;background:linear-gradient(90deg,#1e1b4b 0%,#4f46e5 60%,#818cf8 100%);margin:-30mm -20mm 0}.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 0 20px;border-bottom:.5px solid #e2e8f0;margin-bottom:20px}.logo-wrap{display:flex;align-items:center;gap:14px;flex:1;min-width:0}.logo-box{width:48px;height:48px;background:#1e1b4b;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.co-name{font-size:15px;font-weight:700;color:#0f172a}.co-det{font-size:10.5px;color:#64748b;line-height:1.6;margin-top:2px;word-break:break-word}.dn-title{font-size:24px;font-weight:900;color:#e2e8f0;letter-spacing:-1px;text-align:right;line-height:1}.dn-num{font-size:15px;font-weight:800;text-align:right;color:#0f172a;margin-top:2px}.dn-status{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;background:#dbeafe;color:#1e40af;border:.5px solid #bfdbfe}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.meta-dk{background:#1e1b4b;border-radius:8px;padding:14px 16px}.meta-dk .lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}.meta-dk .val{font-size:18px;font-weight:700;color:#fff;line-height:1.2}.meta-dk .sub{font-size:11px;color:rgba(255,255,255,.5);margin-top:6px;line-height:1.7}.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mbox{background:#f8fafc;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 12px}.mbox .lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.mbox .val{font-size:12px;font-weight:600;color:#0f172a}table{width:100%;border-collapse:collapse;margin-bottom:16px}thead tr{background:#1e1b4b}th{padding:9px 10px;font-size:9px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;text-align:left}th:first-child{border-radius:6px 0 0 6px}th:last-child{border-radius:0 6px 6px 0}td{padding:10px;border-bottom:.5px solid #f1f5f9;font-size:12px}tr:last-child td{border-bottom:none}.deliv-total{display:flex;justify-content:flex-end;margin-bottom:20px}.deliv-total-box{display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 16px;min-width:220px;gap:16px}.deliv-total-lbl{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px}.deliv-total-val{font-size:15px;font-weight:700;color:#0f172a}.os-section{margin-top:24px;margin-bottom:20px}.os-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.os-lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px}.os-total{background:#fee2e2;border:.5px solid #fca5a5;border-radius:8px;padding:4px 14px;font-size:13px;font-weight:700;color:#991b1b}.os-table{width:100%;border-collapse:collapse;margin-bottom:12px}.os-table thead tr{background:#f8fafc;border-bottom:.5px solid #e2e8f0}.os-table th{padding:6px 8px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;text-align:left}.os-table td{padding:7px 8px;border-bottom:.5px solid #f8fafc;font-size:11px}.os-table tr:last-child td{border-bottom:none}.overdue-badge{background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.partial-badge{background:#ede9fe;color:#5b21b6;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.pending-badge{background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.os-notice{border:.5px solid #fca5a5;border-left:3px solid #dc2626;border-radius:0 8px 8px 0;padding:10px 14px;background:#fff7f7;margin-bottom:20px;font-size:11px;color:#991b1b;line-height:1.6}.nb{background:#fef9ec;border:.5px solid #fcd34d;border-radius:8px;padding:12px 14px;margin-bottom:16px}.nb .lbl{font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.nb .val{font-size:12px;color:#78350f;line-height:1.6}.sig-section{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px}.sig-box{border:.5px solid #e2e8f0;border-radius:8px;padding:14px 16px}.sig-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px}.sig-line{height:44px;border-bottom:1.5px solid #cbd5e1;margin-bottom:8px}.sig-hint{display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}.tb{border:.5px solid #e2e8f0;border-left:3px solid #4f46e5;border-radius:0 8px 8px 0;padding:12px 14px;background:#f8fafc;margin-bottom:14px}.tb .lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}.tb .val{font-size:11px;color:#64748b;line-height:1.7}.footer{font-size:10px;color:#94a3b8;border-top:.5px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between}</style></head><body>
      <div class="accent-bar"></div>
      <div class="hdr">
        <div class="logo-wrap">
          <div class="logo-box"><svg width=\"28\" height=\"28\" viewBox=\"0 0 48 48\" fill=\"none\"><rect x=\"10\" y=\"13\" width=\"28\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\"/><rect x=\"10\" y=\"20\" width=\"20\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".6\"/><rect x=\"10\" y=\"27\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".35\"/><rect x=\"10\" y=\"34\" width=\"14\" height=\"3\" rx=\"1.5\" fill=\"#818cf8\" fill-opacity=\".18\"/><rect x=\"30\" y=\"21\" width=\"2.5\" height=\"14\" rx=\"1.25\" fill=\"#60a5fa\"/><polygon points=\"36,27 30,21 30,35\" fill=\"#60a5fa\" fill-opacity=\".4\"/></svg></div>
          <div>
            <div class="co-name">${COMPANY.name}</div>
            <div class="co-det">${COMPANY.address}<br>${COMPANY.city}, ${COMPANY.postcode}<br>Tel: ${COMPANY.phone} &middot; ${COMPANY.email}<br>VAT: ${COMPANY.vatNumber}</div>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;max-width:160px">
          <div class="dn-title">DELIVERY NOTE</div>
          <div class="dn-num">${dn.dn_number}</div>
          <div class="dn-status">${(dn.status||'pending').toUpperCase()}</div>
        </div>
      </div>
      <div class="meta">
        <div class="meta-dk">
          <div class="lbl">Deliver to</div>
          <div class="val">${dn.customer_name}</div>
          ${dn.delivery_address ? '<div class="sub">'+dn.delivery_address.replace(/\n/g,'<br>')+'</div>' : ''}
        </div>
        <div class="mgrid">
          <div class="mbox"><div class="lbl">DN number</div><div class="val">${dn.dn_number}</div></div>
          <div class="mbox"><div class="lbl">Date</div><div class="val">${fmtD(dn.delivery_date)}</div></div>
          ${dn.invoice_ref ? '<div class="mbox"><div class="lbl">Invoice ref</div><div class="val">'+dn.invoice_ref+'</div></div>' : '<div class="mbox"><div class="lbl">Invoice ref</div><div class="val">—</div></div>'}
          <div class="mbox"><div class="lbl">Driver</div><div class="val">${dn.driver||'—'}</div></div>
        </div>
      </div>
      ${itemsTable}
      ${overdueSection}
      ${dn.notes ? '<div class="nb"><div class="lbl">Delivery instructions</div><div class="val">'+dn.notes+'</div></div>' : ''}
      <div class="sig-section">
        <div class="sig-box"><div class="sig-lbl">Delivered by</div><div class="sig-line"></div><div class="sig-hint"><span>Signature</span><span>Name &amp; date</span></div></div>
        <div class="sig-box"><div class="sig-lbl">Received by</div><div class="sig-line"></div><div class="sig-hint"><span>Signature</span><span>Name &amp; date</span></div></div>
      </div>
      <div class="tb"><div class="lbl">Terms</div><div class="val">Goods remain the property of Arkham Retail Ltd until paid for in full. This delivery note must be signed and returned. Any discrepancies must be reported within 24 hours of receipt.</div></div>
      <div class="footer">
        <span>${COMPANY.name} &middot; VAT: ${COMPANY.vatNumber}</span>
        <span>${dn.dn_number}</span>
        <span>Printed: ${new Date().toLocaleDateString('en-GB')}</span>
      </div>
    </body></html>`;

    window.__ledgerosPrint && window.__ledgerosPrint(html);
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
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 1, flexWrap: "wrap", gap: 10 }}>
          <div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Commerce</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Delivery <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Notes</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{dns.length} total · {dns.filter(d=>d.status==="pending").length} pending</div></div>
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Delivery Note</button>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Total DNs",val:dns.length,sub:"all delivery notes",accent:"#2563eb"},{label:"Pending",val:dns.filter(d=>d.status==="pending").length,sub:"awaiting delivery",accent:"#d97706"},{label:"Delivered",val:dns.filter(d=>d.status==="delivered").length,sub:"completed",accent:"#16a34a"},{label:"This Month",val:dns.filter(d=>{const m=new Date();return new Date(d.created_at).getMonth()===m.getMonth()&&new Date(d.created_at).getFullYear()===m.getFullYear();}).length,sub:"this month",accent:"#7c3aed"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
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
            <div className="fgrp">
              <label>Delivery Date</label>
              <div style={{display:"flex",gap:5,marginBottom:5}}>
                {[{l:"Today",d:0},{l:"+1 day",d:1},{l:"+3 days",d:3},{l:"+7 days",d:7}].map(({l,d})=>{
                  const v=new Date();v.setDate(v.getDate()+d);const val=v.toISOString().split("T")[0];const active=f.delivery_date===val;
                  return <button key={d} type="button" onClick={()=>setF({...f,delivery_date:val})} style={{flex:1,padding:"5px 0",borderRadius:6,border:"1px solid "+(active?"var(--blue)":"var(--border)"),background:active?"var(--blue)":"var(--white)",color:active?"#fff":"var(--text2)",fontSize:11,fontWeight:active?600:400,cursor:"pointer",fontFamily:"var(--sans)"}}>{l}</button>;
                })}
              </div>
              <input type="date" value={f.delivery_date} onChange={e=>setF({...f,delivery_date:e.target.value})} />
            </div>
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
              <button className="btn bo bsm" onClick={() => setLines([...lines, { product_id: "", description: "", qty: 1, unit: "unit" }])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Item</button>
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
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table className="dn-list-table" style={{minWidth:420}}>
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
                      <button className="btn bo bsm" onClick={() => printDN(dn)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</button>
                      <button className="btn bo bsm" onClick={() => sendEmail(dn)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email</button>
                      <button className="btn bwa bsm" onClick={() => sendWhatsApp(dn)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp</button>
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  </>
  );
}


// ── NAV CONFIG ────────────────────────────────────────────────────────────────
const NAV_ICONS = {
  "dashboard":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  "invoices":       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  "contacts":       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  "inventory":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  "purchases":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  "credits":        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  "reports":        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  "analytics":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  "admin-reports":  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="12" y1="17" x2="8" y2="17"/></svg>,
  "statement":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>,
  "stock-adj":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  "agent-report":   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="21" x2="23" y2="19"/><line x1="19" y1="21" x2="19" y2="17"/><line x1="15" y1="21" x2="15" y2="15"/></svg>,
  "import":         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  "delivery-notes": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  "settings":       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  "banking":        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
};

const NAV_GROUPS = [
  {
    label: "Sales",
    items: [
      { id: "invoices",     label: "Invoices" },
      { id: "contacts",     label: "Customers" },
      { id: "statement",    label: "Statements", adminOnly: true },
      { id: "agent-report", label: "Agent Sales", adminOnly: true },
    ]
  },
  {
    label: "Operations",
    items: [
      { id: "inventory",      label: "Inventory" },
      { id: "purchases",      label: "Purchases", adminOnly: true },
      { id: "stock-adj",      label: "Stock In/Out", adminOnly: true },
      { id: "delivery-notes", label: "Delivery Notes" },
      { id: "import",         label: "Import", adminOnly: true },
    ]
  },
  {
    label: "Finance",
    items: [
      { id: "admin-reports", label: "Reports", adminOnly: true },
      { id: "banking",       label: "Banking", adminOnly: true },
      { id: "credits",       label: "Credits", adminOnly: true },
    ]
  },
];

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "invoices", label: "Invoices" },
  { id: "contacts", label: "Customers" },
  { id: "inventory", label: "Inventory" },
  { id: "purchases", label: "Purchases", adminOnly: true },
  { id: "credits", label: "Credits", adminOnly: true },
  { id: "reports", label: "P&L", adminOnly: true },
  { id: "analytics", label: "Analytics", adminOnly: true },
  { id: "admin-reports", label: "Reports", adminOnly: true },
  { id: "statement", label: "Statements", adminOnly: true },
  { id: "stock-adj", label: "Stock In/Out", adminOnly: true },
  { id: "agent-report", label: "Agent Sales", adminOnly: true },
  { id: "banking", label: "Banking", adminOnly: true },
  { id: "import", label: "Import", adminOnly: true },
  { id: "delivery-notes", label: "Delivery Notes" },
  { id: "settings", label: "Settings", adminOnly: true },
];

const MOBILE_NAV = [
  { id: "dashboard", label: "Home" },
  { id: "invoices", label: "Invoices" },
];
const MOBILE_NAV_RIGHT = [
  { id: "contacts", label: "Contacts" },
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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
  const [printOverlayHTML, setPrintOverlayHTML] = useState(null);
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [pendingInvoiceView, setPendingInvoiceView] = useState(null);
  const [pendingFilter, setPendingFilter] = useState(null);
  const [triggerNewInvoice, setTriggerNewInvoice] = useState(0);
  const [triggerNewContact, setTriggerNewContact] = useState(0);
  const [showFabMenu, setShowFabMenu] = useState(false);
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

  // Expose print overlay setter globally so sub-components can trigger it without prop drilling
  React.useEffect(() => {
    window.__ledgerosPrint = (html) => {
      // Strip the .bta toolbar (React overlay has its own close button) and fix body padding
      const clean = html
        .replace(/<div class="bta">[\s\S]*?&#x2715;<\/a><\/div>/, '')
        .replace(/body\{padding-top:calc\(30mm \+ 54px\)\}/g, '')
        .replace(/@media print\{\.bta\{display:none!important\}body\{padding-top:0!important\}\}/g, '@media print{body{padding-top:0!important}}');
      setPrintOverlayHTML(clean || html);
    };
    return () => { delete window.__ledgerosPrint; };
  }, []);

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
        const today = new Date().toISOString().split("T")[0];
        const processed = invs.map(i => {
          if (i.status === "pending" && i.due_date && i.due_date < today) return { ...i, status: "overdue" };
          return i;
        });
        // Patch any that need flipping in the DB silently
        processed.forEach((i, idx) => {
          if (invs[idx].status !== i.status) {
            sb.patch(auth.token, "invoices", i.id, { status: "overdue" }).catch(()=>{});
          }
        });
        if (isAdmin) {
          setInvoices(processed);
        } else {
          setInvoices(processed.filter(i => i.created_by === auth.user?.id));
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
                    if (Array.isArray(fresh)) {
                      const today2 = new Date().toISOString().split("T")[0];
                      setInvoices(fresh.map(i => i.status === "pending" && i.due_date && i.due_date < today2 ? { ...i, status: "overdue" } : i));
                    }
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

  const signOut = async () => { await sb.signOut(auth.token); localStorage.removeItem('ledgeros_rt'); setAuth(null); };

  // Auto-refresh JWT when a 401 is detected — runs once on mount
  useEffect(() => {
    const checkAndRefresh = async () => {
      if (!window._jwtExpired) return;
      window._jwtExpired = false;
      const rt = localStorage.getItem('ledgeros_rt');
      if (!rt) { localStorage.removeItem('ledgeros_rt'); window.location.reload(); return; }
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ refresh_token: rt })
        });
        const data = await res.json();
        if (data?.access_token) {
          if (data.refresh_token) localStorage.setItem('ledgeros_rt', data.refresh_token);
          setAuth(prev => prev ? { ...prev, token: data.access_token } : prev);
        } else {
          localStorage.removeItem('ledgeros_rt');
          window.location.reload();
        }
      } catch(e) {
        localStorage.removeItem('ledgeros_rt');
        window.location.reload();
      }
    };
    const interval = setInterval(checkAndRefresh, 15000);
    return () => clearInterval(interval);
  }, [auth]);

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

  if (!auth) return <><style>{CSS}</style><Auth onAuth={setAuth} sessionExpired={!!localStorage.getItem('ledgeros_rt')} /></>;

  // ── Mobile PWA install banner rendered inline in JSX ──────────────────────

  return (
    <>
      <style>{CSS}</style>
      <div className={"app" + (darkMode ? " dark-mode" : "")}>
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-inner">
              <div className="logo-mark">
                <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                  <rect x="9" y="12" width="30" height="3.5" rx="1.75" fill="#818cf8"/>
                  <rect x="9" y="19.5" width="22" height="3.5" rx="1.75" fill="#818cf8" fillOpacity=".58"/>
                  <rect x="9" y="27" width="26" height="3.5" rx="1.75" fill="#818cf8" fillOpacity=".32"/>
                  <rect x="9" y="34.5" width="15" height="3.5" rx="1.75" fill="#818cf8" fillOpacity=".16"/>
                  <rect x="31" y="20" width="3" height="16" rx="1.5" fill="url(#sbGrad)"/>
                  <polygon points="38,28 31,20 31,36" fill="#60a5fa" fillOpacity=".45"/>
                  <defs><linearGradient id="sbGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#818cf8"/></linearGradient></defs>
                </svg>
              </div>
              <div className="logo-wm">
                <div className="logo-wm-row">
                  <span className="logo-wm-l">Ledger</span><span className="logo-wm-os">OS</span>
                </div>
                <div className="logo-sub">Arkham Retail Ltd</div>
              </div>
            </div>
            <div className="logo-live">
              <div className="logo-live-dot" />
              <span className="logo-live-txt">Live</span>
            </div>
          </div>
          {/* ── FLAT 5-ITEM NAV ── */}
          <div style={{padding:"8px 8px 4px",display:"flex",flexDirection:"column",gap:1}}>
            {/* Dashboard */}
            <div className={"nav-item "+(page==="dashboard"?"active":"")} onClick={() => setPage("dashboard")}>
              {NAV_ICONS["dashboard"]}Dashboard
            </div>

            {/* Commerce — Invoices, Customers, Statements, Agent Sales, Delivery Notes, Credits */}
            {(() => {
              const commercePages = ["invoices","contacts","statement","agent-report","delivery-notes","credits"];
              const isActive = commercePages.includes(page);
              const overdueCount = invoices.filter(i=>i.status==="overdue").length;
              return (
                <div className={"nav-item "+(isActive?"active":"")} onClick={() => setPage("invoices")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                  Commerce
                  {overdueCount > 0 && <span className="nav-badge">{overdueCount}</span>}
                </div>
              );
            })()}

            {/* Operations — Inventory, Purchases, Stock In/Out, Delivery Notes, Import */}
            {(() => {
              const opsPages = ["inventory","purchases","stock-adj","import"];
              const isActive = opsPages.includes(page);
              return (
                <div className={"nav-item "+(isActive?"active":"")} onClick={() => setPage("inventory")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  Operations
                </div>
              );
            })()}

            {/* Finance — Banking, Reports, Analytics, Admin Reports */}
            {(profile?.role === "admin" || profile?.role === "manager") && (() => {
              const financePages = ["banking","reports","analytics","admin-reports"];
              const isActive = financePages.includes(page);
              return (
                <div className={"nav-item "+(isActive?"active":"")} onClick={() => setPage("banking")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
                  Finance
                </div>
              );
            })()}

            {/* Administration — Settings, Users */}
            {(profile?.role === "admin" || profile?.role === "manager") && (() => {
              const adminPages = ["settings"];
              const isActive = adminPages.includes(page);
              return (
                <div className={"nav-item "+(isActive?"active":"")} onClick={() => setPage("settings")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Administration
                </div>
              );
            })()}
          </div>
          <div className="nav-bottom">
            <div className="nav-bottom-divider" />
            <div className="user-row">
              <div className="user-av-wrap">
                <div className="user-av">{initials}</div>
                <div className="user-av-online" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name">{profile?.full_name||auth.user.email}</div>
                <div className="user-role-badge">{profile?.role||"agent"}</div>
              </div>
              <button className="signout-btn" onClick={signOut} title="Sign out">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>
        </aside>
        <div className="main">
          {/* ── UTILITY BUTTONS — injected into sub-nav or standalone bar ── */}
          {(() => {
            // Build utility buttons JSX (reused in sub-nav and dashboard bar)
            const pendingUsersU = profile?.role==="admin" ? allProfiles.filter(p=>p.approved===null&&p.role!=="admin") : [];
            const notifsU = [
              ...pendingUsersU.map(p=>({ id:"pu-"+p.id, type:"approval", icon:"ti-user-check", color:"var(--blue)", bg:"var(--blue-lt)", title:"Approval Required", body:`${p.full_name||"New agent"} is awaiting account approval`, action:()=>setPage("settings") })),
              ...invoices.filter(i=>i.status==="overdue").map(i=>({ id:"ov-"+i.id, type:"overdue", icon:"ti-alert-circle", color:"var(--red)", bg:"var(--red-lt)", title:"Overdue Invoice", body:`${i.customer} — ${fmt(i.amount)} overdue`, action:()=>setPage("invoices") })),
              ...products.filter(p=>p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)).map(p=>({ id:"ls-"+p.id, type:"lowstock", icon:"ti-package-off", color:"var(--amber)", bg:"var(--amber-lt)", title:"Low Stock Alert", body:`${p.name} — only ${p.stock_qty} ${p.unit||"units"} left`, action:()=>setPage("inventory") })),
              ...invoices.filter(i=>i.status==="paid").slice(0,3).map(i=>({ id:"pd-"+i.id, type:"paid", icon:"ti-circle-check", color:"var(--green)", bg:"var(--green-lt)", title:"Payment Received", body:`${i.customer} paid ${fmt(i.amount)}`, action:()=>setPage("invoices") })),
            ].filter(n=>!dismissedNotifs.includes(n.id));
            const unreadU = notifsU.length;
            window.__utilityBtns = (
              <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto",paddingLeft:16,borderLeft:"1px solid rgba(255,255,255,.08)"}}>
                <div className="tb-btn" onClick={() => setShowCmdK(true)} title="Search (⌘K)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <div style={{position:"relative"}}>
                  <div className="tb-btn" onClick={()=>setShowNotifications(v=>!v)} title="Notifications" style={{position:"relative"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    {unreadU>0&&<span style={{position:"absolute",top:-4,right:-4,background:"var(--red)",color:"#fff",fontSize:8,fontWeight:700,width:14,height:14,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #fff"}}>{unreadU>9?"9+":unreadU}</span>}
                  </div>
                  {showNotifications && (
                    <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,width:340,background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--rxl)",boxShadow:"var(--sh3)",zIndex:300,overflow:"hidden",animation:"scaleIn .15s var(--ease) both",transformOrigin:"top right"}}>
                      <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{fontWeight:700,fontSize:14}}>Notifications</div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          {notifsU.length>0&&<button onClick={()=>{const ids=notifsU.map(n=>n.id);setDismissedNotifs(prev=>{const next=[...prev,...ids];localStorage.setItem("dismissed_notifs",JSON.stringify(next));return next;});}} style={{fontSize:11,color:"var(--text3)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--sans)"}}>Clear all</button>}
                          <button onClick={()=>setShowNotifications(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",display:"flex",alignItems:"center"}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                      </div>
                      <div style={{maxHeight:400,overflowY:"auto"}}>
                        {notifsU.length===0?(<div style={{padding:"32px 16px",textAlign:"center",color:"var(--text3)"}}><div style={{fontSize:13}}>All caught up!</div></div>):notifsU.map(n=>(
                          <div key={n.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 16px",borderBottom:"1px solid #f0f3f8",cursor:"pointer",transition:"background .1s"}} onClick={()=>{n.action();setShowNotifications(false);}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafd"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <div style={{width:34,height:34,borderRadius:9,background:n.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><i className={"ti "+n.icon} style={{color:n.color,fontSize:16}} /></div>
                            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{n.title}</div><div style={{fontSize:12,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.body}</div></div>
                            <button onClick={e=>{e.stopPropagation();setDismissedNotifs(prev=>{const next=[...prev,n.id];localStorage.setItem("dismissed_notifs",JSON.stringify(next));return next;});}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",padding:4,display:"flex",alignItems:"center"}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                          </div>
                        ))}
                      </div>
                      {notifsU.length>0&&<div style={{padding:"10px 16px",background:"#f8fafd",borderTop:"1px solid var(--border)",fontSize:11,color:"var(--text3)",textAlign:"center"}}>{unreadU} alert{unreadU!==1?"s":""} · Click to dismiss</div>}
                    </div>
                  )}
                </div>
                <div className="tb-btn" onClick={()=>setShowOnboarding(true)} title="Getting started">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>
                </div>
                <button className="tb-btn" onClick={async()=>{ if(!showActivity&&profile?.role!=="admin"&&profile?.role!=="manager")return; setShowActivity(v=>{if(!v){setLoadingAudit(true);fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/audit_log?order=created_at.desc&limit=100`,{headers:{"apikey":import.meta.env.VITE_SUPABASE_ANON_KEY,"Authorization":`Bearer ${auth.token}`}}).then(r=>r.json()).then(d=>{setAuditLog(Array.isArray(d)?d:[]);setLoadingAudit(false);}).catch(()=>setLoadingAudit(false));}return!v;}); }} title="Activity" style={{background:showActivity?"var(--green-lt)":undefined,color:showActivity?"var(--green-dk)":undefined,borderColor:showActivity?"var(--green)":undefined}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                </button>
                <button className="tb-btn" onMouseEnter={()=>setShowAI(true)} onClick={()=>setShowAI(v=>!v)} title="AI Assistant" style={{background:showAI?"var(--blue-lt)":undefined,color:showAI?"var(--blue)":undefined,borderColor:showAI?"var(--blue)":undefined}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                </button>
              </div>
            );
            return null; // buttons injected via window.__utilityBtns
          })()}
          {/* ── Standalone utility bar for Dashboard (no sub-nav) ── */}
          {page === "dashboard" && (
            <div style={{background:"linear-gradient(90deg,#0f172a 0%,#1e1b4b 100%)",borderBottom:"1px solid rgba(99,102,241,.15)",display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"0 20px",height:42,position:"sticky",top:0,zIndex:40,flexShrink:0}}>
              {window.__utilityBtns}
            </div>
          )}
          {/* KEEP: hidden search state for Ctrl+K compatibility */}
          <div style={{display:"none"}}>
              <div className="search-wrap topbar-search" style={{ position: "relative" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              {/* Notifications */}
              {(() => {
                const pendingUsers = profile?.role==="admin" ? allProfiles.filter(p=>p.approved===null&&p.role!=="admin") : [];
                const notifs = [
                  ...pendingUsers.map(p=>({ id:"pu-"+p.id, type:"approval", icon:"ti-user-check", color:"var(--blue)", bg:"var(--blue-lt)", title:"Approval Required", body:`${p.full_name||"New agent"} is awaiting account approval`, action:()=>setPage("settings") })),
                  ...invoices.filter(i=>i.status==="overdue").map(i=>({ id:"ov-"+i.id, type:"overdue", icon:"ti-alert-circle", color:"var(--red)", bg:"var(--red-lt)", title:"Overdue Invoice", body:`${i.customer} — ${fmt(i.amount)} overdue`, action:()=>setPage("invoices") })),
                  ...products.filter(p=>p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)).map(p=>({ id:"ls-"+p.id, type:"lowstock", icon:"ti-package-off", color:"var(--amber)", bg:"var(--amber-lt)", title:"Low Stock Alert", body:`${p.name} — only ${p.stock_qty} ${p.unit||"units"} left`, action:()=>setPage("inventory") })),
                  ...invoices.filter(i=>i.status==="paid").slice(0,3).map(i=>({ id:"pd-"+i.id, type:"paid", icon:"ti-circle-check", color:"var(--green)", bg:"var(--green-lt)", title:"Payment Received", body:`${i.customer} paid ${fmt(i.amount)}`, action:()=>setPage("invoices") })),
                ].filter(n=>!dismissedNotifs.includes(n.id));
                const unread = notifs.length;
                return (
                  <div style={{position:"relative"}}>
                    <div className={"tb-btn"+(unread>0?" tb-notif":"")} onClick={()=>setShowNotifications(v=>!v)} style={{cursor:"pointer"}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      {unread>0&&<span style={{position:"absolute",top:-4,right:-4,background:"var(--red)",color:"#fff",fontSize:9,fontWeight:700,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #060d1f"}}>{unread>9?"9+":unread}</span>}
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
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",margin:"0 auto 8px",opacity:.4}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                              <div style={{fontSize:13}}>All caught up!</div>
                            </div>
                          ):notifs.map(n=>(
                            <div key={n.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 16px",borderBottom:"1px solid #f0f3f8",cursor:"pointer",transition:"background .1s"}} onClick={()=>{n.action();setShowNotifications(false);}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafd"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                              <div style={{width:34,height:34,borderRadius:9,background:n.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><i className={"ti "+n.icon} style={{color:n.color,fontSize:16}} /></div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{n.title}</div>
                                <div style={{fontSize:12,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.body}</div>
                              </div>
                              <button onClick={e=>{e.stopPropagation();setDismissedNotifs(prev=>{const next=[...prev,n.id];localStorage.setItem("dismissed_notifs",JSON.stringify(next));return next;});}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",padding:4,fontSize:14,flexShrink:0,display:"flex",alignItems:"center"}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                            </div>
                          ))}
                        </div>
                        {notifs.length>0&&<div style={{padding:"10px 16px",background:"#f8fafd",borderTop:"1px solid var(--border)",fontSize:11,color:"var(--text3)",textAlign:"center"}}>{unread} alert{unread!==1?"s":""} · Click to navigate · Dismiss to clear</div>}
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Onboarding guide */}
              <div className="tb-btn" onClick={() => setShowOnboarding(true)} title="Getting started">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>
              </div>
              {/* Activity log */}
              <button className="tb-btn" onClick={async () => {
                if (!showActivity && profile?.role !== "admin" && profile?.role !== "manager") return;
                setShowActivity(v => { if (!v) { setLoadingAudit(true); fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/audit_log?order=created_at.desc&limit=100`, { headers: { "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY, "Authorization": `Bearer ${auth.token}` } }).then(r=>r.json()).then(d=>{ setAuditLog(Array.isArray(d)?d:[]); setLoadingAudit(false); }).catch(()=>setLoadingAudit(false)); } return !v; });
              }} title="Activity log" style={{ background: showActivity ? "linear-gradient(135deg,#059669,#10b981)" : undefined, color: showActivity ? "#fff" : undefined, borderColor: showActivity ? "transparent" : undefined }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
              </button>
              {/* AI Assistant */}
              <button className="tb-btn" onMouseEnter={() => setShowAI(true)} onClick={() => setShowAI(v => !v)} title="AI Assistant" style={{ background: showAI ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : undefined, color: showAI ? "#fff" : undefined, borderColor: showAI ? "transparent" : undefined, boxShadow: showAI ? "0 2px 8px rgba(99,102,241,.35)" : undefined }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
              </button>
            </div>
          </div>
          {/* ── SECTION SUB-NAV TABS ── */}
          {(() => {
            const isAdmin = profile?.role === "admin" || profile?.role === "manager";
            const overdueCount = invoices.filter(i=>i.status==="overdue").length;
            const sections = {
              commerce: {
                pages: ["invoices","contacts","statement","agent-report","delivery-notes","credits"],
                tabs: [
                  { id:"invoices",       label:"Invoices",       badge: overdueCount > 0 ? overdueCount : null },
                  { id:"contacts",       label:"Customers" },
                  { id:"statement",      label:"Statements",     adminOnly:true },
                  { id:"agent-report",   label:"Agent Sales",    adminOnly:true },
                  { id:"delivery-notes", label:"Delivery Notes" },
                  { id:"credits",        label:"Credits",        adminOnly:true },
                ]
              },
              operations: {
                pages: ["inventory","purchases","stock-adj","import"],
                tabs: [
                  { id:"inventory", label:"Inventory" },
                  { id:"purchases", label:"Purchases",  adminOnly:true },
                  { id:"stock-adj", label:"Stock In/Out",adminOnly:true },
                  { id:"import",    label:"Import",     adminOnly:true },
                ]
              },
              finance: {
                pages: ["banking","admin-reports","analytics","reports"],
                tabs: [
                  { id:"banking",       label:"Banking",    adminOnly:true },
                  { id:"admin-reports", label:"Reports",    adminOnly:true },
                  { id:"analytics",     label:"Analytics",  adminOnly:true },
                  { id:"reports",       label:"P&L",        adminOnly:true },
                ]
              },
            };
            const activeEntry = Object.entries(sections).find(([,s]) => s.pages.includes(page));
            if (!activeEntry) return null;
            const [, section] = activeEntry;
            const visibleTabs = section.tabs.filter(t => !t.adminOnly || isAdmin);
            if (visibleTabs.length < 2) return null;
            return (
              <div style={{ background:"linear-gradient(90deg,#0f172a 0%,#1e1b4b 100%)", borderBottom:"1px solid rgba(99,102,241,.15)", display:"flex", alignItems:"center", padding:"0 20px", position:"sticky", top:0, zIndex:40, flexShrink:0 }}>
                {visibleTabs.map(tab => (
                  <div key={tab.id} onClick={() => setPage(tab.id)} style={{ padding:"0 14px", height:42, display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:page===tab.id?600:400, color:page===tab.id?"#a5b4fc":"rgba(255,255,255,.4)", borderBottom:page===tab.id?"2px solid #818cf8":"2px solid transparent", cursor:"pointer", whiteSpace:"nowrap", transition:"color .12s,border-color .12s" }}
                    onMouseEnter={e=>{if(page!==tab.id){e.currentTarget.style.color="rgba(255,255,255,.7)";e.currentTarget.style.borderBottom="2px solid rgba(129,140,248,.3)";}}}
                    onMouseLeave={e=>{if(page!==tab.id){e.currentTarget.style.color="rgba(255,255,255,.4)";e.currentTarget.style.borderBottom="2px solid transparent";}}}>
                    {tab.label}
                    {tab.badge && <span style={{ fontSize:9, fontWeight:700, background:"rgba(239,68,68,.2)", color:"#fca5a5", padding:"1px 5px", borderRadius:20, border:"1px solid rgba(239,68,68,.3)" }}>{tab.badge}</span>}
                  </div>
                ))}
                {window.__utilityBtns}
              </div>
            );
          })()}
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
                {page==="dashboard"&&<Dashboard accounts={accounts} invoices={invoices} setInvoices={setInvoices} contacts={contacts} products={products} profile={profile} setPage={setPage} setPendingFilter={setPendingFilter} allProfiles={allProfiles} token={auth.token} userId={auth.user.id} />}
                {page==="invoices"&&<Invoices invoices={invoices} setInvoices={setInvoices} contacts={contacts} products={products} token={auth.token} userId={auth.user.id} profile={profile} allProfiles={allProfiles||[]} pendingInvoiceView={pendingInvoiceView} onClearPending={() => setPendingInvoiceView(null)} pendingFilter={pendingFilter} onClearFilter={() => setPendingFilter(null)} triggerNewInvoice={triggerNewInvoice} onTriggerHandled={() => setTriggerNewInvoice(0)} />}
                {page==="contacts"&&<Contacts contacts={contacts} setContacts={setContacts} token={auth.token} userId={auth.user.id} invoices={invoices} products={products} profile={profile} triggerNewContact={triggerNewContact} onTriggerContactHandled={() => setTriggerNewContact(0)} />}
                {page==="inventory"&&<Inventory products={products} setProducts={setProducts} token={auth.token} userId={auth.user.id} profile={profile} />}
                {page==="purchases"&&<Purchases contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
                {page==="credits"&&<CreditNotes contacts={contacts} invoices={invoices} token={auth.token} userId={auth.user.id} />}
                {page==="reports"&&<Reports accounts={accounts} />}
                {page==="analytics"&&<div style={{margin:"-26px -28px",overflow:"hidden"}}><Analytics invoices={invoices} products={products} contacts={contacts} /></div>}
                {page==="import"&&<div style={{padding:40,textAlign:"center",color:"var(--text3)"}}><span style={{fontSize:40,display:"block",marginBottom:12}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></span><div style={{fontSize:16,fontWeight:600,marginBottom:6}}>CSV Import</div><div style={{fontSize:13}}>Coming soon — import contacts and products from CSV</div></div>}
                {page==="statement"&&<CustomerStatement contacts={contacts} invoices={invoices} token={auth.token} />}
                {page==="admin-reports"&&<AdminReports invoices={invoices} products={products} contacts={contacts} accounts={accounts} allProfiles={allProfiles} setPage={setPage} setPendingFilter={setPendingFilter} />}
                {page==="stock-adj"&&<StockAdjustment products={products} setProducts={setProducts} token={auth.token} />}
                {page==="agent-report"&&<AgentReport invoices={invoices} allProfiles={allProfiles} contacts={contacts} />}
                {page==="delivery-notes"&&<DeliveryNotes contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
                {page==="settings"&&<Settings auth={auth} profile={profile} darkMode={darkMode} toggleDark={toggleDark} onSignOut={signOut} />}
                {page==="banking"&&<BankingPage token={auth.token} userId={auth.user.id} profile={profile} />}
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
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Audit trail — last 100 events</div>
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
                  // ── Invoices ──
                  "invoice_created":     { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>', color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "invoice_deleted":     { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>', color: "var(--red)",    bg: "var(--red-lt)" },
                  "status_changed":      { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>', color: "var(--amber)", bg: "var(--amber-lt)" },
                  "reminder_sent":       { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>', color: "var(--blue)",   bg: "var(--blue-lt)" },
                  // ── Payments ──
                  "payment_received":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', color: "var(--green)",  bg: "var(--green-lt)" },
                  "part_payment":        { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>', color: "var(--green)",  bg: "var(--green-lt)" },
                  "bulk_paid":           { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', color: "var(--green)",  bg: "var(--green-lt)" },
                  "bulk_payment":        { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="8" y1="15" x2="10" y2="15"/><line x1="12" y1="15" x2="16" y2="15"/></svg>', color: "var(--green)",  bg: "var(--green-lt)" },
                  // ── Contacts ──
                  "contact_created":     { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>', color: "var(--blue)",   bg: "var(--blue-lt)" },
                  "contact_updated":     { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8l-2 2 2 2"/></svg>', color: "var(--blue)",   bg: "var(--blue-lt)" },
                  // ── Stock & Products ──
                  "product_created":     { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><line x1="12" y1="22" x2="12" y2="12"/></svg>', color: "var(--green)",  bg: "var(--green-lt)" },
                  "stock_adjusted":      { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', color: "var(--amber)", bg: "var(--amber-lt)" },
                  // ── Deliveries ──
                  "delivery_created":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>', color: "var(--purple)", bg: "var(--purple-lt)" },
                  // ── Purchases ──
                  "purchase_created":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>', color: "var(--amber)", bg: "var(--amber-lt)" },
                  // ── Credits ──
                  "credit_note_created": { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="9" y1="13" x2="15" y2="13"/></svg>', color: "var(--red)",    bg: "var(--red-lt)" },
                  "credit_allocated":    { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>', color: "var(--purple)", bg: "var(--purple-lt)" },
                  "credit_added":        { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>', color: "var(--purple)", bg: "var(--purple-lt)" },
                  // ── System ──
                  "user_login":          { svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>', color: "var(--text2)", bg: "#f1f5f9" },
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
              <span>Showing last 100</span>
            </div>
          </div>
        )}
        <nav className="mob-nav">
          <div className="mob-nav-inner">
            {MOBILE_NAV.filter(n => !n.adminOnly || profile?.role === "admin").map(n => <div key={n.id} className={"mob-nav-item "+(page===n.id?"active":"")} onClick={() => setPage(n.id)}>{NAV_ICONS[n.id]}<span className="mob-nav-lbl">{n.label}</span></div>)}
            <div className="mob-nav-item mob-nav-fab-slot" onClick={() => setShowFabMenu(v => !v)}>
              <div className="mob-nav-fab" style={showFabMenu?{background:"linear-gradient(135deg,#ef4444,#f87171)",transform:"translateY(-14px) rotate(45deg)"}:undefined}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
            </div>
            {MOBILE_NAV_RIGHT.filter(n => !n.adminOnly || profile?.role === "admin").map(n => <div key={n.id} className={"mob-nav-item "+(page===n.id?"active":"")} onClick={() => setPage(n.id)}>{NAV_ICONS[n.id]}<span className="mob-nav-lbl">{n.label}</span></div>)}
            <div className={"mob-nav-item "+(showMobMore?"active":"")} onClick={() => setShowMobMore(v => !v)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg><span className="mob-nav-lbl">More</span></div>
          </div>
        </nav>
        {showFabMenu && (
          <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.5)" }} onClick={() => setShowFabMenu(false)}>
            <div style={{ position:"absolute", bottom:"calc(64px + env(safe-area-inset-bottom))", left:0, right:0, padding:"0 16px 16px" }} onClick={e => e.stopPropagation()}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
                {[
                  { label:"New Invoice", color:"#6366f1", action:() => { setPage("invoices"); setTriggerNewInvoice(t => t + 1); }, icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> },
                  { label:"Record Payment", color:"#16a34a", action:() => { setPage("invoices"); setPendingFilter("pending"); }, icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
                  { label:"New Customer", color:"#f59e0b", action:() => { setPage("contacts"); setTriggerNewContact(t => t + 1); }, icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> },
                  { label:"Delivery Note", color:"#7c3aed", action:() => setPage("delivery-notes"), icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
                ].map(a => (
                  <div key={a.label} role="button" tabIndex={0} onClick={() => { a.action(); setShowFabMenu(false); }} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){a.action();setShowFabMenu(false);}}}
                    style={{ background:"var(--white)", borderRadius:"var(--rl)", padding:"16px 14px", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:10, boxShadow:"0 4px 20px rgba(0,0,0,.15)", cursor:"pointer", minHeight:80 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:a.color+"1a", color:a.color, display:"flex", alignItems:"center", justifyContent:"center" }}>{a.icon}</div>
                    <span style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {showMobMore && (
          <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.5)" }} onClick={() => setShowMobMore(false)}>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"var(--white)", borderRadius:"16px 16px 0 0", paddingBottom:"max(24px,env(safe-area-inset-bottom))", boxShadow:"0 -4px 24px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
              {/* Handle */}
              <div style={{ width:36, height:4, background:"var(--border2)", borderRadius:2, margin:"12px auto 0" }} />
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px 8px" }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>More</div>
                <button onClick={() => setShowMobMore(false)} style={{ background:"#f1f5f9", border:"none", cursor:"pointer", color:"#475569", padding:"4px 8px", fontSize:14, lineHeight:1, borderRadius:6, fontWeight:600 }}>✕</button>
              </div>
              {/* Agent: access level info box */}
              {profile?.role!=="admin" && (
                <div style={{ margin:"4px 12px 12px", padding:"12px 14px", borderRadius:12, background:"#eff6ff", border:"1px solid #bfdbfe", display:"flex", gap:10, alignItems:"flex-start" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#1e40af" }}>Your Access Level: Agent</div>
                    <div style={{ fontSize:11, color:"#3b82f6", marginTop:2 }}>You can manage your own invoices, customers and delivery notes. Admin-only sections (inventory, banking, reports) aren't shown.</div>
                  </div>
                </div>
              )}
              {/* Grouped nav sections */}
              {(profile?.role==="admin" ? [
                { label:"Sales", color:"#2563eb", items:["statement","agent-report","analytics"] },
                { label:"Operations", color:"#7c3aed", items:["inventory","purchases","stock-adj","delivery-notes","import"] },
                { label:"Finance", color:"#16a34a", items:["admin-reports","banking","credits"] },
                { label:"Settings", color:"#64748b", items:["settings"] },
              ] : [
                { label:"My Tools", color:"#16a34a", items:["delivery-notes","agent-report"] },
                { label:"Account", color:"#64748b", items:["settings"] },
              ]).map(group => {
                const visItems = NAV.filter(n =>
                  group.items.includes(n.id) &&
                  (!n.adminOnly || profile?.role==="admin" || profile?.role==="manager")
                );
                if (!visItems.length) return null;
                return (
                  <div key={group.label} style={{ padding:"0 12px", marginBottom:4 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".7px", padding:"8px 6px 4px" }}>{group.label}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4 }}>
                      {visItems.map(n => (
                        <button key={n.id}
                          onClick={() => { setPage(n.id); setShowMobMore(false); }}
                          style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"12px 6px", borderRadius:12, border:"1.5px solid "+(page===n.id?group.color:"#e2e8f0"), background:page===n.id?group.color+"18":"#f8fafc", cursor:"pointer", fontFamily:"var(--sans)", minHeight:72, gap:6 }}>
{(() => {
                            const mobIcons = {
                              "statement":     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
                              "agent-report":  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                              "purchases":     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
                              "stock-adj":     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
                              "delivery-notes":<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
                              "import":        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
                              "admin-reports": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
                              "banking":       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
                              "credits":       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
                              "settings":      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
                            };
                            const icon = mobIcons[n.id];
                            return icon ? <span style={{ color:page===n.id?group.color:"#334155", display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</span>
                              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={page===n.id?group.color:"#334155"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
                          })()}
                          <span style={{ fontSize:10, fontWeight:700, color:page===n.id?group.color:"#334155", textAlign:"center", lineHeight:1.3, textTransform:"uppercase", letterSpacing:".3px" }}>{n.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ padding:"4px 12px 0" }}>
                <button onClick={() => { setShowMobMore(false); signOut(); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px", borderRadius:12, border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"var(--sans)", minHeight:44 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* ── PRINT OVERLAY ── replaces popup windows; X button is pure React ── */}
      {printOverlayHTML && (
        <div style={{position:'fixed',inset:0,zIndex:99999,display:'flex',flexDirection:'column',background:'#0d1829'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',background:'#0d1829',borderBottom:'1px solid rgba(255,255,255,.12)',flexShrink:0}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:'#fff',letterSpacing:'-0.3px'}}>LedgerOS</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.45)',marginTop:1}}>Arkham Retail Ltd</div>
            </div>
            <button
              onClick={() => setPrintOverlayHTML(null)}
              style={{width:38,height:38,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.3)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20,cursor:'pointer',lineHeight:1,fontFamily:'sans-serif',flexShrink:0}}
              title="Close"
            >&#x2715;</button>
          </div>
          <iframe
            srcDoc={printOverlayHTML}
            onLoad={e => { try { e.target.contentWindow.print(); } catch(_) {} }}
            style={{flex:1,border:'none',background:'#fff',width:'100%'}}
            title="Print Preview"
          />
        </div>
      )}
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
  const [dueDate, setDueDate] = useState(invoice.due_date || "");
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
      due_date: dueDate || null,
      status,
      notes,
      lines: JSON.stringify(validLines),
      amount: total,
      subtotal,
      vat_total: vatTotal,
      balance: Math.max(0, total - parseFloat(invoice.amount_paid || 0)),
    });
    const updatedFields = { customer, invoice_date: invoiceDate, due_date: dueDate || null, status, notes, lines: JSON.stringify(validLines), amount: total, subtotal, vat_total: vatTotal, balance: Math.max(0, total - parseFloat(invoice.amount_paid || 0)) };
    onSaved(updatedFields);
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
              <label>Due Date</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",gap:6}}>
                  {[{label:"Today",days:0},{label:"7 days",days:7},{label:"14 days",days:14},{label:"30 days",days:30}].map(({label,days})=>{
                    const d=new Date(); d.setDate(d.getDate()+days);
                    const val=d.toISOString().split("T")[0];
                    const active=dueDate===val;
                    return <button key={days} type="button" onClick={()=>setDueDate(val)} style={{flex:1,padding:"5px 0",borderRadius:5,border:"1px solid "+(active?"var(--blue)":"var(--border)"),background:active?"var(--blue)":"var(--white)",color:active?"#fff":"var(--text2)",fontSize:11,fontWeight:active?600:400,cursor:"pointer",fontFamily:"var(--sans)"}}>{label}</button>;
                  })}
                </div>
                <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="fgrp">
              <label>Status</label>
              {(invoice.status === "paid" || invoice.status === "partial") ? (
                <div style={{ padding:"9px 14px", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:"var(--r)", fontSize:13, color:"var(--text2)" }}>
                  <span className={"badge " + (invoice.status==="paid"?"b-green":"b-orange")} style={{marginRight:6}}>{invoice.status}</span>
                  <span style={{fontSize:11,color:"var(--text3)"}}>Set by payment system</span>
                </div>
              ) : (
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              )}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "3fr 0.6fr 1fr 1fr 0.8fr 30px", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
              {["PRODUCT","QTY","PRICE","VAT","TOTAL",""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" }}>{h}</div>)}
            </div>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 0.6fr 1fr 1fr 0.8fr 30px", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <SearchDropdown placeholder="Search products..." items={products} onSelect={p => { updateLine(i, "description", p.name); updateLine(i, "unit_price", p.sale_price || p.cost_price || ""); }} displayKey="name" value={l.description || ""} />
                <input className="il-input mono" type="number" value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} />
                <input className="il-input mono" type="number" value={l.unit_price} onChange={e => updateLine(i, "unit_price", e.target.value)} />
                <select className="il-input" value={l.vat_rate} onChange={e => updateLine(i, "vat_rate", e.target.value)}>
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={20}>20%</option>
                </select>
                <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{fmt((parseFloat(l.qty)||0) * (parseFloat(l.unit_price)||0))}</div>
                <button onClick={() => removeLine(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16 }}>x</button>
              </div>
            ))}
            <button className="btn bo bsm" onClick={addLine} style={{ marginTop: 12 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Line</button>
          </div>
          <div style={{ textAlign: "right", padding: "12px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Subtotal: {fmt(subtotal)} · VAT: {fmt(vatTotal)}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Total: {fmt(total)}</div>
          </div>
          {parseFloat(invoice.amount_paid || 0) > 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--rl)", padding: "12px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 2 }}>💳 Partial payment on record</div>
                <div style={{ fontSize: 11, color: "#16a34a" }}>Amount paid: <strong>{fmt(parseFloat(invoice.amount_paid))}</strong></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>New balance after save</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: Math.max(0, total - parseFloat(invoice.amount_paid)) > 0 ? "#dc2626" : "#16a34a" }}>
                  {fmt(Math.max(0, total - parseFloat(invoice.amount_paid)))}
                </div>
              </div>
            </div>
          )}
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
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
                  <button className="btn bo bsm" onClick={async()=>{ if(!u.email){alert("No email for this user.");return;} await sb.resetPassword(u.email); toast.success("Reset email sent to "+u.email); }} style={{ fontSize:11 }}>Reset PW</button>
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
function ChangePasswordForm({ token }) {
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const update = async () => {
    if (newPw.length < 6) { setMsg("Minimum 6 characters."); return; }
    if (newPw !== confirmPw) { setMsg("Passwords do not match."); return; }
    setLoading(true);
    const res = await sb.updatePassword(token, newPw);
    if (res.id || res.email) { setMsg("✓ Password updated."); setNewPw(""); setConfirmPw(""); }
    else { setMsg("Failed — please try again."); }
    setLoading(false);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 300 }}>
      <input type="password" placeholder="New password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--r)", fontSize: 13, outline: "none", background: "var(--white)", color: "var(--text)" }} />
      <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--r)", fontSize: 13, outline: "none", background: "var(--white)", color: "var(--text)" }} />
      {msg && <div style={{ fontSize: 12, color: msg.startsWith("✓") ? "var(--green)" : "var(--red)" }}>{msg}</div>}
      <button className="btn bp bsm" onClick={update} disabled={loading} style={{ alignSelf: "flex-start" }}>{loading ? "Updating..." : "Update Password"}</button>
    </div>
  );
}


// ── BULK PAYMENT MODAL ────────────────────────────────────────────────────────
function BulkPaymentModal({ customer: initialCustomer, invoices, token, userId, profile, onClose, onComplete }) {
  const [customer, setCustomer] = useState(initialCustomer === "__pick__" ? "" : initialCustomer);
  const [custSearch, setCustSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [savedSummary, setSavedSummary] = useState(null);

  const needsPick = initialCustomer === "__pick__" && !customer;
  
  // All customers with outstanding invoices
  const allCustomers = [...new Set(invoices.filter(i => i.status !== "paid" && i.status !== "draft").map(i => i.customer))].sort();
  const filteredCustomers = custSearch ? allCustomers.filter(c => c.toLowerCase().includes(custSearch.toLowerCase())) : allCustomers;

  // Filter to only outstanding invoices for this customer, oldest first
  const outstanding = invoices
    .filter(i => i.customer === customer && (i.status === "pending" || i.status === "overdue" || i.status === "partial"))
    .sort((a,b) => new Date(a.invoice_date) - new Date(b.invoice_date));

  const totalOutstanding = outstanding.reduce((s,i) => s + (parseFloat(i.balance) || parseFloat(i.amount) || 0), 0);

  // Build allocation preview whenever amount changes
  const buildPreview = (amt) => {
    let remaining = parseFloat(amt) || 0;
    if (remaining <= 0) return null;
    const allocs = [];
    for (const inv of outstanding) {
      if (remaining <= 0) break;
      const owed = parseFloat(inv.balance) > 0 ? parseFloat(inv.balance) : parseFloat(inv.amount) || 0;
      const apply = Math.min(remaining, owed);
      const newBalance = owed - apply;
      allocs.push({ inv, apply, newBalance, newStatus: newBalance <= 0 ? "paid" : "partial" });
      remaining -= apply;
    }
    return { allocs, leftover: remaining };
  };

  const handlePreview = () => {
    const p = buildPreview(amount);
    if (p) setPreview(p);
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setSaving(true);
    const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const summary = [];

    for (const { inv, apply, newBalance, newStatus } of preview.allocs) {
      // Update invoice
      await sb.patch(token, "invoices", inv.id, {
        amount_paid: (parseFloat(inv.amount) - newBalance),
        balance: newBalance,
        status: newStatus,
        payment_method: method
      });
      // Insert payment row
      const payRow = {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        customer: inv.customer,
        amount: apply,
        method,
        payment_date: payDate,
        notes: newStatus === "paid" ? "Full payment (bulk)" : "Partial payment (bulk)",
        recorded_by_name: profile?.full_name || "Admin"
      };
      if (isUUID(userId)) payRow.recorded_by = userId;
      await sb.addPayment(token, payRow).catch(e => console.error(e));
      summary.push({ invoice_number: inv.invoice_number, apply, newStatus });
    }

    // If leftover — add to credit
    if (preview.leftover > 0) {
      await sb.addCredit(token, {
        customer,
        amount: preview.leftover,
        source_invoice: "bulk-payment",
        status: "available",
        notes: `Bulk payment surplus £${preview.leftover.toFixed(2)}`,
        created_by: profile?.full_name || "Admin"
      }).catch(e => console.error(e));
    }

    await logAudit(token, userId, "bulk_payment", "customer", null,
      `Bulk payment of £${parseFloat(amount).toFixed(2)} via ${method} for ${customer} dated ${payDate} — ${preview.allocs.length} invoice(s) updated`
    );

    setSaving(false);
    setSavedSummary({ allocs: summary, leftover: preview.leftover });
    setDone(true);
    onComplete && onComplete(preview.allocs);
  };

  const fmt2 = (n) => "£" + parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{alignItems:"center"}}>
        <div style={{background:"var(--white)",borderRadius:16,width:"100%",maxWidth:560,boxShadow:"0 8px 40px rgba(99,102,241,.12)",overflow:"hidden",borderTop:"3px solid #818cf8"}}>

          {/* Header */}
          <div style={{background:"#0d1829",padding:"20px 24px",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <div style={{width:28,height:28,borderRadius:8,background:"#2563eb22",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Bulk Payment</div>
              </div>
              <div style={{fontSize:12,color:"#8aa0b8"}}>{customer || "Select customer"}{customer ? ` · ${outstanding.length} outstanding invoice${outstanding.length!==1?"s":""} · ${fmt2(totalOutstanding)} total owed` : ""}</div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#8aa0b8",cursor:"pointer",padding:4,fontSize:20,lineHeight:1}}>×</button>
          </div>

          <div style={{padding:"20px 24px"}}>
            {done ? (
              /* Success screen */
              <div>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:4}}>Payment recorded</div>
                  <div style={{fontSize:12,color:"var(--text3)"}}>{fmt2(amount)} applied across {savedSummary?.allocs.length} invoice{savedSummary?.allocs.length!==1?"s":""}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
                  {savedSummary?.allocs.map((a,i) => (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
                      <span style={{fontFamily:"var(--mono)",color:"var(--blue)",fontWeight:600,fontSize:13}}>{a.invoice_number}</span>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:600,color:"#16a34a"}}>{fmt2(a.apply)}</span>
                        <span style={{padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,background:a.newStatus==="paid"?"#dcfce7":"#fef3c7",color:a.newStatus==="paid"?"#15803d":"#92400e"}}>{a.newStatus}</span>
                      </div>
                    </div>
                  ))}
                  {savedSummary?.leftover > 0 && (
                    <div style={{padding:"8px 12px",background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0",display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:"#15803d",fontWeight:500}}>Credit added to account</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:600,color:"#16a34a"}}>{fmt2(savedSummary.leftover)}</span>
                    </div>
                  )}
                </div>
                <button onClick={onClose} className="btn bp" style={{width:"100%"}}>Done</button>
              </div>
            ) : needsPick ? (
              /* Customer picker screen */
              <div>
                <div style={{fontSize:13,color:"var(--text2)",marginBottom:12}}>Select customer to apply bulk payment to:</div>
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={custSearch}
                  onChange={e => setCustSearch(e.target.value)}
                  autoFocus
                  style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid var(--border)",fontSize:13,outline:"none",marginBottom:10,fontFamily:"var(--sans)",boxSizing:"border-box"}}
                />
                <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:320,overflowY:"auto"}}>
                  {filteredCustomers.map(c => {
                    const owed = invoices.filter(i => i.customer===c && (i.status==="pending"||i.status==="overdue"||i.status==="partial")).reduce((s,i)=>s+(parseFloat(i.balance)||parseFloat(i.amount)||0),0);
                    const count = invoices.filter(i => i.customer===c && (i.status==="pending"||i.status==="overdue"||i.status==="partial")).length;
                    return (
                      <div key={c} onClick={()=>setCustomer(c)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderRadius:8,border:"1px solid var(--border)",cursor:"pointer",background:"var(--white)"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{c}</div>
                          <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{count} invoice{count!==1?"s":""} outstanding</div>
                        </div>
                        <span style={{fontFamily:"var(--mono)",fontWeight:600,fontSize:13,color:"#dc2626"}}>£{owed.toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {filteredCustomers.length === 0 && <div style={{textAlign:"center",padding:"20px",color:"var(--text3)",fontSize:13}}>No customers with outstanding invoices</div>}
                </div>
              </div>
            ) : !preview ? (
              /* Entry screen */
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:"var(--text3)",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Amount received</label>
                    <input
                      type="number"
                      placeholder="£0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      autoFocus
                      style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid var(--border)",fontSize:15,fontWeight:600,outline:"none",fontFamily:"var(--mono)",color:"var(--text)"}}
                    />
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:"var(--text3)",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Date received</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={e => setPayDate(e.target.value)}
                      style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid var(--border)",fontSize:13,outline:"none",fontFamily:"var(--sans)",color:"var(--text)"}}
                    />
                  </div>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:600,color:"var(--text3)",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Payment method</label>
                  <div style={{display:"flex",gap:8}}>
                    {[["cash","💵 Cash"],["bank","🏦 Bank"],["card","💳 Card"],["cheque","📝 Cheque"]].map(([v,l]) => (
                      <button key={v} type="button" onClick={()=>setMethod(v)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1.5px solid "+(method===v?"var(--blue)":"var(--border)"),background:method===v?"var(--blue)":"var(--white)",color:method===v?"#fff":"var(--text2)",fontSize:12,fontWeight:method===v?600:400,cursor:"pointer",fontFamily:"var(--sans)"}}>{l}</button>
                    ))}
                  </div>
                </div>
                {/* Outstanding summary */}
                <div style={{background:"var(--bg)",borderRadius:8,padding:"12px 14px",border:"1px solid var(--border)",marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Outstanding invoices — oldest first</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:160,overflowY:"auto"}}>
                    {outstanding.slice(0,8).map(inv => (
                      <div key={inv.id} style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                        <span style={{fontFamily:"var(--mono)",color:"var(--blue)",fontWeight:600}}>{inv.invoice_number}</span>
                        <span style={{color:"var(--text3)"}}>{fmtDate(inv.invoice_date)}</span>
                        <span style={{fontFamily:"var(--mono)",fontWeight:600,color:"var(--text)"}}>{fmt2(parseFloat(inv.balance)||parseFloat(inv.amount))}</span>
                      </div>
                    ))}
                    {outstanding.length > 8 && <div style={{fontSize:11,color:"var(--text3)",textAlign:"center",paddingTop:4}}>+{outstanding.length-8} more</div>}
                  </div>
                </div>
                <button
                  onClick={handlePreview}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="btn bp"
                  style={{width:"100%",padding:"12px",fontSize:14}}
                >
                  Preview allocation →
                </button>
              </div>
            ) : (
              /* Preview screen */
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:12}}>
                  <strong style={{color:"#16a34a",fontFamily:"var(--mono)"}}>{fmt2(amount)}</strong> will be applied to the following invoices in date order:
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12,maxHeight:280,overflowY:"auto"}}>
                  {preview.allocs.map(({inv,apply,newBalance,newStatus},i) => (
                    <div key={inv.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 70px 70px 60px",gap:8,alignItems:"center",padding:"9px 12px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
                      <span style={{fontFamily:"var(--mono)",color:"var(--blue)",fontWeight:600,fontSize:12}}>{inv.invoice_number}</span>
                      <span style={{fontSize:11,color:"var(--text3)"}}>{fmtDate(inv.invoice_date)}</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:600,color:"#16a34a",textAlign:"right"}}>{fmt2(apply)}</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:12,color:newBalance>0?"#dc2626":"#16a34a",textAlign:"right"}}>{newBalance>0?fmt2(newBalance):"✓ 0"}</span>
                      <span style={{padding:"2px 6px",borderRadius:4,fontSize:10,fontWeight:600,textAlign:"center",background:newStatus==="paid"?"#dcfce7":"#fef3c7",color:newStatus==="paid"?"#15803d":"#92400e"}}>{newStatus}</span>
                    </div>
                  ))}
                  {preview.leftover > 0 && (
                    <div style={{padding:"9px 12px",background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:"#15803d"}}>Surplus → credit account</div>
                        <div style={{fontSize:11,color:"#16a34a"}}>Added to {customer}'s credit balance</div>
                      </div>
                      <span style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:700,color:"#16a34a"}}>{fmt2(preview.leftover)}</span>
                    </div>
                  )}
                </div>
                <div style={{background:"var(--bg)",borderRadius:8,padding:"10px 14px",border:"1px solid var(--border)",marginBottom:16,display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span style={{color:"var(--text3)"}}>Method: <strong>{method}</strong></span>
                  <span style={{color:"var(--text3)"}}>Date: <strong>{payDate}</strong></span>
                  <span style={{color:"var(--text3)"}}>Invoices cleared: <strong style={{color:"#16a34a"}}>{preview.allocs.filter(a=>a.newStatus==="paid").length}</strong></span>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setPreview(null)} style={{flex:1,padding:"11px",borderRadius:8,border:"1px solid var(--border)",background:"var(--white)",cursor:"pointer",fontSize:13,fontFamily:"var(--sans)"}}>← Edit</button>
                  <button onClick={handleConfirm} disabled={saving} className="btn bp" style={{flex:2,padding:"11px",fontSize:14}}>
                    {saving?"Recording...":"Confirm & Record Payment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}


// ── OVERPAYMENT MODAL ─────────────────────────────────────────────────────────
function OverpaymentModal({ inv, overpayment, outstandingInvoices, token, userId, profile, onClose, onAllocated, onCredited }) {
  const [mode, setMode] = useState(null); // "allocate" | "credit"
  const [selectedInv, setSelectedInv] = useState(null);
  const [allocating, setAllocating] = useState(false);
  const [done, setDone] = useState(false);

  const handleAllocate = async () => {
    if (!selectedInv) return;
    setAllocating(true);
    const applyAmt = Math.min(overpayment, parseFloat(selectedInv.amount) - parseFloat(selectedInv.amount_paid || 0));
    const prevPaid = parseFloat(selectedInv.amount_paid || 0);
    const totalPaid = prevPaid + applyAmt;
    const balance = parseFloat(selectedInv.amount) - totalPaid;
    const newStatus = balance <= 0 ? "paid" : "partial";
    await sb.patch(token, "invoices", selectedInv.id, { amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus, payment_method: inv.payment_method || "cash" });
    const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const payRow = { invoice_id: selectedInv.id, invoice_number: selectedInv.invoice_number, customer: selectedInv.customer, amount: applyAmt, method: inv.payment_method || "cash", payment_date: new Date().toISOString().split("T")[0], notes: `Credit allocation from ${inv.invoice_number} overpayment`, recorded_by_name: profile?.full_name || "Admin" };
    if (isUUID(userId)) payRow.recorded_by = userId;
    await sb.addPayment(token, payRow).catch(e => console.error(e));
    await logAudit(token, userId, "credit_allocated", "invoice", selectedInv.id, `£${applyAmt.toFixed(2)} overpayment from ${inv.invoice_number} allocated to ${selectedInv.invoice_number}`);
    setAllocating(false);
    setDone(true);
    onAllocated && onAllocated(selectedInv.id, totalPaid, Math.max(0, balance), newStatus);
  };

  const handleCredit = async () => {
    setAllocating(true);
    await sb.addCredit(token, { customer: inv.customer, amount: overpayment, source_invoice: inv.invoice_number, status: "available", notes: `Overpayment on ${inv.invoice_number}`, created_by: profile?.full_name || "Admin" }).catch(e => console.error(e));
    await logAudit(token, userId, "credit_added", "invoice", inv.id, `£${overpayment.toFixed(2)} credit added to ${inv.customer} account from ${inv.invoice_number} overpayment`);
    setAllocating(false);
    setDone(true);
    onCredited && onCredited();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{alignItems:"center"}}>
        <div style={{background:"var(--white)",borderRadius:16,width:"100%",maxWidth:520,boxShadow:"0 8px 40px rgba(99,102,241,.12)",overflow:"hidden",borderTop:"3px solid #818cf8"}}>
          {/* Header */}
          <div style={{background:"#0d1829",padding:"20px 24px",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <div style={{width:28,height:28,borderRadius:8,background:"#f59e0b22",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Overpayment Detected</div>
              </div>
              <div style={{fontSize:12,color:"#8aa0b8"}}>{inv.invoice_number} — {inv.customer}</div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#8aa0b8",cursor:"pointer",padding:4,fontSize:18,lineHeight:1}}>×</button>
          </div>

          <div style={{padding:"20px 24px"}}>
            {done ? (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:6}}>{mode==="allocate"?"Credit Allocated":"Credit Added to Account"}</div>
                <div style={{fontSize:12,color:"var(--text3)",marginBottom:20}}>
                  {mode==="allocate"?`£${overpayment.toFixed(2)} applied to ${selectedInv?.invoice_number}`:`£${overpayment.toFixed(2)} added to ${inv.customer}'s credit account`}
                </div>
                <button onClick={onClose} className="btn bp" style={{width:"100%"}}>Done</button>
              </div>
            ) : (
              <>
                {/* Overpayment summary */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
                  {[
                    {label:"Invoice Total",val:`£${parseFloat(inv.amount).toFixed(2)}`,col:"var(--text)"},
                    {label:"Amount Paid",val:`£${parseFloat(inv.amount_paid).toFixed(2)}`,col:"#16a34a"},
                    {label:"Overpayment",val:`£${overpayment.toFixed(2)}`,col:"#d97706"},
                  ].map(k => (
                    <div key={k.label} style={{background:"var(--bg)",borderRadius:8,padding:"10px 12px",border:"1px solid var(--border)"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>{k.label}</div>
                      <div style={{fontSize:15,fontWeight:700,color:k.col,fontFamily:"var(--mono)"}}>{k.val}</div>
                    </div>
                  ))}
                </div>

                {!mode ? (
                  <>
                    <div style={{fontSize:12,color:"var(--text2)",marginBottom:14,lineHeight:1.5}}>
                      The customer paid <strong style={{color:"#d97706"}}>£{overpayment.toFixed(2)} more</strong> than the invoice total. How would you like to handle this?
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {outstandingInvoices.length > 0 && (
                        <button onClick={()=>setMode("allocate")} style={{padding:"14px 16px",borderRadius:10,border:"1px solid var(--border)",background:"var(--white)",cursor:"pointer",textAlign:"left",transition:"border-color .15s"}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:32,height:32,borderRadius:8,background:"var(--blue-lt)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </div>
                            <div>
                              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>Allocate to outstanding invoice</div>
                              <div style={{fontSize:11,color:"var(--text3)"}}>{outstandingInvoices.length} outstanding invoice{outstandingInvoices.length!==1?"s":""} found for {inv.customer}</div>
                            </div>
                          </div>
                        </button>
                      )}
                      <button onClick={()=>setMode("credit")} style={{padding:"14px 16px",borderRadius:10,border:"1px solid var(--border)",background:"var(--white)",cursor:"pointer",textAlign:"left",transition:"border-color .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#16a34a"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:32,height:32,borderRadius:8,background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                          </div>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>Add to customer credit account</div>
                            <div style={{fontSize:11,color:"var(--text3)"}}>£{overpayment.toFixed(2)} stored as credit — deducted from their next invoice</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </>
                ) : mode === "allocate" ? (
                  <>
                    <div style={{fontSize:12,color:"var(--text2)",marginBottom:12}}>Select which invoice to apply the £{overpayment.toFixed(2)} credit to:</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16,maxHeight:320,overflowY:"auto",paddingRight:4}}>
                      {outstandingInvoices.map(oi => {
                        const owed = parseFloat(oi.amount) - parseFloat(oi.amount_paid||0);
                        const apply = Math.min(overpayment, owed);
                        const sel = selectedInv?.id === oi.id;
                        return (
                          <div key={oi.id} onClick={()=>setSelectedInv(oi)} style={{padding:"12px 14px",borderRadius:8,border:`1.5px solid ${sel?"var(--blue)":"var(--border)"}`,background:sel?"var(--blue-lt)":"var(--white)",cursor:"pointer"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div>
                                <span style={{fontFamily:"var(--mono)",fontWeight:600,color:"var(--blue)",fontSize:13}}>{oi.invoice_number}</span>
                                <span style={{fontSize:11,color:"var(--text3)",marginLeft:8}}>{fmtDate(oi.invoice_date)}</span>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:12,color:"var(--text3)"}}>Outstanding: <strong style={{color:"var(--text)",fontFamily:"var(--mono)"}}>£{owed.toFixed(2)}</strong></div>
                                <div style={{fontSize:11,color:"#16a34a"}}>Will pay: £{apply.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{setMode(null);setSelectedInv(null);}} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--white)",cursor:"pointer",fontSize:13}}>Back</button>
                      <button onClick={handleAllocate} disabled={!selectedInv||allocating} className="btn bp" style={{flex:2}}>
                        {allocating?"Allocating...":"Allocate £"+overpayment.toFixed(2)}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{background:"var(--bg)",borderRadius:8,padding:"14px",border:"1px solid var(--border)",marginBottom:16}}>
                      <div style={{fontSize:12,color:"var(--text2)",marginBottom:8}}>A credit of <strong style={{color:"#16a34a",fontFamily:"var(--mono)"}}>£{overpayment.toFixed(2)}</strong> will be added to <strong>{inv.customer}</strong>'s account.</div>
                      <div style={{fontSize:11,color:"var(--text3)"}}>This credit can be applied when creating or paying their next invoice.</div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setMode(null)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--white)",cursor:"pointer",fontSize:13}}>Back</button>
                      <button onClick={handleCredit} disabled={allocating} className="btn bp" style={{flex:2,background:"#16a34a",borderColor:"#16a34a"}}>
                        {allocating?"Saving...":"Add Credit to Account"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}


// ── BANKING PAGE ──────────────────────────────────────────────────────────────
function BankingPage({ token, userId, profile }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [bankedDates, setBankedDates] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ledgeros_banked_dates") || "{}"); } catch { return {}; }
  });
  const [depositRefs, setDepositRefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ledgeros_deposit_refs") || "{}"); } catch { return {}; }
  });
  const [editingRef, setEditingRef] = useState(null);
  const [refInput, setRefInput] = useState("");

  const saveBanked = (d) => { localStorage.setItem("ledgeros_banked_dates", JSON.stringify(d)); setBankedDates(d); };
  const saveRefs = (d) => { localStorage.setItem("ledgeros_deposit_refs", JSON.stringify(d)); setDepositRefs(d); };

  React.useEffect(() => {
    if (!token) return;
    setLoading(true);
    const now = new Date();
    let fromDate = "";
    if (period === "today") { fromDate = now.toISOString().split("T")[0]; }
    else if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); fromDate = d.toISOString().split("T")[0]; }
    else if (period === "month") { const d = new Date(now); d.setDate(d.getDate() - 30); fromDate = d.toISOString().split("T")[0]; }
    const q = fromDate ? `created_at=gte.${fromDate}T00:00:00&order=created_at.desc` : `order=created_at.desc&limit=200`;
    sb.get(token, "invoice_payments", q)
      .then(d => setPayments(Array.isArray(d) ? d : []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [token, period]);

  // Group by date
  const byDate = {};
  payments.forEach(p => {
    const d = (p.created_at || p.payment_date || "").split("T")[0];
    if (!d) return;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(p);
  });
  const dates = Object.keys(byDate).sort((a,b) => b.localeCompare(a));

  const fmtDay = (d) => {
    const dt = new Date(d + "T12:00:00");
    return dt.toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  };
  const fmtTime = (ts) => { try { return new Date(ts).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}); } catch{return "";} };
  const methodBadge = (m) => {
    const map = { cash:["#dcfce7","#15803d","💵"], bank:["#dbeafe","#1d4ed8","🏦"], card:["#f3e8ff","#7e22ce","💳"], cheque:["#fef3c7","#92400e","📝"] };
    const [bg,col,icon] = map[m] || ["#f1f5f9","#475569","💰"];
    return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:500,background:bg,color:col}}>{icon} {m}</span>;
  };

  // KPIs
  const total = payments.reduce((s,p)=>s+parseFloat(p.amount||0),0);
  const byMethod = {};
  payments.forEach(p => { const m=p.method||"cash"; byMethod[m]=(byMethod[m]||0)+parseFloat(p.amount||0); });
  const unbanked = dates.filter(d=>!bankedDates[d]).reduce((s,d)=>s+byDate[d].reduce((ss,p)=>ss+parseFloat(p.amount||0),0),0);

  // CSV export
  const exportCSV = () => {
    const rows = [["Date","Time","Invoice","Customer","Amount","Method","Agent","Notes","Deposit Ref"]];
    payments.forEach(p => {
      const d = (p.created_at||"").split("T")[0];
      rows.push([d, fmtTime(p.created_at), p.invoice_number||"", p.customer||"", parseFloat(p.amount||0).toFixed(2), p.method||"", p.recorded_by_name||"", p.notes||"", depositRefs[d]||""]);
    });
    const csv = rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
    const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download=`banking-recon-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  };

  // Print banking sheet
  const printSheet = () => {
    const w = window.open("","_blank");
    let html = `<html><head><title>Banking Sheet</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#f1f5f9;padding:6px 8px;text-align:left;border:1px solid #e2e8f0}td{padding:6px 8px;border:1px solid #e2e8f0}.day-hdr{background:#0d1829;color:#fff;padding:8px 10px;font-weight:bold;margin-top:16px}.total{text-align:right;font-weight:bold;padding:6px 8px;border:1px solid #e2e8f0;background:#f8fafc}@media print{button{display:none}}</style></head><body>`;
    html += "<h2 style='margin-bottom:4px'>Banking reconciliation sheet</h2><p style='color:#64748b;margin-bottom:20px'>Arkham Retail Ltd - Printed " + new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) + "</p>";
    dates.forEach(d => {
      const rows = byDate[d];
      const dayTotal = rows.reduce((s,p)=>s+parseFloat(p.amount||0),0);
      const ref = depositRefs[d] || "";
      const banked = bankedDates[d];
      html += "<div class='day-hdr'>" + fmtDay(d) + " - £" + dayTotal.toFixed(2) + " " + (banked ? "BANKED" + (ref ? " Ref: " + ref : "") : "NOT YET BANKED") + "</div>";
      html += `<table><thead><tr><th>Time</th><th>Invoice</th><th>Customer</th><th>Amount</th><th>Method</th><th>Agent</th><th>Notes</th></tr></thead><tbody>`;
      rows.forEach(p => { html += "<tr><td>" + fmtTime(p.created_at) + "</td><td>" + (p.invoice_number||"") + "</td><td>" + (p.customer||"") + "</td><td style='text-align:right'>&pound;" + parseFloat(p.amount||0).toFixed(2) + "</td><td>" + (p.method||"") + "</td><td>" + (p.recorded_by_name||"") + "</td><td>" + (p.notes||"") + "</td></tr>"; });
      html += "<tr><td colspan='3' style='text-align:right;font-weight:bold;background:#f8fafc'>Day total</td><td class='total'>&pound;" + dayTotal.toFixed(2) + "</td><td colspan='3'></td></tr></tbody></table>";
    });
    html += "<p style='margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;color:#64748b'>Total collected: &pound;" + total.toFixed(2) + " across " + payments.length + " payments</p></body></html>";
    w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  };

  return (
    <div>
      {/* Dark Header */}
      <div className="page-hero" style={{margin:"-26px -28px 20px -28px",background:"linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)",padding:"20px 24px 0",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",bottom:-60,left:-40,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)",pointerEvents:"none"}} />
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16,position:"relative",zIndex:1}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:10,fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase",color:"rgba(165,180,252,.8)",marginBottom:6}}><div style={{width:5,height:5,borderRadius:"50%",background:"#818cf8",animation:"pulse 2.4s ease-in-out infinite"}} />Banking & Cash</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-1.2px"}}>Cash & <span style={{background:"linear-gradient(135deg,#a78bfa,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Reconciliation</span></div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:3}}>Detailed cash reconciliation for banking</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:3,background:"rgba(255,255,255,.07)",borderRadius:9,padding:"3px 4px",border:"1px solid rgba(99,102,241,.2)"}}>
              {["today","week","month","all"].map(p => (
                <button key={p} onClick={()=>setPeriod(p)} style={{padding:"5px 13px",borderRadius:7,border:"none",background:period===p?"#818cf8":"transparent",color:period===p?"#fff":"rgba(255,255,255,.45)",fontSize:12,cursor:"pointer",fontFamily:"var(--sans)",fontWeight:period===p?700:500,transition:"all .15s",boxShadow:period===p?"0 2px 8px rgba(129,140,248,.35)":"none"}}>
                  {p==="today"?"Today":p==="week"?"This week":p==="month"?"This month":"All time"}
                </button>
              ))}
            </div>
            <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:6,border:"none",background:"#16a34a",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:500,fontFamily:"var(--sans)"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
            <button onClick={printSheet} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:6,border:"none",background:"#0f172a",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:500,fontFamily:"var(--sans)"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print sheet
            </button>
          </div>
        </div>
        {/* KPI row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,borderTop:"1px solid rgba(255,255,255,0.08)",margin:"0 -24px"}}>
          {[
            {label:"Total collected",val:"£"+total.toFixed(2),sub:payments.length+" payments",col:"#818cf8"},
            {label:"Cash",val:"£"+(byMethod.cash||0).toFixed(2),sub:payments.filter(p=>p.method==="cash").length+" payments",col:"#22c55e"},
            {label:"Bank transfer",val:"£"+(byMethod.bank||0).toFixed(2),sub:payments.filter(p=>p.method==="bank").length+" payments",col:"#60a5fa"},
            {label:"Unbanked cash",val:"£"+unbanked.toFixed(2),sub:"Awaiting deposit",col:"#f59e0b"},
          ].map((k,i) => (
            <div key={i} style={{padding:"16px 20px 14px",borderRight:i<3?"1px solid rgba(255,255,255,0.08)":"none",borderTop:"3px solid "+k.col}}>
              <div style={{fontSize:10,fontWeight:700,color:"#8aa0b8",textTransform:"uppercase",letterSpacing:".6px",marginBottom:6}}>{k.label}</div>
              <div style={{fontSize:20,fontWeight:600,color:k.col,fontFamily:"var(--mono)"}}>{loading?"—":k.val}</div>
              <div style={{fontSize:11,color:"#8aa0b8",marginTop:3}}>{loading?"Loading…":k.sub}</div>
            </div>
          ))}
        </div>
        {/* Method breakdown mini strip */}
        {!loading && payments.length > 0 && (
          <div style={{display:"flex",alignItems:"center",gap:16,padding:"10px 20px",borderTop:"1px solid rgba(255,255,255,.06)",margin:"0 -24px",background:"rgba(0,0,0,.15)",flexWrap:"wrap"}}>
            <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:"1px",flexShrink:0}}>By method:</span>
            {[["cash","💵","#22c55e"],["bank","🏦","#60a5fa"],["card","💳","#a78bfa"],["cheque","📝","#fcd34d"]].map(([m,icon,col]) => {
              const amt = byMethod[m]||0; const cnt = payments.filter(p=>p.method===m).length;
              if (!cnt) return null;
              return <span key={m} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:11,color:"rgba(255,255,255,.7)"}}>
                {icon} <span style={{fontWeight:600,color:col,fontFamily:"var(--mono)"}}>£{amt.toFixed(2)}</span> <span style={{color:"rgba(255,255,255,.35)"}}>{cnt}×</span>
              </span>;
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"var(--text3)"}}>
          <div className="spin" style={{width:24,height:24,borderWidth:2,margin:"0 auto 12px"}} />
          Loading payments...
        </div>
      ) : payments.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"var(--text3)"}}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.3,display:"block",margin:"0 auto 12px"}}><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
          No payments found for this period
        </div>
      ) : (
        <>
          {/* Transaction detail table */}
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>Transaction detail</div>
                <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>Every payment received — match each row against your bank statement</div>
              </div>
            </div>
            <div className="card" style={{overflow:"hidden"}}>
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                <table className="bk-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}>
                  <thead>
                    <tr style={{background:"var(--bg)"}}>
                      {["Date","Time","Invoice","Customer","Amount","Method","Agent","Notes"].map(h => (
                        <th key={h} style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px",textAlign:"left",borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p,i) => {
                      const d = (p.created_at||"").split("T")[0];
                      const agentName = p.recorded_by_name || "—";
                      const agentCol = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#2563eb"][agentName.charCodeAt(0)%5]||"#64748b";
                      const isPartial = (p.notes||"").toLowerCase().includes("partial");
                      return (
                        <tr key={p.id||i} style={{borderBottom:"0.5px solid var(--border)"}}>
                          <td style={{padding:"9px 12px",color:"var(--text2)",whiteSpace:"nowrap"}}>{d}</td>
                          <td style={{padding:"9px 12px",color:"var(--text3)",whiteSpace:"nowrap"}}>{fmtTime(p.created_at)}</td>
                          <td style={{padding:"9px 12px"}}><span style={{fontFamily:"var(--mono)",color:"var(--blue)",fontWeight:600,fontSize:12}}>{p.invoice_number||"—"}</span></td>
                          <td style={{padding:"9px 12px",color:"var(--text)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.customer||"—"}</td>
                          <td style={{padding:"9px 12px"}}><span style={{fontFamily:"var(--mono)",fontWeight:600,color:isPartial?"#d97706":"#16a34a"}}>£{parseFloat(p.amount||0).toFixed(2)}</span></td>
                          <td style={{padding:"9px 12px"}}>{methodBadge(p.method)}</td>
                          <td style={{padding:"9px 12px"}}>
                            <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:20,background:"var(--bg)",fontSize:11,color:"var(--text2)"}}>
                              <div style={{width:16,height:16,borderRadius:"50%",background:agentCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{agentName[0]?.toUpperCase()||"?"}</div>
                              {agentName.split(" ")[0]}
                            </div>
                          </td>
                          <td style={{padding:"9px 12px",color:"var(--text3)",fontSize:11}}>{p.notes||"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 14px",background:"var(--bg)",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",fontSize:12}}>
                <span style={{color:"var(--text3)"}}>{payments.length} transactions</span>
                <span style={{fontFamily:"var(--mono)",fontWeight:600}}>£{total.toFixed(2)} total</span>
              </div>
            </div>
          </div>

          {/* Daily banking sheet */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>Daily banking sheet</div>
                <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>Cash grouped by day — mark each day as banked once deposited, add your deposit slip reference</div>
              </div>
            </div>
            <div className="card" style={{overflow:"hidden"}}>
              {dates.map((d, di) => {
                const rows = byDate[d];
                const dayTotal = rows.reduce((s,p)=>s+parseFloat(p.amount||0),0);
                const isBanked = !!bankedDates[d];
                const ref = depositRefs[d] || "";
                return (
                  <div key={d} style={{borderBottom:di<dates.length-1?"1px solid var(--border)":"none"}}>
                    {/* Day header */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"var(--bg)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:isBanked?"#16a34a":"#f59e0b",flexShrink:0}} />
                        <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{fmtDay(d)}</div>
                        <span style={{padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:500,background:isBanked?"#dcfce7":"#fef3c7",color:isBanked?"#15803d":"#92400e"}}>
                          {isBanked?"✓ Banked":"Unbanked"}
                        </span>
                        <span style={{fontSize:11,color:"var(--text3)"}}>{rows.length} payment{rows.length!==1?"s":""}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontFamily:"var(--mono)",fontWeight:600,fontSize:14,color:"var(--text)"}}>£{dayTotal.toFixed(2)}</span>
                        {!isBanked ? (
                          <button onClick={()=>{saveBanked({...bankedDates,[d]:true});}} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"#16a34a",color:"#fff",fontSize:11,cursor:"pointer",fontWeight:500}}>
                            Mark banked
                          </button>
                        ) : (
                          <button onClick={()=>{const nb={...bankedDates};delete nb[d];saveBanked(nb);}} style={{padding:"4px 12px",borderRadius:6,border:"1px solid var(--border)",background:"var(--white)",color:"var(--text3)",fontSize:11,cursor:"pointer"}}>
                            Unmark
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Transaction rows */}
                    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                      <table className="bk-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
                        <thead>
                          <tr>
                            {["Time","Invoice","Customer","Amount","Method","Agent","Notes"].map(h => (
                              <th key={h} style={{padding:"7px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".4px",textAlign:"left",borderBottom:"0.5px solid var(--border)",whiteSpace:"nowrap"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((p,i) => {
                            const agentName = p.recorded_by_name || "—";
                            const agentCol = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#2563eb"][agentName.charCodeAt(0)%5]||"#64748b";
                            const isPartial = (p.notes||"").toLowerCase().includes("partial");
                            return (
                              <tr key={p.id||i} style={{borderBottom:i<rows.length-1?"0.5px solid var(--border)":"none"}}>
                                <td style={{padding:"9px 14px",color:"var(--text3)",whiteSpace:"nowrap"}}>{fmtTime(p.created_at)}</td>
                                <td style={{padding:"9px 14px"}}><span style={{fontFamily:"var(--mono)",color:"var(--blue)",fontWeight:600,fontSize:12}}>{p.invoice_number||"—"}</span></td>
                                <td style={{padding:"9px 14px",color:"var(--text)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.customer||"—"}</td>
                                <td style={{padding:"9px 14px"}}><span style={{fontFamily:"var(--mono)",fontWeight:600,color:isPartial?"#d97706":"#16a34a"}}>£{parseFloat(p.amount||0).toFixed(2)}</span></td>
                                <td style={{padding:"9px 14px"}}>{methodBadge(p.method)}</td>
                                <td style={{padding:"9px 14px"}}>
                                  <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:20,background:"var(--bg)",fontSize:11,color:"var(--text2)"}}>
                                    <div style={{width:16,height:16,borderRadius:"50%",background:agentCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{agentName[0]?.toUpperCase()||"?"}</div>
                                    {agentName.split(" ")[0]}
                                  </div>
                                </td>
                                <td style={{padding:"9px 14px",color:"var(--text3)",fontSize:11}}>{p.notes||"—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Day footer — total + deposit ref */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"var(--bg)",borderTop:"1px solid var(--border)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:11,color:"var(--text3)"}}>Deposit slip ref:</span>
                        {editingRef === d ? (
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <input value={refInput} onChange={e=>setRefInput(e.target.value)} placeholder="e.g. DEP-2026-0089" style={{padding:"3px 8px",border:"1px solid var(--blue)",borderRadius:5,fontSize:11,outline:"none",width:160,fontFamily:"var(--mono)"}} />
                            <button onClick={()=>{saveRefs({...depositRefs,[d]:refInput});setEditingRef(null);}} style={{padding:"3px 10px",borderRadius:5,border:"none",background:"var(--blue)",color:"#fff",fontSize:11,cursor:"pointer"}}>Save</button>
                            <button onClick={()=>setEditingRef(null)} style={{padding:"3px 8px",borderRadius:5,border:"1px solid var(--border)",background:"var(--white)",fontSize:11,cursor:"pointer",color:"var(--text3)"}}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text)",fontWeight:600}}>{ref || "—"}</span>
                            <button onClick={()=>{setEditingRef(d);setRefInput(ref);}} style={{padding:"2px 8px",borderRadius:5,border:"1px solid var(--border)",background:"transparent",fontSize:11,cursor:"pointer",color:"var(--text3)"}}>
                              {ref?"Edit":"Add ref"}
                            </button>
                          </div>
                        )}
                      </div>
                      <span style={{fontFamily:"var(--mono)",fontWeight:600,fontSize:13,color:isBanked?"#16a34a":"#d97706"}}>
                        £{dayTotal.toFixed(2)} {isBanked?"✓ banked":"— unbanked"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Settings({ auth, profile, darkMode: darkModeProp, toggleDark, onSignOut }) {
  const darkMode = darkModeProp;
  const [activeTab, setActiveTab] = useState("company");
  if (profile?.role !== "admin" && profile?.role !== "manager") return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text3)" }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Access restricted</div>
      <div style={{ fontSize: 13 }}>Settings are only available to admins.</div>
    </div>
  );
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Administration</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>System <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Settings</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Manage your LedgerOS configuration</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[
            { label: "Company", val: COMPANY.name, sub: "Arkham Retail Ltd", accent: "#2563eb" },
            { label: "VAT Number", val: COMPANY.vatNumber, sub: "registered", accent: "#7c3aed" },
            { label: "Role", val: profile?.role || "—", sub: "your access level", accent: "#16a34a" },
            { label: "Version", val: "v2.9", sub: "LedgerOS", accent: "#d97706" },
          ].map((k,i) => (
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:14,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex",gap:8,marginBottom:24,flexWrap:"wrap" }}>
        {[["company","Company"],["appearance","Appearance"],["account","Account"],["users","Users"]].map(([k,l])=>(
          <button key={k} onClick={()=>setActiveTab(k)} style={{ padding:"7px 16px",borderRadius:20,border:"1px solid "+(activeTab===k?"var(--blue)":"var(--border)"),background:activeTab===k?"var(--blue)":"var(--white)",color:activeTab===k?"#fff":"var(--text2)",fontSize:13,fontWeight:activeTab===k?600:400,cursor:"pointer",fontFamily:"var(--sans)" }}>{l}</button>
        ))}
      </div>
      {activeTab==="company" && (
        <div className="card" style={{ padding:24 }}>
          <div className="ct" style={{ marginBottom:20 }}>Company Information</div>
          <div className="settings-info-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
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
          <div style={{ marginTop:20,paddingTop:20,borderTop:"1px solid var(--border)" }}>
            <div style={{ fontWeight:600,fontSize:14,marginBottom:12 }}>Change Password</div>
            <ChangePasswordForm token={auth?.token} />
          </div>
          <div style={{ marginTop:16,display:"flex",gap:10 }}>
            <button className="btn bo bsm" style={{ background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca" }} onClick={onSignOut}>Sign Out</button>
          </div>
        </div>
      )}
      {activeTab==="users" && <UserApproval token={auth?.token} profile={profile} />}
    </div>
  );
}
