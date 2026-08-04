import React, { useState } from "react";
import { fmt, fmtDate, parseLines } from "../../lib/utils.js";
import { EmptyState } from "../../components/ui.jsx";

// ── ADMIN REPORTS SUITE ───────────────────────────────────────────────────────
// ── Product Sales Tracker ────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ ProductSalesTracker                                        │
// │ Product sales analytics tracker                            │
// └────────────────────────────────────────────────────────────┘
export function ProductSalesTracker({ invoices, products, allProfiles }) {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [quickRange, setQuickRange] = useState("month");

  const setRange = (range) => {
    setQuickRange(range);
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    let from;
    if (range === "week") { const d = new Date(); d.setDate(d.getDate()-7); from = d.toISOString().split("T")[0]; }
    else if (range === "month") { const d = new Date(); d.setMonth(d.getMonth()-1); from = d.toISOString().split("T")[0]; }
    else if (range === "quarter") { const d = new Date(); d.setMonth(d.getMonth()-3); from = d.toISOString().split("T")[0]; }
    else if (range === "year") { const d = new Date(); d.setFullYear(d.getFullYear()-1); from = d.toISOString().split("T")[0]; }
    else { from = "2020-01-01"; }
    setDateFrom(from); setDateTo(to);
  };

  // Filter invoices by date range
  const rangedInvoices = invoices.filter(inv => {
    const d = inv.invoice_date || inv.created_at?.split("T")[0];
    return d >= dateFrom && d <= dateTo;
  });

  // Build product sales data from line items
  const productSales = {};
  rangedInvoices.forEach(inv => {
    let lines = parseLines(inv);
    if (!lines || lines.length === 0) {
      lines = [{ description: inv.description || "Invoice " + inv.invoice_number, qty: 1, unit_price: inv.amount || 0 }];
    }
    const agent = allProfiles.find(a => a.id === inv.created_by);
    lines.forEach(l => {
      if (!l.description) return;
      const key = l.description;
      if (!productSales[key]) productSales[key] = {
        description: key,
        totalQty: 0, totalValue: 0, invoiceCount: 0,
        agentBreakdown: {}, dailySales: {}
      };
      const qty = parseFloat(l.qty) || 1;
      const val = qty * (parseFloat(l.unit_price) || 0);
      productSales[key].totalQty += qty;
      productSales[key].totalValue += val;
      productSales[key].invoiceCount += 1;
      const agentName = agent?.full_name || "Unknown";
      productSales[key].agentBreakdown[agentName] = (productSales[key].agentBreakdown[agentName] || 0) + qty;
      const day = inv.invoice_date || inv.created_at?.split("T")[0];
      if (day) productSales[key].dailySales[day] = (productSales[key].dailySales[day] || 0) + qty;
    });
  });

  const allProducts = Object.values(productSales).sort((a,b) => b.totalQty - a.totalQty);
  const selected = selectedProduct ? productSales[selectedProduct] : null;
  const maxQty = Math.max(...allProducts.map(p => p.totalQty), 1);

  return (
    <div>
      {/* Controls */}
      <div className="card" style={{ marginBottom: 18, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--text)" }}>🔍 Product Sales Tracker</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="fgrp">
            <label>Product / Description</label>
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
              <option value="">All Products</option>
              {allProducts.map(p => <option key={p.description} value={p.description}>{p.description}</option>)}
            </select>
          </div>
          <div className="fgrp">
            <label>Date From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setQuickRange("custom"); }} />
          </div>
          <div className="fgrp">
            <label>Date To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setQuickRange("custom"); }} />
          </div>
        </div>
        {/* Quick range buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["week","Last 7 Days"],["month","Last Month"],["quarter","Last Quarter"],["year","Last Year"],["all","All Time"]].map(([k,l]) => (
            <button key={k} onClick={() => setRange(k)} style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid " + (quickRange===k?"#dd2b0f":"var(--border)"), background: quickRange===k?"#dd2b0f":"var(--white)", color: quickRange===k?"#fff":"var(--text2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)", transition: "all .12s" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="g4" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", marginBottom: 18 }}>
        <div className="kpi" style={{ marginBottom: 0 }}>
          <div className="kpi-label">Products Sold</div>
          <div className="kpi-val" style={{ color: "#dd2b0f" }}>{allProducts.length}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>unique items</div>
        </div>
        <div className="kpi" style={{ marginBottom: 0 }}>
          <div className="kpi-label">Total Units</div>
          <div className="kpi-val" style={{ color: "var(--purple)" }}>{allProducts.reduce((s,p)=>s+p.totalQty,0)}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>across all products</div>
        </div>
        <div className="kpi" style={{ marginBottom: 0 }}>
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-val tg">{fmt(allProducts.reduce((s,p)=>s+p.totalValue,0))}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>from product sales</div>
        </div>
        <div className="kpi" style={{ marginBottom: 0 }}>
          <div className="kpi-label">Invoices</div>
          <div className="kpi-val">{rangedInvoices.length}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>in date range</div>
        </div>
      </div>

      {/* Selected product detail */}
      {selected && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="ch">
            <div><div className="ct">📦 {selected.description}</div><div className="cs">{fmtDate(dateFrom)} — {fmtDate(dateTo)}</div></div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>Units Sold</div><div style={{ fontSize: 22, fontWeight: 800, color: "#dd2b0f" }}>{selected.totalQty}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>Revenue</div><div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)" }}>{fmt(selected.totalValue)}</div></div>
            </div>
          </div>
          {/* Agent breakdown */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Sales by Agent</div>
            {Object.entries(selected.agentBreakdown).sort((a,b)=>b[1]-a[1]).map(([name, qty]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius:0, background: "#201e1d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{name[0]?.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#dd2b0f" }}>{qty} units</span>
                  </div>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: Math.round((qty/selected.totalQty)*100)+"%", height: "100%", background: "#dd2b0f", borderRadius: 3, transition: "width .5s var(--ease)" }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "var(--text3)", minWidth: 36 }}>{Math.round((qty/selected.totalQty)*100)}%</span>
              </div>
            ))}
          </div>
          {/* Daily sales mini chart */}
          {Object.keys(selected.dailySales).length > 1 && (
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Daily Sales</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
                {Object.entries(selected.dailySales).sort((a,b)=>a[0].localeCompare(b[0])).map(([day, qty]) => {
                  const maxDay = Math.max(...Object.values(selected.dailySales));
                  return (
                    <div key={day} title={fmtDate(day) + ": " + qty + " units"} style={{ flex: 1, background: "#dd2b0f", borderRadius: "2px 2px 0 0", height: Math.max(4, Math.round((qty/maxDay)*56))+"px", opacity: 0.75, cursor: "pointer", transition: "opacity .1s" }} onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=.75} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All products table */}
      <div className="card">
        <div className="ch">
          <div><div className="ct">All Products — {fmtDate(dateFrom)} to {fmtDate(dateTo)}</div><div className="cs">{allProducts.length} products · {rangedInvoices.length} invoices</div></div>
        </div>
        {allProducts.length === 0 ? (
          <EmptyState icon="product" title="No sales data" sub="No products found for this date range. Try expanding the date range or selecting All Time." />
        ) : (
          <div className="tw" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{minWidth:420}}>
            <thead><tr><th>#</th><th>Product / Description</th><th>Units Sold</th><th>Revenue</th><th className="hm">Invoices</th><th className="hm">Avg/Invoice</th><th className="hm">Top Agent</th></tr></thead>
            <tbody>
              {allProducts.map((p, i) => (
                <tr key={p.description} style={{ cursor: "pointer", background: selectedProduct===p.description?"rgba(221,43,15,.10)":"transparent" }} onClick={() => setSelectedProduct(selectedProduct===p.description?"":p.description)}>
                  <td style={{ fontWeight: 700, color: "var(--text3)", fontSize: 12 }}>{i+1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.description}</div>
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 5, overflow: "hidden", maxWidth: 120 }}>
                      <div style={{ width: Math.round((p.totalQty/maxQty)*100)+"%", height: "100%", background: "#dd2b0f", borderRadius: 2 }} />
                    </div>
                  </td>
                  <td><span className="mono" style={{ fontWeight: 800, color: "#dd2b0f", fontSize: 15 }}>{p.totalQty}</span></td>
                  <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(p.totalValue)}</td>
                  <td className="hm mono" style={{ color: "var(--text2)" }}>{p.invoiceCount}</td>
                  <td className="hm mono" style={{ color: "var(--text2)" }}>{fmt(p.invoiceCount>0?p.totalValue/p.invoiceCount:0)}</td>
                  <td className="hm" style={{ fontSize: 12, color: "var(--text2)" }}>
                    {Object.entries(p.agentBreakdown).sort((a,b)=>b[1]-a[1])[0]?.[0]?.split(" ")[0] || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}


