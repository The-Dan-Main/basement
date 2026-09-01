import { getSupabaseConfig, isSupabaseConfigured } from '$lib/server/env';
import {
	LOCALE_COOKIE,
	LOCALE_COOKIE_OPTIONS,
	isLocale,
	localeFromAccept,
	parseLocale
} from '$lib/i18n/locales';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies, request }) => {
	const { session, user } = await locals.safeGetSession();
	const { url, publishableKey } = getSupabaseConfig();

	const cookieLocale = cookies.get(LOCALE_COOKIE);
	let locale = localeFromAccept(request.headers.get('accept-language'));

	if (isLocale(cookieLocale)) {
		locale = cookieLocale;
	} else if (user && locals.supabase) {
		const { data: row } = await locals.supabase
			.from('profiles')
			.select('locale')
			.eq('id', user.id)
			.maybeSingle();
		if (row?.locale) locale = parseLocale(row.locale);
	}

	if (!isLocale(cookieLocale)) {
		cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
	}

	return {
		session,
		user,
		configured: isSupabaseConfigured(),
		supabaseUrl: url,
		supabaseKey: publishableKey,
		cookies: cookies.getAll(),
		locale
	};
};
