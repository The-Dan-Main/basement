import assert from 'node:assert/strict';
import test from 'node:test';
import { noonReminderDate, openListsForUser, reminderText, zonedClock } from './push-remind.ts';

const berlinNoon = new Date('2026-10-02T10:00:00.000Z');

test('noon in Europe/Berlin is 10:00 UTC during summer time', () => {
	assert.deepEqual(zonedClock('Europe/Berlin', berlinNoon), { hour: 12, date: '2026-10-02' });
	assert.equal(noonReminderDate(null, 'Europe/Berlin', berlinNoon), '2026-10-02');
	assert.equal(noonReminderDate('2026-10-02', 'Europe/Berlin', berlinNoon), null);
	assert.equal(noonReminderDate(null, 'Europe/Berlin', new Date('2026-10-02T09:30:00.000Z')), null);
	assert.equal(noonReminderDate(null, 'Europe/Berlin', new Date('2026-10-02T11:00:00.000Z')), null);
});

test('other timezones wait for their own noon', () => {
	assert.equal(noonReminderDate(null, 'America/New_York', berlinNoon), null);
	assert.equal(
		noonReminderDate(null, 'America/New_York', new Date('2026-10-02T16:00:00.000Z')),
		'2026-10-02'
	);
});

test('unknown timezones fall back to Berlin', () => {
	assert.equal(noonReminderDate(null, 'Not/AZone', berlinNoon), '2026-10-02');
});

test('open items ignore checked rows and archived lists', () => {
	const lists = openListsForUser(
		'user-a',
		[
			{ user_id: 'user-a', household_id: 'house' },
			{ user_id: 'user-b', household_id: 'other' }
		],
		[
			{ id: 'weekly', name: 'Weekly', household_id: 'house', archived_at: null },
			{ id: 'old', name: 'Old', household_id: 'house', archived_at: '2026-01-01' },
			{ id: 'theirs', name: 'Theirs', household_id: 'other', archived_at: null }
		],
		[
			{ list_id: 'weekly', checked: false },
			{ list_id: 'weekly', checked: true },
			{ list_id: 'old', checked: false },
			{ list_id: 'theirs', checked: false }
		]
	);
	assert.deepEqual(lists, [{ name: 'Weekly', count: 1 }]);
});

test('reminder copy names one list and counts several', () => {
	assert.equal(reminderText('de', []), null);
	assert.deepEqual(reminderText('de', [{ name: 'Wochenmarkt', count: 1 }]), {
		title: 'Einkaufsliste',
		body: '1 Artikel noch auf Wochenmarkt',
		url: '/app/lists',
		count: 1
	});
	assert.equal(
		reminderText('en', [
			{ name: 'Weekly', count: 2 },
			{ name: 'Hardware', count: 1 }
		])?.body,
		'3 items still open across 2 lists'
	);
});
