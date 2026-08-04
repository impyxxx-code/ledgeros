import { useState, useEffect, useRef } from "react";
import { fmt } from "../lib/utils.js";
import { ModalPortal } from "./ui.jsx";

// ┌────────────────────────────────────────────────────────────┐
// │ CommandPalette                                             │
// │ Global search palette — Ctrl+K to open                     │
// └────────────────────────────────────────────────────────────┘
export function CommandPalette({ onClose, setPage, invoices, contacts, products }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const commands = [
    { icon: "ti-chart-bar",      label: "Dashboard",            action: () => setPage("dashboard"),      tag: "Navigation" },
    { icon: "ti-file-plus",      label: "Invoices",             action: () => setPage("invoices"),       tag: "Invoices" },
    { icon: "ti-user-plus",      label: "Contacts",             action: () => setPage("contacts"),       tag: "Contacts" },
    { icon: "ti-package",        label: "Inventory",            action: () => setPage("inventory"),      tag: "Inventory" },
    { icon: "ti-shopping-cart",  label: "Purchases",            action: () => setPage("purchases"),      tag: "Operations" },
    { icon: "ti-adjustments",    label: "Stock Adjustment",     action: () => setPage("stock-adj"),      tag: "Inventory" },
    { icon: "ti-upload",         label: "Import CSV",           action: () => setPage("import"),         tag: "Data" },
    { icon: "ti-credit-card",    label: "Credits",              action: () => setPage("credits"),        tag: "Finance" },
    { icon: "ti-building-bank",  label: "Banking",              action: () => setPage("banking"),        tag: "Finance" },
    { icon: "ti-report-money",   label: "Reports",              action: () => setPage("admin-reports"),  tag: "Reports" },
    { icon: "ti-chart-line",     label: "Analytics",            action: () => setPage("analytics"),      tag: "Reports" },
    { icon: "ti-file-text",      label: "Statements",           action: () => setPage("reports"),        tag: "Reports" },
    { icon: "ti-users",          label: "Agent Sales",          action: () => setPage("agent-report"),   tag: "Reports" },
    { icon: "ti-settings",       label: "Settings",             action: () => setPage("settings"),       tag: "Settings" },
  ];

  const invResults = q.length > 1 ? invoices.filter(i => i.customer?.toLowerCase().includes(q.toLowerCase()) || i.invoice_number?.toLowerCase().includes(q.toLowerCase())).slice(0, 3) : [];
  const custResults = q.length > 1 ? contacts.filter(c => c.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 3) : [];
  const filteredCmds = commands.filter(c => !q || c.label.toLowerCase().includes(q.toLowerCase()) || c.tag.toLowerCase().includes(q.toLowerCase()));

  const all = [
    ...invResults.map(i => ({ icon: "ti-file-invoice", label: i.customer, sub: i.invoice_number + " · " + fmt(i.amount), action: () => setPage("invoices"), tag: "Invoice" })),
    ...custResults.map(c => ({ icon: "ti-user", label: c.name, sub: c.email || c.phone || "Customer", action: () => setPage("contacts"), tag: "Customer" })),
    ...filteredCmds,
  ].slice(0, 10);

  return (<ModalPortal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ alignItems: "flex-start", paddingTop: "12vh" }}>
      <div style={{ background: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 8px 40px rgba(99,102,241,.12),var(--sh3)", overflow: "hidden", border: "1px solid rgba(99,102,241,.2)", borderTop: "3px solid #818cf8", animation: "scaleIn .15s var(--ease)" }}>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Escape") onClose(); if (e.key === "Enter" && all[0]) { all[0].action(); onClose(); } }} placeholder="Search or type a command..." style={{ flex: 1, border: "none", outline: "none", fontSize: 16, fontFamily: "var(--sans)", color: "var(--text)", background: "transparent" }} />
          <kbd style={{ background: "var(--border)", borderRadius: 5, padding: "2px 7px", fontSize: 11, color: "var(--text3)", fontFamily: "var(--sans)", flexShrink: 0 }}>ESC</kbd>
        </div>
        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {all.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No results for "{q}"</div>}
          {all.map((item, i) => (
            <div key={i} onClick={() => { item.action(); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", cursor: "pointer", transition: "background .08s", borderBottom: "1px solid #f8fafd" }} onMouseEnter={e => e.currentTarget.style.background = "var(--blue-lt)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={"ti " + item.icon} style={{ color: "var(--text2)", fontSize: 15 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                {item.sub && <div style={{ fontSize: 11, color: "var(--text3)" }}>{item.sub}</div>}
              </div>
              <span style={{ fontSize: 10, color: "var(--text3)", background: "var(--border)", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{item.tag}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 20px", background: "#f8fafd", borderTop: "1px solid var(--border)", display: "flex", gap: 16, fontSize: 11, color: "var(--text3)" }}>
          <span><kbd style={{ background: "var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "var(--sans)" }}>↵</kbd> Select</span>
          <span><kbd style={{ background: "var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "var(--sans)" }}>ESC</kbd> Close</span>
          <span style={{ marginLeft: "auto" }}>⌘K to open</span>
        </div>
      </div>
    </div></ModalPortal>
  );
}
