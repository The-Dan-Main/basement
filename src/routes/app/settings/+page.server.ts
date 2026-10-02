import { fail } from '@sveltejs/kit';
import { geminiKeyHint, isGeminiKey, normalizeGeminiKey } from '$lib/ai-key';
import { getSupabaseConfig } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { vapidPublicKey } = getSupabaseConfig();
	const { user } = await locals.safeGetSession();
	if (!locals.supabase || !user) return { hasGeminiKey: false, geminiHint: '', vapidPublicKey };
	const { data } = await locals.supabase
		.from('user_ai_keys')
		.select('gemini_api_key')
		.eq('user_id', user.id)
		.maybeSingle();
	const key = data?.gemini_api_key?.trim() ?? '';
	return {
		hasGeminiKey: isGeminiKey(key),
		geminiHint: geminiKeyHint(key),
		vapidPublicKey
	};
};

export const actions: Actions = {
	name: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!locals.supabase || !user) return fail(401, { code: 'signInFirst' });
		const form = await request.formData();
		const display_name = String(form.get('display_name') ?? '').trim();
		if (!display_name) return fail(400, { code: 'nameRequired' });
		const { error } = await locals.supabase
			.from('profiles')
			.update({ display_name })
			.eq('id', user.id);
		if (error) return fail(400, { message: error.message });
		return { saved: true };
	},
	gemini: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!locals.supabase || !user) return fail(401, { code: 'signInFirst' });
		const form = await request.formData();
		const key = normalizeGeminiKey(String(form.get('gemini_api_key') ?? ''));
		if (!isGeminiKey(key)) return fail(400, { code: 'geminiKey' });
		const { error } = await locals.supabase.from('user_ai_keys').upsert({
			user_id: user.id,
			gemini_api_key: key
		});
		if (error) return fail(400, { message: error.message, gemini: true });
		return { geminiSaved: true };
	},
	clearGemini: async ({ locals }) => {
		const { user } = await locals.safeGetSession();
		if (!locals.supabase || !user) return fail(401, { code: 'signInFirst' });
		const { error } = await locals.supabase.from('user_ai_keys').delete().eq('user_id', user.id);
		if (error) return fail(400, { message: error.message, gemini: true });
		return { geminiCleared: true };
	}
};
