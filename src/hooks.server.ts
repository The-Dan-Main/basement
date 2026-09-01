import { redirect, type Handle } from '@sveltejs/kit';
import { getSupabaseConfig, isSupabaseConfigured } from '$lib/server/env';
import { createServerSupabase } from '$lib/supabase/server';
import { LOCALE_COOKIE, parseLocale } from '$lib/i18n/locales';

export const handle: Handle = async ({ event, resolve }) => {
	const configured = isSupabaseConfigured();
	event.locals.configured = configured;

	if (configured) {
		const { url, publishableKey } = getSupabaseConfig();
		event.locals.supabase = createServerSupabase(url, publishableKey, event.cookies, event.fetch);
	} else {
		event.locals.supabase = null;
	}

	event.locals.safeGetSession = async () => {
		if (!event.locals.supabase) return { session: null, user: null };
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error || !user) return { session: null, user: null };
		return { session, user };
	};

	const { session } = await event.locals.safeGetSession();
	const path = event.url.pathname;

	if (path.startsWith('/app') && !session) {
		const next = encodeURIComponent(path + event.url.search);
		redirect(303, `/login?next=${next}`);
	}

	if ((path === '/login' || path === '/signup') && session) {
		const next = event.url.searchParams.get('next');
		redirect(303, next?.startsWith('/') ? next : '/app');
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
		transformPageChunk: ({ html }) =>
			html.replace('%lang%', parseLocale(event.cookies.get(LOCALE_COOKIE)))
	});
};
