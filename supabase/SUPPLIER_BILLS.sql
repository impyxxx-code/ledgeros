-- ============================================================================
-- LedgerOS — Procure-to-Pay, Slice 2: Supplier Bills (Accounts Payable)
-- ----------------------------------------------------------------------------
-- Creates two new tables + RLS mirroring the invoices/AR side. Idempotent and
-- additive — safe to run on production. Run BEFORE deploying the Bills UI.
-- ============================================================================

-- 1) Tables --------------------------------------------------------------------
create table if not exists public.supplier_bills (
  id           uuid primary key default gen_random_uuid(),
  bill_number  text,                                   -- the supplier's own invoice ref
  supplier_id  uuid references public.contacts(id),
  supplier_name text,
  po_id        uuid references public.purchase_orders(id),  -- optional link to a PO
  bill_date    date not null default current_date,
  due_date     date,
  subtotal     numeric not null default 0,
  vat          numeric not null default 0,
  total        numeric not null default 0,
  amount_paid  numeric not null default 0,
  balance      numeric not null default 0,
  status       text not null default 'unpaid',         -- unpaid | partial | paid
  notes        text,
  created_by   uuid,
  created_at   timestamptz not null default now()
);

create table if not exists public.supplier_bill_payments (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid references public.supplier_bills(id) on delete cascade,
  supplier_name  text,
  amount         numeric not null default 0,
  method         text default 'bank',                  -- bank | cash | card | cheque
  payment_date   date not null default current_date,
  notes          text,
  recorded_by    uuid,
  recorded_by_name text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_supplier_bills_supplier on public.supplier_bills(supplier_name);
create index if not exists idx_supplier_bills_status   on public.supplier_bills(status);
create index if not exists idx_sbp_bill                on public.supplier_bill_payments(bill_id);

-- 2) Grants + RLS (mirrors invoices: staff read/write, delete admin-only) ------
alter table public.supplier_bills          enable row level security;
alter table public.supplier_bill_payments  enable row level security;

grant select, insert, update, delete on public.supplier_bills         to authenticated;
grant select, insert, update, delete on public.supplier_bill_payments to authenticated;
revoke all on public.supplier_bills         from anon;
revoke all on public.supplier_bill_payments from anon;

-- supplier_bills
drop policy if exists supplier_bills_select on public.supplier_bills;
create policy supplier_bills_select on public.supplier_bills for select to authenticated using (true);
drop policy if exists supplier_bills_insert on public.supplier_bills;
create policy supplier_bills_insert on public.supplier_bills for insert to authenticated with check (true);
drop policy if exists supplier_bills_update on public.supplier_bills;
create policy supplier_bills_update on public.supplier_bills for update to authenticated using (true);
drop policy if exists supplier_bills_delete on public.supplier_bills;
create policy supplier_bills_delete on public.supplier_bills for delete to authenticated using (public.auth_role() = 'admin');

-- supplier_bill_payments
drop policy if exists sbp_select on public.supplier_bill_payments;
create policy sbp_select on public.supplier_bill_payments for select to authenticated using (true);
drop policy if exists sbp_insert on public.supplier_bill_payments;
create policy sbp_insert on public.supplier_bill_payments for insert to authenticated with check (true);
drop policy if exists sbp_update on public.supplier_bill_payments;
create policy sbp_update on public.supplier_bill_payments for update to authenticated using (true);
drop policy if exists sbp_delete on public.supplier_bill_payments;
create policy sbp_delete on public.supplier_bill_payments for delete to authenticated using (public.auth_role() = 'admin');

-- Verify: select * from pg_policies where tablename in ('supplier_bills','supplier_bill_payments');
