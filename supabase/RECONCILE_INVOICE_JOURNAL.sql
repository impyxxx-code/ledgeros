-- ============================================================================
-- RECONCILE_INVOICE_JOURNAL.sql
-- Keep an invoice's sale journal (Dr AR / Cr Sales) in step with its amount.
--
-- Invoice CREATION posts postInvoiceJournal() (Dr Accounts Receivable 1100 /
-- Cr Sales 4000 for the invoice amount, keyed source_type='invoice', source_id).
-- Editing the invoice used to change `amount` on the row but never touch the
-- journal, so the GL / P&L / AR silently drifted by the edit delta.
--
-- This function makes the invoice's sale journal match its CURRENT state, in ONE
-- transaction (so there is never a half-reversed ledger):
--   1. reverse the balance effect of the existing invoice sale entries, delete them
--   2. re-post for the invoice's current amount — but only when it should carry a
--      journal (non-draft, non-cancelled, amount > 0), mirroring create-time rules
--
-- Call it AFTER patching the invoice row. It is self-correcting and idempotent:
--   * no prior entry (e.g. invoice created before journalling began, or as draft)
--     → nothing to reverse, posts a fresh correct pair (improves GL completeness)
--   * draft/cancelled now → reverses and does not re-post
-- Only source_type='invoice' rows are touched; payment entries are left alone.
--
-- Balance convention matches journal.js bumpBalance(): each account's `balance`
-- was increased by the entry amount (AR += amt, Sales += amt), so reversal
-- subtracts (debit + credit) per account.
-- ============================================================================

create or replace function reconcile_invoice_journal(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
-- NOTE on types (confirmed against live schema):
--   journal_entries.source_id  = TEXT  (app stores the invoice UUID as a string)
--   journal_entries.account_id = UUID  (matches accounts.id)
-- So ONLY source_id needs the ::text form (via v_id_text); account_id / accounts.id
-- comparisons stay uuid=uuid. Mismatching these throws 42883 / 42804.
declare
  v_inv        record;
  v_ar_id      uuid;
  v_sales_id   uuid;
  v_id_text    text := p_invoice_id::text;
  v_old_amount numeric := 0;
  v_new_amount numeric := 0;
  v_reposted   boolean := false;
begin
  select * into v_inv from invoices where id = p_invoice_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select id into v_ar_id    from accounts where code = '1100';
  select id into v_sales_id from accounts where code = '4000';
  if v_ar_id is null or v_sales_id is null then
    return jsonb_build_object('ok', false, 'reason', 'accounts_missing');
  end if;

  -- Old posted amount (AR debit already on the books for this invoice; 0 if none)
  select coalesce(sum(debit), 0) into v_old_amount
    from journal_entries
   where source_type = 'invoice' and source_id = v_id_text and account_id = v_ar_id;

  -- 1) Reverse the existing invoice entries' balance effect, then delete them.
  update accounts a
     set balance = coalesce(a.balance, 0) - x.amt
    from (select account_id, sum(coalesce(debit, 0) + coalesce(credit, 0)) as amt
            from journal_entries
           where source_type = 'invoice' and source_id = v_id_text
           group by account_id) x
   where a.id = x.account_id;

  delete from journal_entries
   where source_type = 'invoice' and source_id = v_id_text;

  -- 2) Re-post for the invoice's current state (create-time eligibility rules).
  v_new_amount := coalesce(v_inv.amount, 0);
  if v_inv.status is distinct from 'draft'
     and v_inv.status is distinct from 'cancelled'
     and v_new_amount > 0 then
    insert into journal_entries (entry_date, account_id, debit, credit, description, source_type, source_id)
    values
      (v_inv.invoice_date, v_ar_id,    v_new_amount, 0,            'Invoice ' || v_inv.invoice_number, 'invoice', v_id_text),
      (v_inv.invoice_date, v_sales_id, 0,            v_new_amount, 'Invoice ' || v_inv.invoice_number, 'invoice', v_id_text);
    update accounts set balance = coalesce(balance, 0) + v_new_amount where id = v_ar_id;
    update accounts set balance = coalesce(balance, 0) + v_new_amount where id = v_sales_id;
    v_reposted := true;
  end if;

  return jsonb_build_object(
    'ok', true,
    'old_amount', v_old_amount,
    'new_amount', case when v_reposted then v_new_amount else 0 end,
    'reposted', v_reposted
  );
end;
$$;

grant execute on function reconcile_invoice_journal(uuid) to anon, authenticated, service_role;
