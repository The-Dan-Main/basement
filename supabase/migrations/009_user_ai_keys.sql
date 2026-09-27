create table if not exists public.user_ai_keys (
	user_id uuid primary key references public.profiles (id) on delete cascade,
	gemini_api_key text not null default '',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

drop trigger if exists user_ai_keys_touch on public.user_ai_keys;
create trigger user_ai_keys_touch before update on public.user_ai_keys
for each row execute procedure public.touch_updated_at();

alter table public.user_ai_keys enable row level security;

drop policy if exists "user ai keys select own" on public.user_ai_keys;
create policy "user ai keys select own" on public.user_ai_keys
	for select using (auth.uid() = user_id);

drop policy if exists "user ai keys insert own" on public.user_ai_keys;
create policy "user ai keys insert own" on public.user_ai_keys
	for insert with check (auth.uid() = user_id);

drop policy if exists "user ai keys update own" on public.user_ai_keys;
create policy "user ai keys update own" on public.user_ai_keys
	for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user ai keys delete own" on public.user_ai_keys;
create policy "user ai keys delete own" on public.user_ai_keys
	for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_ai_keys to authenticated;
revoke all on public.user_ai_keys from anon;
