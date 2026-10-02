alter table public.profiles
	add column if not exists cook_likes text not null default '',
	add column if not exists cook_avoids text not null default '';

alter table public.profiles
	drop constraint if exists profiles_cook_likes_len,
	drop constraint if exists profiles_cook_avoids_len;

alter table public.profiles
	add constraint profiles_cook_likes_len check (char_length(cook_likes) <= 2000),
	add constraint profiles_cook_avoids_len check (char_length(cook_avoids) <= 2000);

-- Drop the household-scoped draft if it was applied.
alter table public.households drop constraint if exists households_cook_likes_len;
alter table public.households drop constraint if exists households_cook_avoids_len;
alter table public.households drop column if exists cook_likes;
alter table public.households drop column if exists cook_avoids;

drop trigger if exists households_guard on public.households;
drop function if exists private.guard_household_update();

drop policy if exists "households update" on public.households;
create policy "households update" on public.households
	for update using (private.is_household_owner(id))
	with check (private.is_household_owner(id));
