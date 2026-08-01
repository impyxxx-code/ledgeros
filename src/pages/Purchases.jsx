import React, { useState, useEffect } from "react";
import { sb } from "../lib/supabase.js";
import { fmt, fmtDate, today } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { postPurchaseJournal } from "../lib/journal.js";
import { EmptyState } from "../components/ui.jsx";
import { SearchDropdown } from "../components/SearchDropdown.jsx";
import { toast } from "../lib/constants.js";

export function Purchases({ contacts, setContacts, products, accounts = [], token, userId }) {
  const [pos, setPOs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState([{ product_id: "", product_name: "", qty: "", unit_cost: "", vat_rate: "20" }]);
  const [f, setF] = useState({ supplier_id: "", order_date: today(), expected_date: "", notes: "" });
  useEffect(() => { sb.get(token, "purchase_orders", "order=created_at.desc").then(d => Array.isArray(d) && setPOs(d)); }, [token]);
  const suppliers = contacts.filter(c => c.type === "supplier" || c.type === "both");
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
  const updateLine = (i, field, val) => { const next = [...lines]; if (field === "product_id") { const p = products.find(x => x.id === val); next[i] = { ...next[i], product_id: val, product_name: p?.name||"", unit_cost: p?.cost_price||"", vat_rate: String(p?.vat_rate||20) }; } else next[i] = { ...next[i], [field]: val }; setLines(next); };
  const lineTotal = (l) => (parseFloat(l.qty)||0)*(parseFloat(l.unit_cost)||0);
  const total = lines.reduce((s,l) => s+lineTotal(l),0);
  const vatTotal = lines.reduce((s,l) => s+lineTotal(l)*(parseFloat(l.vat_rate)||0)/100,0);
  const save = async () => {
    if (!f.supplier_id) return; setSaving(true);
    const num = `PO-${String(pos.length+1).padStart(3,"0")}`;
    const sup = suppliers.find(s => s.id === f.supplier_id);
    const po = await sb.post(token, "purchase_orders", { ...f, po_number: num, supplier_name: sup?.name, total: total+vatTotal, created_by: userId });
    if (po[0]) { for (const l of lines) if (l.product_id) await sb.post(token, "purchase_order_lines", { po_id: po[0].id, product_id: l.product_id, product_name: l.product_name, qty: parseFloat(l.qty)||0, unit_cost: parseFloat(l.unit_cost)||0, vat_rate: parseFloat(l.vat_rate)||0, total: lineTotal(l) }); setPOs(prev => [po[0],...prev]); logAudit(token, userId, "purchase_created", "purchase_order", po[0].id, `${num} raised for ${sup?.name} — £${(total+vatTotal).toFixed(2)}`); postPurchaseJournal(token, accounts, { po_id: po[0].id, po_number: num, amount: total, date: f.order_date }); }
    setLines([{ product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20" }]);
    setF({ supplier_id:"",order_date:today(),expected_date:"",notes:"" });
    setShowForm(false); setSaving(false);
  };
  const updateStatus = async (id, status) => { await sb.patch(token,"purchase_orders",id,{status}); setPOs(prev => prev.map(p => p.id===id?{...p,status}:p)); };
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Purchasing</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Purchase <span style={{ background: "linear-gradient(135deg,#ff6a4d,#dd2b0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Orders</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Order stock from your suppliers</div></div>
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New PO</button>
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
      {showForm && <div className="card" style={{marginBottom:20}}><div className="ch"><div className="ct">New Purchase Order</div></div><div className="fg"><div className="fgrp"><label>Supplier *</label><SearchDropdown placeholder="Search suppliers..." items={suppliers} value={suppliers.find(s=>s.id===f.supplier_id)?.name || ""} onSelect={s => setF({...f,supplier_id:s.id})} onCreateNew={quickAddSupplier} createLabel="supplier" /></div><div className="fgrp"><label>Order Date</label><input type="date" value={f.order_date} onChange={e => setF({...f,order_date:e.target.value})} /></div><div className="fgrp"><label>Expected Delivery</label><input type="date" value={f.expected_date} onChange={e => setF({...f,expected_date:e.target.value})} /></div><div className="fgrp"><label>Notes</label><input value={f.notes} onChange={e => setF({...f,notes:e.target.value})} placeholder="Any notes..." /></div></div><div style={{borderTop:"0.5px solid var(--border)"}}><div className="po-line" style={{background:"#fafbfc"}}>{["Product","Qty","Unit Cost","VAT %","Total",""].map(h => <span key={h} style={{fontSize:11,fontWeight:600,color:"var(--text3)",textTransform:"uppercase"}}>{h}</span>)}</div>{lines.map((l,i) => <div key={i} className="po-line"><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.product_id} onChange={e => updateLine(i,"product_id",e.target.value)}><option value="">Select product...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0" value={l.qty} onChange={e => updateLine(i,"qty",e.target.value)} /><input type="number" style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} placeholder="0.00" value={l.unit_cost} onChange={e => updateLine(i,"unit_cost",e.target.value)} /><select style={{background:"var(--white)",border:"0.5px solid var(--border2)",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none",width:"100%"}} value={l.vat_rate} onChange={e => updateLine(i,"vat_rate",e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">0%</option></select><span className="mono" style={{fontSize:12,fontWeight:600}}>{fmt(lineTotal(l))}</span><button className="ib" onClick={() => lines.length>1&&setLines(lines.filter((_,j) => j!==i))}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>)}<div style={{padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafbfc",borderTop:"0.5px solid var(--border)"}}><button className="btn bo bsm" onClick={() => setLines([...lines,{product_id:"",product_name:"",qty:"",unit_cost:"",vat_rate:"20"}])}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Line</button><div style={{textAlign:"right"}}><div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>Subtotal: {fmt(total)} · VAT: {fmt(vatTotal)}</div><div style={{fontSize:16,fontWeight:700}}>Total: {fmt(total+vatTotal)}</div></div></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Create PO"}</button></div></div>}
      <div className="card"><div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}><thead><tr><th>PO #</th><th>Supplier</th><th className="hm">Order Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {pos.map(po => <tr key={po.id}><td className="mono" style={{color:"var(--blue)",fontSize:12}}>{po.po_number}</td><td style={{fontWeight:500}}>{po.supplier_name}</td><td className="hm tm" style={{fontSize:12}}>{fmtDate(po.order_date)}</td><td className="mono" style={{fontWeight:600}}>{fmt(po.total)}</td><td><span className={"badge "+(po.status==="received"?"b-green":po.status==="sent"?"b-blue":po.status==="cancelled"?"b-red":"b-gray")}>{po.status}</span></td><td>{po.status==="draft"&&<button className="btn bo bsm" onClick={() => updateStatus(po.id,"sent")}>Mark Sent</button>}{po.status==="sent"&&<button className="btn bp bsm" onClick={() => updateStatus(po.id,"received")}>Mark Received</button>}</td></tr>)}
        {pos.length===0&&<tr><td colSpan={6}><EmptyState icon="report" title="No purchase orders yet" sub="Create your first purchase order to start ordering from suppliers" action={() => setShowForm(true)} actionLabel="New PO" /></td></tr>}
      </tbody></table></div></div>
    </div>
  );
}
