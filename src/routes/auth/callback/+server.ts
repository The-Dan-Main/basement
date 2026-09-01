import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/app';
	if (code && locals.supabase) {
		await locals.supabase.auth.exchangeCodeForSession(code);
	}
	redirect(303, next.startsWith('/') ? next : '/app');
};
