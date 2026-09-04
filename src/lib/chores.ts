export const CHORE_INTENSITIES = ['light', 'medium', 'heavy'] as const;
export type ChoreIntensity = (typeof CHORE_INTENSITIES)[number];

export const CHORE_UNITS = ['week', 'month'] as const;
export type ChoreFrequencyUnit = (typeof CHORE_UNITS)[number];

export const CHORE_POINTS: Record<ChoreIntensity, number> = {
	light: 5,
	medium: 10,
	heavy: 20
};

export type ChoreRecord = {
	id: string;
	household_id: string;
	title: string;
	description: string;
	frequency_unit: ChoreFrequencyUnit;
	frequency_every: number;
	intensity: ChoreIntensity;
	points: number;
	created_by: string;
	created_at: string;
	updated_at: string;
	archived_at: string | null;
};

export type ChoreCompletion = {
	id: string;
	chore_id: string;
	household_id: string;
	user_id: string;
	completed_at: string;
	period_key: string;
	points: number;
};

export function pointsForIntensity(intensity: ChoreIntensity) {
	return CHORE_POINTS[intensity];
}

export function clampEvery(value: number) {
	if (!Number.isFinite(value)) return 1;
	return Math.min(52, Math.max(1, Math.round(value)));
}

function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date) {
	const ms = startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime();
	return Math.floor(ms / 86_400_000);
}

export function chorePeriodKey(
	at: Date,
	unit: ChoreFrequencyUnit,
	every: number,
	anchorIso: string
) {
	const step = clampEvery(every);
	const anchor = new Date(anchorIso);
	const when = Number.isNaN(anchor.getTime()) ? at : anchor;
	if (unit === 'month') {
		const months =
			(at.getFullYear() - when.getFullYear()) * 12 + (at.getMonth() - when.getMonth());
		return `m:${Math.floor(Math.max(0, months) / step)}`;
	}
	const days = daysBetween(when, at);
	return `w:${Math.floor(Math.max(0, days) / (7 * step))}`;
}

export function currentPeriodKey(chore: Pick<ChoreRecord, 'frequency_unit' | 'frequency_every' | 'created_at'>, at = new Date()) {
	return chorePeriodKey(at, chore.frequency_unit, chore.frequency_every, chore.created_at);
}

export function completionForPeriod(
	completions: ChoreCompletion[],
	choreId: string,
	periodKey: string
) {
	return completions.find((row) => row.chore_id === choreId && row.period_key === periodKey) ?? null;
}

export function lastCompletion(completions: ChoreCompletion[], choreId: string) {
	return completions
		.filter((row) => row.chore_id === choreId)
		.sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0] ?? null;
}

export function isoWeekKey(at = new Date()) {
	const date = startOfLocalDay(at);
	date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
	const week1 = new Date(date.getFullYear(), 0, 4);
	const week = 1 + Math.round((date.getTime() - week1.getTime()) / 604_800_000);
	return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function completionWeekKey(iso: string) {
	return isoWeekKey(new Date(iso));
}

export type ChoreStatus = {
	chore: ChoreRecord;
	periodKey: string;
	done: boolean;
	doneBy: string | null;
	doneAt: string | null;
	lastDoneAt: string | null;
};

export function choreStatuses(
	chores: ChoreRecord[],
	completions: ChoreCompletion[],
	householdId?: string,
	at = new Date()
): ChoreStatus[] {
	return chores
		.filter((chore) => !chore.archived_at && (!householdId || chore.household_id === householdId))
		.map((chore) => {
			const periodKey = currentPeriodKey(chore, at);
			const current = completionForPeriod(completions, chore.id, periodKey);
			const last = lastCompletion(completions, chore.id);
			return {
				chore,
				periodKey,
				done: Boolean(current),
				doneBy: current?.user_id ?? null,
				doneAt: current?.completed_at ?? null,
				lastDoneAt: last?.completed_at ?? null
			};
		})
		.sort((a, b) => {
			if (a.done !== b.done) return a.done ? 1 : -1;
			return a.chore.title.localeCompare(b.chore.title);
		});
}

export type ScoreRow = {
	userId: string;
	displayName: string;
	points: number;
	weekPoints: number;
	rank: number;
};

export function householdScores(
	members: { user_id: string; display_name: string; household_id: string }[],
	completions: ChoreCompletion[],
	householdId?: string,
	at = new Date()
): ScoreRow[] {
	const week = isoWeekKey(at);
	const people = members.filter((member) => !householdId || member.household_id === householdId);
	const rows = people.map((member) => {
		const mine = completions.filter(
			(row) =>
				row.user_id === member.user_id && (!householdId || row.household_id === householdId)
		);
		return {
			userId: member.user_id,
			displayName: member.display_name,
			points: mine.reduce((sum, row) => sum + row.points, 0),
			weekPoints: mine
				.filter((row) => completionWeekKey(row.completed_at) === week)
				.reduce((sum, row) => sum + row.points, 0),
			rank: 0
		};
	});
	rows.sort(
		(a, b) => b.points - a.points || b.weekPoints - a.weekPoints || a.displayName.localeCompare(b.displayName)
	);
	return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
