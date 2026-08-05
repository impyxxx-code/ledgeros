import React, { useState, useEffect } from "react";
import { sb } from "../lib/supabase.js";
import { nextDocNumber } from "../lib/numbering.js";
import { fmt, fmtDate, today, isMobile, DEFAULT_REORDER } from "../lib/utils.js";
import { vatRateOf } from "../lib/reporting.js";
import { logAudit } from "../lib/audit.js";
import { logStockMovement } from "../lib/stock.js";
import { buildReceipts, receivePurchaseOrder } from "../lib/goodsReceipt.js";
import { activeSuppliers } from "../lib/contacts.js";
import { EmptyState, MobileCard, ModalPortal } from "../components/ui.jsx";
import { SearchDropdown } from "../components/SearchDropdown.jsx";
import { toast } from "../lib/constants.js";

export function Purchases({ contacts, setContacts, products, setProducts, accounts = [], token, userId }) {
  const [pos, setPOs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState([{ product_id: "", product_name: "", qty: "", unit_cost: "", vat_rate: "20" }]);
  const [f, setF] = useState({ supplier_id: "", order_date: today(), expected_date: "", notes: "" });
  useEffect(() => { sb.get(token, "purchase_orders", "order=created_at.desc").then(d => Array.isArray(d) && setPOs(d)); }, [token]);
  const suppliers = activeSuppliers(contacts);
  const quickAddSupplier = async (name) => {
    if (!name.trim()) return;
    const data = await sb.post(token, "contacts", { name: name.trim(), type: "supplier", created_by: userId });
    if (data?.[0]) {
      setContacts && setContacts(prev => [data[0], ...prev]);
      setF(prev => ({ ...prev, supplier_id: data[0].id }));
      logAudit(token, userId, "contact_created", "contact", data[0].id, `${name} quick-added from purchase order form`);
      toast.success(`${name} added as supplier`);
    } else toast.error("Failed to create supplier");
  };
  const updateLine = (i, field, val) => { const next = [...lines]; if (field === "product_id") { const p = products.find(x => x.id === val); next[i] = { ...next[i], product_id: val, product_name: p?.name||"", unit_cost: p?.cost_price||"", vat_rate: String(vatRateOf(p)) }; } else next[i] = { ...next[i], [field]: val }; setLines(next); };
  const lineTotal = (l) => (parseFloat(l.qty)||0)*(parseFloat(l.unit_cost)||0);
  const total = lines.reduce((s,l) => s+lineTotal(l),0);
  const vatTotal = lines.reduce((s,l) => s+lineTotal(l)*(parseFloat(l.vat_rate)||0)/100,0);
  const save = async () => {
    if (!f.supplier_id) return; setSaving(true);
    const num = await nextDocNumber(token, { prefix: "PO", table: "purchase_orders", column: "po_number", width: 3 });
    const sup = suppliers.find(s => s.id === f.supplier_id);
    const po = await sb.post(token, "purchase_orders", { ...f, po_number: num, supplier_name: sup?.name, total: total+vatTotal, created_by: userId });
    if (po[0]) { for (const l of lines) if (l.product_id) await sb.post(token, "purchase_order_lines", { po_id: po[0].id, product_id: l.product_id, product_name: l.product_name, qty: parseFloat(l.qty)||0, unit_cost: parseFloat(l.unit_cost)||0, vat_rate: parseFloat(l.vat_rate)||0, total: lineTotal(l) }); setPOs(prev => [po[0],...prev]); logAudit(token, userId, "purchase_created", "purchase_order", po[0].id, `${num} raised for ${sup?.name} — £${(total+vatTotal).toFixed(2)}`); /* GL is now recognised at the supplier bill (postSupplierBillJournal), not at PO creation */ }
    setLines([{ product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20" }]);
    setF({ supplier_id:"",order_date:today(),expected_date:"",notes:"" });
    setShowForm(false); setSaving(false);
  };
  const updateStatus = async (id, status) => { await sb.patch(token,"purchase_orders",id,{status}); setPOs(prev => prev.map(p => p.id===id?{...p,status}:p)); };

  // ── Reorder automation ────────────────────────────────────────────────────
  const [showReorder, setShowReorder] = useState(false);
  const [reorderSel, setReorderSel] = useState({});      // productId -> selected
  const [reorderQty, setReorderQty] = useState({});      // productId -> qty
  const [reorderSupplier, setReorderSupplier] = useState("");
  const [reorderSaving, setReorderSaving] = useState(false);

  const lowStock = products.filter(p => p.active !== false && (parseFloat(p.stock_qty) || 0) <= (p.reorder_level || DEFAULT_REORDER));
  const suggestedQty = (p) => Math.max(1, Math.ceil((p.reorder_level || DEFAULT_REORDER) * 2 - (parseFloat(p.stock_qty) || 0)));

  const openReorder = () => {
    const sel = {}, qty = {};
    lowStock.forEach(p => { sel[p.id] = true; qty[p.id] = String(suggestedQty(p)); });
    setReorderSel(sel); setReorderQty(qty); setReorderSupplier(""); setShowReorder(true);
  };
  const reorderTotal = lowStock.filter(p => reorderSel[p.id]).reduce((s, p) => s + (parseInt(reorderQty[p.id]) || 0) * (parseFloat(p.cost_price) || 0), 0);

  const createReorderPO = async () => {
    const items = lowStock.filter(p => reorderSel[p.id] && (parseInt(reorderQty[p.id]) || 0) > 0);
    if (!reorderSupplier) { toast.error("Pick a supplier for the order"); return; }
    if (items.length === 0) { toast.error("Select at least one product"); return; }
    setReorderSaving(true);
    const sup = suppliers.find(s => s.id === reorderSupplier);
    const num = await nextDocNumber(token, { prefix: "PO", table: "purchase_orders", column: "po_number", width: 3 });
    const poTotal = items.reduce((s, p) => s + (parseInt(reorderQty[p.id]) || 0) * (parseFloat(p.cost_price) || 0), 0);
    const po = await sb.post(token, "purchase_orders", { supplier_id: reorderSupplier, supplier_name: sup?.name, order_date: today(), notes: "Auto-generated from low-stock reorder", po_number: num, total: poTotal, created_by: userId });
    if (po?.[0]) {
      for (const p of items) {
        const q = parseInt(reorderQty[p.id]) || 0;
        await sb.post(token, "purchase_order_lines", { po_id: po[0].id, product_id: p.id, product_name: p.name, qty: q, unit_cost: parseFloat(p.cost_price) || 0, vat_rate: parseFloat(p.vat_rate) || 0, total: q * (parseFloat(p.cost_price) || 0) });
      }
      setPOs(prev => [po[0], ...prev]);
      logAudit(token, userId, "purchase_created", "purchase_order", po[0].id, `${num} auto-reorder for ${sup?.name} — ${items.length} item(s), £${poTotal.toFixed(2)}`);
      toast.success(`${num} created — ${items.length} item${items.length !== 1 ? "s" : ""}`);
    } else toast.error("Failed to create PO");
    setReorderSaving(false); setShowReorder(false);
  };

  // ── Goods receipt ─────────────────────────────────────────────────────────
  const [receivePO, setReceivePO] = useState(null);
  const [receiveLines, setReceiveLines] = useState([]);
  const [receiveInputs, setReceiveInputs] = useState({}); // lineId -> qty receiving now
  const [loadingLines, setLoadingLines] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const openReceive = async (po) => {
    setReceivePO(po);
    setLoadingLines(true);
    const rows = await sb.get(token, "purchase_order_lines", `po_id=eq.${po.id}`);
    const ls = Array.isArray(rows) ? rows : [];
    setReceiveLines(ls);
    const init = {};
    ls.forEach(l => { init[l.id] = String(Math.max(0, (parseFloat(l.qty) || 0) - (parseFloat(l.qty_received) || 0))); });
    setReceiveInputs(init);
    setLoadingLines(false);
  };
  const closeReceive = () => { setReceivePO(null); setReceiveLines([]); setReceiveInputs({}); };

  const confirmReceive = async () => {
    if (!receivePO) return;
    setReceiving(true);
    // Build the clamped receipts payload and apply it atomically server-side.
    // The RPC updates stock + qty_received + PO status in ONE transaction, so a
    // failure can no longer leave phantom stock or a half-received PO.
    const receipts = buildReceipts(receiveLines, receiveInputs);
    if (receipts.length === 0) {
      setReceiving(false);
      closeReceive();
      toast.success("Nothing to receive");
      return;
    }
    const res = await receivePurchaseOrder({ token, poId: receivePO.id, receipts })
      .catch(e => ({ ok: false, error: e?.message }));
    if (!res.ok) {
      setReceiving(false);
      if (res.needsSql) toast.error("Goods receipt needs a database update — ask an admin to run RECEIVE_PURCHASE_ORDER.sql.");
      else if (res.reason === "cancelled") toast.error("This PO is cancelled — nothing was received.");
      else if (res.reason === "not_found") toast.error("Purchase order not found.");
      else toast.error(res.error || "Couldn't record the receipt — nothing was changed.");
      return;
    }
    // Success: stock, qty_received and status are already committed. Reflect the
    // authoritative post-increment values in local state and log each movement.
    const summary = [];
    for (const ln of res.lines) {
      if (ln.product_id && ln.new_stock != null) {
        setProducts && setProducts(prev => prev.map(p => p.id === ln.product_id ? { ...p, stock_qty: ln.new_stock } : p));
        const prod = products.find(p => p.id === ln.product_id);
        if (prod) logStockMovement(token, { product: prod, delta: ln.applied, balance_after: ln.new_stock, reason: "receipt", ref_type: "purchase_order", ref_id: receivePO.po_number, note: "Goods receipt", userId });
      }
      summary.push(`${ln.product_name || "item"} +${ln.applied}`);
    }
    setPOs(prev => prev.map(p => p.id === receivePO.id ? { ...p, status: res.status, received_date: today() } : p));
    if (summary.length) logAudit(token, userId, "stock_received", "purchase_order", receivePO.id, `${receivePO.po_number} goods received: ${summary.join(", ")}`);
    setReceiving(false);
    closeReceive();
    toast.success(summary.length === 0 ? "Nothing to receive" : res.status === "received" ? "PO fully received — stock updated" : "Partial receipt recorded — stock updated");
  };

  const statusBadgeCls = (s) => s === "received" ? "b-green" : s === "partial" ? "b-amber" : s === "sent" ? "b-blue" : s === "cancelled" ? "b-red" : "b-gray";

  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Purchasing</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Purchase <span style={{ background: "linear-gradient(135deg,#ff6a4d,#dd2b0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Orders</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Order stock from your suppliers</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {lowStock.length > 0 && (
              <button onClick={openReorder} style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile() ? "10px 14px" : "7px 14px", borderRadius: 8, border: "1px solid #f59e0b", background: "rgba(245,158,11,.15)", color: "#fbbf24", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: isMobile() ? 44 : "auto", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg>
                Reorder <span style={{ background: "#f59e0b", color: "#201e1d", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 800 }}>{lowStock.length}</span>
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile() ? "10px 14px" : "7px 14px", borderRadius: 8, border: "1px solid #dd2b0f", background: "#dd2b0f", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: isMobile() ? 44 : "auto", flexShrink: 0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New PO</button>
          </div>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Total POs",val:pos.length,sub:"all orders",accent:"#dd2b0f"},{label:"Pending",val:pos.filter(p=>p.status==="pending").length,sub:"awaiting delivery",accent:"#d97706"},{label:"Received",val:pos.filter(p=>p.status==="received").length,sub:"completed",accent:"#16a34a"},{label:"Total Value",val:fmt(pos.reduce((s,p)=>s+(parseFloat(p.total)||0),0)),sub:"all orders",accent:"#57534e"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {showReorder && (
        <div className="card" style={{ marginBottom: 20, borderTop: "3px solid #f59e0b" }}>
          <div className="ch" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div><div className="ct">Suggested Reorder</div><div className="cs">{lowStock.length} product{lowStock.length !== 1 ? "s" : ""} at or below reorder level · suggested to 2× reorder level</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 200 }}><SearchDropdown placeholder="Order from supplier..." items={suppliers} value={suppliers.find(s => s.id === reorderSupplier)?.name || ""} onSelect={s => setReorderSupplier(s.id)} onCreateNew={quickAddSupplier} createLabel="supplier" /></div>
              <button className="btn bo bsm" onClick={() => setShowReorder(false)}>Close</button>
            </div>
          </div>
          <div className="tw" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ minWidth: 560 }}>
              <thead><tr><th style={{ width: 36 }}></th><th>Product</th><th>In Stock</th><th>Reorder At</th><th>Order Qty</th><th>Est. Cost</th></tr></thead>
              <tbody>
                {lowStock.map(p => {
                  const q = parseInt(reorderQty[p.id]) || 0;
                  return (
                    <tr key={p.id} style={{ opacity: reorderSel[p.id] ? 1 : 0.5 }}>
                      <td><input type="checkbox" checked={!!reorderSel[p.id]} onChange={e => setReorderSel(prev => ({ ...prev, [p.id]: e.target.checked }))} style={{ width: 18, height: 18, cursor: "pointer" }} /></td>
                      <td style={{ fontWeight: 500 }}>{p.name}<div style={{ fontSize: 11, color: "var(--text3)" }}>{p.code || ""}</div></td>
                      <td className="mono" style={{ color: (parseFloat(p.stock_qty) || 0) === 0 ? "var(--red)" : "#d97706", fontWeight: 600 }}>{p.stock_qty || 0} {p.unit || ""}</td>
                      <td className="mono tm">{p.reorder_level || DEFAULT_REORDER}</td>
                      <td><input type="number" value={reorderQty[p.id] ?? ""} onChange={e => setReorderQty(prev => ({ ...prev, [p.id]: e.target.value }))} style={{ width: 70, padding: "6px 8px", border: "1px solid var(--border2)", borderRadius: 6, fontSize: 13, fontFamily: "var(--mono)", outline: "none", textAlign: "center" }} /></td>
                      <td className="mono">{fmt(q * (parseFloat(p.cost_price) || 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="ff" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13 }}>Order total (excl VAT): <strong className="mono">{fmt(reorderTotal)}</strong></div>
            <button className="btn bp" onClick={createReorderPO} disabled={reorderSaving}>{reorderSaving ? "Creating…" : "Create Purchase Order"}</button>
          </div>
        </div>
      )}

      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Purchase Order</div></div><div className="fg"><div className="fgrp"><label>Supplier *</label><SearchDropdown placeholder="Search suppliers..." items={suppliers} value={suppliers.find(s=>s.id===f.supplier_id)?.name || ""} onSelect={s => setF({...f,supplier_id:s.id})} onCreateNew={quickAddSupplier} createLabel="supplier" /></div><div className="fgrp"><label>Order Date</label><input type="date" value={f.order_date} onChange={e => setF({...f,order_date:e.target.value})} /></div><div className="fgrp"><label>Expected Delivery</label><input type="date" value={f.expected_date} onChange={e => setF({...f,expected_date:e.target.value})} /></div><div className="fgrp"><label>Notes</label><input value={f.notes} onChange={e => setF({...f,notes:e.target.value})} placeholder="Any notes..." /></div></div><div style={{borderTop:"0.5px solid var(--border)"}}><div className="po-line" style={{background:"#fafbfc"}}>{["Product","Qty","Unit Cost","VAT %","Total",""].map(h => <span key={h} style={{fontSize:11,fontWeight:600,color:"var(--text3)",textTransform:"uppercase"}}>{h}</span>)}</div>{lines.map((l,i) => <div key={i} className="po-line"><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.product_id} onChange={e => updateLine(i,"product_id",e.target.value)}><option value="">Select product...</option>{products.filter(p => p.active !== false).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0" value={l.qty} onChange={e => updateLine(i,"qty",e.target.value)} /><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0.00" value={l.unit_cost} onChange={e => updateLine(i,"unit_cost",e.target.value)} /><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.vat_rate} onChange={e => updateLine(i,"vat_rate",e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">0%</option></select><span className="mono" style={{fontSize:12,fontWeight:600}}>{fmt(lineTotal(l))}</span><button className="ib" onClick={() => lines.length>1&&setLines(lines.filter((_,j) => j!==i))}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>)}<div style={{padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafbfc",borderTop:"0.5px solid var(--border)"}}><button className="btn bo bsm" onClick={() => setLines([...lines,{product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20"}])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Line</button><div style={{textAlign:"right"}}><div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>Subtotal: {fmt(total)} · VAT: {fmt(vatTotal)}</div><div style={{fontSize:16,fontWeight:700}}>Total: {fmt(total+vatTotal)}</div></div></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Create PO"}</button></div></div>}
      {isMobile() ? (
        pos.length === 0 ? (
          <EmptyState icon="report" title="No purchase orders yet" sub="Create your first purchase order to start ordering from suppliers" action={() => setShowForm(true)} actionLabel="New PO" />
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10, padding:12 }}>
            {pos.map(po => (
              <MobileCard
                key={po.id}
                title={po.supplier_name}
                subtitle={`${po.po_number} · ${fmtDate(po.order_date)}`}
                value={fmt(po.total)}
                badge={<span className={"badge "+statusBadgeCls(po.status)}>{po.status}</span>}
                footer={(po.status==="draft"||po.status==="sent"||po.status==="partial") ? (
                  <div style={{ borderTop:"1px solid var(--border)", paddingTop:12 }}>
                    {po.status==="draft" && <button className="btn bo" style={{ width:"100%", minHeight:44 }} onClick={() => updateStatus(po.id,"sent")}>Mark Sent</button>}
                    {(po.status==="sent"||po.status==="partial") && <button className="btn bp" style={{ width:"100%", minHeight:44 }} onClick={() => openReceive(po)}>{po.status==="partial"?"Receive remaining":"Receive stock"}</button>}
                  </div>
                ) : undefined}
              />
            ))}
          </div>
        )
      ) : (
      <div className="card"><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>PO #</th><th>Supplier</th><th className="hm">Order Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {pos.map(po => <tr key={po.id}><td className="mono" style={{color:"var(--blue)",fontSize:12}}>{po.po_number}</td><td style={{fontWeight:500}}>{po.supplier_name}</td><td className="hm tm" style={{fontSize:12}}>{fmtDate(po.order_date)}</td><td className="mono" style={{fontWeight:600}}>{fmt(po.total)}</td><td><span className={"badge "+statusBadgeCls(po.status)}>{po.status}</span></td><td>{po.status==="draft"&&<button className="btn bo bsm" onClick={() => updateStatus(po.id,"sent")}>Mark Sent</button>}{(po.status==="sent"||po.status==="partial")&&<button className="btn bp bsm" onClick={() => openReceive(po)}>{po.status==="partial"?"Receive remaining":"Receive stock"}</button>}</td></tr>)}
        {pos.length===0&&<tr><td colSpan={6}><EmptyState icon="report" title="No purchase orders yet" sub="Create your first purchase order to start ordering from suppliers" action={() => setShowForm(true)} actionLabel="New PO" /></td></tr>}
      </tbody></table></div></div>
      )}

      {receivePO && (
        <ModalPortal>
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !receiving && closeReceive()} style={{ alignItems: "center" }}>
            <div style={{ background: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 8px 40px rgba(0,0,0,.10)", overflow: "hidden", borderTop: "3px solid #16a34a", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
              <div style={{ background: "#201e1d", padding: "18px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "#16a34a22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Receive Stock</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#8aa0b8" }}>{receivePO.po_number} · {receivePO.supplier_name}</div>
                </div>
                <button onClick={() => !receiving && closeReceive()} style={{ background: "none", border: "none", color: "#8aa0b8", cursor: "pointer", padding: 4, fontSize: 20, lineHeight: 1 }}>×</button>
              </div>

              <div style={{ padding: "16px 22px", overflowY: "auto", flex: 1 }}>
                {loadingLines ? (
                  <div style={{ padding: "24px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Loading lines…</div>
                ) : receiveLines.length === 0 ? (
                  <div style={{ padding: "24px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>This PO has no line items with products to receive.</div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "var(--text2)" }}>Enter the quantity received for each item. Stock updates on confirm.</div>
                      <button className="btn bo bsm" onClick={() => { const all = {}; receiveLines.forEach(l => { all[l.id] = String(Math.max(0, (parseFloat(l.qty) || 0) - (parseFloat(l.qty_received) || 0))); }); setReceiveInputs(all); }}>All outstanding</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {receiveLines.map(l => {
                        const ordered = parseFloat(l.qty) || 0;
                        const already = parseFloat(l.qty_received) || 0;
                        const outstanding = Math.max(0, ordered - already);
                        return (
                          <div key={l.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--rl)", padding: "12px 14px", background: outstanding === 0 ? "var(--bg)" : "var(--white)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.product_name || "—"}</div>
                                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Ordered {ordered} · Received {already} · <strong style={{ color: outstanding > 0 ? "#d97706" : "#16a34a" }}>{outstanding > 0 ? `${outstanding} outstanding` : "complete"}</strong></div>
                              </div>
                              {outstanding === 0 ? (
                                <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, whiteSpace: "nowrap" }}>✓ Done</span>
                              ) : (
                                <input type="text" inputMode="numeric" value={receiveInputs[l.id] ?? ""} onChange={e => { const v = e.target.value.replace(/[^\d]/g, ""); setReceiveInputs(prev => ({ ...prev, [l.id]: v })); }}
                                  style={{ width: 72, height: 40, textAlign: "center", border: "1px solid var(--border2)", borderRadius: "var(--rl)", fontSize: 15, fontWeight: 700, fontFamily: "var(--mono)", outline: "none", flexShrink: 0 }} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                <button className="btn bo" style={{ flex: 1, minHeight: 44 }} disabled={receiving} onClick={closeReceive}>Cancel</button>
                <button className="btn bp" style={{ flex: 2, minHeight: 44, background: "#16a34a", borderColor: "#16a34a" }} disabled={receiving || loadingLines || receiveLines.length === 0} onClick={confirmReceive}>{receiving ? "Receiving…" : "Confirm receipt"}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
