import type { BasementClient } from '$lib/supabase/client';

export type ReminderStatus = 'ios-install' | 'unsupported' | 'denied' | 'on' | 'off';

type PushSubscriptionJson = {
	endpoint?: string;
	keys?: { p256dh?: string; auth?: string };
};

export function isIosDevice() {
	const ua = navigator.userAgent;
	if (/iphone|ipad|ipod/i.test(ua)) return true;
	return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isStandalonePwa() {
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		window.matchMedia('(display-mode: fullscreen)').matches ||
		Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
	);
}

function pushAvailable() {
	return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(value: string) {
	const padding = '='.repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(base64);
	const output = new Uint8Array(raw.length);
	for (let index = 0; index < raw.length; index += 1) output[index] = raw.charCodeAt(index);
	return output;
}

async function existingSubscription() {
	if (!('serviceWorker' in navigator)) return null;
	const registration = await navigator.serviceWorker.getRegistration();
	if (!registration) return null;
	return registration.pushManager.getSubscription();
}

async function saveSubscription(
	supabase: BasementClient,
	userId: string,
	subscription: PushSubscription
) {
	const json = subscription.toJSON() as PushSubscriptionJson;
	const endpoint = json.endpoint;
	const p256dh = json.keys?.p256dh;
	const auth = json.keys?.auth;
	if (!endpoint || !p256dh || !auth) throw new Error('incomplete subscription');
	const { error } = await supabase.from('push_subscriptions').upsert(
		{
			user_id: userId,
			endpoint,
			p256dh,
			auth,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin'
		},
		{ onConflict: 'endpoint' }
	);
	if (error) throw new Error(error.message);
}

export async function reminderStatus(
	supabase: BasementClient | null,
	userId: string | undefined
): Promise<ReminderStatus> {
	if (isIosDevice() && !isStandalonePwa()) return 'ios-install';
	if (!pushAvailable()) return 'unsupported';
	if (Notification.permission === 'denied') return 'denied';
	const subscription = await existingSubscription();
	if (Notification.permission === 'granted' && subscription) {
		if (supabase && userId)
			await saveSubscription(supabase, userId, subscription).catch(() => undefined);
		return 'on';
	}
	return 'off';
}

export async function enableReminders(
	supabase: BasementClient,
	userId: string,
	vapidPublicKey: string
) {
	if (isIosDevice() && !isStandalonePwa()) return 'ios-install' as const;
	if (!pushAvailable()) return 'unsupported' as const;
	const permission = await Notification.requestPermission();
	if (permission !== 'granted')
		return permission === 'denied' ? ('denied' as const) : ('off' as const);

	const registration = await Promise.race([
		navigator.serviceWorker.ready,
		new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))
	]);
	if (!registration) return 'unsupported' as const;

	const current = await registration.pushManager.getSubscription();
	const subscription =
		current ??
		(await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
		}));
	await saveSubscription(supabase, userId, subscription);
	return 'on' as const;
}

export async function disableReminders(supabase: BasementClient) {
	const subscription = await existingSubscription();
	if (!subscription) return 'off' as const;
	const endpoint = subscription.endpoint;
	await subscription.unsubscribe();
	const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
	if (error) throw new Error(error.message);
	return 'off' as const;
}
