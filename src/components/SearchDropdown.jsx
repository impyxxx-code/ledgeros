import { useState, useEffect, useRef } from "react";
import { shortName } from "../lib/utils.js";

// ┌────────────────────────────────────────────────────────────┐
// │ SearchDropdown                                             │
// │ Searchable dropdown for product/contact selection          │
// └────────────────────────────────────────────────────────────┘
export function SearchDropdown({ placeholder, items, onSelect, onCreateNew, displayKey = "name", value = "" }) {
  const [query, setQuery] = useState(shortName(value));
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const allMatches = items.filter(i => (i[displayKey] || "").toLowerCase().includes(query.toLowerCase()));
  const filtered = allMatches.slice(0, 12);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "9px 36px 9px 12px", fontSize: 13, color: "var(--text)", fontFamily: "var(--sans)", outline: "none", width: "100%", transition: "border .15s" }} placeholder={placeholder} value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14 }}>⌄</span>
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", boxShadow: "var(--sh2)", zIndex: 100, maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
          {filtered.map((item, i) => (
            <div key={i} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "0.5px solid var(--border)", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} onMouseDown={() => { onSelect(item); setQuery(shortName(item[displayKey])); setOpen(false); }}>
              <div style={{ fontWeight: 500 }}>{shortName(item[displayKey])}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{item[displayKey]}</div>
              {item.city && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.city}{item.postcode ? ` · ${item.postcode}` : ""}</div>}
              {item.code && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.code}{item.sale_price != null ? ` · £${parseFloat(item.sale_price).toFixed(2)}` : ""}{item.category ? ` · ${item.category}` : ""}</div>}
              {!item.code && item.category && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.category}</div>}
            </div>
          ))}
        </div>
      )}
      {open && filtered.length > 0 && allMatches.length > 12 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--white)", border: "0.5px solid var(--border2)", borderTop: "none", borderRadius: "0 0 var(--r) var(--r)", boxShadow: "var(--sh2)", zIndex: 100, padding: "7px 14px", fontSize: 11, color: "var(--text3)" }}>
          Showing 12 of {allMatches.length} — type more to narrow results
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"var(--white)", border:"0.5px solid var(--border2)", borderRadius:"var(--r)", boxShadow:"var(--sh2)", zIndex:100, marginTop:4, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", fontSize:13, color:"var(--text3)" }}>No results for "{query}"</div>
          {onCreateNew && (
            <div onMouseDown={() => { onCreateNew(query); setQuery(query); setOpen(false); }}
              style={{ padding:"10px 14px", cursor:"pointer", fontSize:13, fontWeight:600, color:"var(--blue)", background:"var(--blue-lt)", display:"flex", alignItems:"center", gap:7, borderTop:"0.5px solid var(--border)" }}
              onMouseEnter={e => e.currentTarget.style.background="#dbeafe"}
              onMouseLeave={e => e.currentTarget.style.background="var(--blue-lt)"}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create "{query}" as new customer
            </div>
          )}
        </div>
      )}
    </div>
  );
}
