-- ============================================================================
-- LedgerOS — Bank Reconciliation: persist the "reconciled" flag
-- ----------------------------------------------------------------------------
-- Until now bank rec was a session-only review tool. This adds an append-only
-- side table that records which recorded payments have been reconciled against
-- a bank statement — so confirmed matches stick between sessions and stop
-- reappearing as noise. Modelled exactly on collection_notes / stock_movements
-- (staff select+insert, admin-only delete, anon revoked). No changes to the
-- sensitive payment tables themselves. Additive + idempotent — safe to re-run.
-- ============================================================================

create table if not exists public.bank_reconciliations (
  id                 uuid primary key default gen_random_uuid(),
  payment_kind       text not null,          -- 'in' = invoice_payments · 'out' = supplier_bill_payments
  payment_id         uuid not null,          -- the reconciled payment's id
  statement_ref      text,                   -- label for the statement (date range / filename)
  amount             numeric,                -- payment amount at time of reconciliation (audit convenience)
  reconciled_by      uuid,
  reconciled_by_name text,
  created_at         timestamptz not null default now(),
  unique (payment_kind, payment_id)          -- a given payment reconciles once
);

create index if not exists idx_bank_recon_payment on public.bank_reconciliations(payment_kind, payment_id);

alter table public.bank_reconciliations enable row level security;
grant select, insert on public.bank_reconciliations to authenticated;   -- append-only for staff
revoke all on public.bank_reconciliations from anon;

drop policy if exists bank_recon_select on public.bank_reconciliations;
create policy bank_recon_select on public.bank_reconciliations
  for select to authenticated using (true);

drop policy if exists bank_recon_insert on public.bank_reconciliations;
create policy bank_recon_insert on public.bank_reconciliations
  for insert to authenticated with check (true);

-- Un-reconcile (mistake correction) is admin-only. auth_role() was created by
-- SECURITY_RLS_HARDENING.sql; if it doesn't exist yet, run that first.
drop policy if exists bank_recon_delete on public.bank_reconciliations;
create policy bank_recon_delete on public.bank_reconciliations
  for delete to authenticated using (public.auth_role() = 'admin');

-- Verify:
--   select * from pg_policies where tablename='bank_reconciliations';
