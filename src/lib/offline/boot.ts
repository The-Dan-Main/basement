import { browser } from '$app/environment';
import { preloadCode, preloadData } from '$app/navigation';
import { publishProfile, publishSnapshot } from '$lib/offline/live.svelte';
import { flushOutbox, pullSnapshot, readSnapshot, refreshPending } from '$lib/offline/sync';
import { isOnline, setOfflineStatus } from '$lib/offline/status';
import type { BasementClient } from '$lib/supabase/client';
import type { Profile } from '$lib/types/app';

let supabaseRef: BasementClient | null = null;
let bootedFor: string | null = null;
let listenersBound = false;

function bindListeners() {
	if (!browser || listenersBound) return;
	listenersBound = true;
	const sync = () => {
		setOfflineStatus({ online: isOnline() });
		if (isOnline() && supabaseRef) void flushOutbox(supabaseRef);
		void refreshPending();
	};
	window.addEventListener('online', sync);
	window.addEventListener('offline', sync);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') sync();
	});
}

export async function bootOffline(
	supabase: BasementClient | null,
	userId: string,
	profile: Profile
) {
	if (!browser) return;
	supabaseRef = supabase;
	bindListeners();
	await refreshPending();

	const existing = await readSnapshot(userId);
	if (existing) {
		publishSnapshot({ ...existing, profile });
		publishProfile(profile);
	} else {
		publishProfile(profile);
	}

	if (!supabase) return;
	if (bootedFor === userId) {
		if (isOnline()) void flushOutbox(supabase);
		return;
	}
	bootedFor = userId;

	if (isOnline()) {
		try {
			await flushOutbox(supabase);
			const snap = await pullSnapshot(supabase, userId, profile);
			await flushOutbox(supabase);
			const paths = [
				'/app',
				'/app/household',
				'/app/settings',
				...snap.lists.map((list) => `/app/lists/${list.id}`)
			];
			await Promise.allSettled(paths.map((path) => preloadCode(path)));
			await Promise.allSettled(paths.slice(0, 8).map((path) => preloadData(path)));
		} catch {
			await refreshPending();
		}
	}
}
