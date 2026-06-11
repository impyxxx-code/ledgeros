-- Run this once in Supabase SQL editor
create table if not exists product_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists product_aliases_alias_idx on product_aliases (lower(alias));

alter table product_aliases enable row level security;

create policy "Authenticated users can manage product aliases"
  on product_aliases for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
