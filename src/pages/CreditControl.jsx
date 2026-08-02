import React, { useState, useMemo, useEffect } from "react";
import { sb } from "../lib/supabase.js";
import { fmt, fmtDate, isMobile } from "../lib/utils.js";
import { COMPANY, toast } from "../lib/constants.js";
import { logAudit } from "../lib/audit.js";
import { sendEmail, buildReminderEmailHtml, buildCustomerChaseEmailHtml } from "../lib/email.js";
import { MobileCard } from "../components/ui.jsx";

// ── CREDIT CONTROL ────────────────────────────────────────────────────────────
// Aged-debtors collections cockpit: every customer with an open balance, bucketed
// by age, prioritised worst-first, with one-click chase actions. Read-only over
// existing invoice/contact data — no schema changes.

const DAY = 86400000;
const daysOverdue = (inv) => {
  const due = inv.due_date || inv.invoice_date;
  if (!due) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(due).getTime()) / DAY));
};
const openBalance = (inv) => {
  if (inv.status === "paid" || inv.status === "draft") return 0;
  const b = inv.balance != null ? parseFloat(inv.balance) : NaN;
  return b > 0 ? b : parseFloat(inv.amount || 0);
};
const BUCKETS = [
  { key: "current", label: "Not yet due", min: -Infinity, max: 0, color: "#57534e" },
  { key: "b1", label: "1–30 days", min: 1, max: 30, color: "#f59e0b" },
  { key: "b2", label: "31–60 days", min: 31, max: 60, color: "#ea580c" },
  { key: "b3", label: "60+ days", min: 61, max: Infinity, color: "#dc2626" },
];
const bucketOf = (days) => BUCKETS.find(b => days >= b.min && days <= b.max) || BUCKETS[0];
const OUTCOMES = { promise_to_pay: "Promise to pay", no_answer: "No answer", left_message: "Left message", dispute: "Dispute", paid: "Paid", other: "Other" };

export function CreditControl({ contacts, invoices, token, userId, profile }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("overdue");   // overdue | all
  const [expanded, setExpanded] = useState(null); // customer name
  const [sending, setSending] = useState(null);   // customer name currently sending
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [notes, setNotes] = useState([]);          // collection log rows
  const [logFor, setLogFor] = useState(null);      // debtor being logged
  const [logForm, setLogForm] = useState({ outcome: "promise_to_pay", note: "", promise_date: "", promise_amount: "" });
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    if (!token) return;
    sb.get(token, "collection_notes", "order=created_at.desc&limit=500")
      .then(d => setNotes(Array.isArray(d) ? d : []))
      .catch(() => setNotes([]));
  }, [token]);

  const notesByCust = useMemo(() => {
    const m = new Map();
    for (const n of notes) { if (!m.has(n.customer_name)) m.set(n.customer_name, []); m.get(n.customer_name).push(n); }
    return m;
  }, [notes]);
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

  // Build per-customer aged debt from open invoices.
  const debtors = useMemo(() => {
    const open = invoices.filter(i => openBalance(i) > 0);
    const byCust = new Map();
    for (const inv of open) {
      const days = daysOverdue(inv);
      const bal = openBalance(inv);
      const line = { ...inv, _days: days, _bal: bal, _bucket: bucketOf(days).key, _overdue: days > 0 };
      if (!byCust.has(inv.customer)) byCust.set(inv.customer, []);
      byCust.get(inv.customer).push(line);
    }
    const out = [];
    for (const [name, lines] of byCust) {
      const contact = contacts.find(c => c.name === name);
      const buckets = { current: 0, b1: 0, b2: 0, b3: 0 };
      let total = 0, overdueTotal = 0, oldest = 0;
      for (const l of lines) {
        buckets[l._bucket] += l._bal;
        total += l._bal;
        if (l._overdue) { overdueTotal += l._bal; oldest = Math.max(oldest, l._days); }
      }
      lines.sort((a, b) => b._days - a._days);
      const creditLimit = parseFloat(contact?.credit_limit || 0);
      const onHold = !!contact?.credit_hold;
      const overLimit = creditLimit > 0 && total > creditLimit;
      const utilisation = creditLimit > 0 ? total / creditLimit : null;
      out.push({ name, contact, lines, buckets, total, overdueTotal, oldest, overdueCount: lines.filter(l => l._overdue).length, creditLimit, onHold, overLimit, utilisation });
    }
    // Priority: most overdue money first, then oldest, then biggest balance.
    out.sort((a, b) => b.overdueTotal - a.overdueTotal || b.oldest - a.oldest || b.total - a.total);
    return out;
  }, [invoices, contacts]);

  const totals = useMemo(() => {
    const t = { receivable: 0, overdue: 0, current: 0, b1: 0, b2: 0, b3: 0, custOverdue: 0, onHold: 0, overLimit: 0 };
    for (const d of debtors) {
      t.receivable += d.total; t.overdue += d.overdueTotal;
      t.current += d.buckets.current; t.b1 += d.buckets.b1; t.b2 += d.buckets.b2; t.b3 += d.buckets.b3;
      if (d.overdueTotal > 0) t.custOverdue++;
      if (d.onHold) t.onHold++;
      if (d.overLimit) t.overLimit++;
    }
    // DSO — trailing 365-day credit sales (exclude drafts).
    const yearAgo = Date.now() - 365 * DAY;
    const sales365 = invoices
      .filter(i => i.status !== "draft" && new Date(i.invoice_date || 0).getTime() >= yearAgo)
      .reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    t.dso = sales365 > 0 ? Math.round(t.receivable / (sales365 / 365)) : 0;
    return t;
  }, [debtors, invoices]);

  const filtered = debtors.filter(d => {
    if (mode === "overdue" && d.overdueTotal <= 0) return false;
    const q = query.toLowerCase();
    return !q || d.name.toLowerCase().includes(q);
  });

  const chasableCount = debtors.filter(d => d.overdueTotal > 0 && d.contact?.email).length;

  // Send a consolidated chase email covering a customer's overdue invoices.
  const chase = async (d) => {
    if (!d.contact?.email) { toast.warn(`No email for ${d.name}. Add one in Customers first.`); return; }
    const overdueLines = d.lines.filter(l => l._overdue);
    if (!overdueLines.length) return;
    setSending(d.name);
    const rows = overdueLines.map(l => ({ invoice_number: l.invoice_number, due_date: l.due_date || l.invoice_date, daysOverdue: l._days, balance: l._bal }));
    const html = buildCustomerChaseEmailHtml(d.name, rows, d.overdueTotal);
    const res = await sendEmail({ to: d.contact.email, subject: `Overdue Account — ${fmt(d.overdueTotal)} — ${COMPANY.name}`, html, token });
    if (res.success) {
      toast.success(`Chase sent to ${d.contact.email}`);
      logAudit(token, userId, "chase_sent", "contact", d.contact.id || null, `Credit control chase to ${d.contact.email} — ${overdueLines.length} overdue, ${fmt(d.overdueTotal)}`);
    } else toast.error("Failed to send. Please try again.");
    setSending(null);
  };

  const remindOne = async (d, inv) => {
    if (!d.contact?.email) { toast.warn(`No email for ${d.name}.`); return; }
    setSending(d.name + inv.id);
    const html = buildReminderEmailHtml(inv, inv._bal);
    const res = await sendEmail({ to: d.contact.email, subject: `Payment Reminder — ${inv.invoice_number} — ${COMPANY.name}`, html, token });
    if (res.success) { toast.success(`Reminder sent for ${inv.invoice_number}`); logAudit(token, userId, "reminder_sent", "invoice", inv.id, `Reminder to ${d.contact.email} for ${inv.invoice_number}`); }
    else toast.error("Failed to send.");
    setSending(null);
  };

  const whatsapp = (d) => {
    const overdueLines = d.lines.filter(l => l._overdue);
    const list = overdueLines.map(l => `${l.invoice_number} — ${fmtDate(l.due_date || l.invoice_date)} — ${fmt(l._bal)} (${l._days}d overdue)`).join("\n");
    const msg = encodeURIComponent(`*Overdue Account — ${COMPANY.name}*\nHi ${d.name}, our records show *${fmt(d.overdueTotal)}* overdue across ${overdueLines.length} invoice(s):\n\n${list}\n\nPlease arrange payment at your earliest convenience. Contact us on ${COMPANY.phone} with any queries. Thank you.`);
    const clean = (d.contact?.phone || "").replace(/\s+/g, "").replace(/^0/, "44");
    window.open(clean ? `https://wa.me/${clean}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  };

  const runBulk = async () => {
    setBulkRunning(true);
    let sent = 0;
    for (const d of debtors) {
      if (d.overdueTotal <= 0 || !d.contact?.email) continue;
      const overdueLines = d.lines.filter(l => l._overdue);
      const rows = overdueLines.map(l => ({ invoice_number: l.invoice_number, due_date: l.due_date || l.invoice_date, daysOverdue: l._days, balance: l._bal }));
      const html = buildCustomerChaseEmailHtml(d.name, rows, d.overdueTotal);
      const res = await sendEmail({ to: d.contact.email, subject: `Overdue Account — ${fmt(d.overdueTotal)} — ${COMPANY.name}`, html, token });
      if (res.success) { sent++; logAudit(token, userId, "chase_sent", "contact", d.contact.id || null, `Bulk chase to ${d.contact.email} — ${fmt(d.overdueTotal)}`); }
    }
    toast.success(`Chase sent to ${sent} customer${sent !== 1 ? "s" : ""}`);
    setBulkRunning(false);
    setConfirmBulk(false);
  };

  // Per-customer collection state derived from the log.
  const custNotes = (name) => notesByCust.get(name) || [];
  const openPromise = (name) => custNotes(name).find(n => n.promise_date);   // latest note carrying a promise
  const promiseBroken = (name) => { const p = openPromise(name); return p && new Date(p.promise_date) < startOfToday; };

  const saveLog = async () => {
    const d = logFor;
    if (!d) return;
    setSavingLog(true);
    const row = {
      contact_id: d.contact?.id || null,
      customer_name: d.name,
      note: logForm.note || null,
      outcome: logForm.outcome,
      promise_date: logForm.promise_date || null,
      promise_amount: logForm.promise_amount ? parseFloat(logForm.promise_amount) : null,
      created_by: userId || null,
      created_by_name: profile?.name || profile?.full_name || null,
    };
    const res = await sb.post(token, "collection_notes", row);
    if (res && res[0]) {
      setNotes(prev => [res[0], ...prev]);
      toast.success("Contact logged");
      logAudit(token, userId, "collection_logged", "contact", d.contact?.id || null, `Collection note for ${d.name}: ${OUTCOMES[logForm.outcome] || logForm.outcome}${logForm.promise_date ? ` — promised ${fmtDate(logForm.promise_date)}` : ""}`);
    } else toast.error("Failed to save note");
    setSavingLog(false);
    setLogFor(null);
    setLogForm({ outcome: "promise_to_pay", note: "", promise_date: "", promise_amount: "" });
  };

  const brokenCount = debtors.filter(d => promiseBroken(d.name)).length;

  const bucketPill = (amount, color) => amount > 0
    ? <span className="mono" style={{ fontWeight: 700, color }}>{fmt(amount)}</span>
    : <span style={{ color: "var(--text3)" }}>—</span>;

  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Finance</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Credit <span style={{ background: "linear-gradient(135deg,#ff6a4d,#dd2b0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Control</span></div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Aged debtors, collection priorities and one-click chasing</div>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[
            { label: "Total Receivable", val: fmt(totals.receivable), sub: `${debtors.length} accounts`, accent: "#dd2b0f" },
            { label: "Overdue", val: fmt(totals.overdue), sub: `${totals.custOverdue} customers`, accent: totals.overdue > 0 ? "#dc2626" : "#16a34a" },
            { label: "DSO", val: `${totals.dso} days`, sub: "avg collection time", accent: totals.dso > 45 ? "#dc2626" : totals.dso > 30 ? "#f59e0b" : "#16a34a" },
            { label: "60+ Days", val: fmt(totals.b3), sub: "high risk", accent: totals.b3 > 0 ? "#dc2626" : "#16a34a" },
          ].map((k, i) => (
            <div key={i} style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Aging summary */}
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile() ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
          {BUCKETS.map(b => {
            const amt = totals[b.key];
            const pct = totals.receivable > 0 ? Math.round((amt / totals.receivable) * 100) : 0;
            return (
              <div key={b.key} style={{ padding: "12px 14px", background: "var(--bg)", borderTop: `3px solid ${b.color}`, borderRadius: "var(--r)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{b.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--mono)", color: b.color }}>{fmt(amt)}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{pct}% of book</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ flex: "1 1 220px", background: "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }} placeholder="🔍  Search customers..." value={query} onChange={e => setQuery(e.target.value)} />
          <div style={{ display: "flex", gap: 6 }}>
            {[["overdue", "Overdue only"], ["all", "All with balance"]].map(([k, l]) => (
              <button key={k} className={"btn bsm " + (mode === k ? "bp" : "bg2")} onClick={() => setMode(k)}>{l}</button>
            ))}
          </div>
          {(totals.onHold > 0 || totals.overLimit > 0) && (
            <div style={{ fontSize: 12, display: "flex", gap: 10, alignItems: "center" }}>
              {totals.onHold > 0 && <span style={{ color: "#991b1b", fontWeight: 600 }}>{totals.onHold} on hold</span>}
              {totals.overLimit > 0 && <span style={{ color: "#9a3412", fontWeight: 600 }}>{totals.overLimit} over limit</span>}
            </div>
          )}
          {brokenCount > 0 && <div style={{ fontSize: 12, color: "#991b1b", fontWeight: 600 }}>{brokenCount} broken promise{brokenCount !== 1 ? "s" : ""}</div>}
          <button className="btn bp bsm" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }} disabled={chasableCount === 0} onClick={() => setConfirmBulk(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Chase all overdue ({chasableCount})
          </button>
        </div>

        {isMobile() ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
            {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No debtors found</div>}
            {filtered.map(d => (
              <MobileCard
                key={d.name}
                title={d.name}
                subtitle={(d.onHold ? "⛔ On hold · " : d.overLimit ? "⚠ Over limit · " : "") + (d.contact?.email || d.contact?.phone || "no contact details")}
                value={fmt(d.total)}
                valueSub={d.overdueTotal > 0 ? `${fmt(d.overdueTotal)} overdue` : "on terms"}
                accent={d.oldest > 60 ? "#dc2626" : d.oldest > 30 ? "#ea580c" : d.overdueTotal > 0 ? "#f59e0b" : "#16a34a"}
                badge={d.overdueTotal > 0 ? <span className="badge" style={{ background: d.oldest > 60 ? "#fee2e2" : "#fef3c7", color: d.oldest > 60 ? "#991b1b" : "#92400e" }}>{d.oldest}d</span> : undefined}
                rows={[
                  { label: "Not due", value: fmt(d.buckets.current) },
                  { label: "1–30", value: fmt(d.buckets.b1) },
                  { label: "31–60", value: fmt(d.buckets.b2) },
                  { label: "60+", value: fmt(d.buckets.b3) },
                ]}
                footer={
                  <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <button className="btn bp bsm" style={{ flex: 1, minHeight: 40 }} disabled={!d.contact?.email || d.overdueTotal <= 0 || sending === d.name} onClick={() => chase(d)}>{sending === d.name ? "Sending..." : "Chase"}</button>
                    <button className="btn bwa bsm" style={{ minHeight: 40 }} onClick={() => whatsapp(d)}>WhatsApp</button>
                    <button className="btn bg2 bsm" style={{ minHeight: 40 }} onClick={() => setLogFor(d)}>Log</button>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <div className="tw" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ minWidth: 900 }}>
              <thead><tr>
                <th>Customer</th><th style={{ textAlign: "right" }}>Not due</th><th style={{ textAlign: "right" }}>1–30</th><th style={{ textAlign: "right" }}>31–60</th><th style={{ textAlign: "right" }}>60+</th><th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "center" }}>Oldest</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(d => (
                  <React.Fragment key={d.name}>
                    <tr style={{ cursor: "pointer" }} onClick={() => setExpanded(expanded === d.name ? null : d.name)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)", transform: expanded === d.name ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block" }}>▶</span>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 500 }}>{d.name}</span>
                              {d.onHold && <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>ON HOLD</span>}
                              {d.overLimit && <span className="badge" style={{ background: "#ffedd5", color: "#9a3412" }}>OVER LIMIT</span>}
                              {openPromise(d.name) && (promiseBroken(d.name)
                                ? <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>PROMISE BROKEN</span>
                                : <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>PROMISE {fmtDate(openPromise(d.name).promise_date)}</span>)}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 6, alignItems: "center" }}>
                              {d.contact?.email ? <span title={d.contact.email}>✉</span> : <span style={{ color: "#dc2626" }} title="No email on file">✉✕</span>}
                              {d.contact?.phone && <span title={d.contact.phone}>☎</span>}
                              <span>{d.overdueCount > 0 ? `${d.overdueCount} overdue` : `${d.lines.length} open`}</span>
                              {d.creditLimit > 0 && <span title="Balance vs credit limit">· {Math.round(d.utilisation * 100)}% of {fmt(d.creditLimit)}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>{bucketPill(d.buckets.current, "var(--text2)")}</td>
                      <td style={{ textAlign: "right" }}>{bucketPill(d.buckets.b1, "#b45309")}</td>
                      <td style={{ textAlign: "right" }}>{bucketPill(d.buckets.b2, "#ea580c")}</td>
                      <td style={{ textAlign: "right" }}>{bucketPill(d.buckets.b3, "#dc2626")}</td>
                      <td className="mono" style={{ textAlign: "right", fontWeight: 800 }}>{fmt(d.total)}</td>
                      <td style={{ textAlign: "center" }}>{d.oldest > 0 ? <span className="badge" style={{ background: d.oldest > 60 ? "#fee2e2" : d.oldest > 30 ? "#ffedd5" : "#fef3c7", color: d.oldest > 60 ? "#991b1b" : d.oldest > 30 ? "#9a3412" : "#92400e" }}>{d.oldest}d</span> : <span style={{ color: "var(--text3)" }}>—</span>}</td>
                      <td style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button className="btn bp bsm" disabled={!d.contact?.email || d.overdueTotal <= 0 || sending === d.name} onClick={() => chase(d)}>{sending === d.name ? "..." : "Chase"}</button>
                          <button className="btn bwa bsm" onClick={() => whatsapp(d)} title="WhatsApp"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></button>
                          <button className="btn bg2 bsm" onClick={() => setLogFor(d)} title="Log a call / note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></button>
                        </div>
                      </td>
                    </tr>
                    {expanded === d.name && (
                      <tr>
                        <td colSpan={8} style={{ background: "var(--bg)", padding: 0 }}>
                          <table style={{ width: "100%" }}>
                            <thead><tr><th style={{ paddingLeft: 34 }}>Invoice</th><th>Issued</th><th>Due</th><th style={{ textAlign: "right" }}>Balance</th><th style={{ textAlign: "center" }}>Age</th><th style={{ textAlign: "right", paddingRight: 20 }}>Action</th></tr></thead>
                            <tbody>
                              {d.lines.map(inv => (
                                <tr key={inv.id}>
                                  <td className="mono" style={{ paddingLeft: 34, color: "var(--blue)", fontWeight: 600, fontSize: 12 }}>{inv.invoice_number}</td>
                                  <td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(inv.invoice_date)}</td>
                                  <td style={{ fontSize: 12, color: inv._overdue ? "#dc2626" : "var(--text2)" }}>{fmtDate(inv.due_date) || "—"}</td>
                                  <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{fmt(inv._bal)}</td>
                                  <td style={{ textAlign: "center" }}>{inv._overdue ? <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 12 }}>{inv._days}d</span> : <span style={{ color: "#16a34a", fontSize: 12 }}>on terms</span>}</td>
                                  <td style={{ textAlign: "right", paddingRight: 20 }}>{inv._overdue && <button className="btn bg2 bsm" disabled={!d.contact?.email || sending === d.name + inv.id} onClick={() => remindOne(d, inv)}>{sending === d.name + inv.id ? "..." : "Remind"}</button>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* Collection log */}
                          <div style={{ padding: "10px 20px 14px 34px", borderTop: "0.5px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px" }}>Collection log</div>
                              <button className="btn bg2 bsm" onClick={() => setLogFor(d)}>+ Log contact</button>
                            </div>
                            {custNotes(d.name).length === 0
                              ? <div style={{ fontSize: 12, color: "var(--text3)" }}>No contact logged yet.</div>
                              : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {custNotes(d.name).slice(0, 6).map(n => (
                                    <div key={n.id} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 12 }}>
                                      <span style={{ color: "var(--text3)", flexShrink: 0, width: 78 }}>{fmtDate(n.created_at)}</span>
                                      <span style={{ fontWeight: 600, flexShrink: 0 }}>{OUTCOMES[n.outcome] || n.outcome}</span>
                                      {n.promise_date && <span className="badge" style={{ background: new Date(n.promise_date) < startOfToday ? "#fee2e2" : "#dcfce7", color: new Date(n.promise_date) < startOfToday ? "#991b1b" : "#166534" }}>{n.promise_amount ? fmt(n.promise_amount) + " " : ""}by {fmtDate(n.promise_date)}</span>}
                                      {n.note && <span style={{ color: "var(--text2)" }}>{n.note}</span>}
                                      {n.created_by_name && <span style={{ color: "var(--text3)", marginLeft: "auto", flexShrink: 0 }}>— {n.created_by_name}</span>}
                                    </div>
                                  ))}
                                </div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="empty">No debtors found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmBulk && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(10,14,26,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => !bulkRunning && setConfirmBulk(false)}>
          <div className="card" style={{ maxWidth: 440, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 20px", borderBottom: "0.5px solid var(--border)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.3px" }}>Chase all overdue customers</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>This emails a consolidated overdue notice to <strong>{chasableCount}</strong> customer{chasableCount !== 1 ? "s" : ""} with an email on file and money overdue. Customers without an email are skipped.</div>
            </div>
            <div style={{ padding: "16px 20px", fontSize: 13, color: "var(--text2)" }}>
              Total overdue being chased: <strong className="mono" style={{ color: "#dc2626" }}>{fmt(debtors.filter(d => d.contact?.email).reduce((s, d) => s + d.overdueTotal, 0))}</strong>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "0.5px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn bg2" disabled={bulkRunning} onClick={() => setConfirmBulk(false)}>Cancel</button>
              <button className="btn bp" disabled={bulkRunning} onClick={runBulk}>{bulkRunning ? "Sending..." : `Send ${chasableCount} chase email${chasableCount !== 1 ? "s" : ""}`}</button>
            </div>
          </div>
        </div>
      )}

      {logFor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(10,14,26,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => !savingLog && setLogFor(null)}>
          <div className="card" style={{ maxWidth: 440, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 20px", borderBottom: "0.5px solid var(--border)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.3px" }}>Log contact — {logFor.name}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>Record a chase call, promise to pay or note. Owes {fmt(logFor.total)}{logFor.overdueTotal > 0 ? ` (${fmt(logFor.overdueTotal)} overdue)` : ""}.</div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Outcome</label>
                <select value={logForm.outcome} onChange={e => setLogForm(v => ({ ...v, outcome: e.target.value }))} style={{ width: "100%", minHeight: 42, border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "0 12px", fontSize: 13, outline: "none", background: "var(--white)", fontFamily: "var(--sans)" }}>
                  {Object.entries(OUTCOMES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              {logForm.outcome === "promise_to_pay" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Promised by</label>
                    <input type="date" value={logForm.promise_date} onChange={e => setLogForm(v => ({ ...v, promise_date: e.target.value }))} style={{ width: "100%", minHeight: 42, border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Amount (£)</label>
                    <input type="number" min="0" step="0.01" value={logForm.promise_amount} onChange={e => setLogForm(v => ({ ...v, promise_amount: e.target.value }))} placeholder="optional" style={{ width: "100%", minHeight: 42, border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "var(--mono)" }} />
                  </div>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>Note</label>
                <textarea value={logForm.note} onChange={e => setLogForm(v => ({ ...v, note: e.target.value }))} rows={3} placeholder="What was said…" style={{ width: "100%", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "var(--sans)", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "0.5px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn bg2" disabled={savingLog} onClick={() => setLogFor(null)}>Cancel</button>
              <button className="btn bp" disabled={savingLog || (!logForm.note && logForm.outcome !== "promise_to_pay")} onClick={saveLog}>{savingLog ? "Saving..." : "Save note"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
