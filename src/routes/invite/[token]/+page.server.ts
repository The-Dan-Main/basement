import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) {
		redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	if (!locals.supabase) error(503, 'notConfigured');

	const { data: invite } = await locals.supabase
		.from('household_invites')
		.select('*')
		.eq('token', params.token)
		.maybeSingle();

	if (!invite) error(404, 'inviteNotFound');
	if (invite.accepted_at) {
		return { invite, already: true, emailMismatch: false, householdName: '' };
	}
	if (new Date(invite.expires_at).getTime() < Date.now()) {
		error(410, 'inviteExpired');
	}

	const { data: household } = await locals.supabase
		.from('households')
		.select('name')
		.eq('id', invite.household_id)
		.maybeSingle();

	const email = user?.email?.toLowerCase() ?? '';
	const emailMismatch = email !== invite.email.toLowerCase();
	return {
		invite,
		already: false,
		emailMismatch,
		householdName: household?.name ?? 'a household'
	};
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		if (!locals.supabase) return fail(503, { code: 'notConfigured' });
		const { user } = await locals.safeGetSession();
		if (!user?.email) return fail(401, { code: 'signInFirst' });

		const { data: invite } = await locals.supabase
			.from('household_invites')
			.select('*')
			.eq('token', params.token)
			.maybeSingle();
		if (!invite) return fail(404, { code: 'inviteNotFound' });
		if (invite.accepted_at) redirect(303, '/app');
		if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
			return fail(403, { code: 'inviteEmail' });
		}

		const { error: memberError } = await locals.supabase.from('household_members').insert({
			household_id: invite.household_id,
			user_id: user.id,
			role: 'member'
		});
		if (memberError && !memberError.message.includes('duplicate')) {
			return fail(400, { message: memberError.message });
		}

		await locals.supabase
			.from('household_invites')
			.update({ accepted_at: new Date().toISOString() })
			.eq('id', invite.id);

		redirect(303, '/app');
	}
};
