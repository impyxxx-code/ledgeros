// ── P&L reporting helpers ─────────────────────────────────────────────────────

// Cost of Goods SOLD for a set of invoices — the cost of the products actually
// sold, read from each invoice's line items (qty × the product's cost_price).
//
// It is recognised in proportion to how much of each invoice has been COLLECTED
// (amount_paid / amount), so it matches the cash-basis revenue the P&L shows
// (revenue = Σ amount_paid): a fully-paid invoice contributes all its goods' cost,
// a half-paid one contributes half, an unpaid one contributes nothing.
//
// This replaces the old P&L calculation which used Σ(stock_qty × cost_price) — the
// value of ALL inventory on hand — as "COGS", producing a false gross loss.
export const computeCOGS = (invoices, products) => {
  const costById = new Map();
  const costByName = new Map();
  for (const p of products || []) {
    const cost = parseFloat(p.cost_price) || 0;
    if (p.id != null) costById.set(p.id, cost);
    if (p.name != null && !costByName.has(p.name)) costByName.set(p.name, cost);
  }
  // Mirror the app's line→product resolution: by product_id, else by description.
  const costOf = (line) => {
    if (line.product_id != null && costById.has(line.product_id)) return costById.get(line.product_id);
    if (line.description != null && costByName.has(line.description)) return costByName.get(line.description);
    return 0;
  };

  let cogs = 0;
  for (const inv of invoices || []) {
    if (!inv) continue;
    const amount = parseFloat(inv.amount) || 0;
    if (amount <= 0) continue;
    const paidRatio = Math.min(1, Math.max(0, (parseFloat(inv.amount_paid) || 0) / amount));
    if (paidRatio <= 0) continue;
    let lines = inv.lines;
    if (typeof lines === "string") { try { lines = JSON.parse(lines); } catch { lines = []; } }
    if (!Array.isArray(lines)) lines = [];
    let lineCost = 0;
    for (const l of lines) lineCost += (parseFloat(l.qty) || 0) * costOf(l);
    cogs += lineCost * paidRatio;
  }
  return Math.round(cogs * 100) / 100;
};
