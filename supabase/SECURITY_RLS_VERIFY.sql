-- ============================================================================
-- LedgerOS — RLS posture VERIFY (red-flags only)
-- ----------------------------------------------------------------------------
-- Read-only. Safe to run any time. Unlike SECURITY_RLS_AUDIT.sql (which dumps
-- every table), this returns ONLY problems. A clean bill of health = every
-- query below returns ZERO rows. Run after adding any new table/feature.
-- ============================================================================

-- FLAG 1 — Public tables with RLS DISABLED (wide open to any logged-in user).
--          Expect: no rows.
select '❌ RLS DISABLED' as issue, c.relname as table_name
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
order  by c.relname;

-- FLAG 2 — RLS enabled but ZERO policies (deny-all: app breaks) OR needs review.
--          Expect: no rows. (A table here is either broken or was just added
--          without policies.)
select '⚠️ RLS ON, NO POLICIES' as issue, c.relname as table_name
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
left   join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where  n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = true
group  by c.relname
having count(p.policyname) = 0
order  by c.relname;

-- FLAG 3 — ANON role can touch business data (the original vuln). Expect: no rows.
select '❌ ANON HAS GRANT' as issue, table_name,
       string_agg(privilege_type, ', ' order by privilege_type) as privs
from   information_schema.role_table_grants
where  grantee = 'anon' and table_schema = 'public'
group  by table_name
order  by table_name;

-- FLAG 4 — Sensitive tables that still have a blanket `using (true)` policy for
--          authenticated (the "everyone can do everything" pattern the audit
--          fixed). Expect: no rows for these tables.
select '⚠️ BLANKET using(true)' as issue, tablename, policyname, cmd, roles
from   pg_policies
where  schemaname = 'public'
  and  tablename in ('profiles','audit_log','journal_lines','invoices','invoice_payments')
  and  cmd in ('UPDATE','DELETE','ALL')
  and  (qual = 'true' or qual is null)
  and  'authenticated' = any (roles)
order  by tablename, cmd;
