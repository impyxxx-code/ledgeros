import React, { useState, useMemo, useEffect } from "react";
import { sb } from "../lib/supabase.js";
import { fmt, fmtDate, isMobile } from "../lib/utils.js";
import { toast } from "../lib/constants.js";
import { logAudit } from "../lib/audit.js";

// ── BANK RECONCILIATION ───────────────────────────────────────────────────────
// Import a bank statement (CSV), auto-match rows against recorded payments
// (invoice_payments = money in, supplier_bill_payments = money out), and flag
// anything unmatched on either side. Session-based review — no data is written.
// A live Open Banking feed is a later phase.

const MATCH_TOL = 0.01;      // £ tolerance for amount match
const DATE_WINDOW = 6;       // days either side for a confident match
const DAY = 86400000;

// Minimal CSV parser with quote handling; auto-detects , ; or tab delimiter.
function parseCSV(text) {
  const norm = text.replace(/\r\n?/g, "\n").split("\n").filter(l => l.trim() !== "");
  if (!norm.length) return [];
  const delim = [",", ";", "\t"].map(d => ({ d, n: (norm[0].match(new RegExp(`\\${d === "\t" ? "t" : d}`, "g")) || []).length })).sort((a, b) => b.n - a.n)[0].d;
  return norm.map(line => {
    const cells = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else { if (c === '"') q = true; else if (c === delim) { cells.push(cur); cur = ""; } else cur += c; }
    }
    cells.push(cur);
    return cells.map(s => s.trim());
  });
}

const parseAmt = (s) => {
  if (s == null) return 0;
  const n = parseFloat(String(s).replace(/[£$,\s]/g, "").replace(/[()]/g, m => "")); // strip currency/commas
  const neg = /^\(.*\)$/.test(String(s).trim());                                      // (123.45) = negative
  return isNaN(n) ? 0 : (neg ? -Math.abs(n) : n);
};

// Turn a header cell into a guessed role.
const guessRole = (h) => {
  const s = (h || "").toLowerCase();
  if (/paid\s*in|money\s*in|credit|receipt|received/.test(s)) return "in";
  if (/paid\s*out|money\s*out|debit|withdraw/.test(s)) return "out";
  if (/date/.test(s)) return "date";
  if (/desc|detail|reference|narrative|memo|payee|particular|type/.test(s)) return "desc";
  if (/amount|value/.test(s)) return "amount";
  if (/balance/.test(s)) return "balance";
  return "";
};

export function BankReconciliation({ token, userId }) {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState([]);        // parsed statement rows (arrays)
  const [header, setHeader] = useState([]);
  const [map, setMap] = useState({ date: -1, desc: -1, amount: -1, in: -1, out: -1 });
  const [payIn, setPayIn] = useState([]);      // invoice_payments
  const [payOut, setPayOut] = useState([]);    // supplier_bill_payments
  const [reconciled, setReconciled] = useState(() => new Set()); // "in:<id>" / "out:<id>" already reconciled
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("matched"); // matched | stmt | books

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      sb.get(token, "invoice_payments", "select=id,invoice_number,customer,amount,method,payment_date,created_at,notes&order=payment_date.desc&limit=3000").catch(() => []),
      sb.get(token, "supplier_bill_payments", "select=id,supplier_name,amount,method,payment_date,notes&order=payment_date.desc&limit=3000").catch(() => []),
      sb.get(token, "bank_reconciliations", "select=payment_kind,payment_id&limit=10000").catch(() => []),
    ]).then(([pi, po, br]) => {
      setPayIn(Array.isArray(pi) ? pi : []);
      setPayOut(Array.isArray(po) ? po : []);
      setReconciled(new Set((Array.isArray(br) ? br : []).map(r => `${r.payment_kind}:${r.payment_id}`)));
    }).finally(() => setLoading(false));
  }, [token]);

  const doParse = (text) => {
    const parsed = parseCSV(text);
    if (parsed.length < 2) { toast.warn("Couldn't read any rows — paste a bank statement CSV with a header row."); return; }
    const hdr = parsed[0];
    const body = parsed.slice(1);
    // Auto-map from header names
    const m = { date: -1, desc: -1, amount: -1, in: -1, out: -1 };
    hdr.forEach((h, i) => { const role = guessRole(h); if (role && role !== "balance" && m[role] === -1) m[role] = i; });
    setHeader(hdr); setRows(body); setMap(m);
    toast.success(`Loaded ${body.length} statement line${body.length !== 1 ? "s" : ""}`);
  };

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { setRaw(String(r.result)); doParse(String(r.result)); };
    r.readAsText(f);
  };

  // Build signed statement transactions from the mapping.
  const txns = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((r, idx) => {
      let amt = 0;
      if (map.in >= 0 || map.out >= 0) amt = parseAmt(r[map.in]) - parseAmt(r[map.out]);
      else if (map.amount >= 0) amt = parseAmt(r[map.amount]);
      const rawDate = map.date >= 0 ? r[map.date] : "";
      const d = rawDate ? new Date(rawDate) : null;
      return { idx, date: d && !isNaN(d) ? d : null, dateStr: rawDate, desc: map.desc >= 0 ? r[map.desc] : "", amount: amt };
    }).filter(t => t.amount !== 0 || t.desc);
  }, [rows, map]);

  // Greedy auto-match: each statement line claims the closest unused payment of
  // the right direction within amount tolerance, preferring date + description.
  const recon = useMemo(() => {
    const key = (kind, p) => `${kind}:${p.id}`;
    const inPool = payIn.map(p => ({ ...p, _d: p.payment_date || (p.created_at || "").slice(0, 10), _amt: parseFloat(p.amount) || 0, _used: false, _kind: "in", _reconciled: reconciled.has(key("in", p)) }));
    const outPool = payOut.map(p => ({ ...p, _d: p.payment_date || (p.created_at || "").slice(0, 10), _amt: parseFloat(p.amount) || 0, _used: false, _kind: "out", _reconciled: reconciled.has(key("out", p)) }));
    // Match against ALL payments (incl. already-reconciled) so a re-imported
    // statement line still lands on its payment rather than reading as unmatched.
    const results = txns.map(t => {
      const dir = t.amount >= 0 ? "in" : "out";
      const pool = dir === "in" ? inPool : outPool;
      const target = Math.abs(t.amount);
      const desc = (t.desc || "").toLowerCase();
      let best = null, bestScore = -1;
      for (const p of pool) {
        if (p._used) continue;
        if (Math.abs(p._amt - target) > MATCH_TOL) continue;
        let score = 1;
        if (t.date && p._d) { const days = Math.abs((t.date.getTime() - new Date(p._d).getTime()) / DAY); score += Math.max(0, DATE_WINDOW - days); }
        const ref = dir === "in" ? `${p.invoice_number || ""} ${p.customer || ""}`.toLowerCase() : `${p.supplier_name || ""}`.toLowerCase();
        if (ref.trim() && desc && ref.split(/\s+/).some(w => w.length > 2 && desc.includes(w))) score += 10;
        if (score > bestScore) { bestScore = score; best = p; }
      }
      if (best) { best._used = true; return { t, match: best, dir, reconciled: best._reconciled }; }
      return { t, match: null, dir, reconciled: false };
    });
    // In-books-only excludes already-reconciled payments — they're done, not noise.
    const booksOnly = [...inPool, ...outPool].filter(p => !p._used && !p._reconciled);
    return { results, booksOnly };
  }, [txns, payIn, payOut, reconciled]);

  const matched = recon.results.filter(r => r.match);
  const toReconcile = matched.filter(r => !r.reconciled);   // freshly matched, confirmable
  const alreadyDone = matched.filter(r => r.reconciled);    // matched + persisted earlier
  const stmtOnly = recon.results.filter(r => !r.match);
  const totalIn = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const matchedPct = txns.length ? Math.round((matched.length / txns.length) * 100) : 0;

  const reset = () => { setRaw(""); setRows([]); setHeader([]); setMap({ date: -1, desc: -1, amount: -1, in: -1, out: -1 }); };

  // Label for the statement being reconciled — its date span, else today.
  const stmtRef = useMemo(() => {
    const ds = txns.map(t => t.date).filter(Boolean).sort((a, b) => a - b);
    return ds.length ? `${fmtDate(ds[0].toISOString())} – ${fmtDate(ds[ds.length - 1].toISOString())}` : `Statement ${fmtDate(new Date().toISOString())}`;
  }, [txns]);

  // Persist the freshly-matched payments so they stay reconciled across sessions.
  const confirmReconciliation = async () => {
    if (!toReconcile.length || saving) return;
    setSaving(true);
    const payload = toReconcile.map(({ match, dir }) => ({
      payment_kind: dir,
      payment_id: match.id,
      statement_ref: stmtRef,
      amount: match._amt,
      reconciled_by: userId || null,
    }));
    const res = await sb.post(token, "bank_reconciliations", payload);
    if (Array.isArray(res) && res.length) {
      setReconciled(prev => { const n = new Set(prev); payload.forEach(r => n.add(`${r.payment_kind}:${r.payment_id}`)); return n; });
      logAudit(token, userId, "bank_reconciled", "bank_reconciliation", null, `Reconciled ${payload.length} payment(s) · statement ${stmtRef}`);
      toast.success(`${payload.length} payment${payload.length !== 1 ? "s" : ""} marked reconciled`);
    } else {
      toast.error("Couldn't save — has BANK_RECON_PERSIST.sql been run in Supabase?");
    }
    setSaving(false);
  };

  const mapSelect = (role, label) => (
    <div>
      <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>{label}</label>
      <select value={map[role]} onChange={e => setMap(m => ({ ...m, [role]: parseInt(e.target.value) }))} style={{ minWidth: 130, minHeight: 38, border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "0 10px", fontSize: 13, outline: "none", background: "var(--white)", fontFamily: "var(--sans)" }}>
        <option value={-1}>— none —</option>
        {header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Finance</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Bank <span style={{ background: "linear-gradient(135deg,#ff6a4d,#dd2b0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Reconciliation</span></div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Import a bank statement and match it against recorded payments</div>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[
            { label: "Statement lines", val: String(txns.length), sub: raw ? "imported" : "none yet", accent: "#dd2b0f" },
            { label: "Matched", val: `${matched.length}/${txns.length}`, sub: alreadyDone.length ? `${alreadyDone.length} saved · ${matchedPct}% matched` : `${matchedPct}% matched`, accent: matchedPct === 100 && txns.length ? "#16a34a" : "#f59e0b" },
            { label: "Money in", val: fmt(totalIn), sub: "credits", accent: "#16a34a" },
            { label: "Money out", val: fmt(totalOut), sub: "debits", accent: "#dc2626" },
          ].map((k, i) => (
            <div key={i} style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Import */}
      {!rows.length ? (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Import a bank statement</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>Upload or paste your statement CSV (with a header row). Works with a single signed <em>Amount</em> column or separate <em>Paid in</em> / <em>Paid out</em> columns.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <label className="btn bp" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload CSV<input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }} />
            </label>
          </div>
          <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={7} placeholder={"Or paste CSV here, e.g.\nDate,Description,Paid in,Paid out\n01/08/2026,SUMIT TODAYS SHOP INV-0273,1200.00,\n02/08/2026,BANK CHARGE,,5.00"} style={{ width: "100%", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "12px 14px", fontSize: 12, fontFamily: "var(--mono)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ marginTop: 12 }}><button className="btn bp" disabled={!raw.trim()} onClick={() => doParse(raw)}>Load statement</button></div>
        </div>
      ) : (
        <>
          {/* Column mapping */}
          <div className="card" style={{ marginBottom: 16, padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Column mapping <span style={{ fontWeight: 400, color: "var(--text3)" }}>· {rows.length} rows · {loading ? "loading payments…" : `${payIn.length + payOut.length} payments on file`}</span></div>
              <button className="btn bg2 bsm" onClick={reset}>Import a different file</button>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              {mapSelect("date", "Date")}
              {mapSelect("desc", "Description")}
              {mapSelect("amount", "Amount (signed)")}
              <div style={{ alignSelf: "center", color: "var(--text3)", fontSize: 12, paddingBottom: 8 }}>or</div>
              {mapSelect("in", "Paid in")}
              {mapSelect("out", "Paid out")}
            </div>
          </div>

          {/* View tabs */}
          <div className="card">
            <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[["matched", `Matched (${matched.length})`, "#16a34a"], ["stmt", `On statement only (${stmtOnly.length})`, "#dc2626"], ["books", `In books only (${recon.booksOnly.length})`, "#f59e0b"]].map(([k, l, c]) => (
                  <button key={k} className={"btn bsm " + (view === k ? "bp" : "bg2")} onClick={() => setView(k)} style={view === k ? { background: c, borderColor: c } : {}}>{l}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {alreadyDone.length > 0 && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>{alreadyDone.length} already reconciled</span>}
                <button className="btn bp bsm" disabled={!toReconcile.length || saving} onClick={confirmReconciliation}
                  style={{ background: toReconcile.length && !saving ? "#16a34a" : undefined, borderColor: toReconcile.length && !saving ? "#16a34a" : undefined }}
                  title="Persist these matches so they stay reconciled across sessions">
                  {saving ? "Saving…" : `Mark ${toReconcile.length} reconciled`}
                </button>
              </div>
            </div>

            <div className="tw" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              {view === "matched" && (
                <table style={{ minWidth: 640 }}>
                  <thead><tr><th>Date</th><th>Statement description</th><th style={{ textAlign: "right" }}>Amount</th><th>Matched to</th></tr></thead>
                  <tbody>
                    {matched.map(({ t, match, dir, reconciled: isRec }) => (
                      <tr key={t.idx}>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>{t.date ? fmtDate(t.date.toISOString()) : t.dateStr || "—"}</td>
                        <td style={{ fontSize: 12 }}>{t.desc || "—"}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: dir === "in" ? "#16a34a" : "#dc2626" }}>{dir === "in" ? "+" : "−"}{fmt(Math.abs(t.amount))}</td>
                        <td style={{ fontSize: 12 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="badge b-green">✓</span>{dir === "in" ? `${match.invoice_number || "Payment"} · ${match.customer || ""}` : `${match.supplier_name || "Supplier payment"}`} <span style={{ color: "var(--text3)" }}>({match.method || "—"}, {fmtDate(match._d)})</span>{isRec && <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "rgba(22,163,74,.1)", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Reconciled</span>}</span></td>
                      </tr>
                    ))}
                    {!matched.length && <tr><td colSpan={4} className="empty">No matches yet — check the column mapping above.</td></tr>}
                  </tbody>
                </table>
              )}
              {view === "stmt" && (
                <table style={{ minWidth: 520 }}>
                  <thead><tr><th>Date</th><th>Statement description</th><th style={{ textAlign: "right" }}>Amount</th><th>Note</th></tr></thead>
                  <tbody>
                    {stmtOnly.map(({ t, dir }) => (
                      <tr key={t.idx}>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>{t.date ? fmtDate(t.date.toISOString()) : t.dateStr || "—"}</td>
                        <td style={{ fontSize: 12 }}>{t.desc || "—"}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: dir === "in" ? "#16a34a" : "#dc2626" }}>{dir === "in" ? "+" : "−"}{fmt(Math.abs(t.amount))}</td>
                        <td style={{ fontSize: 11, color: "var(--text3)" }}>{dir === "in" ? "No matching receipt on file — record it or a bank transfer/charge" : "No matching supplier payment on file — bank charge, transfer or unrecorded"}</td>
                      </tr>
                    ))}
                    {!stmtOnly.length && <tr><td colSpan={4} className="empty">Every statement line matched a recorded payment. 🎉</td></tr>}
                  </tbody>
                </table>
              )}
              {view === "books" && (
                <table style={{ minWidth: 520 }}>
                  <thead><tr><th>Date</th><th>Payment</th><th style={{ textAlign: "right" }}>Amount</th><th>Method</th></tr></thead>
                  <tbody>
                    {recon.booksOnly.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(p._d)}</td>
                        <td style={{ fontSize: 12 }}>{p.invoice_number ? `${p.invoice_number} · ${p.customer || ""}` : (p.supplier_name || "Payment")}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: p.invoice_number || p.customer ? "#16a34a" : "#dc2626" }}>{fmt(p._amt)}</td>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>{p.method || "—"}</td>
                      </tr>
                    ))}
                    {!recon.booksOnly.length && <tr><td colSpan={4} className="empty">All recorded payments were matched to the statement.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "0.5px solid var(--border)", fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
              Auto-matched by amount (±1p) and date (±{DATE_WINDOW} days), preferring lines whose description mentions the invoice number, customer or supplier. <strong>On statement only</strong> = money moved through the bank with no recorded payment (record it, or it's a transfer/charge). <strong>In books only</strong> = a recorded payment not seen on this statement (e.g. cash not yet banked, or a different period). Use <strong>Mark reconciled</strong> to save confirmed matches — reconciled payments persist across sessions and won't reappear as noise.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
