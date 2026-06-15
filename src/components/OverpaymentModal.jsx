import React, { useState } from "react";
import { sb } from "../lib/supabase.js";
import { fmtDate } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { ModalPortal } from "./ui.jsx";

export function OverpaymentModal({ inv, overpayment, outstandingInvoices, token, userId, profile, onClose, onAllocated, onCredited }) {
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
