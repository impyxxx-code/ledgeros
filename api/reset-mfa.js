// ── Admin: Reset a locked-out user's MFA ────────────────────────────────────
// Deletes a user's verified TOTP factor(s) so they can re-enroll on next
// login. Requires the service-role key — a user's own JWT can only manage
// their own MFA factors, not another user's.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  // ── Auth gate: caller must be a logged-in admin ───────────────────────────
  const jwt = (req.headers["authorization"] || "").replace("Bearer ", "").trim();
  if (!jwt) return res.status(401).json({ error: "Unauthorized" });

  let callerId;
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
    });
    if (!userRes.ok) return res.status(401).json({ error: "Unauthorized" });
    const user = await userRes.json();
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });
    callerId = user.id;
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerId}&select=role`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const profs = await profRes.json();
    if (!Array.isArray(profs) || profs[0]?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
  } catch {
    return res.status(500).json({ error: "Could not verify admin status" });
  }

  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: "user_id required" });

  try {
    // Fetch the target user to find their MFA factor IDs
    const targetRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!targetRes.ok) return res.status(404).json({ error: "User not found" });
    const target = await targetRes.json();
    const factors = Array.isArray(target.factors) ? target.factors : [];

    if (factors.length === 0) {
      return res.status(200).json({ success: true, removed: 0, message: "No MFA factors were set up for this user." });
    }

    let removed = 0;
    for (const factor of factors) {
      const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}/factors/${factor.id}`, {
        method: "DELETE",
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      if (delRes.ok) removed++;
    }

    return res.status(200).json({ success: true, removed });
  } catch (err) {
    console.error("[reset-mfa] error:", err);
    return res.status(500).json({ error: "Failed to reset MFA" });
  }
}
