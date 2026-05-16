export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, subject, html, from_name } = req.body;
  if (!to || !subject || !html) return res.status(400).json({ error: "Missing fields" });

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
        from: { email: "ARKHAMRETAIL@GMAIL.COM", name: from_name || "Arkham Retail Ltd" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (response.status === 202) {
      return res.status(200).json({ success: true });
    } else {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
