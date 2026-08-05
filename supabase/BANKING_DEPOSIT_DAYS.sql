-- ============================================================================
-- BANKING_DEPOSIT_DAYS.sql
-- Shared, durable banking-reconciliation state (replaces localStorage).
--
-- BankingPage stored "day banked" flags + deposit-slip refs in the browser's
-- localStorage — per-device, lost on cache-clear, invisible to other staff. This
-- table makes that state server-side so any signed-in user sees the same banked
-- days and references.
--
-- One row per calendar day. The client upserts partial rows (only banked, or only
-- deposit_ref) — PostgREST merge-duplicates only SETs the columns supplied, so
-- marking a day banked never wipes its deposit_ref and vice-versa.
--
-- updated_by is TEXT (stores the user id as a string) to avoid uuid/text casting
-- issues; this table never joins on it.
-- ============================================================================

create table if not exists banking_deposit_days (
  deposit_date date primary key,
  banked       boolean     not null default false,
  deposit_ref  text,
  updated_by   text,
  updated_at   timestamptz not null default now()
);

alter table banking_deposit_days enable row level security;

-- Signed-in users (role authenticated) can read and maintain banking state.
drop policy if exists "bdd_select" on banking_deposit_days;
drop policy if exists "bdd_insert" on banking_deposit_days;
drop policy if exists "bdd_update" on banking_deposit_days;
create policy "bdd_select" on banking_deposit_days for select to authenticated using (true);
create policy "bdd_insert" on banking_deposit_days for insert to authenticated with check (true);
create policy "bdd_update" on banking_deposit_days for update to authenticated using (true) with check (true);

grant select, insert, update on banking_deposit_days to authenticated;
