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
      { label:"Invoices Today", val:String(todayCount), accent:"#0891b2", onClick:()=>{setPendingFilter("all");setPage("invoices");} },
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

      <style>{"@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap');"}</style>
      {/* ── Modernist masthead — ink banner with embedded KPIs ── */}
      <div className="page-hero" style={{ margin: "-26px -28px 24px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        {/* top row: greeting + quick actions */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: ".04em", color: "#e15b47", marginBottom: 8, fontFamily: "'Archivo',system-ui,sans-serif" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dd2b0f" }} />Arkham Retail Ltd</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-.02em", marginBottom: 4, fontFamily: "'Archivo',system-ui,sans-serif" }}>{greeting}, {name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 8 }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              Arkham Retail Ltd
              <span style={{ background: "rgba(22,163,74,.2)", color: "#86efac", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>● Live</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <button onClick={() => setPage("invoices")} className="bfrost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 0, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "rgba(248,247,245,.9)", fontSize: 12, fontWeight: 800, fontFamily: "'Archivo',system-ui,sans-serif", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Invoice
            </button>
            <button onClick={() => setPage("contacts")} className="bfrost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 0, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "rgba(248,247,245,.9)", fontSize: 12, fontWeight: 800, fontFamily: "'Archivo',system-ui,sans-serif", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>Add Customer
            </button>
            <button onClick={() => setPage("delivery-notes")} className="bfrost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 0, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "rgba(248,247,245,.9)", fontSize: 12, fontWeight: 800, fontFamily: "'Archivo',system-ui,sans-serif", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Delivery
            </button>
            <button onClick={() => setPage("analytics")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 0, border: "1px solid #dd2b0f", background: "#dd2b0f", color: "#fff", fontSize: 12, fontWeight: 800, fontFamily: "'Archivo',system-ui,sans-serif", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Analytics
            </button>
          </div>
        </div>
        {/* KPI strip embedded in banner */}
        {(() => {
          const sparkMonths = Array.from({length:6},(_,i)=>{
            const d = new Date(new Date().getFullYear(), new Date().getMonth()-5+i, 1);
            const monthInv = invoices.filter(inv=>{ const id = new Date(inv.invoice_date||inv.created_at); return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear(); });
            const revenue = monthInv.filter(i=>i.status!=="draft").reduce((s,i)=>s+parseFloat(i.amount||0),0);
            const collected = monthInv.reduce((s,i)=>s+parseFloat(i.amount_paid||0),0);
            const outstanding = monthInv.filter(i=>i.status!=="paid"&&i.status!=="draft").reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0);
            const cash = monthInv.filter(i=>i.status==="paid"&&i.payment_method==="cash").reduce((s,i)=>s+parseFloat(i.amount_paid||0),0);
            return { revenue, collected, outstanding, cash };
          });
          const Spark = ({ dataKey, color }) => {
            const vals = sparkMonths.map(m => m[dataKey] || 0);
            const max = Math.max(...vals, 1), min = Math.min(...vals, 0), n = vals.length, slot = 150 / n, bw = slot * 0.58;
            const y = v => 30 - 2 - ((v - min) / ((max - min) || 1)) * (30 - 4);
            return (
              <svg width="100%" height={30} viewBox="0 0 150 30" preserveAspectRatio="none" style={{ display: "block", marginTop: 8 }}>
                {vals.map((v, i) => { const yy = y(v); return <rect key={i} x={i * slot + (slot - bw) / 2} y={yy} width={bw} height={30 - yy} fill={color} />; })}
              </svg>
            );
          };
          return (
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)", position: "relative", zIndex: 1 }}>
          {[
            { label: "Total Revenue", val: fmt(invoices.filter(i=>i.status!=="draft").reduce((s,i)=>s+parseFloat(i.amount||0),0)), delta: revTrend !== null ? `${revTrend >= 0 ? "+" : ""}${revTrend}% vs last month` : `${invoices.filter(i=>i.status!=="draft").length} invoices`, deltaColor: revTrend !== null && revTrend >= 0 ? "#86efac" : "#fca5a5", onClick: () => { setPendingFilter("all"); setPage("invoices"); }, accent: "rgba(248,247,245,.5)", sparkKey: "revenue" },
            { label: "Outstanding", val: fmt(unpaid), delta: `${overdueCount} overdue · ${pendingCount} pending`, deltaColor: overdueCount > 0 ? "#fca5a5" : "rgba(255,255,255,.35)", onClick: () => { setPendingFilter("overdue"); setPage("invoices"); }, accent: "#ff6a4d", sparkKey: "outstanding" },
            { label: "Collected", val: fmt(paid), delta: (() => { const tot = invoices.filter(i=>i.status!=="draft").reduce((s,i)=>s+parseFloat(i.amount||0),0); return tot > 0 ? `${Math.round(paid/tot*100)}% collection rate` : "0% collection rate"; })(), deltaColor: "rgba(255,255,255,.35)", onClick: () => { setPendingFilter("paid"); setPage("invoices"); }, accent: "#7fd39b", sparkKey: "collected" },
            { label: "Cash Collected", val: fmt(cashCollected), delta: `${invoices.filter(i=>i.status==="paid"&&i.payment_method==="cash").length} cash payments`, deltaColor: "rgba(255,255,255,.35)", onClick: () => { setPendingFilter("paid"); setPage("invoices"); }, accent: "#7fd39b", sparkKey: "cash" },
          ].map((k, i) => (
            <div key={i} onClick={k.onClick} style={{ padding: "14px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", cursor: "pointer", transition: "all .15s", borderTop: "3px solid transparent" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop="3px solid #dd2b0f"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderTop="3px solid transparent"; }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 5 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", letterSpacing: "-.5px", marginBottom: 3 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: k.deltaColor, marginBottom: 6 }}>{k.delta}</div>
              <Spark dataKey={k.sparkKey} color={k.accent}/>
            </div>
          ))}
        </div>
          );
        })()}
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
          const pd = new Date(new Date().getFullYear(), new Date().getMonth()-11+i, 1);
          const pPaid = invoices.filter(inv=>{
            const id = new Date(inv.invoice_date||inv.created_at);
            return id.getMonth()===pd.getMonth()&&id.getFullYear()===pd.getFullYear();
          }).reduce((s,i)=>s+parseFloat(i.amount_paid||0),0);
          return {lbl, Collected: Math.round(mPaid*100)/100, Pending: Math.round(mPending*100)/100, PrevCollected: Math.round(pPaid*100)/100};
        });
        const totalPaid6 = months.reduce((s,m)=>s+m.Collected,0);
        const totalPend6 = months.reduce((s,m)=>s+m.Pending,0);
        const totalPrevPaid6 = months.reduce((s,m)=>s+m.PrevCollected,0);
        const pctChange = totalPrevPaid6>0 ? Math.round(((totalPaid6-totalPrevPaid6)/totalPrevPaid6)*1000)/10 : null;
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
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
                  <div style={{width:10,height:2,background:"var(--text3)",borderTop:"2px dashed var(--text3)"}}/>Prev. period
                </div>
                {pctChange!==null && (
                  <div className={"badge "+(pctChange>=0?"b-green":"b-red")} style={{fontWeight:700}}>
                    <i className={"ti "+(pctChange>=0?"ti-trending-up":"ti-trending-down")} style={{fontSize:12}}/>
                    {pctChange>=0?"+":""}{pctChange}%
                  </div>
                )}
                <button className="btn bo bsm" onClick={()=>setPage("admin-reports")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>Reports</button>
              </div>
            </div>
            <div style={{padding:"4px 24px 20px"}}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={months} margin={{top:10,right:10,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="strokeCollected" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#4338ca"/>
                      <stop offset="100%" stopColor="#a5b4fc"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="lbl" tick={{fontSize:11,fill:"var(--text3)"}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>v===0?"£0":"£"+Math.round(v/1000)+"k"} tick={{fontSize:10,fill:"var(--text3)"}} axisLine={false} tickLine={false} width={40}/>
                  <Tooltip content={ChartTooltip}/>
                  <Area type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gradPending)" strokeOpacity={0.7} dot={false} activeDot={{r:5,strokeWidth:2,stroke:"#fff",fill:"#f59e0b"}} animationDuration={900} animationEasing="ease-out"/>
                  <Area type="monotone" dataKey="Collected" stroke="url(#strokeCollected)" strokeWidth={2.5} fill="url(#gradCollected)" dot={false} activeDot={{r:6,strokeWidth:2,stroke:"#fff",fill:"#4338ca"}} animationDuration={1100} animationEasing="ease-out"/>
                  <Area type="monotone" dataKey="PrevCollected" stroke="var(--text3)" strokeWidth={1.5} strokeDasharray="4 4" fill="none" fillOpacity={0} dot={false} activeDot={{r:4,strokeWidth:2,stroke:"#fff",fill:"var(--text3)"}} animationDuration={1100} animationEasing="ease-out"/>
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

      {/* ── Monthly Comparison Widget (sales by product) ── */}
      {(() => {
        const PROD_COLORS = ["#818cf8","#38bdf8","#34d399","#f59e0b","#94a3b8"];
        const months = Array.from({length:6},(_,i)=>new Date(new Date().getFullYear(), new Date().getMonth()-5+i, 1));
        const monthRows = months.map(d=>({ lbl: d.toLocaleDateString("en-GB",{month:"short"}), m: d.getMonth(), y: d.getFullYear(), products: {} }));

        invoices.forEach(inv=>{
          if (inv.status === "draft") return;
          const id = new Date(inv.invoice_date||inv.created_at);
          const row = monthRows.find(r=>r.m===id.getMonth()&&r.y===id.getFullYear());
          if (!row) return;
          let lines = inv.lines;
          if (typeof lines === "string") { try { lines = JSON.parse(lines); } catch { lines = []; } }
          if (!Array.isArray(lines)) return;
          lines.forEach(l=>{
            const name = (l.description||"Other").replace(" ⚠️ UNMATCHED","");
            const val = (parseFloat(l.qty)||0) * (parseFloat(l.unit_price)||0);
            row.products[name] = (row.products[name]||0) + val;
          });
        });

        // Find top products across all 6 months by total value
        const totals = {};
        monthRows.forEach(r=>Object.entries(r.products).forEach(([k,v])=>{ totals[k]=(totals[k]||0)+v; }));
        const topProducts = Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k])=>k);

        const data = monthRows.map(r=>{
          const row = { lbl: r.lbl };
          let other = 0;
          Object.entries(r.products).forEach(([k,v])=>{
            if (topProducts.includes(k)) row[k] = Math.round(v*100)/100;
            else other += v;
          });
          topProducts.forEach(p=>{ if (row[p]===undefined) row[p]=0; });
          row["Other"] = Math.round(other*100)/100;
          row._total = Math.round((topProducts.reduce((s,p)=>s+row[p],0) + row["Other"])*100)/100;
          return row;
        });

        const seriesKeys = [...topProducts, "Other"];

        const ProductTooltip = ({ active, payload, label }) => {
          if (!active || !payload || !payload.length) return null;
          const total = payload.reduce((s,p)=>s+(p.value||0),0);
          return (
            <div style={{background:"#0d1829",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,padding:"10px 14px",fontSize:12}}>
              <div style={{color:"rgba(255,255,255,.5)",marginBottom:6,fontWeight:600}}>{label}</div>
              {payload.filter(p=>p.value>0).map(p=>(
                <div key={p.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <div style={{width:8,height:8,borderRadius:2,background:p.color}}/>
                  <span style={{color:"rgba(255,255,255,.7)"}}>{p.name}:</span>
                  <span style={{color:"#fff",fontWeight:700}}>£{(p.value||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
              ))}
              <div style={{marginTop:4,paddingTop:4,borderTop:"1px solid rgba(255,255,255,.1)",color:"#fff",fontWeight:700}}>
                Total: £{total.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}
              </div>
            </div>
          );
        };

        return (
          <div className="card" style={{marginBottom:18}}>
            <div className="ch">
              <div>
                <div className="ct">Monthly Comparison</div>
                <div className="cs">Sales per month, broken down by product</div>
              </div>
              <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                {seriesKeys.map((k,i)=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
                    <div style={{width:10,height:10,borderRadius:2,background:PROD_COLORS[i]}}/>{k}
                  </div>
                ))}
              </div>
            </div>
            <div style={{padding:"4px 24px 20px"}}>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={data} margin={{top:24,right:10,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="lbl" tick={{fontSize:11,fill:"var(--text3)"}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>v===0?"£0":"£"+Math.round(v/1000)+"k"} tick={{fontSize:10,fill:"var(--text3)"}} axisLine={false} tickLine={false} width={40}/>
                  <Tooltip content={ProductTooltip}/>
                  {seriesKeys.map((k,i)=>(
                    <Bar key={k} dataKey={k} stackId="rev" fill={PROD_COLORS[i]} radius={i===seriesKeys.length-1?[4,4,0,0]:[0,0,0,0]}>
                      {i===seriesKeys.length-1 && <LabelList dataKey="_total" position="top" formatter={(v)=>v?`£${Math.round(v/1000)}k`:""} style={{fontSize:11,fontWeight:700,fill:"var(--text2)"}}/>}
                    </Bar>
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
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
            {(() => {
              const segs = [
                { label: "Collected", val: paid, color: "#16a34a", onClick: drillPaid },
                { label: "Pending", val: unpaid - overdue, color: "#f59e0b", onClick: drillOutstanding },
                { label: "Overdue", val: overdue, color: "#dc2626", onClick: drillOutstanding },
              ].filter(s => s.val > 0);
              const total = segs.reduce((s,x)=>s+x.val,0);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 120, height: 120, flexShrink: 0, position: "relative" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={segs} dataKey="val" nameKey="label" innerRadius={38} outerRadius={58} paddingAngle={2} stroke="none">
                          {segs.map((s,i) => <Cell key={i} fill={s.color} style={{ cursor: "pointer" }} onClick={s.onClick} />)}
                        </Pie>
                        <Tooltip formatter={(v)=>fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", width: 68 }}>
                      <div style={{ fontSize: 8, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Total</div>
                      <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--mono)", lineHeight: 1.15, whiteSpace: "nowrap" }}>{fmt(total)}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {segs.map(r => (
                      <div key={r.label} onClick={r.onClick} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                        <span style={{ fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }}/>{r.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: r.color, whiteSpace: "nowrap", flexShrink: 0 }}>{fmt(r.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
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
      onEdit={(inv) => { setEditInvoice(inv); setViewInvoice(null); }}
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
    {editInvoice && <EditInvoiceModal invoice={editInvoice} onClose={() => setEditInvoice(null)} contacts={contacts} products={products} token={token} userId={userId}
      onSaved={(updatedFields) => {
        if (updatedFields) setInvoices(prev => prev.map(i => i.id === editInvoice.id ? { ...i, ...updatedFields } : i));
        sb.get(token, "invoices", "order=created_at.desc&limit=1000").then(d => Array.isArray(d) && setInvoices(d));
        setEditInvoice(null);
      }} />}
  </>);
}

