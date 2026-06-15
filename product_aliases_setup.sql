-- Run this once in Supabase SQL editor
create table if not exists product_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists product_aliases_alias_idx on product_aliases (lower(alias));

alter table product_aliases enable row level security;

drop policy if exists "Authenticated users can manage product aliases" on product_aliases;

create policy "Admins and managers can manage product aliases"
  on product_aliases for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','manager')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','manager')));

create policy "Authenticated users can read product aliases"
  on product_aliases for select
  using (auth.role() = 'authenticated');
