import React, { useState } from "react";
import { fmt } from "../../lib/utils.js";
import { EmptyState } from "../../components/ui.jsx";

// ┌────────────────────────────────────────────────────────────┐
// │ AgentProductsReport                                        │
// │ Agent products breakdown report                            │
// └────────────────────────────────────────────────────────────┘
export function AgentProductsReport({ invoices, allProfiles, period, filteredInv, periodLabels }) {
  const [selectedAgent, setSelectedAgent] = useState("all");

  // Include ALL invoices - even those not matching a profile
  const knownIds = new Set(allProfiles.map(a => a.id));
  const unknownInvs = filteredInv.filter(i => !knownIds.has(i.created_by));
  const profilesWithUnknown = unknownInvs.length > 0
    ? [...allProfiles, { id: "unknown", full_name: "Other / Unknown" }]
    : allProfiles;

  const agentData = profilesWithUnknown.map(agent => {
    const agentInvs = agent.id === "unknown"
      ? unknownInvs
      : filteredInv.filter(i => i.created_by === agent.id);
    const productMap = {};
    agentInvs.forEach(inv => {
      let lines = inv.lines ? (typeof inv.lines === "string" ? JSON.parse(inv.lines) : inv.lines) : [];
      // Fallback for old invoices with no lines - use invoice description or customer
      if (!lines || lines.length === 0) {
        lines = [{ description: inv.description || "Invoice " + inv.invoice_number, qty: 1, unit_price: inv.amount || 0 }];
      }
      lines.forEach(l => {
        if (!l.description) return;
        if (!productMap[l.description]) productMap[l.description] = { description: l.description, totalQty: 0, totalValue: 0, invoiceCount: 0 };
        productMap[l.description].totalQty += parseFloat(l.qty) || 1;
        productMap[l.description].totalValue += (parseFloat(l.qty)||1) * (parseFloat(l.unit_price)||0);
        productMap[l.description].invoiceCount += 1;
      });
    });
    const productLines = Object.values(productMap).sort((a,b) => b.totalValue - a.totalValue);
    return { agent, productLines, totalSales: agentInvs.reduce((s,i)=>s+i.amount,0), totalInvoices: agentInvs.length };
  }).filter(a => a.totalInvoices > 0).sort((a,b) => b.totalSales - a.totalSales);

  const globalProductMap = {};
  filteredInv.forEach(inv => {
    const agent = allProfiles.find(a => a.id === inv.created_by) || { full_name: "Other" };
    let lines = inv.lines ? (typeof inv.lines === "string" ? JSON.parse(inv.lines) : inv.lines) : [];
    if (!lines || lines.length === 0) lines = [{ description: inv.description || "Invoice " + inv.invoice_number, qty: 1, unit_price: inv.amount || 0 }];
    lines.forEach(l => {
      if (!l.description) return;
      if (!globalProductMap[l.description]) globalProductMap[l.description] = { description: l.description, totalQty: 0, totalValue: 0, agents: {} };
      globalProductMap[l.description].totalQty += parseFloat(l.qty)||0;
      globalProductMap[l.description].totalValue += (parseFloat(l.qty)||0)*(parseFloat(l.unit_price)||0);
      if (agent) globalProductMap[l.description].agents[agent.full_name] = (globalProductMap[l.description].agents[agent.full_name]||0) + (parseFloat(l.qty)||0);
    });
  });
  const globalProducts = Object.values(globalProductMap).sort((a,b) => b.totalValue - a.totalValue);
  const displayData = selectedAgent === "all" ? agentData : agentData.filter(d => d.agent.id === selectedAgent);

  return (
    <div>
      <div style={{ display:"flex",gap:12,alignItems:"flex-end",marginBottom:20,flexWrap:"wrap" }}>
        <div>
          <label style={{ fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",display:"block",marginBottom:5 }}>Filter by Agent</label>
          <select value={selectedAgent} onChange={e=>setSelectedAgent(e.target.value)} style={{ background:"var(--white)",border:"1px solid var(--border2)",borderRadius:"var(--r)",padding:"8px 14px",fontSize:13,fontFamily:"var(--sans)",outline:"none",minWidth:200 }}>
            <option value="all">All Agents</option>
            {allProfiles.map(a=><option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>
        <div style={{fontSize:12,color:"var(--text3)"}}>{filteredInv.length} invoices · {periodLabels[period]}</div>
      </div>

      {selectedAgent==="all" && globalProducts.length>0 && (
        <div className="card" style={{marginBottom:18}}>
          <div className="ch"><div><div className="ct">📦 Top Products — All Agents</div><div className="cs">Ranked by total sales value · {periodLabels[period]}</div></div></div>
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}>
            <thead><tr><th>#</th><th>Product / Description</th><th>Total Qty</th><th>Total Value</th><th className="hm">Top Sellers</th></tr></thead>
            <tbody>
              {globalProducts.slice(0,20).map((p,i)=>(
                <tr key={p.description}>
                  <td style={{fontWeight:700,color:"var(--text3)",fontSize:12}}>{i+1}</td>
                  <td style={{fontWeight:600}}>{p.description}</td>
                  <td className="mono" style={{fontWeight:700,color:"var(--blue)",fontSize:14}}>{p.totalQty}</td>
                  <td className="mono" style={{fontWeight:700,color:"var(--green)"}}>{fmt(p.totalValue)}</td>
                  <td className="hm" style={{fontSize:11,color:"var(--text2)"}}>{Object.entries(p.agents).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n,q])=>`${n.split(" ")[0]} (${q})`).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {displayData.length===0 && (
        <div className="card">
          <EmptyState icon="report" title="No product data yet" sub="Create new invoices with product line items and they will appear here" />
        </div>
      )}

      {displayData.map(({agent,productLines,totalSales,totalInvoices})=>(
        <div key={agent.id} className="card" style={{marginBottom:18}}>
          <div className="ch">
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0}}>{(agent.full_name||"U")[0].toUpperCase()}</div>
              <div>
                <div className="ct">{agent.full_name||"Unknown Agent"}</div>
                <div className="cs">{totalInvoices} invoice{totalInvoices!==1?"s":""} · {productLines.length} product{productLines.length!==1?"s":""} sold</div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:2}}>Total Sales</div>
              <div style={{fontSize:20,fontWeight:800,color:"var(--green)",letterSpacing:"-.4px"}}>{fmt(totalSales)}</div>
            </div>
          </div>
          {productLines.length>0 ? (
            <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}>
              <thead><tr><th>#</th><th>Product / Description</th><th>Qty Sold</th><th>Total Value</th><th className="hm">Invoices</th><th className="hm">Avg/Invoice</th></tr></thead>
              <tbody>
                {productLines.map((p,i)=>{
                  const maxQty = Math.max(...productLines.map(x=>x.totalQty),1);
                  return (
                    <tr key={p.description}>
                      <td style={{fontSize:12,color:"var(--text3)",fontWeight:600}}>{i+1}</td>
                      <td style={{fontWeight:600}}>{p.description}</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span className="mono" style={{fontWeight:700,color:"var(--blue)",fontSize:14,minWidth:30}}>{p.totalQty}</span>
                          <div style={{height:6,width:Math.max(12,Math.round((p.totalQty/maxQty)*80))+"px",background:"var(--blue)",borderRadius:3,opacity: 0.35}} />
                        </div>
                      </td>
                      <td className="mono" style={{fontWeight:700,color:"var(--green)"}}>{fmt(p.totalValue)}</td>
                      <td className="hm mono" style={{color:"var(--text2)"}}>{p.invoiceCount}</td>
                      <td className="hm mono" style={{color:"var(--text2)"}}>{fmt(p.invoiceCount > 0 ? p.totalValue/p.invoiceCount : 0)}</td>
                    </tr>
                  );
                })}
                <tr style={{background:"#f8fafd"}}>
                  <td colSpan={2} style={{fontWeight:700,fontSize:13}}>TOTAL</td>
                  <td className="mono" style={{fontWeight:700,color:"var(--blue)"}}>{productLines.reduce((s,p)=>s+p.totalQty,0)}</td>
                  <td className="mono" style={{fontWeight:700,color:"var(--green)"}}>{fmt(productLines.reduce((s,p)=>s+p.totalValue,0))}</td>
                  <td className="hm mono" style={{fontWeight:600}}>{totalInvoices}</td>
                  <td className="hm mono" style={{fontWeight:600}}>{fmt(totalInvoices > 0 ? totalSales/totalInvoices : 0)}</td>
                </tr>
              </tbody>
            </table></div>
          ) : (
            <div className="empty" style={{padding:24}}>No product line items saved on invoices for this agent in this period</div>
          )}
        </div>
      ))}
    </div>
  );
}


