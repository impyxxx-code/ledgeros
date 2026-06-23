import React, { useState } from "react";
import { sb } from "../lib/supabase.js";
import { fmt, today } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { toast } from "../lib/constants.js";

// ── Minimal CSV parser — handles quoted fields containing commas ──────────────
const parseCsv = (text) => {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i+1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n' || c === '\r') {
        if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
        if (c === '\r' && next === '\n') i++;
      } else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { headers: [], rows: [] };
  return { headers: rows[0].map(h => h.trim()), rows: rows.slice(1).filter(r => r.some(c => c.trim() !== "")) };
};

const IMPORT_TYPES = {
  contacts: {
    label: "Customers / Suppliers",
    targetFields: [
      { key: "name", label: "Name", required: true },
      { key: "type", label: "Type (customer/supplier/both)" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "postcode", label: "Postcode" },
    ],
  },
  products: {
    label: "Products",
    targetFields: [
      { key: "name", label: "Name", required: true },
      { key: "code", label: "SKU / Code" },
      { key: "category", label: "Category" },
      { key: "cost_price", label: "Cost Price" },
      { key: "sale_price", label: "Sale Price" },
      { key: "vat_rate", label: "VAT Rate" },
      { key: "stock_qty", label: "Stock Qty" },
      { key: "reorder_level", label: "Reorder Level" },
      { key: "unit", label: "Unit" },
    ],
  },
  openingBalances: {
    label: "Opening Balances",
    targetFields: [
      { key: "customer_name", label: "Customer Name", required: true },
      { key: "balance", label: "Outstanding Balance", required: true },
      { key: "as_of_date", label: "As-Of Date" },
      { key: "due_date", label: "Due Date" },
      { key: "reference", label: "Reference / Old Invoice #" },
    ],
  },
};

const guessMapping = (headers, targetFields) => {
  const map = {};
  targetFields.forEach(tf => {
    const match = headers.find(h => h.toLowerCase().replace(/[^a-z]/g, "") === tf.key.toLowerCase().replace(/[^a-z]/g, ""))
      || headers.find(h => h.toLowerCase().includes(tf.label.toLowerCase().split(" ")[0]));
    if (match) map[tf.key] = match;
  });
  return map;
};

export function CsvImport({ contacts, setContacts, products, setProducts, invoices, setInvoices, token, userId }) {
  const [importType, setImportType] = useState("contacts");
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const config = IMPORT_TYPES[importType];

  const switchType = (t) => {
    setImportType(t); setCsvText(""); setParsed(null); setMapping({}); setResult(null);
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvText(text);
      const p = parseCsv(text);
      setParsed(p);
      setMapping(guessMapping(p.headers, config.targetFields));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handlePasteParse = () => {
    const p = parseCsv(csvText);
    setParsed(p);
    setMapping(guessMapping(p.headers, config.targetFields));
    setResult(null);
  };

  const getMappedRows = () => {
    if (!parsed) return [];
    const colIndex = {};
    config.targetFields.forEach(tf => { if (mapping[tf.key]) colIndex[tf.key] = parsed.headers.indexOf(mapping[tf.key]); });
    return parsed.rows.map(r => {
      const obj = {};
      config.targetFields.forEach(tf => { obj[tf.key] = colIndex[tf.key] != null && colIndex[tf.key] >= 0 ? (r[colIndex[tf.key]] || "").trim() : ""; });
      return obj;
    });
  };

  const mappedRows = getMappedRows();
  const requiredFields = config.targetFields.filter(f => f.required).map(f => f.key);
  const missingRequired = requiredFields.some(k => !mapping[k]);

  const runImport = async () => {
    setImporting(true);
    let success = 0, failed = 0, skipped = 0;
    const rows = mappedRows.filter(r => requiredFields.every(k => r[k]));
    skipped = mappedRows.length - rows.length;

    if (importType === "contacts") {
      for (const r of rows) {
        const type = ["customer", "supplier", "both"].includes((r.type || "").toLowerCase()) ? r.type.toLowerCase() : "customer";
        const data = await sb.post(token, "contacts", { name: r.name, type, email: r.email || null, phone: r.phone || null, address: r.address || null, city: r.city || null, postcode: r.postcode || null, created_by: userId }).catch(() => null);
        if (data?.[0]) { success++; setContacts(prev => [data[0], ...prev]); } else failed++;
      }
      logAudit(token, userId, "csv_import", "contact", null, `CSV import: ${success} contacts imported, ${failed} failed, ${skipped} skipped (missing required fields)`);
    }

    if (importType === "products") {
      for (const r of rows) {
        const data = await sb.post(token, "products", {
          name: r.name, code: r.code || null, category: r.category || null,
          cost_price: parseFloat(r.cost_price) || 0, sale_price: parseFloat(r.sale_price) || 0,
          vat_rate: parseFloat(r.vat_rate) || 20, stock_qty: parseFloat(r.stock_qty) || 0,
          reorder_level: parseFloat(r.reorder_level) || 0, unit: r.unit || "unit", created_by: userId,
        }).catch(() => null);
        if (data?.[0]) { success++; setProducts(prev => [data[0], ...prev]); } else failed++;
      }
      logAudit(token, userId, "csv_import", "product", null, `CSV import: ${success} products imported, ${failed} failed, ${skipped} skipped (missing required fields)`);
    }

    if (importType === "openingBalances") {
      const existingNums = await sb.get(token, "invoices", "invoice_number=like.OB-*&select=invoice_number&order=invoice_number.desc&limit=1");
      let nextNum = 1;
      if (Array.isArray(existingNums) && existingNums[0]?.invoice_number) {
        const lastNum = parseInt(existingNums[0].invoice_number.replace("OB-", ""), 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      for (const r of rows) {
        const balance = parseFloat(r.balance);
        if (!balance || balance <= 0) { skipped++; continue; }
        const cust = contacts.find(c => c.name.toLowerCase() === r.customer_name.toLowerCase());
        if (!cust) { failed++; continue; }
        const asOf = r.as_of_date || today();
        const dueDate = r.due_date || asOf;
        const isOverdue = new Date(dueDate) < new Date(today());
        const invoice_number = `OB-${String(nextNum).padStart(4, "0")}`;
        nextNum++;
        const data = await sb.post(token, "invoices", {
          customer: cust.name, invoice_date: asOf, due_date: dueDate,
          status: isOverdue ? "overdue" : "pending",
          notes: `Opening balance migrated from previous system${r.reference ? " — ref: " + r.reference : ""}`,
          amount: balance, subtotal: balance, vat_total: 0, balance, amount_paid: 0,
          invoice_number, created_by: userId,
          lines: JSON.stringify([{ description: "Opening Balance (migrated)", qty: 1, unit_price: balance, vat_rate: 0 }]),
        }).catch(() => null);
        if (data?.[0]) { success++; setInvoices(prev => [data[0], ...prev]); } else failed++;
      }
      logAudit(token, userId, "csv_import", "invoice", null, `CSV import: ${success} opening balances imported, ${failed} failed (customer not found), ${skipped} skipped`);
    }

    setResult({ success, failed, skipped });
    setImporting(false);
    if (success > 0) toast.success(`Imported ${success} record${success !== 1 ? "s" : ""}`);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {Object.entries(IMPORT_TYPES).map(([key, c]) => (
            <button key={key} onClick={() => switchType(key)} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid " + (importType === key ? "var(--blue)" : "var(--border)"), background: importType === key ? "var(--blue)" : "var(--white)", color: importType === key ? "#fff" : "var(--text2)", fontSize: 12, fontWeight: importType === key ? 700 : 500, cursor: "pointer", fontFamily: "var(--sans)" }}>{c.label}</button>
          ))}
        </div>

        {importType === "openingBalances" && (
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14, padding: "10px 14px", background: "var(--bg)", borderRadius: 8 }}>
            Creates one invoice per row (prefixed <strong>OB-</strong>) for the outstanding balance — the customer must already exist in LedgerOS (import contacts first if needed). Standard migration approach: don't re-import full historical invoice detail, just the amount still owed as of your cut-over date.
          </div>
        )}

        <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
          <div>
            <label className="btn bo bsm" style={{ cursor: "pointer", display: "inline-flex" }}>
              Choose CSV file
              <input type="file" accept=".csv" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        <textarea value={csvText} onChange={e => setCsvText(e.target.value)} placeholder="...or paste CSV content here" style={{ width: "100%", minHeight: 100, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, fontFamily: "var(--mono)", boxSizing: "border-box", marginBottom: 10 }} />
        <button className="btn bp bsm" onClick={handlePasteParse} disabled={!csvText.trim()}>Parse CSV</button>
      </div>

      {parsed && parsed.headers.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>Map Columns ({parsed.rows.length} rows found)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 16 }}>
            {config.targetFields.map(tf => (
              <div key={tf.key}>
                <label style={{ fontSize: 11, color: "var(--text3)", display: "block", marginBottom: 4 }}>{tf.label}{tf.required && <span style={{ color: "var(--red)" }}> *</span>}</label>
                <select value={mapping[tf.key] || ""} onChange={e => setMapping(prev => ({ ...prev, [tf.key]: e.target.value }))} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid " + (tf.required && !mapping[tf.key] ? "var(--red)" : "var(--border)"), fontSize: 12, fontFamily: "var(--sans)" }}>
                  <option value="">Not mapped</option>
                  {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>Preview (first 5 rows)</div>
          <div className="tw" style={{ overflowX: "auto", marginBottom: 16 }}>
            <table style={{ minWidth: 420 }}><thead><tr>{config.targetFields.map(tf => <th key={tf.key}>{tf.label}</th>)}</tr></thead>
              <tbody>{mappedRows.slice(0, 5).map((r, i) => <tr key={i}>{config.targetFields.map(tf => <td key={tf.key} style={{ fontSize: 12 }}>{r[tf.key] || "—"}</td>)}</tr>)}</tbody>
            </table>
          </div>

          {missingRequired && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 12 }}>Map all required fields (marked *) before importing.</div>}
          <button className="btn bp" onClick={runImport} disabled={importing || missingRequired}>{importing ? "Importing..." : `Import ${mappedRows.length} rows`}</button>
        </div>
      )}

      {result && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Import Complete</div>
          <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
            <span style={{ color: "var(--green)" }}>✓ {result.success} imported</span>
            {result.failed > 0 && <span style={{ color: "var(--red)" }}>✕ {result.failed} failed{importType === "openingBalances" ? " (customer not found)" : ""}</span>}
            {result.skipped > 0 && <span style={{ color: "var(--amber)" }}>⚠ {result.skipped} skipped (missing required data)</span>}
          </div>
        </div>
      )}
    </div>
  );
}
