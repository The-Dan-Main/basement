-- Public marketing copy for the landing page.
-- Readable by anon so a homepage visit (or later uptime ping) counts as
-- Supabase traffic and keeps the free project from pausing.

create table if not exists public.site_content (
	id uuid primary key default gen_random_uuid(),
	key text not null,
	locale text not null default 'en' check (locale in ('en', 'de')),
	value text not null,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (key, locale)
);

create index if not exists site_content_locale_sort_idx
	on public.site_content (locale, sort_order, key);

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch before update on public.site_content
for each row execute procedure public.touch_updated_at();

alter table public.site_content enable row level security;

drop policy if exists "site_content select" on public.site_content;
create policy "site_content select" on public.site_content
	for select using (true);

grant select on public.site_content to anon, authenticated;

insert into public.site_content (key, locale, value, sort_order)
values
	('site.name', 'en', 'Basement', 10),
	('site.name', 'de', 'Basement', 10),
	(
		'landing.title',
		'en',
		'Basement — household lists that leave the house',
		20
	),
	(
		'landing.title',
		'de',
		'Basement — Haushaltslisten, die mitkommen',
		20
	),
	('landing.kicker', 'en', 'From fridge to aisle', 30),
	('landing.kicker', 'de', 'Vom Kühlschrank ins Regal', 30),
	('landing.heading', 'en', 'Write it in the basement.', 40),
	('landing.heading', 'de', 'Unten aufschreiben.', 40),
	('landing.headingBreak', 'en', 'Check it off at the store.', 50),
	('landing.headingBreak', 'de', 'Im Laden abhaken.', 50),
	(
		'landing.body',
		'en',
		'Shared shopping lists for the house. Dark, installable, and stubborn about staying useful when you are underground or in the freezer aisle.',
		60
	),
	(
		'landing.body',
		'de',
		'Gemeinsame Einkaufslisten fürs Haus. Dunkel, installierbar, und hartnäckig nützlich — im Keller oder in der Tiefkühlabteilung.',
		60
	),
	('landing.start', 'en', 'Start a household list', 70),
	('landing.start', 'de', 'Haushaltsliste starten', 70),
	('landing.haveAccount', 'en', 'I already have an account', 80),
	('landing.haveAccount', 'de', 'Ich habe schon ein Konto', 80),
	('landing.previewKicker', 'en', 'Tonight’s run', 90),
	('landing.previewKicker', 'de', 'Heutiger Gang', 90),
	('landing.previewLeft', 'en', '3 left', 100),
	('landing.previewLeft', 'de', '3 übrig', 100),
	('landing.previewFoot', 'en', 'Alex just checked oat milk.', 110),
	('landing.previewFoot', 'de', 'Alex hat gerade Hafermilch abgehakt.', 110),
	(
		'landing.preview',
		'en',
		'[{"name":"Oat milk","note":"Barista","done":true},{"name":"Tomatoes","note":"6","done":false},{"name":"Dish soap","note":"","done":false},{"name":"Sourdough","note":"if they have it","done":false}]',
		120
	),
	(
		'landing.preview',
		'de',
		'[{"name":"Hafermilch","note":"Barista","done":true},{"name":"Tomaten","note":"6","done":false},{"name":"Spülmittel","note":"","done":false},{"name":"Sauerteigbrot","note":"falls sie welches haben","done":false}]',
		120
	),
	(
		'landing.steps',
		'en',
		'[{"title":"Write it downstairs","body":"Dump the week onto a list before anyone leaves the house."},{"title":"Take it to the aisle","body":"Install it. The list stays on the phone when the signal does not."},{"title":"Tick it together","body":"When someone grabs the milk, it clears for everyone else too."}]',
		130
	),
	(
		'landing.steps',
		'de',
		'[{"title":"Unten notieren","body":"Die Woche auf eine Liste, bevor jemand das Haus verlässt."},{"title":"Mit ins Regal","body":"Installieren. Die Liste bleibt auf dem Handy, auch ohne Empfang."},{"title":"Gemeinsam abhaken","body":"Wer die Milch nimmt, löscht sie für alle anderen mit."}]',
		130
	),
	(
		'landing.features',
		'en',
		'[{"title":"Works in the cellar","body":"No bars, no problem. Add and check items offline; they sync when you come back up."},{"title":"One carton, two thumbs","body":"Invite the household. Live check-off means you do not buy a second bottle of the same thing."},{"title":"It already knows oat milk","body":"Type three letters and last week’s staples surface. Quantity and a note if you need them."}]',
		140
	),
	(
		'landing.features',
		'de',
		'[{"title":"Geht auch im Keller","body":"Kein Empfang, kein Problem. Offline hinzufügen und abhaken — Sync, wenn du wieder oben bist."},{"title":"Eine Packung, zwei Daumen","body":"Den Haushalt einladen. Live-Abhaken heißt: niemand kauft die zweite Flasche."},{"title":"Kennt schon Hafermilch","body":"Drei Buchstaben, und die Staples von letzter Woche tauchen auf. Menge und Notiz, wenn nötig."}]',
		140
	)
on conflict (key, locale) do nothing;
