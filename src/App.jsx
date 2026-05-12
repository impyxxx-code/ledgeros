import { useState, useEffect, useReducer, createContext, useContext } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Replace these with your Supabase project values from:
// supabase.com → your project → Settings → API
const SUPABASE_URL = "https://szcogfyrhlrsxnwepnea.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Y29nZnlyaGxyc3hud2VwbmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODY1MzEsImV4cCI6MjA5NDA2MjUzMX0.oU60PfFsb0QHmn1qKasNKIxS8G30xhiMDxAPtMQTNT4";


// ─── SUPABASE CLIENT (no npm needed — using REST directly) ────────────────────
const sb = {
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },
  authHeaders: (token) => ({
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${token}`,
  }),

  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: sb.headers,
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },

  async signUp(email, password, full_name) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST", headers: sb.headers,
      body: JSON.stringify({ email, password, data: { full_name } }),
    });
    const data = await r.json();
    if (data.access_token && data.user) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ id: data.user.id, full_name, role: "agent" }),
      });
    }
    return data;
  },

  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST", headers: sb.authHeaders(token),
    });
  },

  async get(token, table, query = "") {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { ...sb.authHeaders(token), "Prefer": "return=representation" },
    });
    return r.json();
  },

  async post(token, table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...sb.authHeaders(token), "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });
    return r.json();
  },

  async patch(token, table, id, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...sb.authHeaders(token), "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });
    return r.json();
  },
};

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0c10; --bg2: #111318; --bg3: #181b22;
    --border: #1f2430; --border2: #2a2f3d;
    --text: #e2e8f0; --text2: #8892a4; --text3: #4a5568;
    --amber: #f6a623; --amber2: #fbbf24;
    --green: #34d399; --red: #f87171; --blue: #60a5fa;
    --mono: 'IBM Plex Mono', monospace; --sans: 'IBM Plex Sans', sans-serif;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--sans); }
  .app { display: flex; height: 100vh; overflow: hidden; }

  /* AUTH */
  .auth-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg);
    background-image: radial-gradient(ellipse at 20% 50%, rgba(246,166,35,0.04) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, rgba(96,165,250,0.04) 0%, transparent 50%);
  }
  .auth-card {
    width: 100%; max-width: 380px; background: var(--bg2);
    border: 1px solid var(--border); border-radius: 12px; padding: 36px 32px;
    margin: 16px;
  }
  .auth-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
  .logo-mark { width: 36px; height: 36px; background: var(--amber); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-weight: 700; color: #000; font-size: 16px; }
  .auth-title { font-size: 20px; font-weight: 600; margin-bottom: 6px; }
  .auth-sub { font-size: 13px; color: var(--text2); margin-bottom: 24px; }
  .auth-field { margin-bottom: 14px; }
  .auth-field label { display: block; font-size: 11px; font-weight: 500; color: var(--text2); margin-bottom: 6px; font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.5px; }
  .auth-field input { width: 100%; background: var(--bg3); border: 1px solid var(--border2); border-radius: 8px; padding: 10px 14px; font-size: 14px; color: var(--text); font-family: var(--sans); outline: none; transition: border 0.15s; }
  .auth-field input:focus { border-color: var(--amber); }
  .auth-btn { width: 100%; padding: 11px; background: var(--amber); color: #000; font-weight: 600; font-size: 14px; border: none; border-radius: 8px; cursor: pointer; margin-top: 6px; font-family: var(--sans); transition: background 0.15s; }
  .auth-btn:hover { background: var(--amber2); }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-toggle { text-align: center; margin-top: 18px; font-size: 13px; color: var(--text2); }
  .auth-toggle span { color: var(--amber); cursor: pointer; }
  .auth-error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.2); border-radius: 6px; padding: 10px 14px; font-size: 12px; color: var(--red); margin-bottom: 14px; }

  /* LAYOUT */
  .sidebar {
    width: 220px; min-width: 220px; background: var(--bg2);
    border-right: 1px solid var(--border); display: flex; flex-direction: column;
  }
  .sidebar-logo { padding: 20px 18px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
  .logo-text { font-weight: 600; font-size: 15px; }
  .logo-sub { font-size: 10px; color: var(--text3); font-family: var(--mono); text-transform: uppercase; letter-spacing: 1px; }
  .nav-section { padding: 16px 0 8px; flex: 1; }
  .nav-label { font-size: 9px; font-weight: 600; color: var(--text3); letter-spacing: 1.5px; text-transform: uppercase; padding: 0 18px 8px; font-family: var(--mono); }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 18px; font-size: 13px; color: var(--text2); cursor: pointer; border-left: 2px solid transparent; transition: all 0.15s; }
  .nav-item:hover { color: var(--text); background: var(--bg3); }
  .nav-item.active { color: var(--amber); border-left-color: var(--amber); background: rgba(246,166,35,0.06); }
  .nav-bottom { padding: 16px 18px; border-top: 1px solid var(--border); }
  .user-pill { display: flex; align-items: center; gap: 10px; }
  .avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--amber); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #000; flex-shrink: 0; }
  .user-name { font-size: 12px; font-weight: 500; flex: 1; }
  .signout-btn { background: none; border: none; color: var(--text3); cursor: pointer; font-size: 16px; padding: 2px; }
  .signout-btn:hover { color: var(--red); }

  /* MOBILE NAV */
  .mobile-nav {
    display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
    background: var(--bg2); border-top: 1px solid var(--border);
    padding: 8px 0 env(safe-area-inset-bottom, 8px);
  }
  .mobile-nav-inner { display: flex; justify-content: space-around; }
  .mobile-nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 12px; cursor: pointer; color: var(--text3); flex: 1; }
  .mobile-nav-item.active { color: var(--amber); }
  .mobile-nav-icon { font-size: 18px; }
  .mobile-nav-label { font-size: 9px; font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.5px; }

  /* TOPBAR */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { height: 56px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: var(--bg2); flex-shrink: 0; }
  .topbar-title { font-size: 16px; font-weight: 600; }
  .role-badge { font-size: 10px; font-family: var(--mono); padding: 2px 8px; border-radius: 4px; background: rgba(246,166,35,0.12); color: var(--amber); text-transform: uppercase; }

  .content { flex: 1; overflow-y: auto; padding: 20px; }

  /* CARDS & PANELS */
  .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; position: relative; overflow: hidden; }
  .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .kpi-card.green::before { background: var(--green); }
  .kpi-card.red::before { background: var(--red); }
  .kpi-card.blue::before { background: var(--blue); }
  .kpi-card.amber::before { background: var(--amber); }
  .kpi-label { font-size: 10px; color: var(--text3); font-family: var(--mono); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .kpi-value { font-size: 20px; font-weight: 600; font-family: var(--mono); }
  .kpi-sub { font-size: 11px; color: var(--text3); margin-top: 2px; }

  .panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
  .panel-header { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .panel-title { font-size: 13px; font-weight: 600; }

  /* TABLE */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; min-width: 500px; }
  th { text-align: left; font-size: 10px; font-weight: 600; color: var(--text3); font-family: var(--mono); text-transform: uppercase; letter-spacing: 1px; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  td { padding: 11px 16px; font-size: 13px; border-bottom: 1px solid var(--border); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.02); }

  /* MOBILE CARDS (instead of table rows on small screens) */
  .card-list { display: none; }

  /* FORM */
  .form-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full { grid-column: 1 / -1; }
  label { font-size: 11px; font-weight: 500; color: var(--text2); font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.5px; }
  input, select, textarea { background: var(--bg3); border: 1px solid var(--border2); border-radius: 6px; padding: 9px 12px; font-size: 14px; color: var(--text); font-family: var(--sans); outline: none; transition: border 0.15s; width: 100%; }
  input:focus, select:focus, textarea:focus { border-color: var(--amber); }
  select option { background: var(--bg3); }
  .form-footer { padding: 14px 16px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }

  /* BUTTONS */
  .btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; font-family: var(--sans); }
  .btn-primary { background: var(--amber); color: #000; }
  .btn-primary:hover { background: var(--amber2); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: var(--text2); border: 1px solid var(--border2); }
  .btn-ghost:hover { color: var(--text); }
  .btn-sm { padding: 5px 10px; font-size: 11px; }

  /* BADGES */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; font-family: var(--mono); text-transform: uppercase; }
  .badge-green { background: rgba(52,211,153,0.12); color: var(--green); }
  .badge-red { background: rgba(248,113,113,0.12); color: var(--red); }
  .badge-amber { background: rgba(246,166,35,0.12); color: var(--amber); }
  .badge-blue { background: rgba(96,165,250,0.12); color: var(--blue); }
  .badge-gray { background: rgba(255,255,255,0.06); color: var(--text2); }

  .mono { font-family: var(--mono); }
  .text-right { text-align: right; }
  .text-green { color: var(--green); }
  .text-red { color: var(--red); }
  .text-amber { color: var(--amber); }
  .text-muted { color: var(--text2); }

  /* LOADING */
  .loading { display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--text3); font-family: var(--mono); font-size: 12px; gap: 8px; }
  .spinner { width: 16px; height: 16px; border: 2px solid var(--border2); border-top-color: var(--amber); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* REPORTS */
  .report-header-row { font-size: 10px; font-weight: 600; color: var(--amber); font-family: var(--mono); text-transform: uppercase; letter-spacing: 1px; padding: 10px 16px 6px; }
  .report-row { display: flex; justify-content: space-between; padding: 7px 16px; font-size: 13px; }
  .report-row.indent { padding-left: 28px; color: var(--text2); }
  .report-row.subtotal { border-top: 1px solid var(--border); font-weight: 600; }
  .report-row.total { border-top: 2px solid var(--border2); font-weight: 700; font-size: 14px; padding: 12px 16px; }

  /* JE */
  .je-line { display: grid; grid-template-columns: 2fr 1fr 1fr 28px; gap: 8px; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--border); }
  .je-totals { display: grid; grid-template-columns: 2fr 1fr 1fr 28px; gap: 8px; padding: 10px 16px; background: var(--bg3); }
  .icon-btn { background: none; border: none; color: var(--text3); cursor: pointer; padding: 4px; border-radius: 4px; font-size: 13px; }
  .icon-btn:hover { color: var(--red); }

  /* RESPONSIVE */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .mobile-nav { display: block; }
    .content { padding: 16px 14px 80px; }
    .kpi-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .kpi-value { font-size: 17px; }
    .table-wrap table { min-width: 0; }
    .hide-mobile { display: none; }
    .form-row { grid-template-columns: 1fr; }
    .je-line { grid-template-columns: 1fr 1fr 1fr 28px; }
  }
  @media (min-width: 769px) { .mobile-nav { display: none; } }
  @media (min-width: 1100px) { .kpi-grid { grid-template-columns: repeat(4, 1fr); } }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setLoading(true); setError("");
    try {
      let data;
      if (mode === "signin") {
        data = await sb.signIn(form.email, form.password);
      } else {
        data = await sb.signUp(form.email, form.password, form.full_name);
      }
      if (data.access_token) {
        onAuth({ token: data.access_token, user: data.user });
      } else {
        setError(data.msg || data.error_description || "Authentication failed. Check your credentials.");
      }
    } catch (e) {
      setError("Network error. Check your Supabase URL and key.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark">L</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>LedgerOS</div>
            <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>Field Accounting</div>
          </div>
        </div>
        <div className="auth-title">{mode === "signin" ? "Sign in" : "Create account"}</div>
        <div className="auth-sub">{mode === "signin" ? "Access your accounting dashboard" : "Join your team on LedgerOS"}</div>
        {error && <div className="auth-error">{error}</div>}
        {mode === "signup" && (
          <div className="auth-field">
            <label>Full Name</label>
            <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Smith" />
          </div>
        )}
        <div className="auth-field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
        </div>
        <div className="auth-field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        <button className="auth-btn" onClick={handle} disabled={loading}>
          {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
        </button>
        <div className="auth-toggle">
          {mode === "signin" ? <>No account? <span onClick={() => setMode("signup")}>Sign up</span></> : <>Have an account? <span onClick={() => setMode("signin")}>Sign in</span></>}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ accounts, invoices }) {
  const revenue = accounts.filter(a => a.type === "Revenue").reduce((s, a) => s + a.balance, 0);
  const expenses = accounts.filter(a => a.type === "Expense").reduce((s, a) => s + a.balance, 0);
  const cash = accounts.find(a => a.code === "1000")?.balance || 0;
  const outstanding = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card green"><div className="kpi-label">Revenue</div><div className="kpi-value">{fmt(revenue)}</div><div className="kpi-sub">YTD</div></div>
        <div className="kpi-card red"><div className="kpi-label">Expenses</div><div className="kpi-value">{fmt(expenses)}</div><div className="kpi-sub">YTD</div></div>
        <div className="kpi-card amber"><div className="kpi-label">Net Profit</div><div className="kpi-value">{fmt(revenue - expenses)}</div><div className="kpi-sub">YTD</div></div>
        <div className="kpi-card blue"><div className="kpi-label">Cash</div><div className="kpi-value">{fmt(cash)}</div><div className="kpi-sub">Current balance</div></div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Outstanding Invoices</div>
          <span className="badge badge-amber">{fmt(outstanding)}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.filter(i => i.status !== "paid" && i.status !== "draft").slice(0, 5).map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 500 }}>{inv.customer}</td>
                  <td className="mono">{fmt(inv.amount)}</td>
                  <td><span className={`badge ${inv.status === "overdue" ? "badge-red" : "badge-amber"}`}>{inv.status}</span></td>
                </tr>
              ))}
              {invoices.filter(i => i.status !== "paid" && i.status !== "draft").length === 0 &&
                <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text3)", fontSize: 12 }}>No outstanding invoices</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── INVOICES ────────────────────────────────────────────────────────────────
function Invoices({ invoices, setInvoices, token, userId }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customer: "", description: "", amount: "", invoice_date: "", due_date: "", status: "draft" });

  const handleAdd = async () => {
    if (!form.customer || !form.amount) return;
    setSaving(true);
    const num = `INV-${String(invoices.length + 1).padStart(3, "0")}`;
    const data = await sb.post(token, "invoices", {
      ...form, amount: parseFloat(form.amount),
      invoice_number: num, created_by: userId,
    });
    if (data[0]) setInvoices(prev => [data[0], ...prev]);
    setForm({ customer: "", description: "", amount: "", invoice_date: "", due_date: "", status: "draft" });
    setShowForm(false); setSaving(false);
  };

  const markPaid = async (id) => {
    await sb.patch(token, "invoices", id, { status: "paid" });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid" } : i));
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Invoices</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ New</button>
        </div>

        {showForm && (
          <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg3)" }}>
            <div className="form-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Customer</label>
                  <input value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" />
                </div>
                <div className="form-group">
                  <label>Amount ($)</label>
                  <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Invoice Date</label>
                  <input type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Services rendered..." />
                </div>
              </div>
            </div>
            <div className="form-footer">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? "Saving..." : "Create Invoice"}
              </button>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th><th>Customer</th><th className="hide-mobile">Due</th>
                <th>Amount</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="mono text-amber" style={{ fontSize: 11 }}>{inv.invoice_number}</td>
                  <td style={{ fontWeight: 500 }}>{inv.customer}</td>
                  <td className="mono text-muted hide-mobile" style={{ fontSize: 11 }}>{fmtDate(inv.due_date)}</td>
                  <td className="mono">{fmt(inv.amount)}</td>
                  <td><span className={`badge ${inv.status === "paid" ? "badge-green" : inv.status === "overdue" ? "badge-red" : inv.status === "pending" ? "badge-amber" : "badge-gray"}`}>{inv.status}</span></td>
                  <td>{inv.status !== "paid" && <button className="btn btn-ghost btn-sm" onClick={() => markPaid(inv.id)}>Paid</button>}</td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, padding: 24 }}>No invoices yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── JOURNAL ENTRY ────────────────────────────────────────────────────────────
function JournalEntry({ accounts, token, userId }) {
  const [lines, setLines] = useState([{ account_id: "", account_name: "", debit: "", credit: "" }, { account_id: "", account_name: "", debit: "", credit: "" }]);
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sb.get(token, "journal_entries", "order=created_at.desc&limit=20").then(data => {
      if (Array.isArray(data)) setEntries(data);
    });
  }, [token]);

  const totalDebit = lines.reduce((a, l) => a + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((a, l) => a + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const updateLine = (i, field, val) => {
    const next = [...lines];
    if (field === "account_id") {
      const acc = accounts.find(a => a.id === val);
      next[i] = { ...next[i], account_id: val, account_name: acc?.name || "" };
    } else {
      next[i] = { ...next[i], [field]: val };
    }
    setLines(next);
  };

  const handlePost = async () => {
    if (!balanced || !desc) return;
    setSaving(true);
    const entryData = await sb.post(token, "journal_entries", { description: desc, entry_date: date, created_by: userId });
    if (entryData[0]) {
      const entryId = entryData[0].id;
      for (const line of lines) {
        if (line.account_id) {
          await sb.post(token, "journal_lines", {
            entry_id: entryId, account_id: line.account_id,
            account_name: line.account_name,
            debit: parseFloat(line.debit) || 0,
            credit: parseFloat(line.credit) || 0,
          });
        }
      }
      setEntries(prev => [entryData[0], ...prev]);
      setLines([{ account_id: "", account_name: "", debit: "", credit: "" }, { account_id: "", account_name: "", debit: "", credit: "" }]);
      setDesc(""); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">New Journal Entry</div>
          </div>
          <span className={`badge ${balanced ? "badge-green" : "badge-red"}`}>
            {balanced ? "✓ Balanced" : "Unbalanced"}
          </span>
        </div>
        <div className="form-body" style={{ paddingBottom: 0 }}>
          <div className="form-row">
            <div className="form-group">
              <label>Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Transaction description..." />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 480 }}>
            <div className="je-line" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", textTransform: "uppercase" }}>Account</span>
              <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", textTransform: "uppercase" }}>Debit</span>
              <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", textTransform: "uppercase" }}>Credit</span>
              <span />
            </div>
            {lines.map((line, i) => (
              <div key={i} className="je-line">
                <select value={line.account_id} onChange={e => updateLine(i, "account_id", e.target.value)}>
                  <option value="">Select account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                <input className="mono" type="number" placeholder="0.00" value={line.debit} onChange={e => updateLine(i, "debit", e.target.value)} />
                <input className="mono" type="number" placeholder="0.00" value={line.credit} onChange={e => updateLine(i, "credit", e.target.value)} />
                <button className="icon-btn" onClick={() => lines.length > 2 && setLines(lines.filter((_, idx) => idx !== i))}>✕</button>
              </div>
            ))}
            <div className="je-totals">
              <button className="btn btn-ghost btn-sm" onClick={() => setLines([...lines, { account_id: "", account_name: "", debit: "", credit: "" }])}>+ Add Line</button>
              <span className={`mono ${balanced ? "text-green" : "text-red"}`} style={{ fontSize: 13, fontWeight: 600 }}>{fmt(totalDebit)}</span>
              <span className={`mono ${balanced ? "text-green" : "text-red"}`} style={{ fontSize: 13, fontWeight: 600 }}>{fmt(totalCredit)}</span>
              <span />
            </div>
          </div>
        </div>
        <div className="form-footer">
          {saved && <span style={{ color: "var(--green)", fontSize: 12 }}>✓ Posted</span>}
          <button className="btn btn-primary" onClick={handlePost} disabled={!balanced || !desc || saving} style={{ opacity: (!balanced || !desc) ? 0.4 : 1 }}>
            {saving ? "Posting..." : "Post Entry"}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Recent Entries</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Description</th><th className="hide-mobile">Posted</th></tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td className="mono text-muted" style={{ fontSize: 11 }}>{fmtDate(e.entry_date)}</td>
                  <td style={{ fontSize: 12 }}>{e.description}</td>
                  <td className="mono text-muted hide-mobile" style={{ fontSize: 11 }}>{fmtDate(e.created_at)}</td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, padding: 24 }}>No entries yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────
function Accounts({ accounts }) {
  const types = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
  const colorMap = { Asset: "badge-green", Liability: "badge-red", Equity: "badge-blue", Revenue: "badge-amber", Expense: "badge-gray" };

  return (
    <div className="panel">
      <div className="panel-header"><div className="panel-title">Chart of Accounts</div><span className="text-muted" style={{ fontSize: 12 }}>{accounts.length} accounts</span></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th className="hide-mobile">Type</th><th className="text-right">Balance</th></tr></thead>
          <tbody>
            {types.map(type => {
              const group = accounts.filter(a => a.type === type);
              if (!group.length) return null;
              return group.map((a, i) => (
                <tr key={a.id}>
                  <td className="mono text-muted" style={{ fontSize: 11 }}>{a.code}</td>
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td className="hide-mobile"><span className={`badge ${colorMap[a.type]}`}>{a.type}</span></td>
                  <td className={`mono text-right ${a.type === "Expense" || a.type === "Liability" ? "text-red" : "text-green"}`}>{fmt(a.balance)}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function Reports({ accounts }) {
  const revenue = accounts.filter(a => a.type === "Revenue");
  const expenses = accounts.filter(a => a.type === "Expense");
  const totalRev = revenue.reduce((s, a) => s + a.balance, 0);
  const totalExp = expenses.reduce((s, a) => s + a.balance, 0);
  const net = totalRev - totalExp;

  return (
    <div className="panel">
      <div className="panel-header"><div className="panel-title">Profit & Loss</div></div>
      <div className="report-header-row">Revenue</div>
      {revenue.map(a => <div key={a.id} className="report-row indent"><span>{a.name}</span><span className="mono text-green">{fmt(a.balance)}</span></div>)}
      <div className="report-row subtotal"><span>Total Revenue</span><span className="mono text-green">{fmt(totalRev)}</span></div>
      <div style={{ height: 8 }} />
      <div className="report-header-row">Expenses</div>
      {expenses.map(a => <div key={a.id} className="report-row indent"><span>{a.name}</span><span className="mono text-red">{fmt(a.balance)}</span></div>)}
      <div className="report-row subtotal"><span>Total Expenses</span><span className="mono text-red">{fmt(totalExp)}</span></div>
      <div className="report-row total">
        <span>Net {net >= 0 ? "Income" : "Loss"}</span>
        <span className={`mono ${net >= 0 ? "text-green" : "text-red"}`}>{fmt(Math.abs(net))}</span>
      </div>
    </div>
  );
}

// ─── NAV CONFIG ──────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Overview", icon: "▦" },
  { id: "invoices", label: "Invoices", icon: "◈" },
  { id: "journal", label: "Journal", icon: "⊞" },
  { id: "accounts", label: "Accounts", icon: "◎" },
  { id: "reports", label: "Reports", icon: "▣" },
];

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      sb.get(auth.token, "accounts", "order=code.asc"),
      sb.get(auth.token, "invoices", "order=created_at.desc"),
      sb.get(auth.token, "profiles", `id=eq.${auth.user.id}`),
    ]).then(([accs, invs, profs]) => {
      if (Array.isArray(accs)) setAccounts(accs);
      if (Array.isArray(invs)) setInvoices(invs);
      if (Array.isArray(profs) && profs[0]) setProfile(profs[0]);
      setLoading(false);
    });
  }, [auth]);

  const handleSignOut = async () => {
    await sb.signOut(auth.token);
    setAuth(null); setAccounts([]); setInvoices([]); setProfile(null);
  };

  if (!auth) return (
    <>
      <style>{styles}</style>
      <AuthScreen onAuth={setAuth} />
    </>
  );

  const initials = (profile?.full_name || auth.user.email || "U")[0].toUpperCase();

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Desktop Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">L</div>
            <div><div className="logo-text">LedgerOS</div><div className="logo-sub">Accounting</div></div>
          </div>
          <div className="nav-section">
            <div className="nav-label">Navigation</div>
            {NAV.map(n => (
              <div key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
                <span>{n.icon}</span>{n.label}
              </div>
            ))}
          </div>
          <div className="nav-bottom">
            <div className="user-pill">
              <div className="avatar">{initials}</div>
              <div>
                <div className="user-name">{profile?.full_name || auth.user.email}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{profile?.role || "agent"}</div>
              </div>
              <button className="signout-btn" onClick={handleSignOut} title="Sign out">⏻</button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{NAV.find(n => n.id === page)?.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="role-badge">{profile?.role || "agent"}</span>
              <div className="avatar">{initials}</div>
            </div>
          </div>
          <div className="content">
            {loading ? (
              <div className="loading"><div className="spinner" />Loading data...</div>
            ) : (
              <>
                {page === "dashboard" && <Dashboard accounts={accounts} invoices={invoices} />}
                {page === "invoices" && <Invoices invoices={invoices} setInvoices={setInvoices} token={auth.token} userId={auth.user.id} />}
                {page === "journal" && <JournalEntry accounts={accounts} token={auth.token} userId={auth.user.id} />}
                {page === "accounts" && <Accounts accounts={accounts} />}
                {page === "reports" && <Reports accounts={accounts} />}
              </>
            )}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="mobile-nav">
          <div className="mobile-nav-inner">
            {NAV.map(n => (
              <div key={n.id} className={`mobile-nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
                <span className="mobile-nav-icon">{n.icon}</span>
                <span className="mobile-nav-label">{n.label}</span>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
