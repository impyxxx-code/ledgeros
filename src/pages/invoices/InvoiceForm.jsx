import React, { useState, useEffect, useRef } from "react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/supabase.js";
import { fmt, fmtDate, fmtShort, fmtTime, fmtRelative, dueDelta, today, isMobile, escHtml, DEFAULT_REORDER } from "../../lib/utils.js";
import { sendEmail, buildInvoiceEmailHtml, buildReminderEmailHtml, buildDNEmailHtml } from "../../lib/email.js";
import { logAudit } from "../../lib/audit.js";
import { ModalPortal, SkeletonTable, EmptyState } from "../../components/ui.jsx";
import { SearchDropdown } from "../../components/SearchDropdown.jsx";
import { COMPANY, LOGO, JSPDF_URL, toast } from "../../lib/constants.js";

// ── INVOICE FORM ──────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ InvoiceForm                                                │
// │ Create new invoice form with line items and VAT            │
// └────────────────────────────────────────────────────────────┘
export function InvoiceForm({ contacts, products, token, userId, onSave, onClose, invoices = [] }) {
  const [f, setF] = useState({ customer: "", invoice_date: today(), due_date: "", status: "pending", notes: "" });
  const [lines, setLines] = useState([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null); // ← success state
  const [creatingDN, setCreatingDN] = useState(false);
  const [dnSaved, setDnSaved] = useState(false);
  const [dnDriver, setDnDriver] = useState("");
  const [dnAddress, setDnAddress] = useState("");
  const [dnNotes, setDnNotes] = useState("");
  const [localContacts, setLocalContacts] = useState(contacts);

  const quickAddCustomer = async (name) => {
    const data = await sb.post(token, "contacts", { name, type: "customer", created_by: userId });
    if (data[0]) {
      setLocalContacts(prev => [...prev, data[0]]);
      setF(prev => ({ ...prev, customer: name }));
      logAudit(token, userId, "contact_created", "contact", data[0].id, `${name} quick-added from invoice form`);
      toast.success(`${name} added as customer`);
    } else { toast.error("Failed to create customer"); }
  };
  const [mobPickerOpen, setMobPickerOpen] = useState(false);
  const [mobPickerSearch, setMobPickerSearch] = useState("");

  const customers = localContacts.filter(c => c.type === "customer" || c.type === "both");

  const updateLine = (i, field, val) => {
    const next = [...lines];
    if (field === "product_id") { const p = products.find(x => x.id === val); next[i] = { ...next[i], product_id: val, description: p?.name || "", unit_price: p?.sale_price || "", vat_rate: p?.vat_rate ?? 20, unit: p?.unit || "unit" }; }
    else next[i] = { ...next[i], [field]: val };
    setLines(next);
  };

  const subtotal = lines.reduce((s, l) => s + ((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0)), 0);
  const vatTotal = lines.reduce((s, l) => s + ((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0) * ((parseFloat(l.vat_rate) || 0) / 100)), 0);
  const total = subtotal + vatTotal;

  const save = async () => {
    setSubmitted(true);
    if (!f.customer) return;
    const amendedLines = lines.filter(l => l.price_amended && l.description);
    setSaving(true);
    // Safety net — if anything hangs >15s on mobile network, reset button
    const saveTimeout = setTimeout(() => {
      setSaving(false);
      toast.error("Request timed out. Check your connection and try again.");
    }, 15000);
    try {
      const existing = await sb.get(token, "invoices", "select=invoice_number&order=invoice_number.desc&limit=1");
      let nextNum = 1;
      if (Array.isArray(existing) && existing.length > 0 && existing[0].invoice_number) {
        const lastNum = parseInt(existing[0].invoice_number.replace("INV-", ""), 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      const invoice_number = `INV-${String(nextNum).padStart(4, "0")}`;
      const inv = await sb.post(token, "invoices", {
        customer: f.customer, invoice_date: f.invoice_date, due_date: f.due_date || f.invoice_date || null,
        status: f.status,
        notes: [f.notes, amendedLines.length ? `⚠️ Price amended by user on: ${amendedLines.map(l => l.description).join(", ")}` : null].filter(Boolean).join("\n") || null,
        amount: total, subtotal, vat_total: vatTotal, balance: total, amount_paid: 0, invoice_number, created_by: userId,
        lines: JSON.stringify(lines.filter(l => l.description && l.description.trim() !== ""))
      });
      if (inv && inv[0]) {
        const fullInv = { ...inv[0], lines };
        onSave(fullInv);
        logAudit(token, userId, "invoice_created", "invoice", inv[0].id, `Invoice ${invoice_number} created for ${f.customer} — ${new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(total)}`);
        // Pre-fill DN fields from customer contact
        const cust = contacts.find(c => c.name === f.customer);
        setDnAddress([cust?.address, cust?.city, cust?.postcode].filter(Boolean).join(", "));
        setDnNotes(f.notes || "");
        setSavedInvoice(fullInv);
      } else {
        const errMsg = inv?.message || inv?.error || inv?.msg || "Failed to save invoice";
        toast.error(errMsg + ". Please try again.");
      }
    } catch (err) {
      console.error("Invoice save error:", err);
      toast.error("Network error — check your connection and try again.");
    } finally {
      clearTimeout(saveTimeout);
      setSaving(false);
    }
  };

  // Print the saved invoice as HTML download
  const printInvoice = async () => {
    if (!savedInvoice) return;
    const invLines = savedInvoice.lines || [];
    const sub = invLines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
    const vat = invLines.reduce((s, l) => s + (l.qty * l.unit_price * (l.vat_rate / 100)), 0);
    const tot = sub + vat;
    const contactRecord = contacts.find(c => c.name === savedInvoice.customer);
    const totalOutstanding = parseFloat(contactRecord?.total_outstanding || 0);
    let overdueInvs = [];
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/invoices?customer=eq.${encodeURIComponent(savedInvoice.customer)}&status=in.(overdue,pending,partial)&order=invoice_date.asc&select=invoice_number,invoice_date,amount,amount_paid,balance,status`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) overdueInvs = data.filter(i => i.invoice_number !== savedInvoice.invoice_number);
    } catch(e) { overdueInvs = []; }
    const fmtV = v => '£' + parseFloat(v||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    const badgeMap = { overdue: '<span class="overdue-badge">Overdue</span>', partial: '<span class="partial-badge">Partial</span>', pending: '<span class="pending-badge">Pending</span>' };
    const overdueSection = (overdueInvs.length > 0 || totalOutstanding > 0) ? `
      <div class="os-section">
        <div class="os-hdr">
          <div class="os-lbl">Outstanding account balance</div>
          <div class="os-total">${fmtV(totalOutstanding)} outstanding</div>
        </div>
        <table class="os-table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Balance</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>${overdueInvs.map(i => `<tr><td style="font-weight:600">${i.invoice_number}</td><td>${fmtD(i.invoice_date)}</td><td>${fmtV(i.amount)}</td><td style="font-weight:700;color:#dc2626">${fmtV(i.balance)}</td><td>${daysSince(i.invoice_date)}d</td><td>${badgeMap[i.status]||i.status}</td></tr>`).join('')}</tbody>
        </table>
        <div class="os-notice">⚠ This account has outstanding balances. Payment is required before further credit can be extended. Goods remain the property of Arkham Retail Ltd until all invoices are paid in full.</div>
      </div>` : '';
    const html = `<!DOCTYPE html><html><head><title>${savedInvoice.invoice_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;padding:30mm 20mm 20mm;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent-bar{height:5px;background:linear-gradient(90deg,#1e1b4b 0%,#4f46e5 60%,#818cf8 100%);margin:-30mm -20mm 0}.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 0 20px;border-bottom:.5px solid #e2e8f0;margin-bottom:20px}.logo-wrap{display:flex;align-items:center;gap:14px;flex:1;min-width:0}.logo-box{width:160px;height:110px;display:flex;align-items:center;justify-content:flex-start;flex-shrink:0}.logo-box img{width:100%;height:100%;object-fit:contain;object-position:left}.co-name{font-size:15px;font-weight:700;color:#0f172a}.co-det{font-size:10.5px;color:#64748b;line-height:1.6;margin-top:2px;word-break:break-word}.inv-title{font-size:30px;font-weight:900;color:#1e1b4b;letter-spacing:2px;text-align:right;line-height:1}.inv-num{font-size:16px;font-weight:800;text-align:right;color:#0f172a;margin-top:2px}.inv-status{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;background:#fef3c7;color:#92400e;border:.5px solid #fcd34d}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.meta-dk{background:#1e1b4b;border-radius:8px;padding:14px 16px}.meta-dk .lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}.meta-dk .val{font-size:18px;font-weight:700;color:#fff;line-height:1.2}.meta-dk .sub{font-size:11px;color:rgba(255,255,255,.5);margin-top:4px}.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mbox{background:#f8fafc;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 12px}.mbox .lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.mbox .val{font-size:12px;font-weight:600;color:#0f172a}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#1e1b4b}th{padding:9px 12px;font-size:9px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;text-align:left}th:first-child{border-radius:6px 0 0 6px}th:last-child{border-radius:0 6px 6px 0;text-align:right}td{padding:11px 12px;border-bottom:.5px solid #f1f5f9;font-size:12px}tr:last-child td{border-bottom:none}td:last-child{text-align:right;font-weight:600}.totals{width:260px;margin-left:auto;margin-bottom:20px}.tr{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#64748b}.tr span:last-child{color:#0f172a}.tt{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;border-top:.5px solid #e2e8f0;margin-top:4px}.bb{background:#1e1b4b;border-radius:8px;padding:12px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center}.bb-l{color:rgba(255,255,255,.5);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}.bb-v{color:#fff;font-size:18px;font-weight:800}.nb{background:#fef9ec;border:.5px solid #fcd34d;border-radius:8px;padding:12px 14px;margin-bottom:14px}.nb .lbl{font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.nb .val{font-size:12px;color:#78350f;line-height:1.6}.tb{border:.5px solid #e2e8f0;border-left:3px solid #4f46e5;border-radius:0 8px 8px 0;padding:12px 14px;background:#f8fafc;margin-bottom:14px}.tb .lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}.tb .val{font-size:11px;color:#64748b;line-height:1.7}.bank{background:#f8fafc;border:.5px solid #e2e8f0;padding:12px 16px;border-radius:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px}.bank .lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.bank .val{font-size:12px;font-weight:700;color:#0f172a}.footer-box{border:.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:9px;color:#64748b;line-height:1.8}.footer-box b{color:#475569}.bta{position:fixed;top:0;left:0;right:0;z-index:9999;background:#0d1829;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,.4)}.bta a{width:36px;height:36px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:300;text-decoration:none;cursor:pointer;flex-shrink:0;line-height:1}.bta a:hover{background:rgba(255,255,255,.22)}.bta-l{font-size:13px;color:rgba(255,255,255,.5);margin-top:2px}.bta-t{font-size:16px;font-weight:700;color:#fff}body{padding-top:calc(30mm + 54px)}.os-section{margin-top:24px;margin-bottom:20px}.os-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.os-lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px}.os-total{background:#fee2e2;border:.5px solid #fca5a5;border-radius:8px;padding:4px 14px;font-size:13px;font-weight:700;color:#991b1b}.os-table{width:100%;border-collapse:collapse;margin-bottom:12px}.os-table thead tr{background:#f8fafc;border-bottom:.5px solid #e2e8f0}.os-table th{padding:6px 8px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;text-align:left;border-radius:0}.os-table td{padding:7px 8px;border-bottom:.5px solid #f8fafc;font-size:11px}.os-table tr:last-child td{border-bottom:none}.overdue-badge{background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.partial-badge{background:#ede9fe;color:#5b21b6;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.pending-badge{background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.os-notice{border:.5px solid #fca5a5;border-left:3px solid #dc2626;border-radius:0 8px 8px 0;padding:10px 14px;background:#fff7f7;margin-bottom:20px;font-size:11px;color:#991b1b;line-height:1.6}@media print{.bta{display:none!important}body{padding-top:0!important}}</style></head><body><div class="bta"><div><div class="bta-t">LedgerOS</div><div class="bta-l">Arkham Retail Ltd</div></div><a href="#" onclick="try{if(window.opener&&window.opener.__closePrintWin){window.opener.__closePrintWin();return;}if(window.opener){window.opener.postMessage('__ledgeros_close__','*');}window.close();}catch(e){window.close();}">&#x2715;</a></div><div class="accent-bar"></div><div class="hdr"><div class="logo-wrap"><div class="logo-box"><img src="${LOGO}" alt="Arkham Retail"/></div></div><div style="text-align:right;flex-shrink:0;max-width:160px"><div class="inv-title">INVOICE</div><div class="inv-status">${(savedInvoice.status||'pending').toUpperCase()}</div></div></div><div class="meta"><div class="meta-dk"><div class="lbl">Invoice to</div><div class="val">${escHtml(savedInvoice.customer)}</div></div><div class="mgrid"><div class="mbox"><div class="lbl">Invoice #</div><div class="val">${savedInvoice.invoice_number}</div></div><div class="mbox"><div class="lbl">Invoice date</div><div class="val">${fmtDate(savedInvoice.invoice_date)}</div></div><div class="mbox"><div class="lbl">Due date</div><div class="val">${fmtDate(savedInvoice.due_date)}</div></div><div class="mbox"><div class="lbl">Terms</div><div class="val">Due on receipt</div></div></div></div><table><thead><tr><th style="width:40%">Description</th><th style="text-align:center">VAT</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th>Amount</th></tr></thead><tbody>${invLines.map(l=>`<tr><td style="font-weight:600">${escHtml(l.description)}</td><td style="text-align:center;color:#94a3b8">${l.vat_rate===0?'Exempt':l.vat_rate+'% S'}</td><td style="text-align:right">${escHtml(String(l.qty))}</td><td style="text-align:right">${fmt(l.unit_price)}</td><td>${fmt(l.qty*l.unit_price)}</td></tr>`).join('')}</tbody></table><div class="totals"><div class="tr"><span>Subtotal</span><span>${fmt(sub)}</span></div><div class="tr"><span>VAT total</span><span>${fmt(vat)}</span></div><div class="tt"><span>Total</span><span>${fmt(tot)}</span></div><div class="bb"><span class="bb-l">Balance due</span><span class="bb-v">${fmt(tot)}</span></div></div>${overdueSection}${savedInvoice.notes?'<div class="nb"><div class="lbl">Notes</div><div class="val">'+escHtml(savedInvoice.notes)+'</div></div>':""} <div class="tb"><div class="lbl">Payment terms</div><div class="val">Payment due within 7 days of invoice date unless otherwise agreed in writing. Late payments may be subject to interest and recovery costs in accordance with the Late Payment of Commercial Debts (Interest) Act 1998. Goods remain the property of Arkham Retail Ltd until paid for in full.</div></div><div class="bank"><div><div class="lbl">Bank</div><div class="val">${COMPANY.bankName}</div></div><div><div class="lbl">Sort code</div><div class="val">${COMPANY.sortCode}</div></div><div><div class="lbl">Account</div><div class="val">${COMPANY.accountNumber}</div></div></div><div class="footer-box"><div><b>${COMPANY.name}</b> &middot; ${COMPANY.address}, ${COMPANY.address2}, ${COMPANY.city}, ${COMPANY.county}, ${COMPANY.postcode}</div><div>VAT: ${COMPANY.vatNumber} &middot; Tel: ${COMPANY.phone} &middot; ${COMPANY.email}</div></div></body></html>`;
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  const downloadInvoicePDF = () => {
    const html = buildInvoiceHtml();
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  // Create delivery note from invoice
  const createDeliveryNote = async () => {
    if (!savedInvoice) return;
    setCreatingDN(true);
    const existing = await sb.get(token, "delivery_notes", "select=id");
    const count = Array.isArray(existing) ? existing.length + 1 : 1;
    const dn_number = `DN-${String(count).padStart(4, "0")}`;
    const dnLines = (savedInvoice.lines || []).map(l => ({
      description: l.description, qty: l.qty, unit: l.unit || "unit", product_id: l.product_id || null
    }));
    const cust = contacts.find(c => c.name === savedInvoice.customer);
    await sb.post(token, "delivery_notes", {
      dn_number, customer_name: savedInvoice.customer,
      customer_id: cust?.id || null,
      delivery_date: savedInvoice.invoice_date,
      delivery_address: dnAddress,
      driver: dnDriver, notes: dnNotes,
      status: "pending",
      invoice_ref: savedInvoice.invoice_number,
      lines: JSON.stringify(dnLines),
      created_by: userId
    });
    setCreatingDN(false);
    setDnSaved({ dn_number, customer_name: savedInvoice.customer, delivery_date: savedInvoice.invoice_date, delivery_address: dnAddress, driver: dnDriver, notes: dnNotes, invoice_ref: savedInvoice.invoice_number, lines: JSON.stringify(dnLines) });
  };

  const buildDNHtml = (dn, overdueSection = '') => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${dn.dn_number} — Delivery Note</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#0a0f1e;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:780px;margin:0 auto;padding:32px 36px}

  /* Header */
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:3px solid #0a0f1e;margin-bottom:28px}
  .logo-wrap img{height:52px;object-fit:contain}
  .co-detail{font-size:10px;color:#64748b;line-height:1.8;margin-top:8px}
  .doc-title-wrap{text-align:right}
  .doc-title{font-size:42px;font-weight:900;color:#e8edf4;letter-spacing:-2px;line-height:1}
  .doc-num{font-size:18px;font-weight:800;color:#0a0f1e;margin-top:4px;letter-spacing:-.5px}
  .status-pill{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe}
  .inv-badge{display:inline-block;margin-top:6px;padding:3px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;font-weight:600;color:#64748b}

  /* Meta grid */
  .meta-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:16px;margin-bottom:28px}
  .meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
  .meta-box.accent{background:#0a0f1e;border-color:#0a0f1e}
  .meta-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}
  .meta-lbl.light{color:rgba(255,255,255,.45)}
  .meta-val{font-size:14px;font-weight:700;color:#0a0f1e}
  .meta-val.large{font-size:20px;letter-spacing:-.3px}
  .meta-val.light{color:#fff}
  .meta-val.addr{font-size:12px;font-weight:500;color:#475569;margin-top:4px;line-height:1.6}
  .meta-sub-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}

  /* Table */
  .table-wrap{margin-bottom:28px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#0a0f1e}
  th{padding:12px 16px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#fff;text-align:left}
  th.center{text-align:center}
  td{padding:13px 16px;font-size:13px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:nth-child(even) td{background:#fafbfd}
  .td-desc{font-weight:600;color:#0a0f1e}
  .td-unit{color:#94a3b8;font-size:11px;font-weight:500}
  .td-qty{text-align:center;font-weight:800;font-size:16px;color:#2563eb}
  .td-blank{text-align:center;color:#cbd5e1;font-size:18px}

  /* Signature */
  .sig-section{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px;padding-top:24px;border-top:2px solid #f1f5f9}
  .sig-box{border-bottom:2px solid #0a0f1e;height:64px;margin-bottom:8px;border-radius:2px;background:linear-gradient(to bottom,#fafbfd,#fff)}
  .sig-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}

  /* Notes */
  .notes-box{background:#fef9ec;border:1px solid #fcd34d;border-radius:10px;padding:14px 16px;margin-bottom:24px}
  .notes-lbl{font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}
  .notes-val{font-size:12px;color:#78350f;line-height:1.6}

  /* Footer */
  .footer-box{margin-top:28px;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:9px;color:#64748b;line-height:1.8}
  .footer-box b{color:#475569}

  /* Outstanding balance section */
  .os-section{margin-top:24px;margin-bottom:20px}.os-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.os-lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px}.os-total{background:#fee2e2;border:.5px solid #fca5a5;border-radius:8px;padding:4px 14px;font-size:13px;font-weight:700;color:#991b1b}.os-table{width:100%;border-collapse:collapse;margin-bottom:12px}.os-table thead tr{background:#f8fafc;border-bottom:.5px solid #e2e8f0}.os-table th{padding:6px 8px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;text-align:left}.os-table td{padding:7px 8px;border-bottom:.5px solid #f8fafc;font-size:11px}.os-table tr:last-child td{border-bottom:none}.overdue-badge{background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.partial-badge{background:#ede9fe;color:#5b21b6;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.pending-badge{background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.os-notice{border:.5px solid #fca5a5;border-left:3px solid #dc2626;border-radius:0 8px 8px 0;padding:10px 14px;background:#fff7f7;margin-bottom:20px;font-size:11px;color:#991b1b;line-height:1.6}

  /* Driver strip */
  .driver-strip{background:#f0f4ff;border:1px solid #c7d7fc;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px}
  .driver-icon{width:34px;height:34px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .driver-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:2px}
  .driver-name{font-size:14px;font-weight:700;color:#1e40af}

  @media print{
    body{padding:0}
    .page{max-width:100%;padding:20px 24px}
  }
.bta{position:fixed;top:0;left:0;right:0;z-index:9999;background:#0d1829;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,.4)}.bta a{width:36px;height:36px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:300;text-decoration:none;cursor:pointer;flex-shrink:0;line-height:1}.bta a:hover{background:rgba(255,255,255,.22)}.bta-l{font-size:13px;color:rgba(255,255,255,.5);margin-top:2px}.bta-t{font-size:16px;font-weight:700;color:#fff}body{padding-top:calc(30mm + 54px)}@media print{.bta{display:none!important}body{padding-top:0!important}}</style>
</head>
<body><div class="bta"><div><div class="bta-t">LedgerOS</div><div class="bta-l">Arkham Retail Ltd</div></div><a href="#" onclick="try{if(window.opener&&window.opener.__closePrintWin){window.opener.__closePrintWin();return;}if(window.opener){window.opener.postMessage('__ledgeros_close__','*');}window.close();}catch(e){window.close();}">&#x2715;</a></div>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-wrap"><img src="${LOGO}" alt="Arkham Retail" style="height:80px;object-fit:contain;object-position:left"/></div>
    <div class="doc-title-wrap">
      <div class="doc-title">DELIVERY</div>
      <div style="font-size:42px;font-weight:900;color:#e8edf4;letter-spacing:-2px;line-height:1">NOTE</div>
      <div class="doc-num">${dn.dn_number}</div>
      ${dn.invoice_ref ? "<div class=\"inv-badge\">📄 Invoice: "+dn.invoice_ref+"</div>" : ""}
      <div class="status-pill">${dn.status?.toUpperCase() || "PENDING"}</div>
    </div>
  </div>

  <!-- Driver strip -->
  ${dn.driver ? "<div class=\"driver-strip\"><div class=\"driver-icon\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"1\" y=\"3\" width=\"15\" height=\"13\"/><path d=\"M16 8h4l3 5v3h-7V8z\"/><circle cx=\"5.5\" cy=\"18.5\" r=\"2.5\"/><circle cx=\"18.5\" cy=\"18.5\" r=\"2.5\"/></svg></div><div><div class=\"driver-label\">Driver / Courier</div><div class=\"driver-name\">" + dn.driver + "</div></div></div>" : ""}


  <!-- Meta -->
  <div class="meta-grid">
    <div class="meta-box accent">
      <div class="meta-lbl light">Deliver To</div>
      <div class="meta-val large light">${dn.customer_name}</div>
      ${dn.delivery_address ? "<div class='meta-val addr' style='color:rgba(255,255,255,.55)'>"+dn.delivery_address+"</div>" : ""}
    </div>
    <div class="meta-sub-grid">
      <div class="meta-box"><div class="meta-lbl">DN Number</div><div class="meta-val">${dn.dn_number}</div></div>
      <div class="meta-box"><div class="meta-lbl">Date</div><div class="meta-val">${new Date(dn.delivery_date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div></div>
      <div class="meta-box"><div class="meta-lbl">Invoice Ref</div><div class="meta-val">${dn.invoice_ref || "—"}</div></div>
      <div class="meta-box"><div class="meta-lbl">Items</div><div class="meta-val">${dnLines.length} line${dnLines.length !== 1 ? "s" : ""}</div></div>
    </div>
  </div>

  <!-- Notes -->
  ${dn.notes ? "<div class=\"notes-box\"><div class=\"notes-lbl\">⚡ Delivery Instructions</div><div class=\"notes-val\">"+dn.notes+"</div></div>" : ""}

  <!-- Items table -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:45%">Description</th>
          <th>Unit</th>
          <th class="center">Qty Ordered</th>
          <th class="center">Qty Delivered</th>
          <th class="center">Condition</th>
        </tr>
      </thead>
      <tbody>
        ${dnLines.map(l => "<tr><td class=\"td-desc\">" + (l.description || "—") + "</td><td class=\"td-unit\">" + (l.unit || "unit") + "</td><td class=\"td-qty\">" + l.qty + "</td><td class=\"td-blank\">____</td><td class=\"td-blank\">____</td></tr>").join("")}


      </tbody>
    </table>
  </div>

  <!-- Outstanding balance -->
  ${overdueSection}

  <!-- Notes -->
  ${dn.notes ? `<div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:9px;padding:12px 16px;margin-bottom:20px"><div style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Invoice Notes</div><div style="font-size:12px;color:#78350f;line-height:1.6">${dn.notes}</div></div>` : ""}
  <!-- Signatures -->
  <div class="sig-section">
    <div>
      <div class="sig-box"></div>
      <div class="sig-lbl">✍ Delivered by — Signature &amp; Full Name</div>
    </div>
    <div>
      <div class="sig-box"></div>
      <div class="sig-lbl">✍ Received by — Signature, Name &amp; Date</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer-box"><div><b>Arkham Retail Ltd</b> &middot; 2 Fieldhead Street, Fieldhead Business Centre, Bradford, West Yorkshire, BD7 1LW</div><div>VAT: GB462229106 &middot; Tel: 07801 567209 / 07851 983151 &middot; ARKHAMRETAIL@GMAIL.COM</div></div>

</div>
</body>
</html>`;
  };
  const downloadDN = (dn) => {
    const blob = new Blob([buildDNHtml(dn)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${dn.dn_number}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const printDNFromForm = async (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const contactRecord = contacts.find(c => c.name === dn.customer_name);
    const totalOutstanding = parseFloat(contactRecord?.total_outstanding || 0);
    let overdueInvs = [];
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/invoices?customer=eq.${encodeURIComponent(dn.customer_name)}&status=in.(overdue,pending,partial)&order=invoice_date.asc&select=invoice_number,invoice_date,amount,amount_paid,balance,status`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) overdueInvs = data;
    } catch(e) { overdueInvs = []; }
    const fmtV = v => '£' + parseFloat(v||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    const deliveryTotal = dnLines.reduce((s,l) => s + (parseFloat(l.unit_price||0) * parseFloat(l.qty||0)), 0);
    const hasPrice = dnLines.some(l => l.unit_price);
    const badgeMap = {
      overdue: '<span class="overdue-badge">Overdue</span>',
      partial: '<span class="partial-badge">Partial</span>',
      pending: '<span class="pending-badge">Pending</span>',
    };
    const overdueSection = (overdueInvs.length > 0 || totalOutstanding > 0) ? `
      <div class="os-section">
        <div class="os-hdr">
          <div class="os-lbl">Outstanding account balance</div>
          <div class="os-total">${fmtV(totalOutstanding)} overdue</div>
        </div>
        <table class="os-table">
          <thead><tr>
            <th>Invoice</th><th>Date</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance</th><th style="text-align:right">Days</th><th style="text-align:center">Status</th>
          </tr></thead>
          <tbody>
            ${overdueInvs.map(i => `<tr>
              <td style="font-weight:600">${i.invoice_number}</td>
              <td style="color:#64748b">${fmtD(i.invoice_date)}</td>
              <td style="text-align:right">${fmtV(i.amount)}</td>
              <td style="text-align:right;font-weight:600;color:#991b1b">${fmtV(i.balance||i.amount)}</td>
              <td style="text-align:right;color:#991b1b">${daysSince(i.invoice_date)}d</td>
              <td style="text-align:center">${badgeMap[i.status]||''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="os-notice">Goods are delivered subject to full payment of all outstanding balances. Please arrange settlement of overdue invoices immediately. Continued supply may be withheld until account is brought up to date.</div>
      </div>` : '';
    const html = buildDNHtml(dn, overdueSection);
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  const emailDN = async (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const cust = contacts.find(c => c.name === dn.customer_name);
    const toEmail = cust?.email;
    if (!toEmail) {
      toast.warn(`No email address found for ${dn.customer_name}. Please add one in Customers first.`);
      return;
    }
    const html = buildDNEmailHtml(dn, dnLines);
    const result = await sendEmail({
      to: toEmail,
      subject: `Delivery Note ${dn.dn_number} — ${COMPANY.name}`,
      html, token
    });
    if (result.success) toast.success("Delivery note emailed successfully");
    else toast.error("Failed to send email. Please try again.");
  };

  const whatsappDN = (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const cust = contacts.find(c => c.name === dn.customer_name);
    const msg = encodeURIComponent(
      `*Delivery Note — ${COMPANY.name}*\n\n` +
      `DN: *${dn.dn_number}*\n` +
      (dn.invoice_ref ? `Invoice Ref: ${dn.invoice_ref}\n` : "") +
      `Customer: ${dn.customer_name}\n` +
      `Date: ${fmtDate(dn.delivery_date)}\n` +
      (dn.driver ? `Driver: ${dn.driver}\n` : "") +
      (dn.delivery_address ? `Address: ${dn.delivery_address}\n` : "") +
      `\n*Items:*\n` +
      dnLines.map(l => { const s = l.description && l.description.includes(':') ? l.description.split(':').pop().trim() : (l.description || ''); const short = s.length > 22 ? s.slice(0,22)+'\u2026' : s; return `• ${short} — Qty: ${l.qty} ${l.unit || 'unit'}`; }).join("\n") +
      (dn.notes ? `\n\n📋 Instructions: ${dn.notes}` : "") +
      `\n\nPlease confirm receipt. Thank you! 🙏\n${COMPANY.phone}`
    );
    const phone = (cust?.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    else window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  // Build a quick DN object from invoice for immediate printing (no DB save needed)
  const buildQuickDN = () => {
    const dnLines = (savedInvoice.lines || []).map(l => ({
      description: l.description, qty: l.qty, unit: l.unit || "unit"
    }));
    return {
      dn_number: `DN-${savedInvoice.invoice_number.replace("INV-", "")}`,
      customer_name: savedInvoice.customer,
      delivery_date: savedInvoice.invoice_date,
      delivery_address: dnAddress,
      driver: dnDriver,
      notes: dnNotes,
      invoice_ref: savedInvoice.invoice_number,
      lines: JSON.stringify(dnLines)
    };
  };

  const downloadDNpdf = (html, dn_num) => {
    const mobWin = window.open('', '_blank');
    if (!mobWin) return;
    mobWin.document.write(html);
    mobWin.document.close();
    mobWin.focus();
    setTimeout(() => { mobWin.print(); }, 800);
  };

  // ── SUCCESS SCREEN ─────────────────────────────────────────────────────────
  if (savedInvoice) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>

        {/* ── Success banner ── */}
        <div style={{ background: "linear-gradient(135deg,#10b981,#059669)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: 26 }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Invoice Created Successfully!</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>{savedInvoice.invoice_number} · {savedInvoice.customer} · {fmt(savedInvoice.amount)}</div>
          </div>
          <button className="btn bsm" style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }} onClick={onClose}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Close</button>
        </div>

        {/* ── Main action screen (no DN yet) ── */}
        {!dnSaved && (
          <div style={{ padding: "24px 24px 20px" }}>

            {/* ── Back to LedgerOS — BIG prominent button ── */}
            <button onClick={onClose} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", background:"#0d1829", border:"none", borderRadius:12, padding:"18px 20px", cursor:"pointer", fontFamily:"var(--sans)", marginBottom:16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:"-.2px" }}>Back to Invoices</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:1 }}>Return to LedgerOS</div>
              </div>
            </button>

            {/* Step label */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 16 }}>Print Documents</div>

            {/* Two big print buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>

              {/* Print Invoice */}
              <button onClick={printInvoice} style={{ border: "2px solid var(--blue)", borderRadius: "var(--rl)", padding: "18px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", transition: "all .15s", fontFamily: "var(--sans)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--blue-lt)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <span style={{ color: "#fff", fontSize: 20 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--blue)", marginBottom: 3 }}>Print Invoice</div>
                <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>Download {savedInvoice.invoice_number} as a print-ready file</div>
              </button>

              {/* Print Delivery Note — immediate, no DB save required */}
              <button onClick={() => printDNFromForm(buildQuickDN())} style={{ border: "2px solid #0f172a", borderRadius: "var(--rl)", padding: "18px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", transition: "all .15s", fontFamily: "var(--sans)" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <span style={{ color: "#fff", fontSize: 20 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>Print Delivery Note</div>
                <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>Download DN for driver — pre-filled from this invoice</div>
              </button>
            </div>

            {/* DN extra fields — driver, address, notes before printing */}
            <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 12 }}>
                <span style={{ marginRight: 6 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>Delivery Note Details <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — updates the DN print)</span>
              </div>

              {/* Items preview */}
              <div style={{ marginBottom: 12 }}>
                {(savedInvoice.lines || []).map((l, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < (savedInvoice.lines.length - 1) ? "0.5px solid var(--border)" : "none" }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{l.description}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--blue)" }}>× {l.qty}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="fgrp">
                  <label>Driver / Courier</label>
                  <input value={dnDriver} onChange={e => setDnDriver(e.target.value)} placeholder="e.g. John Smith / DPD" />
                </div>
                <div className="fgrp">
                  <label>Delivery Address</label>
                  <input value={dnAddress} onChange={e => setDnAddress(e.target.value)} placeholder="Auto-filled from customer" />
                </div>
                <div className="fgrp" style={{ gridColumn: "1/-1" }}>
                  <label>Delivery Instructions</label>
                  <input value={dnNotes} onChange={e => setDnNotes(e.target.value)} placeholder="e.g. Leave at reception, call before delivery..." />
                </div>
              </div>
            </div>

            {/* Save to DB + share options */}
            <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Save & Share</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn bp" onClick={createDeliveryNote} disabled={creatingDN === true}
                  style={{ background: "#0f172a" }}>
                  {creatingDN === true
                    ? <><div className="spin" style={{ width: 13, height: 13, borderWidth: 2 }} />Saving...</>
                    : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save Delivery Note</>}
                </button>
                <button className="btn bo" onClick={() => emailDN(buildQuickDN())}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email DN</button>
                <button className="btn bwa" onClick={() => whatsappDN(buildQuickDN())}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp DN</button>
              </div>
            </div>
          </div>
        )}

        {/* ── DN saved confirmation ── */}
        {dnSaved && (
          <div style={{ padding: "24px 24px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "var(--rl)", padding: "16px 20px", marginBottom: 20 }}>
              <span style={{ color: "var(--green)", fontSize: 26, flexShrink: 0 }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green-dk)", marginBottom: 2 }}>Delivery Note {dnSaved.dn_number} Saved!</div>
                <div style={{ fontSize: 12, color: "var(--green-dk)", opacity: 0.8 }}>Saved to Delivery Notes. Print, email or WhatsApp below.</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <button onClick={printInvoice} style={{ border: "2px solid var(--blue)", borderRadius: "var(--rl)", padding: "14px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", fontFamily: "var(--sans)", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--blue-lt)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--blue)", fontSize: 20 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)" }}>Print Invoice</div><div style={{ fontSize: 11, color: "var(--text2)" }}>{savedInvoice.invoice_number}</div></div>
                </div>
              </button>
              <button onClick={() => printDNFromForm(dnSaved)} style={{ border: "2px solid #0f172a", borderRadius: "var(--rl)", padding: "14px 16px", cursor: "pointer", background: "var(--white)", textAlign: "left", fontFamily: "var(--sans)", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--white)"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#0f172a", fontSize: 20 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Print Delivery Note</div><div style={{ fontSize: 11, color: "var(--text2)" }}>{dnSaved.dn_number}</div></div>
                </div>
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <button className="btn bo" onClick={() => emailDN(dnSaved)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email DN</button>
              <button className="btn bwa" onClick={() => whatsappDN(dnSaved)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp DN</button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn bp" onClick={onClose}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Done</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── INVOICE FORM ───────────────────────────────────────────────────────────
  const mobView = isMobile();
  const mobCusts = contacts.filter(c => c.type === "customer" || c.type === "both");
  const mobRecent = products.slice(0, 6);
  const mobFiltered = mobPickerSearch
    ? products.filter(p => p.name.toLowerCase().includes(mobPickerSearch.toLowerCase()) || (p.code||"").toLowerCase().includes(mobPickerSearch.toLowerCase()))
    : mobRecent;
  const mobActiveLines = lines.filter(l => l.description);

  const mobAddProduct = async (p) => {
    const idx = lines.findIndex(l => l.product_id === p.id);
    if (idx >= 0) {
      const nxt = [...lines];
      nxt[idx] = { ...nxt[idx], qty: (parseFloat(nxt[idx].qty) || 0) + 1 };
      setLines(nxt);
    } else {
      // Check for customer-specific price first, same lookup as desktop
      let customPrice = null;
      const custName = f?.customer || f?.customer_name;
      if (custName) {
        const contact = localContacts?.find(c => c.name === custName);
        if (contact) {
          const prices = await sb.get(token, "customer_prices", `contact_id=eq.${contact.id}&product_id=eq.${p.id}`);
          if (Array.isArray(prices) && prices[0]) customPrice = prices[0].custom_price;
        }
      }
      const nl = { product_id: p.id, description: p.name, qty: 1, unit_price: customPrice !== null ? customPrice : (p.sale_price || 0), vat_rate: p.vat_rate ?? 20, custom_price_applied: customPrice !== null };
      setLines(prev => prev[0]?.description === "" && !prev[0]?.product_id ? [nl] : [...prev, nl]);
    }
    setMobPickerOpen(false);
    setMobPickerSearch("");
  };

  const mobRemoveLine = (i) => setLines(prev => prev.length > 1 ? prev.filter((_, j) => j !== i) : [{ description: "", qty: 1, unit_price: "", vat_rate: 20 }]);
  const mobInc = (i) => { const nxt = [...lines]; nxt[i] = { ...nxt[i], qty: (parseFloat(nxt[i].qty) || 0) + 1 }; setLines(nxt); };
  const mobDec = (i) => { const nxt = [...lines]; const newQty = (parseFloat(nxt[i].qty) || 1) - 1; if (newQty < 1) { mobRemoveLine(i); return; } nxt[i] = { ...nxt[i], qty: newQty }; setLines(nxt); };

  if (mobView) return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"var(--bg)", paddingBottom:160 }}>
      {/* ── IMPROVED HEADER — dark, shows running total ── */}
      <div style={{ background:"#0d1829", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:50, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button style={{ background:"none", border:"none", padding:0, cursor:"pointer", color:"rgba(255,255,255,.5)" }} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>New Invoice</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.4)" }}>{mobActiveLines.length > 0 ? `${mobActiveLines.length} item${mobActiveLines.length!==1?"s":""}` : "Select customer & add products"}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#60a5fa", fontFamily:"var(--mono)" }}>{fmt(total)}</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.35)" }}>running total</div>
        </div>
      </div>
      {/* Progress bar — sticky so it stays visible */}
      <div style={{ height:3, background:"rgba(0,0,0,.08)", display:"flex", gap:2, position:"sticky", top:98, zIndex:49 }}>
        <div style={{ flex:1, height:3, background: f.customer ? "#2563eb" : "rgba(255,255,255,.15)", transition:"background .3s" }} />
        <div style={{ flex:1, height:3, background: mobActiveLines.length > 0 ? "#2563eb" : "rgba(255,255,255,.1)", transition:"background .3s" }} />
      </div>

      {/* ── CUSTOMER SECTION — with recent list ── */}
      <div style={{ background:"var(--white)", margin:"10px 12px 0", borderRadius:"var(--rl)", border:"1px solid var(--border)", overflow:"hidden", scrollMarginTop:110 }}>
        <div style={{ padding:"10px 14px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px" }}>Customer *</div>
          {f.customer && <button onClick={() => setF({...f, customer:""})} style={{ background:"none", border:"none", fontSize:11, color:"var(--blue)", cursor:"pointer", fontWeight:600, padding:0 }}>Change</button>}
        </div>
        {f.customer ? (
          <div style={{ padding:"10px 14px 12px", display:"flex", alignItems:"center", gap:10, background:"#f0fdf4" }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>{f.customer?.[0]?.toUpperCase()}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{f.customer}</div>
              <div style={{ fontSize:10, color:"var(--green)", fontWeight:500 }}>✓ Selected</div>
            </div>
          </div>
        ) : (
          <div style={{ padding:"8px 14px 12px" }}>
            <div className="mob-customer-search" style={{ position:"relative" }}>
          <SearchDropdown placeholder="🔍  Search customers..." items={mobCusts} onSelect={c => setF({ ...f, customer: c.name })} />
        </div>
            {/* Recent customers — quick tap */}
            {mobCusts.length > 0 && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:9, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:6 }}>Recent</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {[...mobCusts].sort((a,b) => { const la = invoices.filter(i=>i.customer===a.name).reduce((m,i)=>i.created_at>m?i.created_at:m,""); const lb = invoices.filter(i=>i.customer===b.name).reduce((m,i)=>i.created_at>m?i.created_at:m,""); return lb.localeCompare(la); }).slice(0, 4).map(c => (
                    <button key={c.id} onClick={() => setF({...f, customer: c.name})} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, border:"1px solid var(--border)", background:"var(--bg)", cursor:"pointer", textAlign:"left", fontFamily:"var(--sans)" }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][c.name?.charCodeAt(0)%5]||"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{c.name?.[0]?.toUpperCase()}</div>
                      <span style={{ fontSize:12, fontWeight:500, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DUE DATE — visible by default, not hidden ── */}
      <div style={{ background:"var(--white)", margin:"8px 12px 0", borderRadius:"var(--rl)", border:"1px solid var(--border)", padding:"10px 14px 12px" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px", marginBottom:8 }}>Due Date</div>
        <div style={{ display:"flex", gap:5, marginBottom:f.due_date ? 6 : 0 }}>
          {[{label:"Today",days:0},{label:"7 days",days:7},{label:"14 days",days:14},{label:"30 days",days:30}].map(({label,days}) => {
            const d = new Date(); d.setDate(d.getDate()+days);
            const val = d.toISOString().split("T")[0];
            const active = f.due_date === val;
            return <button key={days} type="button" onClick={() => setF({...f, due_date: val})} style={{ flex:1, padding:"7px 2px", borderRadius:7, border:`1px solid ${active?"var(--blue)":"var(--border)"}`, background:active?"var(--blue)":"var(--white)", color:active?"#fff":"var(--text2)", fontSize:11, fontWeight:active?600:400, cursor:"pointer", fontFamily:"var(--sans)" }}>{label}</button>;
          })}
        </div>
        {f.due_date && <div style={{ fontSize:11, color:"var(--text3)", marginTop:4 }}>Due: {new Date(f.due_date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>}
      </div>

      <div style={{ margin:"0 12px", background:"var(--white)", borderRadius:"0 0 var(--rl) var(--rl)", border:"1px solid var(--border)", borderTop:"none" }}>
        {mobActiveLines.map((l, i) => (
          <div key={i} style={{ background:"var(--white)", borderRadius:"var(--rl)", padding:"14px 16px", marginBottom:10, border:"1px solid var(--border)", boxShadow:"var(--sh)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{l.description}</div>
                <div style={{ fontSize:12, color:"var(--text3)" }}>{fmt(parseFloat(l.unit_price)||0)} each · VAT {l.vat_rate}%</div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"var(--blue)", marginLeft:12 }}>{fmt((parseFloat(l.qty)||0)*(parseFloat(l.unit_price)||0))}</div>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:10, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".5px", display:"block", marginBottom:3 }}>Unit Price £</label>
                <input type="number" step="0.01" min="0" value={l.unit_price} onChange={e => { const nxt=[...lines]; nxt[i]={...nxt[i],unit_price:e.target.value,custom_price_applied:false,price_amended:true}; setLines(nxt); }} style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid var(--border)", fontSize:14, fontFamily:"var(--sans)", background:"var(--white)", color:"var(--text)" }} />
                {l.custom_price_applied && <span style={{ fontSize:10,fontWeight:600,color:"#2563eb",background:"#eff6ff",padding:"1px 6px",borderRadius:4,display:"inline-block",marginTop:3 }}>★ Custom price</span>}
                {l.price_amended && !l.custom_price_applied && <span style={{ fontSize:10,fontWeight:600,color:"#d97706",background:"#fffbeb",padding:"1px 6px",borderRadius:4,display:"inline-block",marginTop:3 }}>✏️ Price amended</span>}
              </div>
              <div style={{ width:100 }}>
                <label style={{ fontSize:10, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".5px", display:"block", marginBottom:3 }}>VAT Rate</label>
                <select value={l.vat_rate} onChange={e => { const nxt=[...lines]; nxt[i]={...nxt[i],vat_rate:e.target.value}; setLines(nxt); }} style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid var(--border)", fontSize:13, fontFamily:"var(--sans)", background:"var(--white)", color:"var(--text)" }}>
                  <option value="20">20% Std</option>
                  <option value="5">5% Red</option>
                  <option value="0">0% Exempt</option>
                </select>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <button onClick={() => mobDec(i)} style={{ width:44, height:44, border:"1.5px solid var(--border)", borderRadius:10, background:"var(--bg)", fontSize:22, cursor:"pointer", color:"var(--text2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontWeight:300 }}>−</button>
                <span key={`qty-${i}-${l.qty}`} className="qty-flash" style={{ width:64, height:44, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, fontFamily:"var(--mono)", color:"var(--text)" }}>{l.qty}</span>
                <button onClick={() => mobInc(i)} style={{ width:44, height:44, border:"1.5px solid var(--blue)", borderRadius:10, background:"var(--blue)", fontSize:22, cursor:"pointer", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontWeight:300 }}>+</button>
              </div>
              <button onClick={() => mobRemoveLine(i)} style={{ background:"var(--red-lt)", border:"none", borderRadius:8, padding:"8px 14px", color:"var(--red)", fontSize:12, fontWeight:600, cursor:"pointer" }}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── ADD PRODUCT — compact, lives inside the products card ── */}
      <div style={{ margin:"8px 12px 0", background:"var(--white)", borderRadius:"var(--rl)", border:"1px solid var(--border)", overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom: mobActiveLines.length > 0 ? "1px solid var(--border)" : "none" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px" }}>Products {mobActiveLines.length > 0 ? `(${mobActiveLines.length})` : ""}</div>
          <button onClick={() => setMobPickerOpen(true)} style={{ display:"flex", alignItems:"center", gap:5, background:"var(--blue)", border:"none", borderRadius:7, padding:"6px 12px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"var(--sans)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Product
          </button>
        </div>
        {mobActiveLines.length === 0 && (
          <div style={{ padding:"20px", textAlign:"center", color:"var(--text3)", fontSize:12 }}>
            <div style={{ fontSize:24, marginBottom:6 }}>📦</div>
            <div style={{ fontWeight:500 }}>No products yet</div>
            <div style={{ fontSize:11, marginTop:3 }}>Tap Add Product above to get started</div>
          </div>
        )}
      </div>

      <details style={{ margin:"8px 12px 0", background:"var(--white)", borderRadius:"var(--rl)", border:"1px solid var(--border)", overflow:"hidden" }}>
        <summary style={{ padding:"12px 16px", fontSize:12, fontWeight:600, color:"var(--text2)", cursor:"pointer", listStyle:"none", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <span>More options</span>
          <span style={{ fontSize:10, color:"var(--text3)", fontWeight:400 }}>Status · Invoice date · Notes ▾</span>
        </summary>
        <div style={{ padding:"0 16px 16px", borderTop:"1px solid var(--border)" }}>
          <div style={{ marginTop:12 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Status</label><select className="il-input" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
          <div style={{ marginTop:10 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Invoice Date</label><input className="il-input" type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
          <div style={{ marginTop:10 }}><label style={{ fontSize:11, fontWeight:600, color:"var(--text3)", display:"block", marginBottom:4 }}>Notes</label><input className="il-input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Any notes..." /></div>
        </div>
      </details>

      <div style={{ position:"fixed", bottom:76, left:0, right:0, background:"var(--white)", borderTop:"1px solid var(--border)", padding:"12px 16px", zIndex:100, boxShadow:"0 -4px 20px rgba(0,0,0,.08)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:13 }}>
          <span style={{ color:"var(--text2)" }}>{mobActiveLines.length} items · Subtotal {fmt(subtotal)}</span>
          <span style={{ color:"var(--text3)" }}>VAT {fmt(vatTotal)}</span>
        </div>
        {/* Hint when CTA is disabled */}
        {(!f.customer || !mobActiveLines.length) && (
          <div style={{ fontSize:11, color:"var(--text3)", textAlign:"center", marginBottom:6 }}>
            {!f.customer ? "👆 Select a customer to continue" : "👆 Add at least one product"}
          </div>
        )}
        <button onClick={save} disabled={saving || !f.customer || !mobActiveLines.length} style={{ width:"100%", background:(!f.customer || !mobActiveLines.length) ? "var(--border2)" : "linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", borderRadius:"var(--rl)", padding:"16px", color:(!f.customer || !mobActiveLines.length) ? "var(--text3)" : "#fff", fontSize:16, fontWeight:700, cursor:(!f.customer || !mobActiveLines.length) ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:(!f.customer || !mobActiveLines.length) ? "none" : "0 4px 14px rgba(37,99,235,.35)" }}>
          <span>{saving ? "Creating..." : "Create Invoice"}</span>
          <span style={{ fontSize:18, fontWeight:800 }}>{fmt(total)}</span>
        </button>
      </div>

      {mobPickerOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }} onClick={() => setMobPickerOpen(false)}>
          <div style={{ position:"absolute", inset:0, background:"rgba(10,14,26,.5)", backdropFilter:"blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position:"absolute", bottom:0, left:0, right:0, background:"var(--white)", borderRadius:"20px 20px 0 0", maxHeight:"75vh", display:"flex", flexDirection:"column", boxShadow:"0 -8px 40px rgba(0,0,0,.15)", animation:"slideUp .2s ease" }}>
            <div style={{ padding:"12px 16px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:15, fontWeight:700 }}>Add Product</div>
              <button onClick={() => setMobPickerOpen(false)} style={{ background:"var(--bg)", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div style={{ padding:"10px 16px" }}>
              <input autoFocus value={mobPickerSearch} onChange={e => setMobPickerSearch(e.target.value)} placeholder="Search products..." style={{ width:"100%", padding:"12px 14px", borderRadius:"var(--rl)", border:"1.5px solid var(--blue)", fontSize:14, outline:"none", fontFamily:"var(--sans)", background:"var(--white)" }} />
            </div>
            {!mobPickerSearch && <div style={{ padding:"0 16px 6px", fontSize:11, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px" }}>Recent Products</div>}
            <div style={{ overflowY:"auto", flex:1, padding:"0 12px 16px" }}>
              {mobFiltered.length === 0 && <div style={{ padding:"20px", textAlign:"center", color:"var(--text3)", fontSize:13 }}>No products found</div>}
              {mobFiltered.map(p => {
                const inBasket = lines.find(l => l.product_id === p.id);
                return (
                  <button key={p.id} onClick={() => mobAddProduct(p)} style={{ width:"100%", background: inBasket ? "var(--blue-lt)" : "var(--white)", border: inBasket ? "1.5px solid var(--blue)" : "1px solid var(--border)", borderRadius:"var(--rl)", padding:"14px 16px", marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left", fontFamily:"var(--sans)" }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{p.name}</div>
                      <div style={{ fontSize:12, color:"var(--text3)" }}>{p.code ? `${p.code} · ` : ""}{fmt(p.sale_price||0)} · VAT {p.vat_rate ?? 20}% · Stock: {p.stock_qty}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {inBasket && <span style={{ fontSize:12, fontWeight:700, color:"var(--blue)", background:"var(--blue-lt)", padding:"3px 8px", borderRadius:20 }}>×{inBasket.qty}</span>}
                      <div style={{ width:36, height:36, borderRadius:10, background: inBasket ? "var(--blue)" : "var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="card">
      <div className="ch"><div><div className="ct">New VAT Invoice</div><div className="cs">Add line items with VAT rates</div></div><button className="btn bo bsm" onClick={onClose}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Cancel</button></div>
      <div className="fg">
        <div className="fgrp"><label style={{ color: submitted && !f.customer ? "var(--red)" : undefined }}>Customer *</label><SearchDropdown placeholder="Search customers..." items={customers} onSelect={c => setF({ ...f, customer: c.name })} onCreateNew={quickAddCustomer} />{submitted && !f.customer && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>Please select a customer</div>}</div>
        <div className="fgrp"><label>Status</label><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
        <div className="fgrp"><label>Invoice Date</label><input type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
        <div className="fgrp">
          <label>Due Date</label>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",gap:6}}>
              {[{label:"Today",days:0},{label:"7 days",days:7},{label:"14 days",days:14},{label:"30 days",days:30}].map(({label,days})=>{
                const d = new Date(); d.setDate(d.getDate()+days);
                const val = d.toISOString().split("T")[0];
                const active = f.due_date === val;
                return <button key={days} type="button" onClick={()=>setF({...f,due_date:val})} style={{flex:1,padding:"5px 0",borderRadius:6,border:"1px solid "+(active?"var(--blue)":"var(--border)"),background:active?"var(--blue)":"var(--white)",color:active?"#fff":"var(--text2)",fontSize:11,fontWeight:active?600:400,cursor:"pointer",fontFamily:"var(--sans)"}}>{label}</button>;
              })}
            </div>
            <input type="date" value={f.due_date} onChange={e=>setF({...f,due_date:e.target.value})} style={{fontSize:13}} className={f.due_date && f.invoice_date && f.due_date < f.invoice_date ? "inp-error" : f.due_date ? "inp-valid" : ""} />
            {f.due_date && f.invoice_date && f.due_date < f.invoice_date && (
              <div className="field-error-msg">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Due date cannot be before the invoice date
              </div>
            )}
          </div>
        </div>
        <div className="fgrp full"><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Any notes for this invoice..." /></div>
      </div>
      <div style={{ borderTop: "0.5px solid var(--border)" }}>
        <div className="il-header">{["Product / Description", "Qty", "Unit Price", "VAT", "Total", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</span>)}</div>
        {lines.map((l, i) => (
          <div key={`${i}-${l.product_id||"empty"}`} className="il-line">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <SearchDropdown key={`line-${i}-${l.product_id||"empty"}`} placeholder="Search products..." items={products} onSelect={async p => {
                      // Check for customer-specific price first, then do single atomic update
                      let customPrice = null;
                      const custName = f?.customer || f?.customer_name;
                      if (custName) {
                        const contact = contacts?.find(c => c.name === custName);
                        if (contact) {
                          const prices = await sb.get(token, "customer_prices", `contact_id=eq.${contact.id}&product_id=eq.${p.id}`);
                          if (Array.isArray(prices) && prices[0]) {
                            customPrice = prices[0].custom_price;
                          }
                        }
                      }
                      // Single atomic update — avoids stale state from multiple setLines calls
                      setLines(prev => {
                        const next = [...prev];
                        next[i] = {
                          ...next[i],
                          product_id: p.id,
                          description: p.name || "",
                          unit_price: customPrice !== null ? customPrice : (p.sale_price || ""),
                          vat_rate: p.vat_rate ?? 20,
                          unit: p.unit || "unit",
                          custom_price_applied: customPrice !== null,
                        };
                        return next;
                      });
                    }} displayKey="name" value={l.description} />
            </div>
            <input type="text" inputMode="numeric" className="il-input mono" value={String(l.qty ?? "")} onChange={e => updateLine(i, "qty", e.target.value)} />
            <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
              <input type="text" inputMode="decimal" className="il-input mono" placeholder="0.00" value={String(l.unit_price ?? "")} onChange={e => setLines(prev => prev.map((ln, idx) => idx === i ? {...ln, unit_price: e.target.value, custom_price_applied: false, price_amended: true} : ln))} />
              {l.custom_price_applied && <span style={{ fontSize:10,fontWeight:600,color:"#2563eb",background:"#eff6ff",padding:"1px 6px",borderRadius:4,alignSelf:"flex-start" }}>★ Custom price</span>}
              {l.price_amended && !l.custom_price_applied && <span style={{ fontSize:10,fontWeight:600,color:"#d97706",background:"#fffbeb",padding:"1px 6px",borderRadius:4,alignSelf:"flex-start" }}>✏️ Price amended</span>}
            </div>
            <select className="il-input" value={l.vat_rate} onChange={e => updateLine(i, "vat_rate", e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">Exempt</option></select>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmt((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0))}</span>
            <button className="ib" onClick={() => lines.length > 1 ? setLines(lines.filter((_, j) => j !== i)) : setLines([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        ))}
        <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfc", borderTop: "0.5px solid var(--border)" }}>
          <button className="btn bo bsm" onClick={() => setLines([...lines, { description: "", qty: 1, unit_price: "", vat_rate: 20 }])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Line</button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>Subtotal: {fmt(subtotal)} &nbsp;·&nbsp; VAT: {fmt(vatTotal)}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Total: {fmt(total)}</div>
          </div>
        </div>
      </div>
      <div className="ff">
        <button className="btn bo" onClick={onClose}>Cancel</button>
        <button className="btn bp" onClick={save} disabled={saving || !f.customer}>
          {saving ? <><div className="spin" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />Creating Invoice...</> : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>Create Invoice</>}
        </button>
      </div>
    </div>
  );
}


