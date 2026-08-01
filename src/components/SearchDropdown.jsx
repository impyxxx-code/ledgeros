import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { shortName } from "../lib/utils.js";

// ┌────────────────────────────────────────────────────────────┐
// │ SearchDropdown                                             │
// │ Searchable dropdown for product/contact selection.         │
// │ The results panel renders in a portal (position:fixed)      │
// │ anchored to the input, so it is never clipped by an         │
// │ ancestor's overflow:hidden / overflow:auto (e.g. the        │
// │ mobile invoice-form cards).                                 │
// └────────────────────────────────────────────────────────────┘
export function SearchDropdown({ placeholder, items, onSelect, onCreateNew, displayKey = "name", value = "", createLabel = "customer" }) {
  const [query, setQuery] = useState(shortName(value));
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef();
  const panelRef = useRef();
  const allMatches = items.filter(i => (i[displayKey] || "").toLowerCase().includes(query.toLowerCase()));
  const filtered = allMatches.slice(0, 12);

  // Measure the input and decide whether the panel opens down or up.
  const measure = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxH = Math.max(160, Math.min(300, (openUp ? spaceAbove : spaceBelow) - 12));
    setPos({
      left: r.left,
      width: r.width,
      openUp,
      top: openUp ? undefined : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
      maxH,
    });
  }, [displayKey]);

  // Keep the panel glued to the input while open (scroll/resize).
  useEffect(() => {
    if (!open) return;
    measure();
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => { window.removeEventListener("scroll", onMove, true); window.removeEventListener("resize", onMove); };
  }, [open, measure]);

  // Close on outside click — the portal panel lives outside wrapRef, so check both.
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const panelStyle = pos ? {
    position: "fixed",
    left: pos.left,
    width: pos.width,
    ...(pos.openUp ? { bottom: pos.bottom } : { top: pos.top }),
    maxHeight: pos.maxH,
    overflowY: "auto",
    background: "var(--white)",
    border: "0.5px solid var(--border2)",
    borderRadius: "var(--r)",
    boxShadow: "var(--sh2)",
    zIndex: 9999,
    WebkitOverflowScrolling: "touch",
  } : {};

  const showResults = open && pos && filtered.length > 0;
  const showEmpty = open && pos && query && filtered.length === 0;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "9px 36px 9px 12px", fontSize: 13, color: "var(--text)", fontFamily: "var(--sans)", outline: "none", width: "100%", transition: "border .15s" }}
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); measure(); }}
          onFocus={() => { setOpen(true); measure(); }}
        />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14 }}>⌄</span>
      </div>

      {showResults && createPortal(
        <div ref={panelRef} style={panelStyle}>
          {filtered.map((item, i) => (
            <div key={i} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "0.5px solid var(--border)", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} onMouseDown={() => { onSelect(item); setQuery(shortName(item[displayKey])); setOpen(false); }}>
              <div style={{ fontWeight: 500 }}>{shortName(item[displayKey])}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{item[displayKey]}</div>
              {item.city && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.city}{item.postcode ? ` · ${item.postcode}` : ""}</div>}
              {item.code && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.code}{item.sale_price != null ? ` · £${parseFloat(item.sale_price).toFixed(2)}` : ""}{item.category ? ` · ${item.category}` : ""}</div>}
              {!item.code && item.category && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{item.category}</div>}
            </div>
          ))}
          {allMatches.length > 12 && (
            <div style={{ padding: "7px 14px", fontSize: 11, color: "var(--text3)", background: "var(--bg)", position: "sticky", bottom: 0 }}>
              Showing 12 of {allMatches.length} — type more to narrow results
            </div>
          )}
        </div>,
        document.body
      )}

      {showEmpty && createPortal(
        <div ref={panelRef} style={panelStyle}>
          <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--text3)" }}>No results for "{query}"</div>
          {onCreateNew && (
            <div onMouseDown={() => { onCreateNew(query); setQuery(query); setOpen(false); }}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#ae1800", background: "rgba(221,43,15,.08)", display: "flex", alignItems: "center", gap: 7, borderTop: "0.5px solid var(--border)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(221,43,15,.14)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(221,43,15,.08)"}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create "{query}" as new {createLabel}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
