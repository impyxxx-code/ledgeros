import { useState } from "react";

const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildMonthly(invoices, expenses, monthCount) {
  const now = new Date();
  const months = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: MONTH_LABELS[d.getMonth()], year: d.getFullYear(), monthIdx: d.getMonth(), revenue: 0, expenses: 0, invoices: 0, paid: 0 });
  }
  invoices.forEach(inv => {
    const d = new Date(inv.invoice_date || inv.created_at);
    const slot = months.find(m => m.monthIdx === d.getMonth() && m.year === d.getFullYear());
    if (!slot) return;
    const amt = parseFloat(inv.amount) || 0;
    slot.revenue += amt; slot.invoices += 1;
    if (inv.status === "paid") slot.paid += amt;
  });
  expenses.forEach(exp => {
    if (!exp.date) return;
    const d = new Date(exp.date);
    const slot = months.find(m => m.monthIdx === d.getMonth() && m.year === d.getFullYear());
    if (!slot) return;
    slot.expenses += parseFloat(exp.amount) || 0;
  });
  return months;
}

function buildTopProducts(invoices) {
  const map = {};
  invoices.forEach(inv => {
    let lines = inv.lines;
    try { if (typeof lines === "string") lines = JSON.parse(lines); } catch { lines = []; }
    if (!Array.isArray(lines)) return;
    lines.forEach(line => {
      if (!line.description) return;
      const key = line.description.trim();
      if (!map[key]) map[key] = { name: key, units: 0, revenue: 0 };
      map[key].units += parseFloat(line.qty) || 1;
      map[key].revenue += (parseFloat(line.unit_price) || 0) * (parseFloat(line.qty) || 1);
    });
  });
  return Object.values(map).filter(p => p.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
}

function buildTopCustomers(invoices) {
  const map = {};
  invoices.forEach(inv => {
    const name = inv.customer || "Unknown";
    if (!map[name]) map[name] = { name, invoices: 0, total: 0, paid: 0, outstanding: 0, lastOrder: inv.invoice_date || inv.created_at };
    map[name].invoices += 1;
    const amt = parseFloat(inv.amount) || 0;
    map[name].total += amt;
    if (inv.status === "paid") map[name].paid += amt;
    else map[name].outstanding += amt;
    const d = inv.invoice_date || inv.created_at;
    if (d > map[name].lastOrder) map[name].lastOrder = d;
  });
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
}

function buildRecentActivity(invoices, products) {
  const items = [];
  [...invoices].sort((a, b) => new Date(b.created_at || b.invoice_date) - new Date(a.created_at || a.invoice_date)).slice(0, 5).forEach(inv => {
    const diffDays = Math.floor((Date.now() - new Date(inv.created_at || inv.invoice_date)) / 86400000);
    const time = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : diffDays + "d ago";
    items.push({ type: inv.status === "paid" ? "payment" : "invoice", desc: inv.status === "paid" ? "Payment received · " + inv.customer : "Invoice " + (inv.invoice_number || "") + " · " + inv.customer, amount: parseFloat(inv.amount) || 0, time });
  });
  products.filter(p => p.stock_qty <= (p.reorder_level || 5)).slice(0, 2).forEach(p => {
    items.push({ type: "stock", desc: "Low stock — " + p.name + " (" + p.stock_qty + " left)", amount: null, time: "Now" });
  });
  return items;
}

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#f4f6f9;--white:#fff;--border:#e2e8f0;--text:#0f172a;--text2:#64748b;--text3:#94a3b8;--green:#16a34a;--green-bg:#f0fdf4;--red:#dc2626;--red-bg:#fef2f2;--blue:#2563eb;--blue-bg:#eff6ff;--amber:#d97706;--amber-bg:#fffbeb;--purple:#7c3aed;--mono:'Courier New',monospace;--sh:0 1px 3px rgba(0,0,0,.08)}
  body{background:var(--bg);color:var(--text);font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px}
  .tnav{background:#0d1829;height:52px;display:flex;align-items:center;padding:0 24px;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  .tlogo{width:32px;height:32px;background:#1e1b4b;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .tname{font-size:15px;font-weight:800;color:#fff;letter-spacing:-.3px}
  .tco{font-size:10px;color:rgba(255,255,255,.4)}
  .tbadge{margin-left:auto;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:5px 12px;font-size:12px;color:rgba(255,255,255,.7)}
  .tback{background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;color:#fff;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:5px;margin-left:8px}
  .page{padding:24px;max-width:1300px;margin:0 auto}
  .ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
  .pt{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-.4px}
  .ps{font-size:13px;color:var(--text2);margin-top:3px}
  .period-btns{display:flex;gap:6px}
  .pb{background:transparent;border:1px solid var(--border);border-radius:6px;padding:5px 12px;font-size:12px;font-weight:500;color:var(--text2);cursor:pointer}
  .pb.active{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-color:#2563eb}
  .card{background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:var(--sh);margin-bottom:20px;overflow:hidden}
  .ch{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .ct{font-size:14px;font-weight:700;color:#0f172a}
  .cs{font-size:12px;color:var(--text3)}
  .kg{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}
  .kpi{background:#fff;border:1px solid var(--border);border-radius:12px;padding:20px;box-shadow:var(--sh);position:relative;overflow:hidden}
  .kpi-accent{position:absolute;top:0;left:0;right:0;height:3px}
  .ki{margin-bottom:10px}
  .kl{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
  .kv{font-size:22px;font-weight:800;font-family:var(--mono);letter-spacing:-.5px}
  .kd{font-size:12px;margin-top:4px;color:var(--text3)}
  .kd.up{color:var(--green)}.kd.down{color:var(--red)}
  .chart-area{padding:20px}
  .chart-bars{display:flex;align-items:flex-end;gap:6px;height:160px;margin-bottom:8px}
  .bar-group{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}
  .bar{flex:1;border-radius:4px 4px 0 0;min-height:2px;cursor:pointer;position:relative}
  .bar:hover::after{content:attr(data-val);position:absolute;top:-28px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;white-space:nowrap;z-index:10}
  .bar-lbl{font-size:10px;color:var(--text3);margin-top:6px}
  .bar-pair{display:flex;gap:2px;align-items:flex-end;width:100%}
  .chart-legend{display:flex;gap:16px;justify-content:center;margin-top:12px}
  .leg-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)}
  .leg-dot{width:10px;height:10px;border-radius:2px}
  .tw{overflow-x:auto}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;padding:10px 16px;border-bottom:1px solid var(--border);background:#f8fafc;white-space:nowrap}
  td{padding:11px 16px;font-size:13px;border-bottom:1px solid var(--border)}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafbfc}
  .mono{font-family:var(--mono)}
  .tg{color:var(--green)}.tr-c{color:var(--red)}.tm{color:var(--text2)}
  .rank-bar{height:5px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:5px}
  .rank-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#2563eb,#1d4ed8)}
  .activity-item{display:flex;align-items:flex-start;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)}
  .activity-item:last-child{border-bottom:none}
  .act-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .act-desc{font-size:13px;font-weight:500;color:#0f172a}
  .act-time{font-size:11px;color:var(--text3);margin-top:2px}
  .act-amount{font-size:13px;font-weight:700;font-family:var(--mono);flex-shrink:0}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px}
  .g23{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px}
  .donut-wrap{display:flex;align-items:center;justify-content:center;padding:20px}
  .donut-legend{display:flex;flex-direction:column;gap:8px;width:100%;padding:0 20px 20px}
  .dl-item{display:flex;align-items:center;justify-content:space-between}
  .dl-label{display:flex;align-items:center;gap:8px;font-size:12px}
  .dl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .dl-val{font-size:13px;font-weight:700;font-family:var(--mono)}
  .dl-pct{font-size:11px;color:var(--text3)}
  .stat-row{display:flex;align-items:center;justify-content:space-between;padding:11px 20px;border-bottom:1px solid var(--border)}
  .stat-row:last-child{border-bottom:none}
  .stat-label{font-size:13px;color:var(--text2)}
  .stat-value{font-size:14px;font-weight:700;font-family:var(--mono)}
  .empty{padding:32px;text-align:center;color:var(--text3);font-size:13px}
  @media(max-width:768px){.page{padding:16px}.kg{grid-template-columns:1fr 1fr;gap:12px}.g2{grid-template-columns:1fr}.g3{grid-template-columns:1fr}.g23{grid-template-columns:1fr}.hm{display:none}.kv{font-size:18px}}
  ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
`;

function SparkLine({ values, color }) {
  if (!values || values.every(v => v === 0)) return null;
  const max = Math.max(...values); const min = Math.min(...values);
  const w = 120; const h = 32; const pad = 3;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return x + "," + y;
  }).join(" ");
  return <svg width={w} height={h} viewBox={"0 0 " + w + " " + h} style={{ display: "block", marginTop: 8 }}><polyline points={pts} fill="none" stroke={color || "#2563eb"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function BarChart({ data }) {
  const max = Math.max(...data.map(m => Math.max(m.revenue, m.expenses)), 1);
  const hasExp = data.some(m => m.expenses > 0);
  return (
    <div className="chart-area">
      <div className="chart-bars">
        {data.map((m, i) => (
          <div key={i} className="bar-group">
            <div className="bar-pair" style={{ alignItems: "flex-end", height: "100%", display: "flex" }}>
              <div className="bar" style={{ height: ((m.revenue / max) * 140) + "px", background: "#2563eb", opacity: 0.85 }} data-val={fmt(m.revenue)} />
              {hasExp && <div className="bar" style={{ height: ((m.expenses / max) * 140) + "px", background: "#dc2626", opacity: 0.6 }} data-val={fmt(m.expenses)} />}
            </div>
            <div className="bar-lbl">{m.month}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <div className="leg-item"><div className="leg-dot" style={{ background: "#2563eb" }} />Revenue</div>
        {hasExp && <div className="leg-item"><div className="leg-dot" style={{ background: "#dc2626" }} />Expenses</div>}
      </div>
    </div>
  );
}

function DonutChart({ data, total }) {
  if (!data.length || !total) return <div className="empty">No sales data to show</div>;
  const colors = ["#2563eb","#1e1b4b","#7c3aed","#d97706","#dc2626"];
  let cum = 0;
  const segs = data.map((d, i) => {
    const pct = d.value / total;
    const a1 = cum * 360 - 90; cum += pct; const a2 = cum * 360 - 90;
    const r = 70; const cx = 90; const cy = 90;
    const toRad = a => a * Math.PI / 180;
    const x1 = cx + r * Math.cos(toRad(a1)); const y1 = cy + r * Math.sin(toRad(a1));
    const x2 = cx + r * Math.cos(toRad(a2)); const y2 = cy + r * Math.sin(toRad(a2));
    return { ...d, color: colors[i % colors.length], path: "M " + cx + " " + cy + " L " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + (a2 - a1 > 180 ? 1 : 0) + " 1 " + x2 + " " + y2 + " Z", pct: Math.round(pct * 100) };
  });
  return (
    <div>
      <div className="donut-wrap">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {segs.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity="0.9" />)}
          <circle cx="90" cy="90" r="44" fill="white" />
          <text x="90" y="86" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="sans-serif">Revenue</text>
          <text x="90" y="103" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a" fontFamily="sans-serif">{fmt(total)}</text>
        </svg>
      </div>
      <div className="donut-legend">
        {segs.map((s, i) => (
          <div key={i} className="dl-item">
            <div className="dl-label"><div className="dl-dot" style={{ background: s.color }} /><span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="dl-pct">{s.pct}%</span><span className="dl-val">{fmt(s.value)}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

const IcoPaid = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IcoInv = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IcoWarn = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

export default function Analytics({ invoices = [], products = [], contacts = [], expenses = [] }) {
  const [period, setPeriod] = useState("12m");
  const monthCount = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);

  const pInv = invoices.filter(inv => new Date(inv.invoice_date || inv.created_at) >= cutoff);
  const MONTHLY = buildMonthly(pInv, expenses, monthCount);
  const TOP_PRODUCTS = buildTopProducts(pInv);
  const TOP_CUSTOMERS = buildTopCustomers(pInv);
  const RECENT = buildRecentActivity(invoices, products);

  const totalRevenue = pInv.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalPaid = pInv.filter(i => i.status === "paid").reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalOutstanding = pInv.filter(i => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalExpenses = expenses.length > 0 ? expenses.filter(e => new Date(e.date) >= cutoff).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0) : 0;
  const totalInvoices = pInv.length;
  const prevMonth = MONTHLY[MONTHLY.length - 2] || { revenue: 0 };
  const currMonth = MONTHLY[MONTHLY.length - 1] || { revenue: 0 };
  const revGrowth = prevMonth.revenue > 0 ? ((currMonth.revenue - prevMonth.revenue) / prevMonth.revenue * 100).toFixed(1) : null;

  // Category donut — parse from invoice lines
  const catMap = {};
  pInv.forEach(inv => {
    let lines = inv.lines;
    try { if (typeof lines === "string") lines = JSON.parse(lines); } catch { lines = []; }
    if (!Array.isArray(lines) || lines.length === 0) {
      catMap["Uncategorised"] = (catMap["Uncategorised"] || 0) + (parseFloat(inv.amount) || 0);
      return;
    }
    lines.forEach(line => {
      const parts = (line.description || "").split(":");
      const cat = parts.length > 1 ? parts[1].trim() : (parts[0].trim() || "Other");
      catMap[cat] = (catMap[cat] || 0) + (parseFloat(line.unit_price) || 0) * (parseFloat(line.qty) || 1);
    });
  });
  const catData = Object.entries(catMap).map(([label, value]) => ({ label, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  const catTotal = catData.reduce((s, d) => s + d.value, 0);
  const avgRev = MONTHLY.length > 0 ? totalRevenue / MONTHLY.length : 0;
  const maxRev = Math.max(...TOP_PRODUCTS.map(p => p.revenue), 1);
  const maxUnits = Math.max(...TOP_PRODUCTS.map(p => p.units), 1);

  return (
    <>
      <style>{CSS}</style>
      <nav className="tnav">
        <div className="tlogo">
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none"><rect x="10" y="13" width="28" height="3" rx="1.5" fill="#818cf8"/><rect x="10" y="20" width="20" height="3" rx="1.5" fill="#818cf8" fillOpacity=".6"/><rect x="10" y="27" width="24" height="3" rx="1.5" fill="#818cf8" fillOpacity=".35"/><rect x="30" y="21" width="2.5" height="12" rx="1.25" fill="#60a5fa"/><polygon points="36,26 30,21 30,33" fill="#60a5fa" fillOpacity=".4"/></svg>
        </div>
        <div><div className="tname">LedgerOS</div><div className="tco">Arkham Retail Ltd</div></div>
        <div className="tbadge">Analytics Dashboard</div>
        <a className="tback" href="https://ledgeros-lac.vercel.app">← Back to App</a>
      </nav>

      <div className="page">
        <div className="ph">
          <div><div className="pt">Sales Analytics</div><div className="ps">Performance overview · {now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div></div>
          <div className="period-btns">
            {[["3m","3 Months"],["6m","6 Months"],["12m","12 Months"]].map(([k,l]) => (
              <button key={k} className={"pb " + (period === k ? "active" : "")} onClick={() => setPeriod(k)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="kg">
          <div className="kpi">
            <div className="kpi-accent" style={{ background: "var(--green)" }} />
            <div className="ki"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            <div className="kl">Total Invoiced</div>
            <div className="kv" style={{ color: "var(--green)" }}>{fmt(totalRevenue)}</div>
            <div className={"kd " + (revGrowth !== null ? (revGrowth >= 0 ? "up" : "down") : "")}>{revGrowth !== null ? (revGrowth >= 0 ? "+" : "") + revGrowth + "% vs prev month" : totalInvoices + " invoices"}</div>
            <SparkLine values={MONTHLY.map(m => m.revenue)} color="var(--green)" />
          </div>
          <div className="kpi">
            <div className="kpi-accent" style={{ background: "var(--blue)" }} />
            <div className="ki"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></div>
            <div className="kl">Collected</div>
            <div className="kv" style={{ color: "var(--blue)" }}>{fmt(totalPaid)}</div>
            <div className="kd">{totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(0) : 0}% collection rate</div>
            <SparkLine values={MONTHLY.map(m => m.paid)} color="var(--blue)" />
          </div>
          <div className="kpi">
            <div className="kpi-accent" style={{ background: "var(--red)" }} />
            <div className="ki"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
            <div className="kl">Outstanding</div>
            <div className="kv" style={{ color: "var(--red)" }}>{fmt(totalOutstanding)}</div>
            <div className="kd">{pInv.filter(i => i.status === "overdue").length} overdue invoices</div>
          </div>
          <div className="kpi">
            <div className="kpi-accent" style={{ background: "var(--purple)" }} />
            <div className="ki"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <div className="kl">Customers</div>
            <div className="kv" style={{ color: "var(--purple)" }}>{TOP_CUSTOMERS.length}</div>
            <div className="kd">{totalInvoices} invoices · {period}</div>
          </div>
        </div>

        <div className="g23">
          <div className="card">
            <div className="ch"><div className="ct">Monthly Revenue</div><div className="cs">Hover bars · {period === "3m" ? "Last 3 months" : period === "6m" ? "Last 6 months" : "Last 12 months"}</div></div>
            <BarChart data={MONTHLY} />
          </div>
          <div className="card">
            <div className="ch"><div className="ct">Revenue by Category</div></div>
            <DonutChart data={catData} total={catTotal} />
          </div>
        </div>

        <div className="card">
          <div className="ch"><div className="ct">Top Selling Products</div><div className="cs">From actual invoice lines · {period}</div></div>
          {TOP_PRODUCTS.length === 0 ? <div className="empty">No product sales data for this period</div> : (
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>Product</th><th>Units Sold</th><th>Revenue</th><th className="hm">Revenue Share</th></tr></thead>
                <tbody>
                  {TOP_PRODUCTS.map((p, i) => (
                    <tr key={i}>
                      <td><div style={{ width:24,height:24,borderRadius:"50%",background:i<3?"#1e1b4b":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i<3?"#fff":"#64748b" }}>{i+1}</div></td>
                      <td style={{ fontWeight:600 }}>{p.name}</td>
                      <td><div className="mono">{Math.round(p.units).toLocaleString()}</div><div className="rank-bar"><div className="rank-fill" style={{ width:((p.units/maxUnits)*100)+"%" }} /></div></td>
                      <td className="mono tg">{fmt(p.revenue)}</td>
                      <td className="hm"><div className="rank-bar" style={{ width:120 }}><div className="rank-fill" style={{ width:((p.revenue/maxRev)*100)+"%" }} /></div><div style={{ fontSize:11,color:"var(--text3)",marginTop:3 }}>{catTotal > 0 ? ((p.revenue/catTotal)*100).toFixed(1) : 0}%</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="g2">
          <div className="card">
            <div className="ch"><div className="ct">Top Customers</div><div className="cs">By total invoiced · {period}</div></div>
            {TOP_CUSTOMERS.length === 0 ? <div className="empty">No customers for this period</div> : (
              <div className="tw">
                <table>
                  <thead><tr><th>Customer</th><th>Inv</th><th>Total</th><th>Paid</th><th>Owed</th></tr></thead>
                  <tbody>
                    {TOP_CUSTOMERS.map((c, i) => (
                      <tr key={i}>
                        <td><div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ width:30,height:30,borderRadius:"50%",background:"#1e1b4b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0 }}>{c.name[0]}</div><div><div style={{ fontWeight:600,fontSize:13 }}>{c.name}</div><div style={{ fontSize:11,color:"var(--text3)" }}>{fmtDate(c.lastOrder)}</div></div></div></td>
                        <td className="mono" style={{ color:"var(--text2)" }}>{c.invoices}</td>
                        <td className="mono" style={{ fontWeight:700 }}>{fmt(c.total)}</td>
                        <td className="mono tg">{c.paid > 0 ? fmt(c.paid) : "—"}</td>
                        <td className="mono" style={{ color:c.outstanding>0?"var(--red)":"var(--text3)" }}>{c.outstanding > 0 ? fmt(c.outstanding) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="ch"><div className="ct">Recent Activity</div><div className="cs">Latest transactions</div></div>
            {RECENT.length === 0 ? <div className="empty">No recent activity</div> : RECENT.map((a, i) => (
              <div key={i} className="activity-item">
                <div className="act-icon" style={{ background: a.type==="payment"?"#f0fdf4":a.type==="stock"?"#fffbeb":"#eff6ff" }}>
                  {a.type==="payment" ? <IcoPaid /> : a.type==="stock" ? <IcoWarn /> : <IcoInv />}
                </div>
                <div style={{ flex:1 }}>
                  <div className="act-desc">{a.desc}</div>
                  <div className="act-time">{a.time}</div>
                </div>
                {a.amount != null && <div className="act-amount" style={{ color:a.type==="payment"?"var(--green)":"var(--text2)" }}>{fmt(a.amount)}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="g3">
          <div className="card">
            <div className="ch"><div className="ct">Monthly Averages</div><div className="cs">{period}</div></div>
            <div className="stat-row"><span className="stat-label">Avg Monthly Revenue</span><span className="stat-value tg">{fmt(avgRev)}</span></div>
            <div className="stat-row"><span className="stat-label">Avg Invoices / Month</span><span className="stat-value">{MONTHLY.length > 0 ? (totalInvoices/MONTHLY.length).toFixed(1) : 0}</span></div>
            <div className="stat-row"><span className="stat-label">Avg Invoice Value</span><span className="stat-value">{totalInvoices > 0 ? fmt(totalRevenue/totalInvoices) : "—"}</span></div>
            <div className="stat-row"><span className="stat-label">Best Month</span><span className="stat-value">{MONTHLY.length > 0 ? MONTHLY.reduce((a,b) => a.revenue>b.revenue?a:b).month : "—"}</span></div>
            <div className="stat-row"><span className="stat-label">Collection Rate</span><span className="stat-value tg">{totalRevenue > 0 ? ((totalPaid/totalRevenue)*100).toFixed(0) : 0}%</span></div>
          </div>
          <div className="card">
            <div className="ch"><div className="ct">Product Stats</div></div>
            <div className="stat-row"><span className="stat-label">Products in Catalogue</span><span className="stat-value">{products.length}</span></div>
            <div className="stat-row"><span className="stat-label">Products Sold ({period})</span><span className="stat-value">{TOP_PRODUCTS.length}</span></div>
            <div className="stat-row"><span className="stat-label">Total Units Sold</span><span className="stat-value">{Math.round(TOP_PRODUCTS.reduce((s,p)=>s+p.units,0)).toLocaleString()}</span></div>
            <div className="stat-row"><span className="stat-label">Top Seller</span><span className="stat-value" style={{ fontSize:11 }}>{TOP_PRODUCTS.length > 0 ? TOP_PRODUCTS[0].name.substring(0,22) : "—"}</span></div>
            <div className="stat-row"><span className="stat-label">Low Stock Items</span><span className="stat-value tr-c">{products.filter(p=>p.stock_qty<=(p.reorder_level||5)).length}</span></div>
          </div>
          <div className="card">
            <div className="ch"><div className="ct">Business Health</div></div>
            <div className="stat-row"><span className="stat-label">Total Invoiced</span><span className="stat-value">{fmt(totalRevenue)}</span></div>
            <div className="stat-row"><span className="stat-label">Total Collected</span><span className="stat-value tg">{fmt(totalPaid)}</span></div>
            <div className="stat-row"><span className="stat-label">Outstanding</span><span className="stat-value tr-c">{fmt(totalOutstanding)}</span></div>
            <div className="stat-row"><span className="stat-label">Overdue Invoices</span><span className="stat-value tr-c">{pInv.filter(i=>i.status==="overdue").length}</span></div>
            <div className="stat-row"><span className="stat-label">Active Customers</span><span className="stat-value">{TOP_CUSTOMERS.length}</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
