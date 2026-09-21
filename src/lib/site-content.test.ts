import assert from 'node:assert/strict';
import { landingFromContent, siteNameFrom } from './site-content.ts';
import type { SiteContent } from './types/database.types.ts';

function row(key: string, locale: string, value: string): SiteContent {
	return {
		id: key + locale,
		key,
		locale,
		value,
		sort_order: 0,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	};
}

const empty: SiteContent[] = [];
const fallback = landingFromContent(empty, 'en');
assert.equal(siteNameFrom(empty, 'en'), 'Basement');
assert.equal(fallback.heading, 'Write it in the basement.');
assert.equal(fallback.preview[0]?.name, 'Oat milk');

const rows: SiteContent[] = [
	row('site.name', 'en', 'Cellar'),
	row('site.name', 'de', 'Keller'),
	row('landing.heading', 'en', 'Write it downstairs.'),
	row('landing.heading', 'de', 'Unten notieren.'),
	row('landing.preview', 'en', JSON.stringify([{ name: 'Rye bread', note: 'dark', done: false }])),
	row('landing.preview', 'en', 'not-json')
];

assert.equal(siteNameFrom(rows, 'en'), 'Cellar');
assert.equal(siteNameFrom(rows, 'de'), 'Keller');

const en = landingFromContent(rows.slice(0, 5), 'en');
assert.equal(en.heading, 'Write it downstairs.');
assert.equal(en.headingBreak, fallback.headingBreak);
assert.equal(en.preview.length, 1);
assert.equal(en.preview[0]?.name, 'Rye bread');

const broken = landingFromContent(rows, 'en');
assert.equal(broken.preview[0]?.name, 'Oat milk');

const de = landingFromContent(rows, 'de');
assert.equal(de.heading, 'Unten notieren.');
assert.equal(de.kicker, 'Vom Kühlschrank ins Regal');

console.log('site-content.test.ts ok');
