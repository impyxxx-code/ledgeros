import React, { useState } from "react";
import { sb } from "../../lib/supabase.js";
import { fmt, fmtDate, escHtml } from "../../lib/utils.js";
import { COMPANY, toast } from "../../lib/constants.js";
import { sendEmail } from "../../lib/email.js";

// ── CUSTOMER STATEMENT ────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ CustomerStatement                                          │
// │ Printable customer statement                               │
// └────────────────────────────────────────────────────────────┘
export function CustomerStatement({ contacts, invoices, token }) {
  const [selectedContact, setSelectedContact] = useState(null);
  const [query, setQuery] = useState("");
  const customers = contacts.filter(c => c.type === "customer" || c.type === "both");
  const filtered = customers.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const [showDropdown, setShowDropdown] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const custInvoices = selectedContact ? invoices.filter(i => i.customer === selectedContact.name) : [];
  const totalOwed = custInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  const totalPaid = custInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  React.useEffect(() => {
    if (selectedContact && token) {
      sb.getCredits(token, selectedContact.name)
        .then(d => {
          const available = Array.isArray(d) ? d.filter(c => c.status === "available").reduce((s,c) => s + parseFloat(c.amount||0), 0) : 0;
          setCreditBalance(available);
        })
        .catch(() => setCreditBalance(0));
    } else {
      setCreditBalance(0);
    }
  }, [selectedContact, token]);
  const handleWhatsApp = () => {
    if (!selectedContact) return;
    const lines = custInvoices.map(inv => `${inv.invoice_number} — ${fmtDate(inv.invoice_date)} — ${fmt(inv.amount)} — ${inv.status.toUpperCase()}`).join("\n");
    const msg = encodeURIComponent(`*Account Statement — ${COMPANY.name}*\nCustomer: *${selectedContact.name}*\nDate: ${fmtDate(new Date().toISOString())}\n\n${lines}\n\nTotal Paid: ${fmt(totalPaid)}\n*Balance Outstanding: ${fmt(totalOwed)}*\n\nPlease contact us at ${COMPANY.phone} for any queries.`);
    const clean = (selectedContact.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    if (clean) window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
    else window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleEmail = async () => {
    if (!selectedContact) return;
    const toEmail = selectedContact.email;
    if (!toEmail) { toast.warn(`No email address for ${selectedContact.name}. Please add one in Customers first.`); return; }
    const rows = custInvoices.map(inv => {
      const amtPaid = parseFloat(inv.amount_paid||0);
      const bal = inv.status==="paid" ? 0 : parseFloat(inv.balance!=null?inv.balance:inv.amount);
      const statusColor = inv.status==="paid"?"#16a34a":inv.status==="overdue"?"#dc2626":inv.status==="partial"?"#d97706":"#92400e";
      return `<tr><td style="font-family:monospace;color:#2563eb;font-weight:600;padding:9px 12px;border-bottom:1px solid #f1f5f9">${escHtml(inv.invoice_number)}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">${fmtDate(inv.invoice_date)}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-weight:600;text-align:right">${fmt(inv.amount)}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;text-align:right;color:${amtPaid>0?"#16a34a":"#94a3b8"}">${amtPaid>0?fmt(amtPaid):"—"}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-weight:700;text-align:right;color:${inv.status==="paid"?"#16a34a":bal>0?"#dc2626":"#16a34a"}">${inv.status==="paid"?"✓ Cleared":fmt(bal)}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9"><span style="background:${statusColor}22;color:${statusColor};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${inv.status.toUpperCase()}</span></td></tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f0f2f5;margin:0;padding:24px 16px"><div style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09)"><div style="background:#0f172a;padding:24px 32px"><div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px">${escHtml(COMPANY.name)}</div><div style="font-size:12px;color:rgba(255,255,255,.5)">Account Statement · ${fmtDate(new Date().toISOString())}</div></div><div style="padding:28px 32px"><p style="font-size:14px;color:#0f172a;margin:0 0 20px">Dear <strong>${escHtml(selectedContact.name)}</strong>,<br><br>Please find below your account statement as of <strong>${fmtDate(new Date().toISOString())}</strong>.</p><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 16px"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Total Invoiced</div><div style="font-size:18px;font-weight:700;color:#0f172a">${fmt(totalPaid+totalOwed)}</div></div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 16px"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Total Paid</div><div style="font-size:18px;font-weight:700;color:#16a34a">${fmt(totalPaid)}</div></div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:12px 16px"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Balance Due</div><div style="font-size:18px;font-weight:700;color:${totalOwed>0?"#dc2626":"#16a34a"}">${fmt(totalOwed)}</div></div></div><table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:9px;overflow:hidden"><thead><tr style="background:#0f172a"><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:left">Invoice</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:left">Date</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:right">Total</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:right">Paid</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:right">Balance</th><th style="padding:9px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.6px;text-align:left">Status</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size:12px;color:#64748b;margin:20px 0 0">If you have any queries please contact us at ${escHtml(COMPANY.phone)}.<br><br>Kind regards,<br><strong>${escHtml(COMPANY.name)}</strong></p></div><div style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">${escHtml(COMPANY.name)} · ${escHtml(COMPANY.address)} · VAT: ${escHtml(COMPANY.vatNumber)}</div></div></body></html>`;
    const result = await sendEmail({ to: toEmail, subject: `Account Statement — ${COMPANY.name}`, html, token });
    if (result.success) toast.success(`Statement emailed to ${toEmail}`);
    else toast.error("Failed to send email. Please try again.");
  };

  const handlePrint = () => {
    if (!selectedContact) return;
    const statusColor = (s) => s === "paid" ? "#16a34a" : s === "overdue" ? "#dc2626" : s === "partial" ? "#d97706" : "#92400e";
    const rows = custInvoices.map(inv => {
      const amtPaid = parseFloat(inv.amount_paid || 0);
      const bal = (inv.status === "paid") ? 0 : (inv.balance != null && parseFloat(inv.balance) > 0) ? parseFloat(inv.balance) : parseFloat(inv.amount || 0);
      const method = inv.payment_method || "";
      const methodIcon = method === "cash" ? "Cash" : method === "bank" ? "Bank Transfer" : method === "card" ? "Card" : method || "—";
      return "<tr>" +
      "<td style='font-family:monospace;color:#2563eb;font-weight:600'>" + (inv.invoice_number||"") + "</td>" +
      "<td>" + fmtDate(inv.invoice_date) + "</td>" +
      "<td>" + (inv.due_date ? fmtDate(inv.due_date) : "—") + "</td>" +
      "<td style='text-align:right;font-family:monospace;font-weight:600'>" + fmt(inv.amount) + "</td>" +
      "<td style='text-align:right;font-family:monospace;font-weight:600;color:" + (amtPaid>0?"#16a34a":"#94a3b8") + "'>" + (amtPaid>0?fmt(amtPaid):"—") + "</td>" +
      "<td style='text-align:right;font-family:monospace;font-weight:700;color:" + (inv.status==="paid"?"#16a34a":"#dc2626") + "'>" + (inv.status==="paid"?"Cleared":fmt(bal)) + "</td>" +
      "<td style='font-size:11px;color:#64748b'>" + methodIcon + "</td>" +
      "<td><span style='display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:" + statusColor(inv.status) + "22;color:" + statusColor(inv.status) + "'>" + inv.status.toUpperCase() + "</span></td>" +
      "</tr>";
    }).join("");
    const html =
      "<!DOCTYPE html><html><head><title>Statement — " + selectedContact.name + "</title>" +
      "<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;padding:32px;color:#1e293b}" +
      ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #201e1d}" +
      ".co-name{font-size:22px;font-weight:700;color:#201e1d}.co-sub{font-size:11px;color:#64748b;margin-top:4px}" +
      ".stmt-title{font-size:14px;font-weight:700;color:#201e1d;text-align:right}.stmt-date{font-size:11px;color:#64748b;margin-top:4px;text-align:right}" +
      ".customer-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:24px}" +
      ".customer-name{font-size:14px;font-weight:700;color:#201e1d}.customer-sub{font-size:11px;color:#64748b;margin-top:3px}" +
      ".kpis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}" +
      ".kpi{border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px}" +
      ".kpi-label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}" +
      ".kpi-val{font-size:18px;font-weight:700;font-family:monospace}" +
      "table{width:100%;border-collapse:collapse;margin-bottom:24px}" +
      "th{background:#201e1d;color:#fff;padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}" +
      "td{padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}" +
      "tr:last-child td{border-bottom:none}" +
      "tr:nth-child(even) td{background:#f8fafc}" +
      ".footer{border-top:2px solid #201e1d;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end}" +
      ".footer-note{font-size:11px;color:#64748b;max-width:300px}" +
      ".balance{text-align:right}.balance-label{font-size:11px;color:#64748b;margin-bottom:4px}" +
      ".balance-val{font-size:22px;font-weight:700;font-family:monospace;color:#dc2626}" +
      "@media print{body{padding:20px}button{display:none}}</style></head><body>" +
      "<div class='header'><div><div class='co-name'>" + COMPANY.name + "</div><div class='co-sub'>" + (COMPANY.address||"") + " &bull; VAT: " + (COMPANY.vat||"") + "<br>" + COMPANY.phone + " &bull; " + (COMPANY.email||"") + "</div></div>" +
      "<div><div class='stmt-title'>ACCOUNT STATEMENT</div><div class='stmt-date'>Date: " + fmtDate(new Date().toISOString()) + "</div></div></div>" +
      "<div class='customer-box'><div class='customer-name'>" + selectedContact.name + "</div>" +
      "<div class='customer-sub'>" + (selectedContact.phone||"") + (selectedContact.email ? " &bull; " + selectedContact.email : "") + (selectedContact.city ? " &bull; " + selectedContact.city : "") + "</div></div>" +
      "<div class='kpis'>" +
      "<div class='kpi'><div class='kpi-label'>Total Invoiced</div><div class='kpi-val'>" + fmt(totalPaid+totalOwed) + "</div></div>" +
      "<div class='kpi'><div class='kpi-label'>Total Paid</div><div class='kpi-val' style='color:#16a34a'>" + fmt(totalPaid) + "</div></div>" +
      "<div class='kpi'><div class='kpi-label'>Balance Due</div><div class='kpi-val' style='color:#dc2626'>" + fmt(totalOwed) + "</div></div>" +
      "</div>" +
      "<table><thead><tr><th>Invoice #</th><th>Date</th><th>Due Date</th><th style='text-align:right'>Total</th><th style='text-align:right'>Paid</th><th style='text-align:right'>Balance</th><th>Method</th><th>Status</th></tr></thead><tbody>" + rows + "</tbody></table>" +
      "<div class='footer'><div class='footer-note'>Thank you for your business. Please contact " + COMPANY.phone + " for any queries regarding this statement.</div>" +
      "<div class='balance'><div class='balance-label'>BALANCE DUE</div><div class='balance-val'>" + fmt(totalOwed) + "</div></div></div>" +
      "</body></html>";
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Finance</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Customer <span style={{ background: "linear-gradient(135deg,#a78bfa,#ff6a4d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Statements</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>View and share full account statements</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Customers",val:contacts.filter(c=>c.type==="customer"||c.type==="both").length,sub:"active accounts",accent:"#dd2b0f"},{label:"With Balance",val:contacts.filter(c=>invoices.some(i=>i.customer===c.name&&i.status!=="paid"&&i.status!=="draft")).length,sub:"outstanding balance",accent:"#d97706"},{label:"Fully Paid",val:contacts.filter(c=>!invoices.some(i=>i.customer===c.name&&i.status!=="paid"&&i.status!=="draft")).length,sub:"clear accounts",accent:"#16a34a"},{label:"Total Outstanding",val:fmt(invoices.filter(i=>i.status!=="paid"&&i.status!=="draft").reduce((s,i)=>s+(parseFloat(i.amount)||0),0)),sub:"across all",accent:"#dc2626"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:"3px solid transparent", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop=`3px solid ${k.accent}`; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderTop="3px solid transparent"; }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 20, overflow: "visible" }}>
        <div className="ch"><div className="ct">Select Customer</div></div>
        <div style={{ padding: 20, overflow: "visible" }}>
          <div style={{ position: "relative", maxWidth: 500 }}>
            <input style={{ width: "100%", background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }} placeholder="Search customers by name..." value={query} onChange={e => { setQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
            {showDropdown && filtered.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 200, maxHeight: 300, overflowY: "auto", marginTop: 4 }}>
                {filtered.map(c => <div key={c.id} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "0.5px solid var(--border)", fontSize: 13 }} onMouseDown={() => { setSelectedContact(c); setQuery(c.name); setShowDropdown(false); }}><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{c.phone || ""} {c.city ? `· ${c.city}` : ""}</div></div>)}
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedContact && (
        <div className="card">
          <div className="ch">
            <div><div className="ct">Statement — {selectedContact.name}</div><div className="cs">{selectedContact.phone || ""} {selectedContact.email ? `· ${selectedContact.email}` : ""}</div></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn bo bsm" onClick={handleEmail} style={{display:"flex",alignItems:"center",gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Email
              </button>
              <button className="btn bo bsm" onClick={handlePrint} style={{display:"flex",alignItems:"center",gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print PDF
              </button>
              <button className="btn bwa bsm" onClick={handleWhatsApp}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: creditBalance > 0 ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 16, padding: "16px 20px", borderBottom: "0.5px solid var(--border)" }}>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Total Invoiced</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalPaid + totalOwed)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Total Paid</div><div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{fmt(totalPaid)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Balance Due</div><div style={{ fontSize: 20, fontWeight: 700, color: totalOwed > 0 ? "var(--red)" : "var(--green)" }}>{fmt(totalOwed)}</div></div>
            {creditBalance > 0 && <div style={{background:"#f0fdf4",borderRadius:8,padding:"12px 14px",border:"1px solid #bbf7d0"}}><div style={{ fontSize: 11, color: "#15803d", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px", fontWeight:700 }}>Credit Available</div><div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{fmt(creditBalance)}</div><div style={{fontSize:10,color:"#15803d",marginTop:2}}>Applied to next invoice</div></div>}
          </div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{minWidth:760}}>
              <thead><tr>
                <th>Invoice #</th><th>Date</th><th>Due Date</th><th>Total</th>
                <th>Paid</th><th>Balance</th><th>Method</th><th>Status</th>
              </tr></thead>
              <tbody>
                {custInvoices.map(inv => {
                  const amtPaid = parseFloat(inv.amount_paid || 0);
                  const balance = (inv.status === "paid") ? 0 : (inv.balance != null && parseFloat(inv.balance) > 0) ? parseFloat(inv.balance) : parseFloat(inv.amount || 0);
                  const method = inv.payment_method;
                  const methodIcon = method === "cash" ? "💵" : method === "bank" ? "🏦" : method === "card" ? "💳" : method ? "📝" : null;
                  return (
                    <tr key={inv.id}>
                      <td className="mono" style={{color:"var(--blue)",fontSize:12,fontWeight:600}}>{inv.invoice_number}</td>
                      <td style={{fontSize:12,color:"var(--text2)"}}>{fmtDate(inv.invoice_date)}</td>
                      <td style={{fontSize:12,color:"var(--text2)"}}>{fmtDate(inv.due_date)}</td>
                      <td className="mono" style={{fontWeight:600}}>{fmt(inv.amount)}</td>
                      <td className="mono" style={{fontWeight:600,color:amtPaid>0?"#16a34a":"var(--text3)"}}>{amtPaid>0?fmt(amtPaid):"—"}</td>
                      <td className="mono" style={{fontWeight:700,color:inv.status==="paid"?"#16a34a":balance>0?"#dc2626":"#16a34a"}}>
                        {inv.status==="paid"?"✓ Cleared":fmt(balance)}
                      </td>
                      <td style={{fontSize:12,color:"var(--text2)"}}>
                        {methodIcon?<span style={{display:"inline-flex",alignItems:"center",gap:4}}>{methodIcon} {method}</span>:"—"}
                      </td>
                      <td>
                        <span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="partial"?"b-amber":"b-amber")}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {custInvoices.length === 0 && <tr><td colSpan={8} className="empty">No invoices found for this customer</td></tr>}
              </tbody>
            </table>
          </div>
          {custInvoices.length > 0 && <div style={{ padding: "14px 20px", borderTop: "2px solid var(--border2)", display: "flex", justifyContent: "flex-end" }}><div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "var(--text3)" }}>BALANCE DUE</div><div style={{ fontSize: 20, fontWeight: 700, color: totalOwed > 0 ? "var(--red)" : "var(--green)" }}>{fmt(totalOwed)}</div></div></div>}
        </div>
      )}
    </div>
  );
}
