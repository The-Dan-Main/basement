export type OpenList = {
	name: string;
	count: number;
};

export type Membership = {
	user_id: string;
	household_id: string;
};

export type ListRef = {
	id: string;
	name: string;
	household_id: string;
	archived_at: string | null;
};

export type ItemRef = {
	list_id: string;
	checked: boolean;
};

export type ReminderPayload = {
	title: string;
	body: string;
	url: string;
	count: number;
};

const FALLBACK_ZONE = 'Europe/Berlin';

export function zonedClock(timeZone: string, now = new Date()) {
	const zone = safeZone(timeZone);
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: zone,
		hour: '2-digit',
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(now);
	const bag = Object.fromEntries(parts.map((part) => [part.type, part.value]));
	let hour = Number(bag.hour);
	if (hour === 24) hour = 0;
	return {
		hour,
		date: `${bag.year}-${bag.month}-${bag.day}`
	};
}

function safeZone(timeZone: string) {
	const zone = timeZone.trim() || FALLBACK_ZONE;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: zone });
		return zone;
	} catch {
		return FALLBACK_ZONE;
	}
}

/** Local calendar date when it is noon in `timeZone` and this device has not been reminded yet today. */
export function noonReminderDate(
	lastRemindedOn: string | null,
	timeZone: string,
	now = new Date()
) {
	const clock = zonedClock(timeZone, now);
	if (clock.hour !== 12) return null;
	if (lastRemindedOn === clock.date) return null;
	return clock.date;
}

export function openListsForUser(
	userId: string,
	memberships: Membership[],
	lists: ListRef[],
	items: ItemRef[]
): OpenList[] {
	const households = new Set(
		memberships.filter((member) => member.user_id === userId).map((member) => member.household_id)
	);
	const active = lists.filter((list) => households.has(list.household_id) && !list.archived_at);
	const counts = new Map<string, number>();
	for (const item of items) {
		if (item.checked) continue;
		counts.set(item.list_id, (counts.get(item.list_id) ?? 0) + 1);
	}
	return active
		.map((list) => ({ name: list.name, count: counts.get(list.id) ?? 0 }))
		.filter((list) => list.count > 0);
}

export function reminderText(locale: string, lists: OpenList[]): ReminderPayload | null {
	const total = lists.reduce((sum, list) => sum + list.count, 0);
	if (total < 1) return null;
	const german = locale === 'de';
	const title = german ? 'Einkaufsliste' : 'Shopping list';
	const url = '/app/lists';
	if (lists.length === 1) {
		const name = lists[0]?.name || (german ? 'Liste' : 'List');
		const body =
			total === 1
				? german
					? `1 Artikel noch auf ${name}`
					: `1 item still on ${name}`
				: german
					? `${total} Artikel noch auf ${name}`
					: `${total} items still on ${name}`;
		return { title, body, url, count: total };
	}
	const body = german
		? `${total} Artikel noch offen auf ${lists.length} Listen`
		: `${total} items still open across ${lists.length} lists`;
	return { title, body, url, count: total };
}
