-- ============================================================================
-- DELETE_INVOICE_CASCADE.sql — ledger-safe invoice deletion
-- ----------------------------------------------------------------------------
-- Run ONCE in the Supabase SQL editor (Project: szcogfyrhlrsxnwepnea).
-- Idempotent — safe to re-run.
--
-- Why: deleting an invoice used to fire a bare DELETE on the invoices row only.
-- Its double-entry postings (journal_entries) and payment rows (invoice_payments)
-- were left behind, and the denormalised accounts.balance running totals were
-- never unwound. Result: the P&L, Balance Sheet, Trial Balance and General Ledger
-- kept counting an invoice that no longer exists.
--
-- This function reverses the invoice's own bookkeeping AND deletes the invoice in
-- a single transaction, so the ledger can never be left half-updated:
--   1. reverse the accounts.balance contribution of every journal entry it posted
--   2. delete those journal_entries  (source_type 'invoice' + 'payment')
--   3. delete its invoice_payments rows
--   4. delete the invoice row
--
-- It deliberately does NOT touch independent, customer-facing records. If the
-- invoice has credit_notes or customer_credits attached, the delete is BLOCKED
-- (returns ok=false) and the caller is told to set the invoice to "cancelled"
-- instead — those documents must be handled deliberately, never swept.
--
-- Deploy order: ship the app code first (it blocks the delete with a clear
-- message until this exists), then run this. No coordination window risk.
-- ============================================================================

create or replace function public.delete_invoice_cascade(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number   text;
  v_entries  int := 0;
  v_payments int := 0;
begin
  -- Invoice must exist.
  select invoice_number into v_number from public.invoices where id = p_invoice_id;
  if not found then
    return jsonb_build_object('ok', false, 'blocked', 'not_found');
  end if;

  -- Guard: never sweep independent customer-facing documents.
  if exists (
    select 1 from public.credit_notes
     where invoice_id::text = p_invoice_id::text
  ) then
    return jsonb_build_object('ok', false, 'blocked', 'credit_notes');
  end if;

  if v_number is not null and v_number <> '' and exists (
    select 1 from public.customer_credits
     where source_invoice = v_number
  ) then
    return jsonb_build_object('ok', false, 'blocked', 'customer_credits');
  end if;

  -- 1) Reverse the denormalised account balances this invoice's entries added.
  --    Asset/Expense accounts are debit-normal (delta = debit - credit); all
  --    others are credit-normal (delta = credit - debit). Subtract that delta.
  update public.accounts a
     set balance = coalesce(a.balance, 0) - x.delta
    from (
      select je.account_id,
             sum( case when acc.type in ('Asset', 'Expense')
                       then coalesce(je.debit, 0)  - coalesce(je.credit, 0)
                       else coalesce(je.credit, 0) - coalesce(je.debit, 0) end ) as delta
        from public.journal_entries je
        join public.accounts acc on acc.id = je.account_id
       where je.source_id::text = p_invoice_id::text
         and je.source_type in ('invoice', 'payment')
       group by je.account_id
    ) x
   where a.id = x.account_id;

  -- 2) Delete the invoice's journal entries (identical filter to the reversal
  --    above, so the reversed set and the deleted set are always in lockstep).
  with d as (
    delete from public.journal_entries
     where source_id::text = p_invoice_id::text
       and source_type in ('invoice', 'payment')
    returning 1
  ) select count(*) into v_entries from d;

  -- 3) Delete its payment rows.
  with d as (
    delete from public.invoice_payments
     where invoice_id::text = p_invoice_id::text
    returning 1
  ) select count(*) into v_payments from d;

  -- 4) Delete the invoice itself.
  delete from public.invoices where id = p_invoice_id;

  return jsonb_build_object(
    'ok', true,
    'entries_deleted', v_entries,
    'payments_deleted', v_payments
  );
end;
$$;

grant execute on function public.delete_invoice_cascade(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Verify (read-only — pick a REAL id to see what would be reversed first):
--   select id, invoice_number, amount, status from public.invoices order by created_at desc limit 5;
--   select account_id, source_type, debit, credit
--     from public.journal_entries where source_id::text = '<invoice-id>';
-- Then, to actually delete (this DOES mutate):
--   select public.delete_invoice_cascade('<invoice-id>'::uuid);
-- ============================================================================
