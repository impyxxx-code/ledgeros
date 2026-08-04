-- ============================================================================
-- VERIFY_CN6.sql — READ-ONLY proof that the credit-note fix (#6) works live.
-- ----------------------------------------------------------------------------
-- Run AFTER you: create an invoice for ADAM (~£10), create a £15 credit note
-- with that invoice as "Related Invoice", then Issue → Apply it.
-- Contains only SELECTs — changes nothing.
--
-- Expected with the fix:
--   recorded_payment  = invoice_amount   (only the part that FIT, e.g. £10)
--   excess_credit     = cn_amount - invoice_amount   (the leftover, e.g. £5)
--   invoice_status    = 'paid'
-- Before the fix it would have been: recorded_payment = £15, excess_credit = £0.
-- ============================================================================

with cn as (
  select * from public.credit_notes
   order by created_at desc
   limit 1                                   -- the note you just created
),
inv as (
  select i.* from public.invoices i, cn where cn.invoice_id::text = i.id::text
),
pay as (
  select coalesce(sum(p.amount), 0) as recorded_payment, count(*) as payment_rows
  from public.invoice_payments p, cn
  where p.invoice_id::text = cn.invoice_id::text and p.method = 'credit_note'
),
cred as (
  select coalesce(sum(c.amount), 0) as excess_credit, count(*) as credit_rows
  from public.customer_credits c, cn
  where c.source_invoice = cn.cn_number
)
select
  cn.cn_number,
  cn.customer_name,
  cn.amount                as cn_amount,
  cn.status                as cn_status,
  inv.invoice_number,
  inv.amount               as invoice_amount,
  inv.amount_paid,
  inv.balance,
  inv.status               as invoice_status,
  pay.recorded_payment,                         -- FIX: = invoice_amount, not cn_amount
  cred.excess_credit,                           -- FIX: = cn_amount - invoice_amount
  case
    when inv.invoice_number is null then 'ℹ️ credit note has no linked invoice'
    when pay.recorded_payment = inv.amount
     and cred.excess_credit  = (cn.amount - inv.amount)
     and inv.status = 'paid'
    then '✅ PASS — payment recorded the fitted amount; excess banked as credit'
    else '❌ CHECK — compare recorded_payment vs invoice_amount and excess_credit'
  end as verdict
from cn
left join inv  on true
left join pay  on true
left join cred on true;
