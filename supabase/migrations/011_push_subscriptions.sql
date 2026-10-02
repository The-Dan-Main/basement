create table if not exists public.push_subscriptions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	endpoint text not null unique,
	p256dh text not null,
	auth text not null,
	timezone text not null default 'Europe/Berlin',
	last_reminded_on date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

drop trigger if exists push_subscriptions_touch on public.push_subscriptions;
create trigger push_subscriptions_touch before update on public.push_subscriptions
for each row execute procedure public.touch_updated_at();

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions select own" on public.push_subscriptions;
create policy "push subscriptions select own" on public.push_subscriptions
	for select using (auth.uid() = user_id);

drop policy if exists "push subscriptions insert own" on public.push_subscriptions;
create policy "push subscriptions insert own" on public.push_subscriptions
	for insert with check (auth.uid() = user_id);

drop policy if exists "push subscriptions update own" on public.push_subscriptions;
create policy "push subscriptions update own" on public.push_subscriptions
	for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push subscriptions delete own" on public.push_subscriptions;
create policy "push subscriptions delete own" on public.push_subscriptions
	for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;

-- Noon reminders: every 15 minutes, the job calls the app. It only sends when the
-- device timezone is in the 12:00 hour and a shopping list still has open items.
-- Before this job can reach the app, store two Vault secrets (values stay out of git):
--   push_dispatch_url  = {PUBLIC_BASE_URL}/push/dispatch
--   push_cron_secret   = PUSH_CRON_SECRET
-- The app process needs PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and PUSH_CRON_SECRET.

do $$
begin
	create extension if not exists pg_cron;
	create extension if not exists pg_net;
exception
	when others then
		raise warning 'shopping list noon reminder extensions: %', sqlerrm;
end $$;

do $$
begin
	perform cron.unschedule('shopping_list_noon_reminder');
exception
	when others then
		null;
end $$;

do $schedule$
begin
	perform cron.schedule(
		'shopping_list_noon_reminder',
		'0,15,30,45 * * * *',
		$job$
		select net.http_post(
			url := s.url,
			body := '{}'::jsonb,
			headers := jsonb_build_object(
				'Content-Type', 'application/json',
				'Authorization', 'Bearer ' || s.token
			),
			timeout_milliseconds := 15000
		)
		from (
			select
				(select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_url' limit 1) as url,
				(select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret' limit 1) as token
		) s
		where s.url is not null and s.token is not null;
		$job$
	);
exception
	when others then
		raise warning 'shopping list noon reminder was not scheduled: %', sqlerrm;
end
$schedule$;
