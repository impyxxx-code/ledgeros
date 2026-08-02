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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line, LabelList, PieChart, Pie, Cell, BarChart } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, Clock, Package, CheckCircle2, FileText, AlertTriangle, Users, ShoppingBag, Landmark, Sun } from "lucide-react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "./lib/supabase.js";
import { fmt, fmtDate, fmtShort, fmtTime, fmtRelative, dueDelta, today, isMobile, escHtml, DEFAULT_REORDER } from "./lib/utils.js";
import { sendEmail, buildInvoiceEmailHtml, buildReminderEmailHtml, buildDNEmailHtml } from "./lib/email.js";
import { logAudit } from "./lib/audit.js";
import { ModalPortal, SkeletonTable, EmptyState } from "./components/ui.jsx";
import { SearchDropdown } from "./components/SearchDropdown.jsx";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { COMPANY, LOGO, JSPDF_URL, toast } from "./lib/constants.js";
import LOGO_BADGE from "./assets/logo-ar-badge.png";
import { OnboardingChecklist } from "./components/OnboardingChecklist.jsx";
import { AIAssistant } from "./components/AIAssistant.jsx";
import { Purchases } from "./pages/Purchases.jsx";
import { SupplierBills } from "./pages/SupplierBills.jsx";
import { CreditNotes } from "./pages/CreditNotes.jsx";
import { Inventory } from "./pages/Inventory.jsx";
import { DeliveryNotes } from "./pages/DeliveryNotes.jsx";
import { BankingPage } from "./pages/BankingPage.jsx";
import { CreditControl } from "./pages/CreditControl.jsx";
import { VATReturn } from "./pages/reports/VATReturn.jsx";
import { BankReconciliation } from "./pages/BankReconciliation.jsx";
import { Settings } from "./pages/Settings.jsx";
import { InvoiceModal } from "./components/InvoiceModal.jsx";
import { AgentDashboard } from "./pages/AgentDashboard.jsx";
import { Contacts } from "./pages/Contacts.jsx";
import { CustomerHub } from "./pages/CustomerHub.jsx";
import { OverpaymentModal } from "./components/OverpaymentModal.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Reports } from "./pages/reports/Reports.jsx";
import { CustomerStatement } from "./pages/reports/CustomerStatement.jsx";
import { StockAdjustment } from "./pages/reports/StockAdjustment.jsx";
import { StockTake } from "./pages/reports/StockTake.jsx";
import { AgentReport } from "./pages/reports/AgentReport.jsx";
import { ProductSalesTracker } from "./pages/reports/ProductSalesTracker.jsx";
import { AgentProductsReport } from "./pages/reports/AgentProductsReport.jsx";
import { AdminReports } from "./pages/reports/AdminReports.jsx";
import { CsvImport } from "./pages/CsvImport.jsx";
import { Auth } from "./pages/Auth.jsx";
import { InvoiceForm } from "./pages/invoices/InvoiceForm.jsx";
import { Invoices } from "./pages/invoices/Invoices.jsx";
import { EditInvoiceModal } from "./pages/invoices/EditInvoiceModal.jsx";
import { BulkPaymentModal } from "./pages/invoices/BulkPaymentModal.jsx";

// ── All shared utilities, constants, sb, email builders now imported from lib/ ──
// CSS stays here until App.jsx is further split (it's only used in the style tag inject below)


const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap');
@import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  /* ── Backgrounds ── */
  --bg:#fafbff;
  --bg2:#eef0f5;
  --white:#ffffff;

  /* ── Sidebar ── */
  --sidebar:#201e1d;
  --sidebar-border:rgba(255,255,255,.08);
  --sidebar-hover:rgba(255,255,255,.05);
  --sidebar-active:rgba(221,43,15,.20);
  --sidebar-active-border:rgba(221,43,15,.45);

  /* ── Text ── */
  --text:#0d1117;
  --text2:#5c677d;
  --text3:#9aa5b4;

  /* ── Borders ── */
  --border:#e5e9f0;
  --border2:#d0d7e2;

  /* ── Brand (Modernist: accent shifted blue -> red) ── */
  --blue:#dd2b0f;
  --blue-lt:#fff2ef;
  --blue-dk:#ae1800;
  --blue-mid:#ffe0d9;

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
  --sh-blue:0 4px 14px rgba(221,43,15,.25);

  /* ── Type ── */
  --sans:'Archivo','Inter',system-ui,-apple-system,sans-serif;
  --mono:'Inter','SF Mono',monospace;

  /* ── Radius ── */
  --r:0px;--rl:0px;--rxl:0px;--r2:0px;

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
@keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes headlineUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes logoTilt{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@keyframes logoFadeIn{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}

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
  background:radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 70%);
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
  background:#fff;
  border:1px solid rgba(165,180,252,.4);
  border-radius:11px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  overflow:hidden;
  box-shadow:0 4px 24px rgba(129,140,248,.35),inset 0 1px 0 rgba(255,255,255,.18);
  animation:logoGlow 4s ease-in-out infinite;
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.logo-mark img{width:100%;height:100%;object-fit:cover;object-position:center top;transform:scale(1.7)}
.logo-mark:hover{transform:scale(1.08) rotate(-4deg)}
@keyframes logoGlow{0%,100%{box-shadow:0 4px 24px rgba(129,140,248,.35),inset 0 1px 0 rgba(255,255,255,.18)}50%{box-shadow:0 4px 32px rgba(165,180,252,.55),inset 0 1px 0 rgba(255,255,255,.25)}}
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
  transition:color .25s var(--ease),background .25s var(--ease),transform .35s cubic-bezier(.34,1.56,.64,1);
  margin-bottom:1px;user-select:none;letter-spacing:-.1px;
  position:relative;overflow:hidden;
}
.nav-item::before{
  content:'';position:absolute;left:0;top:50%;
  width:4px;height:18px;border-radius:0 3px 3px 0;
  background:#818cf8;
  transform:translateY(-50%) scaleY(0);transform-origin:center;
  transition:transform .4s cubic-bezier(.34,1.56,.64,1);
}
.nav-item:hover{
  background:rgba(255,255,255,.08);
  color:rgba(255,255,255,.85);
  transform:translateX(8px) scale(1.03);
}
.nav-item.active{
  background:linear-gradient(90deg,rgba(99,102,241,.22),rgba(99,102,241,.06));
  color:#a5b4fc;font-weight:600;
}
.nav-item.active::before{transform:translateY(-50%) scaleY(1)}
.nav-item svg{flex-shrink:0;opacity:.85;width:15px;height:15px;transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
.nav-item.active svg{opacity:1}
.nav-item:hover svg{transform:scale(1.3) rotate(-6deg)}
.nav-badge{
  margin-left:auto;background:var(--red);color:#fff;
  font-size:9px;font-weight:700;
  padding:1px 6px;border-radius:20px;min-width:18px;text-align:center;
  animation:badgePulse 2s ease-in-out infinite;
}
@keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 4px rgba(239,68,68,0)}}

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
  background:linear-gradient(135deg,#dd2b0f,#ae1800);
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;color:#fff;
}
.user-av-online{
  position:absolute;bottom:0;right:0;
  width:9px;height:9px;border-radius:50%;
  background:#22c55e;border:1.5px solid #060d1f;
  animation:onlinePulse 2.5s ease-in-out infinite;
}
@keyframes onlinePulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}50%{box-shadow:0 0 0 3px rgba(34,197,94,0)}}
.user-av{transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
.user-row:hover .user-av{transform:scale(1.1) rotate(-6deg)}
.user-name{font-size:12px;font-weight:600;color:rgba(255,255,255,.82);line-height:1.2}
.user-role-badge{
  display:inline-flex;font-size:9px;font-weight:700;letter-spacing:.4px;
  text-transform:uppercase;padding:1px 6px;border-radius:3px;
  background:rgba(221,43,15,.15);color:#ff6a4d;margin-top:2px;
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
  transition:color .25s var(--ease),transform .35s cubic-bezier(.34,1.56,.64,1);
}
.search-input:focus ~ i,.search-input:focus ~ svg{color:#818cf8;transform:translateY(-50%) scale(1.15) rotate(-10deg)}
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
  border-color:rgba(221,43,15,.5);
  background:rgba(255,255,255,.08);
  box-shadow:0 0 0 3px rgba(221,43,15,.12);
}
.search-wrap:has(.search-input:focus) i,.search-wrap:has(.search-input:focus)>svg{color:#818cf8;transform:translateY(-50%) scale(1.15) rotate(-10deg)}
.search-input::placeholder{color:rgba(255,255,255,.25)}

.tb-btn{
  width:30px;height:30px;border-radius:var(--r);
  border:1px solid rgba(255,255,255,.1);
  background:rgba(255,255,255,.07);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:rgba(255,255,255,.5);
  transition:all .25s cubic-bezier(.34,1.56,.64,1);position:relative;
  flex-shrink:0;
}
.tb-btn:hover{background:rgba(255,255,255,.14);border-color:rgba(129,140,248,.4);color:#fff;transform:translateY(-2px) scale(1.08);box-shadow:0 4px 12px rgba(129,140,248,.3)}
.tb-btn:active{transform:scale(.92)}
.tb-btn i{font-size:15px;transition:transform .25s cubic-bezier(.34,1.56,.64,1)}
.tb-btn:hover i{transform:scale(1.15)}

/* ── Content ── */
.content{
  flex:1;padding:26px 28px;
  width:100%;
  animation:fadeUpPage .55s cubic-bezier(.22,1,.36,1) both;
}
@keyframes fadeUpPage{from{opacity:0;transform:translateY(36px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}

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
  animation:fadeUp .32s var(--ease) both;
}
.kgrid .kpi:nth-child(1){animation-delay:0s}
.kgrid .kpi:nth-child(2){animation-delay:.04s}
.kgrid .kpi:nth-child(3){animation-delay:.08s}
.kgrid .kpi:nth-child(4){animation-delay:.12s}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
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
  transition:transform .4s cubic-bezier(.34,1.56,.64,1);
}
.kpi-icon i{font-size:19px}
.kpi:hover .kpi-icon{transform:scale(1.15) rotate(-8deg)}
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
  width:30px;height:30px;border-radius:0;
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
.b-blue{background:var(--blue-lt);color:#ae1800}.b-blue::before{background:var(--blue)}
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
.btn:active{transform:scale(.94)}
.btn{transition:all .2s cubic-bezier(.34,1.56,.64,1)}
.btn i{font-size:14px}

/* 1 · PRIMARY — Shine Glint */
.bp{
  background:linear-gradient(135deg,#dd2b0f,#ae1800);color:#fff;
  box-shadow:0 2px 8px rgba(221,43,15,.28);
}
.bp::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.28) 50%,transparent 60%);
  background-size:200% 100%;background-position:-200% center;
  transition:none;pointer-events:none;border-radius:inherit;
}
.bp{transition:all .25s cubic-bezier(.34,1.56,.64,1)}
.bp:hover{background:linear-gradient(135deg,#ae1800,#8a1400);box-shadow:0 8px 24px rgba(221,43,15,.4);transform:translateY(-3px) scale(1.04)}
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
  box-shadow:0 4px 12px rgba(221,43,15,.10);
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
  transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .25s var(--ease),background .25s var(--ease);
}
.bicon:hover{transform:scale(1.25) rotate(-6deg);box-shadow:0 4px 14px rgba(0,0,0,.16)}
.bicon:active{transform:scale(.9)}

/* 6 · STATUS PILLS — Sliding indicator handled inline via JS state */
/* The pill group uses .pill-group; active pill transitions handled by background/color */
.pill-group{position:relative;display:flex;gap:4px}
.pill-group button{transition:background .18s var(--ease),color .18s var(--ease),border-color .18s var(--ease),box-shadow .18s var(--ease),transform .3s cubic-bezier(.34,1.56,.64,1)}
.pill-group button:active{transform:scale(.92)}
.pill-group button[class*="active"],.pill-group button.b-blue,.pill-group button[aria-pressed="true"]{animation:pillPop .35s cubic-bezier(.34,1.56,.64,1)}
@keyframes pillPop{0%{transform:scale(.9)}60%{transform:scale(1.06)}100%{transform:scale(1)}}

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
  transition:border .2s var(--ease),box-shadow .25s var(--ease),transform .2s var(--ease);width:100%;
}
.fgrp input:focus,.fgrp select:focus,.fgrp textarea:focus{
  border-color:var(--blue);
  box-shadow:0 0 0 4px rgba(221,43,15,.16);
  transform:translateY(-1px);
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
  animation:modalPop .4s cubic-bezier(.34,1.56,.64,1) both;
  border:1px solid rgba(99,102,241,.2);
  border-top:3px solid #818cf8;
}
@keyframes modalPop{from{opacity:0;transform:scale(.85) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
.modal-body{display:flex;gap:20px;align-items:flex-start}
.modal-main{flex:1;min-width:0}
.inv-side{width:240px;flex-shrink:0;display:flex;flex-direction:column;gap:14px;padding:20px 20px 20px 0;border-left:1px solid var(--border);margin-left:0}
.inv-side-progress{height:6px;border-radius:3px;background:var(--border);overflow:hidden}
.inv-side-progress-fill{height:100%;background:var(--green);border-radius:3px;transition:width .4s var(--ease)}
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
.inv-table th{background:#1e1b4b;color:#fff;padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left}
.inv-table th:last-child,.inv-table td:last-child{text-align:right}
.inv-table td{padding:7px 14px;font-size:13px;border-bottom:1px solid #f0f3f8}
.inv-table tr:last-child td{border-bottom:none}
.inv-table tr:nth-child(even) td{background:#f8fafc}
.inv-table tbody tr{transition:background .12s,transform .18s var(--ease),box-shadow .18s var(--ease);cursor:pointer}
.inv-table tbody tr:hover td{background:rgba(221,43,15,.05)!important}
.inv-table tbody tr:hover{transform:scale(1.008);box-shadow:0 4px 16px rgba(221,43,15,.12);position:relative;z-index:1}
.inventory-table{width:100%;border-collapse:collapse}
.inventory-table th{padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);text-align:left;border-bottom:1px solid var(--border);white-space:nowrap}
.inventory-table td{padding:10px 14px;font-size:13px;border-bottom:0.5px solid var(--border)}
.inventory-table tbody tr{transition:background .12s;cursor:default}
.inventory-table tbody tr:hover td{background:rgba(221,43,15,.03)!important}
.inv-thead th{position:sticky;top:54px;z-index:49;background:var(--white);box-shadow:inset 0 -1px 0 var(--border)}
.inv-totals-box{width:280px;margin-left:auto;margin-bottom:24px;background:#ffffff;padding:8px 0}
.inv-tot-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#0f172a}
.inv-tot-row.inv-tot-grand{border-top:2px solid #e2e8f0;margin-top:8px;padding:10px 10px 6px;border-radius:6px;background:#faf8f6;font-size:13px;font-weight:600}
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
.il-input:focus{border-color:var(--blue);box-shadow:0 0 0 2px rgba(221,43,15,.1)}

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
  position:relative;
  padding:10px 16px;font-size:13px;font-weight:500;
  color:var(--text2);cursor:pointer;
  border-bottom:2px solid transparent;margin-bottom:-1px;
  transition:color .2s var(--ease);
}
.tab::after{
  content:'';position:absolute;left:8px;right:8px;bottom:-2px;height:2px;
  background:var(--blue);border-radius:2px;
  transform:scaleX(0);opacity:0;
  transform-origin:center;
  transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .2s var(--ease);
}
.tab:hover{color:var(--text)}
.tab.active{color:var(--blue);font-weight:600}
.tab.active::after{transform:scaleX(1);opacity:1}

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
  background:linear-gradient(135deg,#dd2b0f,#ae1800);
  display:flex;align-items:center;justify-content:center;color:#fff;
  box-shadow:0 4px 14px rgba(221,43,15,.4);
  transform:translateY(-14px);
}

/* ────────────────────────────────────
   RESPONSIVE
   ──────────────────────────────────── */
@media(max-width:768px){
  .sidebar{display:none}
  .mob-nav{display:block}
  .main,.content{min-width:0}
  .content{padding:12px 12px 76px}
  .page-hero{margin-left:-12px!important;margin-right:-12px!important;padding-left:12px!important;padding-right:12px!important}
  .util-btns-bar,.dash-util-bar{display:none!important}
  .subnav-bar{overflow-x:auto;padding:0 12px!important;-webkit-overflow-scrolling:touch}
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
  .modal-body{flex-direction:column}
  .inv-side{width:100%;border-left:none;border-top:1px solid var(--border);padding:14px 0 0}
  .inv-side-actions{display:none!important}
  .inv-doc{padding:16px}
  .inv-table th,.inv-table td{padding:6px 8px;font-size:11px}
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
.onboard-card{background:var(--white);border-radius:24px;padding:40px;max-width:640px;width:90%;box-shadow:var(--sh3);animation:scaleIn .25s var(--ease)}
.onboard-step{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border)}
.onboard-step:last-child{border-bottom:none}
.onboard-check{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px}
.onboard-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.onboard-item{display:flex;align-items:flex-start;gap:12px;padding:16px;border:1px solid var(--border);border-radius:var(--rl);cursor:pointer;transition:border-color .15s var(--ease),background .15s var(--ease),transform .15s var(--ease)}
.onboard-item:hover{border-color:var(--blue);background:var(--bg);transform:translateY(-2px)}
.onboard-item.done{opacity:.6;cursor:default}
.onboard-item.done:hover{transform:none;border-color:var(--border);background:transparent}
.onboard-icon-lg{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:17px}

/* ── Empty States ── */
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 32px;text-align:center;background:radial-gradient(ellipse at 50% 0%,rgba(129,140,248,.07),transparent 70%);border-radius:var(--rl)}
.empty-state-icon{margin-bottom:16px;animation:emptyFloat 3s ease-in-out infinite}
.empty-state-icon-badge{width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center}
@keyframes emptyFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.empty-state-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px}
.empty-state-sub{font-size:13px;color:var(--text3);line-height:1.6;max-width:280px;margin-bottom:20px}

/* ── Version badge ── */
.version-badge{font-size:10px;color:rgba(255,255,255,.2);padding:2px 8px;border:1px solid rgba(255,255,255,.08);border-radius:20px;display:inline-block;margin-top:4px}

/* ── Mobile ── */
@media(max-width:768px){
  .onboard-grid{grid-template-columns:1fr}
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
    box-shadow:0 0 0 3px rgba(221,43,15,.15)!important;
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
.toast{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:var(--rl);box-shadow:0 4px 20px rgba(0,0,0,.15);font-size:13px;font-family:var(--sans);font-weight:500;min-width:280px;max-width:400px;pointer-events:all;animation:slideInRight .45s cubic-bezier(.34,1.56,.64,1);border:1px solid rgba(0,0,0,.06)}
.toast.success{background:#fff;color:#166534;border-left:3px solid var(--green)}
.toast.error{background:#fff;color:#991b1b;border-left:3px solid var(--red)}
.toast.info{background:#fff;color:#ae1800;border-left:3px solid var(--blue)}
.toast.warn{background:#fff;color:#92400e;border-left:3px solid var(--amber)}
.toast i{transition:transform .3s var(--ease)}
.toast.success i{animation:toastIconPop .45s cubic-bezier(.34,1.56,.64,1) .1s both}
@keyframes toastIconPop{0%{transform:scale(0) rotate(-45deg)}60%{transform:scale(1.3) rotate(10deg)}100%{transform:scale(1) rotate(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(60px) scale(.9)}to{opacity:1;transform:none}}
@keyframes slideOutRight{from{opacity:1;transform:none}to{opacity:0;transform:translateX(60px) scale(.9)}}
`;

// ── NAV CONFIG ────────────────────────────────────────────────────────────────
const NAV_ICONS = {
  "dashboard":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  "invoices":       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  "contacts":       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  "customer-hub":   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>,
  "inventory":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  "purchases":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  "credits":        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  "bills":          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="14" y2="12"/></svg>,
  "reports":        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  "analytics":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  "admin-reports":  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="12" y1="17" x2="8" y2="17"/></svg>,
  "statement":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>,
  "stock-adj":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  "stock-take":     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  "agent-report":   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="21" x2="23" y2="19"/><line x1="19" y1="21" x2="19" y2="17"/><line x1="15" y1="21" x2="15" y2="15"/></svg>,
  "import":         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  "delivery-notes": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  "settings":       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  "banking":        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  "credit-control": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  "vat-return":     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><line x1="7" y1="8" x2="12" y2="8"/></svg>,
  "bank-recon":     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
};

const NAV_GROUPS = [
  {
    label: "Sales",
    items: [
      { id: "invoices",     label: "Invoices" },
      { id: "contacts",     label: "Customers" },
      { id: "customer-hub", label: "Customer Hub", adminOnly: true },
      { id: "statement",    label: "Statements", adminOnly: true },
      { id: "agent-report", label: "Agent Sales", adminOnly: true },
    ]
  },
  {
    label: "Operations",
    items: [
      { id: "inventory",      label: "Inventory" },
      { id: "purchases",      label: "Purchases", adminOnly: true },
      { id: "bills",          label: "Bills", adminOnly: true },
      { id: "stock-adj",      label: "Stock In/Out", adminOnly: true },
      { id: "stock-take",     label: "Stock Take", adminOnly: true },
      { id: "delivery-notes", label: "Delivery Notes" },
      { id: "import",         label: "Import", adminOnly: true },
    ]
  },
  {
    label: "Finance",
    items: [
      { id: "admin-reports",  label: "Reports", adminOnly: true },
      { id: "banking",        label: "Banking", adminOnly: true },
      { id: "credit-control", label: "Credit Control", adminOnly: true },
      { id: "vat-return",     label: "VAT Return", adminOnly: true },
      { id: "bank-recon",     label: "Bank Reconciliation", adminOnly: true },
      { id: "credits",        label: "Credits", adminOnly: true },
    ]
  },
];

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "invoices", label: "Invoices" },
  { id: "contacts", label: "Customers" },
  { id: "customer-hub", label: "Customer Hub", adminOnly: true },
  { id: "inventory", label: "Inventory" },
  { id: "purchases", label: "Purchases", adminOnly: true },
  { id: "bills", label: "Bills", adminOnly: true },
  { id: "credits", label: "Credits", adminOnly: true },
  { id: "reports", label: "P&L", adminOnly: true },
  { id: "analytics", label: "Analytics", adminOnly: true },
  { id: "admin-reports", label: "Reports", adminOnly: true },
  { id: "statement", label: "Statements", adminOnly: true },
  { id: "stock-adj", label: "Stock In/Out", adminOnly: true },
  { id: "stock-take", label: "Stock Take", adminOnly: true },
  { id: "agent-report", label: "Agent Sales", adminOnly: true },
  { id: "banking", label: "Banking", adminOnly: true },
  { id: "credit-control", label: "Credit Control", adminOnly: true },
  { id: "vat-return", label: "VAT Return", adminOnly: true },
  { id: "bank-recon", label: "Bank Reconciliation", adminOnly: true },
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
          <button style={{ padding:"10px 20px",background:"#dd2b0f",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14 }} onClick={() => this.setState({ hasError:false, error:null })}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [printOverlayHTML, setPrintOverlayHTML] = useState(null);
  const [printOverlayTitle, setPrintOverlayTitle] = useState(null);
  const printIframeRef = useRef(null);

  // Scale the print preview to fit the screen width (A4 docs overflow phones).
  // Uses `zoom` (reflows) for screen only; reset to full size before printing.
  const fitPrintPreview = () => {
    const f = printIframeRef.current; if (!f) return;
    try {
      const doc = f.contentDocument; if (!doc || !doc.documentElement) return;
      doc.documentElement.style.zoom = "";
      const vw = f.clientWidth;
      const cw = doc.documentElement.scrollWidth;
      if (cw > vw + 4) doc.documentElement.style.zoom = String(Math.max(0.3, vw / cw));
    } catch (_) { /* cross-origin guard */ }
  };
  const doPrintOverlay = () => {
    const f = printIframeRef.current; if (!f) return;
    try {
      const doc = f.contentDocument;
      const prevZoom = doc && doc.documentElement ? doc.documentElement.style.zoom : "";
      if (doc && doc.documentElement) doc.documentElement.style.zoom = ""; // full size for the print output
      if (printOverlayTitle) document.title = printOverlayTitle;
      window.addEventListener("afterprint", () => { document.title = "LedgerOS"; if (doc && doc.documentElement) doc.documentElement.style.zoom = prevZoom; fitPrintPreview(); }, { once: true });
      f.contentWindow.print();
    } catch (_) { /* noop */ }
  };
  const [auth, setAuth] = useState(null);
  const [authRestoring, setAuthRestoring] = useState(() => !!localStorage.getItem('ledgeros_rt'));
  const [page, setPage] = useState("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [pendingInvoiceView, setPendingInvoiceView] = useState(null);
  const [pendingCustomer, setPendingCustomer] = useState(null);
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
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  // Auto-restore session from stored refresh token on page load (avoids login + MFA on every refresh)
  useEffect(() => {
    const rt = localStorage.getItem('ledgeros_rt');
    if (!rt) { setAuthRestoring(false); return; }
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ refresh_token: rt })
        });
        const data = await res.json();
        if (data?.access_token) {
          if (data.refresh_token) localStorage.setItem('ledgeros_rt', data.refresh_token);
          setAuth({ token: data.access_token, user: data.user });
        } else {
          localStorage.removeItem('ledgeros_rt');
        }
      } catch { localStorage.removeItem('ledgeros_rt'); }
      setAuthRestoring(false);
    })();
  }, []);

  // Expose print overlay setter globally so sub-components can trigger it without prop drilling
  React.useEffect(() => {
    window.__ledgerosPrint = (html) => {
      // Strip the .bta toolbar (React overlay has its own close button) and fix body padding
      const clean = html
        .replace(/<div class="bta">[\s\S]*?&#x2715;<\/a><\/div>/, '')
        .replace(/body\{padding-top:calc\(30mm \+ 54px\)\}/g, '')
        .replace(/@media print\{\.bta\{display:none!important\}body\{padding-top:0!important\}\}/g, '');
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
      setPrintOverlayTitle(titleMatch ? titleMatch[1] : null);
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

  // Lightweight page-view tracking for usage analytics (skips initial mount)
  const pageViewMounted = useRef(false);
  useEffect(() => {
    if (!auth) return;
    if (!pageViewMounted.current) { pageViewMounted.current = true; return; }
    logAudit(auth.token, auth.user.id, "page_view", "page", null, page);
  }, [page]);

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

  // Auto-logout after 30 minutes of inactivity, with a 1-minute warning first
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(60);
  useEffect(() => {
    if (!auth) return;
    const IDLE_LIMIT = 30 * 60 * 1000;
    const WARNING_AT = IDLE_LIMIT - 60 * 1000;
    let lastActivity = Date.now();
    let warned = false;

    const resetActivity = () => {
      lastActivity = Date.now();
      if (warned) { warned = false; setShowIdleWarning(false); }
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));

    const tick = setInterval(() => {
      const idleFor = Date.now() - lastActivity;
      if (idleFor >= IDLE_LIMIT) {
        clearInterval(tick);
        signOut();
      } else if (idleFor >= WARNING_AT) {
        warned = true;
        setShowIdleWarning(true);
        setIdleSecondsLeft(Math.ceil((IDLE_LIMIT - idleFor) / 1000));
      }
    }, 1000);

    return () => {
      clearInterval(tick);
      events.forEach(e => window.removeEventListener(e, resetActivity));
    };
  }, [auth]);

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

  if (authRestoring) return <><style>{CSS}</style><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f4f6f9"}}><div className="spin" style={{width:32,height:32,borderWidth:3}} /></div></>;
  if (!auth) return <><style>{CSS}</style><Auth onAuth={setAuth} sessionExpired={false} /></>;

  // ── Mobile PWA install banner rendered inline in JSX ──────────────────────

  return (
    <>
      <style>{CSS}</style>
      <div className={"app" + (darkMode ? " dark-mode" : "")}>
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
              <div className="util-btns-bar" style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto",paddingLeft:16,borderLeft:"1px solid rgba(255,255,255,.08)"}}>
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
          {/* ── TOP NAV (Modernist) ── */}
          <header className="topnav">
            <style>{`
              .topnav{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:22px;height:56px;padding:0 20px;background:#f6f5f2;border-bottom:1px solid rgba(32,30,29,.10);flex-shrink:0}
              .topnav-brand{display:flex;align-items:center;gap:10px;flex-shrink:0;cursor:pointer}
              .topnav-mark{width:36px;height:36px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
              .topnav-mark img{width:100%;height:100%;object-fit:contain;display:block}
              .topnav-wm{display:flex;flex-direction:column;line-height:1.08}
              .topnav-wm-row{font-size:15px;font-weight:800;color:#201e1d;letter-spacing:-.4px;font-family:'Archivo',system-ui,sans-serif}
              .topnav-wm-os{font-weight:300;color:#8a8580}
              .topnav-wm-sub{font-size:9.5px;color:#8a8580;letter-spacing:.2px}
              .topnav-live{display:inline-flex;align-items:center;gap:5px;background:#fff;border:1px solid rgba(32,30,29,.10);padding:3px 8px;margin-left:2px}
              .topnav-live-dot{width:5px;height:5px;border-radius:50%;background:#dd2b0f}
              .topnav-live-txt{font-size:9px;font-weight:700;color:#8a8580;letter-spacing:1px;text-transform:uppercase}
              .topnav-nav{display:flex;align-items:center;gap:2px;flex:1}
              .topnav-navitem{display:flex;align-items:center;gap:7px;padding:8px 12px;font-size:13.5px;font-weight:600;color:#3a3735;cursor:pointer;user-select:none;transition:color .12s,background .12s;white-space:nowrap}
              .topnav-navitem:hover{color:#201e1d;background:rgba(32,30,29,.05)}
              .topnav-navitem.active{color:#dd2b0f}
              .topnav-navbadge{font-size:9px;font-weight:700;background:rgba(32,30,29,.08);color:#57534e;padding:1px 6px;border-radius:20px;min-width:16px;text-align:center}
              .topnav-navitem.active .topnav-navbadge{background:rgba(221,43,15,.12);color:#dd2b0f}
              .topnav-right{display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:auto}
              .topnav .util-btns-bar{border-left:none!important;padding-left:0!important;margin-left:0!important}
              .topnav .tb-btn{background:transparent;border-color:transparent;color:#57534e}
              .topnav .tb-btn:hover{background:rgba(32,30,29,.06);border-color:transparent;color:#201e1d;box-shadow:none;transform:translateY(-1px)}
              .topnav-av{width:32px;height:32px;background:#dd2b0f;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;cursor:pointer;font-family:'Archivo',system-ui,sans-serif;border:none;flex-shrink:0}
              @media(max-width:768px){.topnav-nav{display:none}}
              @media(max-width:1050px){.topnav-wm,.topnav-live{display:none}}
            `}</style>
            <div className="topnav-brand" onClick={() => setPage("dashboard")}>
              <div className="topnav-mark"><img src={LOGO_BADGE} alt="Arkham Retail" /></div>
              <div className="topnav-wm">
                <div className="topnav-wm-row">Ledger<span className="topnav-wm-os">OS</span></div>
                <div className="topnav-wm-sub">Arkham Retail Ltd</div>
              </div>
              <span className="topnav-live"><span className="topnav-live-dot" /><span className="topnav-live-txt">Live</span></span>
            </div>
            <nav className="topnav-nav">
              <div className={"topnav-navitem "+(page==="dashboard"?"active":"")} onClick={() => setPage("dashboard")}>Dashboard</div>
              {(() => {
                const commercePages = ["invoices","contacts","customer-hub","statement","agent-report","delivery-notes","credits"];
                const overdueCount = invoices.filter(i=>i.status==="overdue").length;
                return <div className={"topnav-navitem "+(commercePages.includes(page)?"active":"")} onClick={() => setPage("invoices")}>Commerce{overdueCount>0&&<span className="topnav-navbadge">{overdueCount}</span>}</div>;
              })()}
              <div className={"topnav-navitem "+(["inventory","purchases","bills","stock-adj","stock-take","import"].includes(page)?"active":"")} onClick={() => setPage("inventory")}>Operations</div>
              {(profile?.role==="admin"||profile?.role==="manager") && (
                <div className={"topnav-navitem "+(["banking","reports","analytics","admin-reports","credit-control","vat-return","bank-recon"].includes(page)?"active":"")} onClick={() => setPage("banking")}>Finance</div>
              )}
              {(profile?.role==="admin"||profile?.role==="manager") && (
                <div className={"topnav-navitem "+(page==="settings"?"active":"")} onClick={() => setPage("settings")}>Administration</div>
              )}
            </nav>
            <div className="topnav-right">
              {window.__utilityBtns}
              <div style={{position:"relative"}}>
                <button className="topnav-av" onClick={() => setShowUserMenu(v=>!v)} title={profile?.full_name||auth.user.email}>{(profile?.full_name||auth.user.email||"U").replace(/[^a-zA-Z]/g,"").slice(0,2).toUpperCase()||"U"}</button>
                {showUserMenu && (
                  <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,width:220,background:"var(--white)",border:"1px solid var(--border)",boxShadow:"var(--sh3)",zIndex:300,overflow:"hidden",animation:"scaleIn .15s var(--ease) both",transformOrigin:"top right"}}>
                    <div style={{padding:"12px 14px",borderBottom:"1px solid var(--border)"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.full_name||auth.user.email}</div>
                      <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginTop:3}}>{profile?.role||"agent"}</div>
                    </div>
                    <button onClick={() => { setShowUserMenu(false); signOut(); }} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"11px 14px",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--text)",fontFamily:"var(--sans)",textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafd"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
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
              <button className="tb-btn" onMouseEnter={() => setShowAI(true)} onClick={() => setShowAI(v => !v)} title="AI Assistant" style={{ background: showAI ? "#201e1d" : undefined, color: showAI ? "#fff" : undefined, borderColor: showAI ? "transparent" : undefined, boxShadow: showAI ? "0 2px 8px rgba(0,0,0,.2)" : undefined }}>
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
                pages: ["invoices","contacts","customer-hub","statement","agent-report","delivery-notes","credits"],
                tabs: [
                  { id:"invoices",       label:"Invoices",       badge: overdueCount > 0 ? overdueCount : null },
                  { id:"contacts",       label:"Customers" },
                  { id:"customer-hub",   label:"Customer Hub", adminOnly:true },
                  { id:"statement",      label:"Statements",     adminOnly:true },
                  { id:"agent-report",   label:"Agent Sales",    adminOnly:true },
                  { id:"delivery-notes", label:"Delivery Notes" },
                  { id:"credits",        label:"Credits",        adminOnly:true },
                ]
              },
              operations: {
                pages: ["inventory","purchases","bills","stock-adj","stock-take","import"],
                tabs: [
                  { id:"inventory", label:"Inventory" },
                  { id:"purchases", label:"Purchases",  adminOnly:true },
                  { id:"bills",     label:"Bills",      adminOnly:true },
                  { id:"stock-adj", label:"Stock In/Out",adminOnly:true },
                  { id:"stock-take",label:"Stock Take", adminOnly:true },
                  { id:"import",    label:"Import",     adminOnly:true },
                ]
              },
              finance: {
                pages: ["banking","admin-reports","analytics","reports","credit-control","vat-return","bank-recon"],
                tabs: [
                  { id:"banking",        label:"Banking",        adminOnly:true },
                  { id:"credit-control", label:"Credit Control", adminOnly:true },
                  { id:"vat-return",     label:"VAT Return",     adminOnly:true },
                  { id:"bank-recon",     label:"Bank Rec.",      adminOnly:true },
                  { id:"admin-reports",  label:"Reports",        adminOnly:true },
                  { id:"analytics",      label:"Analytics",      adminOnly:true },
                  { id:"reports",        label:"P&L",            adminOnly:true },
                ]
              },
            };
            const activeEntry = Object.entries(sections).find(([,s]) => s.pages.includes(page));
            if (!activeEntry) return null;
            const [, section] = activeEntry;
            const visibleTabs = section.tabs.filter(t => !t.adminOnly || isAdmin);
            if (visibleTabs.length < 2) return null;
            return (
              <div className="subnav-bar" style={{ background:"#fff", borderBottom:"1px solid rgba(32,30,29,.10)", display:"flex", alignItems:"center", padding:"0 20px", position:"sticky", top:56, zIndex:40, flexShrink:0 }}>
                {visibleTabs.map(tab => (
                  <div key={tab.id} onClick={() => setPage(tab.id)} style={{ padding:"0 14px", height:42, display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:page===tab.id?700:500, color:page===tab.id?"#dd2b0f":"#57534e", borderBottom:page===tab.id?"2px solid #dd2b0f":"2px solid transparent", cursor:"pointer", whiteSpace:"nowrap", transition:"color .12s,border-color .12s" }}
                    onMouseEnter={e=>{if(page!==tab.id){e.currentTarget.style.color="#201e1d";e.currentTarget.style.borderBottom="2px solid rgba(221,43,15,.35)";}}}
                    onMouseLeave={e=>{if(page!==tab.id){e.currentTarget.style.color="#57534e";e.currentTarget.style.borderBottom="2px solid transparent";}}}>
                    {tab.label}
                    {tab.badge && <span style={{ fontSize:9, fontWeight:700, background:"rgba(221,43,15,.12)", color:"#ae1800", padding:"1px 5px", borderRadius:20, border:"1px solid rgba(221,43,15,.25)" }}>{tab.badge}</span>}
                  </div>
                ))}
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
                {page==="dashboard"&&<Dashboard accounts={accounts} invoices={invoices} setInvoices={setInvoices} contacts={contacts} setContacts={setContacts} products={products} profile={profile} setPage={setPage} setPendingFilter={setPendingFilter} allProfiles={allProfiles} token={auth.token} userId={auth.user.id} />}
                {page==="invoices"&&<Invoices invoices={invoices} setInvoices={setInvoices} contacts={contacts} setContacts={setContacts} products={products} accounts={accounts} token={auth.token} userId={auth.user.id} profile={profile} allProfiles={allProfiles||[]} pendingInvoiceView={pendingInvoiceView} onClearPending={() => setPendingInvoiceView(null)} pendingFilter={pendingFilter} onClearFilter={() => setPendingFilter(null)} triggerNewInvoice={triggerNewInvoice} onTriggerHandled={() => setTriggerNewInvoice(0)} />}
                {page==="contacts"&&<Contacts contacts={contacts} setContacts={setContacts} token={auth.token} userId={auth.user.id} invoices={invoices} products={products} profile={profile} triggerNewContact={triggerNewContact} onTriggerContactHandled={() => setTriggerNewContact(0)} onOpenCustomer={(c) => { setPendingCustomer(c.id); setPage("customer-hub"); }} />}
                {page==="customer-hub"&&<CustomerHub contacts={contacts} setContacts={setContacts} invoices={invoices} setInvoices={setInvoices} products={products} accounts={accounts} token={auth.token} userId={auth.user.id} profile={profile} pendingCustomer={pendingCustomer} onClearPending={() => setPendingCustomer(null)} />}
                {page==="inventory"&&<Inventory products={products} setProducts={setProducts} invoices={invoices} token={auth.token} userId={auth.user.id} profile={profile} />}
                {page==="purchases"&&<Purchases contacts={contacts} setContacts={setContacts} products={products} setProducts={setProducts} accounts={accounts} token={auth.token} userId={auth.user.id} />}
                {page==="bills"&&<SupplierBills contacts={contacts} setContacts={setContacts} accounts={accounts} token={auth.token} userId={auth.user.id} profile={profile} />}
                {page==="credits"&&<CreditNotes contacts={contacts} invoices={invoices} setInvoices={setInvoices} profile={profile} token={auth.token} userId={auth.user.id} />}
                {page==="reports"&&<Reports accounts={accounts} />}
                {page==="analytics"&&<div style={{margin:"-26px -28px",overflow:"hidden"}}><Analytics invoices={invoices} products={products} contacts={contacts} /></div>}
                {page==="import"&&<CsvImport contacts={contacts} setContacts={setContacts} products={products} setProducts={setProducts} invoices={invoices} setInvoices={setInvoices} token={auth.token} userId={auth.user.id} />}
                {page==="statement"&&<CustomerStatement contacts={contacts} invoices={invoices} token={auth.token} />}
                {page==="admin-reports"&&<AdminReports invoices={invoices} products={products} contacts={contacts} accounts={accounts} allProfiles={allProfiles} setPage={setPage} setPendingFilter={setPendingFilter} token={auth.token} userId={auth.user.id} profile={profile} />}
                {page==="stock-adj"&&<StockAdjustment products={products} setProducts={setProducts} token={auth.token} userId={auth.user.id} />}
                {page==="stock-take"&&<StockTake products={products} setProducts={setProducts} token={auth.token} userId={auth.user.id} profile={profile} />}
                {page==="agent-report"&&<AgentReport invoices={invoices} allProfiles={allProfiles} contacts={contacts} />}
                {page==="delivery-notes"&&<DeliveryNotes contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
                {page==="settings"&&<Settings auth={auth} profile={profile} darkMode={darkMode} toggleDark={toggleDark} onSignOut={signOut} products={products} />}
                {page==="banking"&&<BankingPage token={auth.token} userId={auth.user.id} profile={profile} />}
                {page==="credit-control"&&<CreditControl contacts={contacts} invoices={invoices} token={auth.token} userId={auth.user.id} profile={profile} />}
                {page==="vat-return"&&<VATReturn invoices={invoices} token={auth.token} />}
                {page==="bank-recon"&&<BankReconciliation token={auth.token} />}
              </>
            )}
          </div>
        </div>
        {showCmdK && <CommandPalette onClose={() => setShowCmdK(false)} setPage={setPage} invoices={invoices} contacts={contacts} products={products} />}
        {showIdleWarning && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(10,14,26,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: "var(--white)", borderRadius: 16, padding: 28, maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.3)", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Still there?</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>You'll be signed out in <strong>{idleSecondsLeft}s</strong> due to inactivity.</div>
              <button className="btn bp" style={{ width: "100%" }} onClick={() => setShowIdleWarning(false)}>Stay signed in</button>
            </div>
          </div>
        )}
        {showInstallBanner && isMobile() && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, padding: "12px 16px 20px", background: "#060d1f", borderTop: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 -4px 24px rgba(0,0,0,.4)" }}>
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0, borderRadius: 9 }}><rect width="32" height="32" rx="7" fill="#201e1d"/><rect x="9" y="7" width="4" height="18" rx="2" fill="#ffffff"/><rect x="9" y="21" width="14" height="4" rx="2" fill="#ffffff"/><rect x="18" y="7" width="4" height="9" rx="2" fill="#ff6a4d"/></svg>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Add LedgerOS to your home screen</div><div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", lineHeight: 1.4 }}>Get instant access — works offline too</div></div>
            <button onClick={handleInstall} style={{ background: "linear-gradient(135deg,#dd2b0f,#ae1800)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--sans)", whiteSpace: "nowrap", flexShrink: 0 }}>Add</button>
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
                  { label:"New Invoice", color:"#dd2b0f", action:() => { setPage("invoices"); setTriggerNewInvoice(t => t + 1); }, icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> },
                  { label:"Record Payment", color:"#16a34a", action:() => { setPage("invoices"); setPendingFilter("pending"); }, icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
                  { label:"New Customer", color:"#f59e0b", action:() => { setPage("contacts"); setTriggerNewContact(t => t + 1); }, icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> },
                  { label:"Delivery Note", color:"#201e1d", action:() => setPage("delivery-notes"), icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
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
                <div style={{ margin:"4px 12px 12px", padding:"12px 14px", borderRadius:12, background:"#faf8f6", border:"1px solid #e7e2dc", display:"flex", gap:10, alignItems:"flex-start" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dd2b0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#201e1d" }}>Your Access Level: Agent</div>
                    <div style={{ fontSize:11, color:"#57534e", marginTop:2 }}>You can manage your own invoices, customers, deliveries and stock. Admin-only sections (banking, reports, settings) aren't shown.</div>
                  </div>
                </div>
              )}
              {/* Grouped nav sections */}
              {(profile?.role==="admin" ? [
                { label:"Commerce", color:"#dd2b0f", items:["customer-hub","statement","agent-report","credits","delivery-notes"] },
                { label:"Operations", color:"#201e1d", items:["inventory","purchases","bills","stock-adj","stock-take","import"] },
                { label:"Finance", color:"#16a34a", items:["banking","credit-control","vat-return","bank-recon","admin-reports","analytics"] },
                { label:"Settings", color:"#8a8580", items:["settings"] },
              ] : [
                { label:"My Tools", color:"#dd2b0f", items:["delivery-notes","agent-report"] },
                { label:"Account", color:"#8a8580", items:["settings"] },
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
                              "bills":         <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="14" y2="12"/></svg>,
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
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <button
                onClick={doPrintOverlay}
                style={{height:38,padding:'0 16px',background:'#dd2b0f',border:'none',borderRadius:9,display:'flex',alignItems:'center',gap:7,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--sans)'}}
                title="Print / Save PDF"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
              <button
                onClick={() => { document.title = "LedgerOS"; setPrintOverlayHTML(null); setPrintOverlayTitle(null); }}
                style={{width:38,height:38,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.3)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20,cursor:'pointer',lineHeight:1,fontFamily:'sans-serif',flexShrink:0}}
                title="Close"
              >&#x2715;</button>
            </div>
          </div>
          <iframe
            ref={printIframeRef}
            srcDoc={printOverlayHTML}
            onLoad={e => {
              try {
                const mobile = window.innerWidth < 768;
                if (mobile) {
                  // Phones: fit the A4 page to the screen and let the user review,
                  // then print via the header button (auto-print sheet over a
                  // cut-off doc is a poor experience).
                  fitPrintPreview();
                } else {
                  if (printOverlayTitle) document.title = printOverlayTitle;
                  window.addEventListener('afterprint', () => { document.title = "LedgerOS"; }, { once: true });
                  e.target.contentWindow.print();
                }
              } catch(_) {}
            }}
            style={{flex:1,border:'none',background:'#fff',width:'100%'}}
            title="Print Preview"
          />
        </div>
      )}
    </>
  );
}
