import React, { useState, useEffect } from "react";
import { sb } from "../lib/supabase.js";
import { nextDocNumber } from "../lib/numbering.js";
import { fmt, fmtDate, today, escHtml, isMobile } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { COMPANY } from "../lib/constants.js";
import { EmptyState, MobileCard } from "../components/ui.jsx";

const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;

// Work out how a credit note applies to its linked invoice. Only the portion that
// fits the invoice's remaining balance reduces it (and gets recorded as a payment);
// anything left over is `excess` to be banked as customer credit — never written to
// the invoice's payment ledger (which would overstate collected/cash). With no
// linked invoice the whole note is excess.
export const computeCreditApplication = (cnAmount, inv) => {
  const amt = round2(cnAmount);
  if (!inv) return { applied: 0, excess: amt, actualPaid: null, balance: null, newStatus: null };
  const prevPaid = parseFloat(inv.amount_paid || 0);
  const invAmount = parseFloat(inv.amount || 0);
  const applied = round2(Math.max(0, Math.min(amt, invAmount - prevPaid)));
  const actualPaid = round2(prevPaid + applied);
  const balance = round2(Math.max(0, invAmount - actualPaid));
  return { applied, excess: round2(amt - applied), actualPaid, balance, newStatus: balance <= 0 ? "paid" : "partial" };
};

export function CreditNotes({ contacts, invoices, setInvoices, profile, token, userId }) {
  const [cns, setCNs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [f, setF] = useState({ customer_id: "", invoice_id: "", reason: "", amount: "", issue_date: today() });
  const [cnFilter, setCnFilter] = useState("all");
  useEffect(() => { sb.get(token,"credit_notes","order=created_at.desc").then(d => Array.isArray(d)&&setCNs(d)); }, [token]);
  const customers = contacts.filter(c => c.type==="customer"||c.type==="both");
  const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const save = async () => {
    if (!f.customer_id||!f.amount) return; setSaving(true);
    const num = await nextDocNumber(token, { prefix: "CN", table: "credit_notes", column: "cn_number", width: 3 });
    const cust = customers.find(c => c.id===f.customer_id);
    const data = await sb.post(token,"credit_notes",{...f,cn_number:num,customer_name:cust?.name,amount:parseFloat(f.amount),status:"draft",created_by:userId});
    if (data[0]) { setCNs(prev => [data[0],...prev]); logAudit(token, userId, "credit_note_created", "credit_note", data[0].id, `${num} issued to ${cust?.name} — £${parseFloat(f.amount).toFixed(2)}${f.reason ? ' · ' + f.reason : ''}`); }
    setF({ customer_id:"",invoice_id:"",reason:"",amount:"",issue_date:today() });
    setShowForm(false); setSaving(false);
  };
  const issueCredit = async (cn) => {
    await sb.patch(token,"credit_notes",cn.id,{status:"issued"});
    setCNs(prev => prev.map(c => c.id===cn.id?{...c,status:"issued"}:c));
    logAudit(token, userId, "credit_note_issued", "credit_note", cn.id, `${cn.cn_number} issued to ${cn.customer_name}`);
  };
  // Apply a credit note — reduces the balance of its linked invoice by only the
  // portion that fits, records that portion (not the full note) in the payment
  // ledger, and banks any leftover as available customer credit so it never vanishes.
  const applyCredit = async (cn) => {
    setApplyingId(cn.id);
    const cnAmount = parseFloat(cn.amount || 0);
    const inv = cn.invoice_id ? invoices.find(i => i.id === cn.invoice_id) : null;
    const { applied, excess, actualPaid, balance, newStatus } = computeCreditApplication(cnAmount, inv);
    if (inv) {
      await sb.patch(token, "invoices", inv.id, { amount_paid: actualPaid, balance, status: newStatus });
      if (applied > 0) {
        const payRow = {
          invoice_id: inv.id, invoice_number: inv.invoice_number, customer: inv.customer,
          amount: applied, method: "credit_note",
          payment_date: today(),
          notes: `${cn.cn_number} applied${cn.reason ? ' · ' + cn.reason : ''}`,
          recorded_by_name: profile?.full_name || "Admin"
        };
        if (isUUID(userId)) payRow.recorded_by = userId;
        await sb.addPayment(token, payRow).catch(e => ({ error: e }));
      }
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount_paid: actualPaid, balance, status: newStatus } : i));
    }
    // Anything the invoice couldn't absorb (or the whole note, if unlinked) becomes
    // available customer credit — matches how overpayments are banked.
    if (excess > 0) {
      const creditCustomer = inv ? inv.customer : cn.customer_name;
      await sb.addCredit(token, {
        customer: creditCustomer, amount: excess, source_invoice: cn.cn_number,
        status: "available", notes: `Unapplied balance of ${cn.cn_number}`,
        created_by: profile?.full_name || "Admin"
      }).catch(e => ({ error: e }));
    }
    await sb.patch(token,"credit_notes",cn.id,{status:"applied"});
    setCNs(prev => prev.map(c => c.id===cn.id?{...c,status:"applied"}:c));
    logAudit(token, userId, "credit_note_applied", "credit_note", cn.id, `${cn.cn_number} applied to ${cn.customer_name}${inv ? ' against ' + inv.invoice_number : ''} — £${applied.toFixed(2)} applied${excess > 0 ? `, £${excess.toFixed(2)} to credit` : ''}`);
    setApplyingId(null);
  };
  const printCreditNote = (cn) => {
    const html = `<!DOCTYPE html><html><head><title>${escHtml(cn.cn_number)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;padding:30mm 20mm 20mm;color:#0f172a}.accent-bar{height:5px;background:linear-gradient(90deg,#201e1d 0%,#4f46e5 60%,#dd2b0f 100%);margin:-30mm -20mm 20px}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:.5px solid #e2e8f0;padding-bottom:20px;margin-bottom:20px}.co-name{font-size:15px;font-weight:700}.co-det{font-size:10.5px;color:#64748b;line-height:1.6;margin-top:2px}.cn-title{font-size:28px;font-weight:900;color:#e2e8f0;letter-spacing:-1.5px;text-align:right}.cn-num{font-size:16px;font-weight:800;text-align:right;margin-top:2px}.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}.mbox{background:#f8fafc;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 12px}.mbox .lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.mbox .val{font-size:12px;font-weight:600}.bb{background:#201e1d;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}.bb-l{color:rgba(255,255,255,.5);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}.bb-v{color:#fff;font-size:18px;font-weight:800}</style></head><body><div class="accent-bar"></div><div class="hdr"><div><div class="co-name">${escHtml(COMPANY.name)}</div><div class="co-det">${escHtml(COMPANY.address)}.<br>${escHtml(COMPANY.city)}, ${escHtml(COMPANY.postcode)}<br>VAT: ${escHtml(COMPANY.vatNumber)}</div></div><div><div class="cn-title">CREDIT NOTE</div><div class="cn-num">${escHtml(cn.cn_number)}</div></div></div><div class="mgrid"><div class="mbox"><div class="lbl">Customer</div><div class="val">${escHtml(cn.customer_name)}</div></div><div class="mbox"><div class="lbl">Issue date</div><div class="val">${fmtDate(cn.issue_date)}</div></div><div class="mbox"><div class="lbl">Related invoice</div><div class="val">${escHtml(invoices.find(i=>i.id===cn.invoice_id)?.invoice_number || '—')}</div></div><div class="mbox"><div class="lbl">Status</div><div class="val">${escHtml((cn.status||'draft').toUpperCase())}</div></div></div><div class="mbox" style="margin-bottom:20px"><div class="lbl">Reason</div><div class="val">${escHtml(cn.reason || '—')}</div></div><div class="bb"><span class="bb-l">Credit amount</span><span class="bb-v">${fmt(cn.amount)}</span></div></body></html>`;
    if (window.__ledgerosPrint) window.__ledgerosPrint(html);
    else { const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500); }
  };
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Commerce</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Credit <span style={{ background: "linear-gradient(135deg,#ff6a4d,#dd2b0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Notes</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Issue and apply credit notes</div></div>
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile() ? "10px 14px" : "7px 14px", borderRadius: 8, border: "1px solid #dd2b0f", background: "#dd2b0f", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: isMobile() ? 44 : "auto", flexShrink: 0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Credit Note</button>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Total Credits",val:cns.length,sub:"all credit notes",accent:"#dd2b0f",filter:"all"},{label:"Open",val:cns.filter(c=>c.status==="draft"||c.status==="issued").length,sub:"outstanding",accent:"#d97706",filter:"open"},{label:"Applied",val:cns.filter(c=>c.status==="applied").length,sub:"used",accent:"#16a34a",filter:"applied"},{label:"Total Value",val:fmt(cns.reduce((s,c)=>s+(parseFloat(c.amount)||0),0)),sub:"credits issued",accent:"#dc2626",filter:null}].map((k,i)=>{
            const isActive = k.filter && k.filter !== "all" && cnFilter === k.filter;
            const isClickable = !!k.filter;
            return (
            <div key={i} onClick={() => k.filter && setCnFilter(cnFilter === k.filter ? "all" : k.filter)}
              title={isClickable ? `Click to filter by ${k.label}` : undefined}
              style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${isActive ? k.accent : "transparent"}`, cursor:isClickable?"pointer":"default", background: isActive ? "rgba(255,255,255,.08)" : "transparent", transition:"all .15s" }}
              onMouseEnter={e => { if(isClickable){ e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop=`3px solid ${k.accent}`; }}}
              onMouseLeave={e => { if(isClickable){ e.currentTarget.style.background=isActive?"rgba(255,255,255,.08)":"transparent"; e.currentTarget.style.borderTop=isActive?`3px solid ${k.accent}`:"3px solid transparent"; }}}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          );})}
        </div>
      </div>
      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Credit Note</div></div><div className="fg"><div className="fgrp"><label>Customer *</label><select value={f.customer_id} onChange={e => setF({...f,customer_id:e.target.value})}><option value="">Select customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="fgrp"><label>Related Invoice</label><select value={f.invoice_id} onChange={e => setF({...f,invoice_id:e.target.value})}><option value="">Select invoice (optional)...</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {fmt(i.amount)}</option>)}</select></div><div className="fgrp"><label>Amount (£) *</label><input type="number" value={f.amount} onChange={e => setF({...f,amount:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>Issue Date</label><input type="date" value={f.issue_date} onChange={e => setF({...f,issue_date:e.target.value})} /></div><div className="fgrp full"><label>Reason *</label><input value={f.reason} onChange={e => setF({...f,reason:e.target.value})} placeholder="Reason for credit note..." /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Issue Credit Note"}</button></div></div>}
      {isMobile() ? (
        (() => {
          const shown = cns.filter(cn => cnFilter === "all" || (cnFilter === "open" ? (cn.status==="draft"||cn.status==="issued") : cn.status === cnFilter));
          if (cns.length === 0) return <EmptyState icon="report" title="No credit notes yet" sub="Issue a credit note to refund or adjust a customer invoice" action={() => setShowForm(true)} actionLabel="New Credit Note" />;
          const abtn = { flex:1, minHeight:44 };
          return (
            <div style={{ display:"flex", flexDirection:"column", gap:10, padding:12 }}>
              {shown.map(cn => (
                <MobileCard
                  key={cn.id}
                  title={cn.customer_name}
                  subtitle={`${cn.cn_number} · ${fmtDate(cn.issue_date)}`}
                  value={fmt(cn.amount)}
                  badge={<span className={"badge "+(cn.status==="applied"?"b-green":cn.status==="issued"?"b-blue":"b-gray")}>{cn.status}</span>}
                  rows={cn.reason ? [{ label:"Reason", value:cn.reason, wide:true }] : undefined}
                  footer={
                    <div style={{ display:"flex", gap:8, borderTop:"1px solid var(--border)", paddingTop:12 }}>
                      {cn.status==="draft" && <button className="btn bo" style={abtn} onClick={() => issueCredit(cn)}>Issue</button>}
                      {cn.status==="issued" && <button className="btn bp" style={abtn} onClick={() => applyCredit(cn)} disabled={applyingId===cn.id}>{applyingId===cn.id?"Applying...":"Apply"}</button>}
                      <button className="btn bo" style={abtn} onClick={() => printCreditNote(cn)}>Print</button>
                    </div>
                  }
                />
              ))}
            </div>
          );
        })()
      ) : (
      <div className="card"><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table className="cr-table" style={{minWidth:420}}><thead><tr><th>CN #</th><th>Customer</th><th className="hm">Date</th><th>Amount</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {cns.filter(cn => cnFilter === "all" || (cnFilter === "open" ? (cn.status==="draft"||cn.status==="issued") : cn.status === cnFilter)).map(cn => <tr key={cn.id}><td className="mono" style={{color:"var(--purple)",fontSize:12}}>{cn.cn_number}</td><td style={{fontWeight:500}}>{cn.customer_name}</td><td className="hm tm" style={{fontSize:12}}>{fmtDate(cn.issue_date)}</td><td className="mono tr-c" style={{fontWeight:600}}>{fmt(cn.amount)}</td><td className="tm">{cn.reason}</td><td><span className={"badge "+(cn.status==="applied"?"b-green":cn.status==="issued"?"b-blue":"b-gray")}>{cn.status}</span></td><td style={{display:"flex",gap:6}}>{cn.status==="draft"&&<button className="btn bo bsm" onClick={() => issueCredit(cn)}>Issue</button>}{cn.status==="issued"&&<button className="btn bp bsm" onClick={() => applyCredit(cn)} disabled={applyingId===cn.id}>{applyingId===cn.id?"Applying...":"Apply"}</button>}<button className="btn bo bsm" onClick={() => printCreditNote(cn)}>Print</button></td></tr>)}
        {cns.length===0&&<tr><td colSpan={7}><EmptyState icon="report" title="No credit notes yet" sub="Issue a credit note to refund or adjust a customer invoice" action={() => setShowForm(true)} actionLabel="New Credit Note" /></td></tr>}
      </tbody></table></div></div>
      )}
    </div>
  );
}
