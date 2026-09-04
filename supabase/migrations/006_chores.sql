-- Household chores with frequency, intensity points, and completions.
-- Additive. Safe to run on a database that already has 001–005.

create table if not exists public.chores (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	title text not null,
	description text not null default '',
	frequency_unit text not null default 'week' check (frequency_unit in ('week', 'month')),
	frequency_every integer not null default 1 check (frequency_every >= 1 and frequency_every <= 52),
	intensity text not null default 'medium' check (intensity in ('light', 'medium', 'heavy')),
	points integer not null default 10 check (points > 0),
	created_by uuid not null references public.profiles (id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	archived_at timestamptz
);

create table if not exists public.chore_completions (
	id uuid primary key default gen_random_uuid(),
	chore_id uuid not null references public.chores (id) on delete cascade,
	household_id uuid not null references public.households (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	completed_at timestamptz not null default now(),
	period_key text not null,
	points integer not null check (points > 0),
	unique (chore_id, period_key)
);

create index if not exists chores_household_id_idx
	on public.chores (household_id, archived_at, updated_at desc);

create index if not exists chore_completions_household_idx
	on public.chore_completions (household_id, completed_at desc);

create index if not exists chore_completions_user_idx
	on public.chore_completions (user_id, completed_at desc);

drop trigger if exists chores_touch on public.chores;
create trigger chores_touch before update on public.chores
for each row execute procedure public.touch_updated_at();

alter table public.chores enable row level security;
alter table public.chore_completions enable row level security;

drop policy if exists "chores select" on public.chores;
create policy "chores select" on public.chores
	for select using (private.is_household_member(household_id));

drop policy if exists "chores insert" on public.chores;
create policy "chores insert" on public.chores
	for insert with check (private.is_household_member(household_id) and created_by = auth.uid());

drop policy if exists "chores update" on public.chores;
create policy "chores update" on public.chores
	for update using (private.is_household_member(household_id))
	with check (private.is_household_member(household_id));

drop policy if exists "chores delete" on public.chores;
create policy "chores delete" on public.chores
	for delete using (private.is_household_member(household_id));

drop policy if exists "chore completions select" on public.chore_completions;
create policy "chore completions select" on public.chore_completions
	for select using (private.is_household_member(household_id));

drop policy if exists "chore completions insert" on public.chore_completions;
create policy "chore completions insert" on public.chore_completions
	for insert with check (private.is_household_member(household_id) and user_id = auth.uid());

drop policy if exists "chore completions delete" on public.chore_completions;
create policy "chore completions delete" on public.chore_completions
	for delete using (user_id = auth.uid() and private.is_household_member(household_id));

grant select, insert, update, delete on public.chores to authenticated;
grant select, insert, delete on public.chore_completions to authenticated;
