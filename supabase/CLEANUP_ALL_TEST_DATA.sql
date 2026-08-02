-- ============================================================================
-- LedgerOS — consolidated cleanup of ALL test data created during the
-- procure-to-pay, inventory and credit-control verification (Aug 2026).
-- ----------------------------------------------------------------------------
-- Each block is independent and labelled. Read the comment, then run the
-- block(s) you want. Nothing here is destructive to real business data as
-- written, but REVIEW before running — especially blocks marked [REVIEW].
-- Run in the Supabase SQL editor. "Success. No rows returned" = done.
-- ============================================================================


-- ── BLOCK A — Supplier bills + their test GL  (procure-to-pay) ───────────────
-- Removes the £12 test bill's ledger lines and reverses the balances they moved
-- (COGS was +£12, Cash −£12; Accounts Payable already nets to zero), then the
-- test bills themselves (payments cascade). Safe while these are the only
-- supplier bills in the system.
delete from public.journal_entries where source_type in ('supplier_bill','supplier_payment');
update public.accounts set balance = balance - 12 where code = '5000';  -- Cost of Goods Sold
update public.accounts set balance = balance + 12 where code = '1000';  -- Cash & Checking
delete from public.supplier_bills where bill_number = 'TEST-BILL-001';
delete from public.supplier_bills where bill_number is null and total = 12;


-- ── BLOCK B — INNOKIN T stock back to 30  (inventory ledger test) ────────────
-- Test moves pushed VAPE:INNOKIN T to 32 (real value 30): a PO-001 test receipt
-- (+1) and a manual stock-ledger test (+1). Reset the level, and clear its test
-- movement rows so the per-product history is clean.
update public.products set stock_qty = 30 where name = 'VAPE:INNOKIN T';
delete from public.stock_movements
  where product_id = (select id from public.products where name = 'VAPE:INNOKIN T');


-- ── BLOCK C — PO-002 test reorder  (delete; was draft, no GL) ────────────────
delete from public.purchase_order_lines
  where po_id = (select id from public.purchase_orders where po_number = 'PO-002');
delete from public.purchase_orders where po_number = 'PO-002';


-- ── BLOCK D — SUMIT credit-control test note  (collections log) ──────────────
delete from public.collection_notes
  where customer_name = 'SUMIT TODAYS SHOP'
    and note like 'Verifying collections log%';


-- ── BLOCK E — [REVIEW] PO-001 test goods receipt ────────────────────────────
-- Only run if PO-001 was itself test data (not a real purchase order you want to
-- keep). Block B already reset the stock level; this reverses PO-001's receipt
-- status so it isn't shown as received. Uncomment to run.
-- update public.purchase_order_lines set qty_received = 0
--   where po_id = (select id from public.purchase_orders where po_number = 'PO-001');
-- update public.purchase_orders set status = 'sent', received_date = null
--   where po_number = 'PO-001';


-- ── VERIFY (optional) ────────────────────────────────────────────────────────
-- select code, balance from public.accounts where code in ('1000','5000');
-- select stock_qty from public.products where name = 'VAPE:INNOKIN T';           -- expect 30
-- select count(*) from public.supplier_bills;                                    -- expect 0 (if no real bills yet)
-- select count(*) from public.purchase_orders where po_number in ('PO-001','PO-002');
-- select count(*) from public.collection_notes;                                 -- expect 0 (if no real notes yet)
