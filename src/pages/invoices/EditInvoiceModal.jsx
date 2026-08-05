import React, { useState, useEffect, useRef } from "react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/supabase.js";
import { fmt, fmtDate, fmtShort, fmtTime, fmtRelative, dueDelta, today, isMobile, escHtml, DEFAULT_REORDER } from "../../lib/utils.js";
import { sendEmail, buildInvoiceEmailHtml, buildReminderEmailHtml, buildDNEmailHtml } from "../../lib/email.js";
import { logAudit } from "../../lib/audit.js";
import { ModalPortal, SkeletonTable, EmptyState } from "../../components/ui.jsx";
import { SearchDropdown } from "../../components/SearchDropdown.jsx";
import { COMPANY, LOGO, JSPDF_URL, toast } from "../../lib/constants.js";
import { reconcileStatus, resolveProductLine, fetchContractPrice, reconcileInvoiceJournal } from "../../lib/invoiceEdit.js";
import { customersForEdit } from "../../lib/contacts.js";

// ── EDIT INVOICE MODAL ──────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ EditInvoiceModal                                           │
// │ Edit existing invoice — customer, lines, status            │
// └────────────────────────────────────────────────────────────┘
export function EditInvoiceModal({ invoice, onClose, onSaved, contacts, products, token, userId }) {
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
    const amountPaid = parseFloat(invoice.amount_paid || 0);
    const newBalance = Math.max(0, total - amountPaid);
    // Issue 1: status must follow the resulting balance, not stay frozen — a paid
    // invoice edited upward still owes money; a partial edited down is settled.
    const finalStatus = reconcileStatus({ userStatus: status, amountPaid, total });
    await sb.patch(token, "invoices", invoice.id, {
      customer,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      status: finalStatus,
      notes,
      lines: JSON.stringify(validLines),
      amount: total,
      subtotal,
      vat_total: vatTotal,
      balance: newBalance,
    });
    const updatedFields = { customer, invoice_date: invoiceDate, due_date: dueDate || null, status: finalStatus, notes, lines: JSON.stringify(validLines), amount: total, subtotal, vat_total: vatTotal, balance: newBalance };

    // Issue 2: the sale journal (Dr AR / Cr Sales) was posted at the old amount.
    // Re-sync it atomically whenever the amount, status or date changed, so the
    // GL / P&L / AR don't drift. Non-fatal: the edit itself already persisted.
    const oldAmount = parseFloat(invoice.amount || 0);
    const journalChanged = oldAmount !== total || invoice.status !== finalStatus || (invoice.invoice_date || "") !== (invoiceDate || "");
    if (journalChanged) {
      const jr = await reconcileInvoiceJournal({ token, invoiceId: invoice.id }).catch(e => ({ ok: false, error: e?.message }));
      if (!jr.ok) {
        if (jr.needsSql) toast.warn("Invoice saved, but the ledger wasn't re-synced — ask an admin to run RECONCILE_INVOICE_JOURNAL.sql.");
        else toast.warn("Invoice saved, but the ledger journal couldn't be re-synced. Check the General Ledger.");
      }
    }

    const changes = [];
    if (invoice.customer !== customer) changes.push(`customer ${invoice.customer} → ${customer}`);
    if (parseFloat(invoice.amount) !== total) changes.push(`amount £${parseFloat(invoice.amount||0).toFixed(2)} → £${total.toFixed(2)}`);
    if (invoice.status !== finalStatus) changes.push(`status ${invoice.status} → ${finalStatus}`);
    if ((invoice.due_date||"") !== (dueDate||"")) changes.push(`due date ${invoice.due_date||"none"} → ${dueDate||"none"}`);
    logAudit(token, userId, "invoice_edited", "invoice", invoice.id, `${invoice.invoice_number} edited${changes.length ? " — " + changes.join(", ") : " (no field changes detected)"}`);
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
                {customersForEdit(contacts, invoice.customer).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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
                    return <button key={days} type="button" onClick={()=>setDueDate(val)} style={{flex:1,padding:"5px 0",borderRadius:5,border:"1px solid "+(active?"#dd2b0f":"var(--border)"),background:active?"#dd2b0f":"var(--white)",color:active?"#fff":"var(--text2)",fontSize:11,fontWeight:active?600:400,cursor:"pointer",fontFamily:"var(--sans)"}}>{label}</button>;
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
                <SearchDropdown placeholder="Search products..." items={products} onSelect={async p => {
                    // Issue 3: apply the product's VAT rate and any customer-specific
                    // contract price on re-pick — matching how InvoiceForm creates lines.
                    const customPrice = await fetchContractPrice({ token, contacts, customerName: customer, productId: p.id });
                    const resolved = resolveProductLine(p, customPrice);
                    setLines(prev => prev.map((ln, idx) => idx === i ? { ...ln, ...resolved } : ln));
                  }} displayKey="name" value={l.description || ""} />
                <input className="il-input mono" type="text" inputMode="numeric" value={String(l.qty ?? "")} onChange={e => updateLine(i, "qty", e.target.value)} />
                <input className="il-input mono" type="text" inputMode="decimal" value={String(l.unit_price ?? "")} onChange={e => updateLine(i, "unit_price", e.target.value)} />
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


