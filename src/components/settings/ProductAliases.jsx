import React, { useState, useEffect } from "react";
import { sb } from "../../lib/supabase.js";
import { isMobile } from "../../lib/utils.js";
import { toast } from "../../lib/constants.js";
import { SearchDropdown } from "../SearchDropdown.jsx";

export function ProductAliases({ token, products = [] }) {
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aliasText, setAliasText] = useState("");
  const [selProduct, setSelProduct] = useState(null);
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingPicks, setPendingPicks] = useState({});

  const load = async () => {
    setLoading(true);
    const data = await sb.get(token, "product_aliases", "select=*,products(name)&order=alias.asc");
    setAliases(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadPending = async () => {
    setPendingLoading(true);
    const invs = await sb.get(token, "invoices", "select=lines&notes=ilike.*UNMATCHED*&order=created_at.desc&limit=30");
    const names = new Set();
    (Array.isArray(invs) ? invs : []).forEach(inv => {
      let lines = inv.lines;
      try { if (typeof lines === "string") lines = JSON.parse(lines); } catch { lines = []; }
      (Array.isArray(lines) ? lines : []).forEach(l => {
        if (l.description?.endsWith(" ⚠️ UNMATCHED")) names.add(l.description.replace(" ⚠️ UNMATCHED", "").trim());
      });
    });
    setPending([...names]);
    setPendingLoading(false);
  };

  useEffect(() => { load(); loadPending(); }, []);

  const addAlias = async (alias, product) => {
    if (!alias.trim() || !product) { toast.error("Enter the customer's wording and pick a product"); return; }
    const res = await sb.post(token, "product_aliases", { alias: alias.trim(), product_id: product.id });
    if (res?.error) { toast.error(res.error.message || "Failed to add alias"); return; }
    toast.success("Alias added");
    return true;
  };

  const resolvePending = async (name) => {
    const product = pendingPicks[name];
    if (!product) { toast.error("Pick a product first"); return; }
    if (!(await addAlias(name, product))) return;
    setPending(pending.filter(n => n !== name));
    load();
  };

  const onAddManual = async () => {
    if (!(await addAlias(aliasText, selProduct))) return;
    setAliasText(""); setSelProduct(null);
    load();
  };

  const removeAlias = async (id) => {
    await sb.del(token, "product_aliases", id);
    toast.success("Alias removed");
    setAliases(aliases.filter(a => a.id !== id));
  };

  return (
    <>
    <div className="card" style={{ padding:24, marginBottom:20 }}>
      <div className="ct" style={{ marginBottom:6 }}>Pending Unmatched Items</div>
      <div style={{ fontSize:12, color:"var(--text3)", marginBottom:20 }}>
        Items from recent WhatsApp orders the system couldn't match. Pick the correct product to teach it for next time.
      </div>
      {pendingLoading ? <div style={{ padding:"16px 0", color:"var(--text3)", fontSize:13 }}>Loading…</div> :
        pending.length===0 ? <div style={{ padding:"16px 0", color:"var(--text3)", fontSize:13 }}>Nothing pending — all recent orders matched cleanly.</div> :
        pending.map(name=>(
          <div key={name} style={{ display:"flex", flexDirection:isMobile()?"column":"row", alignItems:isMobile()?"stretch":"center", justifyContent:"space-between", gap:isMobile()?10:8, padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
            <div style={{ fontWeight:600, fontSize:14, flex:1 }}>{name}</div>
            <div style={{ flex:1 }}>
              <SearchDropdown placeholder="Search products..." items={products} value={pendingPicks[name]?.name || ""} onSelect={p=>setPendingPicks({...pendingPicks, [name]: p})} />
            </div>
            <button className="btn bp bsm" onClick={()=>resolvePending(name)} style={{ minHeight:isMobile()?40:undefined }}>Save Alias</button>
          </div>
        ))
      }
    </div>
    <div className="card" style={{ padding:24 }}>
      <div className="ct" style={{ marginBottom:6 }}>WhatsApp Product Aliases</div>
      <div style={{ fontSize:12, color:"var(--text3)", marginBottom:20 }}>
        Map the wording customers use over WhatsApp to the correct product, so incoming orders match automatically.
      </div>
      <div style={{ display:"flex", flexDirection:isMobile()?"column":"row", gap:10, marginBottom:20, alignItems:isMobile()?"stretch":"flex-end" }}>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px", marginBottom:5, display:"block" }}>Customer's wording</label>
          <input value={aliasText} onChange={e=>setAliasText(e.target.value)} placeholder="e.g. Hayati 6k" style={{ width:"100%", padding:"10px 14px", borderRadius:"var(--r)", border:"1px solid var(--border2)", fontSize:13, fontFamily:"var(--sans)", outline:"none" }} />
        </div>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".6px", marginBottom:5, display:"block" }}>Maps to product</label>
          <SearchDropdown placeholder="Search products..." items={products} value={selProduct?.name || ""} onSelect={p=>setSelProduct(p)} />
        </div>
        <button className="btn bp" onClick={onAddManual} style={{ minHeight:isMobile()?44:undefined }}>Add Alias</button>
      </div>
      {loading ? <div style={{ padding:"16px 0", color:"var(--text3)", fontSize:13 }}>Loading…</div> :
        aliases.length===0 ? <div style={{ padding:"16px 0", color:"var(--text3)", fontSize:13 }}>No aliases configured yet</div> :
        aliases.map(a=>(
          <div key={a.id} style={{ display:"flex", flexDirection:isMobile()?"column":"row", alignItems:isMobile()?"stretch":"center", justifyContent:"space-between", gap:isMobile()?10:0, padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>{a.alias}</div>
              <div style={{ fontSize:12, color:"var(--text3)" }}>→ {a.products?.name || "Unknown product"}</div>
            </div>
            <button className="btn bo bsm" onClick={()=>removeAlias(a.id)} style={{ color:"var(--red)", borderColor:"#fecaca", flex:isMobile()?1:"none", minHeight:isMobile()?40:undefined }}>Remove</button>
          </div>
        ))
      }
    </div>
    </>
  );
}
