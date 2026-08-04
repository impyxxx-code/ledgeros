-- ============================================================================
-- CLEANUP_CN6.sql — remove the #6 test data (run AFTER VERIFY_CN6.sql passes).
-- ----------------------------------------------------------------------------
-- Removes the most-recent credit note, its banked excess credit, and its linked
-- test invoice (via the ledger-safe cascade, so the invoice's journal + the
-- credit-note payment row are reversed too). Safe: it prints what it removed.
--
-- ⚠️  It targets the MOST RECENT credit note. Only run this right after the test,
--     before creating any other real credit notes.
-- ============================================================================

do $$
declare
  v_cn  public.credit_notes;
  v_inv uuid;
begin
  select * into v_cn from public.credit_notes order by created_at desc limit 1;
  if v_cn.id is null then
    raise notice 'No credit note found — nothing to clean.';
    return;
  end if;
  v_inv := v_cn.invoice_id;

  -- 1) remove the excess customer credit banked from this note
  delete from public.customer_credits where source_invoice = v_cn.cn_number;

  -- 2) remove the credit note itself (must go before the invoice cascade, whose
  --    guard blocks deleting an invoice that still has credit notes attached)
  delete from public.credit_notes where id = v_cn.id;

  -- 3) remove the linked test invoice ledger-safely — reverses its journal AND
  --    deletes the credit-note payment row (invoice_payments) in one transaction
  if v_inv is not null then
    perform public.delete_invoice_cascade(v_inv);
  end if;

  raise notice 'Cleaned up credit note % (customer %) and invoice id %.',
    v_cn.cn_number, v_cn.customer_name, coalesce(v_inv::text, '(none)');
end $$;
