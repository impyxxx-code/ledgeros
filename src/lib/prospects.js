// ── Prospect / CRM data helpers ───────────────────────────────────────────────
// Thin wrappers over the Supabase REST client (sb) for the CRM pipeline module.
// Mirrors the conventions in supplierBills.js / invoicing.js: pass the auth token
// through explicitly, return plain rows, keep query strings PostgREST-shaped.
import { sb } from "./supabase.js";

export const STAGES = [
  "New", "Researching", "Contacted", "Engaged", "Sampled", "Quoted", "Won", "Lost", "Do-Not-Contact",
];
// Stages shown as columns on the pipeline board (terminal states get their own filter).
export const BOARD_STAGES = ["New", "Researching", "Contacted", "Engaged", "Sampled", "Quoted"];
export const PRIORITIES = ["High", "Medium", "Low", "Unclassified"];
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2, Unclassified: 3 };

// UK mobile (07…) → WhatsApp click-to-chat link.
export function whatsappLink(phone) {
  const d = String(phone || "").replace(/\D/g, "").replace(/^0044/, "0").replace(/^44/, "0");
  return d.startsWith("07") && d.length === 11 ? `https://wa.me/44${d.slice(1)}` : null;
}

// Page through a table in 1000-row batches. PostgREST caps every response at
// `max-rows` (1000 on Supabase by default), so a bare `limit=5000` silently
// returns only the first 1000 — we must offset-paginate to get every row.
// The base query MUST carry a stable `order=` for offset paging to be correct.
async function getAll(token, table, baseQuery, pageSize = 1000) {
  const out = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await sb.get(token, table, `${baseQuery}&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < pageSize) break;
  }
  return out;
}

// Load the full pipeline: every prospect + all their contacts (both paginated).
export async function loadProspects(token) {
  const [prospects, contacts] = await Promise.all([
    getAll(token, "prospects", "order=lead_priority.asc,business_name.asc"),
    getAll(token, "prospect_contacts", "select=prospect_id,kind,label,value&order=prospect_id.asc"),
  ]);
  const byId = {};
  (Array.isArray(prospects) ? prospects : []).forEach((p) => { p.contacts = []; byId[p.id] = p; });
  (Array.isArray(contacts) ? contacts : []).forEach((c) => { if (byId[c.prospect_id]) byId[c.prospect_id].contacts.push(c); });
  return Object.values(byId).sort(
    (a, b) => (PRIORITY_RANK[a.lead_priority] ?? 3) - (PRIORITY_RANK[b.lead_priority] ?? 3)
      || (a.business_name || "").localeCompare(b.business_name || ""),
  );
}

export const emailsOf = (p) => (p.contacts || []).filter((c) => c.kind === "email").map((c) => c.value);
export const phonesOf = (p) => (p.contacts || []).filter((c) => c.kind === "phone");
export const mobileOf = (p) => (phonesOf(p).find((c) => c.label === "mobile") || {}).value || null;
export const socialsOf = (p) => (p.contacts || []).filter((c) => c.kind === "facebook" || c.kind === "instagram");

// Preferred outreach channel for sequencing (WhatsApp first, then email, then phone).
export function channelOf(p) {
  if (mobileOf(p)) return "WhatsApp";
  if (emailsOf(p).length) return "Email";
  if (phonesOf(p).length) return "Phone";
  return "None";
}

// Update a prospect (stage move, owner, next action…). Logs a stage-change activity.
export async function updateProspect(token, id, patch, activity) {
  const rows = await sb.patch(token, "prospects", id, patch);
  if (activity) await logProspectActivity(token, id, activity);
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function logProspectActivity(token, prospectId, { channel, direction = "out", outcome, note }) {
  return sb.post(token, "prospect_activity", { prospect_id: prospectId, channel, direction, outcome, note });
}

export async function loadActivity(token, prospectId) {
  return sb.get(token, "prospect_activity", `prospect_id=eq.${prospectId}&order=created_at.desc&limit=200`);
}

// Convert a won prospect into a customer (server-side, atomic). Returns contact id.
export async function convertToCustomer(token, prospectId) {
  return sb.rpc(token, "convert_prospect_to_customer", { p_id: prospectId });
}

// Pipeline summary for the dashboard strip.
export function summarise(prospects) {
  const s = { total: prospects.length, byStage: {}, byPriority: {}, whatsapp: 0, email: 0, dueToday: 0, brands: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const parentCounts = {};
  for (const p of prospects) {
    s.byStage[p.stage] = (s.byStage[p.stage] || 0) + 1;
    s.byPriority[p.lead_priority] = (s.byPriority[p.lead_priority] || 0) + 1;
    if (mobileOf(p)) s.whatsapp++;
    if (emailsOf(p).length) s.email++;
    if (p.next_action_date && p.next_action_date <= today && !["Won", "Lost", "Do-Not-Contact"].includes(p.stage)) s.dueToday++;
    const parent = (p.parent_company || "").trim();
    if (parent) parentCounts[parent] = (parentCounts[parent] || 0) + 1;
  }
  s.brands = Object.values(parentCounts).filter((n) => n >= 2).length; // multi-site brands
  return s;
}
