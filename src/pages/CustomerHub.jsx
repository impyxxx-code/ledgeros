import React, { useState, useMemo, useEffect } from "react";
import { sb } from "../lib/supabase.js";
import { activeCustomers } from "../lib/contacts.js";
import { nextDocNumber } from "../lib/numbering.js";
import { fmt, fmtDate, escHtml, today, isMobile } from "../lib/utils.js";
import { COMPANY, toast } from "../lib/constants.js";
import { logAudit } from "../lib/audit.js";
import { sendEmail, buildInvoiceEmailHtml } from "../lib/email.js";
import { SearchDropdown } from "../components/SearchDropdown.jsx";
import { InvoiceModal } from "../components/InvoiceModal.jsx";
import { InvoiceForm } from "./invoices/InvoiceForm.jsx";
import { EmptyState } from "../components/ui.jsx";

// ── CUSTOMER HUB (360) ────────────────────────────────────────────────────────
// One place per customer: their invoices (view / re-send / print), a full account
// statement (email / print / WhatsApp), raise a credit note, and start a new
// invoice — all inline, without hopping between pages.

const parseLines = (inv) => { let l = inv.lines; if (typeof l === "string") { try { l = JSON.parse(l); } catch { l = []; } } return Array.isArray(l) ? l : []; };

// Print via a hidden iframe — never triggers the browser's pop-up blocker (unlike window.open).
const printHtml = (html) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  let printed = false;
  const fire = () => {
    if (printed) return; printed = true;
    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch {}
    setTimeout(() => { try { document.body.removeChild(frame); } catch {} }, 1000);
  };
  frame.onload = fire;
  const doc = frame.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  setTimeout(fire, 500); // fallback if onload doesn't fire
};

export function CustomerHub({ contacts, setContacts, invoices, setInvoices, products = [], accounts = [], token, userId, profile, pendingCustomer, onClearPending }) {
  const [selId, setSelId] = useState(pendingCustomer || null);
  const [query, setQuery] = useState("");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [showCN, setShowCN] = useState(false);
  const [cnForm, setCnForm] = useState({ invoice_id: "", amount: "", reason: "", issue_date: today() });
  const [savingCN, setSavingCN] = useState(false);
  const [creditNotes, setCreditNotes] = useState([]);
  const [sending, setSending] = useState(null);
  const [customerPrices, setCustomerPrices] = useState([]);
  const [priceForm, setPriceForm] = useState({ product_id: "", custom_price: "" });
  const [savingPrice, setSavingPrice] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => { if (pendingCustomer) { setSelId(pendingCustomer); onClearPending && onClearPending(); } }, [pendingCustomer]);

  const customer = contacts.find(c => c.id === selId) || null;
  const customers = activeCustomers(contacts);

  const custInvoices = useMemo(() => customer ? invoices.filter(i => i.customer === customer.name).sort((a, b) => (b.invoice_date || "").localeCompare(a.invoice_date || "")) : [], [customer, invoices]);

  useEffect(() => {
    if (!customer || !token) { setCreditNotes([]); setCustomerPrices([]); return; }
    sb.get(token, "credit_notes", `customer_name=eq.${encodeURIComponent(customer.name)}&order=issue_date.desc`)
      .then(d => setCreditNotes(Array.isArray(d) ? d : [])).catch(() => setCreditNotes([]));
    sb.get(token, "customer_prices", `contact_id=eq.${customer.id}&select=*`)
      .then(d => setCustomerPrices(Array.isArray(d) ? d : [])).catch(() => setCustomerPrices([]));
  }, [customer, token]);

  const isAdmin = profile?.role === "admin" || profile?.role === "manager";

  const savePrice = async () => {
    if (!priceForm.product_id || !priceForm.custom_price) return;
    setSavingPrice(true);
    const existing = customerPrices.find(p => p.product_id === priceForm.product_id);
    if (existing) {
      await sb.patch(token, "customer_prices", existing.id, { custom_price: parseFloat(priceForm.custom_price) });
      setCustomerPrices(prev => prev.map(p => p.id === existing.id ? { ...p, custom_price: parseFloat(priceForm.custom_price) } : p));
    } else {
      const data = await sb.post(token, "customer_prices", { contact_id: customer.id, contact_name: customer.name, product_id: priceForm.product_id, custom_price: parseFloat(priceForm.custom_price) });
      if (data && data[0]) setCustomerPrices(prev => [...prev, data[0]]);
    }
    const prod = products.find(p => p.id === priceForm.product_id);
    logAudit(token, userId, "custom_price_set", "contact", customer.id, `Custom price for ${customer.name}: ${prod?.name || "product"} → ${fmt(parseFloat(priceForm.custom_price))}`);
    toast.success("Custom price saved");
    setPriceForm({ product_id: "", custom_price: "" });
    setSavingPrice(false);
  };
  const deletePrice = async (cp) => {
    const ok = await sb.del(token, "customer_prices", cp.id);
    if (ok) { setCustomerPrices(prev => prev.filter(p => p.id !== cp.id)); toast.success("Custom price removed"); }
    else toast.error("Couldn't remove. Try again.");
  };

  const whatsappCreditNote = (cn) => {
    const msg = encodeURIComponent(`*${COMPANY.name} — Credit Note ${cn.cn_number}*\nHi ${customer.name},\nWe've raised credit note *${cn.cn_number}* dated ${fmtDate(cn.issue_date)} for *${fmt(cn.amount)}*${cn.reason ? ` (${cn.reason})` : ""}. This is credited to your account. Contact us on ${COMPANY.phone} for any queries. Thank you.`);
    const clean = (customer.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    window.open(clean ? `https://wa.me/${clean}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  };
  const printCreditNote = (cn) => {
    const relInv = custInvoices.find(i => i.id === cn.invoice_id);
    printHtml(`<!DOCTYPE html><html><head><title>${escHtml(cn.cn_number)}</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:32px;color:#1e293b}.h{display:flex;justify-content:space-between;border-bottom:2px solid #201e1d;padding-bottom:16px;margin-bottom:20px}.co{font-size:20px;font-weight:700;color:#201e1d}.t{font-size:16px;font-weight:700;text-align:right;color:#7c3aed}.box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:12px}.lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px}.val{font-size:13px;font-weight:600}.amt{background:#201e1d;color:#fff;border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:12px}.amt b{font-size:18px}</style></head><body><div class="h"><div><div class="co">${escHtml(COMPANY.name)}</div><div style="font-size:11px;color:#64748b">VAT: ${escHtml(COMPANY.vatNumber || "")}</div></div><div><div class="t">CREDIT NOTE ${escHtml(cn.cn_number)}</div><div style="font-size:11px;color:#64748b;text-align:right">${fmtDate(cn.issue_date)}</div></div></div><div class="box"><div class="lbl">Customer</div><div class="val">${escHtml(cn.customer_name)}</div></div><div class="box"><div class="lbl">Related invoice</div><div class="val">${escHtml(relInv?.invoice_number || "—")}</div></div><div class="box"><div class="lbl">Reason</div><div class="val">${escHtml(cn.reason || "—")}</div></div><div class="amt"><span style="color:rgba(255,255,255,.6);font-size:10px;text-transform:uppercase;letter-spacing:.6px">Credit amount</span><b>${fmt(cn.amount)}</b></div></body></html>`);
  };

  const k = useMemo(() => {
    const totalInvoiced = custInvoices.filter(i => i.status !== "draft").reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const paid = custInvoices.reduce((s, i) => s + (parseFloat(i.amount_paid) || 0), 0);
    const outstanding = custInvoices.filter(i => i.status === "pending" || i.status === "overdue" || i.status === "partial").reduce((s, i) => s + (parseFloat(i.balance != null ? i.balance : i.amount) || 0), 0);
    const overdue = custInvoices.filter(i => i.status === "overdue").reduce((s, i) => s + (parseFloat(i.balance != null ? i.balance : i.amount) || 0), 0);
    return { totalInvoiced, paid, outstanding, overdue };
  }, [custInvoices]);

  const creditLimit = parseFloat(customer?.credit_limit || 0);
  const onHold = !!customer?.credit_hold;
  const overLimit = creditLimit > 0 && k.outstanding > creditLimit;

  // ── Actions ──────────────────────────────────────────────────────────────────
  const emailInvoice = async (inv) => {
    if (!customer?.email) { toast.warn(`No email on file for ${customer.name}.`); return; }
    setSending("inv-" + inv.id);
    const html = buildInvoiceEmailHtml(inv, parseLines(inv), parseFloat(inv.subtotal || 0), parseFloat(inv.vat_total || 0), parseFloat(inv.amount || 0));
    const res = await sendEmail({ to: customer.email, subject: `Invoice ${inv.invoice_number} — ${COMPANY.name}`, html, token });
    if (res.success) { toast.success(`Invoice ${inv.invoice_number} emailed to ${customer.email}`); logAudit(token, userId, "invoice_resent", "invoice", inv.id, `${inv.invoice_number} re-sent to ${customer.email}`); }
    else toast[res.dev ? "warn" : "error"](res.error || "Failed to send. Please try again.");
    setSending(null);
  };

  const whatsappInvoice = (inv) => {
    const bal = inv.status === "paid" ? 0 : parseFloat(inv.balance != null ? inv.balance : inv.amount || 0);
    const msg = encodeURIComponent(`*${COMPANY.name} — Invoice ${inv.invoice_number}*\nHi ${customer.name},\nInvoice *${inv.invoice_number}* dated ${fmtDate(inv.invoice_date)} — total ${fmt(inv.amount)}${bal > 0 ? `, *${fmt(bal)}* outstanding` : " (paid, thank you)"}.\n\nPayment: ${COMPANY.bankName || "Tide Bank"} · Sort ${COMPANY.sortCode || ""} · Acc ${COMPANY.accountNumber || ""} · Ref ${inv.invoice_number}.\nQueries: ${COMPANY.phone}. Thank you.`);
    const clean = (customer.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    window.open(clean ? `https://wa.me/${clean}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  };

  const printInvoice = (inv) => {
    const lines = parseLines(inv);
    const rows = lines.map(l => `<tr><td>${escHtml(l.description || "")}</td><td style="text-align:right">${escHtml(String(l.qty || 0))}</td><td style="text-align:right">${fmt(l.unit_price || 0)}</td><td style="text-align:right">${fmt((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0))}</td></tr>`).join("");
    printHtml(`<!DOCTYPE html><html><head><title>${escHtml(inv.invoice_number)}</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:32px;color:#1e293b}.h{display:flex;justify-content:space-between;border-bottom:2px solid #201e1d;padding-bottom:16px;margin-bottom:20px}.co{font-size:20px;font-weight:700;color:#201e1d}.t{font-size:16px;font-weight:700;text-align:right}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#201e1d;color:#fff;padding:8px;text-align:left;font-size:11px}th:not(:first-child){text-align:right}td{padding:8px;border-bottom:1px solid #e2e8f0}.tot{text-align:right;font-size:16px;font-weight:800;margin-top:12px}</style></head><body><div class="h"><div><div class="co">${escHtml(COMPANY.name)}</div><div style="font-size:11px;color:#64748b">VAT: ${escHtml(COMPANY.vatNumber || "")}</div></div><div><div class="t">INVOICE ${escHtml(inv.invoice_number)}</div><div style="font-size:11px;color:#64748b;text-align:right">${fmtDate(inv.invoice_date)}</div></div></div><div style="margin-bottom:12px"><strong>${escHtml(inv.customer)}</strong></div><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="tot">Total: ${fmt(inv.amount)}</div></body></html>`);
  };

  // Whole-account statement
  const statementRows = () => custInvoices.map(inv => {
    const amtPaid = parseFloat(inv.amount_paid || 0);
    const bal = inv.status === "paid" ? 0 : parseFloat(inv.balance != null ? inv.balance : inv.amount || 0);
    return { inv, amtPaid, bal };
  });
  const statementHtml = () => {
    const rows = statementRows().map(({ inv, amtPaid, bal }) => `<tr><td style="font-family:monospace;color:#2563eb;font-weight:600">${escHtml(inv.invoice_number)}</td><td>${fmtDate(inv.invoice_date)}</td><td>${inv.due_date ? fmtDate(inv.due_date) : "—"}</td><td style="text-align:right;font-family:monospace">${fmt(inv.amount)}</td><td style="text-align:right;font-family:monospace;color:${amtPaid > 0 ? "#16a34a" : "#94a3b8"}">${amtPaid > 0 ? fmt(amtPaid) : "—"}</td><td style="text-align:right;font-family:monospace;font-weight:700;color:${inv.status === "paid" ? "#16a34a" : "#dc2626"}">${inv.status === "paid" ? "Cleared" : fmt(bal)}</td></tr>`).join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Statement — ${escHtml(customer.name)}</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:32px;color:#1e293b}.header{display:flex;justify-content:space-between;border-bottom:2px solid #201e1d;padding-bottom:16px;margin-bottom:20px}.co{font-size:20px;font-weight:700;color:#201e1d}.title{font-size:15px;font-weight:700;text-align:right}.cust{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:20px}.kpis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px}.kpi{border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px}.kl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}.kv{font-size:18px;font-weight:700;font-family:monospace}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#201e1d;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px}td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px}.bal{text-align:right;font-size:20px;font-weight:800;font-family:monospace;color:#dc2626}</style></head><body><div class="header"><div><div class="co">${escHtml(COMPANY.name)}</div><div style="font-size:11px;color:#64748b">${escHtml(COMPANY.address || "")} · VAT: ${escHtml(COMPANY.vatNumber || "")}</div></div><div><div class="title">ACCOUNT STATEMENT</div><div style="font-size:11px;color:#64748b;text-align:right">${fmtDate(new Date().toISOString())}</div></div></div><div class="cust"><strong>${escHtml(customer.name)}</strong><div style="font-size:11px;color:#64748b;margin-top:2px">${escHtml(customer.email || "")} ${customer.phone ? "· " + escHtml(customer.phone) : ""}</div></div><div class="kpis"><div class="kpi"><div class="kl">Total Invoiced</div><div class="kv">${fmt(k.totalInvoiced)}</div></div><div class="kpi"><div class="kl">Total Paid</div><div class="kv" style="color:#16a34a">${fmt(k.paid)}</div></div><div class="kpi"><div class="kl">Balance Due</div><div class="kv" style="color:#dc2626">${fmt(k.outstanding)}</div></div></div><table><thead><tr><th>Invoice</th><th>Date</th><th>Due</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th></tr></thead><tbody>${rows}</tbody></table><div class="bal">BALANCE DUE: ${fmt(k.outstanding)}</div><p style="font-size:11px;color:#64748b;margin-top:16px">Please contact ${escHtml(COMPANY.phone || "")} with any queries.</p></body></html>`;
  };
  const printStatement = () => printHtml(statementHtml());
  const emailStatement = async () => {
    if (!customer?.email) { toast.warn(`No email on file for ${customer.name}.`); return; }
    setSending("stmt");
    const res = await sendEmail({ to: customer.email, subject: `Account Statement — ${COMPANY.name}`, html: statementHtml(), token });
    if (res.success) { toast.success(`Statement emailed to ${customer.email}`); logAudit(token, userId, "statement_sent", "contact", customer.id, `Statement emailed to ${customer.email}`); }
    else toast[res.dev ? "warn" : "error"](res.error || "Failed to send.");
    setSending(null);
  };
  const whatsappStatement = () => {
    const lines = custInvoices.map(inv => `${inv.invoice_number} — ${fmtDate(inv.invoice_date)} — ${fmt(inv.amount)} — ${(inv.status || "").toUpperCase()}`).join("\n");
    const msg = encodeURIComponent(`*Account Statement — ${COMPANY.name}*\nCustomer: *${customer.name}*\n\n${lines}\n\n*Balance Outstanding: ${fmt(k.outstanding)}*\n\nContact us on ${COMPANY.phone} for any queries.`);
    const clean = (customer.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    window.open(clean ? `https://wa.me/${clean}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  };

  // Inline credit note
  const saveCN = async () => {
    if (!cnForm.amount || !cnForm.reason) { toast.warn("Enter an amount and a reason."); return; }
    setSavingCN(true);
    const num = await nextDocNumber(token, { prefix: "CN", table: "credit_notes", column: "cn_number", width: 3 });
    const row = { customer_id: customer.id, customer_name: customer.name, invoice_id: cnForm.invoice_id || null, reason: cnForm.reason, amount: parseFloat(cnForm.amount), issue_date: cnForm.issue_date, cn_number: num, status: "draft", created_by: userId };
    const data = await sb.post(token, "credit_notes", row);
    if (data && data[0]) {
      setCreditNotes(prev => [data[0], ...prev]);
      logAudit(token, userId, "credit_note_created", "credit_note", data[0].id, `${num} issued to ${customer.name} — ${fmt(parseFloat(cnForm.amount))}${cnForm.reason ? " · " + cnForm.reason : ""}`);
      toast.success(`Credit note ${num} created`);
      setShowCN(false); setCnForm({ invoice_id: "", amount: "", reason: "", issue_date: today() });
    } else toast.error("Failed to create credit note.");
    setSavingCN(false);
  };

  const statusBadge = (s) => "badge " + (s === "paid" ? "b-green" : s === "overdue" ? "b-red" : s === "partial" ? "b-amber" : s === "draft" ? "b-gray" : "b-amber");

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Commerce</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Customer <span style={{ background: "linear-gradient(135deg,#ff6a4d,#dd2b0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Hub</span></div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Everything for one customer — invoices, statements and credit notes in one place</div>
        </div>
        {customer && (
          <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
            {[
              { label: "Total Invoiced", val: fmt(k.totalInvoiced), sub: `${custInvoices.length} invoices`, accent: "#dd2b0f" },
              { label: "Paid", val: fmt(k.paid), sub: "received", accent: "#16a34a" },
              { label: "Outstanding", val: fmt(k.outstanding), sub: k.overdue > 0 ? `${fmt(k.overdue)} overdue` : "on terms", accent: k.outstanding > 0 ? "#dc2626" : "#16a34a" },
              { label: "Credit Limit", val: creditLimit > 0 ? fmt(creditLimit) : "—", sub: creditLimit > 0 ? `${Math.round((k.outstanding / creditLimit) * 100)}% used` : "no limit set", accent: overLimit ? "#dc2626" : "#57534e" },
            ].map((kp, i) => (
              <div key={i} style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", borderTop: `3px solid ${kp.accent}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{kp.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{kp.val}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{kp.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer picker */}
      <div className="card" style={{ marginBottom: 16, padding: "14px 20px", overflow: "visible" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 280px", maxWidth: 460, position: "relative" }}>
            <SearchDropdown placeholder="Search customers…" items={customers} onSelect={c => setSelId(c.id)} />
          </div>
          {customer && <button className="btn bg2 bsm" onClick={() => setSelId(null)}>Clear</button>}
        </div>
      </div>

      {!customer ? (
        <EmptyState icon="customer" title="Pick a customer" sub="Search above to open a customer's full record — invoices, statement and credit notes in one place." />
      ) : (
        <>
          {/* Customer header + actions */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: "0.5px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 46, height: 46, borderRadius: "var(--rl)", background: "#dd2b0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{customer.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 17, fontWeight: 800 }}>{customer.name}</span>
                    {onHold && <span className="badge b-red">ON HOLD</span>}
                    {overLimit && <span className="badge b-amber">OVER LIMIT</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{[customer.email, customer.phone, customer.city].filter(Boolean).join(" · ") || "No contact details"}</div>
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn bp bsm" onClick={() => setShowInvoiceForm(true)}>+ New Invoice</button>
              <button className="btn bo bsm" onClick={() => { setCnForm({ invoice_id: "", amount: "", reason: "", issue_date: today() }); setShowCN(true); }}>+ Credit Note</button>
              <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
              <button className="btn bo bsm" disabled={!customer.email || sending === "stmt"} onClick={emailStatement}>{sending === "stmt" ? "Sending…" : "Email statement"}</button>
              <button className="btn bo bsm" onClick={printStatement}>Print statement</button>
              <button className="btn bwa bsm" onClick={whatsappStatement}>WhatsApp statement</button>
            </div>
          </div>

          {/* Invoices */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="ch"><div className="ct">Invoices</div><div className="cs">{custInvoices.length} invoice{custInvoices.length !== 1 ? "s" : ""}</div></div>
            <div className="tw" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ minWidth: 640 }}>
                <thead><tr><th>Invoice</th><th>Date</th><th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Balance</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {custInvoices.map(inv => {
                    const bal = inv.status === "paid" ? 0 : parseFloat(inv.balance != null ? inv.balance : inv.amount || 0);
                    return (
                      <tr key={inv.id}>
                        <td className="mono" style={{ color: "var(--blue)", fontWeight: 600, fontSize: 12 }}>{inv.invoice_number}</td>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(inv.invoice_date)}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{fmt(inv.amount)}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: bal > 0 ? "#dc2626" : "#16a34a" }}>{inv.status === "paid" ? "✓" : fmt(bal)}</td>
                        <td><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button className="btn bg2 bsm" onClick={() => setViewInvoice(inv)}>View</button>
                            <button className="btn bo bsm" disabled={!customer.email || sending === "inv-" + inv.id} onClick={() => emailInvoice(inv)} title="Email this invoice">{sending === "inv-" + inv.id ? "…" : "Email"}</button>
                            <button className="btn bwa bsm" onClick={() => whatsappInvoice(inv)} title="Send via WhatsApp">WhatsApp</button>
                            <button className="btn bg2 bsm" onClick={() => printInvoice(inv)} title="Print / PDF">Print</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {custInvoices.length === 0 && <tr><td colSpan={6} className="empty">No invoices yet — use “New Invoice” above.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Credit notes */}
          <div className="card">
            <div className="ch"><div className="ct">Credit Notes</div><div className="cs">{creditNotes.length} for this customer</div></div>
            <div className="tw" style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 480 }}>
                <thead><tr><th>Number</th><th>Date</th><th style={{ textAlign: "right" }}>Amount</th><th>Reason</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {creditNotes.map(cn => (
                    <tr key={cn.id}>
                      <td className="mono" style={{ color: "var(--purple,#7c3aed)", fontWeight: 600, fontSize: 12 }}>{cn.cn_number}</td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(cn.issue_date)}</td>
                      <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{fmt(cn.amount)}</td>
                      <td style={{ fontSize: 12 }}>{cn.reason || "—"}</td>
                      <td><span className={"badge " + (cn.status === "applied" ? "b-green" : cn.status === "issued" ? "b-blue" : "b-gray")}>{cn.status}</span></td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button className="btn bwa bsm" onClick={() => whatsappCreditNote(cn)} title="Send via WhatsApp">WhatsApp</button>
                          <button className="btn bg2 bsm" onClick={() => printCreditNote(cn)} title="Print / PDF">Print</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {creditNotes.length === 0 && <tr><td colSpan={6} className="empty">No credit notes — use “Credit Note” above to raise one.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custom pricing (admin) */}
          {isAdmin && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="ch" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div><div className="ct">Custom Pricing</div><div className="cs">Per-customer product prices for {customer.name}</div></div>
                <button className="btn bo bsm" onClick={() => setShowPricing(v => !v)}>{showPricing ? "Hide" : "Add price"}</button>
              </div>
              <div style={{ padding: customerPrices.length || showPricing ? "12px 20px 16px" : "0" }}>
                {customerPrices.length > 0 && (
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--rl)", overflow: "hidden", marginBottom: showPricing ? 12 : 0 }}>
                    {customerPrices.map(cp => {
                      const prod = products.find(p => p.id === cp.product_id);
                      return (
                        <div key={cp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod?.name || "Unknown product"}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>Default {fmt(prod?.sale_price || 0)} → <span style={{ color: "var(--blue)", fontWeight: 600 }}>Custom {fmt(cp.custom_price)}</span></div>
                          </div>
                          <button onClick={() => deletePrice(cp)} title="Remove custom price" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 18, lineHeight: 1, padding: "2px 6px", flexShrink: 0 }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showPricing && (
                  <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--text2)" }}>Set a custom price for a product</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <select value={priceForm.product_id} onChange={e => setPriceForm(v => ({ ...v, product_id: e.target.value }))} style={{ flex: 2, minWidth: 160, padding: "8px 10px", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", fontSize: 13, background: "var(--white)", color: "var(--text)", outline: "none" }}>
                        <option value="">Select product…</option>
                        {products.filter(p => p.name && p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name} ({fmt(p.sale_price)})</option>)}
                      </select>
                      <input type="number" min="0" step="0.01" placeholder="Custom price £" value={priceForm.custom_price} onChange={e => setPriceForm(v => ({ ...v, custom_price: e.target.value }))} style={{ flex: 1, minWidth: 110, padding: "8px 10px", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", fontSize: 13, background: "var(--white)", color: "var(--text)", outline: "none", fontFamily: "var(--mono)" }} />
                      <button className="btn bp bsm" onClick={savePrice} disabled={savingPrice || !priceForm.product_id || !priceForm.custom_price}>{savingPrice ? "Saving…" : "Save price"}</button>
                    </div>
                  </div>
                )}
                {!customerPrices.length && !showPricing && <div style={{ fontSize: 12, color: "var(--text3)", padding: "12px 0" }}>No custom prices — this customer pays standard list prices. Use “Add price” to override.</div>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Inline New Invoice (reuses the full invoice form, prefilled) */}
      {showInvoiceForm && customer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(10,14,26,.5)", overflowY: "auto", padding: isMobile() ? 0 : "24px 0" }} onClick={e => e.target === e.currentTarget && setShowInvoiceForm(false)}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 12px" }} onClick={e => e.stopPropagation()}>
            <InvoiceForm contacts={contacts} setContacts={setContacts} products={products} accounts={accounts} token={token} userId={userId} invoices={invoices} initialCustomer={customer.name}
              onSave={(inv) => { setInvoices(prev => [inv, ...prev]); }}
              onClose={() => setShowInvoiceForm(false)} />
          </div>
        </div>
      )}

      {/* View / re-send an invoice */}
      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} contacts={contacts} token={token} profile={profile}
          onStatusChange={async (id, status) => { await sb.patch(token, "invoices", id, { status }); setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i)); setViewInvoice(prev => prev?.id === id ? { ...prev, status } : prev); }}
          onLogPartPay={(inv, amt, method, newBal) => logAudit(token, userId, "part_payment", "invoice", inv.id, `${inv.invoice_number} — ${fmt(amt)} via ${method}. Remaining ${fmt(newBal)}`)} />
      )}

      {/* Inline credit note */}
      {showCN && customer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(10,14,26,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && !savingCN && setShowCN(false)}>
          <div className="card" style={{ maxWidth: 440, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 20px", borderBottom: "0.5px solid var(--border)" }}><div style={{ fontSize: 16, fontWeight: 800 }}>New credit note — {customer.name}</div><div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>Created as a draft; issue &amp; apply it from the Credits page.</div></div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Related invoice (optional)</label>
                <select value={cnForm.invoice_id} onChange={e => setCnForm(v => ({ ...v, invoice_id: e.target.value }))} style={{ width: "100%", minHeight: 42, border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "0 12px", fontSize: 13, outline: "none", background: "var(--white)", fontFamily: "var(--sans)" }}>
                  <option value="">— none —</option>
                  {custInvoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {fmt(i.amount)}</option>)}
                </select></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Amount (£)</label><input type="number" min="0" step="0.01" value={cnForm.amount} onChange={e => setCnForm(v => ({ ...v, amount: e.target.value }))} placeholder="0.00" style={{ width: "100%", minHeight: 42, border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "var(--mono)" }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Issue date</label><input type="date" value={cnForm.issue_date} onChange={e => setCnForm(v => ({ ...v, issue_date: e.target.value }))} style={{ width: "100%", minHeight: 42, border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} /></div>
              </div>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Reason</label><input value={cnForm.reason} onChange={e => setCnForm(v => ({ ...v, reason: e.target.value }))} placeholder="Reason for credit…" style={{ width: "100%", minHeight: 42, border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} /></div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "0.5px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn bg2" disabled={savingCN} onClick={() => setShowCN(false)}>Cancel</button>
              <button className="btn bp" disabled={savingCN} onClick={saveCN}>{savingCN ? "Saving…" : "Create credit note"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
