-- ============================================================================
-- RECEIVE_PURCHASE_ORDER.sql
-- Atomic goods receipt for a purchase order.
--
-- Replaces the old client-side write chain (Purchases.jsx confirmReceive), which
-- fired separate un-transacted patches per line — stock, qty_received, PO status —
-- with NO rollback. A failure mid-chain could leave stock incremented while the PO
-- line still showed the units unreceived (phantom stock → receivable twice), or a
-- stuck spinner with a half-applied receipt. It also did a stale read-modify-write
-- on stock_qty (absolute overwrite), which loses concurrent updates.
--
-- This function does the whole receipt in ONE transaction:
--   * locks each PO line (FOR UPDATE) so two concurrent receipts can't double-count
--   * clamps each qty server-side to the remaining (ordered - already received)
--   * increments product stock atomically (stock_qty = stock_qty + delta)
--   * bumps qty_received, recomputes PO status (received / partial), stamps date
--   * returns a per-line summary so the client can update UI + log movements
--
-- Stock-movement + audit logging stay client-side (non-critical, informational);
-- the money/stock-correctness writes are all inside this transaction.
--
-- p_receipts is a JSON array: [{ "line_id": "<uuid>", "qty": <number> }, ...]
-- Safe to call repeatedly — already-received quantities are clamped out.
-- ============================================================================

create or replace function receive_purchase_order(p_po_id uuid, p_receipts jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po            record;
  v_item          jsonb;
  v_line          record;
  v_req           numeric;
  v_applied       numeric;
  v_new_stock     numeric;
  v_lines         jsonb := '[]'::jsonb;
  v_any           boolean := false;
  v_all_complete  boolean;
  v_received_any  boolean;
  v_status        text;
begin
  select * into v_po from purchase_orders where id = p_po_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_po.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'reason', 'cancelled');
  end if;

  -- Apply each requested line
  for v_item in select * from jsonb_array_elements(coalesce(p_receipts, '[]'::jsonb))
  loop
    select * into v_line
      from purchase_order_lines
     where id = (v_item->>'line_id')::uuid
       and po_id = p_po_id
     for update;                          -- serialize concurrent receipts on this line
    if not found then
      continue;
    end if;

    v_req := coalesce((v_item->>'qty')::numeric, 0);
    -- never over-receive: clamp to what's still outstanding on the line
    v_applied := greatest(0, least(v_req, coalesce(v_line.qty, 0) - coalesce(v_line.qty_received, 0)));
    if v_applied <= 0 then
      continue;
    end if;
    v_any := true;

    if v_line.product_id is not null then
      update products
         set stock_qty = coalesce(stock_qty, 0) + v_applied
       where id = v_line.product_id
       returning stock_qty into v_new_stock;   -- atomic increment, no lost update
    else
      v_new_stock := null;
    end if;

    update purchase_order_lines
       set qty_received = coalesce(qty_received, 0) + v_applied
     where id = v_line.id;

    v_lines := v_lines || jsonb_build_object(
      'line_id',      v_line.id,
      'product_id',   v_line.product_id,
      'product_name', v_line.product_name,
      'applied',      v_applied,
      'new_stock',    v_new_stock,
      'qty_received', coalesce(v_line.qty_received, 0) + v_applied
    );
  end loop;

  -- Recompute PO status across ALL its lines (coalesce guards a PO with no lines)
  select coalesce(bool_and(coalesce(qty_received, 0) >= coalesce(qty, 0)), false),
         coalesce(bool_or(coalesce(qty_received, 0) > 0), false)
    into v_all_complete, v_received_any
    from purchase_order_lines
   where po_id = p_po_id;

  if v_all_complete then
    v_status := 'received';
  elsif v_received_any then
    v_status := 'partial';
  else
    v_status := v_po.status;      -- nothing received yet → leave as-is
  end if;

  update purchase_orders
     set status = v_status,
         received_date = case when v_received_any then current_date else received_date end
   where id = p_po_id;

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'received_any', v_any,
    'lines', v_lines
  );
end;
$$;

grant execute on function receive_purchase_order(uuid, jsonb) to anon, authenticated, service_role;

-- ── Quick self-test (optional; rolls back, changes nothing) ───────────────────
-- Replace the UUID with a real PO id, run inside a transaction you ROLLBACK:
--   begin;
--   select receive_purchase_order(
--     '00000000-0000-0000-0000-000000000000'::uuid,
--     '[{"line_id":"<line-uuid>","qty":1}]'::jsonb
--   );
--   rollback;
