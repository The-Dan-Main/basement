import { error } from '@sveltejs/kit';
import { loadSnapshotResilient } from '$lib/offline/sync';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
	const { supabase, user, profile } = await parent();
	if (!supabase || !user) error(401);
	const snap = await loadSnapshotResilient(supabase, user.id, profile);
	const chore = snap.chores.find((row) => row.id === params.id);
	if (!chore) error(404, 'Chore not found');
	return { snap, choreId: params.id };
};
