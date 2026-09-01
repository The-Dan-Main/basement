import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

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
	}
};
