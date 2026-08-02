-- ============================================================================
-- LedgerOS — Credit Control (slices 2 & 3)
-- ----------------------------------------------------------------------------
-- Slice 2: per-customer credit limit + credit hold (2 columns on contacts).
-- Slice 3: collections log (promise-to-pay + chase notes) — new table.
-- Additive + RLS. Safe to run once; re-running is a no-op.
-- ============================================================================

-- ── Slice 2 — credit limit + hold ───────────────────────────────────────────
alter table public.contacts add column if not exists credit_limit numeric default 0;      -- 0 = no limit
alter table public.contacts add column if not exists credit_hold  boolean default false;   -- true = block/warn new sales

-- ── Slice 3 — collections log ───────────────────────────────────────────────
create table if not exists public.collection_notes (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid references public.contacts(id) on delete cascade,
  customer_name   text,
  note            text,
  outcome         text,        -- promise_to_pay | no_answer | left_message | dispute | paid | other
  promise_date    date,        -- promised payment date (nullable)
  promise_amount  numeric,     -- promised amount (nullable)
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_collection_notes_contact on public.collection_notes(contact_id, created_at desc);

alter table public.collection_notes enable row level security;
grant select, insert on public.collection_notes to authenticated;   -- append-only for staff
revoke all on public.collection_notes from anon;

drop policy if exists collection_notes_select on public.collection_notes;
create policy collection_notes_select on public.collection_notes for select to authenticated using (true);
drop policy if exists collection_notes_insert on public.collection_notes;
create policy collection_notes_insert on public.collection_notes for insert to authenticated with check (true);
-- no update/delete policies => append-only (admins can still purge via service role)

-- Verify:
--   select column_name from information_schema.columns where table_name='contacts' and column_name in ('credit_limit','credit_hold');
--   select * from pg_policies where tablename='collection_notes';
