-- Cookbooks, ratings, cook timeline, and comments.
-- Additive. Safe to run on a database that already has 001–004.

alter table public.recipes
	add column if not exists source text not null default '',
	add column if not exists source_key text not null default '';

create unique index if not exists recipes_household_source_key_idx
	on public.recipes (household_id, source, source_key)
	where source <> '' and source_key <> '';

create table if not exists public.cookbooks (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	title text not null,
	description text not null default '',
	created_by uuid not null references public.profiles (id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.cookbook_recipes (
	cookbook_id uuid not null references public.cookbooks (id) on delete cascade,
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	sort_order integer not null default 0,
	primary key (cookbook_id, recipe_id)
);

create table if not exists public.recipe_ratings (
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	rating smallint not null check (rating between 1 and 5),
	updated_at timestamptz not null default now(),
	primary key (recipe_id, user_id)
);

create table if not exists public.recipe_timeline (
	id uuid primary key default gen_random_uuid(),
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	household_id uuid not null references public.households (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	event_type text not null default 'cooked' check (event_type in ('cooked')),
	cooked_at timestamptz not null default now(),
	rating smallint check (rating is null or rating between 1 and 5),
	note text not null default '',
	created_at timestamptz not null default now()
);

create table if not exists public.recipe_comments (
	id uuid primary key default gen_random_uuid(),
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	body text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.cookbook_comments (
	id uuid primary key default gen_random_uuid(),
	cookbook_id uuid not null references public.cookbooks (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	body text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists cookbooks_household_id_idx
	on public.cookbooks (household_id, updated_at desc);

create index if not exists cookbook_recipes_recipe_id_idx
	on public.cookbook_recipes (recipe_id);

create index if not exists recipe_ratings_user_id_idx
	on public.recipe_ratings (user_id);

create index if not exists recipe_timeline_household_cooked_idx
	on public.recipe_timeline (household_id, cooked_at desc);

create index if not exists recipe_timeline_recipe_id_idx
	on public.recipe_timeline (recipe_id, cooked_at desc);

create index if not exists recipe_comments_recipe_id_idx
	on public.recipe_comments (recipe_id, created_at desc);

create index if not exists cookbook_comments_cookbook_id_idx
	on public.cookbook_comments (cookbook_id, created_at desc);

drop trigger if exists cookbooks_touch on public.cookbooks;
create trigger cookbooks_touch before update on public.cookbooks
for each row execute procedure public.touch_updated_at();

drop trigger if exists recipe_comments_touch on public.recipe_comments;
create trigger recipe_comments_touch before update on public.recipe_comments
for each row execute procedure public.touch_updated_at();

drop trigger if exists cookbook_comments_touch on public.cookbook_comments;
create trigger cookbook_comments_touch before update on public.cookbook_comments
for each row execute procedure public.touch_updated_at();

alter table public.cookbooks enable row level security;
alter table public.cookbook_recipes enable row level security;
alter table public.recipe_ratings enable row level security;
alter table public.recipe_timeline enable row level security;
alter table public.recipe_comments enable row level security;
alter table public.cookbook_comments enable row level security;

drop policy if exists "cookbooks select" on public.cookbooks;
create policy "cookbooks select" on public.cookbooks
	for select using (private.is_household_member(household_id));

drop policy if exists "cookbooks insert" on public.cookbooks;
create policy "cookbooks insert" on public.cookbooks
	for insert with check (private.is_household_member(household_id) and created_by = auth.uid());

drop policy if exists "cookbooks update" on public.cookbooks;
create policy "cookbooks update" on public.cookbooks
	for update using (private.is_household_member(household_id))
	with check (private.is_household_member(household_id));

drop policy if exists "cookbooks delete" on public.cookbooks;
create policy "cookbooks delete" on public.cookbooks
	for delete using (private.is_household_member(household_id));

drop policy if exists "cookbook recipes select" on public.cookbook_recipes;
create policy "cookbook recipes select" on public.cookbook_recipes
	for select using (
		exists (
			select 1 from public.cookbooks c
			where c.id = cookbook_id and private.is_household_member(c.household_id)
		)
	);

drop policy if exists "cookbook recipes insert" on public.cookbook_recipes;
create policy "cookbook recipes insert" on public.cookbook_recipes
	for insert with check (
		exists (
			select 1 from public.cookbooks c
			where c.id = cookbook_id and private.is_household_member(c.household_id)
		)
		and exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "cookbook recipes update" on public.cookbook_recipes;
create policy "cookbook recipes update" on public.cookbook_recipes
	for update using (
		exists (
			select 1 from public.cookbooks c
			where c.id = cookbook_id and private.is_household_member(c.household_id)
		)
	)
	with check (
		exists (
			select 1 from public.cookbooks c
			where c.id = cookbook_id and private.is_household_member(c.household_id)
		)
	);

drop policy if exists "cookbook recipes delete" on public.cookbook_recipes;
create policy "cookbook recipes delete" on public.cookbook_recipes
	for delete using (
		exists (
			select 1 from public.cookbooks c
			where c.id = cookbook_id and private.is_household_member(c.household_id)
		)
	);

drop policy if exists "recipe ratings select" on public.recipe_ratings;
create policy "recipe ratings select" on public.recipe_ratings
	for select using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe ratings insert" on public.recipe_ratings;
create policy "recipe ratings insert" on public.recipe_ratings
	for insert with check (
		user_id = auth.uid()
		and exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe ratings update" on public.recipe_ratings;
create policy "recipe ratings update" on public.recipe_ratings
	for update using (user_id = auth.uid())
	with check (user_id = auth.uid());

drop policy if exists "recipe ratings delete" on public.recipe_ratings;
create policy "recipe ratings delete" on public.recipe_ratings
	for delete using (user_id = auth.uid());

drop policy if exists "recipe timeline select" on public.recipe_timeline;
create policy "recipe timeline select" on public.recipe_timeline
	for select using (private.is_household_member(household_id));

drop policy if exists "recipe timeline insert" on public.recipe_timeline;
create policy "recipe timeline insert" on public.recipe_timeline
	for insert with check (private.is_household_member(household_id) and user_id = auth.uid());

drop policy if exists "recipe timeline update" on public.recipe_timeline;
create policy "recipe timeline update" on public.recipe_timeline
	for update using (user_id = auth.uid() and private.is_household_member(household_id))
	with check (user_id = auth.uid() and private.is_household_member(household_id));

drop policy if exists "recipe timeline delete" on public.recipe_timeline;
create policy "recipe timeline delete" on public.recipe_timeline
	for delete using (user_id = auth.uid() and private.is_household_member(household_id));

drop policy if exists "recipe comments select" on public.recipe_comments;
create policy "recipe comments select" on public.recipe_comments
	for select using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe comments insert" on public.recipe_comments;
create policy "recipe comments insert" on public.recipe_comments
	for insert with check (
		user_id = auth.uid()
		and exists (
			select 1 from public.recipes r
			where r.id = recipe_id and private.is_household_member(r.household_id)
		)
	);

drop policy if exists "recipe comments update" on public.recipe_comments;
create policy "recipe comments update" on public.recipe_comments
	for update using (user_id = auth.uid())
	with check (user_id = auth.uid());

drop policy if exists "recipe comments delete" on public.recipe_comments;
create policy "recipe comments delete" on public.recipe_comments
	for delete using (user_id = auth.uid());

drop policy if exists "cookbook comments select" on public.cookbook_comments;
create policy "cookbook comments select" on public.cookbook_comments
	for select using (
		exists (
			select 1 from public.cookbooks c
			where c.id = cookbook_id and private.is_household_member(c.household_id)
		)
	);

drop policy if exists "cookbook comments insert" on public.cookbook_comments;
create policy "cookbook comments insert" on public.cookbook_comments
	for insert with check (
		user_id = auth.uid()
		and exists (
			select 1 from public.cookbooks c
			where c.id = cookbook_id and private.is_household_member(c.household_id)
		)
	);

drop policy if exists "cookbook comments update" on public.cookbook_comments;
create policy "cookbook comments update" on public.cookbook_comments
	for update using (user_id = auth.uid())
	with check (user_id = auth.uid());

drop policy if exists "cookbook comments delete" on public.cookbook_comments;
create policy "cookbook comments delete" on public.cookbook_comments
	for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.cookbooks to authenticated;
grant select, insert, update, delete on public.cookbook_recipes to authenticated;
grant select, insert, update, delete on public.recipe_ratings to authenticated;
grant select, insert, update, delete on public.recipe_timeline to authenticated;
grant select, insert, update, delete on public.recipe_comments to authenticated;
grant select, insert, update, delete on public.cookbook_comments to authenticated;
