import { error } from '@sveltejs/kit';
import { loadSnapshotResilient } from '$lib/offline/sync';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
	const { supabase, user, profile } = await parent();
	if (!supabase || !user) error(401);
	const snap = await loadSnapshotResilient(supabase, user.id, profile);
	const list = snap.lists.find((row) => row.id === params.id);
	if (!list) error(404, 'List not found');
	return { snap, listId: params.id };
};
