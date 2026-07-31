import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { sb } from "../lib/supabase.js";
import { fmt, fmtDate, isMobile } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { postPaymentJournal } from "../lib/journal.js";
import { toast, COMPANY } from "../lib/constants.js";
import { sendEmail, buildReceiptEmailHtml } from "../lib/email.js";
import { EmptyState } from "../components/ui.jsx";
import { InvoiceModal } from "../components/InvoiceModal.jsx";

// ┌────────────────────────────────────────────────────────────┐
// │ AgentDashboard                                             │
// │ Dashboard view for agent role users                        │
// └────────────────────────────────────────────────────────────┘
export function AgentDashboard({ invoices, setInvoices, contacts, setContacts, profile, setPage, token, userId, accounts = [] }) {
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
    if (inv) {
      logAudit(token, userId, "payment_received", "invoice", id, `${inv.invoice_number} marked paid via ${method||"cash"} — £${inv.amount}`);
      postPaymentJournal(token, accounts, { invoice_id: id, invoice_number: inv.invoice_number, amount: parseFloat(inv.amount) - parseFloat(inv.amount_paid||0), date: new Date().toISOString().slice(0,10) });
      const cust = contacts.find(c => c.name === inv.customer);
      if (cust?.email) sendEmail({ to: cust.email, subject: `Payment Received — ${inv.invoice_number} — ${COMPANY.name}`, html: buildReceiptEmailHtml(inv, inv.amount, method || "cash", 0), token }).catch(()=>{});
    }
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
    postPaymentJournal(token, accounts, { invoice_id: inv.id, invoice_number: inv.invoice_number, amount: paid, date: resolvedDate });
    const custForReceipt = contacts.find(c => c.name === inv.customer);
    if (custForReceipt?.email) sendEmail({ to: custForReceipt.email, subject: `Payment Received — ${inv.invoice_number} — ${COMPANY.name}`, html: buildReceiptEmailHtml(inv, paid, resolvedMethod, newBalance), token }).catch(()=>{});
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
          <div style={{ background:"#201e1d", borderRadius:"var(--rl)", padding:"20px 18px", color:"#fff" }}>
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
              {recentInvoices.length===0 && <EmptyState icon="invoice" title="No invoices yet" sub="Create your first invoice to get started" action={() => setPage("invoices")} actionLabel="Go to Invoices" />}
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
                      <option value="cash">💵 Cash</option><option value="bank">🏦 Bank</option><option value="card">💳 Card</option>
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
          {filteredMyInv.length === 0 && <tr><td colSpan={5}>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <rect x="10" y="16" width="44" height="36" rx="6" fill="var(--blue-lt)" stroke="#c7d2fe" strokeWidth="1.5"/>
                  <path d="M10 24 L32 38 L54 24" stroke="#a5b4fc" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="48" cy="14" r="7" fill="#818cf8"/>
                  <path d="M45 14h6M48 11v6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="empty-state-title">{agentSearch ? "No invoices found" : "No invoices yet"}</div>
              <div className="empty-state-sub">{agentSearch ? `Nothing matches "${agentSearch}" — try a different search.` : "Create your first invoice to get started."}</div>
            </div>
          </td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
