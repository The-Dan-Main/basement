-- Additive migration for an existing Basement database.
-- Run this in the Supabase SQL editor after 001_init.sql.

alter table public.profiles
	add column if not exists locale text not null default 'en';

alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles
	add constraint profiles_locale_check check (locale in ('en', 'de'));

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
