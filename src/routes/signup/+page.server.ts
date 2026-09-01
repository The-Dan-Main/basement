import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseConfig } from '$lib/server/env';
import { parseLocale } from '$lib/i18n/locales';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { configured: locals.configured };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.supabase) return fail(503, { code: 'notConfigured' });
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const displayName = String(form.get('displayName') ?? '').trim();
		const locale = parseLocale(String(form.get('locale') ?? 'en'));
		if (password.length < 6) return fail(400, { code: 'minPassword' });
		const { baseUrl } = getSupabaseConfig();
		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					display_name: displayName || email.split('@')[0],
					locale
				},
				emailRedirectTo: `${baseUrl}/auth/callback?next=/app`
			}
		});
		if (error) return fail(400, { message: error.message });
		if (!data.session) {
			return { code: 'checkEmail', ok: true };
		}
		redirect(303, '/app');
	}
};
