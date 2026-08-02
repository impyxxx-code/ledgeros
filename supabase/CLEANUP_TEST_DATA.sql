-- ============================================================================
-- One-off cleanup of procure-to-pay TEST data created during verification.
-- Run ONLY while the test rows below are the only supplier bills in the system.
-- Review each step; run the blocks you want.
-- ============================================================================

-- 1) Remove the test GL journal lines (the £12 test bill + its payment).
--    Safe now — the only supplier_bill/supplier_payment ledger lines are the test ones.
delete from public.journal_entries where source_type in ('supplier_bill','supplier_payment');

-- 2) Reverse the balances those lines moved: COGS was +£12, Cash was -£12
--    (Accounts Payable already nets to zero, so it needs no change).
update public.accounts set balance = balance - 12 where code = '5000';  -- Cost of Goods Sold
update public.accounts set balance = balance + 12 where code = '1000';  -- Cash & Checking

-- 3) Delete the test supplier bills (their payments cascade automatically).
delete from public.supplier_bills where bill_number = 'TEST-BILL-001';
delete from public.supplier_bills where bill_number is null and total = 12;

-- 4) (OPTIONAL) Undo the PO-001 test goods receipt — only if PO-001 was test data.
--    Sets VAPE:INNOKIN T back to 30 and PO-001 back to 'sent'.
-- update public.products set stock_qty = 30 where name = 'VAPE:INNOKIN T';
-- update public.purchase_order_lines set qty_received = 0
--   where po_id = (select id from public.purchase_orders where po_number = 'PO-001');
-- update public.purchase_orders set status = 'sent', received_date = null where po_number = 'PO-001';
