import { browser } from '$app/environment';
import type { Profile } from '$lib/types/app';

const LIMIT = 2000;

function storageKey(userId: string) {
	return `basement-cook-prefs:${userId}`;
}

export function recallCookPrefs(userId: string) {
	if (!browser) return { likes: '', avoids: '' };
	try {
		const raw = localStorage.getItem(storageKey(userId));
		if (!raw) return { likes: '', avoids: '' };
		const parsed = JSON.parse(raw) as { likes?: unknown; avoids?: unknown };
		return {
			likes: typeof parsed.likes === 'string' ? parsed.likes.slice(0, LIMIT) : '',
			avoids: typeof parsed.avoids === 'string' ? parsed.avoids.slice(0, LIMIT) : ''
		};
	} catch {
		return { likes: '', avoids: '' };
	}
}

export function rememberCookPrefs(userId: string, likes: string, avoids: string) {
	if (!browser) return;
	localStorage.setItem(
		storageKey(userId),
		JSON.stringify({ likes: likes.slice(0, LIMIT), avoids: avoids.slice(0, LIMIT) })
	);
}

export function selfCookPrefs(profile: Pick<Profile, 'id' | 'cook_likes' | 'cook_avoids'> | null) {
	if (!profile) return { likes: '', avoids: '' };
	const remembered = recallCookPrefs(profile.id);
	return {
		likes: profile.cook_likes?.trim() || remembered.likes,
		avoids: profile.cook_avoids?.trim() || remembered.avoids
	};
}
