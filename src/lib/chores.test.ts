import assert from 'node:assert/strict';
import {
	chorePeriodKey,
	choreStatuses,
	clampEvery,
	currentPeriodKey,
	householdScores,
	isoWeekKey,
	pointsForIntensity
} from './chores.ts';

function main() {
	assert.equal(pointsForIntensity('light'), 5);
	assert.equal(pointsForIntensity('medium'), 10);
	assert.equal(pointsForIntensity('heavy'), 20);
	assert.equal(clampEvery(0), 1);
	assert.equal(clampEvery(99), 52);

	const anchor = '2026-01-05T12:00:00.000Z';
	const week0 = chorePeriodKey(new Date('2026-01-06T08:00:00'), 'week', 1, anchor);
	const week1 = chorePeriodKey(new Date('2026-01-13T08:00:00'), 'week', 1, anchor);
	assert.equal(week0, 'w:0');
	assert.equal(week1, 'w:1');
	assert.equal(chorePeriodKey(new Date('2026-01-20T08:00:00'), 'week', 2, anchor), 'w:1');
	assert.equal(chorePeriodKey(new Date('2026-03-05T08:00:00'), 'month', 1, anchor), 'm:2');
	assert.equal(chorePeriodKey(new Date('2026-03-05T08:00:00'), 'month', 2, anchor), 'm:1');

	const chore = {
		id: 'c1',
		household_id: 'h1',
		title: 'Bathrooms',
		description: '',
		frequency_unit: 'week' as const,
		frequency_every: 1,
		intensity: 'heavy' as const,
		points: 20,
		created_by: 'u1',
		created_at: anchor,
		updated_at: anchor,
		archived_at: null
	};
	const period = currentPeriodKey(chore, new Date('2026-01-08T10:00:00'));
	const statuses = choreStatuses(
		[chore],
		[
			{
				id: 'done',
				chore_id: 'c1',
				household_id: 'h1',
				user_id: 'u2',
				completed_at: '2026-01-07T18:00:00.000Z',
				period_key: period,
				points: 20
			}
		],
		'h1',
		new Date('2026-01-08T10:00:00')
	);
	assert.equal(statuses[0]?.done, true);
	assert.equal(statuses[0]?.doneBy, 'u2');

	const scores = householdScores(
		[
			{ user_id: 'u1', display_name: 'Alex', household_id: 'h1' },
			{ user_id: 'u2', display_name: 'Sam', household_id: 'h1' }
		],
		[
			{
				id: 'a',
				chore_id: 'c1',
				household_id: 'h1',
				user_id: 'u2',
				completed_at: new Date().toISOString(),
				period_key: 'w:0',
				points: 20
			},
			{
				id: 'b',
				chore_id: 'c1',
				household_id: 'h1',
				user_id: 'u1',
				completed_at: '2020-01-01T00:00:00.000Z',
				period_key: 'w:old',
				points: 5
			}
		],
		'h1'
	);
	assert.equal(scores[0]?.userId, 'u2');
	assert.equal(scores[0]?.rank, 1);
	assert.equal(scores[0]?.weekPoints, 20);
	assert.equal(scores[1]?.points, 5);
	assert.match(isoWeekKey(new Date('2026-01-08')), /^2026-W/);

	console.log('chores.test.ts ok');
}

main();
