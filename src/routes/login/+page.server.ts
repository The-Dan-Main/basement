import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseConfig } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	return {
		configured: locals.configured,
		next: url.searchParams.get('next') ?? '/app'
	};
};

export const actions: Actions = {
	password: async ({ request, locals, url }) => {
		if (!locals.supabase) return fail(503, { code: 'notConfigured' });
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const next = url.searchParams.get('next') || '/app';
		if (!password) return fail(400, { code: 'enterPassword' });
		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { message: error.message });
		redirect(303, next.startsWith('/') ? next : '/app');
	},
	magic: async ({ request, locals, url }) => {
		if (!locals.supabase) return fail(503, { code: 'notConfigured' });
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		if (!email) return fail(400, { code: 'enterEmail' });
		const { baseUrl } = getSupabaseConfig();
		const next = url.searchParams.get('next') || '/app';
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}` }
		});
		if (error) return fail(400, { message: error.message, ok: false });
		return { code: 'checkInbox', ok: true };
	}
};
