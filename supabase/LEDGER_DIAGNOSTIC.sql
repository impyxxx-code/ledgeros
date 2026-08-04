-- ============================================================================
-- LEDGER_DIAGNOSTIC.sql — READ-ONLY ledger integrity diagnostic
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor (Project: szcogfyrhlrsxnwepnea).
-- SAFE: contains ONLY SELECT statements. It changes NOTHING. Run each block and
-- share the results — they confirm (from the database itself) the figures we
-- read off the reporting screens, before any remediation is designed.
--
-- Context: the Trial Balance shows "Unbalanced -£114,202.75". Investigation via
-- the app suggests (a) the journal itself is balanced, (b) the denormalised
-- accounts.balance cache has drifted from the journal, and (c) the journal only
-- covers ~23 Jun 2026 onward, so it is missing pre-go-live history. These queries
-- prove or disprove each of those.
-- ============================================================================

-- 1) Is the JOURNAL internally balanced?  (expect total_debit = total_credit)
select 'journal balance' as check,
       coalesce(sum(debit),0)  as total_debit,
       coalesce(sum(credit),0) as total_credit,
       coalesce(sum(debit),0) - coalesce(sum(credit),0) as diff,
       count(*) as journal_lines
from public.journal_entries;

-- 2) Journal date coverage (earliest / latest posting).
select 'journal date range' as check,
       min(entry_date) as earliest,
       max(entry_date) as latest,
       count(distinct source_id) as distinct_sources
from public.journal_entries;

-- 3) Per-account: STORED accounts.balance vs the balance RECOMPUTED from the
--    journal (natural side: Asset/Expense = debit-credit, else credit-debit).
--    'drift' = stored - journal_computed. Non-zero drift = cache out of sync.
select a.code, a.name, a.type,
       a.balance as stored_balance,
       case when a.type in ('Asset','Expense')
            then coalesce(sum(je.debit - je.credit), 0)
            else coalesce(sum(je.credit - je.debit), 0) end as journal_computed,
       a.balance -
       case when a.type in ('Asset','Expense')
            then coalesce(sum(je.debit - je.credit), 0)
            else coalesce(sum(je.credit - je.debit), 0) end as drift
from public.accounts a
left join public.journal_entries je on je.account_id = a.id
group by a.id, a.code, a.name, a.type, a.balance
order by a.code;

-- 4) Owner's Equity (3000): how many journal entries actually back it?
--    (expect 0 if the £111k is an unbacked seed.)
select 'owner equity entries' as check, count(*) as entries
from public.journal_entries je
join public.accounts a on a.id = je.account_id
where a.code = '3000';

-- 5) INVOICES not yet journalled — count, value, and date span.
--    (an invoice is "journalled" if a source_type='invoice' entry exists for it)
select 'invoices missing journal' as check,
       count(*) as invoices,
       coalesce(sum(i.amount), 0) as total_amount,
       min(i.created_at) as earliest,
       max(i.created_at) as latest
from public.invoices i
where coalesce(i.status,'') <> 'cancelled'
  and not exists (
    select 1 from public.journal_entries je
    where je.source_type = 'invoice'
      and je.source_id::text = i.id::text
  );

-- 6) Sales coverage: total invoiced (ex-cancelled) vs total journalled to Sales.
select 'sales coverage' as check,
       (select coalesce(sum(amount),0) from public.invoices
         where coalesce(status,'') <> 'cancelled')                         as total_invoiced,
       (select coalesce(sum(credit),0) from public.journal_entries
         where source_type = 'invoice')                                     as journalled_sales;

-- 7) Payment coverage: total payments recorded vs total journalled to Cash.
--    NOTE: payment journals key on invoice_id, not payment id, so a partially
--    paid invoice can look "journalled" after its first payment — compare TOTALS,
--    not row counts, to size the gap.
select 'payment coverage' as check,
       (select coalesce(sum(amount),0) from public.invoice_payments)        as total_payments,
       (select coalesce(sum(debit),0)  from public.journal_entries
         where source_type = 'payment')                                     as journalled_payments;

-- 8) Sanity: does journal-computed AR match real outstanding receivables?
--    (real AR ≈ sum of unpaid invoice balances)
select 'AR vs outstanding' as check,
       (select case when a.type in ('Asset','Expense')
                    then coalesce(sum(je.debit - je.credit),0)
                    else coalesce(sum(je.credit - je.debit),0) end
          from public.accounts a
          left join public.journal_entries je on je.account_id = a.id
         where a.code = '1100' group by a.type)                              as journal_ar,
       (select coalesce(sum(greatest(coalesce(amount,0) - coalesce(amount_paid,0), 0)),0)
          from public.invoices
         where coalesce(status,'') not in ('cancelled','paid'))              as outstanding_from_invoices;

-- ============================================================================
-- Nothing above modifies data. Share the 8 result sets and we'll design the
-- remediation (system-go-live opening balances vs full back-post) from real
-- figures, with the accountant's opening position.
-- ============================================================================
