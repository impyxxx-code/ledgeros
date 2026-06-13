import { createPortal } from "react-dom";

// ── Modal Portal — renders overlays into document.body to escape overflow containers ──
export const ModalPortal = ({ children }) => createPortal(children, document.body);

// ┌────────────────────────────────────────────────────────────┐
// │ SkeletonTable                                              │
// │ Loading skeleton placeholder for tables                    │
// └────────────────────────────────────────────────────────────┘
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>{Array(cols).fill(0).map((_, i) => <th key={i}><div className="skel" style={{ width: ["60%","40%","30%","25%"][i] || "30%", height: 12 }} /></th>)}</tr>
      </thead>
      <tbody>
        {Array(rows).fill(0).map((_, r) => (
          <tr key={r}>
            {Array(cols).fill(0).map((_, c) => (
              <td key={c} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                {c === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="skel" style={{ width: 30, height: 30, borderRadius: "50%" }} />
                    <div className="skel" style={{ width: "60%", height: 13 }} />
                  </div>
                ) : (
                  <div className="skel" style={{ width: ["50%","35%","45%","30%"][c] || "40%", height: 13 }} />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ┌────────────────────────────────────────────────────────────┐
// │ EmptyState                                                 │
// │ Empty state UI with icon and message                       │
// └────────────────────────────────────────────────────────────┘
export function EmptyState({ icon, title, sub, action, actionLabel }) {
  const colors = {
    invoice:  { bg:"#eff6ff", fg:"#2563eb" },
    customer: { bg:"#f5f3ff", fg:"#7c3aed" },
    product:  { bg:"#eef2ff", fg:"#4f46e5" },
    delivery: { bg:"#f0fdf4", fg:"#16a34a" },
    report:   { bg:"#fffbeb", fg:"#d97706" },
    stock:    { bg:"#fff7ed", fg:"#ea580c" },
    search:   { bg:"#f8fafc", fg:"#64748b" },
    activity: { bg:"#f8fafc", fg:"#64748b" },
    default:  { bg:"#f8fafc", fg:"#64748b" },
  };
  const c = colors[icon] || colors.default;
  const S = { fill:"none", stroke:c.fg, strokeWidth:1.5, strokeLinecap:"round", strokeLinejoin:"round" };
  const icons = {
    invoice:  <svg width="28" height="28" viewBox="0 0 24 24" {...S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    customer: <svg width="28" height="28" viewBox="0 0 24 24" {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    product:  <svg width="28" height="28" viewBox="0 0 24 24" {...S}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    delivery: <svg width="28" height="28" viewBox="0 0 24 24" {...S}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    report:   <svg width="28" height="28" viewBox="0 0 24 24" {...S}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    stock:    <svg width="28" height="28" viewBox="0 0 24 24" {...S}><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>,
    search:   <svg width="28" height="28" viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    activity: <svg width="28" height="28" viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>,
    default:  <svg width="28" height="28" viewBox="0 0 24 24" {...S}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  };
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <div className="empty-state-icon-badge" style={{ background: c.bg }}>{icons[icon] || icons.default}</div>
      </div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-sub">{sub}</div>
      {action && <button className="btn bp" onClick={action}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{actionLabel || "Get started"}</button>}
    </div>
  );
}
