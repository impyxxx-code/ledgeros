import React, { useState, useMemo, useEffect, useRef } from "react";
import { AlertTriangle, Package, Clock, FileText, PauseCircle, RotateCcw, Bell, X, Plus, Users, ShoppingBag, ArrowRight, TrendingUp, Sparkles } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { sb } from "../lib/supabase.js";
import { fmt, fmtDate, DEFAULT_REORDER } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { InvoiceModal } from "../components/InvoiceModal.jsx";
import { EditInvoiceModal } from "./invoices/EditInvoiceModal.jsx";

// ── DASHBOARD HOME (admin · desktop) ───────────────────────────────────────────
// Decision-first rebuild in the Modernist identity. Reuses the app's CSS tokens
// so light/dark theming and component styling come for free. All figures are
// derived from live invoices / products / contacts / audit_log.

const INK = "#201e1d";
const RED = "#dd2b0f";
const parseLines = (inv) => { let l = inv.lines; if (typeof l === "string") { try { l = JSON.parse(l); } catch { l = []; } } return Array.isArray(l) ? l : []; };
const monthKey = (d) => d.getFullYear() * 12 + d.getMonth();

// Count-up hook — animates a number to its target once on mount.
function useCountUp(target, deps) {
  const [val, setVal] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches) { setVal(target); return; }
    let raf, start;
    const from = ref.current;
    const step = (t) => { if (!start) start = t; const p = Math.min(1, (t - start) / 900); const e = 1 - Math.pow(1 - p, 3); setVal(from + (target - from) * e); if (p < 1) raf = requestAnimationFrame(step); else ref.current = target; };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, deps || [target]);
  return val;
}

function Spark({ data, color }) {
  const vals = data.length ? data : [0, 0];
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0), n = vals.length;
  const pts = vals.map((v, i) => `${i * (150 / (n - 1 || 1))},${20 - 2 - ((v - min) / ((max - min) || 1)) * 16}`).join(" ");
  return <svg width="100%" height="22" viewBox="0 0 150 22" preserveAspectRatio="none" style={{ display: "block", marginTop: 3 }}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function DashboardHome({ accounts = [], invoices = [], setInvoices, contacts = [], products = [], profile, setPage, setPendingFilter, token, userId }) {
  const [viewInvoice, setViewInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [range, setRange] = useState(365);          // revenue analytics range (days)
  const [metric, setMetric] = useState("Revenue");  // monthly performance metric
  const [custTab, setCustTab] = useState("top");
  const [showNotif, setShowNotif] = useState(false);
  const [audit, setAudit] = useState([]);

  const name = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const now = new Date();
  const active = useMemo(() => invoices.filter(i => i.status !== "draft"), [invoices]);

  // ── core metrics ──
  const M = useMemo(() => {
    const paid = invoices.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
    const cash = invoices.reduce((s, i) => i.payment_method === "cash" ? s + parseFloat(i.amount_paid || 0) : s, 0);
    const outstanding = invoices.filter(i => i.status === "pending" || i.status === "overdue" || i.status === "partial").reduce((s, i) => s + parseFloat(i.balance != null ? i.balance : i.amount || 0), 0);
    const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + parseFloat(i.balance != null ? i.balance : i.amount || 0), 0);
    const totalRev = active.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const overdueCount = invoices.filter(i => i.status === "overdue").length;
    const pendingCount = invoices.filter(i => i.status === "pending").length;
    const draftCount = invoices.filter(i => i.status === "draft").length;
    const partialCount = invoices.filter(i => i.status === "partial").length;
    const paidCount = invoices.filter(i => i.status === "paid").length;
    const collectionRate = totalRev > 0 ? Math.round(paid / totalRev * 100) : 0;
    const avgInvoice = paidCount > 0 ? paid / paidCount : 0;
    const thisMonth = active.filter(i => monthKey(new Date(i.invoice_date || i.created_at)) === monthKey(now)).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const lastMonth = active.filter(i => monthKey(new Date(i.invoice_date || i.created_at)) === monthKey(now) - 1).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const revTrend = lastMonth > 0 ? Math.round((thisMonth - lastMonth) / lastMonth * 100) : null;
    // DSO — balance-weighted average age of the open receivables book (days money has been owed).
    let wSum = 0, bSum = 0;
    invoices.filter(i => i.status === "pending" || i.status === "overdue" || i.status === "partial").forEach(i => {
      const bal = parseFloat(i.balance != null ? i.balance : i.amount || 0);
      if (bal <= 0) return;
      const days = Math.max(0, (now - new Date(i.invoice_date || i.created_at)) / 86400000);
      wSum += bal * days; bSum += bal;
    });
    const dso = bSum > 0 ? Math.round(wSum / bSum) : 0;
    return { paid, cash, outstanding, overdue, totalRev, overdueCount, pendingCount, draftCount, partialCount, paidCount, collectionRate, avgInvoice, thisMonth, lastMonth, revTrend, dso };
  }, [invoices, active]);

  const lowStock = useMemo(() => products.filter(p => (p.stock_qty ?? 0) <= (p.reorder_level || DEFAULT_REORDER)), [products]);
  const customers = useMemo(() => contacts.filter(c => c.type === "customer" || c.type === "both"), [contacts]);
  const onHold = useMemo(() => customers.filter(c => c.credit_hold).length, [customers]);

  // ── 6-month spark series per KPI ──
  const sparks = useMemo(() => {
    const arr = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const mi = invoices.filter(inv => monthKey(new Date(inv.invoice_date || inv.created_at)) === monthKey(d));
      return {
        revenue: mi.filter(i => i.status !== "draft").reduce((s, i) => s + parseFloat(i.amount || 0), 0),
        cash: mi.filter(i => i.payment_method === "cash").reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0),
        collected: mi.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0),
        outstanding: mi.filter(i => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0),
      };
    });
    return {
      revenue: arr.map(m => m.revenue), cash: arr.map(m => m.cash),
      collected: arr.map(m => m.collected), outstanding: arr.map(m => m.outstanding),
    };
  }, [invoices]);

  // ── KPI definitions ──
  const kpis = [
    { key: "rev", label: "Revenue (mo)", value: M.thisMonth, money: true, delta: M.revTrend, deltaLabel: "vs last month", spark: sparks.revenue, sc: "rgba(255,255,255,.55)", onClick: () => nav("all") },
    { key: "cash", label: "Cash collected", value: M.cash, money: true, delta: null, deltaLabel: `${invoices.filter(i => i.payment_method === "cash").length} cash payments`, spark: sparks.cash, sc: "#7fe0a0", onClick: () => nav("paid") },
    { key: "out", label: "Outstanding", value: M.outstanding, money: true, delta: null, deltaLabel: `${M.pendingCount + M.overdueCount} open`, spark: sparks.outstanding, sc: "#ff9478", onClick: () => nav("overdue") },
    { key: "over", label: "Overdue", value: M.overdue, money: true, delta: null, deltaLabel: `${M.overdueCount} · chase`, spark: sparks.outstanding, sc: "#ff9478", danger: true, onClick: () => nav("overdue") },
    { key: "rate", label: "Collection rate", value: M.collectionRate, pct: true, delta: null, deltaLabel: `${fmt(M.paid)} collected`, spark: sparks.collected, sc: "#7fe0a0", onClick: () => nav("paid") },
    { key: "avg", label: "Avg invoice", value: M.avgInvoice, money: true, delta: null, deltaLabel: "paid invoices", spark: sparks.revenue, sc: "rgba(255,255,255,.55)", onClick: () => nav("all") },
  ];
  const nav = (f) => { setPendingFilter?.(f); setPage?.("invoices"); };

  // ── revenue analytics data ──
  const revData = useMemo(() => {
    const buckets = [];
    if (range >= 365) {
      for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); buckets.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) }); }
    } else if (range >= 90) {
      for (let i = 12; i >= 0; i--) { const e = new Date(now); e.setDate(e.getDate() - i * 7); const s = new Date(e); s.setDate(s.getDate() - 7); buckets.push({ label: `${e.getDate()}/${e.getMonth() + 1}`, start: s, end: e }); }
    } else {
      const days = range;
      for (let i = days - 1; i >= 0; i--) { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); const e = new Date(d); e.setDate(e.getDate() + 1); buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, start: d, end: e }); }
    }
    const rows = buckets.map(b => {
      const inb = invoices.filter(inv => { const id = new Date(inv.invoice_date || inv.created_at); return id >= b.start && id < b.end; });
      const Collected = inb.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
      const Pending = inb.filter(i => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0);
      return { label: b.label, Collected: Math.round(Collected), Pending: Math.round(Pending) };
    });
    // forecast: trailing-3 average projected as a dashed tail on the last two points
    const n = rows.length;
    if (n >= 4) {
      const last3 = (rows[n - 2].Collected + rows[n - 3].Collected + rows[n - 4].Collected) / 3;
      rows[n - 2].Forecast = rows[n - 2].Collected;
      rows[n - 1].Forecast = Math.round((rows[n - 1].Collected + last3) / 2);
    }
    const target = Math.round(rows.reduce((s, r) => s + r.Collected, 0) / (n || 1));
    return { rows, target };
  }, [invoices, range]);

  // ── monthly performance (metric switch) ──
  const perfData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
    return months.map(d => {
      const mi = invoices.filter(inv => monthKey(new Date(inv.invoice_date || inv.created_at)) === monthKey(d));
      const act = mi.filter(i => i.status !== "draft");
      const revenue = act.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
      const collected = mi.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
      const units = act.reduce((s, i) => s + parseLines(i).reduce((u, l) => u + (parseFloat(l.qty) || 0), 0), 0);
      const count = act.length;
      const avg = count ? revenue / count : 0;
      return { label: d.toLocaleDateString("en-GB", { month: "short" }), Revenue: Math.round(revenue), Collected: Math.round(collected), Units: Math.round(units), Invoices: count, "Avg value": Math.round(avg) };
    });
  }, [invoices]);
  const metricFmt = (v) => metric === "Invoices" || metric === "Units" ? v : "£" + Math.round(v / 1000) + "k";

  // ── product performance ──
  const topProducts = useMemo(() => {
    const map = {};
    active.forEach(inv => parseLines(inv).forEach(l => {
      const nm = (l.description || "Other").replace(" ⚠️ UNMATCHED", "").trim();
      if (!map[nm]) map[nm] = { name: nm, revenue: 0, units: 0, byMonth: {} };
      const val = (parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0);
      map[nm].revenue += val; map[nm].units += parseFloat(l.qty) || 0;
      const mk = monthKey(new Date(inv.invoice_date || inv.created_at));
      map[nm].byMonth[mk] = (map[nm].byMonth[mk] || 0) + val;
    }));
    const mkNow = monthKey(now);
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6).map(p => {
      const prod = products.find(pr => (pr.name || "").toLowerCase() === p.name.toLowerCase());
      const trend = Array.from({ length: 5 }, (_, i) => p.byMonth[mkNow - 4 + i] || 0);
      const stock = prod ? prod.stock_qty : null;
      const margin = prod && prod.sale_price > 0 ? Math.round((prod.sale_price - (prod.cost_price || 0)) / prod.sale_price * 100) : null;
      const low = prod ? (prod.stock_qty ?? 0) <= (prod.reorder_level || DEFAULT_REORDER) : false;
      return { ...p, prod, trend, stock, margin, low, crit: prod && (prod.stock_qty ?? 0) <= 5 };
    });
  }, [active, products]);

  // ── customer performance ──
  const custData = useMemo(() => {
    const mkNow = monthKey(now);
    const per = {};
    active.forEach(inv => {
      const c = inv.customer || "—";
      if (!per[c]) per[c] = { name: c, total: 0, overdue: 0, thisMo: 0, lastMo: 0, last: null };
      per[c].total += parseFloat(inv.amount || 0);
      if (inv.status === "overdue") per[c].overdue += parseFloat(inv.balance || inv.amount || 0);
      const mk = monthKey(new Date(inv.invoice_date || inv.created_at));
      if (mk === mkNow) per[c].thisMo += parseFloat(inv.amount || 0);
      if (mk === mkNow - 1) per[c].lastMo += parseFloat(inv.amount || 0);
      const d = new Date(inv.invoice_date || inv.created_at);
      if (!per[c].last || d > per[c].last) per[c].last = d;
    });
    const list = Object.values(per);
    const top = [...list].sort((a, b) => b.total - a.total).slice(0, 5);
    const late = list.filter(c => c.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 5);
    const growing = list.filter(c => c.lastMo > 0).map(c => ({ ...c, growth: Math.round((c.thisMo - c.lastMo) / c.lastMo * 100) })).filter(c => c.growth > 0).sort((a, b) => b.growth - a.growth).slice(0, 5);
    const inactive = list.map(c => ({ ...c, days: c.last ? Math.floor((now - c.last) / 86400000) : 999 })).filter(c => c.days >= 30).sort((a, b) => a.days - b.days).slice(0, 5);
    return { top, late, growing, inactive };
  }, [active]);

  // ── AI insights (derived) ──
  const insights = useMemo(() => {
    const out = [];
    if (M.revTrend !== null) out.push({ c: "green", ico: TrendingUp, t: `Revenue ${M.revTrend >= 0 ? "up" : "down"} ${Math.abs(M.revTrend)}% vs last month`, s: `${fmt(M.thisMonth)} invoiced this month.` });
    if (topProducts[0] && M.totalRev > 0) { const share = Math.round(topProducts[0].revenue / topProducts.reduce((s, p) => s + p.revenue, M.totalRev * 0 + 1) * 100); out.push({ c: "blue", ico: Package, t: `${topProducts[0].name} leads product sales`, s: `Top SKU by revenue — keep it in stock.` }); }
    if (M.overdueCount > 0) { const top5 = custData.late.slice(0, 5).reduce((s, c) => s + c.overdue, 0); const pct = M.overdue > 0 ? Math.round(top5 / M.overdue * 100) : 0; out.push({ c: "danger", ico: Clock, t: `${M.overdueCount} invoices overdue (${fmt(M.overdue)})`, s: `Top 5 customers hold ${pct}% — chase those first.` }); }
    if (M.dso > 0) { const c = M.dso > 45 ? "danger" : M.dso > 30 ? "amber" : "green"; out.push({ c, ico: Clock, t: `Money is owed ${M.dso} days on average`, s: `That's your DSO across open invoices — clearing the oldest brings it down.` }); }
    if (lowStock.length > 0) out.push({ c: "amber", ico: AlertTriangle, t: `${lowStock.length} products low on stock`, s: `At or below reorder point — restock to avoid stockouts.` });
    const dueSoon = invoices.filter(i => (i.status === "pending" || i.status === "partial") && i.due_date && (new Date(i.due_date) - now) / 86400000 <= 7 && (new Date(i.due_date) - now) >= 0);
    if (dueSoon.length) out.push({ c: "green", ico: Sparkles, t: `${fmt(dueSoon.reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0))} due within 7 days`, s: `${dueSoon.length} invoices reaching their due date soon.` });
    if (custData.top.length) { const t5 = custData.top.reduce((s, c) => s + c.total, 0); const pct = M.totalRev > 0 ? Math.round(t5 / M.totalRev * 100) : 0; out.push({ c: "neutral", ico: Users, t: `Top 5 customers = ${pct}% of revenue`, s: `High concentration — a retention plan reduces risk.` }); }
    return out.slice(0, 6);
  }, [M, topProducts, custData, lowStock, invoices]);

  // ── operational health ──
  const ops = [
    { v: lowStock.length, l: "Low stock", k: lowStock.length ? "danger" : "green", Ico: Package, f: () => setPage?.("inventory") },
    { v: M.overdueCount, l: "Overdue invoices", k: M.overdueCount ? "danger" : "green", Ico: Clock, f: () => nav("overdue") },
    { v: M.pendingCount, l: "Pending invoices", k: M.pendingCount ? "amber" : "green", Ico: FileText, f: () => nav("pending") },
    { v: M.partialCount, l: "Part-paid", k: M.partialCount ? "amber" : "green", Ico: RotateCcw, f: () => nav("partial") },
    { v: M.draftCount, l: "Drafts", k: M.draftCount ? "blue" : "green", Ico: FileText, f: () => nav("draft") },
    { v: onHold, l: "Customers on hold", k: onHold ? "danger" : "green", Ico: PauseCircle, f: () => setPage?.("credit-control") },
  ];

  // ── notifications (derived alerts) ──
  const notes = useMemo(() => {
    const list = [];
    if (M.overdueCount) list.push({ k: "danger", Ico: Clock, t: `${M.overdueCount} invoices overdue`, s: `${fmt(M.overdue)} past due — chase now.`, f: () => nav("overdue") });
    if (lowStock.length) list.push({ k: "amber", Ico: Package, t: `${lowStock.length} products below reorder point`, s: lowStock.slice(0, 3).map(p => p.name).join(", ") + (lowStock.length > 3 ? "…" : ""), f: () => setPage?.("inventory") });
    if (onHold) list.push({ k: "danger", Ico: PauseCircle, t: `${onHold} customers on credit hold`, s: "Review in Credit Control.", f: () => setPage?.("credit-control") });
    if (M.draftCount) list.push({ k: "blue", Ico: FileText, t: `${M.draftCount} draft invoices`, s: "Unsent drafts awaiting completion.", f: () => nav("draft") });
    return list;
  }, [M, lowStock, onHold]);

  // ── activity from audit_log (graceful) ──
  useEffect(() => {
    if (!token) return;
    sb.get(token, "audit_log", "select=action,description,created_at,entity_type&order=created_at.desc&limit=18").then(d => { if (Array.isArray(d)) setAudit(d); }).catch(() => {});
  }, [token]);
  const timeline = useMemo(() => {
    const items = (audit.length ? audit.map(a => ({ t: prettyAction(a.action), s: a.description || "", when: a.created_at }))
      : [...invoices].sort((a, b) => (b.created_at || "") > (a.created_at || "") ? 1 : -1).slice(0, 8).map(i => ({ t: i.status === "paid" ? "Payment received" : "Invoice " + i.status, s: `${i.customer} · ${i.invoice_number}`, when: i.created_at || i.invoice_date })));
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    items.forEach(it => { const d = new Date(it.when); const g = d >= t0 ? "Today" : d >= new Date(t0 - 86400000) ? "Yesterday" : "Earlier"; if (groups[g].length < 6) groups[g].push(it); });
    return groups;
  }, [audit, invoices]);

  const SOFT = { green: "var(--green-lt)", amber: "var(--amber-lt)", danger: "var(--red-lt)", blue: "rgba(221,43,15,.10)", neutral: "rgba(32,30,29,.07)" };
  const CLR = { green: "var(--green)", amber: "var(--amber)", danger: "var(--red)", blue: RED, neutral: "var(--text)" };

  const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{ background: INK, border: "1px solid rgba(255,255,255,.12)", padding: "9px 12px", fontSize: 12 }}>
        <div style={{ color: "rgba(255,255,255,.5)", marginBottom: 5, fontWeight: 600 }}>{label}</div>
        {payload.filter(p => p.value != null).map(p => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, background: p.color }} /><span style={{ color: "rgba(255,255,255,.7)" }}>{p.name}:</span>
            <span style={{ color: "#fff", fontWeight: 700 }}>{p.name === "Invoices" || p.name === "Units" ? p.value : fmt(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const custRows = custData[custTab] || [];
  const custHead = { top: "Revenue", late: "Overdue", growing: "Growth", inactive: "Last order" }[custTab];
  const AVC = ["#dd2b0f", "#2563eb", "#16a34a", "#f59e0b", "#201e1d"];

  return (
    <>
      {/* ── masthead + executive KPIs ── */}
      <div className="page-hero" style={{ margin: "-26px -28px 24px -28px", background: INK, padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, right: -90, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.16) 0%,transparent 62%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#e15b47", marginBottom: 8 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: RED }} />Arkham Retail Ltd</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1.03 }}>{greeting}, <span style={{ color: "rgba(255,255,255,.4)" }}>{name}.</span></div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.42)", display: "flex", alignItems: "center", gap: 9, marginTop: 6 }}>
              {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              <span style={{ background: "rgba(22,163,74,.18)", color: "#7fe0a0", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20 }}>● Live</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => setPage?.("invoices")} className="bfrost" style={frostBtn}><Plus size={13} strokeWidth={2.5} />New Invoice</button>
            <button onClick={() => setPage?.("contacts")} className="bfrost" style={frostBtn}>Add Customer</button>
            <button onClick={() => setPage?.("analytics")} style={{ ...frostBtn, border: `1px solid ${RED}`, background: RED, color: "#fff" }}>Analytics</button>
            <button onClick={() => setShowNotif(true)} aria-label="Notifications" style={{ ...frostBtn, position: "relative", padding: "8px 10px" }}><Bell size={15} />{notes.length > 0 && <span style={{ position: "absolute", top: 5, right: 6, width: 8, height: 8, borderRadius: "50%", background: RED, border: `2px solid ${INK}` }} />}</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", borderTop: "1px solid rgba(255,255,255,.08)", marginTop: 20, position: "relative", zIndex: 1 }} className="dh-kstrip">
          {kpis.map(k => <KpiCell key={k.key} k={k} />)}
        </div>
      </div>

      {/* ── AI insights ── */}
      <SectionHead eye="Intelligence" title="Business insights" badge />
      <div className="dh-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 30 }}>
        {insights.map((o, i) => { const Ico = o.ico; return (
          <div key={i} className="card" style={{ padding: "16px 17px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, display: "grid", placeItems: "center", flexShrink: 0, background: SOFT[o.c], color: CLR[o.c] }}><Ico size={17} /></div>
            <div><div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginBottom: 3 }}>{o.t}</div><div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.45 }}>{o.s}</div></div>
          </div>
        ); })}
      </div>

      {/* ── analytics + performance ── */}
      <div className="g23" style={{ marginBottom: 30 }}>
        <div className="card">
          <div className="ch">
            <div><div className="ct">Revenue analytics</div><div className="cs">Collected · Pending · Forecast · Target</div></div>
            <div style={seg}>{[[7, "7D"], [30, "30D"], [90, "90D"], [365, "12M"]].map(([r, l]) => <button key={r} onClick={() => setRange(r)} style={segBtn(range === r)}>{l}</button>)}</div>
          </div>
          <div style={{ padding: "8px 20px 18px" }}>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={revData.rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dhCol" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--green)" stopOpacity={0.22} /><stop offset="95%" stopColor="var(--green)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="dhPen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--amber)" stopOpacity={0.14} /><stop offset="95%" stopColor="var(--amber)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text3)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tickFormatter={v => v === 0 ? "£0" : "£" + Math.round(v / 1000) + "k"} tick={{ fontSize: 10, fill: "var(--text3)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine y={revData.target} stroke="var(--text3)" strokeDasharray="5 5" strokeWidth={1.2} />
                <Area type="monotone" dataKey="Pending" stroke="var(--amber)" strokeWidth={1.6} fill="url(#dhPen)" dot={false} />
                <Area type="monotone" dataKey="Collected" stroke="var(--green)" strokeWidth={2.4} fill="url(#dhCol)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: "var(--green)" }} />
                <Area type="monotone" dataKey="Forecast" stroke={RED} strokeWidth={2} strokeDasharray="6 5" fill="none" dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="ch"><div><div className="ct">Monthly performance</div><div className="cs">{metric} · last 6 months</div></div></div>
          <div style={{ padding: "0 20px 6px" }}><div style={seg}>{["Revenue", "Collected", "Invoices", "Units", "Avg value"].map(m => <button key={m} onClick={() => setMetric(m)} style={segBtn(metric === m)}>{m}</button>)}</div></div>
          <div style={{ padding: "6px 20px 18px" }}>
            <ResponsiveContainer width="100%" height={196}>
              <BarChart data={perfData} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text3)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={metricFmt} tick={{ fontSize: 10, fill: "var(--text3)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--border)", opacity: .4 }} />
                <Bar dataKey={metric} radius={[4, 4, 0, 0]} animationDuration={500}>
                  {(() => { const mx = Math.max(...perfData.map(d => d[metric] || 0), 0); return perfData.map((d, i) => <Cell key={i} fill={d[metric] === mx && mx > 0 ? RED : "var(--border2)"} />); })()}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── operational health ── */}
      <SectionHead eye="Operations" title="Operational health" note="Click a tile to open details" />
      <div className="dh-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 30 }}>
        {ops.map((o, i) => { const Ico = o.Ico; return (
          <div key={i} role="button" tabIndex={0} onClick={o.f} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") o.f(); }} className="card"
            style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, position: "relative", overflow: "hidden", cursor: "pointer" }}>
            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: CLR[o.k] }} />
            <div style={{ width: 40, height: 40, display: "grid", placeItems: "center", flexShrink: 0, background: SOFT[o.k], color: CLR[o.k] }}><Ico size={20} /></div>
            <div><div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1, fontFamily: "var(--mono)" }}>{o.v}</div><div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>{o.l}</div></div>
            <ArrowRight size={18} style={{ marginLeft: "auto", color: "var(--text3)" }} />
          </div>
        ); })}
      </div>

      {/* ── top products ── */}
      <div className="card" style={{ marginBottom: 30 }}>
        <div className="ch"><div><div className="ct">Top performing products</div><div className="cs">By revenue · derived from invoice lines</div></div></div>
        <div className="tw">
          <table>
            <thead><tr><th>Product</th><th>Revenue</th><th className="hm">Units</th><th className="hm">Margin</th><th className="hm">Trend</th><th>Stock</th></tr></thead>
            <tbody>
              {topProducts.map((p, i) => { const up = p.trend[p.trend.length - 1] >= p.trend[0]; const mx = Math.max(...p.trend, 1), mn = Math.min(...p.trend, 0); const pts = p.trend.map((v, j) => `${j * (62 / 4)},${20 - 2 - ((v - mn) / ((mx - mn) || 1)) * 16}`).join(" "); return (
                <tr key={i}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}><div className="c-av" style={{ background: AVC[i % 5], width: 30, height: 30, fontSize: 14 }}>💨</div><div><div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>{p.prod?.sku && <div style={{ fontSize: 11, color: "var(--text3)" }}>{p.prod.sku}</div>}</div></div></td>
                  <td className="mono" style={{ fontWeight: 700 }}>{fmt(p.revenue)}</td>
                  <td className="hm mono" style={{ color: "var(--text2)" }}>{Math.round(p.units).toLocaleString()}</td>
                  <td className="hm mono" style={{ color: p.margin != null ? "var(--green)" : "var(--text3)", fontWeight: 700 }}>{p.margin != null ? p.margin + "%" : "—"}</td>
                  <td className="hm"><svg width="62" height="20" viewBox="0 0 62 20" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={up ? "var(--green)" : "var(--red)"} strokeWidth="2" strokeLinecap="round" /></svg></td>
                  <td>{p.stock == null ? <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span> : <span className={"badge " + (p.crit ? "b-red" : p.low ? "b-amber" : "b-green")}>{p.stock}</span>}</td>
                </tr>
              ); })}
              {topProducts.length === 0 && <tr><td colSpan={6} className="empty">No product sales yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── customers + activity ── */}
      <div className="g23" style={{ marginBottom: 0 }}>
        <div className="card">
          <div className="ch"><div><div className="ct">Customer performance</div><div className="cs">{{ top: "Highest revenue this period", late: "Chase these first", growing: "Momentum leaders", inactive: "Win-back candidates" }[custTab]}</div></div></div>
          <div style={{ padding: "0 20px 6px" }}><div style={seg}>{[["top", "Top"], ["late", "Late paying"], ["growing", "Growing"], ["inactive", "Inactive"]].map(([c, l]) => <button key={c} onClick={() => setCustTab(c)} style={segBtn(custTab === c)}>{l}</button>)}</div></div>
          <div className="tw">
            <table>
              <thead><tr><th>Customer</th><th>{custHead}</th><th>Detail</th><th></th></tr></thead>
              <tbody>
                {custRows.map((c, i) => {
                  const val = custTab === "late" ? fmt(c.overdue) : custTab === "growing" ? `+${c.growth}%` : custTab === "inactive" ? `${c.days}d ago` : fmt(c.total);
                  const col = custTab === "late" ? "var(--red)" : custTab === "growing" ? "var(--green)" : custTab === "inactive" ? "var(--text3)" : "var(--text)";
                  const detail = custTab === "late" ? "overdue" : custTab === "growing" ? "vs last month" : custTab === "inactive" ? "no orders" : fmt(c.total ? Math.round(c.total) : 0) === val ? "lifetime" : "lifetime";
                  return (
                    <tr key={i}>
                      <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}><div className="c-av" style={{ background: AVC[i % 5], width: 30, height: 30, fontSize: 12 }}>{(c.name || "?")[0].toUpperCase()}</div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div></div></td>
                      <td className="mono" style={{ fontWeight: 700, color: col }}>{val}</td>
                      <td style={{ fontSize: 12, color: "var(--text3)" }}>{custTab === "top" ? `${fmt(c.total)} lifetime` : detail}</td>
                      <td><button className="btn bo bsm" onClick={() => custTab === "late" || custTab === "inactive" ? setPage?.("credit-control") : nav("all")}>{custTab === "late" ? "Chase" : custTab === "inactive" ? "Re-engage" : "View"}</button></td>
                    </tr>
                  );
                })}
                {custRows.length === 0 && <tr><td colSpan={4} className="empty">Nothing here</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="ch"><div><div className="ct">Activity</div><div className="cs">Grouped timeline · from the audit log</div></div></div>
          <div style={{ padding: "12px 20px 18px" }}>
            {["Today", "Yesterday", "Earlier"].map(g => timeline[g].length > 0 && (
              <div key={g} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>{g}</div>
                {timeline[g].map((it, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{it.t}</div>
                      <div style={{ fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.s}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>{relTime(it.when)}</div>
                  </div>
                ))}
              </div>
            ))}
            {["Today", "Yesterday", "Earlier"].every(g => timeline[g].length === 0) && <div className="empty">No recent activity</div>}
          </div>
        </div>
      </div>

      {/* ── notifications slide-over ── */}
      {showNotif && (
        <>
          <div onClick={() => setShowNotif(false)} style={{ position: "fixed", inset: 0, background: "rgba(23,21,19,.42)", zIndex: 1400 }} />
          <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 378, maxWidth: "90vw", background: "var(--bg)", zIndex: 1401, borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(0,0,0,.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Notifications</div>
              <button className="btn bo bsm" onClick={() => setShowNotif(false)}><X size={16} /></button>
            </div>
            <div style={{ overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
              {notes.length === 0 && <div className="empty">You're all caught up 🎉</div>}
              {notes.map((o, i) => { const Ico = o.Ico; return (
                <div key={i} role="button" tabIndex={0} onClick={() => { o.f(); setShowNotif(false); }} className="card" style={{ padding: "13px 15px", display: "flex", gap: 11, cursor: "pointer" }}>
                  <div style={{ width: 34, height: 34, display: "grid", placeItems: "center", flexShrink: 0, background: SOFT[o.k], color: CLR[o.k] }}><Ico size={18} /></div>
                  <div><div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{o.t}</div><div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 3 }}>{o.s}</div></div>
                </div>
              ); })}
            </div>
          </aside>
        </>
      )}

      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} contacts={contacts} token={token} profile={profile}
        onEdit={(inv) => { setEditInvoice(inv); setViewInvoice(null); }}
        onStatusChange={async (id, status) => { await sb.patch(token, "invoices", id, { status }); setInvoices?.(prev => prev.map(i => i.id === id ? { ...i, status } : i)); setViewInvoice(prev => prev?.id === id ? { ...prev, status } : prev); }}
        onLogPartPay={(inv, amt, method, newBal) => logAudit(token, userId, "part_payment", "invoice", inv.id, `${inv.invoice_number} — £${amt.toFixed(2)} via ${method}. Remaining: £${newBal.toFixed(2)}`)} />}
      {editInvoice && <EditInvoiceModal invoice={editInvoice} onClose={() => setEditInvoice(null)} contacts={contacts} products={products} token={token} userId={userId}
        onSaved={(f) => { if (f) setInvoices?.(prev => prev.map(i => i.id === editInvoice.id ? { ...i, ...f } : i)); sb.get(token, "invoices", "order=created_at.desc&limit=1000").then(d => Array.isArray(d) && setInvoices?.(d)); setEditInvoice(null); }} />}

      <style>{`
        @media (max-width:1000px){ .dh-kstrip{grid-template-columns:repeat(3,1fr)!important} .dh-grid3{grid-template-columns:repeat(2,1fr)!important} }
        @media (max-width:640px){ .dh-kstrip{grid-template-columns:repeat(2,1fr)!important} .dh-grid3{grid-template-columns:1fr!important} }
      `}</style>
    </>
  );
}

const frostBtn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 0, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "rgba(248,247,245,.9)", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const seg = { display: "inline-flex", background: "var(--bg)", border: "1px solid var(--border)", padding: 2, gap: 2, flexWrap: "wrap" };
const segBtn = (on) => ({ border: "none", background: on ? "var(--white)" : "transparent", color: on ? "var(--text)" : "var(--text2)", fontSize: 11.5, fontWeight: 700, padding: "6px 11px", cursor: "pointer", boxShadow: on ? "var(--sh)" : "none" });

function KpiCell({ k }) {
  const v = useCountUp(k.value, [k.value]);
  const display = k.days ? Math.round(v) + " days" : k.pct ? Math.round(v) + "%" : fmt(v);
  return (
    <div role="button" tabIndex={0} onClick={k.onClick} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") k.onClick(); }}
      style={{ padding: "14px 16px", borderRight: "1px solid rgba(255,255,255,.08)", borderTop: "3px solid transparent", cursor: "pointer", transition: "all .15s" }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderTopColor = RED; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderTopColor = "transparent"; }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".7px", color: "rgba(255,255,255,.42)", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", letterSpacing: "-.5px", marginBottom: 5 }}>{display}</div>
      <div style={{ fontSize: 10.5, display: "flex", alignItems: "center", gap: 5 }}>
        {k.delta !== null && k.delta !== undefined && <span style={{ fontWeight: 700, color: k.delta >= 0 ? "#7fe0a0" : "#ff9478" }}>{k.delta >= 0 ? "▴" : "▾"} {Math.abs(k.delta)}%</span>}
        <span style={{ color: "rgba(255,255,255,.34)" }}>{k.deltaLabel}</span>
      </div>
      <Spark data={k.spark} color={k.sc} />
    </div>
  );
}

function SectionHead({ eye, title, note, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 15 }}>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 5 }}>{eye}</div>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.03em", display: "flex", alignItems: "center", gap: 11 }}>{title}{badge && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800, color: RED, background: "rgba(221,43,15,.1)", padding: "3px 9px", borderRadius: 20, textTransform: "uppercase", letterSpacing: ".4px" }}><Sparkles size={11} /> AI</span>}</div>
      </div>
      {note && <div style={{ fontSize: 12, color: "var(--text3)" }}>{note}</div>}
    </div>
  );
}

function prettyAction(a) {
  const map = { invoice_created: "Invoice created", invoice_paid: "Payment received", part_payment: "Partial payment", payment_recorded: "Payment received", invoice_resent: "Invoice re-sent", statement_sent: "Statement sent", chase_sent: "Chase sent", reminder_sent: "Reminder sent", bank_reconciled: "Bank reconciliation", stock_adjusted: "Stock adjusted", auto_reminder_sent: "Auto reminder sent" };
  return map[a] || (a ? a.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Activity");
}
function relTime(when) {
  if (!when) return "";
  const d = new Date(when), diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
