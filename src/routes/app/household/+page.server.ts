import { fail } from '@sveltejs/kit';
import { getSupabaseConfig } from '$lib/server/env';
import type { Actions } from './$types';

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		if (!locals.supabase) return fail(503, { code: 'notConfigured' });
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { code: 'signInFirst' });
		const form = await request.formData();
		const householdId = String(form.get('householdId') ?? '');
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		if (!householdId || !email) return fail(400, { code: 'enterEmail' });

		const { data: owner } = await locals.supabase
			.from('household_members')
			.select('role')
			.eq('household_id', householdId)
			.eq('user_id', user.id)
			.maybeSingle();
		if (owner?.role !== 'owner') return fail(403, { code: 'ownerOnly' });

		const token = crypto.randomUUID();
		const { error } = await locals.supabase.from('household_invites').insert({
			household_id: householdId,
			email,
			token,
			invited_by: user.id
		});
		if (error) return fail(400, { message: error.message });

		const { baseUrl } = getSupabaseConfig();
		return { ok: true, code: 'inviteCreated', inviteUrl: `${baseUrl}/invite/${token}` };
	},
	revoke: async ({ request, locals }) => {
		if (!locals.supabase) return fail(503, { code: 'notConfigured' });
		const form = await request.formData();
		const inviteId = String(form.get('inviteId') ?? '');
		const { error } = await locals.supabase.from('household_invites').delete().eq('id', inviteId);
		if (error) return fail(400, { message: error.message });
		return { ok: true, code: 'inviteRemoved' };
	}
};
