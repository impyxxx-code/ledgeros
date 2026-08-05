-- ============================================================================
-- SELFTEST_RECONCILE_JOURNAL.sql — LIVE proof of reconcile_invoice_journal()
--
-- Targets a REAL *posted* invoice (status not draft/cancelled, amount > 0) that
-- already has a sale journal, simulates a +100 edit, calls the RPC, and shows the
-- journal now matches the new amount with exactly ONE AR/Sales pair (proving the
-- old entries were reversed, not duplicated). Ends in ROLLBACK — nothing saved.
--
-- Types: journal_entries.source_id = TEXT, account_id/accounts.id = UUID.
--
-- PASS ==  ar_debit_after = sales_credit_after = amount_after (= amount_before + 100)
--     AND  ar_entry_count = sales_entry_count = 1
--     AND  (rpc_result) new_amount - old_amount = 100, reposted = true
-- ============================================================================
begin;

-- 1) Simulate an edit: +100 on the lowest-id POSTED invoice that has a sale journal
update invoices set amount = amount + 100
 where id::text = (select je.source_id from journal_entries je
     join invoices i on i.id::text = je.source_id
    where je.source_type = 'invoice' and i.status not in ('draft','cancelled') and coalesce(i.amount,0) > 0
    order by je.source_id limit 1);

-- 2) Reconcile — reverses the old Dr AR / Cr Sales, reposts for the new amount
select reconcile_invoice_journal(
  (select je.source_id from journal_entries je
     join invoices i on i.id::text = je.source_id
    where je.source_type = 'invoice' and i.status not in ('draft','cancelled') and coalesce(i.amount,0) > 0
    order by je.source_id limit 1)::uuid
) as rpc_result;

-- 3) PROOF (paste THIS row): journal matches the edited amount, exactly one pair
select i.invoice_number,
       (i.amount - 100) as amount_before,
       i.amount         as amount_after,
       sum(je.debit)  filter (where je.account_id = (select id from accounts where code = '1100')) as ar_debit_after,
       sum(je.credit) filter (where je.account_id = (select id from accounts where code = '4000')) as sales_credit_after,
       count(*) filter (where je.account_id = (select id from accounts where code = '1100')) as ar_entry_count,
       count(*) filter (where je.account_id = (select id from accounts where code = '4000')) as sales_entry_count
from invoices i
join journal_entries je on je.source_type = 'invoice' and je.source_id = i.id::text
where i.id::text = (select je2.source_id from journal_entries je2
     join invoices i2 on i2.id::text = je2.source_id
    where je2.source_type = 'invoice' and i2.status not in ('draft','cancelled') and coalesce(i2.amount,0) > 0
    order by je2.source_id limit 1)
group by i.invoice_number, i.amount;

rollback;   -- <<< nothing above is saved
