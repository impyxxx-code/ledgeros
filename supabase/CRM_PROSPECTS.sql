-- ============================================================================
-- LedgerOS — CRM / Prospects module
-- ----------------------------------------------------------------------------
-- Turns the ARKHAM Retail prospect database into a sales pipeline that lives in
-- the same Postgres as customers, orders and invoices. A won prospect converts
-- into a `contacts` customer row with no re-keying.
--
-- Tables:  prospects · prospect_contacts · prospect_activity · suppression
-- Follows the RLS conventions from SECURITY_RLS_HARDENING.sql:
--   * RLS enabled on every table
--   * public.auth_role() decides admin/manager vs agent
--   * authenticated users read/write; only admin/manager delete
--
-- Safe to run as-is (creates only, no drops of existing objects). Re-runnable.
-- ============================================================================

-- 0) Enums ------------------------------------------------------------------
do $$ begin
  create type prospect_stage as enum
    ('New','Researching','Contacted','Engaged','Sampled','Quoted','Won','Lost','Do-Not-Contact');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_priority as enum ('High','Medium','Low','Unclassified');
exception when duplicate_object then null; end $$;

-- 1) prospects --------------------------------------------------------------
create table if not exists public.prospects (
  id                      uuid primary key default gen_random_uuid(),
  external_ref            text unique,                    -- e.g. WY-0001, for idempotent import
  business_name           text not null,
  trading_name            text,
  legal_company_name      text,
  category                text,
  subcategory             text,
  independent_or_chain    text,
  number_of_locations     int,
  parent_company          text,
  website                 text,
  address1                text,
  address2                text,
  town                    text,
  county                  text,
  postcode                text,
  region                  text,
  country                 text default 'England',
  companies_house_number  text,
  company_status          text,
  registered_company_name text,
  incorporation_date      date,
  product_categories      text,
  existing_vape_brands    text,
  notes                   text,
  data_confidence         text,
  lead_priority           lead_priority default 'Unclassified',
  stage                   prospect_stage not null default 'New',
  owner_id                uuid references public.profiles(id),  -- salesperson
  next_action_date        date,
  source_url              text,
  -- compliance
  marketing_legal_basis   text default 'Legitimate interest (B2B) - assess per campaign',
  opt_out                 boolean not null default false,
  do_not_contact          boolean not null default false,
  -- lifecycle
  converted_contact_id    uuid references public.contacts(id),
  date_added              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists prospects_stage_idx     on public.prospects (stage);
create index if not exists prospects_priority_idx  on public.prospects (lead_priority);
create index if not exists prospects_owner_idx     on public.prospects (owner_id);
create index if not exists prospects_category_idx  on public.prospects (category);
create index if not exists prospects_town_idx      on public.prospects (town);
create index if not exists prospects_nextaction_idx on public.prospects (next_action_date);

-- 2) prospect_contacts (many channels per business) -------------------------
create table if not exists public.prospect_contacts (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid references public.prospects(id) on delete cascade,
  prospect_ref text,                                   -- external_ref, resolved to prospect_id below
  kind         text not null,                          -- phone | email | facebook | instagram | other
  label        text,                                   -- mobile | landline | sales | general | ...
  value        text not null,
  verified     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (prospect_id, kind, value)
);
create index if not exists prospect_contacts_pid_idx on public.prospect_contacts (prospect_id);

-- 3) prospect_activity (the audit trail + next-action source) ---------------
create table if not exists public.prospect_activity (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid references public.prospects(id) on delete cascade,
  actor_id     uuid references public.profiles(id) default auth.uid(),
  channel      text,                                   -- whatsapp | email | call | note | stage
  direction    text,                                   -- out | in | system
  outcome      text,                                   -- reply | no-answer | sampled | quoted | ...
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists prospect_activity_pid_idx on public.prospect_activity (prospect_id, created_at desc);

-- 4) suppression (survives every re-import) ---------------------------------
create table if not exists public.suppression (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,                            -- phone | email | company_number | domain
  value      text not null,
  reason     text,
  created_at timestamptz not null default now(),
  unique (kind, value)
);
create index if not exists suppression_lookup_idx on public.suppression (kind, value);

-- 5) keep updated_at fresh --------------------------------------------------
create or replace function public.touch_prospect_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists prospects_touch on public.prospects;
create trigger prospects_touch before update on public.prospects
  for each row execute function public.touch_prospect_updated_at();

-- 6) resolve prospect_ref -> prospect_id after a seed/import ----------------
create or replace function public.link_prospect_contacts()
returns void language sql security definer set search_path = public as $$
  update public.prospect_contacts pc
     set prospect_id = p.id
    from public.prospects p
   where pc.prospect_id is null
     and pc.prospect_ref = p.external_ref;
$$;
grant execute on function public.link_prospect_contacts() to authenticated;

-- 7) convert a won prospect into a customer contact -------------------------
--    Copies the prospect into public.contacts (type customer) and links back.
--    Never creates a duplicate: returns the existing link if already converted.
create or replace function public.convert_prospect_to_customer(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_contact_id uuid;
  v_email text;
  v_phone text;
  pr public.prospects%rowtype;
begin
  select * into pr from public.prospects where id = p_id;
  if not found then raise exception 'Prospect % not found', p_id; end if;
  if pr.converted_contact_id is not null then return pr.converted_contact_id; end if;

  select value into v_email from public.prospect_contacts
    where prospect_id = p_id and kind = 'email' order by label limit 1;
  select value into v_phone from public.prospect_contacts
    where prospect_id = p_id and kind = 'phone' order by (label = 'mobile') desc limit 1;

  insert into public.contacts (type, name, email, phone, address, city, postcode, vat_number, notes, active)
  values ('customer',
          coalesce(pr.trading_name, pr.business_name),
          v_email, v_phone,
          trim(both ' ' from concat_ws(', ', pr.address1, pr.address2)),
          pr.town, pr.postcode, pr.companies_house_number,
          concat_ws(' | ', 'Converted from prospect ' || coalesce(pr.external_ref, pr.id::text), pr.notes),
          true)
  returning id into v_contact_id;

  update public.prospects
     set stage = 'Won', converted_contact_id = v_contact_id
   where id = p_id;

  insert into public.prospect_activity (prospect_id, channel, direction, outcome, note)
  values (p_id, 'stage', 'system', 'won', 'Converted to customer ' || v_contact_id::text);

  return v_contact_id;
end $$;
grant execute on function public.convert_prospect_to_customer(uuid) to authenticated;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.prospects         enable row level security;
alter table public.prospect_contacts enable row level security;
alter table public.prospect_activity enable row level security;
alter table public.suppression       enable row level security;

-- prospects: any authenticated user reads/writes; only admin/manager deletes
drop policy if exists prospects_read   on public.prospects;
create policy prospects_read   on public.prospects for select to authenticated using (true);
drop policy if exists prospects_write  on public.prospects;
create policy prospects_write  on public.prospects for insert to authenticated with check (true);
drop policy if exists prospects_update on public.prospects;
create policy prospects_update on public.prospects for update to authenticated using (true) with check (true);
drop policy if exists prospects_delete on public.prospects;
create policy prospects_delete on public.prospects for delete to authenticated
  using (public.auth_role() in ('admin','manager'));

-- child tables: read/write for authenticated, delete admin/manager
drop policy if exists pcontacts_rw on public.prospect_contacts;
create policy pcontacts_rw on public.prospect_contacts for all to authenticated
  using (true) with check (true);

drop policy if exists pactivity_read on public.prospect_activity;
create policy pactivity_read on public.prospect_activity for select to authenticated using (true);
drop policy if exists pactivity_insert on public.prospect_activity;
create policy pactivity_insert on public.prospect_activity for insert to authenticated with check (true);

-- suppression: everyone reads (to check before contacting); admin/manager writes
drop policy if exists suppression_read on public.suppression;
create policy suppression_read on public.suppression for select to authenticated using (true);
drop policy if exists suppression_write on public.suppression;
create policy suppression_write on public.suppression for all to authenticated
  using (public.auth_role() in ('admin','manager'))
  with check (public.auth_role() in ('admin','manager'));

-- Lock down the anon role (matches the hardening migration's intent)
revoke all on public.prospects, public.prospect_contacts, public.prospect_activity, public.suppression from anon;
