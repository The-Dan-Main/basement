-- Weekly meal plan and unlisted public recipe pages.
-- Additive. Safe to run on a database that already has 001–006.

alter table public.recipes
	add column if not exists is_public boolean not null default false,
	add column if not exists public_slug text not null default '';

create unique index if not exists recipes_public_slug_idx
	on public.recipes (public_slug)
	where public_slug <> '';

create table if not exists public.meal_plan_entries (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	plan_date date not null,
	servings integer not null default 0 check (servings >= 0),
	sort_order integer not null default 0,
	created_by uuid not null references public.profiles (id) on delete restrict,
	created_at timestamptz not null default now()
);

create index if not exists meal_plan_entries_household_date_idx
	on public.meal_plan_entries (household_id, plan_date, sort_order);

create table if not exists public.recipe_public_comments (
	id uuid primary key default gen_random_uuid(),
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	author_name text not null check (char_length(trim(author_name)) between 1 and 40),
	body text not null check (char_length(trim(body)) between 1 and 2000),
	created_at timestamptz not null default now()
);

create index if not exists recipe_public_comments_recipe_id_idx
	on public.recipe_public_comments (recipe_id, created_at desc);

alter table public.meal_plan_entries enable row level security;
alter table public.recipe_public_comments enable row level security;

drop policy if exists "recipes select" on public.recipes;
create policy "recipes select" on public.recipes
	for select using (private.is_household_member(household_id) or is_public);

drop policy if exists "recipe ingredients select" on public.recipe_ingredients;
create policy "recipe ingredients select" on public.recipe_ingredients
	for select using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id
				and (private.is_household_member(r.household_id) or r.is_public)
		)
	);

drop policy if exists "recipe steps select" on public.recipe_steps;
create policy "recipe steps select" on public.recipe_steps
	for select using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id
				and (private.is_household_member(r.household_id) or r.is_public)
		)
	);

drop policy if exists "meal plan select" on public.meal_plan_entries;
create policy "meal plan select" on public.meal_plan_entries
	for select using (private.is_household_member(household_id));

drop policy if exists "meal plan insert" on public.meal_plan_entries;
create policy "meal plan insert" on public.meal_plan_entries
	for insert with check (private.is_household_member(household_id) and created_by = auth.uid());

drop policy if exists "meal plan update" on public.meal_plan_entries;
create policy "meal plan update" on public.meal_plan_entries
	for update using (private.is_household_member(household_id))
	with check (private.is_household_member(household_id));

drop policy if exists "meal plan delete" on public.meal_plan_entries;
create policy "meal plan delete" on public.meal_plan_entries
	for delete using (private.is_household_member(household_id));

drop policy if exists "recipe public comments select" on public.recipe_public_comments;
create policy "recipe public comments select" on public.recipe_public_comments
	for select using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id
				and (r.is_public or private.is_household_member(r.household_id))
		)
	);

drop policy if exists "recipe public comments insert" on public.recipe_public_comments;
create policy "recipe public comments insert" on public.recipe_public_comments
	for insert with check (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and r.is_public
		)
	);

drop policy if exists "recipe public comments delete" on public.recipe_public_comments;
create policy "recipe public comments delete" on public.recipe_public_comments
	for delete using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe images public select" on storage.objects;
create policy "recipe images public select" on storage.objects
	for select using (
		bucket_id = 'recipe-images'
		and exists (
			select 1 from public.recipes r
			where r.image_path = name and r.is_public
		)
	);

grant select, insert, update, delete on public.meal_plan_entries to authenticated;
grant select, delete on public.recipe_public_comments to authenticated;
grant select, insert on public.recipe_public_comments to anon;
grant select on public.recipes to anon;
grant select on public.recipe_ingredients to anon;
grant select on public.recipe_steps to anon;

notify pgrst, 'reload schema';
