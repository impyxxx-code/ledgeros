import React, { useState } from "react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase.js";
import { fmt, fmtDate, escHtml } from "../lib/utils.js";
import { COMPANY, LOGO, toast } from "../lib/constants.js";
import { ModalPortal } from "./ui.jsx";
import { sendEmail, buildInvoiceEmailHtml, buildReminderEmailHtml } from "../lib/email.js";

// ┌────────────────────────────────────────────────────────────┐
// │ InvoiceModal                                               │
// │ Invoice detail modal — 3 tabs: Invoice, Timeline, Actions  │
// └────────────────────────────────────────────────────────────┘
export function InvoiceModal({ invoice, onClose, contacts = [], onStatusChange, onDuplicate, onEdit, onPartPay, onLogPartPay, token, profile }) {
  const [showWaInput, setShowWaInput] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [waNumber, setWaNumber] = useState("");
  const [activeTab, setActiveTab] = useState("invoice");
  const [partPayAmount, setPartPayAmount] = useState("");
  const [partPayMethod, setPartPayMethod] = useState("cash");
  const [partPayDate, setPartPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [partPayLoading, setPartPayLoading] = useState(false);
  const [partPayMsg, setPartPayMsg] = useState("");
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsRefresh, setPaymentsRefresh] = useState(0);

  const refreshPayments = () => setPaymentsRefresh(n => n + 1);

  React.useEffect(() => {
    if (invoice?.id && token) {
      setPaymentsLoading(true);
      sb.getPayments(token, invoice.id)
        .then(d => setPayments(Array.isArray(d) ? d : []))
        .catch(() => setPayments([]))
        .finally(() => setPaymentsLoading(false));
    }
  }, [activeTab, invoice?.id, paymentsRefresh]);

  const lines = (() => {
    try {
      const l = invoice.lines ? (typeof invoice.lines === "string" ? JSON.parse(invoice.lines) : invoice.lines) : null;
      return Array.isArray(l) && l.length > 0 ? l : [{ description: invoice.description || "Services rendered", qty: 1, unit_price: invoice.amount || 0, vat_rate: 20 }];
    } catch(e) {
      return [{ description: invoice.description || "Services rendered", qty: 1, unit_price: invoice.amount || 0, vat_rate: 20 }];
    }
  })();
  const subtotal = lines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
  const vatTotal = lines.reduce((s, l) => s + (l.qty * l.unit_price * (l.vat_rate / 100)), 0);
  const total = subtotal + vatTotal;

  const customerContact = contacts.find(c => c.name === invoice.customer);
  const savedPhone = customerContact?.phone || "";

  // ── jsPDF invoice generation ──────────────────────────────────────────────
  const handlePrint = async () => {
    const invLines = lines;
    const sub = subtotal, vat = vatTotal, tot = total;
    const bal = invoice.balance > 0 && invoice.balance < tot ? invoice.balance : tot;
    let paymentsHtml = "";
    if (payments.length > 0) {
      const totalPaid = payments.reduce((s,p)=>s+parseFloat(p.amount||0),0);
      const rows = payments.map(p => { const d=p.created_at||p.payment_date; const ds=d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—"; const m=p.method==="cash"?"Cash":p.method==="bank"?"Bank":p.method==="card"?"Card":"Cheque"; const amt="£"+parseFloat(p.amount||0).toFixed(2); return '<div style="display:flex;justify-content:space-between;padding:7px 12px;border-bottom:.5px solid #f1f5f9;font-size:11px"><span style="color:#64748b">'+ds+'</span><span style="color:#64748b">'+m+'</span><span style="font-weight:700;color:#16a34a">-'+amt+'</span></div>'; }).join("");
      const totalRow = '<div style="display:flex;justify-content:space-between;padding:7px 12px;background:#f0fdf4;border-top:.5px solid #bbf7d0;font-size:11px;font-weight:700;color:#15803d"><span>Total paid</span><span>£'+totalPaid.toFixed(2)+'</span></div>';
      paymentsHtml = '<div style="border:.5px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:14px;width:260px;margin-left:auto"><div style="background:#f8fafc;padding:7px 12px;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;border-bottom:.5px solid #e2e8f0">Payments Received</div>'+rows+totalRow+'</div>';
    }
    const contactRecord = contacts.find(c => c.name === invoice.customer);
    const totalOutstanding = parseFloat(contactRecord?.total_outstanding || 0);
    let overdueInvs = [];
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/invoices?customer=eq.${encodeURIComponent(invoice.customer)}&status=in.(overdue,pending,partial)&order=invoice_date.asc&select=invoice_number,invoice_date,amount,amount_paid,balance,status`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) overdueInvs = data.filter(i => i.invoice_number !== invoice.invoice_number);
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
    const html = `<!DOCTYPE html><html><head><title>${escHtml(invoice.invoice_number)}</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;padding:30mm 20mm 20mm;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent-bar{height:5px;background:linear-gradient(90deg,#1e1b4b 0%,#4f46e5 60%,#818cf8 100%);margin:-30mm -20mm 0}.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 0 20px;border-bottom:.5px solid #e2e8f0;margin-bottom:20px}.logo-wrap{display:flex;align-items:center;gap:14px;flex:1;min-width:0}.logo-box{width:160px;height:110px;display:flex;align-items:center;justify-content:flex-start;flex-shrink:0}.logo-box img{width:100%;height:100%;object-fit:contain;object-position:left}.co-name{font-size:15px;font-weight:700;color:#0f172a}.co-det{font-size:10.5px;color:#64748b;line-height:1.6;margin-top:2px;word-break:break-word}.inv-title{font-size:30px;font-weight:900;color:#1e1b4b;letter-spacing:2px;text-align:right;line-height:1}.inv-num{font-size:16px;font-weight:800;text-align:right;color:#0f172a;margin-top:2px}.inv-status{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;background:#fef3c7;color:#92400e;border:.5px solid #fcd34d}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.meta-dk{background:#1e1b4b;border-radius:8px;padding:14px 16px}.meta-dk .lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}.meta-dk .val{font-size:18px;font-weight:700;color:#fff;line-height:1.2}.meta-dk .sub{font-size:11px;color:rgba(255,255,255,.5);margin-top:4px}.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mbox{background:#f8fafc;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 12px}.mbox .lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.mbox .val{font-size:12px;font-weight:600;color:#0f172a}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#1e1b4b}th{padding:9px 12px;font-size:9px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;text-align:left}th:first-child{border-radius:6px 0 0 6px}th:last-child{border-radius:0 6px 6px 0;text-align:right}td{padding:11px 12px;border-bottom:.5px solid #f1f5f9;font-size:12px}tr:last-child td{border-bottom:none}td:last-child{text-align:right;font-weight:600}.totals{width:260px;margin-left:auto;margin-bottom:20px}.tr{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#64748b}.tr span:last-child{color:#0f172a}.tt{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;border-top:.5px solid #e2e8f0;margin-top:4px}.bb{background:#1e1b4b;border-radius:8px;padding:12px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center}.bb-l{color:rgba(255,255,255,.5);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}.bb-v{color:#fff;font-size:18px;font-weight:800}.nb{background:#fef9ec;border:.5px solid #fcd34d;border-radius:8px;padding:12px 14px;margin-bottom:14px}.nb .lbl{font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.nb .val{font-size:12px;color:#78350f;line-height:1.6}.tb{border:.5px solid #e2e8f0;border-left:3px solid #4f46e5;border-radius:0 8px 8px 0;padding:12px 14px;background:#f8fafc;margin-bottom:14px}.tb .lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}.tb .val{font-size:11px;color:#64748b;line-height:1.7}.bank{background:#f8fafc;border:.5px solid #e2e8f0;padding:12px 16px;border-radius:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px}.bank .lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.bank .val{font-size:12px;font-weight:700;color:#0f172a}.footer-box{border:.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:9px;color:#64748b;line-height:1.8}.footer-box b{color:#475569}.bta{position:fixed;top:0;left:0;right:0;z-index:9999;background:#0d1829;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,.4)}.bta a{width:36px;height:36px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:300;text-decoration:none;cursor:pointer;flex-shrink:0;line-height:1}.bta a:hover{background:rgba(255,255,255,.22)}.bta-l{font-size:13px;color:rgba(255,255,255,.5);margin-top:2px}.bta-t{font-size:16px;font-weight:700;color:#fff}body{padding-top:calc(30mm + 54px)}.os-section{margin-top:24px;margin-bottom:20px}.os-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.os-lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px}.os-total{background:#fee2e2;border:.5px solid #fca5a5;border-radius:8px;padding:4px 14px;font-size:13px;font-weight:700;color:#991b1b}.os-table{width:100%;border-collapse:collapse;margin-bottom:12px}.os-table thead tr{background:#f8fafc;border-bottom:.5px solid #e2e8f0}.os-table th{padding:6px 8px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;text-align:left;border-radius:0}.os-table td{padding:7px 8px;border-bottom:.5px solid #f8fafc;font-size:11px}.os-table tr:last-child td{border-bottom:none}.overdue-badge{background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.partial-badge{background:#ede9fe;color:#5b21b6;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.pending-badge{background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.os-notice{border:.5px solid #fca5a5;border-left:3px solid #dc2626;border-radius:0 8px 8px 0;padding:10px 14px;background:#fff7f7;margin-bottom:20px;font-size:11px;color:#991b1b;line-height:1.6}@media print{.bta{display:none!important}body{padding-top:0!important}}</style></head><body><div class="bta"><div><div class="bta-t">LedgerOS</div><div class="bta-l">Arkham Retail Ltd</div></div><a href="#" onclick="try{if(window.opener&&window.opener.__closePrintWin){window.opener.__closePrintWin();return;}if(window.opener){window.opener.postMessage('__ledgeros_close__','*');}window.close();}catch(e){window.close();}">&#x2715;</a></div><div class="accent-bar"></div><div class="hdr"><div class="logo-wrap"><div class="logo-box"><img src="${LOGO}" alt="Arkham Retail"/></div></div><div style="text-align:right;flex-shrink:0;max-width:160px"><div class="inv-title">INVOICE</div><div class="inv-status">${escHtml((invoice.status||'pending').toUpperCase())}</div></div></div><div class="meta"><div class="meta-dk"><div class="lbl">Invoice to</div><div class="val">${escHtml(invoice.customer)}</div></div><div class="mgrid"><div class="mbox"><div class="lbl">Invoice #</div><div class="val">${escHtml(invoice.invoice_number)}</div></div><div class="mbox"><div class="lbl">Invoice date</div><div class="val">${fmtDate(invoice.invoice_date)}</div></div><div class="mbox"><div class="lbl">Due date</div><div class="val">${fmtDate(invoice.due_date)}</div></div><div class="mbox"><div class="lbl">Terms</div><div class="val">Due on receipt</div></div></div></div><table><thead><tr><th style="width:40%">Description</th><th style="text-align:center">VAT</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th>Amount</th></tr></thead><tbody>${invLines.map(l=>`<tr><td style="font-weight:600">${escHtml(l.description)}</td><td style="text-align:center;color:#94a3b8">${l.vat_rate===0?'Exempt':l.vat_rate+'% S'}</td><td style="text-align:right">${escHtml(String(l.qty))}</td><td style="text-align:right">${fmt(l.unit_price)}</td><td>${fmt(l.qty*l.unit_price)}</td></tr>`).join('')}</tbody></table><div class="totals"><div class="tr"><span>Subtotal</span><span>${fmt(sub)}</span></div><div class="tr"><span>VAT total</span><span>${fmt(vat)}</span></div><div class="tt"><span>Total</span><span>${fmt(tot)}</span></div></div>${paymentsHtml}<div class="bb"><span class="bb-l">Balance due</span><span class="bb-v">${fmt(bal)}</span></div>${overdueSection}${invoice.notes?'<div class="nb"><div class="lbl">Notes</div><div class="val">'+escHtml(invoice.notes)+'</div></div>':""} <div class="tb"><div class="lbl">Payment terms</div><div class="val">Payment due within 7 days of invoice date unless otherwise agreed in writing. Late payments may be subject to interest and recovery costs in accordance with the Late Payment of Commercial Debts (Interest) Act 1998. Goods remain the property of Arkham Retail Ltd until paid for in full.</div></div><div class="bank"><div><div class="lbl">Bank</div><div class="val">${escHtml(COMPANY.bankName)}</div></div><div><div class="lbl">Sort code</div><div class="val">${escHtml(COMPANY.sortCode)}</div></div><div><div class="lbl">Account</div><div class="val">${escHtml(COMPANY.accountNumber)}</div></div></div><div class="footer-box"><div><b>${escHtml(COMPANY.name)}</b> &middot; ${escHtml(COMPANY.address)}, ${escHtml(COMPANY.address2)}, ${escHtml(COMPANY.city)}, ${escHtml(COMPANY.county)}, ${escHtml(COMPANY.postcode)}</div><div>VAT: ${escHtml(COMPANY.vatNumber)} &middot; Tel: ${escHtml(COMPANY.phone)} &middot; ${escHtml(COMPANY.email)}</div></div></body></html>`;
    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

  const buildWaMsg = () => encodeURIComponent(
    `*VAT Invoice — ${COMPANY.name}*\n\nInvoice: *${invoice.invoice_number}*\nCustomer: ${invoice.customer}\nDate: ${fmtDate(invoice.invoice_date)}\nDue: ${fmtDate(invoice.due_date)}\n\n` +
    lines.map(l => { const s = l.description && l.description.includes(':') ? l.description.split(':').pop().trim() : (l.description || ''); const short = s.length > 22 ? s.slice(0,22)+'…' : s; return `${short} x${l.qty} — ${fmt(l.qty * l.unit_price)}`; }).join("\n") +
    `\n\nSubtotal: ${fmt(subtotal)}\nVAT: ${fmt(vatTotal)}\n*Total Due: ${fmt(total)}*\n\nPayment to:\nBank: ${COMPANY.bankName}\nSort Code: ${COMPANY.sortCode}\nAcc No: ${COMPANY.accountNumber}\nRef: ${invoice.invoice_number}\n\nThank you for your business! 🙏`
  );

  const sendWhatsApp = (number) => {
    const clean = number.replace(/\s+/g, "").replace(/^0/, "44");
    window.open(`https://wa.me/${clean}?text=${buildWaMsg()}`, "_blank");
    setShowWaInput(false);
  };

  const [emailStatus, setEmailStatus] = useState(null); // null | "sending" | "sent" | "error"
  const handleEmail = async (isReminder = false) => {
    const customerContact = contacts.find(c => c.name === invoice.customer);
    const toEmail = customerContact?.email;
    if (!toEmail) {
      toast.warn(`No email address found for ${invoice.customer}. Please add one in Customers first.`);
      return;
    }
    setEmailStatus("sending");
    const balance = invoice.balance > 0 ? invoice.balance : (invoice.amount || total);
    const html = isReminder
      ? buildReminderEmailHtml(invoice, balance)
      : buildInvoiceEmailHtml(invoice, lines, subtotal, vatTotal, total);
    const subject = isReminder
      ? `Payment Reminder — ${invoice.invoice_number} — ${COMPANY.name}`
      : `Invoice ${invoice.invoice_number} — ${COMPANY.name}`;
    const result = await sendEmail({ to: toEmail, subject, html, token });
    setEmailStatus(result.success ? "sent" : "error");
    setTimeout(() => setEmailStatus(null), 4000);
  };

  const [waReminderStatus, setWaReminderStatus] = useState(null); // null | "sending" | "sent" | "error"
  const handleWaReminder = async () => {
    if (!savedPhone) { toast.warn(`No phone number found for ${invoice.customer}. Please add one in Customers first.`); return; }
    setWaReminderStatus("sending");
    const balance = invoice.balance > 0 ? invoice.balance : (invoice.amount || total);
    const message = `⏰ *Payment Reminder — ${COMPANY.name}*\n\nHi ${invoice.customer}, this is a friendly reminder that invoice *${invoice.invoice_number}* (dated ${fmtDate(invoice.invoice_date)}, due ${fmtDate(invoice.due_date)}) has an outstanding balance of *${fmt(balance)}*.\n\nPayment to:\nBank: ${COMPANY.bankName}\nSort Code: ${COMPANY.sortCode}\nAcc No: ${COMPANY.accountNumber}\nRef: ${invoice.invoice_number}\n\nThank you! 🙏`;
    try {
      const res = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: savedPhone, message }),
      });
      const data = await res.json();
      setWaReminderStatus(res.ok && data.success ? "sent" : "error");
    } catch {
      setWaReminderStatus("error");
    }
    setTimeout(() => setWaReminderStatus(null), 4000);
  };

  // Timeline events derived from invoice data
  const timeline = [
    { icon: "ti-file-plus", color: "var(--blue)", bg: "var(--blue-lt)", label: "Created", date: invoice.created_at || invoice.invoice_date, desc: `Invoice ${invoice.invoice_number} created · ${fmt(invoice.amount)}` },
    ...payments.map((p, idx) => {
      const runningTotal = payments.slice(0, idx + 1).reduce((s, x) => s + parseFloat(x.amount || 0), 0);
      const remaining = Math.max(0, parseFloat(invoice.amount || 0) - runningTotal);
      const methodIcon = p.method === "cash" ? "💵" : p.method === "bank" ? "🏦" : p.method === "card" ? "💳" : "📝";
      const isFinal = remaining <= 0;
      return {
        icon: isFinal ? "ti-circle-check" : "ti-credit-card",
        color: isFinal ? "var(--green)" : "#2563eb",
        bg: isFinal ? "var(--green-lt)" : "var(--blue-lt)",
        label: isFinal ? "Paid in Full" : "Partial Payment",
        date: p.created_at || p.payment_date,
        desc: `${fmt(p.amount)} received ${methodIcon} ${p.method}${p.recorded_by_name ? " · by " + p.recorded_by_name : ""}`,
        sub: remaining > 0 ? `Balance after: ${fmt(remaining)}` : "Invoice fully settled",
      };
    }),
    invoice.status === "overdue" && (!payments.length) && { icon: "ti-alert-circle", color: "var(--red)", bg: "var(--red-lt)", label: "Overdue", date: invoice.due_date, desc: "Payment overdue — chase required" },
  ].filter(Boolean).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  const statusConfig = {
    partial:  { label: "Partial",  cls: "b-orange",  icon: "ti-clock-dollar" },
    draft:    { label: "Draft",    cls: "b-gray",   icon: "ti-file" },
    pending:  { label: "Pending",  cls: "b-amber",  icon: "ti-clock" },
    paid:     { label: "Paid",     cls: "b-green",  icon: "ti-circle-check" },
    overdue:  { label: "Overdue",  cls: "b-red",    icon: "ti-alert-circle" },
    cancelled:{ label: "Cancelled",cls: "b-gray",   icon: "ti-ban" },
  };
  const sc = statusConfig[invoice.status] || statusConfig.pending;

  return (<ModalPortal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 980 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "var(--blue-lt)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "var(--blue)", fontSize: 17 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span></div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{invoice.invoice_number}</span>
                <span className={"badge " + sc.cls}><i className={"ti " + sc.icon} style={{ fontSize: 10 }} />{sc.label}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{invoice.customer} · {fmtDate(invoice.invoice_date)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", background: "#f4f6f9", borderRadius: "var(--r)", padding: 3, gap: 2 }}>
              {[
                ["invoice","Invoice",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>],
                ["payments","Payments",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>],
                ["timeline","Timeline",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>],
                ["actions","Actions",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>],
              ].filter(([id])=>!(id==="actions"&&profile?.role==="agent")).map(([id, lbl, svgIcon]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5, transition: "all .12s", background: activeTab === id ? "var(--white)" : "transparent", color: activeTab === id ? "var(--text)" : "var(--text3)", boxShadow: activeTab === id ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
                  {svgIcon}{lbl}
                </button>
              ))}
            </div>
            <button className="btn bo bsm" onClick={onClose} style={{ width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
          </div>
        </div>
        <div className="modal-body">
        <div className="modal-main">
        {/* ── PAYMENTS TAB ── */}
        {activeTab === "payments" && (
          <div style={{padding:"20px 24px"}}>
            {/* Payment Summary */}
            {(invoice.status === "partial" || invoice.status === "paid") && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                {[
                  { label:"Invoice Total", val:fmt(invoice.amount), accent:"#2563eb" },
                  { label:"Amount Paid", val:fmt(invoice.amount_paid||0), accent:"#16a34a" },
                  { label:"Balance Owing", val:fmt(Math.max(0,(invoice.balance||invoice.amount))), accent:invoice.balance>0?"#dc2626":"#16a34a" },
                ].map((k,i) => (
                  <div key={i} style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:"12px 16px",borderTop:`3px solid ${k.accent}`}}>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:6}}>{k.label}</div>
                    <div style={{fontSize:18,fontWeight:800,color:"var(--text)",fontFamily:"var(--mono)"}}>{k.val}</div>
                  </div>
                ))}
              </div>
            )}
            {invoice.amount_paid > 0 && invoice.amount > 0 && (
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text3)",marginBottom:6}}>
                  <span>Collection progress</span>
                  <span>{Math.round((invoice.amount_paid/invoice.amount)*100)}% collected</span>
                </div>
                <div style={{height:6,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:Math.min(100,Math.round((invoice.amount_paid/invoice.amount)*100))+"%",background:invoice.status==="paid"?"#16a34a":"#2563eb",borderRadius:4,transition:"width .4s"}} />
                </div>
              </div>
            )}
            {/* Payment History */}
            <div style={{marginBottom:16,fontWeight:700,fontSize:13,color:"var(--text)"}}>Payment History</div>
            {paymentsLoading ? (
              <div style={{display:"flex",flexDirection:"column",gap:10,padding:"4px 0"}}>
                {[1,2,3].map(i => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid var(--border)"}}>
                    <div className="skel" style={{width:90,height:13,borderRadius:4}}/>
                    <div className="skel" style={{width:64,height:13,borderRadius:4}}/>
                    <div className="skel" style={{width:48,height:13,borderRadius:4}}/>
                    <div className="skel" style={{width:120,height:13,borderRadius:4,marginLeft:"auto"}}/>
                  </div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div style={{textAlign:"center",padding:"32px 0",color:"var(--text3)"}}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.3,marginBottom:8,display:"block",margin:"0 auto 8px"}}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                <div style={{fontSize:13}}>No payments recorded yet</div>
                <div style={{fontSize:11,marginTop:4}}>Payments will appear here when recorded</div>
              </div>
            ) : (
              <div style={{border:"1px solid var(--border)",borderRadius:"var(--rl)",overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{background:"var(--bg)"}}>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Date & Time</th>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Amount</th>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Method</th>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Notes</th>
                      <th style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Received By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p,i) => {
                      const ts = p.created_at || p.payment_date;
                      const d = ts ? new Date(ts) : null;
                      const dateStr = d ? d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";
                      const timeStr = d ? d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : "";
                      const agentName = p.recorded_by_name || "—";
                      const agentInitial = agentName[0]?.toUpperCase() || "?";
                      const agentColors = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#2563eb"];
                      const agentCol = agentColors[agentName.charCodeAt(0)%5] || "#64748b";
                      return (
                        <tr key={p.id} style={{borderBottom: i<payments.length-1?"1px solid var(--border)":"none"}}>
                          <td style={{padding:"10px 14px"}}>
                            <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{dateStr}</div>
                            <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{timeStr}</div>
                          </td>
                          <td style={{padding:"10px 14px"}}><span style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:13,color:"#16a34a"}}>{fmt(p.amount)}</span></td>
                          <td style={{padding:"10px 14px"}}><span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12}}>{p.method==="cash"?"💵":p.method==="bank"?"🏦":p.method==="card"?"💳":"📝"} {p.method}</span></td>
                          <td style={{padding:"10px 14px",fontSize:12,color:"var(--text2)"}}>{p.notes||"—"}</td>
                          <td style={{padding:"10px 14px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:26,height:26,borderRadius:"50%",background:agentCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{agentInitial}</div>
                              <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{agentName}</div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{padding:"10px 14px",background:"var(--bg)",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span style={{color:"var(--text3)"}}>{payments.length} payment{payments.length!==1?"s":""}</span>
                  <span style={{fontFamily:"var(--mono)",fontWeight:700}}>{fmt(payments.reduce((s,p)=>s+(parseFloat(p.amount)||0),0))} total</span>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── INVOICE TAB ── */}
        {activeTab === "invoice" && (
          <div className="inv-doc">
            <div className="inv-header">
              <div style={{ width: 160, height: 90, display: "flex", alignItems: "center", justifyContent: "flex-start", flexShrink: 0 }}>
                <img src={LOGO} alt="Arkham Retail" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "left" }} />
              </div>
              <div className="inv-title-block">
                <div className="inv-title">INVOICE</div>
                <div style={{ marginTop: 8 }}><span className={"badge " + sc.cls}>{sc.label}</span></div>
              </div>
            </div>
            <div className="inv-meta">
              <div>
                <div className="inv-meta-lbl">Invoice to</div>
                <div className="inv-meta-val" style={{ fontSize: 17, marginBottom: 4 }}>{invoice.customer}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><div className="inv-meta-lbl">Invoice #</div><div className="inv-meta-val">{invoice.invoice_number}</div></div>
                <div><div className="inv-meta-lbl">Date</div><div className="inv-meta-val">{fmtDate(invoice.invoice_date)}</div></div>
                <div><div className="inv-meta-lbl">Due date</div><div className="inv-meta-val">{fmtDate(invoice.due_date)}</div></div>
                <div><div className="inv-meta-lbl">Terms</div><div className="inv-meta-val">Due on receipt</div></div>
              </div>
            </div>
            <table className="inv-table">
              <thead><tr><th style={{ width: "40%" }}>Description</th><th>VAT</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Rate</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{l.description}</td>
                    <td style={{whiteSpace:'nowrap'}}><span className="tag">{l.vat_rate === 0 ? "Exempt" : `${l.vat_rate}% S`}</span></td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{l.qty}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace:'nowrap' }}>{fmt(l.unit_price)}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, whiteSpace:'nowrap' }}>{fmt(l.qty * l.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="inv-totals-box">
              <div className="inv-tot-row"><span style={{ color: "#64748b" }}>Subtotal</span><span className="mono">{fmt(subtotal)}</span></div>
              <div className="inv-tot-row"><span style={{ color: "#64748b" }}>VAT Total</span><span className="mono">{fmt(vatTotal)}</span></div>
              <div className="inv-tot-row inv-tot-grand"><span>Total</span><span className="mono">{fmt(total)}</span></div>
            </div>
            {payments.length > 0 && (
              <div style={{ margin:"0 0 16px", border:".5px solid #e2e8f0", borderRadius:9, overflow:"hidden" }}>
                <div onClick={() => setShowPayments(s => !s)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", background:"#f0fdf4", padding:"8px 14px", borderBottom: showPayments ? ".5px solid #bbf7d0" : "none" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:".8px" }}>Payments Received · {payments.length}</span>
                  <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:700, color:"#15803d", fontFamily:"var(--mono)", fontSize:12 }}>{fmt(payments.reduce((s,p)=>s+parseFloat(p.amount||0),0))}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showPayments ? "rotate(180deg)" : "none", transition:"transform .15s" }}><polyline points="6 9 12 15 18 9"/></svg>
                  </span>
                </div>
                {showPayments && payments.map((p, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 14px", borderBottom: i < payments.length-1 ? ".5px solid #f1f5f9" : "none", fontSize:12 }}>
                    <span style={{ color:"#64748b" }}>{fmtDate(p.created_at || p.payment_date)}</span>
                    <span style={{ color:"#64748b" }}>{p.method==="cash"?"💵":p.method==="bank"?"🏦":p.method==="card"?"💳":"📝"} {p.method}</span>
                    <span style={{ fontWeight:700, color:"#16a34a", fontFamily:"var(--mono)" }}>-{fmt(parseFloat(p.amount||0))}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="inv-balance-box"><span className="inv-balance-lbl">Balance Due</span><span className="inv-balance-val mono">{fmt(invoice.balance > 0 && invoice.balance < total ? invoice.balance : total)}</span></div>
            {invoice.notes && (
              <div style={{ background:"#fef9ec",border:"1px solid #fcd34d",borderRadius:9,padding:"12px 14px",marginBottom:16 }}>
                <div style={{ fontSize:9,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:".8px",marginBottom:4 }}>Notes</div>
                <div style={{ fontSize:12,color:"#78350f",lineHeight:1.6 }}>{invoice.notes}</div>
              </div>
            )}
            <div className="inv-footer">
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: "#0f172a" }}>Payment Details</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Please transfer using the invoice number as reference.</div>
              <div className="inv-bank-grid">
                <div><div className="inv-bank-lbl">Bank</div><div className="inv-bank-val">{COMPANY.bankName}</div></div>
                <div><div className="inv-bank-lbl">Sort Code</div><div className="inv-bank-val mono">{COMPANY.sortCode}</div></div>
                <div><div className="inv-bank-lbl">Account</div><div className="inv-bank-val mono">{COMPANY.accountNumber}</div></div>
              </div>
              <div style={{ marginTop: 16, fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>All goods remain our property until payment is received in full. VAT Reg No: {COMPANY.vatNumber}</div>
            </div>
            <div style={{ border: ".5px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 9, color: "#64748b", lineHeight: 1.8, marginTop: 16 }}>
              <div><b style={{ color: "#475569" }}>{COMPANY.name}</b> &middot; {COMPANY.address}, {COMPANY.address2}, {COMPANY.city}, {COMPANY.county}, {COMPANY.postcode}</div>
              <div>VAT: {COMPANY.vatNumber} &middot; Tel: {COMPANY.phone} &middot; {COMPANY.email}</div>
            </div>
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {activeTab === "timeline" && (
          <div style={{ padding: "28px 32px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Invoice Timeline</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 24 }}>Full history of {invoice.invoice_number}</div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 16, top: 0, bottom: 0, width: 1, background: "var(--border)" }} />
              {timeline.map((ev, i) => {
                const d = ev.date ? new Date(ev.date) : null;
                const dateStr = d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
                const timeStr = d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <div key={i} style={{ display: "flex", gap: 16, marginBottom: 24, position: "relative" }}>
                    <div style={{ width: 33, height: 33, borderRadius: "50%", background: ev.bg, border: "2px solid var(--white)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, boxShadow: "0 0 0 3px " + ev.bg }}>
                      <span style={{ color: ev.color, fontSize: 15 }}>
                        {ev.icon === "ti-file-plus" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        : ev.icon === "ti-circle-check" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        : ev.icon === "ti-credit-card" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                      </span>
                    </div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: ev.color }}>{ev.label}</div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>{dateStr}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{timeStr}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: ev.sub ? 4 : 0 }}>{ev.desc}</div>
                      {ev.sub && <div style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>{ev.sub}</div>}
                    </div>
                  </div>
                );
              })}
              {/* Invoice details summary */}
              <div style={{ background: "#f8fafd", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "16px 20px", marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Invoice Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  {[["Customer", invoice.customer],["Invoice #", invoice.invoice_number],["Amount", fmt(invoice.amount)],["Subtotal", fmt(subtotal)],["VAT", fmt(vatTotal)],["Status", invoice.status?.toUpperCase()]].map(([lbl, val]) => (
                    <div key={lbl}><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".5px" }}>{lbl}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{val}</div></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIONS TAB ── */}
        {activeTab === "actions" && (
          <div style={{ padding: "28px 32px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Invoice Actions</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 24 }}>Manage {invoice.invoice_number}</div>

            {/* Edit Invoice — admin only; managers can view all invoices but not edit them */}
            {onEdit && profile?.role !== "manager" && (
              <div style={{ background:"#f0f4ff", border:"1px solid #c7d7fc", borderRadius:"var(--rl)", padding:"16px 18px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontWeight:600, marginBottom:2 }}>Edit Invoice</div>
                  <div style={{ fontSize:12, color:"var(--text3)" }}>Modify customer, amounts or line items</div>
                </div>
                <button className="btn bp bsm" onClick={() => { onEdit(invoice); onClose(); }}>Edit</button>
              </div>
            )}

            {/* Print & Share */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Print & Share</div>
              <div className="inv-action-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Print Invoice", color: "var(--blue)", bg: "var(--blue-lt)", onClick: handlePrint,
                    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> },
                  { label: "Email Invoice", color: "var(--purple)", bg: "var(--purple-lt)", onClick: handleEmail,
                    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
                  { label: "WhatsApp", color: "#25D366", bg: "#f0fdf4", onClick: () => savedPhone ? sendWhatsApp(savedPhone) : setShowWaInput(true),
                    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> },
                ].map(a => (
                  <button key={a.label} onClick={a.onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: a.bg, border: `1px solid ${a.color}22`, borderRadius: "var(--rl)", cursor: "pointer", fontFamily: "var(--sans)", transition: "all .14s" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: a.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {a.svg}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: a.color }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* WA number input */}
            {showWaInput && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "var(--r)", padding: "10px 14px", marginBottom: 16 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <input style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} placeholder="Enter WhatsApp number e.g. 07700 900000" value={waNumber} onChange={e => setWaNumber(e.target.value)} onKeyDown={e => e.key === "Enter" && waNumber && sendWhatsApp(waNumber)} autoFocus />
                <button className="btn bwa bsm" onClick={() => sendWhatsApp(waNumber)} disabled={!waNumber}>Send</button>
                <button className="btn bo bsm" onClick={() => setShowWaInput(false)}>Cancel</button>
              </div>
            )}

            {/* Status management */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Update Status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["pending","b-amber","ti-clock"],["paid","b-green","ti-circle-check"],["overdue","b-red","ti-alert-circle"],["draft","b-gray","ti-file"],["cancelled","b-gray","ti-ban"]].map(([s, cls, icon]) => (
                  <button key={s} onClick={() => onStatusChange && onStatusChange(invoice.id, s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid var(--border2)", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, background: invoice.status === s ? "var(--blue)" : "var(--white)", color: invoice.status === s ? "#fff" : "var(--text2)", display: "flex", alignItems: "center", gap: 5, transition: "all .12s" }}>
                    <i className={"ti " + icon} style={{ fontSize: 12 }} />{s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Part payment */}
            {invoice.status !== "paid" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Part Payment</div>
                {partPayMsg && <div style={{ fontSize: 12, color: partPayMsg.startsWith("✓") ? "var(--green)" : "var(--red)", marginBottom: 8, fontWeight: 600 }}>{partPayMsg}</div>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="number" placeholder="Amount £" value={partPayAmount} onChange={e => setPartPayAmount(e.target.value)} style={{ width: 110, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border2)", fontSize: 13, outline: "none", fontFamily: "var(--sans)", background: "var(--white)", color: "var(--text)" }} />
                  <select value={partPayMethod} onChange={e => setPartPayMethod(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border2)", fontSize: 13, outline: "none", fontFamily: "var(--sans)", background: "var(--white)", color: "var(--text)", cursor: "pointer" }}>
                    <option value="cash">💵 Cash</option>
                    <option value="bank">🏦 Bank</option>
                    <option value="card">💳 Card</option>
                  </select>
                  <input type="date" value={partPayDate} onChange={e => setPartPayDate(e.target.value)} title="Date payment was received" style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border2)", fontSize: 13, outline: "none", fontFamily: "var(--sans)", background: "var(--white)", color: "var(--text)", cursor: "pointer" }} />
                  <button className="btn bp" disabled={!partPayAmount || partPayLoading} onClick={async () => {
                    const amt = parseFloat(partPayAmount);
                    if (!amt || amt <= 0) return;
                    setPartPayLoading(true); setPartPayMsg("");
                    try {
                      if (onPartPay) await onPartPay(invoice, amt, partPayMethod, partPayDate);
                      const currentBalance = invoice.balance != null ? parseFloat(invoice.balance) : parseFloat(invoice.amount || 0);
                      const prevPaid = parseFloat(invoice.amount_paid || 0);
                      const bal = currentBalance > 0 ? currentBalance : Math.max(0, parseFloat(invoice.amount || 0) - prevPaid);
                      const newBal = Math.max(0, bal - amt);
                      setPartPayMsg(`✓ £${amt.toFixed(2)} recorded. Balance: £${newBal.toFixed(2)}`);
                      setPartPayAmount("");
                      setPartPayDate(new Date().toISOString().split("T")[0]);
                      refreshPayments();
                      if (onLogPartPay) onLogPartPay(invoice, amt, partPayMethod, newBal);
                    } catch(err) { console.error("Part payment error:", err); setPartPayMsg("Error recording payment: " + (err?.message || String(err))); }
                    setPartPayLoading(false);
                  }} style={{ whiteSpace: "nowrap" }}>
                    {partPayLoading ? "Saving..." : "Record Payment"}
                  </button>
                </div>
                {invoice.balance > 0 && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>Outstanding balance: <strong>£{invoice.balance.toFixed(2)}</strong></div>}
              </div>
            )}

            {/* Other actions */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>More Actions</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn bo" onClick={() => onDuplicate && onDuplicate(invoice)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Duplicate Invoice</button>
                <button className="btn bo" onClick={() => handleEmail(true)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>Send Reminder</button>
                {savedPhone && <button className="btn bo" onClick={handleWaReminder} disabled={waReminderStatus==="sending"} style={{color:waReminderStatus==="sent"?"var(--green)":waReminderStatus==="error"?"var(--red)":undefined,borderColor:waReminderStatus==="sent"?"var(--green)":waReminderStatus==="error"?"var(--red)":undefined}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>{waReminderStatus==="sending"?"Sending...":waReminderStatus==="sent"?"Sent!":waReminderStatus==="error"?"Failed":"WhatsApp Reminder"}</button>}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* ── SIDEBAR (persistent across tabs) ── */}
        <div className="inv-side">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="c-av" style={{ background: ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444"][invoice.customer?.charCodeAt(0) % 5] || "#6366f1", width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>{invoice.customer?.[0]?.toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{invoice.customer}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{invoice.invoice_number}</div>
            </div>
          </div>

          <div>
            <div className="inv-meta-lbl" style={{ marginBottom: 6 }}>Status</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                ["pending","b-amber",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>],
                ["paid","b-green",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>],
                ["overdue","b-red",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>],
                ["partial","b-orange",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/><path d="M9.5 21a2 2 0 0 0 5 0"/></svg>],
                ["draft","b-gray",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>],
                ["cancelled","b-gray",<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>],
              ].map(([s, cls, icon]) => (
                <button key={s} onClick={() => onStatusChange && onStatusChange(invoice.id, s)} title={s.charAt(0).toUpperCase() + s.slice(1)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: invoice.status === s ? "var(--blue)" : "var(--white)", color: invoice.status === s ? "#fff" : "var(--text3)", transition: "all .12s" }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><div className="inv-meta-lbl">Date</div><div className="inv-meta-val" style={{ fontSize: 12 }}>{fmtDate(invoice.invoice_date)}</div></div>
            <div><div className="inv-meta-lbl">Due</div><div className="inv-meta-val" style={{ fontSize: 12 }}>{fmtDate(invoice.due_date)}</div></div>
          </div>

          <div className="inv-balance-box" style={{ padding: "9px 12px" }}>
            <span className="inv-balance-lbl" style={{ fontSize: 10 }}>Balance Due</span>
            <span className="inv-balance-val" style={{ fontSize: 14 }}>{fmt(invoice.balance > 0 && invoice.balance < total ? invoice.balance : total)}</span>
          </div>

          {invoice.amount_paid > 0 && invoice.amount > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>
                <span>Collected</span>
                <span>{Math.min(100, Math.round((invoice.amount_paid / invoice.amount) * 100))}%</span>
              </div>
              <div className="inv-side-progress">
                <div className="inv-side-progress-fill" style={{ width: Math.min(100, Math.round((invoice.amount_paid / invoice.amount) * 100)) + "%" }} />
              </div>
            </div>
          )}

          <div className="inv-side-actions" style={{ display: "flex", gap: 8 }}>
            <button className="btn bo bsm" onClick={handlePrint} style={{ flex: 1, justifyContent: "center" }} title="Print"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></button>
            <button className="btn bo bsm" onClick={handleEmail} disabled={emailStatus==="sending"} style={{ flex: 1, justifyContent: "center" }} title="Email"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></button>
            {savedPhone && <button className="btn bo bsm" onClick={() => sendWhatsApp(savedPhone)} style={{ flex: 1, justifyContent: "center", color: "#16a34a" }} title="WhatsApp"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></button>}
          </div>
        </div>
        </div>

        <div className="modal-actions">
          <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={"badge " + sc.cls}>{sc.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{fmt(invoice.balance > 0 && invoice.balance < total ? invoice.balance : total)}</span>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>· {invoice.invoice_number}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn bwa bsm" onClick={() => savedPhone ? sendWhatsApp(savedPhone) : (setActiveTab("actions"), setShowWaInput(true))}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>{savedPhone || "WhatsApp"}</button>
              <button className="btn bo bsm" onClick={handleEmail} disabled={emailStatus==="sending"} style={{color:emailStatus==="sent"?"var(--green)":emailStatus==="error"?"var(--red)":undefined,borderColor:emailStatus==="sent"?"var(--green)":emailStatus==="error"?"var(--red)":undefined}}>
                {emailStatus==="sending" ? <div className="spin" style={{width:13,height:13,borderWidth:2,flexShrink:0}}/> : emailStatus==="sent" ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> : emailStatus==="error" ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                {emailStatus==="sending"?"Sending...":emailStatus==="sent"?"Sent!":emailStatus==="error"?"Failed":"Email"}
              </button>
              <button className="btn bp bsm" onClick={handlePrint}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print</button>
            </div>
          </div>
      </div>
    </div>
  </div>
  </ModalPortal>
  );
}
