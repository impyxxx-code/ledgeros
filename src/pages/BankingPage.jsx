import React, { useState, useEffect } from "react";
import { sb } from "../lib/supabase.js";
import { SkeletonTable, MobileCard } from "../components/ui.jsx";
import { fmt, escHtml, isMobile } from "../lib/utils.js";
import { toast } from "../lib/constants.js";
import { groupPaymentsByDate, paymentMethodTotals, unbankedCash, loadDepositDays, upsertDepositDay } from "../lib/banking.js";

const ALL_CAP = 2000; // "All time" is capped; a visible banner shows when it truncates

export function BankingPage({ token, userId, profile }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [bankedDates, setBankedDates] = useState({});
  const [depositRefs, setDepositRefs] = useState({});
  const [editingRef, setEditingRef] = useState(null);
  const [refInput, setRefInput] = useState("");
  const [capped, setCapped] = useState(false);

  // Banked-day / deposit-ref state is shared server-side (was per-browser localStorage).
  useEffect(() => {
    if (!token) return;
    loadDepositDays(token).then(({ banked, refs }) => { setBankedDates(banked); setDepositRefs(refs); });
  }, [token]);

  // Optimistic write-through to the server; revert + warn if the save fails.
  const setBanked = async (d, banked) => {
    const prev = bankedDates;
    setBankedDates(b => { const nb = { ...b }; if (banked) nb[d] = true; else delete nb[d]; return nb; });
    const res = await upsertDepositDay(token, { date: d, banked, userId });
    if (!res.ok) { setBankedDates(prev); toast.error("Couldn't update banked status — check your connection and try again."); }
  };
  const setRef = async (d, ref) => {
    const prev = depositRefs;
    setDepositRefs(r => ({ ...r, [d]: ref }));
    const res = await upsertDepositDay(token, { date: d, depositRef: ref, userId });
    if (!res.ok) { setDepositRefs(prev); toast.error("Couldn't save the deposit reference — check your connection and try again."); }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const now = new Date();
    let fromDate = "";
    if (period === "today") { fromDate = now.toISOString().split("T")[0]; }
    else if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); fromDate = d.toISOString().split("T")[0]; }
    else if (period === "month") { const d = new Date(now); d.setDate(d.getDate() - 30); fromDate = d.toISOString().split("T")[0]; }
    const q = fromDate ? `created_at=gte.${fromDate}T00:00:00&order=created_at.desc` : `order=created_at.desc&limit=${ALL_CAP}`;
    sb.get(token, "invoice_payments", q)
      .then(d => { const arr = Array.isArray(d) ? d : []; setPayments(arr); setCapped(!fromDate && arr.length >= ALL_CAP); })
      .catch(() => { setPayments([]); setCapped(false); })
      .finally(() => setLoading(false));
  }, [token, period]);

  // Group by date (newest first)
  const { byDate, dates } = groupPaymentsByDate(payments);

  const fmtDay = (d) => {
    const dt = new Date(d + "T12:00:00");
    return dt.toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  };
  const fmtTime = (ts) => { try { return new Date(ts).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}); } catch{return "";} };
  const methodBadge = (m) => {
    const map = { cash:["#dcfce7","#15803d","💵"], bank:["#dbeafe","#1d4ed8","🏦"], card:["#f3e8ff","#7e22ce","💳"], cheque:["#fef3c7","#92400e","📝"] };
    const [bg,col,icon] = map[m] || ["#f1f5f9","#475569","💰"];
    return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:500,background:bg,color:col}}>{icon} {m}</span>;
  };

  // KPIs
  const total = payments.reduce((s,p)=>s+parseFloat(p.amount||0),0);
  const byMethod = paymentMethodTotals(payments);
  // "Unbanked cash" = physical cash awaiting deposit only — excludes card / bank transfer.
  const unbanked = unbankedCash(dates, byDate, bankedDates);

  // CSV export
  const exportCSV = () => {
    const rows = [["Date","Time","Invoice","Customer","Amount","Method","Agent","Notes","Deposit Ref"]];
    payments.forEach(p => {
      const d = (p.created_at||"").split("T")[0];
      rows.push([d, fmtTime(p.created_at), p.invoice_number||"", p.customer||"", parseFloat(p.amount||0).toFixed(2), p.method||"", p.recorded_by_name||"", p.notes||"", depositRefs[d]||""]);
    });
    // Guard against CSV formula injection (cells starting with = + - @ etc.)
    const csvCell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g,'""') + '"'; };
    const csv = rows.map(r=>r.map(csvCell).join(",")).join("\n");
    const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download=`banking-recon-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  };

  // Print banking sheet
  const printSheet = () => {
    const w = window.open("","_blank");
    let html = `<html><head><title>Banking Sheet</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#f1f5f9;padding:6px 8px;text-align:left;border:1px solid #e2e8f0}td{padding:6px 8px;border:1px solid #e2e8f0}.day-hdr{background:#201e1d;color:#fff;padding:8px 10px;font-weight:bold;margin-top:16px}.total{text-align:right;font-weight:bold;padding:6px 8px;border:1px solid #e2e8f0;background:#f8fafc}@media print{button{display:none}}</style></head><body>`;
    html += "<h2 style='margin-bottom:4px'>Banking reconciliation sheet</h2><p style='color:#64748b;margin-bottom:20px'>Arkham Retail Ltd - Printed " + new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) + "</p>";
    dates.forEach(d => {
      const rows = byDate[d];
      const dayTotal = rows.reduce((s,p)=>s+parseFloat(p.amount||0),0);
      const ref = depositRefs[d] || "";
      const banked = bankedDates[d];
      html += "<div class='day-hdr'>" + fmtDay(d) + " - £" + dayTotal.toFixed(2) + " " + (banked ? "BANKED" + (ref ? " Ref: " + escHtml(ref) : "") : "NOT YET BANKED") + "</div>";
      html += `<table><thead><tr><th>Time</th><th>Invoice</th><th>Customer</th><th>Amount</th><th>Method</th><th>Agent</th><th>Notes</th></tr></thead><tbody>`;
      rows.forEach(p => { html += "<tr><td>" + fmtTime(p.created_at) + "</td><td>" + escHtml(p.invoice_number||"") + "</td><td>" + escHtml(p.customer||"") + "</td><td style='text-align:right'>&pound;" + parseFloat(p.amount||0).toFixed(2) + "</td><td>" + escHtml(p.method||"") + "</td><td>" + escHtml(p.recorded_by_name||"") + "</td><td>" + escHtml(p.notes||"") + "</td></tr>"; });
      html += "<tr><td colspan='3' style='text-align:right;font-weight:bold;background:#f8fafc'>Day total</td><td class='total'>&pound;" + dayTotal.toFixed(2) + "</td><td colspan='3'></td></tr></tbody></table>";
    });
    html += "<p style='margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;color:#64748b'>Total collected: &pound;" + total.toFixed(2) + " across " + payments.length + " payments</p></body></html>";
    w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  };

  return (
    <div>
      {/* Dark Header */}
      <div className="page-hero" style={{margin:"-26px -28px 20px -28px",background:"#201e1d",padding:"20px 24px 0",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",bottom:-60,left:-40,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)",pointerEvents:"none"}} />
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16,position:"relative",zIndex:1}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:10,fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase",color:"#e15b47",marginBottom:6}}><div style={{width:5,height:5,borderRadius:"50%",background:"#dd2b0f",animation:"pulse 2.4s ease-in-out infinite"}} />Banking</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-1.2px"}}>Banking &amp; Cash</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:3}}>Detailed cash reconciliation for banking</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:3,background:"rgba(255,255,255,.07)",borderRadius:9,padding:"3px 4px",border:"1px solid rgba(255,255,255,.10)"}}>
              {["today","week","month","all"].map(p => (
                <button key={p} onClick={()=>setPeriod(p)} style={{padding:"5px 13px",borderRadius:7,border:"none",background:period===p?"#dd2b0f":"transparent",color:period===p?"#fff":"rgba(255,255,255,.45)",fontSize:12,cursor:"pointer",fontFamily:"var(--sans)",fontWeight:period===p?700:500,transition:"all .15s",boxShadow:period===p?"0 2px 8px rgba(221,43,15,.30)":"none"}}>
                  {p==="today"?"Today":p==="week"?"This week":p==="month"?"This month":"All time"}
                </button>
              ))}
            </div>
            <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:6,border:"none",background:"#16a34a",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:500,fontFamily:"var(--sans)"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
            <button onClick={printSheet} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:6,border:"none",background:"#0f172a",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:500,fontFamily:"var(--sans)"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print sheet
            </button>
          </div>
        </div>
        {/* KPI row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,borderTop:"1px solid rgba(255,255,255,0.08)",margin:"0 -24px"}}>
          {[
            {label:"Total collected",val:fmt(total),sub:payments.length+" payments",col:"#dd2b0f"},
            {label:"Cash",val:fmt(byMethod.cash||0),sub:payments.filter(p=>p.method==="cash").length+" payments",col:"#22c55e"},
            {label:"Bank transfer",val:fmt(byMethod.bank||0),sub:payments.filter(p=>p.method==="bank").length+" payments",col:"#ff6a4d"},
            {label:"Unbanked cash",val:fmt(unbanked),sub:"Awaiting deposit",col:"#f59e0b"},
          ].map((k,i) => (
            <div key={i} style={{padding:"16px 20px 14px",borderRight:i<3?"1px solid rgba(255,255,255,0.08)":"none",borderTop:"3px solid "+k.col}}>
              <div style={{fontSize:10,fontWeight:700,color:"#8aa0b8",textTransform:"uppercase",letterSpacing:".6px",marginBottom:6}}>{k.label}</div>
              <div style={{fontSize:20,fontWeight:600,color:k.col,fontFamily:"var(--mono)"}}>{loading?"—":k.val}</div>
              <div style={{fontSize:11,color:"#8aa0b8",marginTop:3}}>{loading?"Loading…":k.sub}</div>
            </div>
          ))}
        </div>
        {/* Method breakdown mini strip */}
        {!loading && payments.length > 0 && (
          <div style={{display:"flex",alignItems:"center",gap:16,padding:"10px 20px",borderTop:"1px solid rgba(255,255,255,.06)",margin:"0 -24px",background:"rgba(0,0,0,.15)",flexWrap:"wrap"}}>
            <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:"1px",flexShrink:0}}>By method:</span>
            {[["cash","💵","#22c55e"],["bank","🏦","#ff6a4d"],["card","💳","#a78bfa"],["cheque","📝","#fcd34d"]].map(([m,icon,col]) => {
              const amt = byMethod[m]||0; const cnt = payments.filter(p=>p.method===m).length;
              if (!cnt) return null;
              return <span key={m} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:11,color:"rgba(255,255,255,.7)"}}>
                {icon} <span style={{fontWeight:600,color:col,fontFamily:"var(--mono)"}}>{fmt(amt)}</span> <span style={{color:"rgba(255,255,255,.35)"}}>{cnt}×</span>
              </span>;
            })}
          </div>
        )}
      </div>

      {capped && !loading && (
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",marginBottom:16,borderRadius:8,background:"#fef3c7",border:"1px solid #fcd34d",color:"#92400e",fontSize:12}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Showing the most recent {ALL_CAP.toLocaleString()} payments. Older records aren’t included in these totals — narrow the period, or export CSV for the full history.</span>
        </div>
      )}
      {loading ? (
        <div className="card" style={{overflow:"hidden"}}>
          <SkeletonTable rows={7} cols={8} />
        </div>
      ) : payments.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"var(--text3)"}}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.3,display:"block",margin:"0 auto 12px"}}><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
          No payments found for this period
        </div>
      ) : (
        <>
          {/* Transaction detail table — desktop only; on mobile the daily sheet below lists every payment as cards */}
          {!isMobile() && (
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>Transaction detail</div>
                <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>Every payment received — match each row against your bank statement</div>
              </div>
            </div>
            <div className="card" style={{overflow:"hidden"}}>
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                <table className="bk-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}>
                  <thead>
                    <tr style={{background:"var(--bg)"}}>
                      {["Date","Time","Invoice","Customer","Amount","Method","Agent","Notes"].map(h => (
                        <th key={h} style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px",textAlign:"left",borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p,i) => {
                      const d = (p.created_at||"").split("T")[0];
                      const agentName = p.recorded_by_name || "—";
                      const agentCol = ["#dd2b0f","#1a7f37","#f59e0b","#201e1d","#ae1800"][agentName.charCodeAt(0)%5]||"#64748b";
                      const isPartial = (p.notes||"").toLowerCase().includes("partial");
                      return (
                        <tr key={p.id||i} style={{borderBottom:"0.5px solid var(--border)"}}>
                          <td style={{padding:"9px 12px",color:"var(--text2)",whiteSpace:"nowrap"}}>{d}</td>
                          <td style={{padding:"9px 12px",color:"var(--text3)",whiteSpace:"nowrap"}}>{fmtTime(p.created_at)}</td>
                          <td style={{padding:"9px 12px"}}><span style={{fontFamily:"var(--mono)",color:"var(--blue)",fontWeight:600,fontSize:12}}>{p.invoice_number||"—"}</span></td>
                          <td style={{padding:"9px 12px",color:"var(--text)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.customer||"—"}</td>
                          <td style={{padding:"9px 12px"}}><span style={{fontFamily:"var(--mono)",fontWeight:600,color:isPartial?"#d97706":"#16a34a"}}>{fmt(p.amount||0)}</span></td>
                          <td style={{padding:"9px 12px"}}>{methodBadge(p.method)}</td>
                          <td style={{padding:"9px 12px"}}>
                            <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:20,background:"var(--bg)",fontSize:11,color:"var(--text2)"}}>
                              <div style={{width:16,height:16,borderRadius:0,background:agentCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{agentName[0]?.toUpperCase()||"?"}</div>
                              {agentName.split(" ")[0]}
                            </div>
                          </td>
                          <td style={{padding:"9px 12px",color:"var(--text3)",fontSize:11}}>{p.notes||"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 14px",background:"var(--bg)",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",fontSize:12}}>
                <span style={{color:"var(--text3)"}}>{payments.length} transactions</span>
                <span style={{fontFamily:"var(--mono)",fontWeight:600}}>{fmt(total)} total</span>
              </div>
            </div>
          </div>
          )}

          {/* Daily banking sheet */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>Daily banking sheet</div>
                <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>Cash grouped by day — mark each day as banked once deposited, add your deposit slip reference</div>
              </div>
            </div>
            <div className="card" style={{overflow:"hidden"}}>
              {dates.map((d, di) => {
                const rows = byDate[d];
                const dayTotal = rows.reduce((s,p)=>s+parseFloat(p.amount||0),0);
                const isBanked = !!bankedDates[d];
                const ref = depositRefs[d] || "";
                return (
                  <div key={d} style={{borderBottom:di<dates.length-1?"1px solid var(--border)":"none"}}>
                    {/* Day header */}
                    <div style={{display:"flex",flexDirection:isMobile()?"column":"row",alignItems:isMobile()?"stretch":"center",justifyContent:"space-between",gap:isMobile()?10:0,padding:"12px 16px",background:"var(--bg)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:isBanked?"#16a34a":"#f59e0b",flexShrink:0}} />
                        <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{fmtDay(d)}</div>
                        <span style={{padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:500,background:isBanked?"#dcfce7":"#fef3c7",color:isBanked?"#15803d":"#92400e"}}>
                          {isBanked?"✓ Banked":"Unbanked"}
                        </span>
                        <span style={{fontSize:11,color:"var(--text3)"}}>{rows.length} payment{rows.length!==1?"s":""}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:isMobile()?"space-between":"flex-end",gap:10}}>
                        <span style={{fontFamily:"var(--mono)",fontWeight:600,fontSize:14,color:"var(--text)"}}>{fmt(dayTotal)}</span>
                        {!isBanked ? (
                          <button onClick={()=>setBanked(d, true)} style={{padding:isMobile()?"10px 18px":"4px 12px",borderRadius:6,border:"none",background:"#16a34a",color:"#fff",fontSize:isMobile()?13:11,cursor:"pointer",fontWeight:600,minHeight:isMobile()?44:"auto"}}>
                            Mark banked
                          </button>
                        ) : (
                          <button onClick={()=>setBanked(d, false)} style={{padding:isMobile()?"10px 18px":"4px 12px",borderRadius:6,border:"1px solid var(--border)",background:"var(--white)",color:"var(--text3)",fontSize:isMobile()?13:11,cursor:"pointer",minHeight:isMobile()?44:"auto"}}>
                            Unmark
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Transaction rows */}
                    {isMobile() ? (
                    <div style={{display:"flex",flexDirection:"column",gap:10,padding:12}}>
                      {rows.map((p,i) => {
                        const agentName = p.recorded_by_name || "—";
                        const isPartial = (p.notes||"").toLowerCase().includes("partial");
                        const detail = [{label:"Agent",value:agentName.split(" ")[0]}];
                        if (p.notes) detail.push({label:"Notes",value:p.notes});
                        return (
                          <MobileCard
                            key={p.id||i}
                            title={p.customer||"—"}
                            subtitle={`${p.invoice_number||"—"} · ${fmtTime(p.created_at)}`}
                            value={fmt(p.amount||0)}
                            valueSub={isPartial?"partial":undefined}
                            badge={methodBadge(p.method)}
                            rows={detail}
                          />
                        );
                      })}
                    </div>
                    ) : (
                    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                      <table className="bk-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
                        <thead>
                          <tr>
                            {["Time","Invoice","Customer","Amount","Method","Agent","Notes"].map(h => (
                              <th key={h} style={{padding:"7px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".4px",textAlign:"left",borderBottom:"0.5px solid var(--border)",whiteSpace:"nowrap"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((p,i) => {
                            const agentName = p.recorded_by_name || "—";
                            const agentCol = ["#dd2b0f","#1a7f37","#f59e0b","#201e1d","#ae1800"][agentName.charCodeAt(0)%5]||"#64748b";
                            const isPartial = (p.notes||"").toLowerCase().includes("partial");
                            return (
                              <tr key={p.id||i} style={{borderBottom:i<rows.length-1?"0.5px solid var(--border)":"none"}}>
                                <td style={{padding:"9px 14px",color:"var(--text3)",whiteSpace:"nowrap"}}>{fmtTime(p.created_at)}</td>
                                <td style={{padding:"9px 14px"}}><span style={{fontFamily:"var(--mono)",color:"var(--blue)",fontWeight:600,fontSize:12}}>{p.invoice_number||"—"}</span></td>
                                <td style={{padding:"9px 14px",color:"var(--text)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.customer||"—"}</td>
                                <td style={{padding:"9px 14px"}}><span style={{fontFamily:"var(--mono)",fontWeight:600,color:isPartial?"#d97706":"#16a34a"}}>{fmt(p.amount||0)}</span></td>
                                <td style={{padding:"9px 14px"}}>{methodBadge(p.method)}</td>
                                <td style={{padding:"9px 14px"}}>
                                  <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:20,background:"var(--bg)",fontSize:11,color:"var(--text2)"}}>
                                    <div style={{width:16,height:16,borderRadius:0,background:agentCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{agentName[0]?.toUpperCase()||"?"}</div>
                                    {agentName.split(" ")[0]}
                                  </div>
                                </td>
                                <td style={{padding:"9px 14px",color:"var(--text3)",fontSize:11}}>{p.notes||"—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )}
                    {/* Day footer — total + deposit ref */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",padding:"10px 16px",background:"var(--bg)",borderTop:"1px solid var(--border)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:11,color:"var(--text3)"}}>Deposit slip ref:</span>
                        {editingRef === d ? (
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <input value={refInput} onChange={e=>setRefInput(e.target.value)} placeholder="e.g. DEP-2026-0089" style={{padding:"3px 8px",border:"1px solid var(--blue)",borderRadius:5,fontSize:11,outline:"none",width:160,fontFamily:"var(--mono)"}} />
                            <button onClick={()=>{setRef(d, refInput);setEditingRef(null);}} style={{padding:"3px 10px",borderRadius:5,border:"none",background:"var(--blue)",color:"#fff",fontSize:11,cursor:"pointer"}}>Save</button>
                            <button onClick={()=>setEditingRef(null)} style={{padding:"3px 8px",borderRadius:5,border:"1px solid var(--border)",background:"var(--white)",fontSize:11,cursor:"pointer",color:"var(--text3)"}}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text)",fontWeight:600}}>{ref || "—"}</span>
                            <button onClick={()=>{setEditingRef(d);setRefInput(ref);}} style={{padding:"2px 8px",borderRadius:5,border:"1px solid var(--border)",background:"transparent",fontSize:11,cursor:"pointer",color:"var(--text3)"}}>
                              {ref?"Edit":"Add ref"}
                            </button>
                          </div>
                        )}
                      </div>
                      <span style={{fontFamily:"var(--mono)",fontWeight:600,fontSize:13,color:isBanked?"#16a34a":"#d97706"}}>
                        {fmt(dayTotal)} {isBanked?"✓ banked":"— unbanked"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
