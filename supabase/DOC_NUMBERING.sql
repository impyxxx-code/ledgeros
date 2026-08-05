-- ============================================================================
-- DOC_NUMBERING.sql — atomic, race-free document numbering for INV / PO / CN
-- ----------------------------------------------------------------------------
-- Run ONCE in the Supabase SQL editor (Project: szcogfyrhlrsxnwepnea).
-- Idempotent — safe to re-run.
--
-- Why: invoice / purchase-order / credit-note numbers were generated in the
-- browser (read the current max, add 1). Two people creating a document at the
-- same moment could mint the SAME number, and deleting one could let the next
-- reuse it. This moves allocation into the database, where an UPDATE ... RETURNING
-- takes a row lock so callers serialise and every number is unique and monotonic.
--
-- Deploy order does NOT matter: the app falls back to the old max+1 behaviour
-- until this runs, then upgrades itself to the atomic path automatically.
-- ============================================================================

-- 1) Counter table — one row per prefix, holding the last-issued number.
create table if not exists public.document_counters (
  prefix         text primary key,
  current_value  bigint      not null default 0,
  updated_at     timestamptz not null default now()
);

-- Lock it down — only the SECURITY DEFINER function below may read/write it.
alter table public.document_counters enable row level security;
revoke all on public.document_counters from anon, authenticated;

-- 2) Seed each counter from the current max of the existing series.
--    (regexp strips prefix + padding; only well-formed numbers are considered.)
insert into public.document_counters (prefix, current_value)
values
  ('INV', coalesce((select max((regexp_replace(invoice_number, '\D', '', 'g'))::bigint)
                    from public.invoices        where invoice_number ~ '^INV-[0-9]+$'), 0)),
  ('PO',  coalesce((select max((regexp_replace(po_number,      '\D', '', 'g'))::bigint)
                    from public.purchase_orders where po_number      ~ '^PO-[0-9]+$'),  0)),
  ('CN',  coalesce((select max((regexp_replace(cn_number,      '\D', '', 'g'))::bigint)
                    from public.credit_notes    where cn_number      ~ '^CN-[0-9]+$'),  0))
on conflict (prefix) do update
  set current_value = greatest(public.document_counters.current_value, excluded.current_value);

-- 3) Atomic, SELF-HEALING allocator. UPDATE ... RETURNING locks the counter row,
--    so concurrent callers serialise and can never get the same value.
--    Self-heal: before incrementing, take the greatest of the stored counter and
--    the actual max number already in the series. This makes it impossible to ever
--    hand back a number that already exists — even if a row was created OUTSIDE
--    this counter (the client max+1 fallback when the RPC call failed, a CSV
--    import, or a manual re-seed), which is what caused duplicate-key errors.
create or replace function public.next_doc_number(p_prefix text, p_pad int default 4)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v bigint;
  m bigint := 0;
begin
  insert into public.document_counters(prefix, current_value)
    values (p_prefix, 0) on conflict (prefix) do nothing;

  -- Highest number already issued in this series (0 if none).
  if p_prefix = 'INV' then
    select coalesce(max((regexp_replace(invoice_number, '\D', '', 'g'))::bigint), 0) into m
      from public.invoices        where invoice_number ~ '^INV-[0-9]+$';
  elsif p_prefix = 'PO' then
    select coalesce(max((regexp_replace(po_number, '\D', '', 'g'))::bigint), 0) into m
      from public.purchase_orders where po_number      ~ '^PO-[0-9]+$';
  elsif p_prefix = 'CN' then
    select coalesce(max((regexp_replace(cn_number, '\D', '', 'g'))::bigint), 0) into m
      from public.credit_notes    where cn_number      ~ '^CN-[0-9]+$';
  end if;

  update public.document_counters
    set current_value = greatest(current_value, m) + 1, updated_at = now()
    where prefix = p_prefix
    returning current_value into v;

  return p_prefix || '-' || lpad(v::text, p_pad, '0');
end;
$$;

-- 4) Allow logged-in users to call it (RLS on the table still blocks direct access).
grant execute on function public.next_doc_number(text, int) to authenticated;

-- ----------------------------------------------------------------------------
-- Verify (each SELECT below CONSUMES one number for that series — only run to test):
--   select public.next_doc_number('INV', 4);   -- e.g. INV-0304
--   select public.next_doc_number('PO', 3);    -- e.g. PO-013
--   select public.next_doc_number('CN', 3);    -- e.g. CN-004
-- Inspect current counters (read-only) as the table owner:
--   select * from public.document_counters order by prefix;
-- ============================================================================
