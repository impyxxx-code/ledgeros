import React, { useState, useEffect } from "react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase.js";
import { fmtDate, today, isMobile } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { COMPANY, LOGO } from "../lib/constants.js";
import { EmptyState } from "../components/ui.jsx";

export function DeliveryNotes({ contacts, products, token, userId }) {
  const [dns, setDNs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ customer_id: "", delivery_date: today(), delivery_address: "", notes: "", driver: "" });
  const [lines, setLines] = useState([{ product_id: "", description: "", qty: 1, unit: "unit" }]);
  const [dnFilter, setDnFilter] = useState("all");

  useEffect(() => {
    sb.get(token, "delivery_notes", "order=created_at.desc")
      .then(d => Array.isArray(d) && setDNs(d));
  }, [token]);

  const customers = contacts.filter(c => c.type === "customer" || c.type === "both");

  const updateLine = (i, field, val) => {
    const next = [...lines];
    if (field === "product_id") {
      const p = products.find(x => x.id === val);
      next[i] = { ...next[i], product_id: val, description: p?.name || "", unit: p?.unit || "unit" };
    } else {
      next[i] = { ...next[i], [field]: val };
    }
    setLines(next);
  };

  const save = async () => {
    if (!f.customer_id) return;
    setSaving(true);
    const existing = await sb.get(token, "delivery_notes", "select=id");
    const count = Array.isArray(existing) ? existing.length + 1 : 1;
    const dn_number = `DN-${String(count).padStart(4, "0")}`;
    const cust = customers.find(c => c.id === f.customer_id);
    const data = await sb.post(token, "delivery_notes", {
      dn_number, customer_name: cust?.name, customer_id: f.customer_id,
      delivery_date: f.delivery_date, delivery_address: f.delivery_address || cust?.address || "",
      notes: f.notes, driver: f.driver, status: "pending",
      lines: JSON.stringify(lines), created_by: userId
    });
    if (data[0]) { setDNs(prev => [{ ...data[0], lines }, ...prev]); logAudit(token, userId, "delivery_created", "delivery_note", data[0].id, `${dn_number} created for ${cust?.name}${f.driver ? ' · Driver: ' + f.driver : ''}`); }
    setF({ customer_id: "", delivery_date: today(), delivery_address: "", notes: "", driver: "" });
    setLines([{ product_id: "", description: "", qty: 1, unit: "unit" }]);
    setShowForm(false);
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    await sb.patch(token, "delivery_notes", id, { status });
    setDNs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const printDN = async (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];

    // Use contacts.total_outstanding (maintained by DB trigger) for the balance figure
    // Then fetch the individual overdue invoices using the agent's own JWT — agents may
    // only see their own invoices, but total_outstanding always reflects ALL invoices
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
    const fmt = v => '£' + parseFloat(v||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

    // Delivery value totals
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
          <div class="os-total">${fmt(totalOutstanding)} overdue</div>
        </div>
        <table class="os-table">
          <thead><tr>
            <th>Invoice</th><th>Date</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance</th><th style="text-align:right">Days</th><th style="text-align:center">Status</th>
          </tr></thead>
          <tbody>
            ${overdueInvs.map(i => `<tr>
              <td style="font-weight:600">${i.invoice_number}</td>
              <td style="color:#64748b">${fmtD(i.invoice_date)}</td>
              <td style="text-align:right">${fmt(i.amount)}</td>
              <td style="text-align:right;font-weight:600;color:#991b1b">${fmt(i.balance||i.amount)}</td>
              <td style="text-align:right;color:#991b1b">${daysSince(i.invoice_date)}d</td>
              <td style="text-align:center">${badgeMap[i.status]||''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="os-notice">Goods are delivered subject to full payment of all outstanding balances. Please arrange settlement of overdue invoices immediately. Continued supply may be withheld until account is brought up to date.</div>
      </div>` : '';

    const itemsTable = `
      <table>
        <thead><tr>
          <th style="width:38%">Description</th>
          <th style="text-align:center">Unit</th>
          <th style="text-align:center">Qty</th>
          ${hasPrice ? '<th style="text-align:right">Unit price</th><th style="text-align:right">Line total</th>' : ''}
          <th style="text-align:center">Delivered</th>
        </tr></thead>
        <tbody>
          ${dnLines.map(l => `<tr>
            <td style="font-weight:600">${l.description||'—'}</td>
            <td style="text-align:center;color:#64748b">${l.unit||'unit'}</td>
            <td style="text-align:center;font-weight:600">${l.qty}</td>
            ${hasPrice ? `<td style="text-align:right">${fmt(l.unit_price)}</td><td style="text-align:right;font-weight:600">${fmt((l.unit_price||0)*(l.qty||0))}</td>` : ''}
            <td style="text-align:center;color:#94a3b8">______</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${hasPrice ? `<div class="deliv-total"><div class="deliv-total-box"><span class="deliv-total-lbl">This delivery value</span><span class="deliv-total-val">${fmt(deliveryTotal)}</span></div></div>` : ''}`;

    const html = `<!DOCTYPE html><html><head><title>${dn.dn_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;padding:30mm 20mm 20mm;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent-bar{height:5px;background:linear-gradient(90deg,#201e1d 0%,#4f46e5 60%,#dd2b0f 100%);margin:-30mm -20mm 0}.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 0 20px;border-bottom:.5px solid #e2e8f0;margin-bottom:20px}.logo-wrap{display:flex;align-items:center;gap:14px;flex:1;min-width:0}.logo-box{width:160px;height:110px;display:flex;align-items:center;justify-content:flex-start;flex-shrink:0}.logo-box img{width:100%;height:100%;object-fit:contain;object-position:left}.co-name{font-size:15px;font-weight:700;color:#0f172a}.co-det{font-size:10.5px;color:#64748b;line-height:1.6;margin-top:2px;word-break:break-word}.dn-title{font-size:24px;font-weight:900;color:#e2e8f0;letter-spacing:-1px;text-align:right;line-height:1}.dn-num{font-size:15px;font-weight:800;text-align:right;color:#0f172a;margin-top:2px}.dn-status{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;background:#dbeafe;color:#1e40af;border:.5px solid #bfdbfe}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.meta-dk{background:#201e1d;border-radius:8px;padding:14px 16px}.meta-dk .lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}.meta-dk .val{font-size:18px;font-weight:700;color:#fff;line-height:1.2}.meta-dk .sub{font-size:11px;color:rgba(255,255,255,.5);margin-top:6px;line-height:1.7}.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mbox{background:#f8fafc;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 12px}.mbox .lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.mbox .val{font-size:12px;font-weight:600;color:#0f172a}table{width:100%;border-collapse:collapse;margin-bottom:16px}thead tr{background:#201e1d}th{padding:9px 10px;font-size:9px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;text-align:left}th:first-child{border-radius:6px 0 0 6px}th:last-child{border-radius:0 6px 6px 0}td{padding:10px;border-bottom:.5px solid #f1f5f9;font-size:12px}tr:last-child td{border-bottom:none}.deliv-total{display:flex;justify-content:flex-end;margin-bottom:20px}.deliv-total-box{display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:.5px solid #e2e8f0;border-radius:8px;padding:10px 16px;min-width:220px;gap:16px}.deliv-total-lbl{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px}.deliv-total-val{font-size:15px;font-weight:700;color:#0f172a}.os-section{margin-top:24px;margin-bottom:20px}.os-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.os-lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px}.os-total{background:#fee2e2;border:.5px solid #fca5a5;border-radius:8px;padding:4px 14px;font-size:13px;font-weight:700;color:#991b1b}.os-table{width:100%;border-collapse:collapse;margin-bottom:12px}.os-table thead tr{background:#f8fafc;border-bottom:.5px solid #e2e8f0}.os-table th{padding:6px 8px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;text-align:left}.os-table td{padding:7px 8px;border-bottom:.5px solid #f8fafc;font-size:11px}.os-table tr:last-child td{border-bottom:none}.overdue-badge{background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.partial-badge{background:#ede9fe;color:#5b21b6;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.pending-badge{background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px}.os-notice{border:.5px solid #fca5a5;border-left:3px solid #dc2626;border-radius:0 8px 8px 0;padding:10px 14px;background:#fff7f7;margin-bottom:20px;font-size:11px;color:#991b1b;line-height:1.6}.nb{background:#fef9ec;border:.5px solid #fcd34d;border-radius:8px;padding:12px 14px;margin-bottom:16px}.nb .lbl{font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.nb .val{font-size:12px;color:#78350f;line-height:1.6}.sig-section{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px}.sig-box{border:.5px solid #e2e8f0;border-radius:8px;padding:14px 16px}.sig-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px}.sig-line{height:44px;border-bottom:1.5px solid #cbd5e1;margin-bottom:8px}.sig-hint{display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}.tb{border:.5px solid #e2e8f0;border-left:3px solid #4f46e5;border-radius:0 8px 8px 0;padding:12px 14px;background:#f8fafc;margin-bottom:14px}.tb .lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}.tb .val{font-size:11px;color:#64748b;line-height:1.7}.footer-box{border:.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:9px;color:#64748b;line-height:1.8}.footer-box b{color:#475569}</style></head><body>
      <div class="accent-bar"></div>
      <div class="hdr">
        <div class="logo-wrap">
          <div class="logo-box"><img src="${LOGO}" alt="Arkham Retail"/></div>
        </div>
        <div style="text-align:right;flex-shrink:0;max-width:160px">
          <div class="dn-title">DELIVERY NOTE</div>
          <div class="dn-num">${dn.dn_number}</div>
          <div class="dn-status">${(dn.status||'pending').toUpperCase()}</div>
        </div>
      </div>
      <div class="meta">
        <div class="meta-dk">
          <div class="lbl">Deliver to</div>
          <div class="val">${dn.customer_name}</div>
          ${dn.delivery_address ? '<div class="sub">'+dn.delivery_address.replace(/\n/g,'<br>')+'</div>' : ''}
        </div>
        <div class="mgrid">
          <div class="mbox"><div class="lbl">DN number</div><div class="val">${dn.dn_number}</div></div>
          <div class="mbox"><div class="lbl">Date</div><div class="val">${fmtD(dn.delivery_date)}</div></div>
          ${dn.invoice_ref ? '<div class="mbox"><div class="lbl">Invoice ref</div><div class="val">'+dn.invoice_ref+'</div></div>' : '<div class="mbox"><div class="lbl">Invoice ref</div><div class="val">—</div></div>'}
          <div class="mbox"><div class="lbl">Driver</div><div class="val">${dn.driver||'—'}</div></div>
        </div>
      </div>
      ${itemsTable}
      ${overdueSection}
      ${dn.notes ? '<div class="nb"><div class="lbl">Delivery instructions</div><div class="val">'+dn.notes+'</div></div>' : ''}
      <div class="sig-section">
        <div class="sig-box"><div class="sig-lbl">Delivered by</div><div class="sig-line"></div><div class="sig-hint"><span>Signature</span><span>Name &amp; date</span></div></div>
        <div class="sig-box"><div class="sig-lbl">Received by</div><div class="sig-line"></div><div class="sig-hint"><span>Signature</span><span>Name &amp; date</span></div></div>
      </div>
      <div class="tb"><div class="lbl">Terms</div><div class="val">Goods remain the property of Arkham Retail Ltd until paid for in full. This delivery note must be signed and returned. Any discrepancies must be reported within 24 hours of receipt.</div></div>
      <div class="footer-box"><div><b>${COMPANY.name}</b> &middot; ${COMPANY.address}, ${COMPANY.address2}, ${COMPANY.city}, ${COMPANY.county}, ${COMPANY.postcode}</div><div>VAT: ${COMPANY.vatNumber} &middot; Tel: ${COMPANY.phone} &middot; ${COMPANY.email}</div></div>
    </body></html>`;

    window.__ledgerosPrint && window.__ledgerosPrint(html);
  };

    const sendWhatsApp = (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const msg = encodeURIComponent(
      `*Delivery Note — ${COMPANY.name}*\n\n` +
      `DN: *${dn.dn_number}*\n` +
      (dn.invoice_ref ? `Invoice Ref: ${dn.invoice_ref}\n` : "") +
      `Customer: ${dn.customer_name}\n` +
      `Date: ${fmtDate(dn.delivery_date)}\n` +
      (dn.driver ? `Driver: ${dn.driver}\n` : "") +
      (dn.delivery_address ? `Address: ${dn.delivery_address}\n` : "") +
      `\n*Items:*\n` +
      dnLines.map(l => `• ${l.description} — Qty: ${l.qty} ${l.unit || "unit"}`).join("\n") +
      (dn.notes ? `\n\n📋 Instructions: ${dn.notes}` : "") +
      `\n\nPlease confirm receipt. Thank you! 🙏\n${COMPANY.phone}`
    );
    const cust = contacts.find(c => c.name === dn.customer_name);
    const phone = (cust?.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    else window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const sendEmail = (dn) => {
    const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
    const cust = contacts.find(c => c.name === dn.customer_name);
    const subject = encodeURIComponent(`Delivery Note ${dn.dn_number} — ${COMPANY.name}`);
    const body = encodeURIComponent(
      `Dear ${dn.customer_name},\n\nPlease find your delivery note details below.\n\n` +
      `Delivery Note: ${dn.dn_number}\n` +
      (dn.invoice_ref ? `Invoice Reference: ${dn.invoice_ref}\n` : "") +
      `Date: ${fmtDate(dn.delivery_date)}\n` +
      (dn.driver ? `Driver: ${dn.driver}\n` : "") +
      (dn.delivery_address ? `Delivery Address: ${dn.delivery_address}\n` : "") +
      `\nItems:\n` +
      dnLines.map(l => `• ${l.description} — Qty: ${l.qty} ${l.unit || "unit"}`).join("\n") +
      (dn.notes ? `\n\nInstructions: ${dn.notes}` : "") +
      `\n\nPlease sign and return a copy upon receipt.\n\n${COMPANY.name}\n${COMPANY.phone}\n${COMPANY.email}`
    );
    window.open(`mailto:${cust?.email || ""}?subject=${subject}&body=${body}`);
  };

  return (
    <div>
      {isMobile() ? (
        <div style={{ margin: "-12px -12px 12px", padding: "16px 16px 12px", background: "#0f172a", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Delivery Notes</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop:2 }}>{dns.length} total · {dns.filter(d=>d.status==="pending").length} pending</div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink:0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New</button>
        </div>
      ) : (
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 1, flexWrap: "wrap", gap: 10 }}>
          <div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Commerce</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Delivery <span style={{ background: "linear-gradient(135deg,#a78bfa,#ff6a4d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Notes</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{dns.length} total · {dns.filter(d=>d.status==="pending").length} pending</div></div>
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Delivery Note</button>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Total DNs",val:dns.length,sub:"all delivery notes",accent:"#dd2b0f",filter:"all"},{label:"Pending",val:dns.filter(d=>d.status==="pending").length,sub:"awaiting delivery",accent:"#d97706",filter:"pending"},{label:"Delivered",val:dns.filter(d=>d.status==="delivered").length,sub:"completed",accent:"#16a34a",filter:"delivered"},{label:"This Month",val:dns.filter(d=>{const m=new Date();return new Date(d.created_at).getMonth()===m.getMonth()&&new Date(d.created_at).getFullYear()===m.getFullYear();}).length,sub:"this month",accent:"#7c3aed",filter:null}].map((k,i)=>{
            const isActive = k.filter && dnFilter === k.filter && k.filter !== "all" || (k.filter === "all" && dnFilter === "all");
            const isClickable = !!k.filter;
            return (
            <div key={i} onClick={() => k.filter && setDnFilter(dnFilter === k.filter ? "all" : k.filter)}
              title={isClickable ? `Click to filter by ${k.label}` : undefined}
              style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${isActive && k.filter!=="all" ? k.accent : (k.filter==="all" ? "transparent" : "transparent")}`, cursor:isClickable?"pointer":"default", background: isActive && k.filter!=="all" ? "rgba(255,255,255,.08)" : "transparent", transition:"all .15s" }}
              onMouseEnter={e => { if(isClickable){ e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop=`3px solid ${k.accent}`; }}}
              onMouseLeave={e => { if(isClickable){ e.currentTarget.style.background=(isActive && k.filter!=="all")?"rgba(255,255,255,.08)":"transparent"; e.currentTarget.style.borderTop=(isActive && k.filter!=="all")?`3px solid ${k.accent}`:"3px solid transparent"; }}}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          );})}
        </div>
      </div>
      )}

      {/* Summary KPIs */}
      {!isMobile() && <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom: 20 }}>
        {[
          { label: "Total", val: dns.length, color: "var(--text)" },
          { label: "Pending", val: dns.filter(d => d.status === "pending").length, color: "var(--amber)" },
          { label: "In Transit", val: dns.filter(d => d.status === "in_transit").length, color: "var(--blue)" },
          { label: "Delivered", val: dns.filter(d => d.status === "delivered").length, color: "var(--green)" },
        ].map(k => (
          <div key={k.label} className="kpi" style={{ marginBottom: 0 }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>}

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="ch"><div className="ct">New Delivery Note</div><button className="btn bo bsm" onClick={() => setShowForm(false)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Cancel</button></div>
          <div className="fg">
            <div className="fgrp">
              <label>Customer *</label>
              <select value={f.customer_id} onChange={e => {
                const cust = customers.find(c => c.id === e.target.value);
                setF({ ...f, customer_id: e.target.value, delivery_address: [cust?.address, cust?.city, cust?.postcode].filter(Boolean).join(", ") });
              }}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="fgrp">
              <label>Delivery Date</label>
              <div style={{display:"flex",gap:5,marginBottom:5}}>
                {[{l:"Today",d:0},{l:"+1 day",d:1},{l:"+3 days",d:3},{l:"+7 days",d:7}].map(({l,d})=>{
                  const v=new Date();v.setDate(v.getDate()+d);const val=v.toISOString().split("T")[0];const active=f.delivery_date===val;
                  return <button key={d} type="button" onClick={()=>setF({...f,delivery_date:val})} style={{flex:1,padding:"5px 0",borderRadius:6,border:"1px solid "+(active?"var(--blue)":"var(--border)"),background:active?"var(--blue)":"var(--white)",color:active?"#fff":"var(--text2)",fontSize:11,fontWeight:active?600:400,cursor:"pointer",fontFamily:"var(--sans)"}}>{l}</button>;
                })}
              </div>
              <input type="date" value={f.delivery_date} onChange={e=>setF({...f,delivery_date:e.target.value})} />
            </div>
            <div className="fgrp"><label>Driver / Courier</label><input value={f.driver} onChange={e => setF({ ...f, driver: e.target.value })} placeholder="e.g. John Smith or DPD" /></div>
            <div className="fgrp"><label>Delivery Address</label><input value={f.delivery_address} onChange={e => setF({ ...f, delivery_address: e.target.value })} placeholder="Auto-filled from customer" /></div>
            <div className="fgrp full"><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Special delivery instructions..." /></div>
          </div>

          {/* Line items */}
          <div style={{ borderTop: "0.5px solid var(--border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 30px", gap: 10, padding: "10px 18px", background: "#fafbfc", borderBottom: "0.5px solid var(--border)" }}>
              {["Product / Description", "Qty", "Unit", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</span>)}
            </div>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 30px", gap: 10, alignItems: "center", padding: "10px 18px", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <select className="il-input" value={l.product_id} onChange={e => updateLine(i, "product_id", e.target.value)}>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input className="il-input" placeholder="Or type description..." value={l.description} onChange={e => updateLine(i, "description", e.target.value)} />
                </div>
                <input type="number" className="il-input mono" value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} />
                <select className="il-input" value={l.unit} onChange={e => updateLine(i, "unit", e.target.value)}>
                  <option>unit</option><option>pack</option><option>box</option><option>kg</option><option>litre</option><option>pallet</option><option>carton</option>
                </select>
                <button className="ib" onClick={() => lines.length > 1 ? setLines(lines.filter((_, j) => j !== i)) : setLines([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
            ))}
            <div style={{ padding: "12px 18px", background: "#fafbfc", borderTop: "0.5px solid var(--border)" }}>
              <button className="btn bo bsm" onClick={() => setLines([...lines, { product_id: "", description: "", qty: 1, unit: "unit" }])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Item</button>
            </div>
          </div>
          <div className="ff">
            <button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn bp" onClick={save} disabled={saving || !f.customer_id}>{saving ? "Saving..." : "Create Delivery Note"}</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table className="dn-list-table" style={{minWidth:420}}>
          <thead><tr><th>DN #</th><th>Customer</th><th className="hm">Date</th><th className="hm">Driver</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {dns.filter(d => dnFilter === "all" || d.status === dnFilter).map(dn => {
              const dnLines = dn.lines ? (typeof dn.lines === "string" ? JSON.parse(dn.lines) : dn.lines) : [];
              return (
                <tr key={dn.id}>
                  <td className="mono" style={{ color: "var(--blue)", fontSize: 12, fontWeight: 600 }}>{dn.dn_number}</td>
                  <td style={{ fontWeight: 500 }}>{dn.customer_name}</td>
                  <td className="hm" style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(dn.delivery_date)}</td>
                  <td className="hm" style={{ fontSize: 12, color: "var(--text2)" }}>{dn.driver || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }}>{dnLines.length} item{dnLines.length !== 1 ? "s" : ""}</td>
                  <td>
                    <select
                      style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "4px 8px", fontSize: 11, outline: "none", cursor: "pointer" }}
                      value={dn.status || "pending"}
                      onChange={e => updateStatus(dn.id, e.target.value)}>
                      <option value="pending">⏳ Pending</option>
                      <option value="in_transit">🚚 In Transit</option>
                      <option value="delivered">✅ Delivered</option>
                      <option value="failed">❌ Failed</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn bo bsm" onClick={() => printDN(dn)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</button>
                      <button className="btn bo bsm" onClick={() => sendEmail(dn)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email</button>
                      <button className="btn bwa bsm" onClick={() => sendWhatsApp(dn)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {dns.length === 0 && <tr><td colSpan={7}><EmptyState icon="delivery" title="No delivery notes yet" sub="Create a delivery note after generating an invoice" /></td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
