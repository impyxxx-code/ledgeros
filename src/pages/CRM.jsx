import { useState, useEffect, useMemo } from "react";
import { fmtDate } from "../lib/utils.js";
import { toast } from "../lib/constants.js";
import { ModalPortal, EmptyState } from "../components/ui.jsx";
import {
  BOARD_STAGES, STAGES, PRIORITIES,
  loadProspects, loadActivity, updateProspect, logProspectActivity, convertToCustomer,
  emailsOf, phonesOf, mobileOf, socialsOf, channelOf, whatsappLink, summarise,
} from "../lib/prospects.js";

// ── CRM / PROSPECTS ───────────────────────────────────────────────────────────
// ┌────────────────────────────────────────────────────────────┐
// │ CRM                                                        │
// │ Prospect pipeline → convert won prospects into customers   │
// └────────────────────────────────────────────────────────────┘
export function CRM({ token, setPage }) {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [fPrio, setFPrio] = useState("");
  const [fChan, setFChan] = useState("");
  const [fTown, setFTown] = useState("");
  const [selected, setSelected] = useState(null);

  const reload = async () => {
    setLoading(true);
    try { setProspects(await loadProspects(token)); }
    catch { toast.error("Could not load prospects"); }
    setLoading(false);
  };
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useMemo(() => [...new Set(prospects.map((p) => p.category).filter(Boolean))].sort(), [prospects]);
  const towns = useMemo(() => [...new Set(prospects.map((p) => p.town).filter(Boolean))].sort(), [prospects]);
  const summary = useMemo(() => summarise(prospects), [prospects]);

  const match = (p) => {
    if (fCat && p.category !== fCat) return false;
    if (fPrio && p.lead_priority !== fPrio) return false;
    if (fChan && channelOf(p) !== fChan) return false;
    if (fTown && p.town !== fTown) return false;
    if (q) {
      const hay = `${p.business_name} ${p.town} ${p.postcode} ${p.category} ${p.parent_company || ""}`.toLowerCase();
      if (!q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  };
  const filtered = prospects.filter(match);
  const board = BOARD_STAGES.map((stage) => ({ stage, items: filtered.filter((p) => p.stage === stage) }));
  const terminal = filtered.filter((p) => !BOARD_STAGES.includes(p.stage));

  const onStageChange = async (p, stage) => {
    await updateProspect(token, p.id, { stage }, { channel: "stage", direction: "system", outcome: stage.toLowerCase(), note: `Moved to ${stage}` });
    toast.success(`${p.business_name} → ${stage}`);
    reload();
  };
  const onConvert = async (p) => {
    try {
      const contactId = await convertToCustomer(token, p.id);
      if (!contactId) throw new Error("no id");
      toast.success(`${p.business_name} converted to customer`);
      setSelected(null);
      reload();
    } catch { toast.error("Convert failed"); }
  };

  const S = STYLES;
  return (
    <div style={S.page}>
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>CRM — Prospect Pipeline</h1>
          <div style={S.sub}>ARKHAM Retail prospects · convert won prospects straight into customers</div>
        </div>
      </div>

      {/* summary strip */}
      <div style={S.stats}>
        {[
          ["Prospects", summary.total],
          ["High priority", summary.byPriority.High || 0],
          ["📱 WhatsApp", summary.whatsapp],
          ["✉ Email", summary.email],
          ["Due today", summary.dueToday],
        ].map(([l, n]) => (
          <div key={l} style={S.stat}><b style={S.statN}>{n}</b><span style={S.statL}>{l}</span></div>
        ))}
      </div>

      {/* filters */}
      <div style={S.filters}>
        <input style={S.search} placeholder="Search name, town, postcode…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={S.sel} value={fCat} onChange={(e) => setFCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select style={S.sel} value={fPrio} onChange={(e) => setFPrio(e.target.value)}><option value="">All priorities</option>{PRIORITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select style={S.sel} value={fChan} onChange={(e) => setFChan(e.target.value)}><option value="">All channels</option>{["WhatsApp", "Email", "Phone", "None"].map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select style={S.sel} value={fTown} onChange={(e) => setFTown(e.target.value)}><option value="">All towns</option>{towns.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        {(q || fCat || fPrio || fChan || fTown) && <button style={S.clear} onClick={() => { setQ(""); setFCat(""); setFPrio(""); setFChan(""); setFTown(""); }}>Clear</button>}
        <span style={S.count}>{filtered.length} of {prospects.length}</span>
      </div>

      {loading ? <div style={S.loading}>Loading pipeline…</div>
        : prospects.length === 0
          ? <EmptyState icon="👥" title="No prospects yet" sub="Run the seed (supabase/seed_prospects.sql) or import to populate the pipeline." />
          : (
            <>
              <div style={S.boardWrap}>
                <div style={S.board}>
                  {board.map(({ stage, items }) => (
                    <div key={stage} style={S.col}>
                      <div style={S.colHead}><span>{stage}</span><span style={S.colCount}>{items.length}</span></div>
                      <div style={S.colBody}>
                        {items.map((p) => <Card key={p.id} p={p} onClick={() => setSelected(p)} />)}
                        {items.length === 0 && <div style={S.colEmpty}>—</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {terminal.length > 0 && (
                <div style={S.terminal}>
                  <div style={S.termHead}>Closed ({terminal.length})</div>
                  <div style={S.termRows}>
                    {terminal.map((p) => (
                      <div key={p.id} style={S.termRow} onClick={() => setSelected(p)}>
                        <span style={{ ...S.badge, ...stageBadge(p.stage) }}>{p.stage}</span>
                        <span style={S.termName}>{p.business_name}</span>
                        <span style={S.termTown}>{p.town}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

      {selected && (
        <Detail
          p={selected} token={token} onClose={() => setSelected(null)}
          onStageChange={onStageChange} onConvert={onConvert} onSaved={reload} setPage={setPage}
        />
      )}
    </div>
  );
}

function Card({ p, onClick }) {
  const S = STYLES;
  const chan = channelOf(p);
  const dot = { WhatsApp: "📱", Email: "✉", Phone: "☎", None: "—" }[chan];
  return (
    <div style={S.card} onClick={onClick}>
      <div style={S.cardTop}>
        <span style={{ ...S.prio, ...prioBadge(p.lead_priority) }}>{p.lead_priority}</span>
        <span style={S.cardChan} title={chan}>{dot}</span>
      </div>
      <div style={S.cardName}>{p.business_name}</div>
      <div style={S.cardMeta}>{p.category} · {p.town || "—"}</div>
      {p.next_action_date && <div style={S.cardDue}>Next: {fmtDate(p.next_action_date)}</div>}
    </div>
  );
}

function Detail({ p, token, onClose, onStageChange, onConvert, onSaved, setPage }) {
  const S = STYLES;
  const [activity, setActivity] = useState([]);
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState(p.next_action_date || "");
  const emails = emailsOf(p);
  const mobile = mobileOf(p);
  const wa = mobile ? whatsappLink(mobile) : null;
  const phones = phonesOf(p);
  const socials = socialsOf(p);

  useEffect(() => { loadActivity(token, p.id).then((a) => setActivity(Array.isArray(a) ? a : [])); }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addNote = async () => {
    if (!note.trim()) return;
    await logProspectActivity(token, p.id, { channel: "note", direction: "out", note: note.trim() });
    setNote("");
    setActivity(await loadActivity(token, p.id));
    toast.success("Note logged");
  };
  const saveNext = async () => {
    await updateProspect(token, p.id, { next_action_date: nextDate || null });
    toast.success("Next action saved");
    onSaved();
  };
  const logChannel = async (channel) => {
    await logProspectActivity(token, p.id, { channel, direction: "out", note: `${channel} initiated` });
    setActivity(await loadActivity(token, p.id));
  };

  return (
    <ModalPortal>
      <div style={S.overlay} onClick={onClose}>
        <div style={S.modal} onClick={(e) => e.stopPropagation()}>
          <div style={S.modalHead}>
            <div>
              <div style={S.modalName}>{p.business_name}</div>
              <div style={S.modalSub}>{p.category}{p.parent_company ? ` · ${p.parent_company}` : ""} · {[p.address1, p.town, p.postcode].filter(Boolean).join(", ")}</div>
            </div>
            <button style={S.x} onClick={onClose}>✕</button>
          </div>

          {p.converted_contact_id && (
            <div style={S.wonBanner}>
              Converted to a customer. <button style={S.linkBtn} onClick={() => { setPage && setPage("contacts"); }}>Open in Customers →</button>
            </div>
          )}

          {/* outreach actions */}
          <div style={S.actions}>
            {wa && <a style={{ ...S.act, ...S.actWa }} href={wa} target="_blank" rel="noopener" onClick={() => logChannel("whatsapp")}>📱 WhatsApp {mobile}</a>}
            {emails[0] && <a style={{ ...S.act, ...S.actMail }} href={`mailto:${emails[0]}`} onClick={() => logChannel("email")}>✉ {emails[0]}</a>}
            {phones.map((ph) => ph.label !== "mobile" && <a key={ph.value} style={S.act} href={`tel:${ph.value}`} onClick={() => logChannel("call")}>☎ {ph.value}</a>)}
            {p.website && <a style={S.act} href={p.website} target="_blank" rel="noopener">🌐 Website</a>}
            {socials.map((s) => <a key={s.value} style={S.act} href={s.value} target="_blank" rel="noopener">{s.kind}</a>)}
          </div>

          {/* stage + next action */}
          <div style={S.controls}>
            <label style={S.ctrl}><span style={S.ctrlL}>Stage</span>
              <select style={S.sel} value={p.stage} onChange={(e) => onStageChange(p, e.target.value)}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={S.ctrl}><span style={S.ctrlL}>Next action</span>
              <span style={{ display: "flex", gap: 6 }}>
                <input style={S.sel} type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                <button style={S.smallBtn} onClick={saveNext}>Save</button>
              </span>
            </label>
            <div style={S.ctrl}><span style={S.ctrlL}>Priority</span><span style={{ ...S.prio, ...prioBadge(p.lead_priority) }}>{p.lead_priority}</span></div>
            <div style={S.ctrl}><span style={S.ctrlL}>Confidence</span><span style={S.plain}>{p.data_confidence || "—"}</span></div>
          </div>

          {p.notes && <div style={S.notes}>📝 {p.notes}</div>}

          {/* convert */}
          {!p.converted_contact_id && (
            <button style={S.convert} onClick={() => onConvert(p)}>✓ Convert to customer</button>
          )}

          {/* activity log */}
          <div style={S.logHead}>Activity</div>
          <div style={S.logAdd}>
            <input style={S.search} placeholder="Log a call, note, outcome…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
            <button style={S.smallBtn} onClick={addNote}>Add</button>
          </div>
          <div style={S.log}>
            {activity.length === 0 ? <div style={S.logEmpty}>No activity yet.</div>
              : activity.map((a) => (
                <div key={a.id} style={S.logRow}>
                  <span style={S.logChan}>{a.channel}</span>
                  <span style={S.logNote}>{a.note || a.outcome}</span>
                  <span style={S.logDate}>{fmtDate(a.created_at)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

const prioBadge = (p) => ({
  High: { background: "#fbe6d3", color: "#b4520a" },
  Medium: { background: "#dde7f4", color: "#3a5b8c" },
  Low: { background: "#e7ebe8", color: "#6b746f" },
}[p] || { background: "#eee", color: "#666" });
const stageBadge = (s) => ({
  Won: { background: "#d7ece9", color: "#0f6e64" },
  Lost: { background: "#f2dede", color: "#a33" },
  "Do-Not-Contact": { background: "#eee", color: "#888" },
}[s] || { background: "#eee", color: "#666" });

const STYLES = {
  page: { padding: "4px 2px 40px" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  h1: { fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" },
  sub: { fontSize: 12, color: "var(--muted, #667)", marginTop: 2 },
  stats: { display: "flex", gap: 0, flexWrap: "wrap", marginBottom: 14, borderBottom: "1px solid var(--border,#e3e6e3)", paddingBottom: 12 },
  stat: { paddingRight: 22, marginRight: 22, borderRight: "1px solid var(--border,#e3e6e3)" },
  statN: { display: "block", fontSize: 20, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" },
  statL: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted,#667)" },
  filters: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 },
  search: { flex: "1 1 220px", minWidth: 180, padding: "8px 12px", border: "1px solid var(--border,#ccd)", borderRadius: 8, font: "inherit", fontSize: 14 },
  sel: { padding: "7px 10px", border: "1px solid var(--border,#ccd)", borderRadius: 8, font: "inherit", fontSize: 13, background: "var(--surface,#fff)" },
  clear: { border: "none", background: "none", color: "var(--accent,#0f6e64)", cursor: "pointer", font: "inherit", fontSize: 13 },
  count: { fontSize: 12, color: "var(--muted,#667)", marginLeft: "auto", fontVariantNumeric: "tabular-nums" },
  loading: { padding: 40, textAlign: "center", color: "var(--muted,#667)" },
  boardWrap: { overflowX: "auto", paddingBottom: 8 },
  board: { display: "flex", gap: 12, minWidth: "min-content" },
  col: { flex: "0 0 220px", background: "var(--surface-2,#f4f6f4)", borderRadius: 10, display: "flex", flexDirection: "column", maxHeight: "62vh" },
  colHead: { display: "flex", justifyContent: "space-between", padding: "10px 12px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid var(--border,#e3e6e3)" },
  colCount: { color: "var(--muted,#889)", fontVariantNumeric: "tabular-nums" },
  colBody: { padding: 8, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" },
  colEmpty: { textAlign: "center", color: "var(--muted,#aab)", fontSize: 12, padding: 10 },
  card: { background: "var(--surface,#fff)", border: "1px solid var(--border,#e3e6e3)", borderRadius: 8, padding: "9px 11px", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,.04)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardChan: { fontSize: 13 },
  cardName: { fontWeight: 700, fontSize: 13.5, lineHeight: 1.25 },
  cardMeta: { fontSize: 11.5, color: "var(--muted,#778)", marginTop: 2 },
  cardDue: { fontSize: 11, color: "#b4520a", marginTop: 4 },
  prio: { fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 5 },
  badge: { fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 5 },
  terminal: { marginTop: 18 },
  termHead: { fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted,#889)", marginBottom: 6 },
  termRows: { display: "flex", flexDirection: "column", gap: 4 },
  termRow: { display: "flex", gap: 10, alignItems: "center", padding: "6px 10px", background: "var(--surface,#fff)", border: "1px solid var(--border,#e3e6e3)", borderRadius: 7, cursor: "pointer", fontSize: 13 },
  termName: { fontWeight: 600 }, termTown: { color: "var(--muted,#889)", marginLeft: "auto", fontSize: 12 },
  overlay: { position: "fixed", inset: 0, background: "rgba(20,25,22,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", zIndex: 1000, overflowY: "auto" },
  modal: { background: "var(--surface,#fff)", borderRadius: 14, width: "min(620px,100%)", padding: 20, boxShadow: "0 12px 40px rgba(0,0,0,.25)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  modalName: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" },
  modalSub: { fontSize: 12.5, color: "var(--muted,#778)", marginTop: 3 },
  x: { border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "var(--muted,#889)" },
  wonBanner: { marginTop: 12, padding: "8px 12px", background: "#d7ece9", color: "#0f6e64", borderRadius: 8, fontSize: 13 },
  linkBtn: { border: "none", background: "none", color: "#0f6e64", fontWeight: 700, cursor: "pointer", font: "inherit" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 },
  act: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border,#e3e6e3)", background: "var(--surface,#fff)", color: "var(--ink,#161b19)", textDecoration: "none" },
  actWa: { background: "#25923a", color: "#fff", borderColor: "#25923a" },
  actMail: { background: "#d7ece9", color: "#0f6e64", borderColor: "transparent" },
  controls: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 16 },
  ctrl: { display: "flex", flexDirection: "column", gap: 4 },
  ctrlL: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted,#889)" },
  plain: { fontSize: 14 },
  notes: { marginTop: 14, fontSize: 13, color: "var(--muted,#667)", background: "var(--surface-2,#f4f6f4)", borderRadius: 8, padding: "8px 11px" },
  convert: { marginTop: 16, width: "100%", padding: "10px", background: "#0f6e64", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: "pointer" },
  logHead: { marginTop: 20, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted,#889)" },
  logAdd: { display: "flex", gap: 8, marginTop: 8 },
  smallBtn: { padding: "7px 14px", border: "none", background: "var(--accent,#0f6e64)", color: "#fff", borderRadius: 8, fontWeight: 600, cursor: "pointer", font: "inherit", fontSize: 13 },
  log: { marginTop: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" },
  logEmpty: { fontSize: 13, color: "var(--muted,#aab)" },
  logRow: { display: "flex", gap: 10, alignItems: "baseline", fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--border,#eef)" },
  logChan: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--accent,#0f6e64)", flex: "0 0 66px" },
  logNote: { flex: 1 }, logDate: { color: "var(--muted,#889)", fontSize: 11.5 },
};
