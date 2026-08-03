import React, { useState } from "react";
import { sb } from "../lib/supabase.js";
import { fmt, fmtDate, isMobile } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { toast } from "../lib/constants.js";
import { ModalPortal, EmptyState } from "../components/ui.jsx";

// ── CONTACTS ──────────────────────────────────────────────────────────────────

// ┌────────────────────────────────────────────────────────────┐
// │ Contacts                                                   │
// │ Customer and supplier contact management                   │
// └────────────────────────────────────────────────────────────┘
export function Contacts({ contacts, setContacts, token, userId, invoices = [], profile, triggerNewContact, onTriggerContactHandled, onOpenCustomer }) {
  const [tab, setTab] = useState("customer");
  const [contactView, setContactView] = useState("grid");
  const [viewContact, setViewContact] = useState(null);
  const [custOutstanding, setCustOutstanding] = useState(null); // kept for legacy compat
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [saving, setSaving] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactFilter, setContactFilter] = useState("all"); // all | no-email | has-email
  const [ctSort, setCtSort] = useState({ field: "name", dir: "asc" });
  const ctSortToggle = (field) => setCtSort(s => ({ field, dir: s.field === field && s.dir === "asc" ? "desc" : "asc" }));
  React.useEffect(() => {
    if (triggerNewContact) { setShowForm(true); onTriggerContactHandled && onTriggerContactHandled(); }
  }, [triggerNewContact]);

  const [f, setF] = useState({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "", credit_limit: "", credit_hold: false });
  const archivedCount = contacts.filter(c => c.active === false && (c.type === tab || c.type === "both")).length;
  const filtered = contacts.filter(c => {
    if (c.type !== tab && c.type !== "both") return false;
    if (contactFilter === "archived") return c.active === false;   // archived view shows only inactive
    if (c.active === false) return false;                           // every other view hides archived
    if (contactFilter === "no-email" && c.email) return false;
    if (contactFilter === "has-email" && !c.email) return false;
    if (contactFilter === "no-phone" && c.phone) return false;
    if (contactFilter === "has-phone" && !c.phone) return false;
    if (contactSearch) {
      const q = contactSearch.toLowerCase();
      return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q) || c.city?.toLowerCase().includes(q);
    }
    return true;
  });
  // Contacts belonging to the active tab (customer/supplier) — filter counts
  // are scoped to this so the chip/tile numbers match what a filter returns.
  const tabContacts = contacts.filter(c => c.type === tab || c.type === "both");
  const sortedContacts = [...filtered].sort((a, b) => {
    const m = ctSort.dir === "asc" ? 1 : -1;
    if (ctSort.field === "name") return m * (a.name || "").localeCompare(b.name || "");
    if (ctSort.field === "outstanding") return m * ((a.total_outstanding || 0) - (b.total_outstanding || 0));
    if (ctSort.field === "revenue") return m * ((a.total_revenue || 0) - (b.total_revenue || 0));
    return 0;
  });
  const save = async () => {
    if (!f.name) return;
    // Require a way to reach customers — an email OR a phone (needed for invoices, statements, reminders).
    const em = (f.email || "").trim(), ph = (f.phone || "").trim();
    const isCust = f.type === "customer" || f.type === "both";
    if (isCust && !em && !ph) { toast.warn("Add an email or phone number — it's needed to send invoices, statements and reminders."); return; }
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast.error("That email doesn't look valid. Please check it."); return; }
    if (ph && ph.replace(/\D/g, "").length < 7) { toast.error("That phone number doesn't look valid."); return; }
    setSaving(true);
    // Coerce credit fields so the numeric/boolean columns accept them.
    const payload = { ...f, credit_limit: parseFloat(f.credit_limit) || 0, credit_hold: !!f.credit_hold };
    if (editingContact) {
      // Update existing contact
      const { id, created_by, created_at, ...updateData } = payload;
      const data = await sb.patch(token, "contacts", editingContact.id, updateData);
      if (data) {
        setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...c, ...updateData } : c));
        logAudit(token, userId, "contact_updated", "contact", editingContact.id, `Contact updated: ${f.name}`);
      }
      setEditingContact(null);
    } else {
      // Create new contact
      const data = await sb.post(token, "contacts", { ...payload, created_by: userId });
      if (data[0]) { setContacts(prev => [data[0], ...prev]); logAudit(token, userId, "contact_created", "contact", data[0].id, `${f.type} contact created: ${f.name}${f.email ? ' · ' + f.email : ''}`); }
    }
    setF({ type: "customer", name: "", email: "", phone: "", address: "", city: "", postcode: "", vat_number: "", notes: "", credit_limit: "", credit_hold: false });
    setShowForm(false); setSaving(false);
  };

  // ── Archive / reactivate a contact (admin only; history is always kept) ──
  const [archivingId, setArchivingId] = useState(null);
  const setContactActive = async (c, active) => {
    setArchivingId(c.id);
    const res = await sb.patch(token, "contacts", c.id, { active });
    if (res) {
      setContacts(prev => prev.map(x => x.id === c.id ? { ...x, active } : x));
      logAudit(token, userId, active ? "contact_reactivated" : "contact_archived", "contact", c.id, `Contact ${active ? "reactivated" : "archived"}: ${c.name}${c.email ? " · " + c.email : ""}`);
      toast.success(active ? `"${c.name}" reactivated` : `"${c.name}" archived — hidden from active lists`);
    } else {
      toast.error(`Couldn't update "${c.name}". Please try again.`);
    }
    setArchivingId(null);
  };

  const avatarColors = ["#dd2b0f","#1a7f37","#f59e0b","#201e1d","#ae1800","#8a8580","#57534e"];
  return (
    <div>
      {viewContact && (
        <ModalPortal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewContact(null)}>
          <div className="modal contact-modal" style={{ maxWidth: 620, width: "100%" }}>
            <div className="modal-header">
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:44,height:44,borderRadius:0,background:["#dd2b0f","#1a7f37","#f59e0b","#201e1d","#ae1800"][viewContact.name?.charCodeAt(0)%5]||"#dd2b0f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff" }}>{viewContact.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight:700,fontSize:16 }}>{viewContact.name}</div>
                  <div style={{ fontSize:12,color:"var(--text3)",marginTop:2 }}>{viewContact.type||"customer"} · {viewContact.city||"No location"}</div>
                </div>
              </div>
              <button className="btn bo bsm" onClick={() => setViewContact(null)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div style={{ padding:"20px 24px" }}>
              {/* KPI row */}
              {(() => {
                const liveContact = contacts.find(c => c.id === viewContact.id) || viewContact;
                const custInvoices = invoices.filter(i => i.customer === liveContact.name);
                // Always derive financial KPIs from the live invoices list so the modal
                // reflects payments recorded during this session immediately, even if the
                // DB-trigger columns on `contacts` haven't been refetched yet.
                const totalSpend = custInvoices.reduce((s,i)=>s+parseFloat(i.amount||0),0);
                const paid = custInvoices.reduce((s,i)=>s+parseFloat(i.amount_paid||0),0);
                const outstanding = custInvoices.filter(i=>i.status==="pending"||i.status==="overdue"||i.status==="partial").reduce((s,i)=>s+parseFloat(i.balance||i.amount||0),0);
                return (
                  <div>
                    <div className="ct-modal-kpi" style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:20 }}>
                      {[{l:"Total Spend",v:fmt(totalSpend),c:"var(--blue)"},{l:"Invoices",v:custInvoices.length,c:"var(--text)"},{l:"Paid",v:fmt(paid),c:"var(--green)"},{l:"Outstanding",v:fmt(outstanding),c:outstanding>0?"var(--amber)":"var(--green)"}].map(k=>(
                        <div key={k.l} style={{ background:"#f8fafd",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:"12px 14px" }}>
                          <div style={{ fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.l}</div>
                          <div style={{ fontSize:16,fontWeight:700,color:k.c }}>{k.v}</div>
                        </div>
                      ))}
                    </div>
                    {/* Contact details */}
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
                      {[
                        {icon:"ti-mail",label:"Email",val:viewContact.email},
                        {icon:"ti-phone",label:"Phone",val:viewContact.phone},
                        {icon:"ti-map-pin",label:"Address",val:[viewContact.address,viewContact.city,viewContact.postcode].filter(Boolean).join(", ")},
                        {icon:"ti-file-invoice",label:"VAT Number",val:viewContact.vat_number},
                      ].filter(d=>d.val).map(d=>(
                        <div key={d.label} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--r)" }}>
                          <i className={"ti "+d.icon} style={{ color:"var(--blue)",fontSize:15,marginTop:1,flexShrink:0 }} />
                          <div>
                            <div style={{ fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:2 }}>{d.label}</div>
                            <div style={{ fontSize:13,fontWeight:500,color:"var(--text)" }}>{d.val}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Transaction history */}
                    <div style={{ fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:10 }}>Transaction History</div>
                    {custInvoices.length===0 ? (
                      <div style={{ padding:24,textAlign:"center",color:"var(--text3)",background:"#f8fafd",borderRadius:"var(--rl)",border:"1px solid var(--border)" }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",marginBottom:8,opacity:0.3}}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                        No invoices yet for this customer
                      </div>
                    ) : (
                      <div style={{ border:"1px solid var(--border)",borderRadius:"var(--rl)",overflow:"hidden" }}>
                        <table style={{ width:"100%",borderCollapse:"collapse" }}>
                          <thead><tr style={{ background:"#f8fafd" }}>
                            {["Invoice","Date","Amount","Status"].map(h=><th key={h} style={{ padding:"9px 14px",fontSize:10,fontWeight:700,color:"var(--text3)",textAlign:h==="Amount"?"right":"left",textTransform:"uppercase",letterSpacing:".6px" }}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {custInvoices.map(inv=>(
                              <tr key={inv.id} style={{ borderTop:"1px solid var(--border)" }}>
                                <td style={{ padding:"10px 14px",fontSize:12,color:"var(--blue)",fontWeight:600 }}>{inv.invoice_number}</td>
                                <td style={{ padding:"10px 14px",fontSize:12,color:"var(--text2)" }}>{fmtDate(inv.invoice_date)}</td>
                                <td style={{ padding:"10px 14px",fontSize:13,fontWeight:700,textAlign:"right" }}>{fmt(inv.amount)}</td>
                                <td style={{ padding:"10px 14px" }}><span className={"badge "+(inv.status==="paid"?"b-green":inv.status==="overdue"?"b-red":inv.status==="pending"||inv.status==="partial"?"b-amber":"b-gray")}>{inv.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="modal-actions">
              <div style={{ display:"flex",gap:8 }}>
                <button className="btn bo bsm" onClick={()=>{setEditingContact(viewContact);setF({...viewContact});setViewContact(null);setShowForm(true);}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                {viewContact.email&&<button className="btn bo bsm" onClick={()=>window.open("mailto:"+viewContact.email)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email</button>}
                {viewContact.phone&&<button className="btn bwa bsm" onClick={()=>window.open("https://wa.me/"+viewContact.phone.replace(/\s+/g,"").replace(/^0/,"44"))}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp</button>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {onOpenCustomer && (viewContact.type === "customer" || viewContact.type === "both") && <button className="btn bp bsm" onClick={()=>{ const c=viewContact; setViewContact(null); onOpenCustomer(c); }}>Customer Hub →</button>}
                <button className="btn bo bsm" onClick={()=>setViewContact(null)}>Close</button>
              </div>
            </div>
          </div>
        </div></ModalPortal>
      )}
      {/* ── Customers Page Header ── */}
      {isMobile() ? (
      <div style={{ margin: "-12px -12px 12px", padding: "16px 16px 12px", background: "#0f172a" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Contacts</div>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36, paddingRight: 12, height: 44, border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, fontSize: 14, outline: "none", color: "#fff", background: "rgba(255,255,255,.07)", fontFamily: "var(--sans)" }} />
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["customer","Customers"],["supplier","Suppliers"]].map(([k,l]) => (
            <div key={k} onClick={() => { setTab(k); setContactSearch(""); setContactFilter("all"); }}
              style={{ flex:1, textAlign:"center", padding:"8px 14px", fontSize:13, fontWeight:tab===k?700:500, color:tab===k?"#fff":"rgba(255,255,255,.45)", background:tab===k?"#dd2b0f":"rgba(255,255,255,.07)", borderRadius:8, cursor:"pointer" }}>
              {l} <span style={{ fontSize:10, fontWeight:700, opacity:.8 }}>{contacts.filter(c=>c.type===k||c.type==="both").length}</span>
            </div>
          ))}
        </div>
      </div>
      ) : (
      <div className="page-hero" style={{ margin: "-26px -28px 0 -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Contacts</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>Customers &amp; Suppliers</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 6 }}>
              {contacts.filter(c => c.type === "customer" || c.type === "both").length} customers
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "inline-block" }} />
              {contacts.filter(c => c.type === "supplier" || c.type === "both").length} suppliers
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <div className="ct-hdr-search" style={{ position: "relative" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." style={{ paddingLeft: 29, paddingRight: contactSearch ? 28 : 10, height: 32, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, fontSize: 12, outline: "none", color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.07)", width: 180, fontFamily: "var(--sans)" }} />
              {contactSearch && <button onClick={() => setContactSearch("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", padding: 0 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setContactView("grid")} style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid " + (contactView === "grid" ? "#dd2b0f" : "rgba(255,255,255,.15)"), background: contactView === "grid" ? "#dd2b0f" : "rgba(255,255,255,.07)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
              <button onClick={() => setContactView("list")} style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid " + (contactView === "list" ? "#dd2b0f" : "rgba(255,255,255,.15)"), background: contactView === "list" ? "#dd2b0f" : "rgba(255,255,255,.07)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
            </div>
            <button onClick={() => { setShowForm(!showForm); setF({ ...f, type: tab }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #dd2b0f", background: "#dd2b0f", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Add {tab === "customer" ? "Customer" : "Supplier"}
            </button>
          </div>
        </div>
        {/* Stats strip */}
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)", position: "relative", zIndex: 1 }}>
          {[
            { label: "Customers", val: contacts.filter(c => c.type === "customer" || c.type === "both").length, sub: "click to view", color: tab==="customer"?"#ff6a4d":"rgba(255,255,255,.35)", accent: "#dd2b0f", filter: "all", tabSwitch: "customer" },
            { label: "Suppliers", val: contacts.filter(c => c.type === "supplier" || c.type === "both").length, sub: "click to view", color: tab==="supplier"?"#ff6a4d":"rgba(255,255,255,.35)", accent: "#57534e", filter: "all", tabSwitch: "supplier" },
            { label: "With Email", val: tabContacts.filter(c => c.email).length, sub: "can receive reminders", color: "#86efac", accent: "#16a34a", filter: "has-email" },
            { label: "No Email", val: tabContacts.filter(c => !c.email).length, sub: "missing contact info", color: tabContacts.filter(c=>!c.email).length > 0 ? "#fca5a5" : "rgba(255,255,255,.35)", accent: tabContacts.filter(c=>!c.email).length > 0 ? "#dc2626" : "#64748b", filter: "no-email" },
          ].map((k, i) => {
            const isActive = k.tabSwitch ? tab === k.tabSwitch : contactFilter === k.filter && k.filter !== "all";
            const isClickable = k.filter !== "all" || k.tabSwitch;
            return (
            <div key={i} onClick={() => k.tabSwitch ? (setTab(k.tabSwitch), setContactFilter("all"), setContactSearch("")) : k.filter !== "all" && setContactFilter(contactFilter === k.filter ? "all" : k.filter)}
              title={isClickable ? `Click to filter by ${k.label}` : undefined}
              style={{ padding: "12px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none", borderTop: `3px solid ${isActive ? k.accent : "transparent"}`, cursor: isClickable ? "pointer" : "default", background: isActive ? "rgba(255,255,255,.08)" : "transparent", transition: "all .15s" }}
              onMouseEnter={e => { if(isClickable){ e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderTop=`3px solid ${k.accent}`; }}}
              onMouseLeave={e => { if(isClickable){ e.currentTarget.style.background=isActive?"rgba(255,255,255,.08)":"transparent"; e.currentTarget.style.borderTop=isActive?`3px solid ${k.accent}`:"3px solid transparent"; }}}>
              <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? k.color : "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{k.label}</span>
                {isClickable && (isActive
                  ? <span style={{ color: "#fff", fontSize: 9, fontWeight: 700, background: k.accent, padding: "2px 6px", borderRadius: 4, letterSpacing: ".3px" }}>ACTIVE ✕</span>
                  : <span style={{ color: "rgba(255,255,255,.3)", fontSize: 9 }}>↓ FILTER</span>)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginBottom: 2 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: isActive ? k.color : "rgba(255,255,255,.5)" }}>{k.sub}</div>
            </div>
          );})}
        </div>
      </div>
      )}
      {!isMobile() && <>
      {/* ── TABS + UTILITY BAR ── */}
      <div style={{ background:"#201e1d", borderBottom:"1px solid rgba(255,255,255,.10)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 36px", margin:"0 -28px", marginTop:0 }}>
        <div style={{ display:"flex", gap:3 }}>
          {[["customer","Customers"],["supplier","Suppliers"]].map(([k,l]) => (
            <div key={k} onClick={() => { setTab(k); setContactSearch(""); setContactFilter("all"); }}
              style={{ padding:"6px 14px", fontSize:12, fontWeight:tab===k?700:500, color:tab===k?"#fff":"rgba(255,255,255,.45)", background:tab===k?"#dd2b0f":"transparent", borderRadius:7, cursor:"pointer", display:"flex", alignItems:"center", gap:5, transition:"all .15s", boxShadow:tab===k?"0 2px 8px rgba(221,43,15,.30)":"none" }}>
              {l} <span style={{ fontSize:10, fontWeight:700, background:tab===k?"rgba(255,255,255,.2)":"rgba(255,255,255,.08)", padding:"1px 6px", borderRadius:10, color:tab===k?"#fff":"rgba(255,255,255,.4)" }}>{contacts.filter(c=>c.type===k||c.type==="both").length}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, paddingRight:4 }}>
          {contactFilter !== "all" && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"rgba(221,43,15,.14)", color:"#ff6a4d", border:"1px solid rgba(221,43,15,.28)", borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:500 }}>
              {contactFilter === "has-email" ? "Has email" : contactFilter === "no-email" ? "No email" : contactFilter === "has-phone" ? "Has phone" : contactFilter === "archived" ? "Archived" : "No phone"}
              <button onClick={() => setContactFilter("all")} style={{ background:"none", border:"none", cursor:"pointer", color:"#ff6a4d", fontSize:14, lineHeight:1, padding:0 }}>×</button>
            </span>
          )}
          {profile?.role === "admin" && archivedCount > 0 && contactFilter !== "archived" && (
            <button onClick={() => setContactFilter("archived")} style={{ background:"rgba(255,255,255,.07)", color:"rgba(255,255,255,.6)", border:"1px solid rgba(255,255,255,.15)", borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:500, cursor:"pointer", fontFamily:"var(--sans)" }}>Archived ({archivedCount})</button>
          )}
          <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{filtered.length}{contactSearch ? ` of ${contacts.filter(c=>c.type===tab||c.type==="both").length}` : ""} result{filtered.length!==1?"s":""}</span>
        </div>
      </div>

      {/* ── SEARCH + SORT BAR ── */}
      <div className="ct-search-bar" style={{ background:"#fff", borderBottom:"1px solid var(--border)", padding:"9px 16px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ position:"relative", flex:1, maxWidth:300 }}>
          <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8", pointerEvents:"none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search name, city, email..."
            style={{ width:"100%", padding:"8px 12px 8px 32px", borderRadius:8, border:"1.5px solid var(--border)", fontSize:12, color:"var(--text)", outline:"none", background:"var(--bg)", fontFamily:"var(--sans)", transition:"border-color .15s" }} />
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {[["all","All",tabContacts.length],["has-email","Has Email",tabContacts.filter(c=>c.email).length],["no-email","No Email",tabContacts.filter(c=>!c.email).length],["has-phone","Has Phone",tabContacts.filter(c=>c.phone).length],["no-phone","No Phone",tabContacts.filter(c=>!c.phone).length]].map(([v,l,cnt]) => (
            <div key={v} onClick={() => setContactFilter(v)}
              style={{ padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:contactFilter===v?700:500, cursor:"pointer", background:contactFilter===v?"#dd2b0f":"var(--bg)", color:contactFilter===v?"#fff":"#64748b", border:"1.5px solid "+(contactFilter===v?"#dd2b0f":"var(--border)"), transition:"all .12s", boxShadow:contactFilter===v?"0 2px 8px rgba(221,43,15,.28)":"none", display:"flex", alignItems:"center", gap:5 }}>
              {l} <span style={{ fontWeight:800, fontSize:11, opacity:contactFilter===v?1:.6 }}>{cnt.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:11, color:"#94a3b8" }}>View</span>
          <select value={contactView} onChange={e => setContactView(e.target.value === "list" ? "list" : "grid")}
            style={{ padding:"6px 10px", borderRadius:7, border:"1.5px solid var(--border)", fontSize:11, color:"var(--text2)", background:"var(--white)", outline:"none", cursor:"pointer", fontFamily:"var(--sans)" }}>
            <option value="grid">Grid view</option>
            <option value="list">List view</option>
          </select>
        </div>
      </div>
      </>}

      {/* ── ADD / EDIT FORM ── */}
      {showForm && (
        <div className="card" style={{ margin:"12px 0", borderRadius:12, border:"1.5px solid var(--border)" }}>
          <div className="ch"><div className="ct">{editingContact ? "Edit Contact" : "New Contact"}</div></div>
          <div className="fg">
            <div className="fgrp"><label>Type</label><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Both</option></select></div>
            <div className="fgrp"><label>Name *</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Business name" /></div>
            <div className="fgrp"><label>Email</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="email@example.com" /></div>
            <div className="fgrp"><label>Phone</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+44..." /></div>
            {(f.type === "customer" || f.type === "both") && <div className="fgrp" style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 11, color: (!f.email?.trim() && !f.phone?.trim()) ? "var(--amber-dk)" : "var(--text3)", marginTop: -4 }}>Enter at least an <strong>email</strong> or a <strong>phone number</strong> — required to send invoices, statements and reminders.</div></div>}
            <div className="fgrp"><label>Address</label><input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></div>
            <div className="fgrp"><label>City</label><input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></div>
            <div className="fgrp"><label>Postcode</label><input value={f.postcode} onChange={e => setF({ ...f, postcode: e.target.value })} /></div>
            <div className="fgrp"><label>VAT Number</label><input value={f.vat_number} onChange={e => setF({ ...f, vat_number: e.target.value })} placeholder="GB123456789" /></div>
            {f.type !== "supplier" && <div className="fgrp"><label>Credit Limit (£)</label><input type="number" min="0" step="0.01" value={f.credit_limit} onChange={e => setF({ ...f, credit_limit: e.target.value })} placeholder="0 = no limit" /></div>}
            {f.type !== "supplier" && <div className="fgrp"><label>Credit Hold</label><div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:6 }}><input id="cc_hold" type="checkbox" checked={!!f.credit_hold} onChange={e => setF({ ...f, credit_hold: e.target.checked })} style={{ width:16, height:16, cursor:"pointer", accentColor:"#dd2b0f" }} /><label htmlFor="cc_hold" style={{ margin:0, fontWeight:400, fontSize:13, cursor:"pointer", textTransform:"none", letterSpacing:0 }}>Warn on new sales / over limit</label></div></div>}
          </div>
          <div className="ff">
            <button className="btn bo" onClick={() => { setShowForm(false); setEditingContact(null); setF({ type:"customer", name:"", email:"", phone:"", address:"", city:"", postcode:"", vat_number:"", notes:"", credit_limit:"", credit_hold:false }); }}>Cancel</button>
            <button className="btn bp" onClick={save} disabled={saving}>{saving ? "Saving..." : editingContact ? "Update Contact" : "Save Contact"}</button>
          </div>
        </div>
      )}

      {/* ── PREMIUM TABLE ROWS ── */}
      {(() => {
        const avatarBg = (name) => ["#dd2b0f","#1a7f37","#f59e0b","#201e1d","#ae1800","#8a8580","#57534e","#0f5c28","#ff6a4d","#7c6f64"][name?.charCodeAt(0) % 10] || "#dd2b0f";
        const custInvMap = {};
        (invoices||[]).forEach(inv => {
          if (!custInvMap[inv.customer]) custInvMap[inv.customer] = { count:0, revenue:0, outstanding:0 };
          custInvMap[inv.customer].count++;
          custInvMap[inv.customer].revenue += parseFloat(inv.amount||0);
          custInvMap[inv.customer].outstanding += parseFloat(inv.balance||inv.amount||0) * (inv.status!=="paid"?1:0);
        });
        const fmt = (n) => "£" + parseFloat(n).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
        const hasOverdue = (name) => (invoices||[]).some(i => i.customer===name && i.status==="overdue");
        const isVIP = (name) => (custInvMap[name]?.revenue||0) > 10000;
        if (isMobile()) {
          return (
            <div style={{ display:"flex", flexDirection:"column", gap:10, padding:"12px 0" }}>
              {sortedContacts.map(c => {
                const bg = avatarBg(c.name);
                const ci = custInvMap[c.name] || { count:0, revenue:0, outstanding:0 };
                const overdue = hasOverdue(c.name);
                return (
                  <div key={c.id} role="button" tabIndex={0}
                    onClick={() => setViewContact(c)}
                    onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setViewContact(c);}}
                    style={{ background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--rl)",padding:"14px 16px",boxShadow:"var(--sh)",cursor:"pointer",minHeight:64,display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                      <div style={{ fontSize:12, color:"var(--text3)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {c.city || c.phone || c.email || "No details"}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                      <span style={{ fontWeight:800, fontSize:14, fontFamily:"var(--mono)" }}>{ci.outstanding > 0 ? fmt(ci.outstanding) : ci.revenue > 0 ? fmt(ci.revenue) : "—"}</span>
                      {ci.outstanding > 0
                        ? <span className={"badge "+(overdue?"b-red":"b-amber")}>{overdue?"overdue":"owes"}</span>
                        : <span className="badge b-green">settled</span>}
                    </div>
                  </div>
                );
              })}
              {filtered.length===0&&<EmptyState icon="customer" title={contactSearch||contactFilter!=="all"?`No ${tab}s match`:`No ${tab}s yet`} sub={contactSearch||contactFilter!=="all"?"Try adjusting your search or filter":"Add your first contact to get started"} action={contactSearch||contactFilter!=="all"?undefined:()=>{setShowForm(true);setF({...f,type:tab});}} actionLabel="Add Contact" />}
            </div>
          );
        }
        return (
          <>
            {/* Column headers */}
            <div className="ct-list-header" style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 0.8fr 85px 0.85fr 0.75fr 90px", gap:0, padding:"8px 12px", margin:"12px 0 4px" }}>
              {[["Customer","name"],["Contact",null],["Location",null],["Status",null],["Revenue","revenue"],["Health",null],["",""]].map(([h,f],i) => (
                <div key={i} onClick={f ? () => ctSortToggle(f) : undefined}
                  style={{ fontSize:10, fontWeight:600, color: f ? "var(--blue)" : "#94a3b8", textTransform:"uppercase", letterSpacing:".6px", cursor: f ? "pointer" : "default", display:"flex", alignItems:"center", gap:3, userSelect:"none" }}>
                  {h}{f && <span style={{opacity:.6}}>{ctSort.field===f ? (ctSort.dir==="asc"?"↑":"↓") : "↕"}</span>}
                </div>
              ))}
            </div>

            {/* Customer rows */}
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {sortedContacts.map(c => {
                const bg = avatarBg(c.name);
                const ci = custInvMap[c.name] || { count:0, revenue:0, outstanding:0 };
                const overdue = hasOverdue(c.name);
                const vip = isVIP(c.name);
                const health = ci.revenue > 0 ? Math.min(100, Math.round(((ci.revenue - ci.outstanding) / ci.revenue) * 100)) : 50;
                const healthCol = health >= 75 ? "#16a34a" : health >= 45 ? "#d97706" : "#dc2626";
                const statusBg = !c.email ? "rgba(148,163,184,.12)" : overdue ? "#fee2e2" : "#dcfce7";
                const statusText = !c.email ? "#64748b" : overdue ? "#991b1b" : "#15803d";
                const statusDot = !c.email ? "#94a3b8" : overdue ? "#dc2626" : "#16a34a";
                const statusLabel = !c.email ? "No Email" : overdue ? "Overdue" : "Active";
                return (
                  <div key={c.id} className="ct-list-row" onClick={() => setViewContact(c)}
                    style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 0.8fr 85px 0.85fr 0.75fr 90px", gap:0, background:"var(--white)", borderRadius:11, border:"1.5px solid var(--border)", padding:"12px", alignItems:"center", cursor:"pointer", transition:"box-shadow .15s, border-color .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow="0 0 0 2px #dd2b0f"; e.currentTarget.style.borderColor="#dd2b0f"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow=""; e.currentTarget.style.borderColor="var(--border)"; }}>

                    {/* Customer */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0, boxShadow:`0 3px 8px ${bg}44` }}>
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                          <span style={{ fontSize:12, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                          {vip && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:20, background:"linear-gradient(135deg,#f59e0b,#ef4444)", color:"#fff" }}>VIP</span>}
                          {overdue && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:20, background:"#fee2e2", color:"#991b1b" }}>OVERDUE</span>}
                        </div>
                        <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{ci.count > 0 ? `${ci.count} invoice${ci.count!==1?"s":""}` : "No invoices"}</div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div>
                      {c.email ? (
                        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#64748b", overflow:"hidden" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.email}</span>
                        </div>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#94a3b8" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          No email
                        </div>
                      )}
                      {c.phone && <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#94a3b8", marginTop:3 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.64 2.76h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.46-1.46a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {c.phone}
                      </div>}
                    </div>

                    {/* Location */}
                    <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#64748b" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.city || "—"}{c.postcode ? `, ${c.postcode}` : ""}</span>
                    </div>

                    {/* Status */}
                    <div>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:statusBg, color:statusText, padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:600 }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:statusDot }} />
                        {statusLabel}
                      </div>
                    </div>

                    {/* Revenue */}
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:"var(--text)" }}>{ci.revenue > 0 ? fmt(ci.revenue) : "—"}</div>
                      {ci.outstanding > 0 && <div style={{ fontSize:10, color:"#dc2626", marginTop:2 }}>{fmt(ci.outstanding)} due</div>}
                    </div>

                    {/* Health bar */}
                    <div>
                      {ci.revenue > 0 ? (
                        <>
                          <div style={{ fontSize:11, fontWeight:600, color:healthCol, marginBottom:3 }}>{health}<span style={{ fontSize:9, color:"#94a3b8", fontWeight:400 }}>/100</span></div>
                          <div style={{ height:4, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${health}%`, background:healthCol, borderRadius:4 }} />
                          </div>
                        </>
                      ) : <span style={{ fontSize:11, color:"#94a3b8" }}>—</span>}
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
                      {[
                        { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>, label:"View", action:() => setViewContact(c) },
                        { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label:"Edit", action:(e) => { e.stopPropagation(); setEditingContact(c); setF({type:c.type||"customer",name:c.name||"",email:c.email||"",phone:c.phone||"",address:c.address||"",city:c.city||"",postcode:c.postcode||"",vat_number:c.vat_number||"",notes:c.notes||"",credit_limit:c.credit_limit!=null?String(c.credit_limit):"",credit_hold:!!c.credit_hold}); setShowForm(true); } },
                        { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, label:"Email", action:(e) => { e.stopPropagation(); if(c.email) window.open(`mailto:${c.email}`); } },
                        ...(profile?.role === "admin" ? [ c.active === false
                          ? { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>, label:"Reactivate", action:(e) => { e.stopPropagation(); setContactActive(c, true); } }
                          : { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>, label:"Archive", danger:true, action:(e) => { e.stopPropagation(); setContactActive(c, false); } }
                        ] : [])
                      ].map(({icon,label,action,danger},idx) => (
                        <button key={idx} title={label} onClick={(e) => { e.stopPropagation(); action(e); }}
                          style={{ width:26, height:26, borderRadius:7, border:"1.5px solid var(--border)", background:"var(--white)", color: danger ? "#dc2626" : "#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .12s" }}
                          onMouseEnter={e=>{ const col = danger ? "#dc2626" : "#dd2b0f"; e.currentTarget.style.borderColor=col; e.currentTarget.style.color=col; e.currentTarget.style.background = danger ? "rgba(220,38,38,.08)" : "rgba(221,43,15,.08)"; }}
                          onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color = danger ? "#dc2626" : "#64748b"; e.currentTarget.style.background="var(--white)"; }}>
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding:"48px 0", textAlign:"center", color:"#94a3b8" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:"0 auto 12px"}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <div style={{ fontSize:13, fontWeight:500, color:"#64748b", marginBottom:6 }}>No {tab}s found</div>
                  <div style={{ fontSize:12, color:"#94a3b8" }}>Try adjusting your search or filters</div>
                </div>
              )}
            </div>

            {/* Footer summary */}
            {filtered.length > 0 && (
              <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:"#94a3b8" }}>Showing {filtered.length} of {contacts.filter(c=>c.type===tab||c.type==="both").length} {tab}s</span>
                <div style={{ display:"flex", gap:8 }}>
                  {(() => {
                    const totalRev = filtered.reduce((s,c) => s + (custInvMap[c.name]?.revenue||0), 0);
                    const totalDue = filtered.reduce((s,c) => s + (custInvMap[c.name]?.outstanding||0), 0);
                    return <>
                      <span style={{ fontSize:11, fontWeight:500, color:"#15803d", background:"#dcfce7", padding:"3px 10px", borderRadius:20 }}>£{totalRev.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} revenue</span>
                      {totalDue > 0 && <span style={{ fontSize:11, fontWeight:500, color:"#991b1b", background:"#fee2e2", padding:"3px 10px", borderRadius:20 }}>£{totalDue.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} outstanding</span>}
                    </>;
                  })()}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

