// ── Audit Trail Logger ────────────────────────────────────────────────────────
export const logAudit = async (token, userId, action, entity, entityId, details) => {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/audit_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        user_id: userId,
        action,
        entity,
        entity_id: entityId || null,
        details: details || null,
        created_at: new Date().toISOString()
      })
    });
  } catch(e) { /* audit log errors suppressed in production */ }
};
