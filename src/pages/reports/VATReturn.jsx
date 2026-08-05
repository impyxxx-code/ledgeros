import React, { useState, useMemo, useEffect } from "react";
import { sb } from "../../lib/supabase.js";
import { fmt, fmtDate, escHtml, isMobile } from "../../lib/utils.js";

const VAT_BILL_CAP = 10000; // supplier bills fetched for the return; banner warns if hit
import { COMPANY, toast } from "../../lib/constants.js";

// ── VAT RETURN (MTD-style 9-box) ──────────────────────────────────────────────
// Computes the standard UK VAT return boxes from sales invoices (output VAT) and
// supplier bills (input VAT), on an accrual basis (tax point = invoice/bill date).
// Read-only report — no submission to HMRC (that needs an HMRC developer account
// + OAuth, a later phase). Box 2/8/9 (EU) are 0: not tracked post-Brexit.

const ymd = (d) => d.toISOString().slice(0, 10);
const quarterRange = (year, q) => {           // q = 0..3 (calendar quarters)
  const from = new Date(Date.UTC(year, q * 3, 1));
  const to = new Date(Date.UTC(year, q * 3 + 3, 0));
  return { from: ymd(from), to: ymd(to) };
};

export function VATReturn({ invoices = [], token }) {
  const now = new Date();
  const curQ = Math.floor(now.getUTCMonth() / 3);
  const thisQ = quarterRange(now.getUTCFullYear(), curQ);
  const [from, setFrom] = useState(thisQ.from);
  const [to, setTo] = useState(thisQ.to);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capped, setCapped] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    sb.get(token, "supplier_bills", `select=bill_number,supplier,bill_date,subtotal,vat,total&order=bill_date.desc&limit=${VAT_BILL_CAP}`)
      .then(d => { const arr = Array.isArray(d) ? d : []; setBills(arr); setCapped(arr.length >= VAT_BILL_CAP); })
      .catch(() => { setBills([]); setCapped(false); })
      .finally(() => setLoading(false));
  }, [token]);

  const setPreset = (which) => {
    const y = now.getUTCFullYear();
    if (which === "thisQ") { const r = quarterRange(y, curQ); setFrom(r.from); setTo(r.to); }
    else if (which === "lastQ") { const lq = curQ === 0 ? 3 : curQ - 1; const ly = curQ === 0 ? y - 1 : y; const r = quarterRange(ly, lq); setFrom(r.from); setTo(r.to); }
    else if (which === "thisM") { setFrom(ymd(new Date(Date.UTC(y, now.getUTCMonth(), 1)))); setTo(ymd(new Date(Date.UTC(y, now.getUTCMonth() + 1, 0)))); }
    else if (which === "ytd") { setFrom(`${y}-01-01`); setTo(ymd(now)); }
  };

  const r = useMemo(() => {
    const inRange = (d) => d && d >= from && d <= to;
    const salesInv = invoices.filter(i => i.status !== "draft" && inRange(i.invoice_date));
    const billsIn = bills.filter(b => inRange(b.bill_date));
    const num = (v) => parseFloat(v) || 0;
    const box1 = salesInv.reduce((s, i) => s + num(i.vat_total), 0);                                   // VAT on sales
    const box6 = salesInv.reduce((s, i) => s + (i.subtotal != null ? num(i.subtotal) : num(i.amount) - num(i.vat_total)), 0); // net sales
    const box4 = billsIn.reduce((s, b) => s + num(b.vat), 0);                                          // VAT reclaimed
    const box7 = billsIn.reduce((s, b) => s + (b.subtotal != null ? num(b.subtotal) : num(b.total) - num(b.vat)), 0); // net purchases
    const box2 = 0, box8 = 0, box9 = 0;
    const box3 = box1 + box2;
    const box5 = box3 - box4;
    return { box1, box2, box3, box4, box5, box6, box7, box8, box9, salesCount: salesInv.length, billsCount: billsIn.length };
  }, [invoices, bills, from, to]);

  const BOXES = [
    { n: 1, label: "VAT due on sales and other outputs", val: r.box1 },
    { n: 2, label: "VAT due on acquisitions (EU) — not tracked", val: r.box2, muted: true },
    { n: 3, label: "Total VAT due (Box 1 + 2)", val: r.box3, bold: true },
    { n: 4, label: "VAT reclaimed on purchases and other inputs", val: r.box4 },
    { n: 5, label: r.box5 >= 0 ? "Net VAT to PAY to HMRC (Box 3 − 4)" : "Net VAT to RECLAIM from HMRC (Box 3 − 4)", val: Math.abs(r.box5), bold: true, hero: true, reclaim: r.box5 < 0 },
    { n: 6, label: "Total value of sales excluding VAT", val: r.box6, net: true },
    { n: 7, label: "Total value of purchases excluding VAT", val: r.box7, net: true },
    { n: 8, label: "Total value of EU supplies — not tracked", val: r.box8, net: true, muted: true },
    { n: 9, label: "Total value of EU acquisitions — not tracked", val: r.box9, net: true, muted: true },
  ];

  const print = () => {
    const rows = BOXES.map(b => `<tr><td style="text-align:center;font-weight:700;color:#201e1d">${b.n}</td><td>${escHtml(b.label)}</td><td style="text-align:right;font-family:monospace;font-weight:${b.bold ? 700 : 500}">${fmt(b.val)}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><title>VAT Return ${from} to ${to}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;padding:32px;color:#1e293b}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:2px solid #201e1d}.co{font-size:20px;font-weight:700;color:#201e1d}.sub{font-size:11px;color:#64748b;margin-top:4px}.title{font-size:15px;font-weight:700;color:#201e1d;text-align:right}.period{font-size:11px;color:#64748b;margin-top:4px;text-align:right}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#201e1d;color:#fff;padding:9px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}th:last-child{text-align:right}td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}tr:nth-child(even) td{background:#f8fafc}.note{font-size:10px;color:#94a3b8;line-height:1.6;margin-top:12px}</style></head><body><div class="header"><div><div class="co">${escHtml(COMPANY.name)}</div><div class="sub">VAT Reg: ${escHtml(COMPANY.vatNumber||COMPANY.vat||"—")}</div></div><div><div class="title">VAT RETURN</div><div class="period">${fmtDate(from)} — ${fmtDate(to)}</div></div></div><table><thead><tr><th style="width:48px;text-align:center">Box</th><th>Description</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="note">Accrual basis (tax point = invoice/bill date). Prepared from ${r.salesCount} sales invoice(s) and ${r.billsCount} supplier bill(s) in the period. Boxes 2, 8 and 9 (EU) are not tracked. This is a management report — verify before filing with HMRC.</div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.warn("Allow pop-ups to print the VAT return."); return; }
    w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
  };

  return (
    <div>
      {capped && !loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 16, borderRadius: 8, background: "#fef3c7", border: "1px solid #fcd34d", color: "#92400e", fontSize: 12 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>This return uses the most recent {VAT_BILL_CAP.toLocaleString()} supplier bills. Older bills aren’t included, so Box 4 (input VAT) may be understated for earlier periods.</span>
        </div>
      )}
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Finance</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>VAT <span style={{ background: "linear-gradient(135deg,#ff6a4d,#dd2b0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Return</span></div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>9-box VAT summary from your invoices and supplier bills · accrual basis</div>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[
            { label: r.box5 >= 0 ? "Net VAT to Pay" : "Net VAT to Reclaim", val: fmt(Math.abs(r.box5)), sub: "Box 5", accent: r.box5 >= 0 ? "#dc2626" : "#16a34a" },
            { label: "VAT on Sales", val: fmt(r.box1), sub: "Box 1 (output)", accent: "#dd2b0f" },
            { label: "VAT Reclaimed", val: fmt(r.box4), sub: "Box 4 (input)", accent: "#16a34a" },
            { label: "Period", val: `${r.salesCount + r.billsCount}`, sub: "documents", accent: "#57534e" },
          ].map((k, i) => (
            <div key={i} style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Period picker */}
      <div className="card" style={{ marginBottom: 16, padding: "14px 20px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["thisQ", "This quarter"], ["lastQ", "Last quarter"], ["thisM", "This month"], ["ytd", "Year to date"]].map(([k, l]) => (
            <button key={k} className="btn bg2 bsm" onClick={() => setPreset(k)}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginLeft: isMobile() ? 0 : "auto", flexWrap: "wrap" }}>
          <div><label style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} /></div>
          <div><label style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} /></div>
          <button className="btn bp bsm" onClick={print} style={{ minHeight: 38, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
        </div>
      </div>

      {/* 9-box table */}
      <div className="card">
        <div className="ch"><div><div className="ct">VAT Return — {fmtDate(from)} to {fmtDate(to)}</div><div className="cs">Accrual basis · {r.salesCount} invoice{r.salesCount !== 1 ? "s" : ""}, {r.billsCount} bill{r.billsCount !== 1 ? "s" : ""}{loading ? " · loading bills…" : ""}</div></div></div>
        <div className="tw" style={{ overflowX: "auto" }}>
          <table style={{ minWidth: 480 }}>
            <thead><tr><th style={{ width: 60, textAlign: "center" }}>Box</th><th>Description</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
            <tbody>
              {BOXES.map(b => (
                <tr key={b.n} style={b.hero ? { background: b.reclaim ? "var(--green-lt,#f0fdf4)" : "#fef2f2" } : undefined}>
                  <td style={{ textAlign: "center", fontWeight: 700, color: b.muted ? "var(--text3)" : "var(--ink,#201e1d)" }}>{b.n}</td>
                  <td style={{ color: b.muted ? "var(--text3)" : "var(--text)", fontWeight: b.bold ? 700 : 400 }}>{b.label}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: b.bold ? 800 : 600, fontSize: b.hero ? 16 : 14, color: b.hero ? (b.reclaim ? "#16a34a" : "#dc2626") : b.muted ? "var(--text3)" : "var(--text)" }}>{fmt(b.val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "14px 20px", borderTop: "0.5px solid var(--border)", fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
          Prepared on an <strong>accrual basis</strong> (tax point = invoice/bill date), excluding draft invoices. Boxes 2, 8 and 9 (EU acquisitions/supplies) are shown as £0.00 — not tracked post-Brexit. This is a management report to help you prepare your return; <strong>verify the figures before filing with HMRC</strong>. Live MTD submission to HMRC can be added later (needs an HMRC developer account).
        </div>
      </div>
    </div>
  );
}
