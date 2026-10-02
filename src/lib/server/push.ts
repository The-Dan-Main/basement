import { createRequire } from 'node:module';
import { timingSafeEqual } from 'node:crypto';
import { createServiceSupabase } from '$lib/server/public-recipe';
import { getSupabaseConfig } from '$lib/server/env';
import {
	noonReminderDate,
	openListsForUser,
	reminderText,
	type ItemRef,
	type ListRef,
	type Membership
} from '$lib/push-remind';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as {
	setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
	sendNotification: (
		subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
		payload: string | Buffer,
		options?: { TTL?: number }
	) => Promise<{ statusCode?: number }>;
};

const REMINDER_TTL_SECONDS = 3 * 60 * 60;

type SubscriptionRow = {
	id: string;
	user_id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	timezone: string;
	last_reminded_on: string | null;
};

export function bearerMatches(header: string | null, secret: string) {
	if (!secret) return false;
	const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
	const got = Buffer.from(token);
	const expected = Buffer.from(secret);
	if (got.length !== expected.length) return false;
	return timingSafeEqual(got, expected);
}

function statusCode(error: unknown) {
	if (typeof error === 'object' && error && 'statusCode' in error) {
		const code = (error as { statusCode?: unknown }).statusCode;
		return typeof code === 'number' ? code : 0;
	}
	return 0;
}

export async function dispatchNoonReminders(now = new Date()) {
	const { vapidPublicKey, vapidPrivateKey, baseUrl } = getSupabaseConfig();
	const admin = createServiceSupabase();
	if (!admin || !vapidPublicKey || !vapidPrivateKey) return { error: 'unconfigured' as const };

	const subject = baseUrl.startsWith('https://') ? baseUrl : 'mailto:basement@localhost';
	webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);

	const { data: subscriptions, error } = await admin
		.from('push_subscriptions')
		.select('id, user_id, endpoint, p256dh, auth, timezone, last_reminded_on');
	if (error) throw new Error(error.message);

	const due = (subscriptions ?? []).flatMap((row) => {
		const date = noonReminderDate(row.last_reminded_on, row.timezone, now);
		return date ? [{ ...row, date }] : [];
	});

	const result = { due: due.length, sent: 0, quiet: 0, failed: 0, removed: 0 };
	if (due.length === 0) return result;

	const userIds = [...new Set(due.map((row) => row.user_id))];
	const { data: profiles, error: profileError } = await admin
		.from('profiles')
		.select('id, locale')
		.in('id', userIds);
	if (profileError) throw new Error(profileError.message);
	const locales = new Map((profiles ?? []).map((profile) => [profile.id, profile.locale]));

	const { data: memberships, error: memberError } = await admin
		.from('household_members')
		.select('user_id, household_id')
		.in('user_id', userIds);
	if (memberError) throw new Error(memberError.message);
	const members = (memberships ?? []) as Membership[];
	const householdIds = [...new Set(members.map((member) => member.household_id))];

	let lists: ListRef[] = [];
	let items: ItemRef[] = [];
	if (householdIds.length > 0) {
		const { data: listRows, error: listError } = await admin
			.from('lists')
			.select('id, name, household_id, archived_at')
			.in('household_id', householdIds);
		if (listError) throw new Error(listError.message);
		lists = listRows ?? [];
		const listIds = lists.filter((list) => !list.archived_at).map((list) => list.id);
		if (listIds.length > 0) {
			const { data: itemRows, error: itemError } = await admin
				.from('list_items')
				.select('list_id, checked')
				.in('list_id', listIds)
				.eq('checked', false);
			if (itemError) throw new Error(itemError.message);
			items = itemRows ?? [];
		}
	}

	for (const subscription of due) {
		const claimed = await claimReminder(admin, subscription, subscription.date);
		if (!claimed) continue;

		const payload = reminderText(
			locales.get(subscription.user_id) ?? 'en',
			openListsForUser(subscription.user_id, members, lists, items)
		);
		if (!payload) {
			result.quiet += 1;
			continue;
		}

		try {
			await webpush.sendNotification(
				{
					endpoint: subscription.endpoint,
					keys: { p256dh: subscription.p256dh, auth: subscription.auth }
				},
				JSON.stringify(payload),
				{ TTL: REMINDER_TTL_SECONDS }
			);
			result.sent += 1;
		} catch (error) {
			const code = statusCode(error);
			if (code === 404 || code === 410) {
				await admin.from('push_subscriptions').delete().eq('id', subscription.id);
				result.removed += 1;
				continue;
			}
			await admin
				.from('push_subscriptions')
				.update({ last_reminded_on: subscription.last_reminded_on })
				.eq('id', subscription.id);
			result.failed += 1;
		}
	}

	return result;
}

async function claimReminder(
	admin: NonNullable<ReturnType<typeof createServiceSupabase>>,
	subscription: SubscriptionRow,
	date: string
) {
	const { data, error } = await admin
		.from('push_subscriptions')
		.update({ last_reminded_on: date })
		.eq('id', subscription.id)
		.or(`last_reminded_on.is.null,last_reminded_on.neq.${date}`)
		.select('id');
	if (error) throw new Error(error.message);
	return (data ?? []).length > 0;
}
