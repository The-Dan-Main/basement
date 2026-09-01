import { error } from '@sveltejs/kit';
import { loadSnapshotResilient, recipeDetail } from '$lib/offline/sync';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
	const { supabase, user, profile } = await parent();
	if (!supabase || !user) error(401);
	const snap = await loadSnapshotResilient(supabase, user.id, profile);
	const detail = recipeDetail(snap, params.id);
	if (!detail.recipe) error(404, 'Recipe not found');
	return { snap, recipeId: params.id };
};
