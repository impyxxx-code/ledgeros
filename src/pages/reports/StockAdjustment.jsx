import React, { useState } from "react";
import { sb } from "../../lib/supabase.js";
import { fmt, DEFAULT_REORDER } from "../../lib/utils.js";
import { logAudit } from "../../lib/audit.js";

// ── STOCK ADJUSTMENT ──────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ StockAdjustment                                            │
// │ Adjust stock quantities                                    │
// └────────────────────────────────────────────────────────────┘
export function StockAdjustment({ products, setProducts, token }) {
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(null);
  const [adjustments, setAdjustments] = useState({});
  const [reasons, setReasons] = useState({});
  const [success, setSuccess] = useState(null);
  const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || (p.code || "").toLowerCase().includes(query.toLowerCase()) || (p.category || "").toLowerCase().includes(query.toLowerCase()));
  const adjust = async (product, delta, reason) => {
    const newQty = Math.max(0, (product.stock_qty || 0) + delta);
    setSaving(product.id);
    await sb.patch(token, "products", product.id, { stock_qty: newQty });
    logAudit(token, userId, "stock_adjusted", "product", product.id, `${product.name} stock ${reason}: ${product.stock_qty} → ${newQty} ${product.unit||"units"}`);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock_qty: newQty } : p));
    setAdjustments(prev => ({ ...prev, [product.id]: "" }));
    setSuccess(product.id);
    setTimeout(() => setSuccess(null), 2000);
    setSaving(null);
  };
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Inventory</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Stock <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Adjustment</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Quickly update stock levels from anywhere</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Products",val:products.length,sub:"in catalogue",accent:"#2563eb"},{label:"Low Stock",val:products.filter(p=>p.stock_qty<=(p.reorder_level||5)).length,sub:"need restocking",accent:products.filter(p=>p.stock_qty<=(p.reorder_level||5)).length>0?"#dc2626":"#16a34a"},{label:"Stock Value",val:fmt(products.reduce((s,p)=>s+p.stock_qty*p.cost_price,0)),sub:"at cost price",accent:"#7c3aed"},{label:"Retail Value",val:fmt(products.reduce((s,p)=>s+p.stock_qty*p.sale_price,0)),sub:"at sale price",accent:"#16a34a"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--border)" }}>
          <input style={{ width: "100%", background: "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }} placeholder="🔍  Search products by name, SKU or category..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table className="sa-table" style={{minWidth:420}}><thead><tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Adjust By</th><th>Reason</th><th>Action</th></tr></thead><tbody>
          {filtered.slice(0, 30).map(p => {
            const adj = adjustments[p.id] || "";
            const delta = parseInt(adj) || 0;
            const newQty = Math.max(0, (p.stock_qty || 0) + delta);
            return (
              <tr key={p.id} style={{ background: success === p.id ? "var(--green-lt)" : "transparent" }}>
                <td><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{p.code || ""}</div></td>
                <td><span className="tag">{p.category || "General"}</span></td>
                <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="mono" style={{ fontWeight: 600, fontSize: 15 }}>{p.stock_qty || 0}</span>{delta !== 0 && <span style={{ fontSize: 11, color: delta > 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>→ {newQty}</span>}</div>{p.stock_qty <= (p.reorder_level || DEFAULT_REORDER) && <div style={{ fontSize: 10, color: "var(--red)", fontWeight: 600, marginTop: 2 }}>LOW STOCK</div>}</td>
                <td><div style={{ display: "flex", gap: 6, alignItems: "center" }}><button style={{ width: 28, height: 28, borderRadius: 6, border: "0.5px solid var(--border2)", background: "var(--white)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setAdjustments(prev => ({ ...prev, [p.id]: String((parseInt(prev[p.id] || 0)) - 1) }))}>−</button><input type="number" style={{ width: 60, textAlign: "center", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "5px 6px", fontSize: 13, outline: "none", fontFamily: "var(--mono)" }} value={adj} onChange={e => setAdjustments(prev => ({ ...prev, [p.id]: e.target.value }))} placeholder="0" /><button style={{ width: 28, height: 28, borderRadius: 6, border: "0.5px solid var(--border2)", background: "var(--white)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setAdjustments(prev => ({ ...prev, [p.id]: String((parseInt(prev[p.id] || 0)) + 1) }))}>+</button></div></td>
                <td><select style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none" }} value={reasons[p.id] || ""} onChange={e => setReasons(prev => ({ ...prev, [p.id]: e.target.value }))}><option value="">Select reason...</option><option value="stock_received">Stock Received</option><option value="sold">Sold</option><option value="damaged">Damaged</option><option value="returned">Returned</option><option value="count_adjustment">Count Adjustment</option></select></td>
                <td>{success === p.id ? <span style={{ color: "var(--green)", fontSize: 13, fontWeight: 600 }}>✓ Updated</span> : <button className="btn bp bsm" disabled={!adj || delta === 0 || saving === p.id} onClick={() => adjust(p, delta, reasons[p.id])}>{saving === p.id ? "..." : "Update"}</button>}</td>
              </tr>
            );
          })}
          {filtered.length === 0 && <tr><td colSpan={6} className="empty">No products found</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
