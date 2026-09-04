import { error } from '@sveltejs/kit';
import { cookbookDetail, loadSnapshotResilient } from '$lib/offline/sync';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
	const { supabase, user, profile } = await parent();
	if (!supabase || !user) error(401);
	const snap = await loadSnapshotResilient(supabase, user.id, profile);
	if (!cookbookDetail(snap, params.id).cookbook) error(404, 'Cookbook not found');
	return { snap, cookbookId: params.id };
};
