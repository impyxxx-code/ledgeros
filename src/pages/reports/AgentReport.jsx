import React, { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { fmt, fmtDate } from "../../lib/utils.js";

// ── SALES BY AGENT ────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ AgentReport                                                │
// │ Agent performance report                                   │
// └────────────────────────────────────────────────────────────┘
export function AgentReport({ invoices, allProfiles, contacts }) {
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [period, setPeriod] = useState("all");
  const now = new Date();
  const filterByPeriod = (inv) => {
    if (period === "all") return true;
    const d = new Date(inv.invoice_date || inv.created_at);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "week") return (now - d) < 7 * 86400000;
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };
  const agentInvoices = (agentId) => invoices.filter(i => (agentId === "all" || i.created_by === agentId) && filterByPeriod(i));
  const displayInvoices = agentInvoices(selectedAgent);
  const totalSales = displayInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = displayInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = displayInvoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = displayInvoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Analytics</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Sales by <span style={{ background: "linear-gradient(135deg,#a78bfa,#ff6a4d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Agent</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Detailed agent performance breakdown</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[{label:"Active Agents",val:allProfiles.filter(p=>p.role==="agent").length,sub:"field sales team",accent:"#dd2b0f"},{label:"Total Invoices",val:invoices.length,sub:"raised by all agents",accent:"#7c3aed"},{label:"Total Revenue",val:fmt(invoices.reduce((s,i)=>s+(parseFloat(i.amount)||0),0)),sub:"all agents combined",accent:"#16a34a"},{label:"Avg Per Agent",val:allProfiles.filter(p=>p.role==="agent").length>0?fmt(invoices.reduce((s,i)=>s+(parseFloat(i.amount)||0),0)/allProfiles.filter(p=>p.role==="agent").length):"—",sub:"revenue per agent",accent:"#d97706"}].map((k,i)=>(
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:"3px solid transparent", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop=`3px solid ${k.accent}`; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderTop="3px solid transparent"; }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "8px 14px", fontSize: 13, outline: "none", fontFamily: "var(--sans)" }} value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
          <option value="all">All Agents</option>
          {allProfiles.map(a => <option key={a.id} value={a.id}>{a.full_name || "Unknown"}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: "var(--r)", padding: 4 }}>
          {[["all","All Time"],["month","This Month"],["week","This Week"],["today","Today"]].map(([k,l]) => <button key={k} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)", background: period === k ? "var(--white)" : "transparent", color: period === k ? "var(--text)" : "var(--text3)", boxShadow: period === k ? "var(--sh)" : "none" }} onClick={() => setPeriod(k)}>{l}</button>)}
        </div>
      </div>
      <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom: 20 }}>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Total Sales</div><div className="kpi-val">{fmt(totalSales)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Collected</div><div className="kpi-val tg">{fmt(totalPaid)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Pending</div><div className="kpi-val" style={{ color: "var(--amber)" }}>{fmt(totalPending)}</div></div>
        <div className="kpi" style={{ marginBottom: 0 }}><div className="kpi-label">Overdue</div><div className="kpi-val tr-c">{fmt(totalOverdue)}</div></div>
      </div>

      {selectedAgent === "all" && (() => {
        const PROD_COLORS = ["#dd2b0f","#201e1d","#1a7f37","#f59e0b","#8a8580"];
        const agents = allProfiles.filter(p => p.role === "agent");
        if (agents.length === 0) return null;

        const agentRows = agents.map(a => ({ id: a.id, name: a.full_name || "Unknown", products: {} }));
        displayInvoices.forEach(inv => {
          const row = agentRows.find(r => r.id === inv.created_by);
          if (!row) return;
          let lines = inv.lines;
          if (typeof lines === "string") { try { lines = JSON.parse(lines); } catch { lines = []; } }
          if (!Array.isArray(lines)) return;
          lines.forEach(l => {
            const name = (l.description||"Other").replace(" ⚠️ UNMATCHED","");
            const val = (parseFloat(l.qty)||0) * (parseFloat(l.unit_price)||0);
            row.products[name] = (row.products[name]||0) + val;
          });
        });

        const totals = {};
        agentRows.forEach(r => Object.entries(r.products).forEach(([k,v]) => { totals[k] = (totals[k]||0)+v; }));
        const topProducts = Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k])=>k);
        const seriesKeys = [...topProducts, "Other"];

        const data = agentRows.map(r => {
          const row = { name: r.name };
          let other = 0;
          Object.entries(r.products).forEach(([k,v]) => {
            if (topProducts.includes(k)) row[k] = Math.round(v*100)/100;
            else other += v;
          });
          topProducts.forEach(p => { if (row[p]===undefined) row[p]=0; });
          row["Other"] = Math.round(other*100)/100;
          return row;
        }).filter(r => seriesKeys.some(k => r[k] > 0))
          .sort((a,b) => seriesKeys.reduce((s,k)=>s+(b[k]||0),0) - seriesKeys.reduce((s,k)=>s+(a[k]||0),0));

        if (data.length === 0) return null;

        const AgentTooltip = ({ active, payload, label }) => {
          if (!active || !payload || !payload.length) return null;
          const total = payload.reduce((s,p)=>s+(p.value||0),0);
          return (
            <div style={{background:"#201e1d",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,padding:"10px 14px",fontSize:12}}>
              <div style={{color:"rgba(255,255,255,.5)",marginBottom:6,fontWeight:600}}>{label}</div>
              {payload.filter(p=>p.value>0).map(p=>(
                <div key={p.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <div style={{width:8,height:8,borderRadius:2,background:p.color}}/>
                  <span style={{color:"rgba(255,255,255,.7)"}}>{p.name}:</span>
                  <span style={{color:"#fff",fontWeight:700}}>{fmt(p.value)}</span>
                </div>
              ))}
              <div style={{marginTop:4,paddingTop:4,borderTop:"1px solid rgba(255,255,255,.1)",color:"#fff",fontWeight:700}}>
                Total: {fmt(total)}
              </div>
            </div>
          );
        };

        return (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch">
              <div>
                <div className="ct">Sales by Product per Agent</div>
                <div className="cs">Revenue breakdown by top products</div>
              </div>
              <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                {seriesKeys.map((k,i)=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
                    <div style={{width:10,height:10,borderRadius:2,background:PROD_COLORS[i]}}/>{k}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "4px 24px 20px" }}>
              <ResponsiveContainer width="100%" height={Math.max(data.length*40+60, 160)}>
                <BarChart data={data} layout="vertical" margin={{top:8,right:30,left:10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                  <XAxis type="number" tickFormatter={v=>v===0?"£0":"£"+Math.round(v/1000)+"k"} tick={{fontSize:10,fill:"var(--text3)"}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:"var(--text3)"}} axisLine={false} tickLine={false} width={110}/>
                  <Tooltip content={AgentTooltip}/>
                  {seriesKeys.map((k,i)=>(
                    <Bar key={k} dataKey={k} stackId="sales" fill={PROD_COLORS[i]} radius={i===seriesKeys.length-1?[0,4,4,0]:[0,0,0,0]} barSize={18}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      <div className="card">
        <div className="ch"><div className="ct">Invoice Detail</div><div className="cs">{displayInvoices.length} records</div></div>
        <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table className="ar-table" style={{minWidth:420}}><thead><tr><th>Customer</th><th className="hm">Agent</th><th className="hm">Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
          {displayInvoices.slice(0, 50).map(inv => {
            const agent = allProfiles.find(a => a.id === inv.created_by);
            return <tr key={inv.id}>
              <td><div style={{ fontWeight: 600, fontSize: 13 }}>{inv.customer}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{inv.invoice_number}</div></td>
              <td className="hm" style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>{agent?.full_name || "—"}</td>
              <td className="hm" style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>{fmtDate(inv.invoice_date)}</td>
              <td className="mono" style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td>
              <td><span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"?"b-amber":"b-gray")}>{inv.status}</span></td>
            </tr>;
          })}
          {displayInvoices.length === 0 && <tr><td colSpan={5} className="empty">No invoices for this period</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
