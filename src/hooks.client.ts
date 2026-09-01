import { isOnline, setOfflineStatus } from '$lib/offline/status';
import { refreshPending } from '$lib/offline/sync';

const sync = () => {
	setOfflineStatus({ online: isOnline() });
	void refreshPending();
};

window.addEventListener('online', sync);
window.addEventListener('offline', sync);
sync();
