-- ============================================================================
-- LedgerOS — Procure-to-Pay, Slice 1: Goods Receipt
-- ----------------------------------------------------------------------------
-- Additive & idempotent. Safe to run on production in any window — it only
-- ADDS columns (no drops, no data change). Run this BEFORE deploying the
-- goods-receipt UI.
--
-- What it enables: receiving a purchase order updates product stock, and each
-- PO line remembers how much has been received (so partial deliveries work).
-- ============================================================================

-- Per-line received quantity — drives partial receipts and "outstanding" maths.
alter table public.purchase_order_lines
  add column if not exists qty_received numeric not null default 0;

-- When the PO was (last) received against.
alter table public.purchase_orders
  add column if not exists received_date date;

-- (The purchase_orders.status column already exists and is free-text; the app
--  now also uses the value 'partial' alongside draft / sent / received.)

-- Verify:
--   select column_name, data_type, column_default
--   from information_schema.columns
--   where table_schema='public'
--     and ((table_name='purchase_order_lines' and column_name='qty_received')
--       or (table_name='purchase_orders'      and column_name='received_date'));
