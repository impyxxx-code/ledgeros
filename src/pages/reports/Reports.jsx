import React, { useState } from "react";
import { fmt } from "../../lib/utils.js";

// ── REPORTS ───────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Reports                                                    │
// │ Reports router — delegates to AdminReports                 │
// └────────────────────────────────────────────────────────────┘
export function Reports({ accounts }) {
  const revenue = accounts.filter(a => a.type==="Revenue");
  const expenses = accounts.filter(a => a.type==="Expense");
  const totalRev = revenue.reduce((s,a) => s+a.balance,0);
  const totalExp = expenses.reduce((s,a) => s+a.balance,0);
  const net = totalRev-totalExp;
  const [tab, setTab] = useState("pl");
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(165,180,252,.8)", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />Finance</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Financial <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Reports</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Profit & Loss and Balance Sheet</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Total Income",val:fmt(totalRev),sub:"revenue accounts",accent:"#16a34a"},{label:"Total Expenses",val:fmt(totalExp),sub:"expense accounts",accent:"#dc2626"},{label:"Net Profit",val:fmt(Math.abs(net)),sub:net>=0?"profit":"loss",accent:net>=0?"#16a34a":"#dc2626"},{label:"Accounts",val:accounts.length,sub:"chart of accounts",accent:"#2563eb"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:20}}>{[["pl","Profit & Loss"],["bs","Balance Sheet"]].map(([k,l]) => <button key={k} className={"btn "+(tab===k?"bp":"bo")} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab==="pl"&&<div className="card"><div className="ch"><div className="ct">Profit & Loss Statement</div><div className="cs">Year to date</div></div><div className="rs-title">Income</div>{revenue.map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tg">{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total Income</span><span className="mono tg">{fmt(totalRev)}</span></div><div style={{height:12}}/><div className="rs-title">Expenses</div>{expenses.map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className="mono tr-c">{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total Expenses</span><span className="mono tr-c">{fmt(totalExp)}</span></div><div className="rrow total"><span>Net {net>=0?"Profit":"Loss"}</span><span className={"mono "+(net>=0?"tg":"tr-c")}>{fmt(Math.abs(net))}</span></div></div>}
      {tab==="bs"&&<div className="g2">{[["Assets & Liabilities",[["Asset","tg"],["Liability","tr-c"]]],["Equity",[["Equity","tg"]]]].map(([title,groups]) => <div key={title} className="card"><div className="ch"><div className="ct">{title}</div></div>{groups.map(([type,cls]) => <span key={type}><div className="rs-title">{type}</div>{accounts.filter(a => a.type===type).map(a => <div key={a.id} className="rrow indent"><span>{a.name}</span><span className={"mono "+cls}>{fmt(a.balance)}</span></div>)}<div className="rrow subtotal"><span>Total {type}</span><span className={"mono "+cls}>{fmt(accounts.filter(a => a.type===type).reduce((s,a) => s+a.balance,0))}</span></div></span>)}</div>)}</div>}
    </div>
  );
}
