import { useState, useRef } from "react";

const SUPABASE_URL = "https://szcogfyrhlrsxnwepnea.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Y29nZnlyaGxyc3hud2VwbmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODY1MzEsImV4cCI6MjA5NDA2MjUzMX0.oU60PfFsb0QHmn1qKasNKIxS8G30xhiMDxAPtMQTNT4";

// ── STYLES ────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#f4f5f7;--white:#fff;--border:#e2e5e9;--border2:#d0d5dd;
    --text:#1a1d23;--text2:#6b7280;--text3:#9ca3af;
    --green:#0d9f6e;--green-bg:#ecfdf5;--green-lt:#d1fae5;
    --red:#dc2626;--red-bg:#fef2f2;--red-lt:#fee2e2;
    --blue:#2563eb;--blue-bg:#eff6ff;--amber:#d97706;--amber-bg:#fffbeb;
    --qb:#2ca01c;--qb-dark:#1a3a2a;
    --sans:'DM Sans',sans-serif;--mono:'DM Mono',monospace;
    --sh:0 1px 3px rgba(0,0,0,.08);
  }
  body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;padding:24px}
  .wrap{max-width:1000px;margin:0 auto}
  .header{display:flex;align-items:center;gap:12px;margin-bottom:28px}
  .logo{width:40px;height:40px;background:var(--qb);border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:16px}
  .header-text h1{font-size:20px;font-weight:700}
  .header-text p{font-size:13px;color:var(--text2);margin-top:2px}
  .tabs{display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:24px}
  .tab{padding:10px 24px;font-size:13px;font-weight:600;color:var(--text2);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .15s;text-transform:uppercase;letter-spacing:.4px}
  .tab:hover{color:var(--text)}
  .tab.active{color:var(--qb);border-bottom-color:var(--qb)}
  .card{background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:var(--sh);margin-bottom:20px;overflow:hidden}
  .ch{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .ct{font-size:14px;font-weight:600}
  .cs{font-size:12px;color:var(--text3)}
  /* DROP ZONE */
  .dropzone{border:2px dashed var(--border2);border-radius:10px;padding:40px;text-align:center;cursor:pointer;transition:all .2s;background:#fafbfc;margin:20px}
  .dropzone:hover,.dropzone.drag{border-color:var(--qb);background:var(--green-bg)}
  .drop-icon{font-size:40px;margin-bottom:12px}
  .drop-title{font-size:15px;font-weight:600;margin-bottom:6px}
  .drop-sub{font-size:13px;color:var(--text2)}
  .drop-sub span{color:var(--qb);font-weight:500;cursor:pointer}
  /* TEMPLATE */
  .template-box{margin:0 20px 20px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px 16px}
  .template-title{font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
  .template-fields{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
  .field-tag{padding:3px 10px;background:#fff;border:1px solid var(--border2);border-radius:4px;font-size:11px;font-family:var(--mono);color:var(--text2)}
  .field-tag.required{border-color:var(--qb);color:var(--qb);background:var(--green-bg)}
  /* TABLE */
  .tw{overflow-x:auto}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;padding:9px 14px;border-bottom:1px solid var(--border);background:#fafbfc;white-space:nowrap}
  td{padding:9px 14px;font-size:12px;border-bottom:1px solid var(--border)}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafbfc}
  .mono{font-family:var(--mono)}
  /* STATUS */
  .status-row td{background:var(--green-bg)!important}
  .status-row.err td{background:var(--red-bg)!important}
  /* PROGRESS */
  .progress-bar{height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin:12px 20px}
  .progress-fill{height:100%;background:var(--qb);border-radius:3px;transition:width .3s}
  /* SUMMARY */
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px}
  .sum-card{background:#fafbfc;border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center}
  .sum-val{font-size:24px;font-weight:700;font-family:var(--mono)}
  .sum-lbl{font-size:11px;color:var(--text2);margin-top:3px;text-transform:uppercase;letter-spacing:.4px}
  /* BUTTONS */
  .btn{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .15s;font-family:var(--sans);display:inline-flex;align-items:center;gap:6px}
  .bp{background:var(--qb);color:#fff}.bp:hover{background:#248a16}.bp:disabled{opacity:.4;cursor:not-allowed}
  .bo{background:#fff;color:var(--text);border:1px solid var(--border2)}.bo:hover{border-color:var(--qb);color:var(--qb)}
  .bd{background:var(--red-bg);color:var(--red);border:1px solid var(--red-lt)}
  /* ALERT */
  .alert{padding:12px 16px;border-radius:8px;font-size:13px;margin:0 20px 16px;display:flex;align-items:flex-start;gap:10px}
  .alert.info{background:var(--blue-bg);border:1px solid #bfdbfe;color:var(--blue)}
  .alert.success{background:var(--green-bg);border:1px solid var(--green-lt);color:var(--green)}
  .alert.error{background:var(--red-bg);border:1px solid var(--red-lt);color:var(--red)}
  .alert.warning{background:var(--amber-bg);border:1px solid #fde68a;color:var(--amber)}
  /* DOWNLOAD BTN */
  .dl-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:var(--blue-bg);border:1px solid #bfdbfe;border-radius:6px;color:var(--blue);font-size:12px;font-weight:500;cursor:pointer;font-family:var(--sans)}
  .dl-btn:hover{background:#dbeafe}
  @media(max-width:600px){
    body{padding:16px}
    .summary{grid-template-columns:1fr 1fr}
  }
`;

// ── CSV TEMPLATES ─────────────────────────────────────────────────────────────
const TEMPLATES = {
  contacts: {
    fields: ["name*", "type*", "email", "phone", "address", "city", "postcode", "vat_number", "notes"],
    required: ["name", "type"],
    sample: [
      ["name", "type", "email", "phone", "address", "city", "postcode", "vat_number", "notes"],
      ["Acme Corp", "customer", "info@acme.com", "020 1234 5678", "123 High Street", "London", "EC1A 1BB", "GB123456789", "Key account"],
      ["TechStart Ltd", "customer", "hello@techstart.io", "0161 234 5678", "45 Digital Way", "Manchester", "M1 2AB", "", "New customer"],
      ["Global Supplies", "supplier", "orders@globalsupplies.com", "0117 987 6543", "Unit 5 Trade Park", "Bristol", "BS1 3CD", "GB987654321", "Main wholesaler"],
      ["City Distributors", "both", "sales@citydist.co.uk", "0121 456 7890", "78 Commerce Road", "Birmingham", "B2 4EF", "", "Customer and supplier"],
    ]
  },
  products: {
    fields: ["name*", "code", "category", "unit", "cost_price*", "sale_price*", "vat_rate", "stock_qty", "reorder_level", "description"],
    required: ["name", "cost_price", "sale_price"],
    sample: [
      ["name", "code", "category", "unit", "cost_price", "sale_price", "vat_rate", "stock_qty", "reorder_level", "description"],
      ["Hayati 6K", "HYT6K", "Vapes", "pack", "12.50", "26.50", "0", "50", "10", "Pack of 5"],
      ["Hayati 6K Pods", "HYT6KP", "Pods", "pack", "8.00", "17.00", "0", "100", "20", "Pack of 5"],
      ["Hayati 25K Pods", "HYT25KP", "Pods", "pack", "10.00", "23.50", "20", "75", "15", "Pack of 5"],
      ["Elux Salts 20mg", "ELX20", "E-Liquids", "pack", "5.50", "12.75", "20", "200", "50", "Pack of 10"],
    ]
  }
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows = lines.slice(1).map(line => {
    const vals = []; let cur = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || ""]));
  });
  return { headers, rows };
}

function downloadCSV(data, filename) {
  const content = data.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function validateRow(row, type) {
  const errors = [];
  const req = TEMPLATES[type].required;
  for (const field of req) if (!row[field]) errors.push(`Missing ${field}`);
  if (type === "contacts" && row.type && !["customer", "supplier", "both"].includes(row.type)) errors.push("Type must be customer, supplier, or both");
  if (type === "products") {
    if (row.cost_price && isNaN(parseFloat(row.cost_price))) errors.push("cost_price must be a number");
    if (row.sale_price && isNaN(parseFloat(row.sale_price))) errors.push("sale_price must be a number");
    if (row.vat_rate && !["0", "5", "20"].includes(row.vat_rate)) errors.push("vat_rate must be 0, 5, or 20");
  }
  return errors;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function CSVImport({ token: propToken, contacts, setContacts, products, setProducts }) {
  const [tab, setTab] = useState("contacts");
  const [token, setToken] = useState(propToken || "");
  const [tokenInput, setTokenInput] = useState("");
  const [drag, setDrag] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [rowStatuses, setRowStatuses] = useState([]);
  const fileRef = useRef();

  const reset = () => { setParsed(null); setResults(null); setRowStatuses([]); setProgress(0); };

  const handleFile = (file) => {
    if (!file || !file.name.endsWith(".csv")) { alert("Please upload a .csv file"); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const { headers, rows } = parseCSV(e.target.result);
      const validated = rows.map(row => ({ ...row, _errors: validateRow(row, tab) }));
      setParsed({ headers, rows: validated }); setResults(null); setRowStatuses([]);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); };

  const buildRecord = (row) => {
    if (tab === "contacts") return { name: row.name, type: row.type || "customer", email: row.email || null, phone: row.phone || null, address: row.address || null, city: row.city || null, postcode: row.postcode || null, vat_number: row.vat_number || null, notes: row.notes || null };
    if (tab === "products") return { name: row.name, code: row.code || null, category: row.category || null, unit: row.unit || "unit", cost_price: parseFloat(row.cost_price) || 0, sale_price: parseFloat(row.sale_price) || 0, vat_rate: parseFloat(row.vat_rate) || 20, stock_qty: parseFloat(row.stock_qty) || 0, reorder_level: parseFloat(row.reorder_level) || 0, description: row.description || null };
  };

  const runImport = async () => {
    if (!token) { alert("Please enter your auth token first"); return; }
    const validRows = parsed.rows.filter(r => r._errors.length === 0);
    if (!validRows.length) { alert("No valid rows to import"); return; }
    setImporting(true); setProgress(0);
    const statuses = new Array(parsed.rows.length).fill(null);
    let success = 0, failed = 0;
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      if (row._errors.length > 0) { statuses[i] = { ok: false, msg: row._errors.join(", ") }; failed++; setRowStatuses([...statuses]); continue; }
      try {
        const table = tab === "contacts" ? "contacts" : "products";
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Prefer": "return=representation" }, body: JSON.stringify(buildRecord(row)) });
        if (res.ok) { statuses[i] = { ok: true, msg: "Imported" }; success++; }
        else { const err = await res.json(); statuses[i] = { ok: false, msg: err.message || "Import failed" }; failed++; }
      } catch (e) { statuses[i] = { ok: false, msg: e.message }; failed++; }
      setRowStatuses([...statuses]); setProgress(Math.round((i + 1) / parsed.rows.length * 100));
      await new Promise(r => setTimeout(r, 80));
    }
    setResults({ success, failed, total: parsed.rows.length }); setImporting(false);
  };

  const template = TEMPLATES[tab];
  const validCount = parsed ? parsed.rows.filter(r => r._errors.length === 0).length : 0;
  const errorCount = parsed ? parsed.rows.filter(r => r._errors.length > 0).length : 0;

  return (
    <>
      <style>{CSS}</style>
      <div className="wrap">
        <div className="header">
          <div className="logo">L</div>
          <div className="header-text"><h1>LedgerOS — Bulk CSV Import</h1><p>Import customers, suppliers and products in bulk from a spreadsheet</p></div>
        </div>

        {/* AUTH TOKEN */}
        {!token && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch"><div className="ct">🔐 Authentication Required</div></div>
            <div style={{ padding: 20 }}>
              <div className="alert info" style={{ margin: "0 0 16px" }}>
                <span>ℹ️</span>
                <div>To import data, you need your auth token. <strong>Sign in to LedgerOS</strong>, open browser DevTools (F12) → Console, and type: <code style={{ fontFamily: "monospace", background: "#dbeafe", padding: "1px 6px", borderRadius: 3 }}>localStorage</code> — or copy it from your browser's network tab after signing in.</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={{ flex: 1, background: "#fff", border: "1.5px solid var(--border2)", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "monospace", outline: "none" }} placeholder="Paste your auth token here (eyJ...)" value={tokenInput} onChange={e => setTokenInput(e.target.value)} />
                <button className="btn bp" onClick={() => setToken(tokenInput.trim())} disabled={!tokenInput.trim()}>Authenticate</button>
              </div>
            </div>
          </div>
        )}

        {token && <div className="alert success" style={{ margin: "0 0 16px" }}><span>✅</span><div>Authenticated successfully. Ready to import.</div></div>}

        {/* TABS */}
        <div className="tabs">
          {[["contacts", "👥 Customers & Suppliers"], ["products", "📦 Products & Inventory"]].map(([k, l]) => (
            <div key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => { setTab(k); reset(); }}>{l}</div>
          ))}
        </div>

        {/* TEMPLATE DOWNLOAD */}
        <div className="card">
          <div className="ch">
            <div><div className="ct">Step 1 — Download Template</div><div className="cs">Fill in the template then upload it below</div></div>
            <button className="dl-btn" onClick={() => downloadCSV(template.sample, `ledgeros-${tab}-template.csv`)}>⬇️ Download CSV Template</button>
          </div>
          <div className="template-box">
            <div className="template-title">Required & optional columns</div>
            <div className="template-fields">
              {template.fields.map(f => {
                const isReq = f.endsWith("*");
                const name = f.replace("*", "");
                return <span key={f} className={`field-tag ${isReq ? "required" : ""}`}>{name}{isReq ? " *" : ""}</span>;
              })}
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>* Required fields &nbsp;|&nbsp; {tab === "contacts" ? "type must be: customer, supplier, or both" : "vat_rate must be: 0, 5, or 20"}</div>
          </div>
        </div>

        {/* UPLOAD */}
        <div className="card">
          <div className="ch"><div className="ct">Step 2 — Upload Your CSV</div></div>
          <div className={`dropzone ${drag ? "drag" : ""}`}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            <div className="drop-icon">📂</div>
            <div className="drop-title">{drag ? "Drop it here!" : "Drag & drop your CSV file"}</div>
            <div className="drop-sub">or <span>browse to upload</span> · .csv files only</div>
          </div>
        </div>

        {/* PREVIEW */}
        {parsed && (
          <div className="card">
            <div className="ch">
              <div><div className="ct">Step 3 — Preview & Import</div><div className="cs">{parsed.rows.length} rows found · {validCount} valid · {errorCount} errors</div></div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn bo" onClick={reset}>Clear</button>
                <button className="btn bp" onClick={runImport} disabled={importing || !token || validCount === 0}>{importing ? `Importing... ${progress}%` : `Import ${validCount} Records`}</button>
              </div>
            </div>

            {errorCount > 0 && <div className="alert warning" style={{ margin: "16px 20px 0" }}><span>⚠️</span><div>{errorCount} row{errorCount > 1 ? "s" : ""} have errors and will be skipped. Fix them in your CSV and re-upload.</div></div>}

            {importing && <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>}

            {results && (
              <div className="summary">
                <div className="sum-card"><div className="sum-val" style={{ color: "var(--green)" }}>{results.success}</div><div className="sum-lbl">Imported</div></div>
                <div className="sum-card"><div className="sum-val" style={{ color: "var(--red)" }}>{results.failed}</div><div className="sum-lbl">Failed</div></div>
                <div className="sum-card"><div className="sum-val">{results.total}</div><div className="sum-lbl">Total</div></div>
              </div>
            )}

            {results && results.success > 0 && <div className="alert success" style={{ margin: "0 20px 16px" }}><span>🎉</span><div>Successfully imported {results.success} {tab}. Go back to LedgerOS to see them.</div></div>}

            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    {parsed.headers.slice(0, 6).map(h => <th key={h}>{h}</th>)}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row, i) => {
                    const status = rowStatuses[i];
                    const hasError = row._errors.length > 0;
                    return (
                      <tr key={i} className={status ? (status.ok ? "status-row" : "status-row err") : ""}>
                        <td className="mono" style={{ color: "var(--text3)", fontSize: 11 }}>{i + 1}</td>
                        {parsed.headers.slice(0, 6).map(h => <td key={h}>{row[h] || <span style={{ color: "var(--text3)" }}>—</span>}</td>)}
                        <td>
                          {status ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: status.ok ? "var(--green)" : "var(--red)" }}>
                              {status.ok ? "✓ Imported" : `✗ ${status.msg}`}
                            </span>
                          ) : hasError ? (
                            <span style={{ fontSize: 11, color: "var(--red)" }}>⚠ {row._errors.join(", ")}</span>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>Ready</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text3)" }}>
          LedgerOS CSV Import Tool · <a href="https://ledgeros-lac.vercel.app" style={{ color: "var(--qb)" }}>Back to LedgerOS</a>
        </div>
      </div>
    </>
  );
}
