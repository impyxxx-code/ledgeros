-- ============================================================================
-- LedgerOS — Stock-movement ledger
-- ----------------------------------------------------------------------------
-- Immutable audit trail of every stock change (receipt, adjustment, manual
-- edit, opening balance). Answers "why is this SKU at N?". Additive + RLS.
-- Run BEFORE deploying the stock-ledger UI.
-- ============================================================================

create table if not exists public.stock_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references public.products(id) on delete cascade,
  product_name   text,
  delta          numeric not null default 0,        -- + in, - out
  balance_after  numeric,                            -- stock level after this move
  reason         text,                               -- receipt | adjustment | manual | opening | count
  ref_type       text,                               -- purchase_order | stock_adjustment | manual | product
  ref_id         text,                               -- id/number of the source doc
  note           text,
  created_by     uuid,
  created_by_name text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_stock_moves_product on public.stock_movements(product_id, created_at desc);

alter table public.stock_movements enable row level security;
grant select, insert on public.stock_movements to authenticated;   -- append-only for staff
revoke all on public.stock_movements from anon;

drop policy if exists stock_moves_select on public.stock_movements;
create policy stock_moves_select on public.stock_movements for select to authenticated using (true);
drop policy if exists stock_moves_insert on public.stock_movements;
create policy stock_moves_insert on public.stock_movements for insert to authenticated with check (true);
-- no update/delete policies => the ledger is immutable (admins can still purge via service role)

-- Verify: select * from pg_policies where tablename = 'stock_movements';
