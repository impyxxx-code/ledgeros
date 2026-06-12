// ── Shared utility functions ──────────────────────────────────────────────────
export const isMobile = () => window.innerWidth < 768;
export const DEFAULT_REORDER = 5;

export const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtShort = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
export const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
export const fmtRelative = (d) => {
  if (!d) return { line1: "—", line2: "" };
  const date = new Date(d); const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return { line1: "Today", line2: fmtTime(d) };
  if (diffDays === 1) return { line1: "Yesterday", line2: fmtTime(d) };
  if (diffDays < 7) return { line1: diffDays + "d ago", line2: fmtTime(d) };
  return { line1: fmtShort(d), line2: fmtTime(d) };
};
export const dueDelta = (d) => { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000); };
export const today = () => new Date().toISOString().split("T")[0];
export const escHtml = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

// shortName: strips namespace/category prefix — "VAPE:DISPOSABLES:HAYATI 6K" → "HAYATI 6K"
export const shortName = (n) => { if (!n) return n; const p = n.split(":"); return p[p.length - 1].trim(); };
