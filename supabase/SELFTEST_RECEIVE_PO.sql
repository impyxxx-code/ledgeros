-- ============================================================================
-- SELFTEST_RECEIVE_PO.sql  —  LIVE functional proof of receive_purchase_order()
--
-- Exercises the DEPLOYED function against real data, then ROLLS BACK so NOTHING
-- is saved. Run the WHOLE block. The final statement is ROLLBACK, so PO-001,
-- its line, and product stock are left exactly as they were.
--
-- No temp table (avoids the RLS lint). The proof comes from two places:
--   * rpc_result JSON  — each line's "applied" (we ask 999 → must clamp to qty)
--                        and "new_stock" (stock after the atomic increment)
--   * the final SELECT — the DB itself now shows qty_received = qty, status='received'
--
-- PASS == rpc_result.lines[].applied = qty  AND  qty_received = qty  AND  po_status = 'received'
-- ============================================================================
begin;

-- 1) Set the line(s) back to "nothing received" so the increment is demonstrable
--    (rolled back with everything else — does NOT persist)
update purchase_order_lines
   set qty_received = 0
 where po_id = (select id from purchase_orders where po_number = 'PO-001');

-- 2) Call the deployed RPC, asking 999 on every line → must clamp to each line's qty.
--    The returned JSON carries applied + new_stock per line.
select receive_purchase_order(
  (select id from purchase_orders where po_number = 'PO-001'),
  (select jsonb_agg(jsonb_build_object('line_id', id, 'qty', 999))
     from purchase_order_lines
    where po_id = (select id from purchase_orders where po_number = 'PO-001'))
) as rpc_result;

-- 3) PROOF ROW(S) — the DB reflects the receipt. Paste THIS table back to me.
select pol.product_name,
       pol.qty            as ordered,
       pol.qty_received   as received_after,   -- expect = ordered
       p.stock_qty        as stock_after,      -- = prior stock + ordered
       (select status from purchase_orders where po_number = 'PO-001') as po_status  -- expect 'received'
from purchase_order_lines pol
join products p on p.id = pol.product_id
where pol.po_id = (select id from purchase_orders where po_number = 'PO-001');

rollback;   -- <<< nothing above is saved
