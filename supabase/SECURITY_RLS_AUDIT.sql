-- ============================================================================
-- LedgerOS — Row Level Security audit & hardening
-- Run PART 1 (read-only) in the Supabase SQL editor to see your current state.
-- PART 2 is templates — READ, adapt to your business rules, then run.
-- Nothing here is destructive until you run PART 2.
-- ============================================================================


-- ============================================================================
-- PART 1 — AUDIT (read-only, safe to run as-is)
-- ============================================================================

-- 1a. Which public tables have RLS enabled? Anything DISABLED is wide open to
--     any logged-in user (and to anon if the anon role has grants).
select c.relname            as table_name,
       case when c.relrowsecurity then 'enabled' else '❌ DISABLED' end as rls_status,
       case when c.relforcerowsecurity then 'forced' else '-' end       as force_rls
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public' and c.relkind = 'r'
order  by c.relrowsecurity asc, c.relname;

-- 1b. All policies, per table. Review that each sensitive table has policies
--     that actually match your intent (who can select/insert/update/delete).
select tablename, policyname, cmd, roles, qual as using_expr, with_check
from   pg_policies
where  schemaname = 'public'
order  by tablename, cmd;

-- 1c. Tables with RLS ON but NO policies = effectively deny-all (app breaks),
--     OR tables with RLS OFF = open. Both are worth eyeballing.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       count(p.policyname) as policy_count
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
left   join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where  n.nspname = 'public' and c.relkind = 'r'
group  by c.relname, c.relrowsecurity
order  by policy_count asc, c.relname;

-- 1d. What can the ANON role touch? Should be EMPTY for business tables.
--     (The app falls back to the anon key when a token is missing.)
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privs
from   information_schema.role_table_grants
where  grantee = 'anon' and table_schema = 'public'
group  by table_name
order  by table_name;

-- 1e. What can the authenticated role touch at the GRANT level?
--     (RLS still applies on top, but broad grants + missing RLS = exposure.)
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privs
from   information_schema.role_table_grants
where  grantee = 'authenticated' and table_schema = 'public'
group  by table_name
order  by table_name;


-- ============================================================================
-- PART 2 — HARDENING TEMPLATES (review, adapt, then run)
-- ----------------------------------------------------------------------------
-- Business rules to decide FIRST:
--   * Should an agent see only THEIR OWN invoices/contacts, or everyone's?
--     (The app's AgentDashboard filters by created_by, but the admin Invoices
--      page shows all — decide and encode it here; the UI won't enforce it.)
--   * Who may DELETE (invoices, profiles, prices)? Recommend admin/manager only.
-- ============================================================================

-- 2a. Role helper (SECURITY DEFINER avoids RLS recursion when reading profiles).
create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to authenticated;

-- 2b. Lock down anon: it should not read/write business data.
-- revoke all on all tables in schema public from anon;

-- 2c. profiles — the critical self-escalation guard.
-- alter table public.profiles enable row level security;
-- -- everyone signed-in can read profiles (needed for names/roles in the UI):
-- create policy profiles_read on public.profiles
--   for select to authenticated using (true);
-- -- a user may update their OWN profile but NOT their role or approval flag:
-- create policy profiles_update_self on public.profiles
--   for update to authenticated
--   using (id = auth.uid())
--   with check (
--     id = auth.uid()
--     and role     = (select role     from public.profiles where id = auth.uid())
--     and approved is not distinct from (select approved from public.profiles where id = auth.uid())
--   );
-- -- only admins/managers may change role/approval or edit others:
-- create policy profiles_admin_manage on public.profiles
--   for all to authenticated
--   using (public.auth_role() in ('admin','manager'))
--   with check (public.auth_role() in ('admin','manager'));

-- 2d. Sensitive/business tables — enable RLS + sane policies.
--     Repeat this block per table: invoices, contacts, invoice_payments,
--     customer_credits, customer_prices, products, purchase_orders,
--     delivery_notes, accounts, journal_entries, audit_log.
--
-- Example: invoices where agents see/edit only their own, staff see all,
--          and only admin/manager can delete.
-- alter table public.invoices enable row level security;
-- create policy invoices_select on public.invoices
--   for select to authenticated
--   using (created_by = auth.uid() or public.auth_role() in ('admin','manager'));
-- create policy invoices_insert on public.invoices
--   for insert to authenticated
--   with check (created_by = auth.uid());
-- create policy invoices_update on public.invoices
--   for update to authenticated
--   using (created_by = auth.uid() or public.auth_role() in ('admin','manager'));
-- create policy invoices_delete on public.invoices
--   for delete to authenticated
--   using (public.auth_role() in ('admin','manager'));

-- 2e. audit_log — append-only. Nobody should update/delete; reads staff-only.
-- alter table public.audit_log enable row level security;
-- create policy audit_insert on public.audit_log
--   for insert to authenticated with check (true);
-- create policy audit_read on public.audit_log
--   for select to authenticated using (public.auth_role() in ('admin','manager'));
-- (no update/delete policies => those actions are denied)

-- 2f. Verify again after applying — re-run PART 1. Every business table should
--     show rls_status = enabled with policies that match the rules above.
