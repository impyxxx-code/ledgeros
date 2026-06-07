export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Auth gate: verify Supabase JWT ────────────────────────────────────────
  const authHeader = req.headers["authorization"] || "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userRes = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "apikey": process.env.VITE_SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${jwt}`
      }
    });
    if (!userRes.ok) return res.status(401).json({ error: "Unauthorized" });
    const user = await userRes.json();
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const { to, subject, html, from_name } = req.body;
  if (!to || !subject || !html) return res.status(400).json({ error: "Missing fields" });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) return res.status(400).json({ error: "Invalid recipient email" });
  if (subject.length > 500) return res.status(400).json({ error: "Subject too long" });
  if (html.length > 100000) return res.status(400).json({ error: "Body too large" });

  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_KEY) return res.status(500).json({ error: "SendGrid key not configured" });

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: "noreply@arkos.uk", name: from_name || "Arkham Retail Ltd" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (response.status === 202) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: "Send failed" });
    }
  } catch {
    return res.status(500).json({ error: "Internal error" });
  }
}
