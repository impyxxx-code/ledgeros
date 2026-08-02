-- ============================================================================
-- LedgerOS — Archive (soft-delete) support
-- ----------------------------------------------------------------------------
-- Adds an `active` flag to products and contacts so records can be made
-- INACTIVE (archived) instead of deleted. Archived records keep all their
-- history but are hidden from active lists, invoice pickers and reorder
-- suggestions. Additive + safe: every existing row defaults to active = true.
-- Run in the Supabase SQL editor before using the Archive buttons.
-- ============================================================================

alter table public.products add column if not exists active boolean default true;
alter table public.contacts add column if not exists active boolean default true;

-- Verify:
--   select column_name from information_schema.columns
--   where table_name in ('products','contacts') and column_name = 'active';
