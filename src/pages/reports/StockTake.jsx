import React, { useState, useMemo } from "react";
import { sb } from "../../lib/supabase.js";
import { fmt, DEFAULT_REORDER, isMobile } from "../../lib/utils.js";
import { logAudit } from "../../lib/audit.js";
import { logStockMovement } from "../../lib/stock.js";
import { MobileCard, TruncationNotice } from "../../components/ui.jsx";

const ST_MOB_CAP = 60, ST_DESK_CAP = 100; // products shown before truncation (mobile / desktop)

// ── STOCK TAKE / CYCLE COUNT ──────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ StockTake                                                  │
// │ Bulk physical count → variance vs system → post adjustments│
// │ Each posted line writes a stock_movement (reason "count")  │
// │ so the corrections flow through the movement ledger.       │
// └────────────────────────────────────────────────────────────┘
export function StockTake({ products, setProducts, token, userId, profile }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [counts, setCounts] = useState({});          // { [id]: string }  physical count entered
  const [confirm, setConfirm] = useState(false);     // confirmation modal open
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState(null);      // summary after posting

  const userName = profile?.name || profile?.full_name || null;

  const cats = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), [products]);

  const filtered = products.filter(p => {
    if (cat && (p.category || "") !== cat) return false;
    const q = query.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
  });

  // A counted line = a value has been typed (even "0" is a valid count).
  const lineOf = (p) => {
    const raw = counts[p.id];
    const has = raw !== undefined && raw !== "";
    const val = has ? Math.max(0, parseInt(raw) || 0) : null;
    const sys = parseFloat(p.stock_qty) || 0;
    const variance = has ? val - sys : 0;
    return { raw, has, val, sys, variance };
  };

  // Everything with a count entered that differs from the system figure.
  const changes = products
    .map(p => ({ p, ...lineOf(p) }))
    .filter(x => x.has && x.variance !== 0);

  const countedCount = products.filter(p => lineOf(p).has).length;
  const netUnits = changes.reduce((s, x) => s + x.variance, 0);
  const varianceValue = changes.reduce((s, x) => s + x.variance * (parseFloat(x.p.cost_price) || 0), 0);

  const setCount = (id, v) => setCounts(prev => ({ ...prev, [id]: v.replace(/[^\d]/g, "") }));
  const matchToSystem = (p) => setCounts(prev => ({ ...prev, [p.id]: String(p.stock_qty || 0) }));

  const post = async () => {
    if (!changes.length) return;
    setPosting(true);
    const ref = "ST-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Date.now().toString().slice(-4);
    const done = [];
    for (const { p, val, variance } of changes) {
      try {
        await sb.patch(token, "products", p.id, { stock_qty: val });
        logAudit(token, userId, "stock_counted", "product", p.id, `${p.name} stock take: ${p.stock_qty} → ${val} ${p.unit || "units"} (${variance > 0 ? "+" : ""}${variance}) [${ref}]`);
        logStockMovement(token, { product: p, delta: variance, balance_after: val, reason: "count", ref_type: "stock_take", ref_id: ref, note: "Stock take", userId, userName });
        done.push({ p, val, variance });
      } catch (_) { /* keep going, report what succeeded */ }
    }
    setProducts(prev => prev.map(pr => {
      const hit = done.find(d => d.p.id === pr.id);
      return hit ? { ...pr, stock_qty: hit.val } : pr;
    }));
    setResults({
      ref,
      count: done.length,
      netUnits: done.reduce((s, d) => s + d.variance, 0),
      value: done.reduce((s, d) => s + d.variance * (parseFloat(d.p.cost_price) || 0), 0),
      lines: done,
    });
    setCounts({});
    setConfirm(false);
    setPosting(false);
  };

  // ── Results screen ──────────────────────────────────────────────────────────
  if (results) {
    return (
      <div>
        <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(22,163,74,.14) 0%,transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#4ade80", marginBottom: 6 }}>Stock take posted</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Count <span style={{ color: "#4ade80" }}>complete</span></div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", fontFamily: "var(--mono)" }}>Ref {results.ref}</div>
          </div>
        </div>
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
            {[
              { label: "Lines adjusted", val: String(results.count), accent: "#57534e" },
              { label: "Net units", val: `${results.netUnits > 0 ? "+" : ""}${results.netUnits}`, accent: results.netUnits === 0 ? "#57534e" : results.netUnits > 0 ? "#16a34a" : "#dc2626" },
              { label: "Variance value", val: `${results.value < 0 ? "−" : ""}${fmt(Math.abs(results.value))}`, accent: results.value < 0 ? "#dc2626" : "#16a34a" },
            ].map((k, i) => (
              <div key={i} style={{ padding: "12px 14px", background: "var(--bg)", borderTop: `3px solid ${k.accent}`, borderRadius: "var(--r)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--mono)", color: k.accent }}>{k.val}</div>
              </div>
            ))}
          </div>
          <div className="tw" style={{ overflowX: "auto" }}>
            <table className="sa-table" style={{ minWidth: 360 }}>
              <thead><tr><th>Product</th><th style={{ textAlign: "right" }}>Was</th><th style={{ textAlign: "right" }}>Counted</th><th style={{ textAlign: "right" }}>Variance</th></tr></thead>
              <tbody>
                {results.lines.map(({ p, val, variance }) => (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{p.code || ""}</div></td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--text3)" }}>{val - variance}</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{val}</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: variance > 0 ? "var(--green)" : "var(--red)" }}>{variance > 0 ? "+" : ""}{variance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <button className="btn bp" onClick={() => setResults(null)}>Start a new count</button>
      </div>
    );
  }

  // ── Count sheet ───────────────────────────────────────────────────────────────
  const lowVal = products.filter(p => p.stock_qty <= (p.reorder_level || DEFAULT_REORDER)).length;
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Inventory</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Stock <span style={{ background: "linear-gradient(135deg,#ff6a4d,#dd2b0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Take</span></div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Count physical stock, review variances, post the corrections in one go</div>
        </div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[
            { label: "Counted", val: `${countedCount}/${products.length}`, sub: "lines entered", accent: "#dd2b0f" },
            { label: "Variances", val: String(changes.length), sub: "lines differ", accent: changes.length > 0 ? "#f59e0b" : "#16a34a" },
            { label: "Net units", val: `${netUnits > 0 ? "+" : ""}${netUnits}`, sub: "vs system", accent: netUnits === 0 ? "#57534e" : netUnits > 0 ? "#16a34a" : "#dc2626" },
            { label: "Variance value", val: `${varianceValue < 0 ? "−" : ""}${fmt(Math.abs(varianceValue))}`, sub: "at cost", accent: varianceValue < 0 ? "#dc2626" : varianceValue > 0 ? "#16a34a" : "#57534e" },
          ].map((k, i) => (
            <div key={i} style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ flex: "1 1 240px", background: "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }} placeholder="🔍  Search products by name, SKU or category..." value={query} onChange={e => setQuery(e.target.value)} />
          <select value={cat} onChange={e => setCat(e.target.value)} style={{ background: "var(--white)", border: "0.5px solid var(--border2)", borderRadius: "var(--r)", padding: "10px 12px", fontSize: 13, outline: "none", minHeight: isMobile() ? 44 : undefined }}>
            <option value="">All categories</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {countedCount > 0 && <button className="btn bg2 bsm" onClick={() => setCounts({})}>Clear counts</button>}
        </div>

        {isMobile() ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
            {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No products found</div>}
            {filtered.slice(0, ST_MOB_CAP).map(p => {
              const l = lineOf(p);
              return (
                <MobileCard
                  key={p.id}
                  title={p.name}
                  subtitle={`${p.code || "—"}${p.category ? " · " + p.category : ""}`}
                  value={String(p.stock_qty || 0)}
                  valueSub="system"
                  accent={l.has && l.variance !== 0 ? (l.variance > 0 ? "#16a34a" : "#ef4444") : undefined}
                  footer={
                    <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Counted</div>
                        <input type="text" inputMode="numeric" value={l.raw ?? ""} placeholder="—" onChange={e => setCount(p.id, e.target.value)} style={{ width: "100%", height: 44, textAlign: "center", border: "1px solid var(--border2)", borderRadius: "var(--rl)", fontSize: 16, fontWeight: 700, fontFamily: "var(--mono)", outline: "none" }} />
                      </div>
                      <div style={{ width: 90, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Variance</div>
                        <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, fontFamily: "var(--mono)", color: !l.has ? "var(--text3)" : l.variance === 0 ? "var(--text3)" : l.variance > 0 ? "var(--green)" : "var(--red)" }}>{l.has ? `${l.variance > 0 ? "+" : ""}${l.variance}` : "—"}</div>
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="tw" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="sa-table" style={{ minWidth: 560 }}>
              <thead><tr><th>Product</th><th>Category</th><th style={{ textAlign: "right" }}>System</th><th style={{ textAlign: "center" }}>Counted</th><th style={{ textAlign: "right" }}>Variance</th><th></th></tr></thead>
              <tbody>
                {filtered.slice(0, ST_DESK_CAP).map(p => {
                  const l = lineOf(p);
                  return (
                    <tr key={p.id} style={{ background: l.has && l.variance !== 0 ? "var(--bg)" : "transparent" }}>
                      <td><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{p.code || ""}</div></td>
                      <td><span className="tag">{p.category || "General"}</span></td>
                      <td className="mono" style={{ textAlign: "right", fontWeight: 600, fontSize: 15 }}>{p.stock_qty || 0}</td>
                      <td style={{ textAlign: "center" }}>
                        <input type="number" min="0" style={{ width: 80, textAlign: "center", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 8px", fontSize: 14, fontWeight: 700, outline: "none", fontFamily: "var(--mono)" }} value={l.raw ?? ""} onChange={e => setCount(p.id, e.target.value)} placeholder="—" />
                      </td>
                      <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: !l.has ? "var(--text3)" : l.variance === 0 ? "var(--text3)" : l.variance > 0 ? "var(--green)" : "var(--red)" }}>{l.has ? `${l.variance > 0 ? "+" : ""}${l.variance}` : "—"}</td>
                      <td style={{ textAlign: "right" }}>{!l.has && <button className="btn bg2 bsm" onClick={() => matchToSystem(p)} title="Set counted = system">✓ match</button>}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} className="empty">No products found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <TruncationNotice shown={Math.min(filtered.length, isMobile() ? ST_MOB_CAP : ST_DESK_CAP)} total={filtered.length} noun="products" />
      </div>

      {/* Sticky action bar */}
      <div style={{ position: "sticky", bottom: 0, zIndex: 5, background: "var(--white)", borderTop: "1px solid var(--border)", padding: "14px 16px", margin: "0 -28px -26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", boxShadow: "0 -4px 16px rgba(0,0,0,.05)" }}>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>
          {changes.length === 0
            ? <span style={{ color: "var(--text3)" }}>Enter counts to see variances</span>
            : <span><strong style={{ color: "var(--text)" }}>{changes.length}</strong> line{changes.length !== 1 ? "s" : ""} to adjust · net <strong style={{ color: netUnits > 0 ? "var(--green)" : netUnits < 0 ? "var(--red)" : "var(--text)", fontFamily: "var(--mono)" }}>{netUnits > 0 ? "+" : ""}{netUnits}</strong> units</span>}
        </div>
        <button className="btn bp" style={{ minHeight: isMobile() ? 44 : undefined }} disabled={changes.length === 0 || posting} onClick={() => setConfirm(true)}>Review &amp; post ({changes.length})</button>
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(10,14,26,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => !posting && setConfirm(false)}>
          <div className="card" style={{ maxWidth: 480, width: "100%", maxHeight: "86vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 20px", borderBottom: "0.5px solid var(--border)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.3px" }}>Post stock take</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>These {changes.length} product{changes.length !== 1 ? "s" : ""} will be corrected to the counted figure. Each writes to the stock ledger.</div>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 0" }}>
              {changes.map(({ p, val, variance }) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px", gap: 12 }}>
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{p.code || ""}</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, fontFamily: "var(--mono)", fontSize: 13 }}>
                    <span style={{ color: "var(--text3)" }}>{p.stock_qty || 0}</span>
                    <span style={{ color: "var(--text3)" }}>→</span>
                    <span style={{ fontWeight: 700 }}>{val}</span>
                    <span style={{ fontWeight: 700, minWidth: 40, textAlign: "right", color: variance > 0 ? "var(--green)" : "var(--red)" }}>{variance > 0 ? "+" : ""}{variance}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 20px", borderTop: "0.5px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn bg2" disabled={posting} onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn bp" disabled={posting} onClick={post}>{posting ? "Posting..." : `Confirm & post ${changes.length}`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
