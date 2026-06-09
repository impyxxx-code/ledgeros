// ── WhatsApp Inbound Order Webhook ──────────────────────────────────────────
// Receives WhatsApp messages from customers via Twilio
// Parses order → matches products → creates draft invoice → replies to customer

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const SUPABASE_URL    = process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY     = process.env.SUPABASE_SERVICE_KEY;
  const ACCOUNT_SID     = process.env.TWILIO_ACCOUNT_SID;
  const AUTH_TOKEN      = process.env.TWILIO_AUTH_TOKEN;
  const FROM_NUMBER     = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  const body        = req.body || {};
  const from        = body.From   || '';   // e.g. "whatsapp:+447700900000"
  const msgBody     = (body.Body  || '').trim();
  const profileName = body.ProfileName || 'Customer';

  // Always return 200 to Twilio — never let it retry
  if (!from || !msgBody) return res.status(200).send('<Response></Response>');

  // Clean the sender's phone number for Supabase lookup
  const rawPhone = from.replace('whatsapp:', '');
  const ukPhone  = rawPhone.startsWith('+44') ? '0' + rawPhone.slice(3) : rawPhone;

  try {
    // ── 1. Identify customer by phone number ─────────────────────────────────
    const custRes = await fetch(
      `${SUPABASE_URL}/rest/v1/contacts?or=(phone.eq.${encodeURIComponent(ukPhone)},phone.eq.${encodeURIComponent(rawPhone)})&select=id,name,phone&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const contacts     = await custRes.json();
    const contact      = Array.isArray(contacts) && contacts[0] ? contacts[0] : null;
    const customerName = contact?.name || profileName;

    // ── 2. Fetch product catalogue ────────────────────────────────────────────
    const prodRes = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id,name,price,unit,vat_rate&order=name.asc`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const products = Array.isArray(await prodRes.json()) ? await prodRes.clone().json() : [];

    // ── 3. Parse the order message ────────────────────────────────────────────
    const parsedItems = parseOrderMessage(msgBody);
    const lines       = [];
    const unmatched   = [];

    for (const item of parsedItems) {
      const product = matchProduct(item.name, products);
      if (product) {
        lines.push({
          description : product.name,
          qty         : item.qty,
          unit_price  : parseFloat(product.price || 0),
          vat_rate    : parseFloat(product.vat_rate || 0),
          unit        : product.unit || 'unit',
        });
      } else {
        unmatched.push(`${item.qty}× ${item.name}`);
        lines.push({
          description : `${item.name} ⚠️ UNMATCHED`,
          qty         : item.qty,
          unit_price  : 0,
          vat_rate    : 20,
          unit        : 'unit',
        });
      }
    }

    // ── 4. Generate invoice number ────────────────────────────────────────────
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?select=invoice_number&order=invoice_number.desc&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const lastInvs     = await countRes.json();
    const lastNum      = Array.isArray(lastInvs) && lastInvs[0]
      ? parseInt(lastInvs[0].invoice_number.replace(/\D/g, ''), 10) || 0
      : 0;
    const invoiceNumber = `INV-${String(lastNum + 1).padStart(4, '0')}`;

    // ── 5. Calculate totals ───────────────────────────────────────────────────
    const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
    const vatTotal = lines.reduce((s, l) => s + l.qty * l.unit_price * (l.vat_rate / 100), 0);
    const total    = Math.round((subtotal + vatTotal) * 100) / 100;
    const today    = new Date().toISOString().split('T')[0];

    // ── 6. Create draft invoice in Supabase ───────────────────────────────────
    const notes = [
      `📱 WhatsApp order from ${rawPhone} (${profileName})`,
      `Original message: "${msgBody}"`,
      unmatched.length ? `⚠️ Unmatched items: ${unmatched.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
      method  : 'POST',
      headers : {
        apikey         : SERVICE_KEY,
        Authorization  : `Bearer ${SERVICE_KEY}`,
        'Content-Type' : 'application/json',
        Prefer         : 'return=minimal',
      },
      body: JSON.stringify({
        invoice_number : invoiceNumber,
        customer       : customerName,
        invoice_date   : today,
        due_date       : today,
        status         : 'draft',
        amount         : total,
        amount_paid    : 0,
        balance        : total,
        lines          : JSON.stringify(lines),
        notes,
      }),
    });

    // ── 7. Reply to customer on WhatsApp ──────────────────────────────────────
    const itemList    = lines.map(l => `• ${l.description.replace(' ⚠️ UNMATCHED', '')} × ${l.qty}`).join('\n');
    const unmatchNote = unmatched.length
      ? `\n\n⚠️ Couldn't find: ${unmatched.map(u => u.split('× ')[1] || u).join(', ')} — we'll check and update your order.`
      : '';

    const replyMsg = [
      `✅ *Order received, ${profileName}!*`,
      ``,
      `*${invoiceNumber}*`,
      itemList,
      ``,
      `We'll prepare your invoice and send it shortly.${unmatchNote}`,
      ``,
      `_Arkham Retail Ltd · 07801 567209_`,
    ].join('\n');

    await sendWhatsAppMessage(ACCOUNT_SID, AUTH_TOKEN, FROM_NUMBER, from, replyMsg);

    // Twilio expects TwiML 200 response
    return res.status(200).send('<Response></Response>');

  } catch (err) {
    console.error('[whatsapp-webhook] error:', err);
    // Still return 200 so Twilio doesn't retry
    return res.status(200).send('<Response></Response>');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse "5 Hayati 6k, 3 Lost Mary" → [{qty:5,name:"Hayati 6k"},{qty:3,name:"Lost Mary"}]
 */
function parseOrderMessage(text) {
  const items = [];
  // Split on comma, newline, semicolon
  const parts = text.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    let qty = 1;
    let name = part;

    // "5 Hayati 6k" or "5x Hayati 6k"
    const m1 = part.match(/^(\d+)\s*x?\s+(.+)$/i);
    // "Hayati 6k x5" or "Hayati 6k x 5"
    const m2 = part.match(/^(.+?)\s+x\s*(\d+)$/i);
    // "Hayati 6k×5"
    const m3 = part.match(/^(.+?)\s*[×x](\d+)$/i);

    if (m1) { qty = parseInt(m1[1], 10); name = m1[2].trim(); }
    else if (m2) { qty = parseInt(m2[2], 10); name = m2[1].trim(); }
    else if (m3) { qty = parseInt(m3[2], 10); name = m3[1].trim(); }

    if (name) items.push({ qty: qty || 1, name });
  }
  return items;
}

/**
 * Fuzzy-match a product name against the catalogue
 * Priority: exact → starts-with → contains → partial token match
 */
function matchProduct(query, products) {
  const q = query.toLowerCase().trim();
  if (!q || !products.length) return null;

  // 1. Exact match
  let hit = products.find(p => p.name.toLowerCase() === q);
  if (hit) return hit;

  // 2. Product name contains query
  hit = products.find(p => p.name.toLowerCase().includes(q));
  if (hit) return hit;

  // 3. Query contains product shortname (after last colon — e.g. "VAPE:HAYATI 6K" → "hayati 6k")
  hit = products.find(p => {
    const short = p.name.toLowerCase().split(':').pop().trim();
    return q.includes(short) || short.includes(q);
  });
  if (hit) return hit;

  // 4. Token overlap (at least half the query words match product name words)
  const qTokens = q.split(/\s+/);
  hit = products.find(p => {
    const pTokens = p.name.toLowerCase().split(/[\s:]+/);
    const matches = qTokens.filter(t => pTokens.some(pt => pt.includes(t) || t.includes(pt)));
    return matches.length >= Math.ceil(qTokens.length / 2);
  });
  return hit || null;
}

/**
 * Send a WhatsApp message via Twilio REST API
 */
async function sendWhatsAppMessage(accountSid, authToken, from, to, body) {
  const url     = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const encoded = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const res = await fetch(url, {
    method  : 'POST',
    headers : {
      Authorization  : `Basic ${encoded}`,
      'Content-Type' : 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[sendWhatsAppMessage] Twilio error:', err);
  }
  return res;
}
