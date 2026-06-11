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

    // ── 3b. If no contact matched by phone, try matching a name mentioned
    // at the top of the message (e.g. "Gulam Bhai") against contacts ────────
    if (!contact && nameHints.length) {
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
 * Customers send messages structured as:
 *   "Product Name"        ← header line — names a product
 *   "Variant 1"           ← one unit of the preceding header product
 *   "Variant 2"
 *   "Variant 3a, Variant 3b"  ← comma = 2 separate units
 *
 * So a header followed by N variant lines = qty N of that product.
 * Plain "5 Hayati 6k" / "Hayati 6k x5" style lines (no variants) are
 * still supported as standalone qty-prefixed items.
 *
 * Returns: [{ product, qty }] for matched lines, or
 *          [{ unmatchedName, qty }] when nothing matches.
 */
function parseOrder(text, products, aliases) {
  // Strip WhatsApp markdown (e.g. *Hayati 6k Device* → Hayati 6k Device)
  const rawLines = text.split(/\n/).map(l => l.trim().replace(/^[*_~]+|[*_~]+$/g, '').trim()).filter(Boolean);
  const items = [];
  const nameHints = [];
  let current = null;

  // Strict header match: alias or exact product name only (avoids variant
  // lines like "Ice Pop" accidentally being treated as headers)
  const findHeader = (line) => {
    const q = line.toLowerCase().trim();
    const aliasHit = aliases.find(a => (a.alias || '').toLowerCase().trim() === q);
    if (aliasHit) {
      const p = products.find(p => p.id === aliasHit.product_id);
      if (p) return p;
    }
    return products.find(p => p.name.toLowerCase().trim() === q) || null;
  };

  for (const line of rawLines) {
    const headerProduct = findHeader(line);
    if (headerProduct) {
      current = { product: headerProduct, qty: 0 };
      items.push(current);
      continue;
    }

    // Extract a quantity multiplier from a part, e.g. "Summer dreams x2" → {qty:2, name:"Summer dreams"}
    // or "10 cases" → {qty:10, name:"cases"}. Returns qty:1 + original text if no pattern found.
    const extractQty = (part) => {
      const m1 = part.match(/^(\d+)\s*x?\s+(.+)$/i);          // "10 cases" / "5x Hayati 6k"
      const m2 = part.match(/^(.+?)\s*[x×]\s*(\d+)$/i);        // "Summer dreams x2" / "Fresh mint x 3"
      if (m2) return { qty: parseInt(m2[2], 10) || 1, name: m2[1].trim() };
      if (m1) return { qty: parseInt(m1[1], 10) || 1, name: m1[2].trim() };
      return { qty: 1, name: part };
    };

    const parts = line.split(',').map(p => p.trim()).filter(Boolean);

    if (current) {
      // Variant line(s) within the current header group — add up quantities
      for (const part of parts) {
        current.qty += extractQty(part).qty;
      }
    } else {
      // No active header — only treat as an order item if a quantity pattern was found,
      // otherwise it's a greeting/customer name
      for (const part of parts) {
        const { qty, name } = extractQty(part);
        if (name !== part) {
          const p = matchProduct(name, products, aliases);
          current = p ? { product: p, qty } : { unmatchedName: name, qty };
          items.push(current);
        } else {
          nameHints.push(part);
        }
      }
    }
  }

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
