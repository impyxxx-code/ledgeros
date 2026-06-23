// ── Outbound WhatsApp Sender ─────────────────────────────────────────────────
// Called from LedgerOS frontend to send invoices, reminders, statements etc.
// Secured by Supabase JWT auth — only authenticated users can trigger sends.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth gate ─────────────────────────────────────────────────────────────
  const jwt = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey        : process.env.VITE_SUPABASE_ANON_KEY,
        Authorization : `Bearer ${jwt}`,
      },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Unauthorized' });
    const user = await userRes.json();
    if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── Validate input ────────────────────────────────────────────────────────
  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'Missing: to, message' });
  if (message.length > 4096) return res.status(400).json({ error: 'Message too long' });

  // Normalise phone: "07801567209" → "whatsapp:+447801567209"
  const normPhone = normalisePhone(to);
  if (!normPhone) return res.status(400).json({ error: 'Invalid phone number' });

  // ── Restrict to known contacts only — prevents using this as an open relay
  // to send arbitrary messages to arbitrary numbers via the business's WhatsApp ─
  const ukLocal = '0' + normPhone.replace('+44', '');
  try {
    const contactRes = await fetch(
      `${process.env.VITE_SUPABASE_URL}/rest/v1/contacts?or=(phone.eq.${encodeURIComponent(normPhone)},phone.eq.${encodeURIComponent(ukLocal)})&select=id&limit=1`,
      { headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` } }
    );
    const contactRows = await contactRes.json();
    if (!Array.isArray(contactRows) || contactRows.length === 0) {
      return res.status(403).json({ error: 'Recipient must be an existing contact' });
    }
  } catch {
    return res.status(500).json({ error: 'Could not verify recipient' });
  }

  const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
  const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  try {
    const url     = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
    const encoded = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64');

    const twilioRes = await fetch(url, {
      method  : 'POST',
      headers : {
        Authorization  : `Basic ${encoded}`,
        'Content-Type' : 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From : FROM_NUMBER,
        To   : `whatsapp:${normPhone}`,
        Body : message,
      }).toString(),
    });

    if (twilioRes.ok) {
      const data = await twilioRes.json();
      return res.status(200).json({ success: true, sid: data.sid });
    } else {
      const err = await twilioRes.json();
      console.error('[send-whatsapp] Twilio error:', err);
      return res.status(500).json({ error: err.message || 'Send failed' });
    }
  } catch (err) {
    console.error('[send-whatsapp] error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

function normalisePhone(raw) {
  if (!raw) return null;
  // Already has whatsapp: prefix
  const digits = raw.replace(/whatsapp:/i, '').replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) return digits;              // already international
  if (digits.startsWith('07') && digits.length === 11)   // UK mobile
    return '+44' + digits.slice(1);
  if (digits.startsWith('44')) return '+' + digits;      // 44... without +
  return null;
}
