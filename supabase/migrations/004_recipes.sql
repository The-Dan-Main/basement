-- Household recipes: capture, scale servings, push ingredients onto a shopping list.
-- Additive. Safe to run on a database that already has 001–003.

create table if not exists public.recipes (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	title text not null,
	description text not null default '',
	servings integer not null default 2 check (servings >= 1),
	image_path text not null default '',
	calories numeric(10, 2) not null default 0,
	fat_g numeric(10, 2) not null default 0,
	protein_g numeric(10, 2) not null default 0,
	fiber_g numeric(10, 2) not null default 0,
	created_by uuid not null references public.profiles (id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
	id uuid primary key default gen_random_uuid(),
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	name text not null,
	amount numeric(12, 4),
	unit text not null default '',
	note text not null default '',
	category text not null default '',
	sort_order integer not null default 0
);

create table if not exists public.recipe_steps (
	id uuid primary key default gen_random_uuid(),
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	instruction text not null,
	sort_order integer not null default 0
);

create index if not exists recipes_household_id_idx
	on public.recipes (household_id, updated_at desc);

create index if not exists recipe_ingredients_recipe_id_idx
	on public.recipe_ingredients (recipe_id, sort_order);

create index if not exists recipe_steps_recipe_id_idx
	on public.recipe_steps (recipe_id, sort_order);

drop trigger if exists recipes_touch on public.recipes;
create trigger recipes_touch before update on public.recipes
for each row execute procedure public.touch_updated_at();

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;

drop policy if exists "recipes select" on public.recipes;
create policy "recipes select" on public.recipes
	for select using (private.is_household_member(household_id));

drop policy if exists "recipes insert" on public.recipes;
create policy "recipes insert" on public.recipes
	for insert with check (private.is_household_member(household_id) and created_by = auth.uid());

drop policy if exists "recipes update" on public.recipes;
create policy "recipes update" on public.recipes
	for update using (private.is_household_member(household_id))
	with check (private.is_household_member(household_id));

drop policy if exists "recipes delete" on public.recipes;
create policy "recipes delete" on public.recipes
	for delete using (private.is_household_member(household_id));

drop policy if exists "recipe ingredients select" on public.recipe_ingredients;
create policy "recipe ingredients select" on public.recipe_ingredients
	for select using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe ingredients insert" on public.recipe_ingredients;
create policy "recipe ingredients insert" on public.recipe_ingredients
	for insert with check (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe ingredients update" on public.recipe_ingredients;
create policy "recipe ingredients update" on public.recipe_ingredients
	for update using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	)
	with check (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe ingredients delete" on public.recipe_ingredients;
create policy "recipe ingredients delete" on public.recipe_ingredients
	for delete using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe steps select" on public.recipe_steps;
create policy "recipe steps select" on public.recipe_steps
	for select using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe steps insert" on public.recipe_steps;
create policy "recipe steps insert" on public.recipe_steps
	for insert with check (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe steps update" on public.recipe_steps;
create policy "recipe steps update" on public.recipe_steps
	for update using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	)
	with check (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe steps delete" on public.recipe_steps;
create policy "recipe steps delete" on public.recipe_steps
	for delete using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.recipe_steps to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'recipe-images',
	'recipe-images',
	false,
	5242880,
	array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "recipe images select" on storage.objects;
create policy "recipe images select" on storage.objects
	for select using (
		bucket_id = 'recipe-images'
		and private.is_household_member(((storage.foldername(name))[1])::uuid)
	);

drop policy if exists "recipe images insert" on storage.objects;
create policy "recipe images insert" on storage.objects
	for insert with check (
		bucket_id = 'recipe-images'
		and private.is_household_member(((storage.foldername(name))[1])::uuid)
	);

drop policy if exists "recipe images update" on storage.objects;
create policy "recipe images update" on storage.objects
	for update using (
		bucket_id = 'recipe-images'
		and private.is_household_member(((storage.foldername(name))[1])::uuid)
	)
	with check (
		bucket_id = 'recipe-images'
		and private.is_household_member(((storage.foldername(name))[1])::uuid)
	);

drop policy if exists "recipe images delete" on storage.objects;
create policy "recipe images delete" on storage.objects
	for delete using (
		bucket_id = 'recipe-images'
		and private.is_household_member(((storage.foldername(name))[1])::uuid)
	);
