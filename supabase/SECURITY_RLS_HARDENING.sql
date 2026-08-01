-- ============================================================================
-- LedgerOS — RLS HARDENING migration
-- ----------------------------------------------------------------------------
-- Context: RLS is ENABLED on every table, but almost all policies are
-- `using (true) / with_check (true)` for the `authenticated` role, and the
-- `anon` role has full table grants. Net effect today: any logged-in agent can
-- read/write/delete ALL data and PROMOTE THEMSELVES TO ADMIN, and journal_lines
-- is readable by anon. This script closes those holes.
--
-- ⚠️  Run in a LOW-TRAFFIC window. Sections 1–3 are safe & tested-by-review and
--     should be run as-is. Sections 4–5 DROP existing policies — read them,
--     then run per table. After running, re-test signup, login, invoice create,
--     user approval, activity feed, and confirm an agent CANNOT set role=admin.
-- ============================================================================


-- 1) Role helper (SECURITY DEFINER => bypasses RLS, avoids recursion) ----------
create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
grant execute on function public.auth_role() to authenticated;


-- 2) P0 — profiles: stop self-privilege-escalation ----------------------------
create or replace function public.prevent_profile_privesc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.auth_role() not in ('admin','manager') then
    if new.role is distinct from old.role
       or new.approved is distinct from old.approved then
      raise exception 'Not allowed to change role or approval status.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_no_privesc on public.profiles;
create trigger profiles_no_privesc before update on public.profiles
  for each row execute function public.prevent_profile_privesc();

drop policy if exists "authenticated_all_profiles" on public.profiles;
drop policy if exists "profiles_write"            on public.profiles;
drop policy if exists "profiles_insert"           on public.profiles;
-- keep existing profiles_read (SELECT true) for name/role display

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and coalesce(role,'agent') = 'agent');

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid());               -- role/approved blocked by the trigger

drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage on public.profiles
  for all to authenticated
  using (public.auth_role() in ('admin','manager'))
  with check (public.auth_role() in ('admin','manager'));


-- 3) P0 — audit_log: append-only, staff-read, no update/delete ----------------
drop policy if exists "authenticated_all_audit_log" on public.audit_log;
-- keep existing "Allow insert authenticated" (INSERT) so events can be written
drop policy if exists audit_read_staff on public.audit_log;
create policy audit_read_staff on public.audit_log
  for select to authenticated using (public.auth_role() in ('admin','manager'));


-- 4) Anon lockdown + hygiene --------------------------------------------------
revoke all privileges on all tables in schema public from anon;

drop policy if exists "Lines visible with entries" on public.journal_lines;
drop policy if exists journal_lines_read on public.journal_lines;
create policy journal_lines_read on public.journal_lines
  for select to authenticated using (true);

revoke truncate, references, trigger on all tables in schema public from authenticated;


-- 5) P1 — restrict destructive DELETE to ADMIN ONLY (decided 1 Aug 2026) ------
--    Agents/managers keep full read/create/edit; only admins can DELETE the two
--    financial-integrity tables. Idempotent — safe to re-run.
-- invoices
drop policy if exists "Authenticated users only" on public.invoices;   -- was ALL true (redundant; S/I/U covered separately)
drop policy if exists "authenticated_delete_invoices" on public.invoices;
drop policy if exists invoices_delete_admin on public.invoices;
create policy invoices_delete_admin on public.invoices
  for delete to authenticated using (public.auth_role() = 'admin');
-- invoice_payments
drop policy if exists "authenticated_delete_invoice_payments" on public.invoice_payments;
drop policy if exists inv_pay_delete_admin on public.invoice_payments;
create policy inv_pay_delete_admin on public.invoice_payments
  for delete to authenticated using (public.auth_role() = 'admin');
-- (credit_notes already has NO delete policy => deletes denied; nothing to do.)


-- 6) P2 — agent record visibility --------------------------------------------
--    DECISION (1 Aug 2026): agents SEE ALL invoices. Current policies already
--    allow all authenticated users to read invoices, so NO CHANGE is required.


-- 7) Verify — re-run PART 1 of SECURITY_RLS_AUDIT.sql. No policy on a business
--    table should read `true` for a broad role except reference data you intend
--    to be shared; `anon` should have no table privileges.
