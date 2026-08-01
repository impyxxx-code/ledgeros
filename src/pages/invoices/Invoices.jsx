import React, { useState, useEffect, useRef } from "react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/supabase.js";
import { fmt, fmtDate, fmtShort, fmtTime, fmtRelative, dueDelta, today, isMobile, escHtml, DEFAULT_REORDER } from "../../lib/utils.js";
import { sendEmail, buildInvoiceEmailHtml, buildReminderEmailHtml, buildDNEmailHtml, buildReceiptEmailHtml } from "../../lib/email.js";
import { logAudit } from "../../lib/audit.js";
import { postPaymentJournal } from "../../lib/journal.js";
import { ModalPortal, SkeletonTable, EmptyState } from "../../components/ui.jsx";
import { SearchDropdown } from "../../components/SearchDropdown.jsx";
import { COMPANY, LOGO, JSPDF_URL, toast } from "../../lib/constants.js";
import { InvoiceForm } from "./InvoiceForm.jsx";
import { EditInvoiceModal } from "./EditInvoiceModal.jsx";
import { BulkPaymentModal } from "./BulkPaymentModal.jsx";
import { InvoiceModal } from "../../components/InvoiceModal.jsx";
import { OverpaymentModal } from "../../components/OverpaymentModal.jsx";

// ── INVOICES ──────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Invoices                                                   │
// │ Invoice list — filter, sort, mark paid, part pay, edit     │
// └────────────────────────────────────────────────────────────┘
export function Invoices({ invoices, setInvoices, contacts, setContacts, products, accounts = [], token, userId, profile, allProfiles = [], pendingInvoiceView, onClearPending, pendingFilter, onClearFilter, triggerNewInvoice, onTriggerHandled }) {
  const [overpaymentData, setOverpaymentData] = useState(null);
  const [bulkPayCustomer, setBulkPayCustomer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState({});
  const [mobActionsInv, setMobActionsInv] = useState(null);
  const [mobMarkPaidInv, setMobMarkPaidInv] = useState(null);
  const [mobMarkPaidMethod, setMobMarkPaidMethod] = useState("cash");
  const [mobMarkPaidSaving, setMobMarkPaidSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [viewMode, setViewMode] = useState("table"); // table | card
  const [editInvoice, setEditInvoice] = useState(null);
  const [partPayId, setPartPayId] = useState(null);
  const [partPayAmount, setPartPayAmount] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)));

  const bulkMarkPaid = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    for (const id of selectedIds) {
      await sb.patch(token, "invoices", id, { status: "paid", payment_method: "cash" });
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: "cash" } : i));
    }
    logAudit(token, userId, "bulk_paid", "invoice", null, `${selectedIds.size} invoices marked paid in bulk`);
    toast.success(`${selectedIds.size} invoice${selectedIds.size > 1 ? "s" : ""} marked as paid`);
    setSelectedIds(new Set());
    setBulkLoading(false);
  };

  const bulkSendReminder = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    let sent = 0;
    for (const id of selectedIds) {
      const inv = invoices.find(i => i.id === id);
      if (!inv) continue;
      const cust = contacts.find(c => c.name === inv.customer);
      if (!cust?.email) continue;
      const balance = inv.balance > 0 ? inv.balance : inv.amount;
      const html = buildReminderEmailHtml(inv, balance);
      const result = await sendEmail({ to: cust.email, subject: `Payment Reminder — ${inv.invoice_number} — ${COMPANY.name}`, html, token });
      if (result.success) {
        sent++;
        logAudit(token, userId, "reminder_sent", "invoice", id, `Reminder sent to ${cust.email} for ${inv.invoice_number}`);
      }
    }
    toast.success(`Reminder sent to ${sent} customer${sent > 1 ? "s" : ""}`);
    setSelectedIds(new Set());
    setBulkLoading(false);
  };

  useEffect(() => {
    if (pendingInvoiceView) { setViewInvoice(pendingInvoiceView); onClearPending && onClearPending(); }
    if (pendingFilter) { setFilterStatus(pendingFilter); onClearFilter && onClearFilter(); }
    if (triggerNewInvoice) { setShowForm(true); onTriggerHandled && onTriggerHandled(); }
  }, [pendingInvoiceView, pendingFilter, triggerNewInvoice]);

  const markPaid = async (id, method) => {
    const inv = invoices.find(i => i.id === id);
    await sb.patch(token, "invoices", id, { status: "paid", payment_method: method || "cash", amount_paid: inv?.amount || 0, balance: 0 });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", payment_method: method || "cash", amount_paid: i.amount, balance: 0 } : i));
    toast.success("Invoice marked as paid");
    if (inv) {
      logAudit(token, userId, "payment_received", "invoice", id, `${inv.invoice_number} marked paid via ${method||"cash"} — ${new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(inv.amount)}`);
      postPaymentJournal(token, accounts, { invoice_id: id, invoice_number: inv.invoice_number, amount: parseFloat(inv.amount) - parseFloat(inv.amount_paid||0), date: new Date().toISOString().slice(0,10) });
      const cust = contacts.find(c => c.name === inv.customer);
      if (cust?.email) sendEmail({ to: cust.email, subject: `Payment Received — ${inv.invoice_number} — ${COMPANY.name}`, html: buildReceiptEmailHtml(inv, inv.amount, method || "cash", 0), token }).catch(()=>{});
    }
    setPayingId(null); setPayMethod(prev => ({ ...prev, [id]: "" }));
  };

  const deleteInvoice = async (inv) => {
    if (!confirm(`Delete ${inv.invoice_number} (${fmt(inv.amount)}) for ${inv.customer}?\n\nThis cannot be undone.`)) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${inv.id}`, { method: "DELETE", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
    if (res.ok || res.status === 204) {
      setInvoices(prev => prev.filter(i => i.id !== inv.id));
      toast.success(`${inv.invoice_number} deleted`);
      logAudit(token, userId, "invoice_deleted", "invoice", inv.id, `${inv.invoice_number} deleted — ${fmt(inv.amount)}`);
    } else { toast.error("Failed to delete invoice"); }
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
    if (overpayment > 0) {
      const outstanding = invoices.filter(i => i.customer === inv.customer && i.id !== inv.id && (i.status === "pending" || i.status === "overdue" || i.status === "partial"));
      setOverpaymentData({ inv: { ...inv, amount_paid: actualPaid }, overpayment, outstandingInvoices: outstanding });
    }
  };

  // Generate and download a delivery note from any invoice
  const printDNFromInvoice = (inv) => {
    const rawLines = (() => { try { return inv.lines ? (typeof inv.lines === "string" ? JSON.parse(inv.lines) : inv.lines) : null; } catch(e) { return null; } })();
    const invLines = (Array.isArray(rawLines) && rawLines.length > 0) ? rawLines : [{ description: inv.description || "See invoice", qty: 1, unit: "unit" }];
    const dnLines = invLines.filter(l => l.description && l.description.trim() !== "").map(l => ({
      description: l.description, qty: l.qty, unit: l.unit || "unit"
    }));
    const cust = contacts.find(c => c.name === inv.customer);
    const address = [cust?.address, cust?.city, cust?.postcode].filter(Boolean).join(", ");
    const dn_number = `DN-${inv.invoice_number.replace("INV-", "")}`;
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${dn_number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#ffffff}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#0a0f1e;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{max-width:780px;margin:0 auto;padding:32px 36px}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:3px solid #201e1d;margin-bottom:28px}.logo-wrap img{height:52px;object-fit:contain}.co-detail{font-size:10px;color:#64748b;line-height:1.8;margin-top:8px}.doc-title{font-size:42px;font-weight:900;color:#e8edf4;letter-spacing:-2px;line-height:1}.doc-num{font-size:18px;font-weight:800;color:#201e1d;margin-top:4px}.inv-badge{display:inline-block;margin-top:6px;padding:3px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;font-weight:600;color:#64748b}.status-pill{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe}.meta-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:16px;margin-bottom:28px}.meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}.meta-box.dark{background:#201e1d;border-color:#201e1d}.meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}.meta-lbl.light{color:rgba(255,255,255,.45)}.meta-val{font-size:14px;font-weight:700;color:#0a0f1e}.meta-val.large{font-size:20px}.meta-val.light{color:#fff}.meta-val.addr{font-size:12px;font-weight:500;color:rgba(255,255,255,.55);margin-top:4px;line-height:1.6}.meta-sub{display:grid;grid-template-columns:1fr 1fr;gap:10px}.table-wrap{margin-bottom:28px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}table{width:100%;border-collapse:collapse}thead tr{background:#201e1d}th{padding:12px 16px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#fff;text-align:left}th.c{text-align:center}td{padding:13px 16px;font-size:13px;border-bottom:1px solid #f1f5f9}tr:last-child td{border-bottom:none}tr:nth-child(even) td{background:#fafbfd}.td-desc{font-weight:600}.td-unit{color:#94a3b8;font-size:11px}.td-qty{text-align:center;font-weight:800;font-size:16px;color:#2563eb}.td-blank{text-align:center;color:#cbd5e1}.sig-section{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px;padding-top:24px;border-top:2px solid #f1f5f9}.sig-box{border-bottom:2px solid #201e1d;height:64px;margin-bottom:8px}.sig-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}.footer-box{margin-top:28px;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:9px;color:#64748b;line-height:1.8}.footer-box b{color:#475569}</style>
</head><body><div class="page">
<div class="header">
  <div class="logo-wrap"><img src="${LOGO}" alt="Arkham Retail" style="height:80px;object-fit:contain;object-position:left"/></div>
  <div style="text-align:right"><div class="doc-title">DELIVERY</div><div class="doc-title">NOTE</div><div class="doc-num">${dn_number}</div><div class="inv-badge">📄 Invoice: ${inv.invoice_number}</div><div class="status-pill">${(inv.status||"pending").toUpperCase()}</div></div>
</div>
<div class="meta-grid">
  <div class="meta-box dark"><div class="meta-lbl light">Deliver To</div><div class="meta-val large light">${escHtml(inv.customer)}</div>${address?"<div class=\"meta-val addr\">"+address+"</div>":""}</div>
  <div class="meta-sub">
    <div class="meta-box"><div class="meta-lbl">DN Number</div><div class="meta-val">${dn_number}</div></div>
    <div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${fmtDate(inv.invoice_date)}</div></div>
    <div class="meta-box"><div class="meta-lbl">Invoice Ref</div><div class="meta-val">${inv.invoice_number}</div></div>
    <div class="meta-box"><div class="meta-lbl">Items</div><div class="meta-val">${dnLines.length} line${dnLines.length!==1?"s":""}</div></div>
  </div>
</div>
<div class="table-wrap"><table>
  <thead><tr><th style="width:45%">Description</th><th>Unit</th><th class="c">Qty Ordered</th><th class="c">Qty Delivered</th><th class="c">Condition</th></tr></thead>
  <tbody>${dnLines.map(l=>"<tr><td class=\"td-desc\">" + escHtml(l.description) + "</td><td class=\"td-unit\">" + escHtml(l.unit||"unit") + "</td><td class=\"td-qty\">" + escHtml(String(l.qty)) + "</td><td class=\"td-blank\">____</td><td class=\"td-blank\">____</td></tr>").join("")}
</table></div>
<div class="sig-section">
  <div><div class="sig-box"></div><div class="sig-lbl">✍ Delivered by — Signature &amp; Full Name</div></div>
  <div><div class="sig-box"></div><div class="sig-lbl">✍ Received by — Signature, Name &amp; Date</div></div>
</div>
<div class="footer-box"><div><b>${COMPANY.name}</b> · ${COMPANY.address}, ${COMPANY.address2}, ${COMPANY.city}, ${COMPANY.county}, ${COMPANY.postcode}</div><div>VAT: ${COMPANY.vatNumber} · Tel: ${COMPANY.phone} · ${COMPANY.email}</div></div>
</div></body></html>`;
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  const downloadDNpdf = (html, dn_number) => {
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  const totals = {
    paid: invoices.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0),
    pending: invoices.filter(i => i.status === "pending").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0),
    overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0),
    partial: invoices.filter(i => i.status === "partial").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0),
  };
  const filtered = invoices.filter(i => {
    const matchStatus = filterStatus === "all" || i.status === filterStatus || (filterStatus === "pending" && i.status === "partial");
    const matchSearch = !searchQ || i.customer?.toLowerCase().includes(searchQ.toLowerCase()) || i.invoice_number?.toLowerCase().includes(searchQ.toLowerCase());
    return matchStatus && matchSearch;
  }).sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (sortCol === "amount") { av = parseFloat(av)||0; bv = parseFloat(bv)||0; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
  const sortToggle = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const SortIcon = ({ col }) => <i className={"ti " + (sortCol !== col ? "ti-arrows-sort" : sortDir === "asc" ? "ti-sort-ascending" : "ti-sort-descending")} style={{ fontSize: 11, marginLeft: 4 }} />;
  return (
    <div>
      {editInvoice && <EditInvoiceModal
        invoice={editInvoice}
        onClose={() => setEditInvoice(null)}
        contacts={contacts}
        products={products}
        token={token}
        userId={userId}
        onSaved={(updatedFields) => {
          if (updatedFields) setInvoices(prev => prev.map(i => i.id === editInvoice.id ? { ...i, ...updatedFields } : i));
          sb.get(token, "invoices", "order=created_at.desc&limit=1000").then(d => Array.isArray(d) && setInvoices(d));
          setEditInvoice(null);
        }}
      />}
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
      {bulkPayCustomer && <BulkPaymentModal
        customer={bulkPayCustomer}
        invoices={invoices}
        contacts={contacts}
        accounts={accounts}
        token={token}
        userId={userId}
        profile={profile}
        onClose={() => setBulkPayCustomer(null)}
        onComplete={(allocs) => {
          setInvoices(prev => prev.map(inv => {
            const a = allocs.find(x => x.inv.id === inv.id);
            if (!a) return inv;
            return { ...inv, amount_paid: parseFloat(inv.amount) - a.newBalance, balance: a.newBalance, status: a.newStatus, payment_method: inv.payment_method };
          }));
          setBulkPayCustomer(null);
        }}
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
          const inv = invoices.find(i => i.id === id);
          if (inv) logAudit(token, userId, "status_changed", "invoice", id, `${inv.invoice_number} status changed to ${status.toUpperCase()} for ${inv.customer}`);
        }}
        onDuplicate={(inv) => {
          setViewInvoice(null);
          setShowForm(true);
        }}
        onPartPay={async (inv, amt, method, payDate) => {
          const prevPaid = parseFloat(inv.amount_paid || 0);
          const totalPaid = prevPaid + amt;
          const invAmount = parseFloat(inv.amount || 0);
          const balance = invAmount - totalPaid;
          const newStatus = balance <= 0 ? "paid" : "partial";
          const patchRes = await sb.patch(token, "invoices", inv.id, { amount_paid: totalPaid, balance: Math.max(0, balance), status: newStatus, payment_method: method || "cash" });
          if (patchRes?.code && !Array.isArray(patchRes)) throw new Error(patchRes?.message || "Failed to update invoice");
          const isUUID2 = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
          const invAmount2 = parseFloat(inv.amount || 0);
          const overpayment2 = totalPaid > invAmount2 ? totalPaid - invAmount2 : 0;
          const actualPaid2 = overpayment2 > 0 ? invAmount2 : totalPaid;
          const finalStatus2 = overpayment2 > 0 ? "paid" : newStatus;
          const finalBalance2 = overpayment2 > 0 ? 0 : Math.max(0, balance);
          const resolvedDate2 = payDate || new Date().toISOString().split("T")[0];
          const payRow2 = {
            invoice_id: inv.id, invoice_number: inv.invoice_number, customer: inv.customer,
            amount: amt, method: method || "cash",
            payment_date: resolvedDate2,
            notes: overpayment2 > 0 ? `Full payment + £${overpayment2.toFixed(2)} overpayment` : finalStatus2 === "paid" ? "Final payment" : "Partial payment",
            recorded_by_name: profile?.full_name || "Admin"
          };
          if (isUUID2(userId)) payRow2.recorded_by = userId;
          const payRes2 = await sb.addPayment(token, payRow2).catch(e => ({ error: e }));
          if (payRes2?.error || payRes2?.code) console.error("Payment ledger insert failed:", payRes2);
          setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount_paid: actualPaid2, balance: finalBalance2, status: finalStatus2 } : i));
          setViewInvoice(prev => prev?.id === inv.id ? { ...prev, amount_paid: actualPaid2, balance: finalBalance2, status: finalStatus2 } : prev);
          if (overpayment2 > 0) {
            const outstanding2 = invoices.filter(i => i.customer === inv.customer && i.id !== inv.id && (i.status === "pending" || i.status === "overdue" || i.status === "partial"));
            setOverpaymentData({ inv: { ...inv, amount_paid: actualPaid2 }, overpayment: overpayment2, outstandingInvoices: outstanding2 });
          }
        }}
        onLogPartPay={(inv, amt, method, newBal) => logAudit(token, userId, "part_payment", "invoice", inv.id, `${inv.invoice_number} — £${amt.toFixed(2)} received via ${method}. Remaining: £${newBal.toFixed(2)}`)}
      />}
      {/* ── Invoices Page Header ── */}
      {isMobile() ? (
        <div style={{ margin: "-12px -12px 0", padding: "16px 16px 12px", background: "#0f172a" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Invoices</div>
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search invoices..." style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36, paddingRight: 12, height: 44, border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, fontSize: 14, outline: "none", color: "#fff", background: "rgba(255,255,255,.07)", fontFamily: "var(--sans)" }} />
          </div>
          {profile?.role==="admin"&&<button onClick={() => setBulkPayCustomer("__pick__")} style={{ width:"100%", boxSizing:"border-box", display: "flex", alignItems: "center", justifyContent:"center", gap: 6, marginTop: 10, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.1)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily:"var(--sans)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Bulk Payment
          </button>}
        </div>
      ) : (
      <div className="page-hero" style={{ margin: "-26px -28px 0 -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Invoice Management</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Invoices</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 6 }}>
              {invoices.length} total
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              {invoices.filter(i => i.status === "overdue").length} overdue
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              {filtered.length} shown
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search invoices..." style={{ paddingLeft: 29, paddingRight: 10, height: 32, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, fontSize: 12, outline: "none", color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.07)", width: 180, fontFamily: "var(--sans)" }} />
            </div>
            {profile?.role==="admin"&&<button onClick={() => setBulkPayCustomer("__pick__")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.1)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace:"nowrap", fontFamily:"var(--sans)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Bulk Payment
            </button>}
            <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #dd2b0f", background: "#dd2b0f", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Invoice
            </button>
          </div>
        </div>
        {/* Stats strip — clickable filters */}
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)", position: "relative", zIndex: 1 }}>
          {[
            { label: "Paid", val: fmt(totals.paid), sub: `${invoices.filter(i=>i.status==="paid").length} invoices`, color: "#86efac", filter: "paid", accent: "#16a34a" },
            { label: "Pending", val: fmt(totals.pending + totals.partial), sub: `${invoices.filter(i=>i.status==="pending"||i.status==="partial").length} invoices`, color: "#fcd34d", filter: "pending|partial", accent: "#d97706" },
            { label: "Overdue", val: fmt(totals.overdue), sub: `${invoices.filter(i=>i.status==="overdue").length} invoices`, color: "#fca5a5", filter: "overdue", accent: "#dc2626" },
            { label: "Total Invoiced", val: fmt(totals.paid + totals.pending + totals.overdue + totals.partial), sub: `${invoices.length} all invoices`, color: "rgba(255,255,255,.35)", filter: "all", accent: "#dd2b0f" },
          ].map((k, i) => {
            const isActive = k.filter === "all" ? filterStatus === "all" : filterStatus === k.filter || (k.filter === "pending|partial" && (filterStatus === "pending" || filterStatus === "partial"));
            const handleClick = () => {
              if (k.filter === "pending|partial") { setFilterStatus(isActive ? "all" : "pending"); }
              else { setFilterStatus(isActive ? "all" : k.filter); }
            };
            return (
            <div key={i} onClick={handleClick}
              title={`Click to filter by ${k.label}`}
              style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", cursor: "pointer", transition: "all .15s", background: isActive ? "rgba(255,255,255,.08)" : "transparent", borderTop: `3px solid ${isActive ? k.accent : "transparent"}`, outline: isActive ? `1px solid ${k.accent}33` : "none" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop=`3px solid ${k.accent}`; }}
              onMouseLeave={e => { e.currentTarget.style.background=isActive?"rgba(255,255,255,.08)":"transparent"; e.currentTarget.style.borderTop=isActive?`3px solid ${k.accent}`:"3px solid transparent"; }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? k.color : "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: isActive ? k.color : "rgba(255,255,255,.5)" }}>{k.sub}</div>
            </div>
          );})}
        </div>
      </div>
      )}

      {/* Status filter tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#201e1d", borderBottom: "1px solid rgba(255,255,255,.10)", padding: isMobile() ? "8px 12px" : "5px 36px", margin: isMobile() ? "-12px -12px 12px" : "0 -28px 16px", flexWrap: isMobile() ? "nowrap" : "wrap", overflowX: isMobile() ? "auto" : "visible" }}>
        {(isMobile()
          ? [["all","All",invoices.length],["pending","Pending",invoices.filter(i=>i.status==="pending"||i.status==="partial").length],["overdue","Overdue",invoices.filter(i=>i.status==="overdue").length],["paid","Paid",invoices.filter(i=>i.status==="paid").length]]
          : [["all","All",invoices.length],["pending","Pending",invoices.filter(i=>i.status==="pending"||i.status==="partial").length],["paid","Paid",invoices.filter(i=>i.status==="paid").length],["overdue","Overdue",invoices.filter(i=>i.status==="overdue").length],["draft","Draft",invoices.filter(i=>i.status==="draft").length]]
        ).map(([s, lbl, cnt]) => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "5px 13px", borderRadius: 7, border: "none", background: filterStatus === s ? "#dd2b0f" : "transparent", color: filterStatus === s ? "#fff" : "rgba(255,255,255,.45)", fontSize: 12, fontWeight: filterStatus === s ? 700 : 500, cursor: "pointer", fontFamily: "var(--sans)", display: "flex", alignItems: "center", gap: 5, transition: "all .15s", boxShadow: filterStatus === s ? "0 2px 8px rgba(221,43,15,.30)" : "none", flexShrink: 0 }}>
            {lbl} <span style={{ background: filterStatus === s ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.08)", padding: "1px 7px", borderRadius: 10, fontSize: 11, fontWeight: 800, color: filterStatus === s ? "#fff" : "rgba(255,255,255,.55)" }}>{cnt.toLocaleString()}</span>
          </button>
        ))}
      </div>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 16px", background: "#201e1d", border: "1px solid rgba(221,43,15,.28)", borderRadius: 10, boxShadow: "0 4px 20px rgba(221,43,15,.15)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#ff6a4d" }}>{selectedIds.size} selected</span>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,.12)" }} />
          <button onClick={bulkMarkPaid} disabled={bulkLoading} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Mark Paid
          </button>
          <button onClick={bulkSendReminder} disabled={bulkLoading} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.75)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Send Reminder
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 12, cursor: "pointer", fontFamily: "var(--sans)" }}>Clear</button>
        </div>
      )}
      {showForm && <ModalPortal><div style={{position:"fixed",inset:0,zIndex:600,background:"var(--bg)",overflowY:"auto"}}><InvoiceForm contacts={contacts} products={products} accounts={accounts} token={token} userId={userId} invoices={invoices} onSave={inv => { setInvoices(prev => { if (prev.find(i=>i.id===inv.id)) return prev; return [inv,...prev]; }); setTimeout(() => sb.get(token,"invoices","order=created_at.desc&limit=1000").then(d=>Array.isArray(d)&&setInvoices(d)), 1000); }} onClose={() => setShowForm(false)} /></div></ModalPortal>}
      <div className="card">
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{filtered.length} invoice{filtered.length!==1?"s":""}</div>
          {!isMobile() && <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setViewMode("table")} style={{ width:30,height:30,borderRadius:"var(--r)",border:"1px solid "+(viewMode==="table"?"var(--blue)":"var(--border)"),background:viewMode==="table"?"var(--blue-lt)":"var(--white)",color:viewMode==="table"?"var(--blue)":"var(--text3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg></button>
            <button onClick={() => setViewMode("card")} style={{ width:30,height:30,borderRadius:"var(--r)",border:"1px solid "+(viewMode==="card"?"var(--blue)":"var(--border)"),background:viewMode==="card"?"var(--blue-lt)":"var(--white)",color:viewMode==="card"?"var(--blue)":"var(--text3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
          </div>}
        </div>
        {(isMobile() || viewMode === "card") ? (
          isMobile() ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10, padding:12 }}>
            {filtered.map(inv => (
              <div key={inv.id} role="button" tabIndex={0}
                onClick={() => setViewInvoice(inv)}
                onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setViewInvoice(inv);}}
                style={{ background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:"14px 16px",boxShadow:"var(--sh)",cursor:"pointer",minHeight:64,display:"flex",flexDirection:"column",justifyContent:"center",gap:6 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
                  <span style={{ fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{inv.customer}</span>
                  <span style={{ fontWeight:800,fontSize:16,fontFamily:"var(--mono)",flexShrink:0,marginLeft:8 }}>
                    {inv.status === "partial" ? fmt(inv.balance || 0) : fmt(inv.amount)}
                  </span>
                </div>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
                  <span style={{ fontSize:12,color:"var(--text3)" }}>{inv.invoice_number} · {fmtDate(inv.invoice_date)}</span>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span>
                    {(inv.status!=="paid" || profile?.role==="admin") && (
                      <button aria-label="More actions" onClick={e=>{e.stopPropagation();setMobActionsInv(inv);}}
                        style={{ width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--white)",color:"var(--text3)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length===0&&<EmptyState icon="invoice" title={searchQ||filterStatus!=="all"?"No invoices match":"No invoices yet"} sub={searchQ||filterStatus!=="all"?"Try adjusting your search or filter":"Create your first invoice to get started"} action={searchQ||filterStatus!=="all"?undefined:()=>setShowForm(true)} actionLabel="New Invoice" />}
            {mobActionsInv && (
              <ModalPortal>
                <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.5)" }} onClick={() => setMobActionsInv(null)}>
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"var(--white)", borderRadius:"16px 16px 0 0", paddingBottom:"max(20px,env(safe-area-inset-bottom))", boxShadow:"0 -4px 24px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
                    <div style={{ width:36, height:4, background:"var(--border2)", borderRadius:2, margin:"12px auto 0" }} />
                    <div style={{ padding:"14px 20px 4px" }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>{mobActionsInv.invoice_number}</div>
                      <div style={{ fontSize:12, color:"var(--text3)", marginTop:2 }}>{mobActionsInv.customer} · {fmt(mobActionsInv.status==="partial"?(mobActionsInv.balance||0):mobActionsInv.amount)}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"12px 20px 20px" }}>
                      {mobActionsInv.status!=="paid" && (
                        <button className="btn bo" style={{ minHeight:48, justifyContent:"flex-start", paddingLeft:16, color:"#16a34a", borderColor:"#bbf7d0" }} onClick={() => { const inv=mobActionsInv; setMobActionsInv(null); setMobMarkPaidInv(inv); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}><polyline points="20 6 9 17 4 12"/></svg>
                          Mark as Paid
                        </button>
                      )}
                      {profile?.role==="admin" && (
                        <button className="btn bo" style={{ minHeight:48, justifyContent:"flex-start", paddingLeft:16, color:"var(--red)", borderColor:"#fecaca" }} onClick={() => { const inv=mobActionsInv; setMobActionsInv(null); deleteInvoice(inv); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                          Delete Invoice
                        </button>
                      )}
                      <button className="btn" style={{ minHeight:48 }} onClick={() => setMobActionsInv(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              </ModalPortal>
            )}
            {mobMarkPaidInv && (
              <ModalPortal>
                <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.5)" }} onClick={() => !mobMarkPaidSaving && setMobMarkPaidInv(null)}>
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"var(--white)", borderRadius:"16px 16px 0 0", paddingBottom:"max(20px,env(safe-area-inset-bottom))", boxShadow:"0 -4px 24px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
                    <div style={{ width:36, height:4, background:"var(--border2)", borderRadius:2, margin:"12px auto 0" }} />
                    <div style={{ padding:"14px 20px 4px" }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>Mark as Paid</div>
                      <div style={{ fontSize:12, color:"var(--text3)", marginTop:2 }}>{mobMarkPaidInv.invoice_number} · {mobMarkPaidInv.customer} · {fmt(mobMarkPaidInv.status==="partial"?(mobMarkPaidInv.balance||0):mobMarkPaidInv.amount)}</div>
                    </div>
                    <div style={{ padding:"12px 20px" }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Payment method</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                        {[["cash","Cash"],["card","Card"],["bank_transfer","Bank Transfer"]].map(([val,lbl]) => (
                          <div key={val} role="button" tabIndex={0} onClick={() => setMobMarkPaidMethod(val)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setMobMarkPaidMethod(val);}}
                            style={{ padding:"12px 10px", borderRadius:10, border:"2px solid "+(mobMarkPaidMethod===val?"var(--blue)":"var(--border)"), background:mobMarkPaidMethod===val?"var(--blue-lt)":"var(--white)", color:mobMarkPaidMethod===val?"var(--blue)":"var(--text2)", fontSize:13, fontWeight:600, textAlign:"center", cursor:"pointer", minHeight:44, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {lbl}
                          </div>
                        ))}
                        <button className="btn bo" style={{ minHeight:44, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", textAlign:"center", fontSize:13, fontWeight:600 }} disabled={mobMarkPaidSaving} onClick={() => setMobMarkPaidInv(null)}>Cancel</button>
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"center", padding:"4px 20px 20px" }}>
                      <button className="btn bp" style={{ minHeight:42, width:"100%", maxWidth:160, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", textAlign:"center", fontSize:13 }} disabled={mobMarkPaidSaving} onClick={async () => { setMobMarkPaidSaving(true); await markPaid(mobMarkPaidInv.id, mobMarkPaidMethod); setMobMarkPaidSaving(false); setMobMarkPaidInv(null); setMobMarkPaidMethod("cash"); }}>
                        {mobMarkPaidSaving ? "Saving..." : "Confirm Payment"}
                      </button>
                    </div>
                  </div>
                </div>
              </ModalPortal>
            )}
          </div>
          ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14, padding: 16 }}>
            {filtered.map(inv => (
              <div key={inv.id} style={{ background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:18,boxShadow:"var(--sh)",cursor:"pointer",transition:"all .15s" }}
                onClick={() => setViewInvoice(inv)}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--blue)";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.transform="none";}}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <div className="c-av" style={{ background:["#dd2b0f","#1a7f37","#f59e0b","#201e1d","#ae1800"][inv.customer?.charCodeAt(0)%5]||"#dd2b0f",width:30,height:30,fontSize:11 }}>{inv.customer?.[0]?.toUpperCase()}</div>
                    <span style={{ fontWeight:600,fontSize:13 }}>{inv.customer}</span>
                  </div>
                  <span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span>
                </div>
                <div style={{ fontSize:22,fontWeight:800,letterSpacing:"-.5px",marginBottom:4 }}>
                {inv.status === "partial" ? fmt(inv.balance || 0) : fmt(inv.amount)}
                {inv.status === "partial" && <span style={{ fontSize:12, color:"var(--text3)", fontWeight:400, marginLeft:6 }}>of {fmt(inv.amount)}</span>}
              </div>
                <div style={{ fontSize:11,color:"var(--text3)",marginBottom:12 }}>{inv.invoice_number} · {fmtDate(inv.invoice_date)}</div>
                <div style={{ display:"flex",gap:6 }}>
                  <button className="btn bp bsm" style={{flex:1}} onClick={e=>{e.stopPropagation();setViewInvoice(inv);}}>View</button>
                  <button className="btn bsm" style={{background:"#0f172a",color:"#fff"}} onClick={e=>{e.stopPropagation();printDNFromInvoice(inv);}}>DN</button>
                </div>
              </div>
            ))}
            {filtered.length===0&&<EmptyState icon="invoice" title={searchQ||filterStatus!=="all"?"No invoices match":"No invoices yet"} sub={searchQ||filterStatus!=="all"?"Try adjusting your search or filter":"Create your first invoice to get started"} action={searchQ||filterStatus!=="all"?undefined:()=>setShowForm(true)} actionLabel="New Invoice" />}
          </div>
          )
        ) : (
        <div className="tw" style={{overflowX:"clip"}}><table style={{minWidth:1000}}><thead className="inv-thead"><tr>
          <th style={{width:36}}><input type="checkbox" checked={selectedIds.size===filtered.length&&filtered.length>0} onChange={()=>toggleSelectAll()} style={{accentColor:"var(--blue)"}} /></th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("invoice_number")}>Invoice<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:3,opacity:0.4,flexShrink:0,verticalAlign:"middle"}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg></th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("customer")}>Customer<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:3,opacity:0.4,flexShrink:0,verticalAlign:"middle"}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg></th>
          <th className="hm" style={{cursor:"pointer"}} onClick={()=>sortToggle("invoice_date")}>Date<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:3,opacity:0.4,flexShrink:0,verticalAlign:"middle"}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg></th>
          <th className="hm">Due</th>
          <th style={{cursor:"pointer"}} onClick={()=>sortToggle("amount")}>Amount<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:3,opacity:0.4,flexShrink:0,verticalAlign:"middle"}}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg></th>
          <th>Status</th>
          <th className="hm">Agent</th>
          <th className="hm">Updated</th>
          <th style={{textAlign:"right"}}>Actions</th>
        </tr></thead><tbody>
          {filtered.map(inv => (
            <tr key={inv.id} className="inv-tr" onClick={() => setViewInvoice(inv)}>
              <td style={{width:36}}><input type="checkbox" checked={selectedIds.has(inv.id)} onChange={e=>{e.stopPropagation();toggleSelect(inv.id);}} style={{accentColor:"var(--blue)"}} /></td>
              <td><span className="mono" style={{color:"var(--blue)",fontSize:12,fontWeight:600,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}} onClick={()=>setViewInvoice(inv)}>{inv.invoice_number}</span></td>
              <td>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div className="c-av hm" style={{background:["#dd2b0f","#1a7f37","#f59e0b","#201e1d","#ae1800"][inv.customer?.charCodeAt(0)%5]||"#dd2b0f",flexShrink:0}}>{inv.customer?.[0]?.toUpperCase()}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{inv.customer}</div>
                    {contacts.find(x=>x.name===inv.customer)?.email
                      ? <div style={{fontSize:11,color:"var(--text3)"}}>{contacts.find(x=>x.name===inv.customer).email}</div>
                      : <div style={{fontSize:11,color:"#94a3b8"}}>No email</div>}
                  </div>
                </div>
              </td>
              <td className="hm" style={{fontSize:12,color:"var(--text2)"}}>{fmtShort(inv.invoice_date)}</td>
              <td className="hm">{(() => {
                if (!inv.due_date) return <span style={{fontSize:12,color:"var(--text3)"}}>—</span>;
                const dd = dueDelta(inv.due_date);
                if (inv.status==="paid") return <span style={{fontSize:12,color:"var(--text3)"}}>{fmtShort(inv.due_date)}</span>;
                if (dd < 0) return <span style={{fontSize:12,fontWeight:600,color:"var(--red)"}}>{fmtShort(inv.due_date)}<span style={{fontSize:10,marginLeft:3}}>↑{Math.abs(dd)}d</span></span>;
                if (dd <= 3) return <span style={{fontSize:12,fontWeight:600,color:"var(--amber)"}}>{fmtShort(inv.due_date)}<span style={{fontSize:10,marginLeft:3}}>{dd}d</span></span>;
                return <span style={{fontSize:12,color:"var(--text2)"}}>{fmtShort(inv.due_date)}</span>;
              })()}</td>
              <td>
                <div className="mono" style={{fontWeight:600,fontSize:13}}>{fmt(inv.amount)}</div>
                {inv.status==="partial"&&(
                  <div style={{marginTop:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text3)",marginBottom:3}}>
                      <span style={{color:"#16a34a"}}>£{(inv.amount_paid||0).toFixed(2)} paid</span>
                      <span style={{color:"var(--red)"}}>£{(inv.balance||0).toFixed(2)} owing</span>
                    </div>
                    <div style={{height:3,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:inv.amount>0?Math.round((inv.amount_paid||0)/inv.amount*100)+"%":"0%",background:"#16a34a",borderRadius:2}} />
                    </div>
                  </div>
                )}
                {inv.payment_method&&inv.status==="paid"&&<div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{inv.payment_method==="cash"?"💵":inv.payment_method==="bank"?"🏦":inv.payment_method==="card"?"💳":"📝"} {inv.payment_method}</div>}
              </td>
              <td><span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span></td>
              <td className="hm">{(()=>{
                const agent=(allProfiles||[]).find(p=>p.id===inv.created_by);
                const aname=agent?.full_name||"—";
                const col=["#dd2b0f","#1a7f37","#f59e0b","#201e1d","#ae1800","#8a8580","#57534e"][aname.charCodeAt(0)%7]||"#64748b";
                return <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:20,background:"var(--bg)",fontSize:11,color:"var(--text2)",fontWeight:500}}>
                  <div style={{width:16,height:16,borderRadius:0,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{aname[0]?.toUpperCase()||"?"}</div>
                  {aname.split(" ")[0]}
                </div>;
              })()}</td>
              <td className="hm">{(()=>{
                const r=fmtRelative(inv.updated_at||inv.created_at);
                return <div style={{fontSize:11,color:"var(--text3)",lineHeight:1.5}}><div>{r.line1}</div><div>{r.line2}</div></div>;
              })()}</td>
              <td style={{textAlign:"right",whiteSpace:"nowrap"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                  <button onClick={()=>setViewInvoice(inv)} title="View" className="bicon" style={{width:28,height:28,borderRadius:6,border:"1px solid var(--blue-lt)",background:"var(--blue-lt)",color:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button onClick={()=>printDNFromInvoice(inv)} title="Delivery note" className="bicon" style={{width:28,height:28,borderRadius:6,border:"1px solid var(--border)",background:"var(--white)",color:"var(--text2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  </button>
                  {profile?.role==="admin"&&inv.status!=="paid"&&(
                    payingId===inv.id?(
                      <div style={{display:"flex",gap:3,alignItems:"center"}}>
                        <select style={{padding:"3px 5px",fontSize:11,border:"1px solid var(--border)",borderRadius:6,outline:"none",background:"var(--white)",color:"var(--text)"}} value={payMethod[inv.id]||"cash"} onChange={e=>setPayMethod(prev=>({...prev,[inv.id]:e.target.value}))}>
                          <option value="cash">💵 Cash</option><option value="bank">🏦 Bank</option><option value="card">💳 Card</option>
                        </select>
                        <button onClick={()=>markPaid(inv.id,payMethod[inv.id]||"cash")} style={{padding:"4px 8px",borderRadius:6,background:"#16a34a",color:"#fff",border:"none",fontSize:11,fontWeight:600,cursor:"pointer"}}>✓</button>
                        <button onClick={()=>setPayingId(null)} style={{padding:"4px 6px",borderRadius:6,background:"var(--bg)",color:"var(--text2)",border:"1px solid var(--border)",fontSize:11,cursor:"pointer"}}>✕</button>
                      </div>
                    ):(
                      <button onClick={()=>setPayingId(inv.id)} title="Mark paid" className="bicon" style={{width:28,height:28,borderRadius:6,border:"1px solid #bbf7d0",background:"#f0fdf4",color:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    )
                  )}
                  {profile?.role==="admin"&&(
                    <button onClick={()=>deleteInvoice(inv)} title="Delete" className="bicon" style={{width:28,height:28,borderRadius:6,border:"1px solid #fecaca",background:"#fef2f2",color:"var(--red)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={10}><EmptyState icon="invoice" title={searchQ || filterStatus !== "all" ? "No invoices match" : "No invoices yet"} sub={searchQ || filterStatus !== "all" ? "Try adjusting your search or filter" : "Create your first VAT invoice to get started"} action={searchQ||filterStatus!=="all"?undefined:()=>setShowForm(true)} actionLabel="New Invoice" /></td></tr>}
        </tbody></table></div>
        )}
      </div>
    </div>
  );
}

