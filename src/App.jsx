import Analytics from "./Analytics.jsx";
import CSVImport from "./CSVImport.jsx";
import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://szcogfyrhlrsxnwepnea.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Y29nZnlyaGxyc3hud2VwbmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODY1MzEsImV4cCI6MjA5NDA2MjUzMX0.oU60PfFsb0QHmn1qKasNKIxS8G30xhiMDxAPtMQTNT4";

const sb = {
  h: (t) => ({ "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${t || SUPABASE_ANON_KEY}` }),
  async signIn(e, p) { return (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: sb.h(), body: JSON.stringify({ email: e, password: p }) })).json(); },
  async signUp(e, p, n) {
    const d = await (await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: sb.h(), body: JSON.stringify({ email: e, password: p, data: { full_name: n } }) })).json();
    if (d.access_token) await fetch(`${SUPABASE_URL}/rest/v1/profiles`, { method: "POST", headers: { ...sb.h(d.access_token), "Prefer": "return=representation" }, body: JSON.stringify({ id: d.user.id, full_name: n, role: "agent" }) });
    return d;
  },
  async signOut(t) { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: sb.h(t) }); },
  async get(t, table, q = "") { return (await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { headers: sb.h(t) })).json(); },
  async post(t, table, body) { return (await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...sb.h(t), "Prefer": "return=representation" }, body: JSON.stringify(body) })).json(); },
  async patch(t, table, id, body) { return (await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...sb.h(t), "Prefer": "return=representation" }, body: JSON.stringify(body) })).json(); },
  async del(t, table, id) { await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: sb.h(t) }); },
};

const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const today = () => new Date().toISOString().split("T")[0];

// ── COMPANY DETAILS (edit these) ──────────────────────────────────────────────
const COMPANY = {
  name: "Arkham Retail Ltd",
  address: "2 Fieldhead Street, Fieldhead Business Centre",
  city: "Bradford",
  postcode: "BD7 1LW",
  phone: "07448208411",
  email: "arkhamretail@gmail.com",
  vatNumber: "GB462229106",
  bankName: "Tide Bank",
  sortCode: "04-06-05",
  accountNumber: "23058246",
};

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
    --sh:0 1px 3px rgba(0,0,0,.08);
  }
  body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px}
  .tnav{background:var(--qb-dark);height:52px;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.2)}
  .tnav-brand{display:flex;align-items:center;gap:10px;margin-right:20px}
  .tnav-logo{width:32px;height:32px;background:var(--qb);border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px}
  .tnav-name{font-size:15px;font-weight:700;color:#fff}
  .tnav-co{font-size:10px;color:rgba(255,255,255,.4)}
  .tnav-search{flex:1;max-width:380px;margin:0 16px;position:relative}
  .tnav-search input{width:100%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:7px 14px 7px 30px;font-size:13px;color:#fff;font-family:var(--sans);outline:none}
  .tnav-search input::placeholder{color:rgba(255,255,255,.4)}
  .si{position:absolute;left:9px;top:50%;transform:translateY(-50%);font-size:12px;color:rgba(255,255,255,.4)}
  .tnav-right{margin-left:auto;display:flex;align-items:center;gap:8px}
  .tnav-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:6px 12px;font-size:12px;color:#fff;cursor:pointer;font-family:var(--sans)}
  .tnav-btn:hover{background:rgba(255,255,255,.18)}
  .tnav-av{width:30px;height:30px;border-radius:50%;background:var(--qb);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff}
  .mnav{background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;overflow-x:auto}
  .mnav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 14px;cursor:pointer;border-bottom:3px solid transparent;color:var(--text2);font-size:11px;font-weight:600;white-space:nowrap;transition:all .15s;text-transform:uppercase;letter-spacing:.4px}
  .mnav-item:hover{color:var(--text)}
  .mnav-item.active{color:var(--qb);border-bottom-color:var(--qb)}
  .mnav-icon{font-size:17px}
  .content{flex:1;padding:24px 20px;max-width:1300px;margin:0 auto;width:100%}
  .app{display:flex;flex-direction:column;min-height:100vh}
  .card{background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:var(--sh);margin-bottom:20px;overflow:hidden}
  .ch{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
  .ct{font-size:14px;font-weight:600}
  .cs{font-size:12px;color:var(--text3)}
  .kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}
  .kpi{background:#fff;border:1px solid var(--border);border-radius:12px;padding:18px 20px;box-shadow:var(--sh)}
  .ki{font-size:22px;margin-bottom:8px}
  .kl{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .kv{font-size:21px;font-weight:700;font-family:var(--mono)}
  .ks{font-size:11px;color:var(--text3);margin-top:2px}
  .tw{overflow-x:auto}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;padding:10px 16px;border-bottom:1px solid var(--border);background:#fafbfc;white-space:nowrap}
  td{padding:11px 16px;font-size:13px;border-bottom:1px solid var(--border)}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafbfc}
  .badge{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600}
  .badge::before{content:'';width:5px;height:5px;border-radius:50%}
  .bg-green{background:var(--green-bg);color:var(--green)}.bg-green::before{background:var(--green)}
  .bg-red{background:var(--red-bg);color:var(--red)}.bg-red::before{background:var(--red)}
  .bg-amber{background:var(--amber-bg);color:var(--amber)}.bg-amber::before{background:var(--amber)}
  .bg-blue{background:var(--blue-bg);color:var(--blue)}.bg-blue::before{background:var(--blue)}
  .bg-purple{background:var(--purple-bg);color:var(--purple)}.bg-purple::before{background:var(--purple)}
  .bg-gray{background:var(--bg);color:var(--text2)}.bg-gray::before{background:var(--text3)}
  .btn{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .15s;font-family:var(--sans);display:inline-flex;align-items:center;gap:6px}
  .bp{background:var(--qb);color:#fff}.bp:hover{background:#248a16}.bp:disabled{opacity:.4;cursor:not-allowed}
  .bo{background:#fff;color:var(--text);border:1px solid var(--border2)}.bo:hover{border-color:var(--qb);color:var(--qb)}
  .bd{background:var(--red-bg);color:var(--red);border:1px solid var(--red-lt)}
  .bsm{padding:5px 12px;font-size:12px}
  .bwa{background:#25D366;color:#fff;border:none}.bwa:hover{background:#20BA5A}
  .fg{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px 20px}
  .fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:18px 20px}
  .fgrp{display:flex;flex-direction:column;gap:5px}
  .fgrp.full{grid-column:1/-1}
  .fgrp label{font-size:12px;font-weight:500;color:var(--text2)}
  .fgrp input,.fgrp select,.fgrp textarea{background:#fff;border:1.5px solid var(--border2);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);font-family:var(--sans);outline:none;transition:border .15s;width:100%}
  .fgrp input:focus,.fgrp select:focus{border-color:var(--qb);box-shadow:0 0 0 3px rgba(44,160,28,.08)}
  .ff{padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end;background:#fafbfc;flex-wrap:wrap}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px}
  .ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
  .pt{font-size:22px;font-weight:700}
  .pgreet{font-size:22px;font-weight:700}
  .psub{font-size:13px;color:var(--text2);margin-top:2px;margin-bottom:20px}
  .qa{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;align-items:center}
  .qa-lbl{font-size:12px;color:var(--text2)}
  .qa-btn{background:#fff;border:1px solid var(--border2);border-radius:20px;padding:6px 14px;font-size:12px;font-weight:500;color:var(--text);cursor:pointer;font-family:var(--sans);transition:all .15s}
  .qa-btn:hover{border-color:var(--qb);color:var(--qb)}
  .is{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  .ic{background:#fff;border:1px solid var(--border);border-radius:12px;padding:20px;box-shadow:var(--sh)}
  .ic-lbl{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .ic-total{font-size:26px;font-weight:700;font-family:var(--mono);margin-bottom:12px}
  .ic-bar{height:8px;border-radius:4px;background:var(--border);overflow:hidden;margin-bottom:10px;display:flex}
  .ic-seg{height:100%;border-radius:4px}
  .ic-bd{display:flex;gap:16px}
  .ic-bd-lbl{font-size:11px;color:var(--text3);margin-bottom:2px}
  .ic-bd-val{font-size:14px;font-weight:600;font-family:var(--mono)}
  .rs-title{font-size:11px;font-weight:700;color:var(--qb);text-transform:uppercase;letter-spacing:1px;padding:12px 20px 6px}
  .rrow{display:flex;justify-content:space-between;padding:7px 20px;font-size:13px}
  .rrow:hover{background:#fafbfc}
  .rrow.indent{padding-left:36px;color:var(--text2)}
  .rrow.subtotal{border-top:1px solid var(--border);font-weight:600}
  .rrow.total{border-top:2px solid var(--border2);font-weight:700;font-size:15px;padding:12px 20px;background:#fafbfc}
  .je-l{display:grid;grid-template-columns:2fr 1fr 1fr 30px;gap:8px;align-items:center;padding:8px 16px;border-bottom:1px solid var(--border)}
  .je-t{display:grid;grid-template-columns:2fr 1fr 1fr 30px;gap:8px;padding:10px 16px;background:#fafbfc}
  .ib{background:none;border:none;color:var(--text3);cursor:pointer;padding:4px 6px;border-radius:5px;font-size:13px}
  .ib:hover{color:var(--red);background:var(--red-bg)}
  .contact-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:18px;box-shadow:var(--sh);cursor:pointer;transition:all .15s}
  .contact-card:hover{border-color:var(--qb);box-shadow:0 4px 16px rgba(0,0,0,.1)}
  .cc-avatar{width:44px;height:44px;border-radius:50%;background:var(--qb);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;margin-bottom:12px}
  .cc-name{font-size:15px;font-weight:600;margin-bottom:4px}
  .cc-detail{font-size:12px;color:var(--text2);margin-bottom:2px}
  .po-line{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 28px;gap:8px;align-items:center;padding:8px 16px;border-bottom:1px solid var(--border)}
  .tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:20px}
  .tab{padding:10px 18px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s}
  .tab:hover{color:var(--text)}.tab.active{color:var(--qb);border-bottom-color:var(--qb)}
  .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:var(--blue-bg);color:var(--blue)}
  .mono{font-family:var(--mono)}.tr{text-align:right}.tg{color:var(--green)}.tr-c{color:var(--red)}.tm{color:var(--text2)}
  .loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--text3);font-size:13px;gap:10px}
  .spin{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--qb);border-radius:50%;animation:spin .6s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .empty{text-align:center;padding:32px;color:var(--text3);font-size:13px}
  .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}
  /* INVOICE MODAL */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
  .modal{background:#fff;border-radius:12px;width:100%;max-width:720px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
  .modal-header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:10}
  .modal-actions{padding:16px 20px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;position:sticky;bottom:0;background:#fff}
  /* VAT INVOICE */
  .inv-doc{padding:32px;font-family:var(--sans);color:#1a1d23}
  .inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
  .inv-company-name{font-size:22px;font-weight:700;color:var(--qb);margin-bottom:4px}
  .inv-company-detail{font-size:12px;color:var(--text2);line-height:1.6}
  .inv-title{font-size:28px;font-weight:700;color:var(--text3);text-align:right}
  .inv-meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;padding:20px;background:#fafbfc;border-radius:8px;border:1px solid var(--border)}
  .inv-meta-label{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
  .inv-meta-val{font-size:14px;font-weight:600}
  .inv-meta-val.green{color:var(--qb)}
  .inv-table{width:100%;border-collapse:collapse;margin-bottom:20px}
  .inv-table th{background:var(--qb);color:#fff;padding:10px 14px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;text-align:left}
  .inv-table th:last-child,.inv-table td:last-child{text-align:right}
  .inv-table td{padding:10px 14px;font-size:13px;border-bottom:1px solid var(--border)}
  .inv-table tr:last-child td{border-bottom:none}
  .inv-table tr:nth-child(even) td{background:#fafbfc}
  .inv-totals{display:flex;justify-content:flex-end;margin-bottom:24px}
  .inv-totals-box{width:280px}
  .inv-totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
  .inv-totals-row.divider{border-top:1px solid var(--border);margin-top:4px;padding-top:10px}
  .inv-totals-row.balance{border-top:2px solid var(--text);margin-top:4px;padding-top:10px;font-size:16px;font-weight:700}
  .inv-footer{border-top:1px solid var(--border);padding-top:16px;font-size:12px;color:var(--text2);line-height:1.7}
  .inv-bank{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px;background:#fafbfc;padding:12px;border-radius:8px;border:1px solid var(--border)}
  .inv-bank-label{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
  .inv-bank-val{font-size:13px;font-weight:600}
  /* LINE ITEMS IN FORM */
  .il-line{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 28px;gap:8px;align-items:center;padding:8px 16px;border-bottom:1px solid var(--border)}
  .il-header{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 28px;gap:8px;padding:8px 16px;background:#fafbfc;border-bottom:1px solid var(--border)}
  @media(max-width:768px){
    .tnav-search{display:none}.mnav{overflow-x:auto}
    .content{padding:16px 14px 80px}.kgrid{grid-template-columns:1fr 1fr;gap:12px}
    .is{grid-template-columns:1fr}.g2{grid-template-columns:1fr}.g3{grid-template-columns:1fr}
    .g4{grid-template-columns:1fr 1fr}.hm{display:none}.kv{font-size:17px}
    .fg{grid-template-columns:1fr}.fg3{grid-template-columns:1fr}
    .il-line{grid-template-columns:2fr 1fr 1fr 1fr 1fr 28px;font-size:11px}
    .modal{max-height:95vh}.inv-header{flex-direction:column;gap:12px}
    .inv-meta{grid-template-columns:1fr}
    .inv-bank{grid-template-columns:1fr}
    .il-header span,.il-header{font-size:10px}
  }
  .mnav-mob{display:none;position:fixed;bottom:0;left:0;right:0;z-index:100;background:#fff;border-top:1px solid var(--border);padding:6px 0 env(safe-area-inset-bottom,6px);box-shadow:0 -4px 12px rgba(0,0,0,.08)}
  .mnav-mob-inner{display:flex}
  .mnav-mob-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 0;cursor:pointer;color:var(--text3);flex:1}
  .mnav-mob-item.active{color:var(--qb)}
  .mnav-mob-icon{font-size:19px}
  .mnav-mob-lbl{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
  @media(max-width:768px){.mnav-mob{display:block!important}}
  @media(min-width:769px){.mnav-mob{display:none!important}}
  ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
  @media print{
    .modal-header,.modal-actions,.tnav,.mnav,.mnav-mob{display:none!important}
    .modal-overlay{position:static!important;background:none!important;padding:0!important}
    .modal{box-shadow:none!important;border-radius:0!important;max-height:none!important}
    body{background:#fff!important}
  }
`;

// ── AUTH ──────────────────────────────────────────────────────────────────────
function Auth({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [f, setF] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setLoading(true); setErr("");
    try {
      const d = mode === "signin" ? await sb.signIn(f.email, f.password) : await sb.signUp(f.email, f.password, f.full_name);
      if (d.access_token) onAuth({ token: d.access_token, user: d.user });
      else setErr(d.msg || d.error_description || "Authentication failed.");
    } catch { setErr("Network error. Please try again."); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <div style={{ width: 420, background: "var(--qb-dark)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 48, color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>Smart Accounting for Your Business</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.6 }}>VAT invoices, stock management, customers and more.</p>
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            {["VAT Invoice PDF & WhatsApp share", "Customer & Supplier management", "Stock & Inventory tracking", "Purchase Orders & Credit Notes"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,.85)" }}>
                <div style={{ width: 7, height: 7, background: "var(--qb)", borderRadius: "50%", flexShrink: 0 }} />{f}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, background: "var(--qb)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 18 }}>L</div>
            <div><div style={{ fontSize: 22, fontWeight: 700 }}>LedgerOS</div><div style={{ fontSize: 12, color: "var(--text3)" }}>Business Accounting</div></div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{mode === "signin" ? "Welcome back" : "Create account"}</div>
          <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 24 }}>{mode === "signin" ? "Sign in to your dashboard" : "Join your team on LedgerOS"}</div>
          {err && <div style={{ background: "var(--red-bg)", border: "1px solid var(--red-lt)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--red)", marginBottom: 14 }}>{err}</div>}
          {mode === "signup" && <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Full Name</label><input style={{ width: "100%", background: "#fff", border: "1.5px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "var(--text)", fontFamily: "var(--sans)", outline: "none" }} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="Jane Smith" /></div>}
          <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Email</label><input type="email" style={{ width: "100%", background: "#fff", border: "1.5px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "var(--text)", fontFamily: "var(--sans)", outline: "none" }} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="you@company.com" /></div>
          <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Password</label><input type="password" style={{ width: "100%", background: "#fff", border: "1.5px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "var(--text)", fontFamily: "var(--sans)", outline: "none" }} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && go()} /></div>
          <button style={{ width: "100%", padding: 12, background: "var(--qb)", color: "#fff", fontWeight: 600, fontSize: 15, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "var(--sans)" }} onClick={go} disabled={loading}>{loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}</button>
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "var(--text2)" }}>{mode === "signin" ? <>No account? <span style={{ color: "var(--qb)", cursor: "pointer", fontWeight: 500 }} onClick={() => setMode("signup")}>Sign up free</span></> : <>Have account? <span style={{ color: "var(--qb)", cursor: "pointer", fontWeight: 500 }} onClick={() => setMode("signin")}>Sign in</span></>}</div>
        </div>
      </div>
    </div>
  );
}

// ── VAT INVOICE MODAL ─────────────────────────────────────────────────────────
function InvoiceModal({ invoice, onClose }) {
  const invRef = useRef();

  const lines = invoice.lines || [
    { description: invoice.description || "Services rendered", qty: 1, unit_price: invoice.amount || 0, vat_rate: 20 }
  ];

  const subtotal = lines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
  const vatTotal = lines.reduce((s, l) => s + (l.qty * l.unit_price * (l.vat_rate / 100)), 0);
  const total = subtotal + vatTotal;

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `*VAT Invoice from ${COMPANY.name}*\n\n` +
      `Invoice: *${invoice.invoice_number}*\n` +
      `Customer: ${invoice.customer}\n` +
      `Date: ${fmtDate(invoice.invoice_date)}\n` +
      `Due: ${fmtDate(invoice.due_date)}\n\n` +
      `Subtotal: ${fmt(subtotal)}\n` +
      `VAT: ${fmt(vatTotal)}\n` +
      `*Total Due: ${fmt(total)}*\n\n` +
      `Please make payment to:\n` +
      `Bank: ${COMPANY.bankName}\n` +
      `Sort Code: ${COMPANY.sortCode}\n` +
      `Account: ${COMPANY.accountNumber}\n\n` +
      `Thank you for your business!`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} from ${COMPANY.name}`);
    const body = encodeURIComponent(
      `Dear ${invoice.customer},\n\nPlease find below your invoice details.\n\n` +
      `Invoice Number: ${invoice.invoice_number}\n` +
      `Invoice Date: ${fmtDate(invoice.invoice_date)}\n` +
      `Due Date: ${fmtDate(invoice.due_date)}\n\n` +
      `Subtotal: ${fmt(subtotal)}\n` +
      `VAT (${lines[0]?.vat_rate || 20}%): ${fmt(vatTotal)}\n` +
      `Total Due: ${fmt(total)}\n\n` +
      `Payment Details:\nBank: ${COMPANY.bankName}\nSort Code: ${COMPANY.sortCode}\nAccount Number: ${COMPANY.accountNumber}\n\n` +
      `If you have any questions, please contact us at ${COMPANY.email} or ${COMPANY.phone}.\n\n` +
      `Thank you for your business.\n\n${COMPANY.name}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: 15 }}>VAT Invoice — {invoice.invoice_number}</div>
          <button className="btn bo bsm" onClick={onClose}>✕ Close</button>
        </div>

        <div className="inv-doc" ref={invRef} id="invoice-print">
          {/* Header */}
          <div className="inv-header">
            <div>
              <div className="inv-company-name">{COMPANY.name}</div>
              <div className="inv-company-detail">
                {COMPANY.address}<br />
                {COMPANY.city}, {COMPANY.postcode}<br />
                Tel: {COMPANY.phone}<br />
                Email: {COMPANY.email}<br />
                VAT Reg: {COMPANY.vatNumber}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="inv-title">VAT INVOICE</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "var(--text2)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{invoice.invoice_number}</div>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="inv-meta">
            <div>
              <div className="inv-meta-label">Invoice to</div>
              <div className="inv-meta-val" style={{ fontSize: 16 }}>{invoice.customer}</div>
              {invoice.customer_address && <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>{invoice.customer_address}</div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><div className="inv-meta-label">Invoice #</div><div className="inv-meta-val mono">{invoice.invoice_number}</div></div>
              <div><div className="inv-meta-label">Date</div><div className="inv-meta-val">{fmtDate(invoice.invoice_date)}</div></div>
              <div><div className="inv-meta-label">Due Date</div><div className="inv-meta-val">{fmtDate(invoice.due_date)}</div></div>
              <div><div className="inv-meta-label">Terms</div><div className="inv-meta-val">Due on receipt</div></div>
            </div>
          </div>

          {/* Line Items */}
          <table className="inv-table">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Description</th>
                <th>VAT</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Rate</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{l.description}</td>
                  <td><span className="tag">{l.vat_rate === 0 ? "Exempt" : `${l.vat_rate}% S`}</span></td>
                  <td style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{l.qty}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{fmt(l.unit_price)}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 600 }}>{fmt(l.qty * l.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="inv-totals">
            <div className="inv-totals-box">
              <div className="inv-totals-row"><span style={{ color: "var(--text2)" }}>Subtotal</span><span className="mono">{fmt(subtotal)}</span></div>
              <div className="inv-totals-row"><span style={{ color: "var(--text2)" }}>VAT Total</span><span className="mono">{fmt(vatTotal)}</span></div>
              <div className="inv-totals-row divider"><span>Total</span><span className="mono">{fmt(total)}</span></div>
              <div className="inv-totals-row balance"><span>Balance Due</span><span className="mono" style={{ color: "var(--qb)" }}>{fmt(total)}</span></div>
            </div>
          </div>

          {/* Footer */}
          <div className="inv-footer">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Payment Details</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>Please make payment by bank transfer using the invoice number as reference.</div>
            <div className="inv-bank">
              <div><div className="inv-bank-label">Bank</div><div className="inv-bank-val">{COMPANY.bankName}</div></div>
              <div><div className="inv-bank-label">Sort Code</div><div className="inv-bank-val mono">{COMPANY.sortCode}</div></div>
              <div><div className="inv-bank-label">Account Number</div><div className="inv-bank-val mono">{COMPANY.accountNumber}</div></div>
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: "var(--text3)" }}>
              All goods delivered shall remain our property until the purchase price, including all additional costs, has been paid in full.
              This invoice is subject to VAT. VAT Reg No: {COMPANY.vatNumber}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn bwa" onClick={handleWhatsApp}>📱 WhatsApp</button>
          <button className="btn bo" onClick={handleEmail}>📧 Email</button>
          <button className="btn bo" onClick={handlePrint}>🖨️ Print / PDF</button>
        </div>
      </div>
    </div>
  );
}

// ── INVOICE FORM WITH LINE ITEMS ──────────────────────────────────────────────
function InvoiceForm({ contacts, products, token, userId, onSave, onClose }) {
  const [f, setF] = useState({ customer: "", contact_id: "", invoice_date: today(), due_date: "", status: "pending", notes: "" });
  const [lines, setLines] = useState([{ description: "", qty: 1, unit_price: "", vat_rate: 20 }]);
  const [saving, setSaving] = useState(false);
  const customers = contacts.filter(c => c.type === "customer" || c.type === "both");

  const updateLine = (i, field, val) => {
    const next = [...lines];
    if (field === "product_id") {
      const p = products.find(x => x.id === val);
      next[i] = { ...next[i], product_id: val, description: p?.name || "", unit_price: p?.sale_price || "", vat_rate: p?.vat_rate ?? 20 };
    } else next[i] = { ...next[i], [field]: val };
    setLines(next);
  };

  const subtotal = lines.reduce((s, l) => s + ((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0)), 0);
  const vatTotal = lines.reduce((s, l) => s + ((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0) * ((parseFloat(l.vat_rate) || 0) / 100)), 0);
  const total = subtotal + vatTotal;

  const save = async () => {
    if (!f.customer) return; setSaving(true);
    const inv = await sb.post(token, "invoices", { ...f, amount: total, subtotal, vat_total: vatTotal, invoice_number: `INV-${Date.now()}`, created_by: userId });
    if (inv[0]) { onSave({ ...inv[0], lines }); }
    setSaving(false); onClose();
  };

  return (
    <div className="card">
      <div className="ch"><div className="ct">New VAT Invoice</div><button className="btn bo bsm" onClick={onClose}>Cancel</button></div>
      <div className="fg">
        <div className="fgrp"><label>Customer *</label>
          <select value={f.customer} onChange={e => { const c = customers.find(x => x.name === e.target.value); setF({ ...f, customer: e.target.value, contact_id: c?.id || "" }); }}>
            <option value="">Select customer...</option>
            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="fgrp"><label>Status</label><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
        <div className="fgrp"><label>Invoice Date</label><input type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
        <div className="fgrp"><label>Due Date</label><input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} /></div>
        <div className="fgrp full"><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Optional notes..." /></div>
      </div>

      {/* Line Items */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="il-header">
          {["Description / Product", "Qty", "Unit Price", "VAT %", "Total", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" }}>{h}</span>)}
        </div>
        {lines.map((l, i) => (
          <div key={i} className="il-line">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <select style={{ background: "#fff", border: "1px solid var(--border2)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--text)", fontFamily: "var(--sans)", outline: "none" }} onChange={e => updateLine(i, "product_id", e.target.value)} defaultValue="">
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input style={{ background: "#fff", border: "1px solid var(--border2)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--text)", fontFamily: "var(--sans)", outline: "none" }} placeholder="Or type description..." value={l.description} onChange={e => updateLine(i, "description", e.target.value)} />
            </div>
            <input type="number" className="mono" style={{ background: "#fff", border: "1px solid var(--border2)", borderRadius: 6, padding: "5px 8px", fontSize: 12, outline: "none", width: "100%" }} value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} />
            <input type="number" className="mono" style={{ background: "#fff", border: "1px solid var(--border2)", borderRadius: 6, padding: "5px 8px", fontSize: 12, outline: "none", width: "100%" }} placeholder="0.00" value={l.unit_price} onChange={e => updateLine(i, "unit_price", e.target.value)} />
            <select style={{ background: "#fff", border: "1px solid var(--border2)", borderRadius: 6, padding: "5px 8px", fontSize: 12, outline: "none", width: "100%" }} value={l.vat_rate} onChange={e => updateLine(i, "vat_rate", e.target.value)}>
              <option value="20">20%</option><option value="5">5%</option><option value="0">Exempt</option>
            </select>
            <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{fmt((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0))}</span>
            <button className="ib" onClick={() => lines.length > 1 && setLines(lines.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfc", borderTop: "1px solid var(--border)" }}>
          <button className="btn bo bsm" onClick={() => setLines([...lines, { description: "", qty: 1, unit_price: "", vat_rate: 20 }])}>+ Add Line</button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>Subtotal: {fmt(subtotal)} &nbsp;|&nbsp; VAT: {fmt(vatTotal)}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Total: {fmt(total)}</div>
          </div>
        </div>
      </div>
      <div className="ff">
        <button className="btn bo" onClick={onClose}>Cancel</button>
        <button className="btn bp" onClick={save} disabled={saving || !f.customer}>{saving ? "Saving..." : "Create Invoice"}</button>
      </div>
    </div>
  );
}

// ── INVOICES PAGE ─────────────────────────────────────────────────────────────
function Invoices({ invoices, setInvoices, contacts, products, token, userId }) {
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);

  const markPaid = async (id) => { await sb.patch(token, "invoices", id, { status: "paid" }); setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid" } : i)); };
  const totals = { paid: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0), pending: invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0), overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0) };

  return (
    <div>
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}
      <div className="ph"><div className="pt">Invoices</div><button className="btn bp" onClick={() => setShowForm(!showForm)}>➕ New VAT Invoice</button></div>
      <div className="g3">
        <div className="kpi"><div className="kl">Paid</div><div className="kv tg">{fmt(totals.paid)}</div></div>
        <div className="kpi"><div className="kl">Pending</div><div className="kv" style={{ color: "var(--amber)" }}>{fmt(totals.pending)}</div></div>
        <div className="kpi"><div className="kl">Overdue</div><div className="kv tr-c">{fmt(totals.overdue)}</div></div>
      </div>
      {showForm && <InvoiceForm contacts={contacts} products={products} token={token} userId={userId} onSave={inv => setInvoices(prev => [inv, ...prev])} onClose={() => setShowForm(false)} />}
      <div className="card">
        <div className="tw"><table>
          <thead><tr><th>Invoice #</th><th>Customer</th><th className="hm">Date</th><th className="hm">Due</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td className="mono" style={{ color: "var(--qb)", fontSize: 12 }}>{inv.invoice_number}</td>
                <td style={{ fontWeight: 500 }}>{inv.customer}</td>
                <td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(inv.invoice_date)}</td>
                <td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(inv.due_date)}</td>
                <td className="mono">{fmt(inv.amount)}</td>
                <td><span className={`badge ${inv.status === "paid" ? "bg-green" : inv.status === "overdue" ? "bg-red" : inv.status === "pending" ? "bg-amber" : "bg-gray"}`}>{inv.status}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="btn bo bsm" onClick={() => setViewInvoice(inv)}>🧾 View</button>
                    {inv.status !== "paid" && <button className="btn bp bsm" onClick={() => markPaid(inv.id)}>Mark paid</button>}
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><td colSpan={7} className="empty">No invoices yet — create your first VAT invoice!</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ accounts, invoices, contacts, products, profile, setPage }) {
  const revenue = accounts.filter(a => a.type === "Revenue").reduce((s, a) => s + a.balance, 0);
  const expenses = accounts.filter(a => a.type === "Expense").reduce((s, a) => s + a.balance, 0);
  const cash = accounts.find(a => a.code === "1000")?.balance || 0;
  const net = revenue - expenses;
  const unpaid = invoices.filter(i => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const lowStock = products.filter(p => p.stock_qty <= p.reorder_level);
  const name = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div>
      <div className="pgreet">{greeting}, {name}! 👋</div>
      <div className="psub">Here's your business overview for today.</div>
      <div className="qa">
        <span className="qa-lbl">Quick actions:</span>
        {[["➕ New Invoice", "invoices"], ["👥 Add Customer", "contacts"], ["📦 Add Product", "inventory"], ["🛒 Purchase Order", "purchases"]].map(([l, p]) => <button key={l} className="qa-btn" onClick={() => setPage(p)}>{l}</button>)}
      </div>
      <div className="kgrid">
        <div className="kpi"><div className="ki">💰</div><div className="kl">Revenue</div><div className="kv" style={{ color: "var(--green)" }}>{fmt(revenue)}</div><div className="ks">Year to date</div></div>
        <div className="kpi"><div className="ki">📤</div><div className="kl">Expenses</div><div className="kv" style={{ color: "var(--red)" }}>{fmt(expenses)}</div><div className="ks">Year to date</div></div>
        <div className="kpi"><div className="ki">📈</div><div className="kl">Net Profit</div><div className="kv" style={{ color: net >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(net)}</div><div className="ks">{net >= 0 ? "↑ Profitable" : "↓ Loss"}</div></div>
        <div className="kpi"><div className="ki">🏦</div><div className="kl">Cash Balance</div><div className="kv">{fmt(cash)}</div><div className="ks">Current balance</div></div>
      </div>
      <div className="g3" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kl">Customers</div><div className="kv">{contacts.filter(c => c.type === "customer" || c.type === "both").length}</div><div className="ks">Total active</div></div>
        <div className="kpi"><div className="kl">Suppliers</div><div className="kv">{contacts.filter(c => c.type === "supplier" || c.type === "both").length}</div><div className="ks">Total active</div></div>
        <div className="kpi"><div className="kl">Low Stock</div><div className="kv" style={{ color: lowStock.length > 0 ? "var(--red)" : "var(--green)" }}>{lowStock.length}</div><div className="ks">{lowStock.length > 0 ? "Need reordering" : "All stocked"}</div></div>
      </div>
      <div className="is">
        <div className="ic"><div className="ic-lbl">Invoices owed to you</div><div className="ic-total" style={{ color: "var(--green)" }}>{fmt(unpaid)}</div><div className="ic-bar"><div className="ic-seg" style={{ width: `${overdue / (unpaid || 1) * 100}%`, background: "var(--red)" }} /><div className="ic-seg" style={{ width: `${(unpaid - overdue) / (unpaid || 1) * 100}%`, background: "var(--green)" }} /></div><div className="ic-bd"><div><div className="ic-bd-lbl" style={{ color: "var(--red)" }}>● Overdue</div><div className="ic-bd-val" style={{ color: "var(--red)" }}>{fmt(overdue)}</div></div><div><div className="ic-bd-lbl" style={{ color: "var(--green)" }}>● Not yet due</div><div className="ic-bd-val" style={{ color: "var(--green)" }}>{fmt(unpaid - overdue)}</div></div></div></div>
        <div className="ic"><div className="ic-lbl">Paid invoices</div><div className="ic-total" style={{ color: "var(--blue)" }}>{fmt(paid)}</div><div className="ic-bar"><div className="ic-seg" style={{ width: "100%", background: "var(--blue)" }} /></div><div className="ic-bd"><div><div className="ic-bd-lbl">Invoices paid</div><div className="ic-bd-val">{invoices.filter(i => i.status === "paid").length}</div></div><div><div className="ic-bd-lbl">Average value</div><div className="ic-bd-val">{fmt(paid / (invoices.filter(i => i.status === "paid").length || 1))}</div></div></div></div>
      </div>
      {lowStock.length > 0 && <div className="card"><div className="ch"><div className="ct">⚠️ Low Stock Alert</div><button className="btn bo bsm" onClick={() => setPage("inventory")}>View inventory</button></div><div className="tw"><table><thead><tr><th>Product</th><th>In Stock</th><th>Reorder Level</th></tr></thead><tbody>{lowStock.slice(0, 5).map(p => <tr key={p.id}><td style={{ fontWeight: 500 }}>{p.name}</td><td className="mono">{p.stock_qty} {p.unit}</td><td className="mono">{p.reorder_level} {p.unit}</td></tr>)}</tbody></table></div></div>}
    </div>
  );
}

// ── CONTACTS ──────────────────────────────────────────────────────────────────
function Contacts({ contacts, setContacts, token, userId }) {
  const [tab, setTab] = useState("customer");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "" });
  const filtered = contacts.filter(c => c.type === tab || c.type === "both");
  const save = async () => {
    if (!f.name) return; setSaving(true);
    const data = await sb.post(token, "contacts", { ...f, created_by: userId });
    if (data[0]) setContacts(prev => [data[0], ...prev]);
    setF({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "" });
    setShowForm(false); setSaving(false);
  };
  return (
    <div>
      <div className="ph"><div className="pt">Customers & Suppliers</div><button className="btn bp" onClick={() => { setShowForm(!showForm); setF({ ...f, type: tab }); }}>➕ Add {tab === "customer" ? "Customer" : "Supplier"}</button></div>
      <div className="tabs">{[["customer", "👥 Customers"], ["supplier", "🏭 Suppliers"]].map(([k, l]) => <div key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l} <span style={{ color: "var(--text3)", fontSize: 12 }}>({contacts.filter(c => c.type === k || c.type === "both").length})</span></div>)}</div>
      {showForm && <div className="card"><div className="ch"><div className="ct">New Contact</div></div><div className="fg"><div className="fgrp"><label>Type</label><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Both</option></select></div><div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Business name" /></div><div className="fgrp"><label>Email</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="email@example.com" /></div><div className="fgrp"><label>Phone</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+44..." /></div><div className="fgrp"><label>Address</label><input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></div><div className="fgrp"><label>City</label><input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></div><div className="fgrp"><label>Postcode</label><input value={f.postcode} onChange={e => setF({ ...f, postcode: e.target.value })} /></div><div className="fgrp"><label>VAT Number</label><input value={f.vat_number} onChange={e => setF({ ...f, vat_number: e.target.value })} placeholder="GB123456789" /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Contact"}</button></div></div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {filtered.map(c => <div key={c.id} className="contact-card"><div className="cc-avatar">{c.name[0].toUpperCase()}</div><div className="cc-name">{c.name}</div>{c.email && <div className="cc-detail">📧 {c.email}</div>}{c.phone && <div className="cc-detail">📞 {c.phone}</div>}{c.city && <div className="cc-detail">📍 {c.city}{c.postcode ? `, ${c.postcode}` : ""}</div>}{c.vat_number && <div style={{ marginTop: 8 }}><span className="tag">VAT: {c.vat_number}</span></div>}</div>)}
        {filtered.length === 0 && <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "var(--text3)" }}>No {tab}s yet</div>}
      </div>
    </div>
  );
}

// ── INVENTORY ─────────────────────────────────────────────────────────────────
function Inventory({ products, setProducts, token, userId }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
  const save = async () => {
    if (!f.name) return; setSaving(true);
    const data = await sb.post(token, "products", { ...f, cost_price: parseFloat(f.cost_price) || 0, sale_price: parseFloat(f.sale_price) || 0, vat_rate: parseFloat(f.vat_rate) || 20, stock_qty: parseFloat(f.stock_qty) || 0, reorder_level: parseFloat(f.reorder_level) || 0, created_by: userId });
    if (data[0]) setProducts(prev => [data[0], ...prev]);
    setF({ code: "", name: "", description: "", category: "", unit: "unit", cost_price: "", sale_price: "", vat_rate: "20", stock_qty: "", reorder_level: "" });
    setShowForm(false); setSaving(false);
  };
  const lowStock = products.filter(p => p.stock_qty <= p.reorder_level);
  return (
    <div>
      <div className="ph"><div className="pt">Stock & Inventory</div><button className="btn bp" onClick={() => setShowForm(!showForm)}>➕ Add Product</button></div>
      <div className="g4" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kl">Total Products</div><div className="kv">{products.length}</div></div>
        <div className="kpi"><div className="kl">Low Stock</div><div className="kv" style={{ color: lowStock.length > 0 ? "var(--red)" : "var(--green)" }}>{lowStock.length}</div></div>
        <div className="kpi"><div className="kl">Stock Value</div><div className="kv">{fmt(products.reduce((s, p) => s + p.stock_qty * p.cost_price, 0))}</div></div>
        <div className="kpi"><div className="kl">Retail Value</div><div className="kv">{fmt(products.reduce((s, p) => s + p.stock_qty * p.sale_price, 0))}</div></div>
      </div>
      {showForm && <div className="card"><div className="ch"><div className="ct">New Product</div></div><div className="fg3"><div className="fgrp"><label>Code</label><input value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="SKU001" /></div><div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Product name" /></div><div className="fgrp"><label>Category</label><input value={f.category} onChange={e => setF({ ...f, category: e.target.value })} placeholder="e.g. Vapes, Pods..." /></div><div className="fgrp"><label>Unit</label><select value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })}><option>unit</option><option>pack</option><option>box</option><option>kg</option><option>litre</option></select></div><div className="fgrp"><label>Cost Price (£)</label><input type="number" value={f.cost_price} onChange={e => setF({ ...f, cost_price: e.target.value })} placeholder="0.00" /></div><div className="fgrp"><label>Sale Price (£)</label><input type="number" value={f.sale_price} onChange={e => setF({ ...f, sale_price: e.target.value })} placeholder="0.00" /></div><div className="fgrp"><label>VAT Rate</label><select value={f.vat_rate} onChange={e => setF({ ...f, vat_rate: e.target.value })}><option value="20">20% Standard</option><option value="5">5% Reduced</option><option value="0">0% Exempt</option></select></div><div className="fgrp"><label>Stock Qty</label><input type="number" value={f.stock_qty} onChange={e => setF({ ...f, stock_qty: e.target.value })} placeholder="0" /></div><div className="fgrp"><label>Reorder Level</label><input type="number" value={f.reorder_level} onChange={e => setF({ ...f, reorder_level: e.target.value })} placeholder="0" /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Product"}</button></div></div>}
      <div className="card"><div className="tw"><table><thead><tr><th>Code</th><th>Product</th><th>Category</th><th className="hm">Cost</th><th>Sale Price</th><th>VAT</th><th>In Stock</th><th>Status</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td className="mono tm" style={{ fontSize: 12 }}>{p.code || "—"}</td><td style={{ fontWeight: 500 }}>{p.name}</td><td className="tm">{p.category || "—"}</td><td className="mono hm">{fmt(p.cost_price)}</td><td className="mono">{fmt(p.sale_price)}</td><td><span className="tag">{p.vat_rate}%</span></td><td className="mono">{p.stock_qty} {p.unit}</td><td><span className={`badge ${p.stock_qty <= p.reorder_level ? "bg-red" : p.stock_qty <= p.reorder_level * 2 ? "bg-amber" : "bg-green"}`}>{p.stock_qty <= p.reorder_level ? "Low Stock" : p.stock_qty <= p.reorder_level * 2 ? "Running Low" : "In Stock"}</span></td></tr>)}{products.length === 0 && <tr><td colSpan={8} className="empty">No products yet</td></tr>}</tbody></table></div></div>
    </div>
  );
}

// ── PURCHASES ─────────────────────────────────────────────────────────────────
function Purchases({ contacts, products, token, userId }) {
  const [pos, setPOs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState([{ product_id: "", product_name: "", qty: "", unit_cost: "", vat_rate: "20" }]);
  const [f, setF] = useState({ supplier_id: "", order_date: today(), expected_date: "", notes: "" });
  useEffect(() => { sb.get(token, "purchase_orders", "order=created_at.desc").then(d => Array.isArray(d) && setPOs(d)); }, [token]);
  const suppliers = contacts.filter(c => c.type === "supplier" || c.type === "both");
  const updateLine = (i, field, val) => { const next = [...lines]; if (field === "product_id") { const p = products.find(x => x.id === val); next[i] = { ...next[i], product_id: val, product_name: p?.name || "", unit_cost: p?.cost_price || "", vat_rate: String(p?.vat_rate || 20) }; } else next[i] = { ...next[i], [field]: val }; setLines(next); };
  const lineTotal = (l) => (parseFloat(l.qty) || 0) * (parseFloat(l.unit_cost) || 0);
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);
  const vatTotal = lines.reduce((s, l) => s + lineTotal(l) * (parseFloat(l.vat_rate) || 0) / 100, 0);
  const save = async () => {
    if (!f.supplier_id) return; setSaving(true);
    const num = `PO-${String(pos.length + 1).padStart(3, "0")}`;
    const sup = suppliers.find(s => s.id === f.supplier_id);
    const po = await sb.post(token, "purchase_orders", { ...f, po_number: num, supplier_name: sup?.name, total: total + vatTotal, created_by: userId });
    if (po[0]) { for (const l of lines) if (l.product_id) await sb.post(token, "purchase_order_lines", { po_id: po[0].id, product_id: l.product_id, product_name: l.product_name, qty: parseFloat(l.qty) || 0, unit_cost: parseFloat(l.unit_cost) || 0, vat_rate: parseFloat(l.vat_rate) || 0, total: lineTotal(l) }); setPOs(prev => [po[0], ...prev]); }
    setLines([{ product_id: "", product_name: "", qty: "", unit_cost: "", vat_rate: "20" }]);
    setF({ supplier_id: "", order_date: today(), expected_date: "", notes: "" });
    setShowForm(false); setSaving(false);
  };
  const updateStatus = async (id, status) => { await sb.patch(token, "purchase_orders", id, { status }); setPOs(prev => prev.map(p => p.id === id ? { ...p, status } : p)); };
  return (
    <div>
      <div className="ph"><div className="pt">Purchase Orders</div><button className="btn bp" onClick={() => setShowForm(!showForm)}>➕ New PO</button></div>
      {showForm && <div className="card"><div className="ch"><div className="ct">New Purchase Order</div></div><div className="fg"><div className="fgrp"><label>Supplier *</label><select value={f.supplier_id} onChange={e => setF({ ...f, supplier_id: e.target.value })}><option value="">Select supplier...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="fgrp"><label>Order Date</label><input type="date" value={f.order_date} onChange={e => setF({ ...f, order_date: e.target.value })} /></div><div className="fgrp"><label>Expected Delivery</label><input type="date" value={f.expected_date} onChange={e => setF({ ...f, expected_date: e.target.value })} /></div><div className="fgrp"><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Any notes..." /></div></div><div style={{ borderTop: "1px solid var(--border)" }}><div className="po-line" style={{ background: "#fafbfc" }}>{["Product", "Qty", "Unit Cost", "VAT %", "Total", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" }}>{h}</span>)}</div>{lines.map((l, i) => <div key={i} className="po-line"><select value={l.product_id} onChange={e => updateLine(i, "product_id", e.target.value)}><option value="">Select product...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" className="mono" placeholder="0" value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} /><input type="number" className="mono" placeholder="0.00" value={l.unit_cost} onChange={e => updateLine(i, "unit_cost", e.target.value)} /><select value={l.vat_rate} onChange={e => updateLine(i, "vat_rate", e.target.value)}><option value="20">20%</option><option value="5">5%</option><option value="0">0%</option></select><span className="mono" style={{ fontWeight: 600 }}>{fmt(lineTotal(l))}</span><button className="ib" onClick={() => lines.length > 1 && setLines(lines.filter((_, j) => j !== i))}>✕</button></div>)}<div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfc" }}><button className="btn bo bsm" onClick={() => setLines([...lines, { product_id: "", product_name: "", qty: "", unit_cost: "", vat_rate: "20" }])}>+ Add Line</button><div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>Subtotal: {fmt(total)} | VAT: {fmt(vatTotal)}</div><div style={{ fontSize: 16, fontWeight: 700 }}>Total: {fmt(total + vatTotal)}</div></div></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Create PO"}</button></div></div>}
      <div className="card"><div className="tw"><table><thead><tr><th>PO #</th><th>Supplier</th><th className="hm">Order Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pos.map(po => <tr key={po.id}><td className="mono" style={{ color: "var(--qb)", fontSize: 12 }}>{po.po_number}</td><td style={{ fontWeight: 500 }}>{po.supplier_name}</td><td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(po.order_date)}</td><td className="mono">{fmt(po.total)}</td><td><span className={`badge ${po.status === "received" ? "bg-green" : po.status === "sent" ? "bg-blue" : po.status === "cancelled" ? "bg-red" : "bg-gray"}`}>{po.status}</span></td><td>{po.status === "draft" && <button className="btn bo bsm" onClick={() => updateStatus(po.id, "sent")}>Mark Sent</button>}{po.status === "sent" && <button className="btn bp bsm" onClick={() => updateStatus(po.id, "received")}>Mark Received</button>}</td></tr>)}{pos.length === 0 && <tr><td colSpan={6} className="empty">No purchase orders yet</td></tr>}</tbody></table></div></div>
    </div>
  );
}

// ── CREDIT NOTES ──────────────────────────────────────────────────────────────
function CreditNotes({ contacts, invoices, token, userId }) {
  const [cns, setCNs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ customer_id: "", invoice_id: "", reason: "", amount: "", issue_date: today() });
  useEffect(() => { sb.get(token, "credit_notes", "order=created_at.desc").then(d => Array.isArray(d) && setCNs(d)); }, [token]);
  const customers = contacts.filter(c => c.type === "customer" || c.type === "both");
  const save = async () => {
    if (!f.customer_id || !f.amount) return; setSaving(true);
    const num = `CN-${String(cns.length + 1).padStart(3, "0")}`;
    const cust = customers.find(c => c.id === f.customer_id);
    const data = await sb.post(token, "credit_notes", { ...f, cn_number: num, customer_name: cust?.name, amount: parseFloat(f.amount), created_by: userId });
    if (data[0]) setCNs(prev => [data[0], ...prev]);
    setF({ customer_id: "", invoice_id: "", reason: "", amount: "", issue_date: today() });
    setShowForm(false); setSaving(false);
  };
  const updateStatus = async (id, status) => { await sb.patch(token, "credit_notes", id, { status }); setCNs(prev => prev.map(c => c.id === id ? { ...c, status } : c)); };
  return (
    <div>
      <div className="ph"><div className="pt">Credit Notes</div><button className="btn bp" onClick={() => setShowForm(!showForm)}>➕ New Credit Note</button></div>
      {showForm && <div className="card"><div className="ch"><div className="ct">New Credit Note</div></div><div className="fg"><div className="fgrp"><label>Customer *</label><select value={f.customer_id} onChange={e => setF({ ...f, customer_id: e.target.value })}><option value="">Select customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="fgrp"><label>Related Invoice</label><select value={f.invoice_id} onChange={e => setF({ ...f, invoice_id: e.target.value })}><option value="">Select invoice (optional)...</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {fmt(i.amount)}</option>)}</select></div><div className="fgrp"><label>Amount (£) *</label><input type="number" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} placeholder="0.00" /></div><div className="fgrp"><label>Issue Date</label><input type="date" value={f.issue_date} onChange={e => setF({ ...f, issue_date: e.target.value })} /></div><div className="fgrp full"><label>Reason *</label><input value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} placeholder="Reason for credit note..." /></div></div><div className="ff"><button className="btn bo" onClick={() => setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : "Issue Credit Note"}</button></div></div>}
      <div className="card"><div className="tw"><table><thead><tr><th>CN #</th><th>Customer</th><th className="hm">Date</th><th>Amount</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>{cns.map(cn => <tr key={cn.id}><td className="mono" style={{ color: "var(--purple)", fontSize: 12 }}>{cn.cn_number}</td><td style={{ fontWeight: 500 }}>{cn.customer_name}</td><td className="hm tm" style={{ fontSize: 12 }}>{fmtDate(cn.issue_date)}</td><td className="mono tr-c">{fmt(cn.amount)}</td><td className="tm">{cn.reason}</td><td><span className={`badge ${cn.status === "applied" ? "bg-green" : cn.status === "issued" ? "bg-blue" : "bg-gray"}`}>{cn.status}</span></td><td>{cn.status === "draft" && <button className="btn bo bsm" onClick={() => updateStatus(cn.id, "issued")}>Issue</button>}{cn.status === "issued" && <button className="btn bp bsm" onClick={() => updateStatus(cn.id, "applied")}>Apply</button>}</td></tr>)}{cns.length === 0 && <tr><td colSpan={7} className="empty">No credit notes yet</td></tr>}</tbody></table></div></div>
    </div>
  );
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
function Reports({ accounts }) {
  const revenue = accounts.filter(a => a.type === "Revenue");
  const expenses = accounts.filter(a => a.type === "Expense");
  const totalRev = revenue.reduce((s, a) => s + a.balance, 0);
  const totalExp = expenses.reduce((s, a) => s + a.balance, 0);
  const net = totalRev - totalExp;
  const [tab, setTab] = useState("pl");
  return (
    <div>
      <div className="pt" style={{ marginBottom: 20 }}>Financial Reports</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[["pl", "Profit & Loss"], ["bs", "Balance Sheet"]].map(([k, l]) => <button key={k} className={`btn ${tab === k ? "bp" : "bo"}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === "pl" && <div className="card"><div className="ch"><div className="ct">Profit & Loss</div><div className="cs">Year to date</div></div><div className="rs-title">Income</div>{revenue.map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tg">{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total Income</span><span className="mono tg">{fmt(totalRev)}</span></div><div style={{ height: 8 }} /><div className="rs-title">Expenses</div>{expenses.map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tr-c">{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total Expenses</span><span className="mono tr-c">{fmt(totalExp)}</span></div><div className="rrow total"><span>Net {net >= 0 ? "Profit" : "Loss"}</span><span className={`mono ${net >= 0 ? "tg" : "tr-c"}`}>{fmt(Math.abs(net))}</span></div></div>}
      {tab === "bs" && <div className="g2">{[["Assets & Liabilities", [["Asset", "tg"], ["Liability", "tr-c"]]], ["Equity", [["Equity", "tg"]]]].map(([title, groups]) => <div key={title} className="card"><div className="ch"><div className="ct">{title}</div></div>{groups.map(([type, cls]) => <span key={type}><div className="rs-title">{type}</div>{accounts.filter(a => a.type === type).map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className={`mono ${cls}`}>{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total {type}</span><span className={`mono ${cls}`}>{fmt(accounts.filter(a => a.type === type).reduce((s, a) => s + a.balance, 0))}</span></div></span>)}</div>)}</div>}
    </div>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Home", icon: "🏠" },
  { id: "invoices", label: "Invoices", icon: "🧾" },
  { id: "contacts", label: "Contacts", icon: "👥" },
  { id: "inventory", label: "Inventory", icon: "📦" },
  { id: "purchases", label: "Purchases", icon: "🛒" },
  { id: "credits", label: "Credits", icon: "📋" },
  { id: "reports", label: "Reports", icon: "📊" },
  { id: "analytics", label: "Analytics", icon: "📉" },
  { id: "import", label: "Import", icon: "📥" },
];

const MOBILE_NAV = [
  { id: "dashboard", label: "Home", icon: "🏠" },
  { id: "invoices", label: "Invoices", icon: "🧾" },
  { id: "contacts", label: "Contacts", icon: "👥" },
  { id: "inventory", label: "Stock", icon: "📦" },
  { id: "analytics", label: "Analytics", icon: "📉" },
];

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth) return; setLoading(true);
    Promise.all([
      sb.get(auth.token, "accounts", "order=code.asc"),
      sb.get(auth.token, "invoices", "order=created_at.desc"),
      sb.get(auth.token, "contacts", "order=name.asc"),
      sb.get(auth.token, "products", "order=name.asc"),
      sb.get(auth.token, "profiles", `id=eq.${auth.user.id}`),
    ]).then(([accs, invs, cnts, prods, profs]) => {
      if (Array.isArray(accs)) setAccounts(accs);
      if (Array.isArray(invs)) setInvoices(invs);
      if (Array.isArray(cnts)) setContacts(cnts);
      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(profs) && profs[0]) setProfile(profs[0]);
      setLoading(false);
    });
  }, [auth]);

  const signOut = async () => { await sb.signOut(auth.token); setAuth(null); };
  const initials = (profile?.full_name || auth?.user?.email || "U")[0]?.toUpperCase();

  if (!auth) return <><style>{CSS}</style><Auth onAuth={setAuth} /></>;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <nav className="tnav">
          <div className="tnav-brand"><div className="tnav-logo">L</div><div><div className="tnav-name">LedgerOS</div><div className="tnav-co">Business Accounting</div></div></div>
          <div className="tnav-search"><span className="si">🔍</span><input placeholder="Search..." /></div>
          <div className="tnav-right">
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{profile?.role?.toUpperCase()}</span>
            <button className="tnav-btn" onClick={signOut}>Sign out</button>
            <div className="tnav-av">{initials}</div>
          </div>
        </nav>
        <nav className="mnav">
          {NAV.map(n => <div key={n.id} className={`mnav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}><span className="mnav-icon">{n.icon}</span><span>{n.label}</span></div>)}
        </nav>
        <div className="content">
          {loading ? <div className="loading"><div className="spin" />Loading your data...</div> : <>
            {page === "dashboard" && <Dashboard accounts={accounts} invoices={invoices} contacts={contacts} products={products} profile={profile} setPage={setPage} />}
            {page === "invoices" && <Invoices invoices={invoices} setInvoices={setInvoices} contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
            {page === "contacts" && <Contacts contacts={contacts} setContacts={setContacts} token={auth.token} userId={auth.user.id} />}
            {page === "inventory" && <Inventory products={products} setProducts={setProducts} token={auth.token} userId={auth.user.id} />}
            {page === "purchases" && <Purchases contacts={contacts} products={products} token={auth.token} userId={auth.user.id} />}
            {page === "credits" && <CreditNotes contacts={contacts} invoices={invoices} token={auth.token} userId={auth.user.id} />}
            {page === "reports" && <Reports accounts={accounts} />}
            {page === "analytics" && <Analytics invoices={invoices} products={products} contacts={contacts} />}
            {page === "import" && <CSVImport token={auth.token} contacts={contacts} setContacts={setContacts} products={products} setProducts={setProducts} />}
          </>}
        </div>
        <nav className="mnav-mob">
          <div className="mnav-mob-inner">
            {MOBILE_NAV.map(n => <div key={n.id} className={`mnav-mob-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}><span className="mnav-mob-icon">{n.icon}</span><span className="mnav-mob-lbl">{n.label}</span></div>)}
          </div>
        </nav>
      </div>
    </>
  );
}
