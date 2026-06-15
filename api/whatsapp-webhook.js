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
    let customerName   = contact?.name || profileName;

    // ── 2. Fetch product catalogue ────────────────────────────────────────────
    const prodRes = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id,name,sale_price,unit,vat_rate&order=name.asc`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const prodData = await prodRes.json();
    const products = Array.isArray(prodData) ? prodData : [];

    // ── 2b. Fetch product aliases ─────────────────────────────────────────────
    const aliasRes = await fetch(
      `${SUPABASE_URL}/rest/v1/product_aliases?select=alias,product_id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const aliasData = await aliasRes.json();
    const aliases   = Array.isArray(aliasData) ? aliasData : [];

    // ── 3. Parse the order message ────────────────────────────────────────────
    // Customers send "Product Name" headers followed by one variant per line
    // (e.g. "Hayati 6k Device" then 7 flavours = qty 7 of "Hayati 6k Device")
    const { items: parsedItems, nameHints } = parseOrder(msgBody, products, aliases);
    const lines       = [];
    const unmatched   = [];

    // ── 3b. If the message names a customer (e.g. "DISHA CONVENIENCE - LEEDS"),
    // prefer matching that against contacts over the sender's phone-matched
    // contact — orders are often sent from a shared/staff phone on behalf
    // of many different customers ─────────────────────────────────────────
    if (nameHints.length) {
      const allContactsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/contacts?select=id,name&order=name.asc`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      );
      const allContactsData = await allContactsRes.json();
      const allContacts     = Array.isArray(allContactsData) ? allContactsData : [];

      for (const hint of nameHints) {
        const h = hint.toLowerCase().trim();
        const match = allContacts.find(c => {
          const n = (c.name || '').toLowerCase().trim();
          return n && (h.includes(n) || n.includes(h));
        });
        if (match) { customerName = match.name; break; }
      }
    }

    for (const item of parsedItems) {
      const qty = Math.max(item.qty, 1);
      if (item.product) {
        lines.push({
          description : item.product.name,
          qty,
          unit_price  : parseFloat(item.product.sale_price || 0),
          vat_rate    : parseFloat(item.product.vat_rate || 0),
          unit        : item.product.unit || 'unit',
        });
      } else {
        unmatched.push(`${qty}× ${item.unmatchedName}`);
        lines.push({
          description : `${item.unmatchedName} ⚠️ UNMATCHED`,
          qty,
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
 * Parse a WhatsApp order into matched line items.
 *
 * Real order format — WhatsApp *bold* lines mark category/product headers;
 * each header starts a new group, and the plain lines underneath it
 * (each counting as +1, or ":N" for an explicit quantity) sum into that
 * group's running quantity until the next bold line:
 *
 *   *DISHA CONVENIENCE - LEEDS*   ← bold, no variants below → name hint
 *   *INVOICE*                     ← bold, no variants below → ignored hint
 *
 *   *Hayati 6k pods*               ← bold header — matched to a product
 *   Strawberry watermelon:1        ← variant → qty +1
 *   Cola lime:1                    ← variant → qty +1
 *   ...                            ← group closes at next bold line, qty=5
 *
 *   *Hayati 6k device*              ← new header (fuzzy-matched too)
 *   Juicy peach:1
 *   Strawberry kiwi:1
 *
 *   *Hayato 25k pods*                ← bold header that matches no product
 *   Mr blue:1                        → kept as an UNMATCHED group, qty summed
 *   Fresh mint:1
 *
 * A standalone (non-bold) line with no active group and an explicit
 * quantity (e.g. "Redbull 2" or "2x Redbull") is still its own item.
 *
 * Returns: { items: [{ product, qty } | { unmatchedName, qty }], nameHints }
 */
function parseOrder(text, products, aliases) {
  const rawLines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  const nameHints = [];
  let current = null; // { product?, unmatchedName?, qty }

  const closeCurrent = () => {
    if (!current) return;
    if (current.qty > 0) {
      items.push(current);
    } else {
      const label = current.product ? current.product.name : current.unmatchedName;
      if (label) nameHints.push(label);
    }
    current = null;
  };

  // Extract a quantity from a line, e.g. "Strawberry watermelon:1" / "Redbull 2" / "2x Redbull" → {qty, name}
  // Returns hadQty:true only if an explicit quantity pattern was found.
  const extractQty = (line) => {
    let m = line.match(/^(.+?):\s*(\d+)\s*$/);               // "Strawberry watermelon:1"
    if (m) return { qty: parseInt(m[2], 10) || 1, name: m[1].trim(), hadQty: true };
    m = line.match(/^(\d+)\s*[x×]\s*(.+)$/i);                // "2x Redbull"
    if (m) return { qty: parseInt(m[1], 10) || 1, name: m[2].trim(), hadQty: true };
    m = line.match(/^(.+?)\s*[x×]\s*(\d+)$/i);               // "Redbull x2"
    if (m) return { qty: parseInt(m[2], 10) || 1, name: m[1].trim(), hadQty: true };
    m = line.match(/^(\d+)\s+(.+)$/);                        // "2 Redbull"
    if (m) return { qty: parseInt(m[1], 10) || 1, name: m[2].trim(), hadQty: true };
    m = line.match(/^(.+?)\s+(\d+)$/);                       // "Redbull 2"
    if (m) return { qty: parseInt(m[2], 10) || 1, name: m[1].trim(), hadQty: true };
    return { qty: 1, name: line, hadQty: false };
  };

  for (const line of rawLines) {
    const isBold = /^[*_~]+.+[*_~]+$/.test(line);

    if (isBold) {
      closeCurrent();
      const clean = line.replace(/^[*_~]+|[*_~]+$/g, '').trim();
      if (!clean) continue;
      const product = matchProduct(clean, products, aliases);
      current = product ? { product, qty: 0 } : { unmatchedName: clean, qty: 0 };
      continue;
    }

    const { qty, name, hadQty } = extractQty(line);

    if (current) {
      current.qty += qty;
      continue;
    }

    // No active group — standalone line
    const product = matchProduct(name, products, aliases);
    if (product) {
      items.push({ product, qty });
    } else if (hadQty) {
      items.push({ unmatchedName: name, qty });
    } else if (items.length === 0 && nameHints.length === 0) {
      nameHints.push(line);
    }
  }

  closeCurrent();
  return { items, nameHints };
}

/**
 * Fuzzy-match a product name against the catalogue
 * Priority: exact → starts-with → contains → partial token match
 */
function matchProduct(query, products, aliases = []) {
  const q = query.toLowerCase().trim();
  if (!q || !products.length) return null;

  // 0. Alias match (manually mapped customer wording → product)
  const aliasHit = aliases.find(a => (a.alias || '').toLowerCase().trim() === q);
  if (aliasHit) {
    const p = products.find(p => p.id === aliasHit.product_id);
    if (p) return p;
  }

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
  // Ignore short tokens (e.g. "&", "m", "r") to avoid spurious matches like "Adam" → "R & M"
  const qTokens = q.split(/\s+/).filter(t => t.length >= 3);
  if (qTokens.length === 0) return null;
  hit = products.find(p => {
    const pTokens = p.name.toLowerCase().split(/[\s:]+/).filter(t => t.length >= 3);
    if (pTokens.length === 0) return false;
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
