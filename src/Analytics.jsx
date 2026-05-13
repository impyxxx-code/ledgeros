import { useState, useEffect } from "react";

const SUPABASE_URL = "https://szcogfyrhlrsxnwepnea.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Y29nZnlyaGxyc3hud2VwbmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODY1MzEsImV4cCI6MjA5NDA2MjUzMX0.oU60PfFsb0QHmn1qKasNKIxS8G30xhiMDxAPtMQTNT4";

const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";

// ── SAMPLE DATA (replace with real Supabase data when connected) ───────────────
const MONTHLY_SALES = [
  { month: "Jul", revenue: 18400, expenses: 11200, invoices: 12 },
  { month: "Aug", revenue: 22100, expenses: 13400, invoices: 15 },
  { month: "Sep", revenue: 19800, expenses: 12100, invoices: 13 },
  { month: "Oct", revenue: 26500, expenses: 15800, invoices: 18 },
  { month: "Nov", revenue: 31200, expenses: 18400, invoices: 22 },
  { month: "Dec", revenue: 38900, expenses: 21200, invoices: 28 },
  { month: "Jan", revenue: 29400, expenses: 17100, invoices: 19 },
  { month: "Feb", revenue: 33700, expenses: 19800, invoices: 24 },
  { month: "Mar", revenue: 41200, expenses: 23100, invoices: 31 },
  { month: "Apr", revenue: 37800, expenses: 21600, invoices: 27 },
  { month: "May", revenue: 44600, expenses: 25400, invoices: 33 },
  { month: "Jun", revenue: 52100, expenses: 28900, invoices: 38 },
];

const TOP_PRODUCTS = [
  { name: "Hayati 6K", category: "Vapes", units: 847, revenue: 22445.50, growth: 12.4 },
  { name: "Hayati 6K Pods", category: "Pods", units: 623, revenue: 10591.00, growth: 8.2 },
  { name: "Elux Salts 20mg", category: "E-Liquids", units: 1240, revenue: 15810.00, growth: 24.1 },
  { name: "Hayati 25K Pods", category: "Pods", units: 412, revenue: 9682.00, growth: -3.2 },
  { name: "Crystal Pro Max", category: "Vapes", units: 389, revenue: 13504.00, growth: 31.5 },
  { name: "Lost Mary BM600", category: "Disposables", units: 756, revenue: 11340.00, growth: 18.7 },
];

const TOP_CUSTOMERS = [
  { name: "Acme Corp", invoices: 24, total: 28400, lastOrder: "2025-05-08", status: "active" },
  { name: "TechStart LLC", invoices: 18, total: 19200, lastOrder: "2025-05-10", status: "active" },
  { name: "BuildRight Inc", invoices: 15, total: 16800, lastOrder: "2025-04-28", status: "active" },
  { name: "FoodCo Markets", invoices: 12, total: 14200, lastOrder: "2025-04-15", status: "overdue" },
  { name: "Nexus Partners", invoices: 9, total: 11600, lastOrder: "2025-05-01", status: "active" },
];

const RECENT_ACTIVITY = [
  { type: "invoice", desc: "Invoice INV-038 raised for Acme Corp", amount: 1240, time: "2 hours ago", icon: "🧾" },
  { type: "payment", desc: "Payment received from TechStart LLC", amount: 3200, time: "5 hours ago", icon: "💰" },
  { type: "stock", desc: "Crystal Pro Max stock low — 8 units left", amount: null, time: "Yesterday", icon: "⚠️" },
  { type: "invoice", desc: "Invoice INV-037 raised for Nexus Partners", amount: 980, time: "Yesterday", icon: "🧾" },
  { type: "purchase", desc: "PO-012 sent to Global Supplies", amount: 4200, time: "2 days ago", icon: "🛒" },
  { type: "payment", desc: "Payment received from BuildRight Inc", amount: 2800, time: "2 days ago", icon: "💰" },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#f4f5f7;--white:#fff;--border:#e2e5e9;--border2:#d0d5dd;
    --text:#1a1d23;--text2:#6b7280;--text3:#9ca3af;
    --green:#0d9f6e;--green-bg:#ecfdf5;--green-lt:#d1fae5;
    --red:#dc2626;--red-bg:#fef2f2;--red-lt:#fee2e2;
    --blue:#2563eb;--blue-bg:#eff6ff;
    --amber:#d97706;--amber-bg:#fffbeb;
    --purple:#7c3aed;--purple-bg:#f5f3ff;
    --qb:#2ca01c;--qb-dark:#1a3a2a;
    --sans:'DM Sans',sans-serif;--mono:'DM Mono',monospace;
    --sh:0 1px 3px rgba(0,0,0,.08);--sh2:0 4px 16px rgba(0,0,0,.1);
  }
  body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px}
  /* TOPNAV */
  .tnav{background:var(--qb-dark);height:52px;display:flex;align-items:center;padding:0 24px;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.2)}
  .tlogo{width:32px;height:32px;background:var(--qb);border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px}
  .tname{font-size:15px;font-weight:700;color:#fff}
  .tco{font-size:10px;color:rgba(255,255,255,.4)}
  .tbadge{margin-left:auto;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:5px 12px;font-size:12px;color:#fff}
  .tback{background:var(--qb);border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:500;color:#fff;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:5px}
  /* LAYOUT */
  .page{padding:24px;max-width:1300px;margin:0 auto}
  .ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
  .pt{font-size:22px;font-weight:700}
  .ps{font-size:13px;color:var(--text2);margin-top:3px}
  .period-btns{display:flex;gap:6px}
  .pb{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border2);background:#fff;color:var(--text2);font-family:var(--sans);transition:all .15s}
  .pb:hover{border-color:var(--qb);color:var(--qb)}
  .pb.active{background:var(--qb);color:#fff;border-color:var(--qb)}
  /* CARDS */
  .card{background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:var(--sh);margin-bottom:20px;overflow:hidden}
  .ch{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .ct{font-size:14px;font-weight:600}
  .cs{font-size:12px;color:var(--text3)}
  /* KPI */
  .kg{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}
  .kpi{background:#fff;border:1px solid var(--border);border-radius:12px;padding:20px;box-shadow:var(--sh);position:relative;overflow:hidden}
  .kpi-accent{position:absolute;top:0;left:0;right:0;height:3px}
  .ki{font-size:22px;margin-bottom:10px}
  .kl{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
  .kv{font-size:22px;font-weight:700;font-family:var(--mono)}
  .kd{font-size:12px;margin-top:4px;display:flex;align-items:center;gap:4px}
  .kd.up{color:var(--green)}.kd.down{color:var(--red)}.kd.flat{color:var(--text3)}
  /* CHART */
  .chart-area{padding:20px}
  .chart-bars{display:flex;align-items:flex-end;gap:8px;height:160px;margin-bottom:8px}
  .bar-group{flex:1;display:flex;flex-direction:column;align-items:center;gap:0;height:100%;justify-content:flex-end}
  .bar-pair{display:flex;gap:2px;align-items:flex-end;width:100%}
  .bar{border-radius:4px 4px 0 0;transition:height .5s cubic-bezier(.4,0,.2,1);min-height:3px;cursor:pointer;position:relative}
  .bar:hover::after{content:attr(data-val);position:absolute;top:-28px;left:50%;transform:translateX(-50%);background:var(--text);color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;font-family:var(--mono);white-space:nowrap;z-index:10}
  .bar-lbl{font-size:10px;color:var(--text3);margin-top:6px;font-family:var(--mono)}
  .chart-legend{display:flex;gap:16px;justify-content:center;margin-top:12px}
  .leg-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)}
  .leg-dot{width:10px;height:10px;border-radius:2px}
  /* SPARKLINE */
  .spark{height:40px;width:100%;margin-top:8px}
  /* TOP PRODUCTS TABLE */
  .tw{overflow-x:auto}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;padding:10px 16px;border-bottom:1px solid var(--border);background:#fafbfc;white-space:nowrap}
  td{padding:11px 16px;font-size:13px;border-bottom:1px solid var(--border)}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafbfc}
  .mono{font-family:var(--mono)}.tr{text-align:right}.tg{color:var(--green)}.tr-c{color:var(--red)}.tm{color:var(--text2)}
  /* RANK BAR */
  .rank-bar{height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:4px}
  .rank-fill{height:100%;border-radius:3px;background:var(--qb)}
  /* GROWTH BADGE */
  .growth{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
  .growth.up{background:var(--green-bg);color:var(--green)}
  .growth.down{background:var(--red-bg);color:var(--red)}
  /* ACTIVITY FEED */
  .activity-item{display:flex;align-items:flex-start;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)}
  .activity-item:last-child{border-bottom:none}
  .act-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;background:var(--bg)}
  .act-desc{flex:1;font-size:13px;font-weight:500}
  .act-time{font-size:11px;color:var(--text3);margin-top:2px}
  .act-amount{font-size:13px;font-weight:600;font-family:var(--mono);color:var(--green);flex-shrink:0}
  /* 2/3 COL */
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px}
  .g23{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px}
  .g13{display:grid;grid-template-columns:1fr 2fr;gap:16px;margin-bottom:20px}
  /* DONUT */
  .donut-wrap{display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px}
  .donut-legend{display:flex;flex-direction:column;gap:8px;width:100%;padding:0 20px 20px}
  .dl-item{display:flex;align-items:center;justify-content:space-between}
  .dl-label{display:flex;align-items:center;gap:8px;font-size:13px}
  .dl-dot{width:10px;height:10px;border-radius:50%}
  .dl-val{font-size:13px;font-weight:600;font-family:var(--mono)}
  .dl-pct{font-size:11px;color:var(--text3)}
  /* BADGE */
  .badge{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600}
  .badge::before{content:'';width:5px;height:5px;border-radius:50%}
  .bg-green{background:var(--green-bg);color:var(--green)}.bg-green::before{background:var(--green)}
  .bg-red{background:var(--red-bg);color:var(--red)}.bg-red::before{background:var(--red)}
  .bg-amber{background:var(--amber-bg);color:var(--amber)}.bg-amber::before{background:var(--amber)}
  /* STAT ROW */
  .stat-row{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid var(--border)}
  .stat-row:last-child{border-bottom:none}
  .stat-label{font-size:13px;color:var(--text2)}
  .stat-value{font-size:14px;font-weight:600;font-family:var(--mono)}
  @media(max-width:768px){
    .page{padding:16px}.kg{grid-template-columns:1fr 1fr;gap:12px}
    .g2{grid-template-columns:1fr}.g3{grid-template-columns:1fr}
    .g23{grid-template-columns:1fr}.g13{grid-template-columns:1fr}
    .hm{display:none}.kv{font-size:18px}
  }
  ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
`;

// ── CHART COMPONENT ───────────────────────────────────────────────────────────
function BarChart({ data, period }) {
  const d = period === "3m" ? data.slice(-3) : period === "6m" ? data.slice(-6) : data;
  const maxRev = Math.max(...d.map(x => x.revenue));
  const maxExp = Math.max(...d.map(x => x.expenses));
  const max = Math.max(maxRev, maxExp);
  return (
    <div className="chart-area">
      <div className="chart-bars">
        {d.map((m, i) => (
          <div key={i} className="bar-group">
            <div className="bar-pair">
              <div className="bar" style={{ flex: 1, height: `${(m.revenue / max) * 140}px`, background: "var(--green)", opacity: 0.85 }} data-val={fmt(m.revenue)} title={fmt(m.revenue)} />
              <div className="bar" style={{ flex: 1, height: `${(m.expenses / max) * 140}px`, background: "var(--red)", opacity: 0.6 }} data-val={fmt(m.expenses)} title={fmt(m.expenses)} />
            </div>
            <div className="bar-lbl">{m.month}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <div className="leg-item"><div className="leg-dot" style={{ background: "var(--green)" }} />Revenue</div>
        <div className="leg-item"><div className="leg-dot" style={{ background: "var(--red)", opacity: 0.7 }} />Expenses</div>
      </div>
    </div>
  );
}

// ── DONUT CHART ───────────────────────────────────────────────────────────────
function DonutChart({ data, total }) {
  const colors = ["#2ca01c", "#2563eb", "#d97706", "#7c3aed", "#dc2626"];
  let cumPct = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const startAngle = cumPct * 360 - 90;
    cumPct += pct;
    const endAngle = cumPct * 360 - 90;
    const r = 70; const cx = 90; const cy = 90;
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return { ...d, color: colors[i % colors.length], path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, pct: Math.round(pct * 100) };
  });
  return (
    <div>
      <div className="donut-wrap">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {segments.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.85} />)}
          <circle cx="90" cy="90" r="44" fill="white" />
          <text x="90" y="86" textAnchor="middle" fontSize="11" fill="var(--text2)" fontFamily="DM Sans">Total</text>
          <text x="90" y="103" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="DM Mono">{fmt(total)}</text>
        </svg>
      </div>
      <div className="donut-legend">
        {segments.map((s, i) => (
          <div key={i} className="dl-item">
            <div className="dl-label"><div className="dl-dot" style={{ background: s.color }} />{s.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="dl-pct">{s.pct}%</span><span className="dl-val">{fmt(s.value)}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SPARK LINE ────────────────────────────────────────────────────────────────
function SparkLine({ values, color }) {
  const max = Math.max(...values); const min = Math.min(...values);
  const w = 120; const h = 36; const pad = 4;
  const pts = values.map((v, i) => { const x = pad + (i / (values.length - 1)) * (w - pad * 2); const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2); return `${x},${y}`; }).join(" ");
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color || "var(--qb)"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Analytics({ invoices = [], products = [], contacts = [] }) {
  const [period, setPeriod] = useState("12m");
  const [now] = useState(new Date());

  const totalRevenue = MONTHLY_SALES.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = MONTHLY_SALES.reduce((s, m) => s + m.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalInvoices = MONTHLY_SALES.reduce((s, m) => s + m.invoices, 0);
  const avgMonthlyRev = totalRevenue / MONTHLY_SALES.length;

  const currentMonth = MONTHLY_SALES[MONTHLY_SALES.length - 1];
  const prevMonth = MONTHLY_SALES[MONTHLY_SALES.length - 2];
  const revGrowth = ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue * 100).toFixed(1);
  const expGrowth = ((currentMonth.expenses - prevMonth.expenses) / prevMonth.expenses * 100).toFixed(1);

  const categoryData = [
    { label: "Vapes", value: TOP_PRODUCTS.filter(p => p.category === "Vapes" || p.category === "Disposables").reduce((s, p) => s + p.revenue, 0) },
    { label: "Pods", value: TOP_PRODUCTS.filter(p => p.category === "Pods").reduce((s, p) => s + p.revenue, 0) },
    { label: "E-Liquids", value: TOP_PRODUCTS.filter(p => p.category === "E-Liquids").reduce((s, p) => s + p.revenue, 0) },
  ];
  const catTotal = categoryData.reduce((s, d) => s + d.value, 0);

  const maxRevenue = Math.max(...TOP_PRODUCTS.map(p => p.revenue));

  return (
    <>
      <style>{CSS}</style>
      <nav className="tnav">
        <div className="tlogo">L</div>
        <div><div className="tname">LedgerOS</div><div className="tco">Analytics</div></div>
        <div className="tbadge">📊 Sales Analytics</div>
        <a className="tback" href="https://ledgeros-lac.vercel.app" style={{ marginLeft: 8 }}>← Back to App</a>
      </nav>

      <div className="page">
        <div className="ph">
          <div><div className="pt">Sales Analytics</div><div className="ps">Performance overview · {now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div></div>
          <div className="period-btns">
            {[["3m", "3 Months"], ["6m", "6 Months"], ["12m", "12 Months"]].map(([k, l]) => (
              <button key={k} className={`pb ${period === k ? "active" : ""}`} onClick={() => setPeriod(k)}>{l}</button>
            ))}
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="kg">
          <div className="kpi">
            <div className="kpi-accent" style={{ background: "var(--green)" }} />
            <div className="ki">💰</div>
            <div className="kl">Total Revenue</div>
            <div className="kv" style={{ color: "var(--green)" }}>{fmt(totalRevenue)}</div>
            <div className="kd up">↑ {revGrowth}% vs last month</div>
            <SparkLine values={MONTHLY_SALES.map(m => m.revenue)} color="var(--green)" />
          </div>
          <div className="kpi">
            <div className="kpi-accent" style={{ background: "var(--red)" }} />
            <div className="ki">📤</div>
            <div className="kl">Total Expenses</div>
            <div className="kv" style={{ color: "var(--red)" }}>{fmt(totalExpenses)}</div>
            <div className="kd down">↑ {expGrowth}% vs last month</div>
            <SparkLine values={MONTHLY_SALES.map(m => m.expenses)} color="var(--red)" />
          </div>
          <div className="kpi">
            <div className="kpi-accent" style={{ background: "var(--blue)" }} />
            <div className="ki">📈</div>
            <div className="kl">Net Profit</div>
            <div className="kv" style={{ color: "var(--blue)" }}>{fmt(totalProfit)}</div>
            <div className="kd up">↑ {((totalProfit / totalRevenue) * 100).toFixed(1)}% margin</div>
            <SparkLine values={MONTHLY_SALES.map(m => m.revenue - m.expenses)} color="var(--blue)" />
          </div>
          <div className="kpi">
            <div className="kpi-accent" style={{ background: "var(--purple)" }} />
            <div className="ki">🧾</div>
            <div className="kl">Total Invoices</div>
            <div className="kv" style={{ color: "var(--purple)" }}>{totalInvoices}</div>
            <div className="kd flat">Avg {fmt(totalRevenue / totalInvoices)} per invoice</div>
            <SparkLine values={MONTHLY_SALES.map(m => m.invoices)} color="var(--purple)" />
          </div>
        </div>

        {/* REVENUE CHART + CATEGORY */}
        <div className="g23">
          <div className="card">
            <div className="ch"><div className="ct">Monthly Revenue vs Expenses</div><div className="cs">Hover bars to see values</div></div>
            <BarChart data={MONTHLY_SALES} period={period} />
          </div>
          <div className="card">
            <div className="ch"><div className="ct">Revenue by Category</div></div>
            <DonutChart data={categoryData} total={catTotal} />
          </div>
        </div>

        {/* TOP SELLING PRODUCTS */}
        <div className="card">
          <div className="ch"><div className="ct">🏆 Fastest Selling Products</div><div className="cs">Ranked by units sold</div></div>
          <div className="tw">
            <table>
              <thead>
                <tr><th>#</th><th>Product</th><th>Category</th><th className="hm">Units Sold</th><th>Revenue</th><th>Growth</th><th className="hm">Sales Share</th></tr>
              </thead>
              <tbody>
                {TOP_PRODUCTS.sort((a, b) => b.units - a.units).map((p, i) => (
                  <tr key={i}>
                    <td><div style={{ width: 24, height: 24, borderRadius: "50%", background: i < 3 ? "var(--qb)" : "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i < 3 ? "#fff" : "var(--text2)" }}>{i + 1}</div></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span style={{ padding: "2px 8px", background: "var(--blue-bg)", color: "var(--blue)", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{p.category}</span></td>
                    <td className="hm"><div className="mono">{p.units.toLocaleString()}</div><div className="rank-bar"><div className="rank-fill" style={{ width: `${(p.units / Math.max(...TOP_PRODUCTS.map(x => x.units))) * 100}%` }} /></div></td>
                    <td className="mono tg">{fmt(p.revenue)}</td>
                    <td><span className={`growth ${p.growth >= 0 ? "up" : "down"}`}>{p.growth >= 0 ? "↑" : "↓"} {Math.abs(p.growth)}%</span></td>
                    <td className="hm"><div className="rank-bar" style={{ width: 120 }}><div className="rank-fill" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} /></div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{((p.revenue / TOP_PRODUCTS.reduce((s, x) => s + x.revenue, 0)) * 100).toFixed(1)}% of total</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CUSTOMERS + ACTIVITY */}
        <div className="g2">
          <div className="card">
            <div className="ch"><div className="ct">👥 Top Customers</div><div className="cs">By revenue generated</div></div>
            <div className="tw">
              <table>
                <thead><tr><th>Customer</th><th className="hm">Invoices</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {TOP_CUSTOMERS.sort((a, b) => b.total - a.total).map((c, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--qb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{c.name[0]}</div>
                          <div><div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>Last: {fmtDate(c.lastOrder)}</div></div>
                        </div>
                      </td>
                      <td className="hm mono">{c.invoices}</td>
                      <td className="mono tg">{fmt(c.total)}</td>
                      <td><span className={`badge ${c.status === "active" ? "bg-green" : "bg-amber"}`}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="ch"><div className="ct">🕐 Recent Activity</div><div className="cs">Latest transactions</div></div>
            {RECENT_ACTIVITY.map((a, i) => (
              <div key={i} className="activity-item">
                <div className="act-icon">{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="act-desc">{a.desc}</div>
                  <div className="act-time">{a.time}</div>
                </div>
                {a.amount && <div className="act-amount">{fmt(a.amount)}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="g3">
          <div className="card">
            <div className="ch"><div className="ct">📅 Monthly Averages</div></div>
            <div className="stat-row"><span className="stat-label">Avg Monthly Revenue</span><span className="stat-value tg">{fmt(avgMonthlyRev)}</span></div>
            <div className="stat-row"><span className="stat-label">Avg Monthly Expenses</span><span className="stat-value tr-c">{fmt(totalExpenses / MONTHLY_SALES.length)}</span></div>
            <div className="stat-row"><span className="stat-label">Avg Monthly Profit</span><span className="stat-value" style={{ color: "var(--blue)" }}>{fmt(totalProfit / MONTHLY_SALES.length)}</span></div>
            <div className="stat-row"><span className="stat-label">Avg Invoices / Month</span><span className="stat-value">{(totalInvoices / MONTHLY_SALES.length).toFixed(0)}</span></div>
            <div className="stat-row"><span className="stat-label">Best Month</span><span className="stat-value">{MONTHLY_SALES.reduce((a, b) => a.revenue > b.revenue ? a : b).month}</span></div>
          </div>
          <div className="card">
            <div className="ch"><div className="ct">📦 Product Performance</div></div>
            <div className="stat-row"><span className="stat-label">Total Products</span><span className="stat-value">{TOP_PRODUCTS.length}</span></div>
            <div className="stat-row"><span className="stat-label">Total Units Sold</span><span className="stat-value">{TOP_PRODUCTS.reduce((s, p) => s + p.units, 0).toLocaleString()}</span></div>
            <div className="stat-row"><span className="stat-label">Top Seller</span><span className="stat-value">{TOP_PRODUCTS.sort((a, b) => b.units - a.units)[0].name}</span></div>
            <div className="stat-row"><span className="stat-label">Fastest Growing</span><span className="stat-value tg">{TOP_PRODUCTS.sort((a, b) => b.growth - a.growth)[0].name}</span></div>
            <div className="stat-row"><span className="stat-label">Total Product Revenue</span><span className="stat-value tg">{fmt(TOP_PRODUCTS.reduce((s, p) => s + p.revenue, 0))}</span></div>
          </div>
          <div className="card">
            <div className="ch"><div className="ct">🎯 Business Health</div></div>
            <div className="stat-row"><span className="stat-label">Profit Margin</span><span className="stat-value tg">{((totalProfit / totalRevenue) * 100).toFixed(1)}%</span></div>
            <div className="stat-row"><span className="stat-label">Revenue Growth (MoM)</span><span className="stat-value tg">↑ {revGrowth}%</span></div>
            <div className="stat-row"><span className="stat-label">Active Customers</span><span className="stat-value">{TOP_CUSTOMERS.filter(c => c.status === "active").length}</span></div>
            <div className="stat-row"><span className="stat-label">Overdue Accounts</span><span className="stat-value tr-c">{TOP_CUSTOMERS.filter(c => c.status === "overdue").length}</span></div>
            <div className="stat-row"><span className="stat-label">Expense Ratio</span><span className="stat-value">{((totalExpenses / totalRevenue) * 100).toFixed(1)}%</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
