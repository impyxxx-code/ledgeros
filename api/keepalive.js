// Daily keep-alive ping (scheduled in vercel.json).
// Performs one tiny read against the database so the Supabase free-tier
// project always registers activity and never auto-pauses.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: "Supabase env vars not set" });
  }
  try {
    const r = await fetch(url + "/rest/v1/invoices?select=id&limit=1", {
      headers: { apikey: key, Authorization: "Bearer " + key },
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, upstream: r.status, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e) });
  }
}
