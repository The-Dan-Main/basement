import type { OfflineSnapshot } from '$lib/offline/sync';
import type { Profile } from '$lib/types/app';

let snapshot = $state<OfflineSnapshot | null>(null);
let profile = $state<Profile | null>(null);

export function publishSnapshot(next: OfflineSnapshot | null) {
	snapshot = next;
	if (next) profile = next.profile;
}

export function publishProfile(next: Profile | null) {
	profile = next;
	if (snapshot && next) snapshot = { ...snapshot, profile: next };
}

export function readSnapshotLive() {
	return snapshot;
}

export function resolveProfile(fallback: Profile) {
	return profile ?? fallback;
}

export function resolveSnapshot(fallback: OfflineSnapshot | null) {
	if (!snapshot) return fallback;
	if (fallback && snapshot.userId !== fallback.userId) return fallback;
	return snapshot;
}
