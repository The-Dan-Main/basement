import { error } from '@sveltejs/kit';
import { loadSnapshotResilient } from '$lib/offline/sync';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase, user, profile } = await parent();
	if (!supabase || !user) error(401);
	const snap = await loadSnapshotResilient(supabase, user.id, profile);
	return { snap };
};
