import React, { useState, useEffect } from "react";
import { sb } from "../../lib/supabase.js";
import { fmt, fmtDate } from "../../lib/utils.js";
import { toast } from "../../lib/constants.js";

const downloadCsv = (filename, header, rows) => {
  const csv = header.join(",") + "\n" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
};

const SOURCES = {
  invoices: {
    label: "Invoices",
    fields: [
      { key: "invoice_number", label: "Invoice #", type: "text" },
      { key: "customer", label: "Customer", type: "text" },
      { key: "invoice_date", label: "Invoice Date", type: "date" },
      { key: "due_date", label: "Due Date", type: "date" },
      { key: "status", label: "Status", type: "text" },
      { key: "amount", label: "Amount", type: "number" },
      { key: "amount_paid", label: "Amount Paid", type: "number" },
      { key: "balance", label: "Balance", type: "number" },
      { key: "vat_total", label: "VAT", type: "number" },
      { key: "payment_method", label: "Payment Method", type: "text" },
      { key: "agent", label: "Agent", type: "text" },
      { key: "month", label: "Month", type: "text" },
    ],
    defaultFields: ["invoice_number", "customer", "invoice_date", "status", "amount", "balance"],
    groupable: ["customer", "status", "payment_method", "agent", "month"],
    numericFields: ["amount", "amount_paid", "balance", "vat_total"],
  },
  products: {
    label: "Products",
    fields: [
      { key: "name", label: "Product", type: "text" },
      { key: "code", label: "SKU", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "cost_price", label: "Cost Price", type: "number" },
      { key: "sale_price", label: "Sale Price", type: "number" },
      { key: "stock_qty", label: "Stock Qty", type: "number" },
      { key: "vat_rate", label: "VAT Rate", type: "number" },
    ],
    defaultFields: ["name", "category", "stock_qty", "cost_price", "sale_price"],
    groupable: ["category"],
    numericFields: ["cost_price", "sale_price", "stock_qty", "vat_rate"],
  },
  contacts: {
    label: "Customers / Contacts",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "city", label: "City", type: "text" },
    ],
    defaultFields: ["name", "type", "email", "phone"],
    groupable: ["type", "city"],
    numericFields: [],
  },
  purchases: {
    label: "Purchases / Vendors",
    fields: [
      { key: "po_number", label: "PO #", type: "text" },
      { key: "supplier", label: "Vendor", type: "text" },
      { key: "order_date", label: "Order Date", type: "date" },
      { key: "product_name", label: "Product", type: "text" },
      { key: "qty", label: "Qty", type: "number" },
      { key: "unit_cost", label: "Unit Cost", type: "number" },
      { key: "vat_rate", label: "VAT Rate", type: "number" },
      { key: "total", label: "Line Total (excl VAT)", type: "number" },
      { key: "vat_amount", label: "VAT Amount", type: "number" },
      { key: "status", label: "PO Status", type: "text" },
      { key: "month", label: "Month", type: "text" },
    ],
    defaultFields: ["po_number", "supplier", "order_date", "product_name", "qty", "total"],
    groupable: ["supplier", "product_name", "status", "month"],
    numericFields: ["qty", "unit_cost", "total", "vat_amount"],
  },
};

const OPS_BY_TYPE = {
  text: [["contains", "Contains"], ["equals", "Equals"]],
  number: [["eq", "="], ["gt", ">"], ["gte", "≥"], ["lt", "<"], ["lte", "≤"]],
  date: [["on_or_after", "On/After"], ["on_or_before", "On/Before"]],
};

const blankFilter = () => ({ field: "", op: "", value: "" });

export function CustomReportBuilder({ invoices, products, contacts, allProfiles, purchaseOrders = [], purchaseOrderLines = [], token, userId, profile }) {
  const [source, setSource] = useState("invoices");
  const [selectedFields, setSelectedFields] = useState(SOURCES.invoices.defaultFields);
  const [filters, setFilters] = useState([blankFilter()]);
  const [groupBy, setGroupBy] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [results, setResults] = useState(null);
  const [saved, setSaved] = useState([]);
  const [savingName, setSavingName] = useState("");
  const [showSaveBox, setShowSaveBox] = useState(false);

  const meta = SOURCES[source];
  const purchasesJoined = purchaseOrderLines.map(l => {
    const po = purchaseOrders.find(p => p.id === l.po_id) || {};
    return { ...l, po_number: po.po_number, supplier: po.supplier_name, order_date: po.order_date, status: po.status, vat_amount: (parseFloat(l.total) || 0) * (parseFloat(l.vat_rate) || 0) / 100 };
  });
  const rawData = source === "invoices" ? invoices : source === "products" ? products : source === "purchases" ? purchasesJoined : contacts;

  useEffect(() => {
    if (!token) return;
    sb.get(token, "custom_reports", "order=created_at.desc").then(d => Array.isArray(d) && setSaved(d));
  }, [token]);

  const enrichRow = (row) => {
    if (source === "invoices") {
      const agent = allProfiles?.find(p => p.id === row.created_by)?.full_name || "Unknown";
      const d = new Date(row.invoice_date || row.created_at);
      const month = isNaN(d) ? "" : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      return { ...row, agent, month };
    }
    if (source === "purchases") {
      const d = new Date(row.order_date || row.created_at);
      const month = isNaN(d) ? "" : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      return { ...row, month };
    }
    return row;
  };

  const switchSource = (s) => {
    setSource(s);
    setSelectedFields(SOURCES[s].defaultFields);
    setFilters([blankFilter()]);
    setGroupBy("");
    setSortField("");
    setResults(null);
  };

  const toggleField = (key) => setSelectedFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  const updateFilter = (i, patch) => setFilters(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const addFilter = () => setFilters(prev => [...prev, blankFilter()]);
  const removeFilter = (i) => setFilters(prev => prev.filter((_, idx) => idx !== i));

  const matchesFilter = (row, f) => {
    if (!f.field || !f.op) return true;
    const fieldMeta = meta.fields.find(x => x.key === f.field);
    const val = row[f.field];
    if (fieldMeta?.type === "text") {
      const a = String(val ?? "").toLowerCase();
      const b = String(f.value ?? "").toLowerCase();
      if (!b) return true;
      return f.op === "contains" ? a.includes(b) : a === b;
    }
    if (fieldMeta?.type === "number") {
      const a = parseFloat(val) || 0;
      const b = parseFloat(f.value);
      if (isNaN(b)) return true;
      if (f.op === "eq") return a === b;
      if (f.op === "gt") return a > b;
      if (f.op === "gte") return a >= b;
      if (f.op === "lt") return a < b;
      if (f.op === "lte") return a <= b;
    }
    if (fieldMeta?.type === "date") {
      if (!f.value) return true;
      const a = new Date(val).getTime();
      const b = new Date(f.value).getTime();
      if (isNaN(a) || isNaN(b)) return true;
      return f.op === "on_or_after" ? a >= b : a <= b;
    }
    return true;
  };

  const runReport = () => {
    let rows = rawData.map(enrichRow).filter(row => filters.every(f => matchesFilter(row, f)));
    if (sortField) {
      const fieldMeta = meta.fields.find(x => x.key === sortField);
      rows = [...rows].sort((a, b) => {
        const av = fieldMeta?.type === "number" ? parseFloat(a[sortField]) || 0 : String(a[sortField] ?? "");
        const bv = fieldMeta?.type === "number" ? parseFloat(b[sortField]) || 0 : String(b[sortField] ?? "");
        const cmp = av > bv ? 1 : av < bv ? -1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    if (groupBy) {
      const groups = {};
      rows.forEach(row => {
        const key = row[groupBy] || "(none)";
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });
      const groupRows = Object.entries(groups).map(([key, groupRows]) => ({
        key, rows: groupRows,
        totals: Object.fromEntries(meta.numericFields.map(nf => [nf, groupRows.reduce((s, r) => s + (parseFloat(r[nf]) || 0), 0)])),
      })).sort((a, b) => b.rows.length - a.rows.length);
      setResults({ grouped: true, groups: groupRows, count: rows.length });
    } else {
      setResults({ grouped: false, rows, count: rows.length });
    }
  };

  const exportCsv = () => {
    if (!results) return;
    const header = selectedFields.map(k => meta.fields.find(f => f.key === k)?.label || k);
    const flatRows = results.grouped ? results.groups.flatMap(g => g.rows) : results.rows;
    const csvRows = flatRows.map(row => selectedFields.map(k => {
      const fieldMeta = meta.fields.find(f => f.key === k);
      return fieldMeta?.type === "date" ? fmtDate(row[k]) : row[k];
    }));
    downloadCsv(`custom-report-${source}-${Date.now()}.csv`, header, csvRows);
  };

  const saveReport = async () => {
    if (!savingName.trim()) { toast.error("Enter a report name"); return; }
    const config = { source, selectedFields, filters, groupBy, sortField, sortDir };
    const res = await sb.post(token, "custom_reports", { name: savingName.trim(), config, created_by: userId, created_by_name: profile?.full_name || "Admin" });
    if (res?.[0]) {
      setSaved(prev => [res[0], ...prev]);
      toast.success("Report saved");
      setSavingName(""); setShowSaveBox(false);
    } else toast.error("Failed to save report");
  };

  const loadReport = (r) => {
    const c = r.config;
    setSource(c.source);
    setSelectedFields(c.selectedFields);
    setFilters(c.filters?.length ? c.filters : [blankFilter()]);
    setGroupBy(c.groupBy || "");
    setSortField(c.sortField || "");
    setSortDir(c.sortDir || "desc");
    setResults(null);
    toast.success(`Loaded "${r.name}"`);
  };

  const deleteReport = async (id) => {
    await sb.del(token, "custom_reports", id);
    setSaved(prev => prev.filter(r => r.id !== id));
    toast.success("Report deleted");
  };

  return (
    <div>
      {saved.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>Saved Reports</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {saved.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }}>
                <button onClick={() => loadReport(r)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--blue)", fontFamily: "var(--sans)" }}>{r.name}</button>
                <span style={{ fontSize: 10, color: "var(--text3)" }}>({SOURCES[r.config?.source]?.label || r.config?.source})</span>
                <button onClick={() => deleteReport(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 13, padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {Object.entries(SOURCES).map(([key, s]) => (
            <button key={key} onClick={() => switchSource(key)} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid " + (source === key ? "var(--blue)" : "var(--border)"), background: source === key ? "var(--blue)" : "var(--white)", color: source === key ? "#fff" : "var(--text2)", fontSize: 12, fontWeight: source === key ? 700 : 500, cursor: "pointer", fontFamily: "var(--sans)" }}>{s.label}</button>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>Fields to show</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {meta.fields.map(f => (
            <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, background: selectedFields.includes(f.key) ? "var(--blue-lt)" : "var(--bg)", border: "1px solid " + (selectedFields.includes(f.key) ? "var(--blue)" : "var(--border)"), fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={selectedFields.includes(f.key)} onChange={() => toggleField(f.key)} style={{ margin: 0 }} />
              {f.label}
            </label>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>Filters</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {filters.map((f, i) => {
            const fieldMeta = meta.fields.find(x => x.key === f.field);
            return (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={f.field} onChange={e => updateFilter(i, { field: e.target.value, op: "" })} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, fontFamily: "var(--sans)", minWidth: 130 }}>
                  <option value="">Field...</option>
                  {meta.fields.map(f2 => <option key={f2.key} value={f2.key}>{f2.label}</option>)}
                </select>
                <select value={f.op} onChange={e => updateFilter(i, { op: e.target.value })} disabled={!fieldMeta} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, fontFamily: "var(--sans)", minWidth: 110 }}>
                  <option value="">Condition...</option>
                  {fieldMeta && OPS_BY_TYPE[fieldMeta.type].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input type={fieldMeta?.type === "date" ? "date" : fieldMeta?.type === "number" ? "number" : "text"} value={f.value} onChange={e => updateFilter(i, { value: e.target.value })} placeholder="Value" style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, fontFamily: "var(--sans)", flex: 1, maxWidth: 180 }} />
                <button onClick={() => removeFilter(i)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
              </div>
            );
          })}
          <button onClick={addFilter} style={{ alignSelf: "flex-start", background: "none", border: "1px dashed var(--border2)", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "var(--text2)", cursor: "pointer", fontFamily: "var(--sans)" }}>+ Add filter</button>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>Group by</div>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, fontFamily: "var(--sans)" }}>
              <option value="">No grouping</option>
              {meta.groupable.map(g => <option key={g} value={g}>{meta.fields.find(f => f.key === g)?.label || g}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>Sort by</div>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={sortField} onChange={e => setSortField(e.target.value)} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, fontFamily: "var(--sans)" }}>
                <option value="">None</option>
                {meta.fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <select value={sortDir} onChange={e => setSortDir(e.target.value)} disabled={!sortField} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, fontFamily: "var(--sans)" }}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn bp" onClick={runReport} disabled={selectedFields.length === 0}>Run Report</button>
          {results && <button className="btn bo bsm" onClick={exportCsv}>Export CSV</button>}
          {results && !showSaveBox && <button className="btn bo bsm" onClick={() => setShowSaveBox(true)}>Save Report</button>}
          {showSaveBox && (
            <>
              <input value={savingName} onChange={e => setSavingName(e.target.value)} placeholder="Report name..." style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, fontFamily: "var(--sans)" }} onKeyDown={e => e.key === "Enter" && saveReport()} />
              <button className="btn bp bsm" onClick={saveReport}>Save</button>
              <button className="btn bo bsm" onClick={() => setShowSaveBox(false)}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {results && (
        <div className="card">
          <div className="ch"><div className="ct">Results</div><div className="cs">{results.count} record{results.count !== 1 ? "s" : ""}{groupBy ? ` · ${results.groups.length} group${results.groups.length !== 1 ? "s" : ""}` : ""}</div></div>
          <div className="tw" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ minWidth: 420 }}>
              <thead><tr>{selectedFields.map(k => <th key={k}>{meta.fields.find(f => f.key === k)?.label || k}</th>)}</tr></thead>
              <tbody>
                {results.grouped ? results.groups.map(g => (
                  <React.Fragment key={g.key}>
                    <tr style={{ background: "#f1f5f9" }}><td colSpan={selectedFields.length} style={{ fontWeight: 700, fontSize: 12 }}>{g.key} ({g.rows.length})</td></tr>
                    {g.rows.map((row, i) => (
                      <tr key={i}>{selectedFields.map(k => {
                        const fieldMeta = meta.fields.find(f => f.key === k);
                        const val = row[k];
                        return <td key={k} className={fieldMeta?.type === "number" ? "mono" : undefined}>{fieldMeta?.type === "date" ? fmtDate(val) : fieldMeta?.type === "number" && meta.numericFields.includes(k) ? fmt(val) : String(val ?? "—")}</td>;
                      })}</tr>
                    ))}
                    {meta.numericFields.some(nf => selectedFields.includes(nf)) && (
                      <tr style={{ background: "#fafbfc", fontWeight: 700 }}>{selectedFields.map(k => <td key={k} className="mono">{meta.numericFields.includes(k) ? fmt(g.totals[k]) : (k === selectedFields[0] ? "Subtotal" : "")}</td>)}</tr>
                    )}
                  </React.Fragment>
                )) : results.rows.map((row, i) => (
                  <tr key={i}>{selectedFields.map(k => {
                    const fieldMeta = meta.fields.find(f => f.key === k);
                    const val = row[k];
                    return <td key={k} className={fieldMeta?.type === "number" ? "mono" : undefined}>{fieldMeta?.type === "date" ? fmtDate(val) : fieldMeta?.type === "number" && meta.numericFields.includes(k) ? fmt(val) : String(val ?? "—")}</td>;
                  })}</tr>
                ))}
                {results.count === 0 && <tr><td colSpan={selectedFields.length} className="empty">No records match these filters</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
