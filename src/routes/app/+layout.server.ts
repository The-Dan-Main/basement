import { error } from '@sveltejs/kit';
import { ensureProfile } from '$lib/server/profile';
import { parseLocale } from '$lib/i18n/locales';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
	const { user, locale } = await parent();
	if (!locals.supabase || !user) error(401, 'Sign in to continue');
	const profile = await ensureProfile(locals.supabase, user, parseLocale(locale));
	if (!profile) error(500, 'Could not load your profile');
	return { profile };
};
