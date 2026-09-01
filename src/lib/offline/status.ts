type Listener = () => void;

const listeners = new Set<Listener>();

export const offlineStatus = {
	online: typeof navigator === 'undefined' ? true : navigator.onLine,
	pending: 0,
	ready: false
};

export function subscribeOffline(listener: Listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function setOfflineStatus(patch: Partial<typeof offlineStatus>) {
	Object.assign(offlineStatus, patch);
	for (const listener of listeners) listener();
}

export function isOnline() {
	return typeof navigator === 'undefined' ? true : navigator.onLine;
}
