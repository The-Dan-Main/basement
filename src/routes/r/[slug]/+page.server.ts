import { error, fail } from '@sveltejs/kit';
import { getSupabaseConfig } from '$lib/server/env';
import { loadPublicRecipe } from '$lib/server/public-recipe';
import type { Actions, PageServerLoad } from './$types';

const NAME_MAX = 40;
const BODY_MAX = 2000;

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.supabase) error(503, 'notConfigured');
	const loaded = await loadPublicRecipe(locals.supabase, params.slug);
	if (!loaded) error(404, 'publicMissing');
	return {
		...loaded,
		origin: getSupabaseConfig().baseUrl
	};
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		if (!locals.supabase) return fail(503, { code: 'notConfigured' });
		const loaded = await loadPublicRecipe(locals.supabase, params.slug);
		if (!loaded) return fail(404, { code: 'publicMissing' });

		const form = await request.formData();
		if (String(form.get('website') ?? '').trim()) {
			return { ok: true };
		}

		const author = String(form.get('author') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (author.length < 1 || author.length > NAME_MAX) {
			return fail(400, { code: 'guestName' });
		}
		if (body.length < 1 || body.length > BODY_MAX) {
			return fail(400, { code: 'guestComment' });
		}

		const { error: insertError } = await locals.supabase.from('recipe_public_comments').insert({
			recipe_id: loaded.recipe.id,
			author_name: author,
			body
		});
		if (insertError) return fail(400, { message: insertError.message });
		return { ok: true };
	}
};
