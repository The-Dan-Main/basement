/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, prerendered, version } from '$service-worker';

const self = globalThis.self as unknown as ServiceWorkerGlobalScope;
const ASSET_CACHE = `basement-assets-${version}`;
const PAGE_CACHE = 'basement-pages';
const ASSETS = new Set([...build, ...files, ...prerendered]);
const SKIP = ['/auth/', '/logout'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(ASSET_CACHE);
			await cache.addAll([...ASSETS]);
			try {
				const pages = await caches.open(PAGE_CACHE);
				const home = await fetch('/app', { credentials: 'same-origin' });
				if (home.ok) await pages.put('/app', home.clone());
			} catch {
				/* not signed in yet */
			}
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== ASSET_CACHE && key !== PAGE_CACHE) await caches.delete(key);
			}
			await self.clients.claim();
		})()
	);
});

function shouldSkip(url: URL) {
	return SKIP.some((path) => url.pathname === path || url.pathname.startsWith(path));
}

function isNavigation(request: Request) {
	return request.mode === 'navigate' || request.destination === 'document';
}

async function fromCaches(request: Request, url: URL) {
	const pages = await caches.open(PAGE_CACHE);
	const assets = await caches.open(ASSET_CACHE);
	return (
		(await pages.match(request)) ||
		(await pages.match(url.pathname)) ||
		(await assets.match(url.pathname)) ||
		(await assets.match(request))
	);
}

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (shouldSkip(url)) return;

	event.respondWith(
		(async () => {
			if (ASSETS.has(url.pathname)) {
				const cachedAsset = await fromCaches(request, url);
				if (cachedAsset) return cachedAsset;
			}

			try {
				const response = await fetch(request);
				if (!(response instanceof Response)) throw new Error('invalid response');
				if (response.ok) {
					const cache = ASSETS.has(url.pathname)
						? await caches.open(ASSET_CACHE)
						: await caches.open(PAGE_CACHE);
					await cache.put(request, response.clone());
					if (isNavigation(request) && url.pathname.startsWith('/app')) {
						const pages = await caches.open(PAGE_CACHE);
						await pages.put(url.pathname, response.clone());
					}
				}
				return response;
			} catch {
				const cached = await fromCaches(request, url);
				if (cached) return cached;
				if (isNavigation(request)) {
					const pages = await caches.open(PAGE_CACHE);
					if (url.pathname === '/app' || url.pathname === '/app/') {
						const app = await pages.match('/app');
						if (app) return app;
					}
					const offline =
						(await pages.match('/offline.html')) ||
						(await caches.open(ASSET_CACHE).then((cache) => cache.match('/offline.html')));
					if (offline) return offline;
				}
				return new Response('Offline', { status: 503, statusText: 'Offline' });
			}
		})()
	);
});

type PushPayload = {
	title?: string;
	body?: string;
	url?: string;
	count?: number;
};

self.addEventListener('push', (event) => {
	event.waitUntil(
		(async () => {
			let payload: PushPayload;
			try {
				payload = (event.data?.json() as PushPayload | undefined) ?? {};
			} catch {
				payload = {};
			}
			const title = payload.title || 'Basement';
			const target = payload.url || '/app/lists';
			await self.registration.showNotification(title, {
				body: payload.body || '',
				icon: '/icons/icon-192.png',
				badge: '/icons/icon-192.png',
				tag: 'shopping-noon',
				data: { url: target }
			});
			const badge = navigator as Navigator & {
				setAppBadge?: (contents?: number) => Promise<void>;
			};
			if (typeof payload.count === 'number' && badge.setAppBadge) {
				await badge.setAppBadge(payload.count).catch(() => undefined);
			}
		})()
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const path = (event.notification.data as { url?: string } | undefined)?.url || '/app/lists';
	const target = new URL(path, self.location.origin).href;
	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const client of windows) {
				if (new URL(client.url).origin !== self.location.origin) continue;
				const opener = client as WindowClient & {
					navigate?: (url: string) => Promise<WindowClient | null>;
				};
				if (opener.navigate) await opener.navigate(target);
				return client.focus();
			}
			await self.clients.openWindow(target);
		})()
	);
});
