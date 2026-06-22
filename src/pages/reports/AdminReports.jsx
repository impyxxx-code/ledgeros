import React, { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { sb } from "../../lib/supabase.js";
import { fmt, fmtDate, escHtml, DEFAULT_REORDER } from "../../lib/utils.js";
import { COMPANY, LOGO, toast } from "../../lib/constants.js";
import { sendEmail } from "../../lib/email.js";
import { ProductSalesTracker } from "./ProductSalesTracker.jsx";
import { AgentProductsReport } from "./AgentProductsReport.jsx";
import { CustomReportBuilder } from "./CustomReportBuilder.jsx";

const downloadCsv = (filename, header, rows) => {
  const csv = header.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
};

// ┌────────────────────────────────────────────────────────────┐
// │ AdminReports                                               │
// │ Full reports hub — QuickBooks-style categorized suite      │
// └────────────────────────────────────────────────────────────┘
export function AdminReports({ invoices, products, contacts, accounts, allProfiles, setPage, setPendingFilter, token, userId, profile }) {
  const [tab, setTab] = useState("overview");
  const [pos, setPOs] = useState([]);
  const [poLines, setPoLines] = useState([]);
  const [pcCategory, setPcCategory] = useState("all");
  const [collAudit, setCollAudit] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetEdits, setBudgetEdits] = useState({});
  const loadBudgets = () => sb.get(token, "budgets", "order=period.desc").then(d => Array.isArray(d) && setBudgets(d));
  useEffect(() => {
    if (!token) return;
    sb.get(token, "purchase_orders", "order=order_date.desc").then(d => Array.isArray(d) && setPOs(d));
    sb.get(token, "purchase_order_lines", "order=created_at.desc").then(d => Array.isArray(d) && setPoLines(d));
    sb.get(token, "audit_log", "action=in.(reminder_sent,payment_received,part_payment,bulk_payment)&order=created_at.desc&limit=2000").then(d => Array.isArray(d) && setCollAudit(d));
    loadBudgets();
  }, [token]);
  const saveBudget = async (periodKey) => {
    const val = parseFloat(budgetEdits[periodKey]);
    if (isNaN(val)) return;
    const existing = budgets.find(b => b.period === periodKey);
    if (existing) await sb.patch(token, "budgets", existing.id, { revenue_target: val });
    else await sb.post(token, "budgets", { period: periodKey, revenue_target: val, created_by: userId });
    setBudgetEdits(prev => { const n = {...prev}; delete n[periodKey]; return n; });
    loadBudgets();
    toast.success("Budget saved");
  };
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
    const periodKey = d.toISOString().slice(0,7);
    const invs = invoices.filter(inv => { const id = new Date(inv.invoice_date || inv.created_at); return id.getMonth()===d.getMonth() && id.getFullYear()===d.getFullYear(); });
    return { month, periodKey, total: invs.reduce((s,i)=>s+parseFloat(i.amount||0),0), paid: invs.reduce((s,i)=>s+parseFloat(i.amount_paid||0),0), count: invs.length };
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
  // ── VAT Liability ──
  const filterPOByPeriod = (po) => {
    const d = new Date(po.order_date || po.created_at);
    if (period === "week") return (now - d) < 7 * 86400000;
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "quarter") return Math.floor(d.getMonth()/3) === Math.floor(now.getMonth()/3) && d.getFullYear() === now.getFullYear();
    if (period === "year") return d.getFullYear() === now.getFullYear();
    return true;
  };
  const filteredPOs = pos.filter(filterPOByPeriod);
  const filteredPOIds = new Set(filteredPOs.map(p => p.id));
  const filteredPOLines = poLines.filter(l => filteredPOIds.has(l.po_id));
  const outputVAT = filteredInv.filter(i=>i.status!=="draft"&&i.status!=="cancelled").reduce((s,i) => s + parseFloat(i.vat_total||0), 0);
  const inputVAT = filteredPOLines.reduce((s,l) => s + (parseFloat(l.total)||0) * (parseFloat(l.vat_rate)||0) / 100, 0);
  const netVAT = outputVAT - inputVAT;
  const outputVATByRate = [20,5,0].map(rate => ({
    rate,
    net: filteredInv.filter(i=>i.status!=="draft"&&i.status!=="cancelled").reduce((s,i) => {
      let lines = []; try { lines = typeof i.lines === "string" ? JSON.parse(i.lines) : (i.lines||[]); } catch {}
      return s + (Array.isArray(lines) ? lines.filter(l=>(parseFloat(l.vat_rate)??20)===rate).reduce((ls,l)=>ls+(parseFloat(l.qty)||0)*(parseFloat(l.unit_price)||0),0) : 0);
    }, 0),
    vat: filteredInv.filter(i=>i.status!=="draft"&&i.status!=="cancelled").reduce((s,i) => {
      let lines = []; try { lines = typeof i.lines === "string" ? JSON.parse(i.lines) : (i.lines||[]); } catch {}
      return s + (Array.isArray(lines) ? lines.filter(l=>(parseFloat(l.vat_rate)??20)===rate).reduce((ls,l)=>ls+(parseFloat(l.qty)||0)*(parseFloat(l.unit_price)||0)*(rate/100),0) : 0);
    }, 0),
  }));
  // ── VAT Exceptions ──
  const validRates = [0, 5, 20];
  const vatExceptions = [];
  invoices.filter(i=>i.status!=="draft"&&i.status!=="cancelled").forEach(inv => {
    let lines = []; try { lines = typeof inv.lines === "string" ? JSON.parse(inv.lines) : (inv.lines||[]); } catch {}
    (Array.isArray(lines)?lines:[]).forEach(l => {
      const lineRate = parseFloat(l.vat_rate);
      if (isNaN(lineRate)) return;
      const product = l.product_id ? products.find(p=>p.id===l.product_id) : products.find(p=>p.name===l.description);
      if (product && parseFloat(product.vat_rate) !== lineRate) {
        vatExceptions.push({ source:"Invoice", doc:inv.invoice_number, party:inv.customer, date:inv.invoice_date, product:l.description, lineRate, catalogRate:parseFloat(product.vat_rate), amount:(parseFloat(l.qty)||0)*(parseFloat(l.unit_price)||0) });
      } else if (!validRates.includes(lineRate)) {
        vatExceptions.push({ source:"Invoice", doc:inv.invoice_number, party:inv.customer, date:inv.invoice_date, product:l.description, lineRate, catalogRate:product?parseFloat(product.vat_rate):null, amount:(parseFloat(l.qty)||0)*(parseFloat(l.unit_price)||0) });
      }
    });
  });
  poLines.forEach(l => {
    const lineRate = parseFloat(l.vat_rate);
    if (isNaN(lineRate)) return;
    const po = pos.find(p=>p.id===l.po_id);
    const product = l.product_id ? products.find(p=>p.id===l.product_id) : null;
    if (product && parseFloat(product.vat_rate) !== lineRate) {
      vatExceptions.push({ source:"Purchase", doc:po?.po_number||"—", party:po?.supplier_name||"—", date:po?.order_date, product:l.product_name, lineRate, catalogRate:parseFloat(product.vat_rate), amount:parseFloat(l.total)||0 });
    } else if (!validRates.includes(lineRate)) {
      vatExceptions.push({ source:"Purchase", doc:po?.po_number||"—", party:po?.supplier_name||"—", date:po?.order_date, product:l.product_name, lineRate, catalogRate:product?parseFloat(product.vat_rate):null, amount:parseFloat(l.total)||0 });
    }
  });
  // ── Collections Report ──
  const collOutstanding = invoices.filter(i=>i.status==="pending"||i.status==="overdue"||i.status==="partial");
  const collRows = collOutstanding.map(inv => {
    const reminders = collAudit.filter(a=>a.action==="reminder_sent"&&a.entity_id===inv.id);
    const payments = collAudit.filter(a=>(a.action==="payment_received"||a.action==="part_payment")&&a.entity_id===inv.id);
    const daysOverdue = Math.max(0, Math.floor((now - new Date(inv.due_date||inv.invoice_date)) / 86400000));
    return {
      inv, customer: inv.customer, invoice_number: inv.invoice_number,
      balance: parseFloat(inv.balance)>0?parseFloat(inv.balance):parseFloat(inv.amount)||0,
      daysOverdue,
      reminderCount: reminders.length,
      lastReminder: reminders[0]?.created_at || null,
      lastPaymentActivity: payments[0]?.created_at || null,
      chased: reminders.length > 0,
    };
  }).sort((a,b)=>b.daysOverdue-a.daysOverdue);
  const chasedCount = collRows.filter(r=>r.chased).length;
  const notChasedCount = collRows.length - chasedCount;
  const notChasedValue = collRows.filter(r=>!r.chased).reduce((s,r)=>s+r.balance,0);
  // ── Trial Balance ──
  const debitTypes = ["Asset","Expense"];
  const trialRows = accounts.map(a => ({ ...a, debit: debitTypes.includes(a.type) ? parseFloat(a.balance||0) : 0, credit: !debitTypes.includes(a.type) ? parseFloat(a.balance||0) : 0 }));
  const totalDebits = trialRows.reduce((s,a)=>s+a.debit,0);
  const totalCredits = trialRows.reduce((s,a)=>s+a.credit,0);
  // ── Physical Inventory Worksheet ──
  const pcProducts = (pcCategory==="all" ? products : products.filter(p=>(p.category||"General")===pcCategory)).slice().sort((a,b)=>(a.category||"").localeCompare(b.category||"")||a.name.localeCompare(b.name));
  const printPhysicalCount = () => {
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Physical Inventory Worksheet</title>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#0a0f1e;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{max-width:820px;margin:0 auto;padding:28px 32px}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #1e1b4b;margin-bottom:20px}.logo-wrap img{height:60px;object-fit:contain}.doc-title{font-size:26px;font-weight:900;color:#1e1b4b;letter-spacing:-1px}.doc-sub{font-size:11px;color:#64748b;margin-top:4px}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#1e1b4b}th{padding:9px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#fff;text-align:left}td{padding:9px 12px;font-size:12px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#fafbfd}.td-blank{text-align:center;color:#cbd5e1;width:90px}.footer-box{margin-top:16px;font-size:9px;color:#64748b;line-height:1.7}</style>
</head><body><div class="page">
<div class="header"><div class="logo-wrap"><img src="${LOGO}" alt="Arkham Retail"/></div><div style="text-align:right"><div class="doc-title">PHYSICAL INVENTORY WORKSHEET</div><div class="doc-sub">${pcCategory==="all"?"All categories":escHtml(pcCategory)} · ${pcProducts.length} products · Generated ${fmtDate(new Date().toISOString().slice(0,10))}</div></div></div>
<table><thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>System Qty</th><th class="td-blank">Counted Qty</th><th class="td-blank">Variance</th></tr></thead><tbody>
${pcProducts.map(p=>`<tr><td>${escHtml(p.code||"—")}</td><td style="font-weight:600">${escHtml(p.name)}</td><td>${escHtml(p.category||"General")}</td><td>${p.stock_qty||0} ${escHtml(p.unit||"")}</td><td class="td-blank">________</td><td class="td-blank">________</td></tr>`).join("")}
</tbody></table>
<div class="footer-box"><div><b>${COMPANY.name}</b> · ${COMPANY.address}, ${COMPANY.city}, ${COMPANY.postcode}</div><div>Counted by: ____________________ &nbsp;&nbsp; Date: ____________ &nbsp;&nbsp; Signature: ____________________</div></div>
</div></body></html>`;
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };
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
        .ar2-group.gr-ovw { color: #2563eb; border-bottom: 2.5px solid #2563eb; background: #eff6ff; }
        .ar2-group.gr-rec { color: #0891b2; border-bottom: 2.5px solid #0891b2; background: #ecfeff; }
        .ar2-group.gr-pay { color: #ea580c; border-bottom: 2.5px solid #ea580c; background: #fff7ed; }
        .ar2-group.gr-sal { color: #16a34a; border-bottom: 2.5px solid #16a34a; background: #f0fdf4; }
        .ar2-group.gr-inv { color: #7c3aed; border-bottom: 2.5px solid #7c3aed; background: #f5f3ff; }
        .ar2-group.gr-acc { color: #b45309; border-bottom: 2.5px solid #b45309; background: #fffbeb; }
        .ar2-badge { font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 10px; background: #fee2e2; color: #991b1b; }
        .ar2-row2 { display: flex; background: var(--white); }
        .ar2-tab { padding: 10px 16px; font-size: 12px; font-weight: 400; color: var(--text2); cursor: pointer; border: none; background: none; font-family: var(--sans); white-space: nowrap; border-bottom: 2px solid transparent; transition: color .12s, background .12s; }
        .ar2-tab:hover { color: var(--text); background: var(--bg); }
        .ar2-tab.on-ovw { color: #2563eb; font-weight: 600; border-bottom-color: #2563eb; }
        .ar2-tab.on-rec { color: #0891b2; font-weight: 600; border-bottom-color: #0891b2; }
        .ar2-tab.on-pay { color: #ea580c; font-weight: 600; border-bottom-color: #ea580c; }
        .ar2-tab.on-sal { color: #16a34a; font-weight: 600; border-bottom-color: #16a34a; }
        .ar2-tab.on-inv { color: #7c3aed; font-weight: 600; border-bottom-color: #7c3aed; }
        .ar2-tab.on-acc { color: #b45309; font-weight: 600; border-bottom-color: #b45309; }
      `}</style>
      {(() => {
        const groups = [
          { label:"Business Overview", key:"ovw", icon:"📊", color:"#2563eb", tabs:[["overview","Overview"],["monthly","Monthly"],["pl","P&L"],["balance","Balance Sheet"]] },
          { label:"Receivables", key:"rec", icon:"💳", color:"#0891b2", tabs:[["aged-debtors","Aged Debtors",invoices.filter(i=>i.status==="overdue").length],["collections","Collections",notChasedCount],["customers","Customers"],["cashflow","Cash Flow"]] },
          { label:"Payables", key:"pay", icon:"📤", color:"#ea580c", tabs:[["aged-creditors","Aged Creditors"],["cash-recon","Cash Recon"]] },
          { label:"Sales", key:"sal", icon:"📈", color:"#16a34a", tabs:[["agents","Agents"],["agent-products","Agent Products"],["product-tracker","Product Tracker"]] },
          { label:"Inventory", key:"inv", icon:"📦", color:"#7c3aed", tabs:[["products","Products"],["stock","Stock"],["inventory-valuation","Valuation"],["physical-count","Physical Count"]] },
          { label:"Accountant", key:"acc", icon:"🧮", color:"#b45309", tabs:[["trial-balance","Trial Balance"],["vat-summary","VAT Summary"],["vat-exceptions","VAT Exceptions",vatExceptions.length],["budget","Budget vs Actuals"],["custom","Custom Reports"]] },
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
                  {g.key==="rec" && invoices.filter(i=>i.status==="overdue").length > 0 &&
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
        <div className="card" style={{marginBottom:20}}>
          <div className="ch"><div><div className="ct">Invoice Status Breakdown</div><div className="cs">{periodLabels[period]} · {filteredInv.length} invoices</div></div></div>
          <div style={{display:"flex",alignItems:"center",gap:24,padding:"4px 24px 20px",flexWrap:"wrap"}}>
            <div style={{position:"relative",width:180,height:180,flexShrink:0}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{name:"Collected",value:totalPaid,color:"#16a34a"},{name:"Pending",value:totalPending,color:"#d97706"},{name:"Overdue",value:totalOverdue,color:"#dc2626"}].filter(d=>d.value>0)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={80} paddingAngle={2} animationDuration={900}>
                    {[{name:"Collected",value:totalPaid,color:"#16a34a"},{name:"Pending",value:totalPending,color:"#d97706"},{name:"Overdue",value:totalOverdue,color:"#dc2626"}].filter(d=>d.value>0).map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v)=>fmt(v)}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}>
                <div style={{fontSize:16,fontWeight:800,color:"var(--text)",fontFamily:"var(--mono)"}}>{fmt(totalSales)}</div>
                <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px"}}>Total Invoiced</div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[{name:"Collected",value:totalPaid,color:"#16a34a"},{name:"Pending",value:totalPending,color:"#d97706"},{name:"Overdue",value:totalOverdue,color:"#dc2626"}].map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:10,height:10,borderRadius:2,background:d.color}}/>
                  <div style={{fontSize:12,color:"var(--text2)",minWidth:70}}>{d.name}</div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)",fontFamily:"var(--mono)"}}>{fmt(d.value)}</div>
                  <div style={{fontSize:11,color:"var(--text3)"}}>{totalSales>0?Math.round(d.value/totalSales*100):0}%</div>
                </div>
              ))}
            </div>
          </div>
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
        // ── Prior period comparison (revenue is the only field with real per-period dates) ──
        const filterByPriorPeriod = (inv) => {
          const d = new Date(inv.invoice_date || inv.created_at);
          if (period === "week") { const start = new Date(now); start.setDate(now.getDate()-14); const end = new Date(now); end.setDate(now.getDate()-7); return d >= start && d < end; }
          if (period === "month") { const pm = now.getMonth()===0?11:now.getMonth()-1; const py = now.getMonth()===0?now.getFullYear()-1:now.getFullYear(); return d.getMonth()===pm && d.getFullYear()===py; }
          if (period === "quarter") { const pq = Math.floor(now.getMonth()/3)-1; const py = pq<0?now.getFullYear()-1:now.getFullYear(); const pqn = pq<0?3:pq; return Math.floor(d.getMonth()/3)===pqn && d.getFullYear()===py; }
          if (period === "year") return d.getFullYear() === now.getFullYear()-1;
          return false;
        };
        const priorInv = period === "all" ? [] : invoices.filter(filterByPriorPeriod);
        const priorRevenue = priorInv.reduce((s,i)=>s+parseFloat(i.amount_paid||0),0);
        const priorVat = priorInv.filter(i=>i.status==="paid").reduce((s,i)=>s+(i.vat_total||0),0);
        const priorNetRevenue = priorRevenue - priorVat;
        const revenueChange = priorNetRevenue > 0 ? ((netRevenue-priorNetRevenue)/priorNetRevenue*100) : null;
        const priorLabels = { week:"Prior Week", month:"Prior Month", quarter:"Prior Quarter", year:"Prior Year", all:"" };
        return (
          <div>
            <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom:20 }}>
              {[{l:"Net Revenue",v:fmt(netRevenue),c:"var(--blue)"},{l:"Gross Profit",v:fmt(grossProfit),c:"var(--green)"},{l:"Net Profit",v:fmt(netProfit),c:netProfit>=0?"var(--green)":"var(--red)"},{l:"Net Margin",v:netMargin+"%",c:netProfit>=0?"var(--green)":"var(--red)"}].map(k=>(
                <div key={k.l} className="kpi" style={{marginBottom:0}}><div className="kpi-label">{k.l}</div><div className="kpi-val" style={{color:k.c}}>{k.v}</div></div>
              ))}
            </div>
            {period !== "all" && (
              <div className="card" style={{marginBottom:20,padding:18}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:12}}>Revenue vs {priorLabels[period]}</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:24}}>
                  <div><div style={{fontSize:10,color:"var(--text3)",marginBottom:3}}>{periodLabels[period]}</div><div style={{fontSize:22,fontWeight:800,color:"var(--blue)"}}>{fmt(netRevenue)}</div></div>
                  <div style={{fontSize:18,color:"var(--text3)",paddingBottom:4}}>vs</div>
                  <div><div style={{fontSize:10,color:"var(--text3)",marginBottom:3}}>{priorLabels[period]}</div><div style={{fontSize:22,fontWeight:800,color:"var(--text2)"}}>{fmt(priorNetRevenue)}</div></div>
                  {revenueChange !== null && (
                    <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,background:revenueChange>=0?"#f0fdf4":"#fef2f2"}}>
                      <span style={{fontSize:16}}>{revenueChange>=0?"▲":"▼"}</span>
                      <span style={{fontSize:16,fontWeight:800,color:revenueChange>=0?"var(--green)":"var(--red)"}}>{Math.abs(revenueChange).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:10}}>Note: Gross Profit/Net Profit/Expenses can't be compared period-over-period — Cost of Goods uses today's stock snapshot and Expenses use a running account balance, neither tracked historically by period yet.</div>
              </div>
            )}
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

      {tab==="collections" && <div>
        <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom:20 }}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Outstanding Invoices</div><div className="kpi-val">{collRows.length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Chased (Reminder Sent)</div><div className="kpi-val tg">{chasedCount}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Never Chased</div><div className="kpi-val" style={{color:"var(--red)"}}>{notChasedCount}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Never-Chased Value</div><div className="kpi-val" style={{color:"var(--red)"}}>{fmt(notChasedValue)}</div></div>
        </div>
        <div className="card">
          <div className="ch">
            <div><div className="ct">Collections — Chase Activity</div><div className="cs">Every outstanding invoice with reminder/payment history, oldest first</div></div>
            <button className="btn bo bsm" onClick={() => downloadCsv("collections.csv", ["Customer","Invoice #","Balance","Days Overdue","Reminders Sent","Last Reminder","Last Payment Activity"], collRows.map(r=>[r.customer,r.invoice_number,r.balance.toFixed(2),r.daysOverdue,r.reminderCount,r.lastReminder?fmtDate(r.lastReminder):"",r.lastPaymentActivity?fmtDate(r.lastPaymentActivity):""]))}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Customer</th><th>Invoice #</th><th style={{textAlign:"right"}}>Balance</th><th style={{textAlign:"right"}}>Days Overdue</th><th style={{textAlign:"right"}}>Reminders</th><th>Last Reminder</th><th>Last Payment Activity</th></tr></thead><tbody>{collRows.map(r => <tr key={r.inv.id}><td style={{fontWeight:500}}>{r.customer}</td><td className="mono" style={{color:"var(--blue)",fontSize:12}}>{r.invoice_number}</td><td className="mono" style={{textAlign:"right",fontWeight:600}}>{fmt(r.balance)}</td><td className="mono" style={{textAlign:"right",color:r.daysOverdue>30?"var(--red)":r.daysOverdue>0?"var(--amber)":"var(--text3)"}}>{r.daysOverdue}</td><td style={{textAlign:"right"}}>{r.chased?<span className="badge b-green">{r.reminderCount}</span>:<span className="badge b-red">0</span>}</td><td style={{fontSize:12,color:"var(--text3)"}}>{r.lastReminder?fmtDate(r.lastReminder):"—"}</td><td style={{fontSize:12,color:"var(--text3)"}}>{r.lastPaymentActivity?fmtDate(r.lastPaymentActivity):"—"}</td></tr>)}{collRows.length===0&&<tr><td colSpan={7} className="empty">No outstanding invoices</td></tr>}</tbody></table></div>
        </div>
      </div>}

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

      {tab==="inventory-valuation" && <div>
        <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom:20 }}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Products</div><div className="kpi-val">{products.length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Stock Value (Cost)</div><div className="kpi-val">{fmt(totalStockValue)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Stock Value (Retail)</div><div className="kpi-val tg">{fmt(totalRetailValue)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Unrealised Margin</div><div className="kpi-val" style={{color:"var(--purple)"}}>{fmt(totalRetailValue-totalStockValue)}</div></div>
        </div>
        <div className="card">
          <div className="ch">
            <div><div className="ct">Inventory Valuation by Category</div><div className="cs">As of {fmtDate(new Date().toISOString().slice(0,10))} · valued at cost</div></div>
            <button className="btn bo bsm" onClick={() => downloadCsv("inventory-valuation.csv", ["Category","Products","Cost Value","Retail Value","Low Stock"], catData.map(c=>[c.name,c.products,c.stockValue.toFixed(2),c.retailValue.toFixed(2),c.lowStock]))}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Category</th><th>Products</th><th>Cost Value</th><th>Retail Value</th><th>Low Stock</th></tr></thead><tbody>{catData.map(c => <tr key={c.name}><td style={{fontWeight:600}}>{c.name}</td><td className="mono">{c.products}</td><td className="mono">{fmt(c.stockValue)}</td><td className="mono tg">{fmt(c.retailValue)}</td><td>{c.lowStock>0?<span className="badge b-red">{c.lowStock}</span>:<span className="badge b-green">✓</span>}</td></tr>)}
          <tr style={{background:"#f8fafc",fontWeight:700}}><td>TOTAL</td><td className="mono">{products.length}</td><td className="mono">{fmt(totalStockValue)}</td><td className="mono tg">{fmt(totalRetailValue)}</td><td className="mono">{lowStockItems.length}</td></tr>
          </tbody></table></div>
        </div>
      </div>}

      {tab==="trial-balance" && <div>
        <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom:20 }}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Debits</div><div className="kpi-val">{fmt(totalDebits)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Credits</div><div className="kpi-val">{fmt(totalCredits)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Difference</div><div className="kpi-val" style={{color:Math.abs(totalDebits-totalCredits)<0.01?"var(--green)":"var(--red)"}}>{fmt(totalDebits-totalCredits)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Status</div><div className="kpi-val" style={{fontSize:14,color:Math.abs(totalDebits-totalCredits)<0.01?"var(--green)":"var(--red)"}}>{Math.abs(totalDebits-totalCredits)<0.01?"✓ Balanced":"⚠️ Unbalanced"}</div></div>
        </div>
        <div className="card">
          <div className="ch">
            <div><div className="ct">Trial Balance</div><div className="cs">{accounts.length} accounts · as of {fmtDate(new Date().toISOString().slice(0,10))}</div></div>
            <button className="btn bo bsm" onClick={() => downloadCsv("trial-balance.csv", ["Code","Account","Type","Debit","Credit"], trialRows.map(a=>[a.code||"",a.name,a.type,a.debit.toFixed(2),a.credit.toFixed(2)]))}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Code</th><th>Account</th><th>Type</th><th style={{textAlign:"right"}}>Debit</th><th style={{textAlign:"right"}}>Credit</th></tr></thead><tbody>{trialRows.map(a => <tr key={a.id}><td className="mono" style={{fontSize:11,color:"var(--text3)"}}>{a.code||"—"}</td><td style={{fontWeight:600}}>{a.name}</td><td><span className="tag" style={{fontSize:10}}>{a.type}</span></td><td className="mono" style={{textAlign:"right"}}>{a.debit>0?fmt(a.debit):"—"}</td><td className="mono" style={{textAlign:"right"}}>{a.credit>0?fmt(a.credit):"—"}</td></tr>)}
          <tr style={{background:"#f8fafc",fontWeight:700}}><td colSpan={3}>TOTAL</td><td className="mono" style={{textAlign:"right"}}>{fmt(totalDebits)}</td><td className="mono" style={{textAlign:"right"}}>{fmt(totalCredits)}</td></tr>
          </tbody></table></div>
        </div>
      </div>}

      {tab==="vat-summary" && <div>
        <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom:20 }}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Output VAT (Sales)</div><div className="kpi-val tg">{fmt(outputVAT)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Input VAT (Purchases)</div><div className="kpi-val" style={{color:"var(--red)"}}>{fmt(inputVAT)}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Net VAT</div><div className="kpi-val" style={{color:netVAT>=0?"var(--red)":"var(--green)"}}>{fmt(Math.abs(netVAT))}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Status</div><div className="kpi-val" style={{fontSize:13}}>{netVAT>=0?"Owed to HMRC":"Reclaimable"}</div></div>
        </div>
        <div className="card" style={{marginBottom:20}}>
          <div className="ch">
            <div><div className="ct">VAT Liability Summary</div><div className="cs">{periodLabels[period]} · output VAT minus input VAT</div></div>
            <button className="btn bo bsm" onClick={() => downloadCsv("vat-summary.csv", ["Box","Description","Amount"], [["1","VAT due on sales (Output VAT)",outputVAT.toFixed(2)],["4","VAT reclaimed on purchases (Input VAT)",inputVAT.toFixed(2)],["5","Net VAT due / (reclaimable)",netVAT.toFixed(2)]])}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Box</th><th>Description</th><th style={{textAlign:"right"}}>Amount</th></tr></thead><tbody>
            <tr><td className="mono">1</td><td style={{fontWeight:600}}>VAT due on sales (Output VAT)</td><td className="mono tg" style={{textAlign:"right",fontWeight:700}}>{fmt(outputVAT)}</td></tr>
            <tr><td className="mono">4</td><td style={{fontWeight:600}}>VAT reclaimed on purchases (Input VAT)</td><td className="mono" style={{textAlign:"right",fontWeight:700,color:"var(--red)"}}>({fmt(inputVAT)})</td></tr>
            <tr style={{background:"#f8fafc",fontWeight:700}}><td className="mono">5</td><td>Net VAT due / (reclaimable)</td><td className="mono" style={{textAlign:"right",color:netVAT>=0?"var(--red)":"var(--green)"}}>{fmt(Math.abs(netVAT))} {netVAT>=0?"due":"reclaimable"}</td></tr>
          </tbody></table></div>
        </div>
        <div className="card">
          <div className="ch"><div className="ct">Output VAT by Rate</div><div className="cs">Breakdown of sales VAT by rate band — {periodLabels[period]}</div></div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Rate</th><th>Net Sales</th><th style={{textAlign:"right"}}>VAT</th></tr></thead><tbody>{outputVATByRate.map(r => <tr key={r.rate}><td style={{fontWeight:600}}>{r.rate===0?"Exempt / 0%":r.rate+"%"}</td><td className="mono">{fmt(r.net)}</td><td className="mono" style={{textAlign:"right",fontWeight:600}}>{fmt(r.vat)}</td></tr>)}</tbody></table></div>
        </div>
      </div>}

      {tab==="vat-exceptions" && <div>
        <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom:20 }}>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Exceptions Found</div><div className="kpi-val" style={{color:vatExceptions.length>0?"var(--red)":"var(--green)"}}>{vatExceptions.length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">From Invoices</div><div className="kpi-val">{vatExceptions.filter(e=>e.source==="Invoice").length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">From Purchases</div><div className="kpi-val">{vatExceptions.filter(e=>e.source==="Purchase").length}</div></div>
          <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Amount at Stake</div><div className="kpi-val" style={{color:"var(--red)"}}>{fmt(vatExceptions.reduce((s,e)=>s+e.amount,0))}</div></div>
        </div>
        <div className="card">
          <div className="ch">
            <div><div className="ct">VAT Exceptions</div><div className="cs">Lines where the VAT rate charged doesn't match the product's current catalog VAT rate, or is an invalid rate</div></div>
            {vatExceptions.length>0 && <button className="btn bo bsm" onClick={() => downloadCsv("vat-exceptions.csv", ["Source","Document","Party","Date","Product","Line VAT %","Catalog VAT %","Amount"], vatExceptions.map(e=>[e.source,e.doc,e.party,e.date||"",e.product,e.lineRate,e.catalogRate??"n/a",e.amount.toFixed(2)]))}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>}
          </div>
          {vatExceptions.length===0 ? <div className="empty" style={{padding:"32px 16px"}}>✓ No VAT exceptions found — all line items match their product's catalog VAT rate.</div> : (
            <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>Source</th><th>Document</th><th>Party</th><th>Date</th><th>Product</th><th style={{textAlign:"right"}}>Line VAT %</th><th style={{textAlign:"right"}}>Catalog VAT %</th><th style={{textAlign:"right"}}>Amount</th></tr></thead><tbody>{vatExceptions.map((e,i) => <tr key={i}><td><span className={"badge "+(e.source==="Invoice"?"b-blue":"b-amber")} style={{fontSize:10}}>{e.source}</span></td><td className="mono" style={{fontSize:12,color:"var(--blue)"}}>{e.doc}</td><td style={{fontWeight:500}}>{e.party}</td><td style={{fontSize:12,color:"var(--text3)"}}>{fmtDate(e.date)}</td><td>{e.product}</td><td className="mono" style={{textAlign:"right",fontWeight:700,color:"var(--red)"}}>{e.lineRate}%</td><td className="mono" style={{textAlign:"right"}}>{e.catalogRate??"—"}{e.catalogRate!=null?"%":""}</td><td className="mono" style={{textAlign:"right"}}>{fmt(e.amount)}</td></tr>)}</tbody></table></div>
          )}
        </div>
      </div>}

      {tab==="physical-count" && <div className="card" style={{padding:24}}>
        <div className="ct" style={{marginBottom:6}}>Physical Inventory Worksheet</div>
        <div style={{fontSize:12,color:"var(--text3)",marginBottom:20}}>Printable stock-count sheet — system quantity listed, blank columns for counted qty and variance. Hand to staff for manual stocktakes.</div>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:18}}>
          <select value={pcCategory} onChange={e=>setPcCategory(e.target.value)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",fontSize:13,fontFamily:"var(--sans)"}}>
            <option value="all">All categories ({products.length} products)</option>
            {categories.map(c => <option key={c} value={c}>{c} ({products.filter(p=>(p.category||"General")===c).length})</option>)}
          </select>
          <button className="btn bp" onClick={printPhysicalCount}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Worksheet ({pcProducts.length} items)
          </button>
        </div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch",border:"1px solid var(--border)",borderRadius:"var(--r)"}}><table style={{minWidth:420}}><thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>System Qty</th></tr></thead><tbody>{pcProducts.slice(0,30).map(p => <tr key={p.id}><td className="mono" style={{fontSize:11,color:"var(--text3)"}}>{p.code||"—"}</td><td style={{fontWeight:500}}>{p.name}</td><td><span className="tag" style={{fontSize:10}}>{p.category||"General"}</span></td><td className="mono">{p.stock_qty||0} {p.unit}</td></tr>)}</tbody></table>{pcProducts.length>30 && <div style={{padding:"10px 16px",fontSize:12,color:"var(--text3)"}}>+{pcProducts.length-30} more — full list included in print</div>}</div>
      </div>}

      {tab==="budget" && (() => {
        const rows = monthlySales.map(m => {
          const b = budgets.find(x=>x.period===m.periodKey);
          const target = b?.revenue_target ?? null;
          const variance = target!=null ? m.total - target : null;
          const variancePct = target>0 ? (variance/target*100) : null;
          return { ...m, target, variance, variancePct };
        });
        const monthsWithTarget = rows.filter(r=>r.target!=null);
        const totalTarget = monthsWithTarget.reduce((s,r)=>s+r.target,0);
        const totalActual = monthsWithTarget.reduce((s,r)=>s+r.total,0);
        return (
          <div>
            <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom:20 }}>
              <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Months Budgeted</div><div className="kpi-val">{monthsWithTarget.length} / 12</div></div>
              <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Target</div><div className="kpi-val">{fmt(totalTarget)}</div></div>
              <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Total Actual</div><div className="kpi-val tg">{fmt(totalActual)}</div></div>
              <div className="kpi" style={{marginBottom:0}}><div className="kpi-label">Variance</div><div className="kpi-val" style={{color:totalActual-totalTarget>=0?"var(--green)":"var(--red)"}}>{fmt(totalActual-totalTarget)}</div></div>
            </div>
            <div className="card">
              <div className="ch"><div><div className="ct">Sales Budget vs Actuals</div><div className="cs">Set a monthly revenue target and track actual sales against it</div></div></div>
              <div style={{padding:"0 16px 8px",fontSize:11,color:"var(--text3)"}}>Scoped to revenue only — expense budgeting needs dated expense transactions, which LedgerOS doesn't track yet (expenses are a running balance, not per-month).</div>
              <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:480}}><thead><tr><th>Month</th><th style={{textAlign:"right"}}>Target</th><th style={{textAlign:"right"}}>Actual</th><th style={{textAlign:"right"}}>Variance</th><th style={{textAlign:"right"}}>Variance %</th><th></th></tr></thead><tbody>{rows.map(r => (
                <tr key={r.periodKey}>
                  <td style={{fontWeight:600}}>{r.month}</td>
                  <td style={{textAlign:"right"}}>
                    <input type="number" placeholder="Set target" value={budgetEdits[r.periodKey] ?? r.target ?? ""} onChange={e=>setBudgetEdits(prev=>({...prev,[r.periodKey]:e.target.value}))} style={{width:100,padding:"5px 8px",borderRadius:6,border:"1px solid var(--border)",fontSize:12,textAlign:"right",fontFamily:"var(--mono)"}} />
                  </td>
                  <td className="mono" style={{textAlign:"right",fontWeight:600}}>{fmt(r.total)}</td>
                  <td className="mono" style={{textAlign:"right",color:r.variance==null?"var(--text3)":r.variance>=0?"var(--green)":"var(--red)"}}>{r.variance==null?"—":fmt(r.variance)}</td>
                  <td className="mono" style={{textAlign:"right",color:r.variancePct==null?"var(--text3)":r.variancePct>=0?"var(--green)":"var(--red)"}}>{r.variancePct==null?"—":r.variancePct.toFixed(1)+"%"}</td>
                  <td>{budgetEdits[r.periodKey]!=null && <button className="btn bp bsm" onClick={()=>saveBudget(r.periodKey)}>Save</button>}</td>
                </tr>
              ))}</tbody></table></div>
            </div>
          </div>
        );
      })()}

      {tab==="custom" && <CustomReportBuilder invoices={invoices} products={products} contacts={contacts} allProfiles={allProfiles} purchaseOrders={pos} purchaseOrderLines={poLines} token={token} userId={userId} profile={profile} />}
    </div>
  );
}

