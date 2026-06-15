import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line, LabelList, PieChart, Pie, Cell, BarChart } from "recharts";
import { sb } from "../lib/supabase.js";
import { fmt, DEFAULT_REORDER } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";

export function Inventory({ products, setProducts, token, userId, profile }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invSearch, setInvSearch] = useState("");
  const [editingQty, setEditingQty] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [f, setF] = useState({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
  const [stockFilter, setStockFilter] = useState("all");

  const save = async () => {
    if (!f.name) return; setSaving(true);
    const data = await sb.post(token, "products", { ...f, cost_price: parseFloat(f.cost_price)||0, sale_price: parseFloat(f.sale_price)||0, vat_rate: parseFloat(f.vat_rate)||20, stock_qty: parseFloat(f.stock_qty)||0, reorder_level: parseFloat(f.reorder_level)||0, created_by: userId });
    if (data[0]) { setProducts(prev => [data[0], ...prev]); logAudit(token, userId, "product_created", "product", data[0].id, `Product added: ${f.name} · Sale £${parseFloat(f.sale_price)||0} · Stock: ${parseFloat(f.stock_qty)||0}`); }
    setF({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
    setShowForm(false); setSaving(false);
  };

  const updateStock = async (p, newQty) => {
    const qty = Math.max(0, parseInt(newQty) || 0);
    setUpdatingId(p.id);
    await sb.patch(token, "products", p.id, { stock_qty: qty });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock_qty: qty } : x));
    logAudit(token, userId, "stock_adjusted", "product", p.id, `${p.name} stock updated: ${p.stock_qty} → ${qty} ${p.unit||"units"}`);
    setEditingQty(prev => { const n = {...prev}; delete n[p.id]; return n; });
    setUpdatingId(null);
  };

  const lowStock = products.filter(p => p.stock_qty <= (p.reorder_level || DEFAULT_REORDER));
  const outOfStock = products.filter(p => (p.stock_qty || 0) === 0);
  const filtered = products.filter(p => {
    if (stockFilter === "low") return p.stock_qty <= (p.reorder_level || DEFAULT_REORDER);
    if (stockFilter === "out") return (p.stock_qty || 0) === 0;
    return true;
  }).filter(p => !invSearch || p.name?.toLowerCase().includes(invSearch.toLowerCase()) || p.code?.toLowerCase().includes(invSearch.toLowerCase()) || p.category?.toLowerCase().includes(invSearch.toLowerCase()));

  return (
    <div>
      {/* ── Inventory Page Header ── */}
      <div className="page-hero" style={{ margin: "-26px -28px 0 -28px", background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 55%,#0d1829 100%)", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Inventory</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Stock & <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Inventory</span></div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 6 }}>
              {products.length} products
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              {lowStock.length > 0 ? <span style={{ color: "#fca5a5" }}>{lowStock.length} low stock</span> : <span style={{ color: "#86efac" }}>all in stock</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={invSearch} onChange={e => setInvSearch(e.target.value)} placeholder="Search products..." style={{ paddingLeft: 29, paddingRight: invSearch ? 28 : 10, height: 32, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, fontSize: 12, outline: "none", color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.07)", width: 180, fontFamily: "var(--sans)" }} />
              {invSearch && <button onClick={() => setInvSearch("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", padding: 0 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
            </div>
            {(profile?.role === "admin" || profile?.role === "manager") && (
              <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #818cf8", background: "#818cf8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Product
              </button>
            )}
          </div>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)", position: "relative", zIndex: 1 }}>
          {[
            { label: "Products", val: products.length, sub: "in catalogue", color: "rgba(255,255,255,.35)", accent: "#818cf8", filter: "all" },
            { label: "Low Stock", val: lowStock.length, sub: lowStock.length > 0 ? "need restocking" : "all levels ok", color: lowStock.length > 0 ? "#fca5a5" : "#86efac", accent: lowStock.length > 0 ? "#dc2626" : "#16a34a", filter: "low" },
            { label: "Stock Value", val: fmt(products.reduce((s,p) => s+p.stock_qty*p.cost_price, 0)), sub: "at cost price", color: "rgba(255,255,255,.35)", accent: "#7c3aed" },
            { label: "Retail Value", val: fmt(products.reduce((s,p) => s+p.stock_qty*p.sale_price, 0)), sub: "at sale price", color: "#86efac", accent: "#16a34a" },
          ].map((k, i) => {
            const isActive = k.filter && stockFilter === k.filter;
            return (
            <div key={i} onClick={k.filter ? () => setStockFilter(k.filter) : undefined}
              title={k.filter ? `Click to filter by ${k.label}` : undefined}
              style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", cursor: k.filter ? "pointer" : "default", transition: "all .15s", background: isActive ? "rgba(255,255,255,.08)" : "transparent", borderTop: `3px solid ${isActive ? k.accent : (k.filter ? "transparent" : k.accent)}` }}
              onMouseEnter={e => { if (k.filter) { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.borderTop = `3px solid ${k.accent}`; } }}
              onMouseLeave={e => { if (k.filter) { e.currentTarget.style.background = isActive ? "rgba(255,255,255,.08)" : "transparent"; e.currentTarget.style.borderTop = isActive ? `3px solid ${k.accent}` : "3px solid transparent"; } }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: k.color }}>{k.sub}</div>
            </div>
          );})}
        </div>
      </div>

      {/* Stock filter tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#0d1829", borderBottom: "1px solid rgba(99,102,241,.18)", padding: "5px 36px", margin: "0 -28px 16px", flexWrap: "wrap" }}>
        {[["all", "All Products", products.length], ["low", "Low Stock", lowStock.length], ["out", "Out of Stock", outOfStock.length]].map(([v, l, cnt]) => (
          <button key={v} onClick={() => setStockFilter(v)} style={{ padding: "5px 13px", borderRadius: 7, border: "none", background: stockFilter === v ? (v === "low" ? "#f59e0b" : v === "out" ? "#ef4444" : "#818cf8") : "transparent", color: stockFilter === v ? "#fff" : "rgba(255,255,255,.45)", fontSize: 12, fontWeight: stockFilter === v ? 700 : 500, cursor: "pointer", fontFamily: "var(--sans)", display: "flex", alignItems: "center", gap: 5, transition: "all .15s", boxShadow: stockFilter === v ? "0 2px 8px rgba(0,0,0,.2)" : "none" }}>
            {l} <span style={{ background: stockFilter === v ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.08)", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: stockFilter === v ? "#fff" : "rgba(255,255,255,.4)" }}>{cnt}</span>
          </button>
        ))}
      </div>

      {lowStock.length > 0 && (() => {
        const chartData = [...lowStock]
          .sort((a,b) => (a.stock_qty - (a.reorder_level||DEFAULT_REORDER)) - (b.stock_qty - (b.reorder_level||DEFAULT_REORDER)))
          .slice(0, 6)
          .map(p => ({ name: p.name.length > 18 ? p.name.slice(0,17)+"…" : p.name, stock: p.stock_qty||0, reorder: p.reorder_level||DEFAULT_REORDER, full: p.name }));
        const StockTooltip = ({ active, payload, label }) => {
          if (!active || !payload || !payload.length) return null;
          const full = payload[0]?.payload?.full || label;
          return (
            <div style={{background:"#0d1829",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,padding:"10px 14px",fontSize:12}}>
              <div style={{color:"rgba(255,255,255,.5)",marginBottom:6,fontWeight:600}}>{full}</div>
              {payload.map(p=>(
                <div key={p.dataKey} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <div style={{width:8,height:8,borderRadius:2,background:p.dataKey==="stock"?"#dc2626":"#94a3b8"}}/>
                  <span style={{color:"rgba(255,255,255,.7)"}}>{p.dataKey==="stock"?"Current stock":"Reorder level"}:</span>
                  <span style={{color:"#fff",fontWeight:700}}>{p.value} units</span>
                </div>
              ))}
            </div>
          );
        };
        return (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch">
              <div>
                <div className="ct">Low Stock Levels</div>
                <div className="cs">Current stock vs reorder level — lowest first</div>
              </div>
              <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:"#dc2626"}}/>Current stock
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
                  <div style={{width:14,height:2,background:"#94a3b8"}}/>Reorder level
                </div>
              </div>
            </div>
            <div style={{ padding: "4px 24px 20px" }}>
              <ResponsiveContainer width="100%" height={Math.max(chartData.length*40+60, 160)}>
                <ComposedChart data={chartData} layout="vertical" margin={{top:8,right:30,left:10,bottom:0}}>
                  <defs>
                    <linearGradient id="gradStock" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f87171"/>
                      <stop offset="100%" stopColor="#dc2626"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:10,fill:"var(--text3)"}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:"var(--text3)"}} axisLine={false} tickLine={false} width={130}/>
                  <Tooltip content={StockTooltip} cursor={{fill:"rgba(220,38,38,.06)"}}/>
                  <Bar dataKey="stock" fill="url(#gradStock)" radius={[0,4,4,0]} barSize={14} animationDuration={800} animationEasing="ease-out"/>
                  <Line dataKey="reorder" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: "#94a3b8" }}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {showForm && (profile?.role === "admin" || profile?.role === "manager") && <div className="card" style={{ marginBottom: 20 }}><div className="ch"><div className="ct">New Product</div></div><div className="fg3"><div className="fgrp"><label>Code</label><input value={f.code} onChange={e => setF({...f,code:e.target.value})} placeholder="SKU001" /></div><div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({...f,name:e.target.value})} placeholder="Product name" /></div><div className="fgrp"><label>Category</label><input value={f.category} onChange={e => setF({...f,category:e.target.value})} placeholder="e.g. Vapes, Pods..." /></div><div className="fgrp"><label>Unit</label><select value={f.unit} onChange={e => setF({...f,unit:e.target.value})}><option>unit</option><option>pack</option><option>box</option><option>kg</option><option>litre</option></select></div><div className="fgrp"><label>Cost Price (£)</label><input type="number" value={f.cost_price} onChange={e => setF({...f,cost_price:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>Sale Price (£)</label><input type="number" value={f.sale_price} onChange={e => setF({...f,sale_price:e.target.value})} placeholder="0.00" /></div><div className="fgrp"><label>VAT Rate</label><select value={f.vat_rate} onChange={e => setF({...f,vat_rate:e.target.value})}><option value="20">20% Standard</option><option value="5">5% Reduced</option><option value="0">0% Exempt</option></select></div><div className="fgrp"><label>Stock Qty</label><input type="number" value={f.stock_qty} onChange={e => setF({...f,stock_qty:e.target.value})} placeholder="0" /></div><div className="fgrp"><label>Reorder Level</label><input type="number" value={f.reorder_level} onChange={e => setF({...f,reorder_level:e.target.value})} placeholder="0" /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Product"}</button></div></div>}

      <div className="card">
        <div style={{ padding:"8px 16px",fontSize:12,color:"var(--text3)",borderBottom:"1px solid var(--border)" }}>{invSearch ? `${filtered.length} of ${products.length}` : filtered.length} product{filtered.length!==1?"s":""}</div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table className="inventory-table" style={{minWidth:480}}>
            <thead><tr><th>Code</th><th>Product</th><th>Category</th><th className="hm">Cost</th><th>Sale Price</th><th>VAT</th><th>In Stock</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(p => {
                const isEditing = editingQty[p.id] !== undefined;
                const isUpdating = updatingId === p.id;
                const isLow = p.stock_qty <= (p.reorder_level || DEFAULT_REORDER);
                const isOut = (p.stock_qty || 0) === 0;
                return (
                  <tr key={p.id} style={isOut ? { background: "rgba(239,68,68,.04)", borderLeft: "3px solid #ef4444" } : isLow ? { background: "rgba(245,158,11,.04)", borderLeft: "3px solid #f59e0b" } : {}}>
                    <td className="mono tm" style={{fontSize:12}}>{p.code||"—"}</td>
                    <td style={{fontWeight:500}}>{p.name}</td>
                    <td className="tm">{p.category||"—"}</td>
                    <td className="mono hm">{fmt(p.cost_price)}</td>
                    <td className="mono">{fmt(p.sale_price)}</td>
                    <td><span className="tag">{p.vat_rate}%</span></td>
                    <td>
                      {isEditing ? (
                        <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                          <input
                            type="number"
                            value={editingQty[p.id]}
                            onChange={e => setEditingQty(prev => ({...prev,[p.id]:e.target.value}))}
                            onKeyDown={e => { if(e.key==="Enter") updateStock(p,editingQty[p.id]); if(e.key==="Escape") setEditingQty(prev=>{const n={...prev};delete n[p.id];return n;}); }}
                            style={{ width:60,padding:"3px 6px",border:"1px solid var(--blue)",borderRadius:5,fontSize:12,outline:"none",fontFamily:"var(--mono)" }}
                            autoFocus
                          />
                          <span style={{ fontSize:11,color:"var(--text3)" }}>{p.unit}</span>
                          <button className="btn bp bsm" style={{ padding:"3px 8px",fontSize:11 }} onClick={() => updateStock(p,editingQty[p.id])} disabled={isUpdating}>{isUpdating?"...":"✓"}</button>
                          <button className="btn bo bsm" style={{ padding:"3px 6px",fontSize:11 }} onClick={() => setEditingQty(prev=>{const n={...prev};delete n[p.id];return n;})}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          {(profile?.role === "admin" || profile?.role === "manager") && <button onClick={() => updateStock(p, (p.stock_qty||0)-1)} style={{ width:20,height:20,borderRadius:4,border:"1px solid var(--border)",background:"var(--white)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"var(--text2)",lineHeight:1 }}>−</button>}
                          <span className="mono" style={{ fontWeight:600,fontSize:14,minWidth:28,textAlign:"center",cursor:(profile?.role==="admin"||profile?.role==="manager")?"pointer":"default" }} onClick={() => (profile?.role==="admin"||profile?.role==="manager") && setEditingQty(prev=>({...prev,[p.id]:p.stock_qty}))} title={(profile?.role==="admin"||profile?.role==="manager")?"Click to edit":""}>{p.stock_qty||0}</span>
                          {(profile?.role === "admin" || profile?.role === "manager") && <button onClick={() => updateStock(p, (p.stock_qty||0)+1)} style={{ width:20,height:20,borderRadius:4,border:"1px solid var(--border)",background:"var(--white)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"var(--text2)",lineHeight:1 }}>+</button>}
                          <span style={{ fontSize:11,color:"var(--text3)" }}>{p.unit}</span>
                        </div>
                      )}
                    </td>
                    <td><span className={"badge "+(p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)?"b-red":p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)*2?"b-amber":"b-green")}>{p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)?"Low Stock":p.stock_qty<=(p.reorder_level||DEFAULT_REORDER)*2?"Running Low":"In Stock"}</span></td>
                  </tr>
                );
              })}
              {filtered.length===0&&<tr><td colSpan={8} className="empty">{invSearch ? `No products found for "${invSearch}"` : "No products yet"}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
