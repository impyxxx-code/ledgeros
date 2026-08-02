import React, { useState, useEffect } from "react";
import { sb } from "../lib/supabase.js";
import { fmt, fmtDate, today, isMobile } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { EmptyState, MobileCard, ModalPortal } from "../components/ui.jsx";
import { SearchDropdown } from "../components/SearchDropdown.jsx";
import { toast } from "../lib/constants.js";

// ── SUPPLIER BILLS / ACCOUNTS PAYABLE ───────────────────────────────────────
export function SupplierBills({ contacts, setContacts, pos = [], token, userId, profile }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all"); // all | open | overdue | paid
  const [payBill, setPayBill] = useState(null);
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState("bank");
  const [payDate, setPayDate] = useState(today());
  const [paying, setPaying] = useState(false);
  const [f, setF] = useState({ supplier_id: "", bill_number: "", bill_date: today(), due_date: "", subtotal: "", vat: "", notes: "", po_id: "" });

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    sb.get(token, "supplier_bills", "order=bill_date.desc")
      .then(d => setBills(Array.isArray(d) ? d : []))
      .catch(() => setBills([]))
      .finally(() => setLoading(false));
  }, [token]);

  const suppliers = contacts.filter(c => c.type === "supplier" || c.type === "both");
  const quickAddSupplier = async (name) => {
    if (!name.trim()) return;
    const data = await sb.post(token, "contacts", { name: name.trim(), type: "supplier", created_by: userId });
    if (data?.[0]) {
      setContacts && setContacts(prev => [data[0], ...prev]);
      setF(prev => ({ ...prev, supplier_id: data[0].id }));
      logAudit(token, userId, "contact_created", "contact", data[0].id, `${name} quick-added from supplier bill form`);
      toast.success(`${name} added as supplier`);
    } else toast.error("Failed to create supplier");
  };

  const subtotal = parseFloat(f.subtotal) || 0;
  const vat = f.vat === "" ? subtotal * 0.2 : (parseFloat(f.vat) || 0);
  const total = subtotal + vat;

  const isOverdue = (b) => b.status !== "paid" && b.due_date && b.due_date < today();
  const daysOverdue = (b) => b.due_date ? Math.max(0, Math.floor((Date.now() - new Date(b.due_date).getTime()) / 86400000)) : 0;

  const save = async () => {
    if (!f.supplier_id || subtotal <= 0) { toast.error("Pick a supplier and enter an amount"); return; }
    setSaving(true);
    const sup = suppliers.find(s => s.id === f.supplier_id);
    const row = {
      bill_number: f.bill_number || null, supplier_id: f.supplier_id, supplier_name: sup?.name,
      po_id: f.po_id || null, bill_date: f.bill_date, due_date: f.due_date || null,
      subtotal, vat, total, amount_paid: 0, balance: total, status: "unpaid",
      notes: f.notes || null, created_by: userId,
    };
    const data = await sb.post(token, "supplier_bills", row);
    if (data?.[0]) {
      setBills(prev => [data[0], ...prev]);
      logAudit(token, userId, "supplier_bill_created", "supplier_bill", data[0].id, `Bill ${f.bill_number || "(no ref)"} from ${sup?.name} — ${fmt(total)}`);
      toast.success("Bill recorded");
    } else toast.error("Failed to save bill");
    setF({ supplier_id: "", bill_number: "", bill_date: today(), due_date: "", subtotal: "", vat: "", notes: "", po_id: "" });
    setShowForm(false); setSaving(false);
  };

  const openPay = (b) => { setPayBill(b); setPayAmt(String((parseFloat(b.balance) || 0).toFixed(2))); setPayMethod("bank"); setPayDate(today()); };
  const closePay = () => { setPayBill(null); setPayAmt(""); };
  const confirmPay = async () => {
    if (!payBill) return;
    const amt = parseFloat(payAmt) || 0;
    if (amt <= 0) { toast.error("Enter an amount"); return; }
    setPaying(true);
    const bal = parseFloat(payBill.balance) || 0;
    const applied = Math.min(amt, bal);
    const newPaid = (parseFloat(payBill.amount_paid) || 0) + applied;
    const newBal = Math.max(0, (parseFloat(payBill.total) || 0) - newPaid);
    const newStatus = newBal <= 0 ? "paid" : "partial";
    await sb.post(token, "supplier_bill_payments", {
      bill_id: payBill.id, supplier_name: payBill.supplier_name, amount: applied, method: payMethod,
      payment_date: payDate, recorded_by: userId, recorded_by_name: profile?.full_name || "Admin",
    }).catch(e => console.error(e));
    await sb.patch(token, "supplier_bills", payBill.id, { amount_paid: newPaid, balance: newBal, status: newStatus });
    setBills(prev => prev.map(b => b.id === payBill.id ? { ...b, amount_paid: newPaid, balance: newBal, status: newStatus } : b));
    logAudit(token, userId, "supplier_bill_paid", "supplier_bill", payBill.id, `${fmt(applied)} paid to ${payBill.supplier_name} via ${payMethod} against ${payBill.bill_number || "bill"}`);
    setPaying(false); closePay();
    toast.success(newStatus === "paid" ? "Bill settled" : "Payment recorded");
  };

  // KPIs / aging
  const openBills = bills.filter(b => b.status !== "paid");
  const totalOwed = openBills.reduce((s, b) => s + (parseFloat(b.balance) || 0), 0);
  const overdueBills = bills.filter(isOverdue);
  const overdueOwed = overdueBills.reduce((s, b) => s + (parseFloat(b.balance) || 0), 0);
  const bucket = (lo, hi) => openBills.filter(b => { const d = b.due_date ? Math.floor((Date.now() - new Date(b.due_date).getTime()) / 86400000) : -999; return d >= lo && (hi == null || d <= hi); }).reduce((s, b) => s + (parseFloat(b.balance) || 0), 0);
  const aging = [
    { label: "Not due", val: bucket(-99999, 0), col: "#16a34a" },
    { label: "1–30 days", val: bucket(1, 30), col: "#d97706" },
    { label: "31–60 days", val: bucket(31, 60), col: "#ea580c" },
    { label: "60+ days", val: bucket(61, null), col: "#dc2626" },
  ];

  const shown = bills.filter(b => filter === "all" ? true : filter === "paid" ? b.status === "paid" : filter === "overdue" ? isOverdue(b) : b.status !== "paid");
  const statusCls = (b) => b.status === "paid" ? "b-green" : isOverdue(b) ? "b-red" : b.status === "partial" ? "b-amber" : "b-gray";
  const statusLbl = (b) => b.status === "paid" ? "paid" : isOverdue(b) ? "overdue" : b.status;

  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 1, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Payables</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Supplier Bills</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>What you owe suppliers · accounts payable</div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile() ? "10px 14px" : "7px 14px", borderRadius: 8, border: "1px solid #dd2b0f", background: "#dd2b0f", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: isMobile() ? 44 : "auto", flexShrink: 0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Bill</button>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[
            { label: "Total Owed", val: fmt(totalOwed), sub: openBills.length + " open bill" + (openBills.length !== 1 ? "s" : ""), color: "rgba(255,255,255,.35)", accent: "#dd2b0f", filter: "open" },
            { label: "Overdue", val: fmt(overdueOwed), sub: overdueBills.length > 0 ? overdueBills.length + " past due" : "none overdue", color: overdueOwed > 0 ? "#fca5a5" : "#86efac", accent: overdueOwed > 0 ? "#dc2626" : "#16a34a", filter: "overdue" },
            { label: "Bills", val: bills.length, sub: "all time", color: "rgba(255,255,255,.35)", accent: "#57534e", filter: "all" },
            { label: "Paid", val: bills.filter(b => b.status === "paid").length, sub: "settled", color: "#86efac", accent: "#16a34a", filter: "paid" },
          ].map((k, i) => {
            const active = filter === k.filter;
            return (
              <div key={i} onClick={() => setFilter(k.filter)} title={`Filter: ${k.label}`}
                style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", cursor: "pointer", background: active ? "rgba(255,255,255,.08)" : "transparent", borderTop: `3px solid ${active ? k.accent : "transparent"}`, transition: "all .15s" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{loading ? "—" : k.val}</div>
                <div style={{ fontSize: 11, color: k.color }}>{k.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aging strip */}
      {!loading && openBills.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>Aged Payables</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile() ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
            {aging.map(a => (
              <div key={a.label} style={{ border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "10px 12px", borderTop: `3px solid ${a.col}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{a.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--mono)", color: a.val > 0 ? a.col : "var(--text3)" }}>{fmt(a.val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New bill form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="ch"><div className="ct">New Supplier Bill</div></div>
          <div className="fg">
            <div className="fgrp"><label>Supplier *</label><SearchDropdown placeholder="Search suppliers..." items={suppliers} value={suppliers.find(s => s.id === f.supplier_id)?.name || ""} onSelect={s => setF({ ...f, supplier_id: s.id })} onCreateNew={quickAddSupplier} createLabel="supplier" /></div>
            <div className="fgrp"><label>Bill / Invoice Ref</label><input value={f.bill_number} onChange={e => setF({ ...f, bill_number: e.target.value })} placeholder="Supplier's invoice number" /></div>
            <div className="fgrp"><label>Bill Date</label><input type="date" value={f.bill_date} onChange={e => setF({ ...f, bill_date: e.target.value })} /></div>
            <div className="fgrp"><label>Due Date</label><input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} /></div>
            <div className="fgrp"><label>Net Amount (£) *</label><input type="number" value={f.subtotal} onChange={e => setF({ ...f, subtotal: e.target.value })} placeholder="0.00" /></div>
            <div className="fgrp"><label>VAT (£)</label><input type="number" value={f.vat} onChange={e => setF({ ...f, vat: e.target.value })} placeholder={subtotal ? (subtotal * 0.2).toFixed(2) + " (auto 20%)" : "0.00"} /></div>
            <div className="fgrp"><label>Linked PO (optional)</label><select value={f.po_id} onChange={e => setF({ ...f, po_id: e.target.value })}><option value="">None</option>{pos.filter(p => !f.supplier_id || p.supplier_name === suppliers.find(s => s.id === f.supplier_id)?.name).map(p => <option key={p.id} value={p.id}>{p.po_number} — {fmt(p.total)}</option>)}</select></div>
            <div className="fgrp full"><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Any notes..." /></div>
          </div>
          <div style={{ padding: "10px 18px", background: "#fafbfc", borderTop: "0.5px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 20, fontSize: 13 }}>
            <span style={{ color: "var(--text2)" }}>Net: <strong className="mono">{fmt(subtotal)}</strong></span>
            <span style={{ color: "var(--text2)" }}>VAT: <strong className="mono">{fmt(vat)}</strong></span>
            <span style={{ fontWeight: 700 }}>Total: <span className="mono">{fmt(total)}</span></span>
          </div>
          <div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Bill"}</button></div>
        </div>
      )}

      {/* List */}
      {isMobile() ? (
        loading ? <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Loading…</div>
        : shown.length === 0 ? <EmptyState icon="report" title="No bills yet" sub="Record a supplier bill to track what you owe" action={() => setShowForm(true)} actionLabel="New Bill" />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
            {shown.map(b => (
              <MobileCard
                key={b.id}
                title={b.supplier_name}
                subtitle={`${b.bill_number || "(no ref)"} · ${fmtDate(b.bill_date)}`}
                value={fmt(b.status === "partial" ? b.balance : b.total)}
                valueSub={b.status === "partial" ? "balance" : undefined}
                badge={<span className={"badge " + statusCls(b)}>{statusLbl(b)}</span>}
                rows={[{ label: "Due", value: b.due_date ? fmtDate(b.due_date) + (isOverdue(b) ? ` · ${daysOverdue(b)}d` : "") : "—" }, { label: "Total", value: fmt(b.total), mono: true }]}
                footer={b.status !== "paid" ? (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    <button className="btn bp" style={{ width: "100%", minHeight: 44 }} onClick={() => openPay(b)}>Record Payment</button>
                  </div>
                ) : undefined}
              />
            ))}
          </div>
        )
      ) : (
        <div className="card"><div className="tw" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ minWidth: 640 }}>
            <thead><tr><th>Ref</th><th>Supplier</th><th className="hm">Bill Date</th><th>Due</th><th>Total</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="empty">Loading…</td></tr>
                : shown.map(b => (
                  <tr key={b.id}>
                    <td className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{b.bill_number || "—"}</td>
                    <td style={{ fontWeight: 500 }}>{b.supplier_name}</td>
                    <td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(b.bill_date)}</td>
                    <td style={{ fontSize: 12, color: isOverdue(b) ? "var(--red)" : "var(--text2)" }}>{b.due_date ? fmtDate(b.due_date) : "—"}{isOverdue(b) && <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 5 }}>{daysOverdue(b)}d</span>}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{fmt(b.total)}</td>
                    <td className="mono" style={{ fontWeight: 600, color: (parseFloat(b.balance) || 0) > 0 ? "var(--text)" : "#16a34a" }}>{fmt(b.balance)}</td>
                    <td><span className={"badge " + statusCls(b)}>{statusLbl(b)}</span></td>
                    <td>{b.status !== "paid" && <button className="btn bp bsm" onClick={() => openPay(b)}>Record Payment</button>}</td>
                  </tr>
                ))}
              {!loading && shown.length === 0 && <tr><td colSpan={8}><EmptyState icon="report" title="No bills yet" sub="Record a supplier bill to track what you owe" action={() => setShowForm(true)} actionLabel="New Bill" /></td></tr>}
            </tbody>
          </table>
        </div></div>
      )}

      {/* Record payment modal */}
      {payBill && (
        <ModalPortal>
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !paying && closePay()} style={{ alignItems: "center" }}>
            <div style={{ background: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 460, boxShadow: "0 8px 40px rgba(0,0,0,.10)", overflow: "hidden", borderTop: "3px solid #16a34a" }}>
              <div style={{ background: "#201e1d", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Pay Supplier</div>
                  <div style={{ fontSize: 12, color: "#8aa0b8", marginTop: 2 }}>{payBill.supplier_name} · {payBill.bill_number || "bill"} · balance {fmt(payBill.balance)}</div>
                </div>
                <button onClick={() => !paying && closePay()} style={{ background: "none", border: "none", color: "#8aa0b8", cursor: "pointer", padding: 4, fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: "18px 22px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Amount £</label>
                    <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--border2)", fontSize: 15, fontWeight: 600, outline: "none", fontFamily: "var(--mono)" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Date</label>
                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--border2)", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Method</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["bank", "🏦 Bank"], ["cash", "💵 Cash"], ["card", "💳 Card"], ["cheque", "📝 Cheque"]].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setPayMethod(v)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1.5px solid " + (payMethod === v ? "#dd2b0f" : "var(--border)"), background: payMethod === v ? "#dd2b0f" : "var(--white)", color: payMethod === v ? "#fff" : "var(--text2)", fontSize: 12, fontWeight: payMethod === v ? 600 : 400, cursor: "pointer", fontFamily: "var(--sans)" }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn bo" style={{ flex: 1, minHeight: 44 }} disabled={paying} onClick={closePay}>Cancel</button>
                  <button className="btn bp" style={{ flex: 2, minHeight: 44, background: "#16a34a", borderColor: "#16a34a" }} disabled={paying} onClick={confirmPay}>{paying ? "Recording…" : "Record Payment"}</button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
