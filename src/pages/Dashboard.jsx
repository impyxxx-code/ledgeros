import React, { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, FileText, Landmark, Package, ShoppingBag, Sun, TrendingUp, Users } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ComposedChart, Bar, LabelList, PieChart, Pie, Cell } from "recharts";
import { sb } from "../lib/supabase.js";
import { fmt, fmtDate, isMobile, DEFAULT_REORDER } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { ModalPortal, EmptyState } from "../components/ui.jsx";
import { InvoiceModal } from "../components/InvoiceModal.jsx";
import { OverpaymentModal } from "../components/OverpaymentModal.jsx";
import { EditInvoiceModal } from "./invoices/EditInvoiceModal.jsx";
import { AgentDashboard } from "./AgentDashboard.jsx";
import { DashboardHome } from "./DashboardHome.jsx";

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Dashboard                                                  │
// │ Admin dashboard with KPIs, charts and AI insights          │
// └────────────────────────────────────────────────────────────┘
export function Dashboard({ accounts, invoices, setInvoices, contacts, setContacts, products, profile, setPage, setPendingFilter, allProfiles, token, userId }) {
  const isAdmin = profile?.role === "admin";
  if (!isAdmin) return <AgentDashboard invoices={invoices} setInvoices={setInvoices} contacts={contacts} setContacts={setContacts} profile={profile} setPage={setPage} token={token} userId={userId} accounts={accounts} />;

  const [viewInvoice, setViewInvoice] = useState(null);
  const [overpaymentData, setOverpaymentData] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);

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
    overdueCount > 0 && { Icon: AlertCircle, color: "var(--red)", bg: "var(--red-lt)", text: `${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} totalling ${fmt(overdue)} — chase now`, cta: "Chase", action: drillOutstanding },
    lowStock.length > 0 && { Icon: Package, color: "var(--amber)", bg: "var(--amber-lt)", text: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} running low on stock — reorder soon`, cta: "Reorder", action: drillLowStock },
    pendingCount > 0 && { Icon: Clock, color: "var(--blue)", bg: "var(--blue-lt)", text: `${pendingCount} pending invoice${pendingCount > 1 ? "s" : ""} worth ${fmt(unpaid - overdue)} awaiting payment`, cta: "Review", action: drillOutstanding },
    paidCount > 0 && { Icon: TrendingUp, color: "var(--green)", bg: "var(--green-lt)", text: `Average invoice value is ${fmt(avgInvoice)} — top performer this period`, cta: "View", action: drillOutstanding },
  ].filter(Boolean).slice(0, 3);

  if (isMobile()) {
    const totalRevenue = invoices.filter(i=>i.status!=="draft").reduce((s,i)=>s+parseFloat(i.amount||0),0);
    const recentInvoices = [...invoices].sort((a,b)=>new Date(b.created_at||b.invoice_date)-new Date(a.created_at||a.invoice_date)).slice(0,5);
    const kpiTiles = [
      { label:"Total Revenue", val:fmt(totalRevenue), accent:"#dd2b0f", onClick:()=>{setPendingFilter("all");setPage("invoices");} },
      { label:"Outstanding", val:fmt(unpaid), accent:"#ef4444", onClick:()=>{setPendingFilter("overdue");setPage("invoices");} },
      { label:"Collected", val:fmt(paid), accent:"#22c55e", onClick:()=>{setPendingFilter("paid");setPage("invoices");} },
      { label:"Pending", val:String(pendingCount), accent:"#f59e0b", onClick:()=>{setPendingFilter("pending");setPage("invoices");} },
      { label:"Today", val:fmt(todayRevenue), accent:"#57534e", onClick:()=>{setPendingFilter("all");setPage("invoices");} },
      { label:"Invoices Today", val:String(todayCount), accent:"#201e1d", onClick:()=>{setPendingFilter("all");setPage("invoices");} },
    ];
    return (
      <>
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} contacts={contacts} token={token} profile={profile}
        onEdit={(inv) => { setEditInvoice(inv); setViewInvoice(null); }}
        onStatusChange={async (id, status) => { await sb.patch(token, "invoices", id, { status }); setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i)); setViewInvoice(prev => prev?.id === id ? { ...prev, status } : prev); }}
        onLogPartPay={(inv, amt, method, newBal) => logAudit(token, userId, "part_payment", "invoice", inv.id, `${inv.invoice_number} — £${amt.toFixed(2)} received via ${method}. Remaining: £${newBal.toFixed(2)}`)} />}
      {editInvoice && <EditInvoiceModal invoice={editInvoice} onClose={() => setEditInvoice(null)} contacts={contacts} products={products} token={token} userId={userId}
        onSaved={(updatedFields) => {
          if (updatedFields) setInvoices(prev => prev.map(i => i.id === editInvoice.id ? { ...i, ...updatedFields } : i));
          sb.get(token, "invoices", "order=created_at.desc&limit=1000").then(d => Array.isArray(d) && setInvoices(d));
          setEditInvoice(null);
        }} />}
      <div style={{ display:"flex", flexDirection:"column", gap:18, paddingBottom:8 }}>
        <div style={{ background:"#201e1d", borderRadius:"var(--rl)", padding:"20px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.4px", textTransform:"uppercase", color:"#e15b47", marginBottom:6 }}>{greeting}, {name}</div>
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

        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
          {kpiTiles.map(k => (
            <div key={k.label} role="button" tabIndex={0} onClick={k.onClick} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")k.onClick();}}
              style={{ background:"var(--white)", border:"1px solid var(--border)", borderRadius:"var(--rl)", padding:"14px 16px", boxShadow:"var(--sh)", cursor:"pointer", borderTop:`3px solid ${k.accent}` }}>
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
            {recentInvoices.length===0 && <EmptyState icon="invoice" title="No invoices yet" sub="Create your first invoice to get started" action={() => setPage("invoices")} actionLabel="Go to Invoices" />}
          </div>
        </div>
      </div>
      </>
    );
  }

  return <DashboardHome accounts={accounts} invoices={invoices} setInvoices={setInvoices} contacts={contacts} products={products} profile={profile} setPage={setPage} setPendingFilter={setPendingFilter} token={token} userId={userId} />;
}
