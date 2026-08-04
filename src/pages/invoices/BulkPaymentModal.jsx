import React, { useState, useEffect, useRef } from "react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/supabase.js";
import { fmt, fmtDate, fmtShort, fmtTime, fmtRelative, dueDelta, today, isMobile, escHtml, DEFAULT_REORDER } from "../../lib/utils.js";
import { sendEmail, buildInvoiceEmailHtml, buildReminderEmailHtml, buildDNEmailHtml, buildBulkReceiptEmailHtml } from "../../lib/email.js";
import { logAudit } from "../../lib/audit.js";
import { postPaymentJournal } from "../../lib/journal.js";
import { ModalPortal, SkeletonTable, EmptyState } from "../../components/ui.jsx";
import { SearchDropdown } from "../../components/SearchDropdown.jsx";
import { COMPANY, LOGO, JSPDF_URL, toast } from "../../lib/constants.js";

// ── BULK PAYMENT MODAL ────────────────────────────────────────────────────────
export function BulkPaymentModal({ customer: initialCustomer, invoices, contacts = [], accounts = [], token, userId, profile, onClose, onComplete }) {
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
    const succeeded = [];   // full-shape allocs whose invoice actually persisted
    const failed = [];      // invoice numbers whose update did NOT persist

    for (const alloc of preview.allocs) {
      const { inv, apply, newBalance, newStatus } = alloc;
      // Only treat a row as paid if the invoice update actually persisted — a
      // partial network/RLS failure must not report every row as paid.
      let ok = false;
      try {
        const res = await sb.patch(token, "invoices", inv.id, {
          amount_paid: (parseFloat(inv.amount) - newBalance),
          balance: newBalance,
          status: newStatus,
          payment_method: method
        });
        ok = Array.isArray(res) && res.length > 0;
      } catch { ok = false; }
      if (!ok) { failed.push(inv.invoice_number); continue; }

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
      succeeded.push(alloc);
    }

    // Bank the surplus as credit only on a clean run — on a partial failure the
    // "surplus" is unreliable (money was meant for a row that didn't persist).
    if (failed.length === 0 && preview.leftover > 0) {
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
      `Bulk payment of £${parseFloat(amount).toFixed(2)} via ${method} for ${customer} dated ${payDate} — ${succeeded.length} invoice(s) updated${failed.length ? `, ${failed.length} failed (${failed.join(", ")})` : ""}`
    );

    const summary = succeeded.map(a => ({ invoice_number: a.inv.invoice_number, apply: a.apply, newStatus: a.newStatus }));
    const appliedTotal = summary.reduce((s,a)=>s+a.apply,0);
    if (appliedTotal > 0) postPaymentJournal(token, accounts, { invoice_id: null, invoice_number: `Bulk — ${customer}`, amount: appliedTotal, date: payDate });
    const custForReceipt = contacts.find(c => c.name === customer);
    // Only email a receipt when the whole batch applied, so we never confirm money we didn't record.
    if (failed.length === 0 && custForReceipt?.email) sendEmail({ to: custForReceipt.email, subject: `Payment Received — ${customer}`, html: buildBulkReceiptEmailHtml(customer, parseFloat(amount), method, summary, preview.leftover), token }).catch(()=>{});

    setSaving(false);
    if (failed.length) toast.warn(`${succeeded.length} invoice(s) paid, ${failed.length} failed (${failed.join(", ")}). Please retry the failed one(s).`);
    setSavedSummary({ allocs: summary, leftover: failed.length === 0 ? preview.leftover : 0 });
    setDone(true);
    onComplete && onComplete(succeeded);   // parent marks ONLY the invoices that persisted
  };

  const fmt2 = (n) => "£" + parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{alignItems:"center"}}>
        <div style={{background:"var(--white)",borderRadius:16,width:"100%",maxWidth:560,boxShadow:"0 8px 40px rgba(0,0,0,.10)",overflow:"hidden",borderTop:"3px solid #dd2b0f"}}>

          {/* Header */}
          <div style={{background:"#201e1d",padding:"20px 24px",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <div style={{width:28,height:28,borderRadius:8,background:"#dd2b0f22",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff6a4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
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
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#dd2b0f"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{c}</div>
                          <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{count} invoice{count!==1?"s":""} outstanding</div>
                        </div>
                        <span style={{fontFamily:"var(--mono)",fontWeight:600,fontSize:13,color:"#dc2626"}}>£{owed.toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {filteredCustomers.length === 0 && (
                    <div className="empty-state" style={{padding:"32px 16px"}}>
                      <div className="empty-state-icon">
                        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                          <circle cx="32" cy="24" r="11" fill="rgba(221,43,15,.10)" stroke="#f0c9c0" strokeWidth="1.5"/>
                          <path d="M14 52c0-9 8-16 18-16s18 7 18 16" stroke="#ff6a4d" strokeWidth="2" fill="none" strokeLinecap="round"/>
                          <path d="M24 24l16 0M32 16l0 16" stroke="#dd2b0f" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
                        </svg>
                      </div>
                      <div className="empty-state-title" style={{fontSize:13}}>No customers with outstanding invoices</div>
                    </div>
                  )}
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
                    {[["cash","💵 Cash"],["bank","🏦 Bank"],["card","💳 Card"]].map(([v,l]) => (
                      <button key={v} type="button" onClick={()=>setMethod(v)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1.5px solid "+(method===v?"#dd2b0f":"var(--border)"),background:method===v?"#dd2b0f":"var(--white)",color:method===v?"#fff":"var(--text2)",fontSize:12,fontWeight:method===v?600:400,cursor:"pointer",fontFamily:"var(--sans)"}}>{l}</button>
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






