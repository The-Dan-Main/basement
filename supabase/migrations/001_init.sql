-- Basement — run this in the Supabase SQL editor (or via supabase db push).
-- Also set Authentication → URL configuration:
--   Site URL: your PUBLIC_BASE_URL (e.g. http://localhost:5173)
--   Redirect URLs: {PUBLIC_BASE_URL}/auth/callback
-- Enable Realtime for public.list_items (and public.lists) in the dashboard if the
-- publication statements below are skipped on an existing project.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create table if not exists public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text not null default 'Shopper',
	locale text not null default 'en' check (locale in ('en', 'de')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.households (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	created_by uuid not null references public.profiles (id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
	household_id uuid not null references public.households (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	role text not null default 'member' check (role in ('owner', 'member')),
	created_at timestamptz not null default now(),
	primary key (household_id, user_id)
);

create table if not exists public.household_invites (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	email text not null,
	token text not null unique,
	invited_by uuid not null references public.profiles (id) on delete cascade,
	expires_at timestamptz not null default (now() + interval '14 days'),
	accepted_at timestamptz,
	created_at timestamptz not null default now()
);

create table if not exists public.lists (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	name text not null,
	sort_order integer not null default 0,
	archived_at timestamptz,
	created_by uuid not null references public.profiles (id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.list_items (
	id uuid primary key default gen_random_uuid(),
	list_id uuid not null references public.lists (id) on delete cascade,
	name text not null,
	quantity text not null default '',
	note text not null default '',
	checked boolean not null default false,
	checked_at timestamptz,
	sort_order integer not null default 0,
	created_by uuid not null references public.profiles (id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.item_catalog (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	name text not null,
	display_name text not null,
	use_count integer not null default 1,
	last_used_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (household_id, name)
);

create index if not exists household_members_user_id_idx on public.household_members (user_id);
create index if not exists household_invites_email_idx on public.household_invites (lower(email));
create index if not exists lists_household_id_idx on public.lists (household_id, sort_order, created_at desc);
create index if not exists list_items_list_id_idx on public.list_items (list_id, sort_order, created_at desc);
create index if not exists item_catalog_household_name_idx on public.item_catalog (household_id, name);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists households_touch on public.households;
create trigger households_touch before update on public.households
for each row execute procedure public.touch_updated_at();

drop trigger if exists lists_touch on public.lists;
create trigger lists_touch before update on public.lists
for each row execute procedure public.touch_updated_at();

drop trigger if exists list_items_touch on public.list_items;
create trigger list_items_touch before update on public.list_items
for each row execute procedure public.touch_updated_at();

drop trigger if exists item_catalog_touch on public.item_catalog;
create trigger item_catalog_touch before update on public.item_catalog
for each row execute procedure public.touch_updated_at();

create or replace function private.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.household_members
		where household_id = hid
			and user_id = auth.uid()
	);
$$;

create or replace function private.is_household_owner(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.household_members
		where household_id = hid
			and user_id = auth.uid()
			and role = 'owner'
	);
$$;

create or replace function private.shares_household_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.household_members a
		join public.household_members b on a.household_id = b.household_id
		where a.user_id = auth.uid()
			and b.user_id = other
	);
$$;

revoke all on function private.is_household_member(uuid) from public;
revoke all on function private.is_household_owner(uuid) from public;
revoke all on function private.shares_household_with(uuid) from public;
grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.is_household_owner(uuid) to authenticated;
grant execute on function private.shares_household_with(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	display text;
	chosen text;
	hid uuid;
begin
	display := coalesce(
		nullif(new.raw_user_meta_data ->> 'display_name', ''),
		split_part(new.email, '@', 1),
		'Shopper'
	);

	chosen := lower(coalesce(new.raw_user_meta_data ->> 'locale', 'en'));
	if chosen not in ('en', 'de') then
		chosen := 'en';
	end if;

	insert into public.profiles (id, display_name, locale)
	values (new.id, display, chosen);

	insert into public.households (name, created_by)
	values (display || '''s household', new.id)
	returning id into hid;

	insert into public.household_members (household_id, user_id, role)
	values (hid, new.id, 'owner');

	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
	after insert on auth.users
	for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.item_catalog enable row level security;

drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles
	for select using (auth.uid() = id or private.shares_household_with(id));

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
	for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
	for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "households select" on public.households;
create policy "households select" on public.households
	for select using (
		private.is_household_member(id)
		or exists (
			select 1
			from public.household_invites i
			where i.household_id = id
				and i.accepted_at is null
				and lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
		)
	);

drop policy if exists "households insert" on public.households;
create policy "households insert" on public.households
	for insert with check (auth.uid() = created_by);

drop policy if exists "households update" on public.households;
create policy "households update" on public.households
	for update using (private.is_household_owner(id)) with check (private.is_household_owner(id));

drop policy if exists "households delete" on public.households;
create policy "households delete" on public.households
	for delete using (private.is_household_owner(id));

drop policy if exists "members select" on public.household_members;
create policy "members select" on public.household_members
	for select using (user_id = auth.uid() or private.is_household_member(household_id));

drop policy if exists "members insert" on public.household_members;
create policy "members insert" on public.household_members
	for insert with check (
		auth.uid() = user_id
		or private.is_household_owner(household_id)
	);

drop policy if exists "members update" on public.household_members;
create policy "members update" on public.household_members
	for update using (private.is_household_owner(household_id))
	with check (private.is_household_owner(household_id));

drop policy if exists "members delete" on public.household_members;
create policy "members delete" on public.household_members
	for delete using (user_id = auth.uid() or private.is_household_owner(household_id));

drop policy if exists "invites select" on public.household_invites;
create policy "invites select" on public.household_invites
	for select using (
		private.is_household_member(household_id)
		or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
	);

drop policy if exists "invites insert" on public.household_invites;
create policy "invites insert" on public.household_invites
	for insert with check (private.is_household_owner(household_id) and invited_by = auth.uid());

drop policy if exists "invites update" on public.household_invites;
create policy "invites update" on public.household_invites
	for update using (
		private.is_household_owner(household_id)
		or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
	)
	with check (
		private.is_household_owner(household_id)
		or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
	);

drop policy if exists "invites delete" on public.household_invites;
create policy "invites delete" on public.household_invites
	for delete using (private.is_household_owner(household_id));

drop policy if exists "lists select" on public.lists;
create policy "lists select" on public.lists
	for select using (private.is_household_member(household_id));

drop policy if exists "lists insert" on public.lists;
create policy "lists insert" on public.lists
	for insert with check (private.is_household_member(household_id) and created_by = auth.uid());

drop policy if exists "lists update" on public.lists;
create policy "lists update" on public.lists
	for update using (private.is_household_member(household_id))
	with check (private.is_household_member(household_id));

drop policy if exists "lists delete" on public.lists;
create policy "lists delete" on public.lists
	for delete using (private.is_household_member(household_id));

drop policy if exists "items select" on public.list_items;
create policy "items select" on public.list_items
	for select using (
		exists (
			select 1 from public.lists l
			where l.id = list_id and private.is_household_member(l.household_id)
		)
	);

drop policy if exists "items insert" on public.list_items;
create policy "items insert" on public.list_items
	for insert with check (
		created_by = auth.uid()
		and exists (
			select 1 from public.lists l
			where l.id = list_id and private.is_household_member(l.household_id)
		)
	);

drop policy if exists "items update" on public.list_items;
create policy "items update" on public.list_items
	for update using (
		exists (
			select 1 from public.lists l
			where l.id = list_id and private.is_household_member(l.household_id)
		)
	)
	with check (
		exists (
			select 1 from public.lists l
			where l.id = list_id and private.is_household_member(l.household_id)
		)
	);

drop policy if exists "items delete" on public.list_items;
create policy "items delete" on public.list_items
	for delete using (
		exists (
			select 1 from public.lists l
			where l.id = list_id and private.is_household_member(l.household_id)
		)
	);

drop policy if exists "catalog select" on public.item_catalog;
create policy "catalog select" on public.item_catalog
	for select using (private.is_household_member(household_id));

drop policy if exists "catalog insert" on public.item_catalog;
create policy "catalog insert" on public.item_catalog
	for insert with check (private.is_household_member(household_id));

drop policy if exists "catalog update" on public.item_catalog;
create policy "catalog update" on public.item_catalog
	for update using (private.is_household_member(household_id))
	with check (private.is_household_member(household_id));

drop policy if exists "catalog delete" on public.item_catalog;
create policy "catalog delete" on public.item_catalog
	for delete using (private.is_household_member(household_id));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.households to authenticated;
grant select, insert, update, delete on public.household_members to authenticated;
grant select, insert, update, delete on public.household_invites to authenticated;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.list_items to authenticated;
grant select, insert, update, delete on public.item_catalog to authenticated;

alter table public.list_items replica identity full;
alter table public.lists replica identity full;

do $$
begin
	alter publication supabase_realtime add table public.list_items;
exception
	when duplicate_object then null;
	when undefined_object then null;
end $$;

do $$
begin
	alter publication supabase_realtime add table public.lists;
exception
	when duplicate_object then null;
	when undefined_object then null;
end $$;
