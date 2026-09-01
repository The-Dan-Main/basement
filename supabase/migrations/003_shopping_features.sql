-- Shopping-trip helpers: aisle, list emoji, who checked it off.
-- Additive. Safe to run on a database that already has 001_init + 002_locale.

alter table public.lists
	add column if not exists emoji text not null default '';

alter table public.list_items
	add column if not exists category text not null default '';

alter table public.list_items
	add column if not exists checked_by uuid references public.profiles (id) on delete set null;

alter table public.item_catalog
	add column if not exists category text not null default '';

create index if not exists list_items_category_idx
	on public.list_items (list_id, category);

create index if not exists list_items_checked_by_idx
	on public.list_items (checked_by);
