import { nowIso } from '$lib/data';
import { mealieFileToBlob, type MealieRecipeDraft } from '$lib/mealie';
import {
	persistCookbookUpsert,
	persistRatingUpsert,
	persistRecipeCommentAdd,
	persistRecipeUpsert,
	persistTimelineAdd,
	readSnapshot,
	type OfflineSnapshot
} from '$lib/offline/sync';
import { uploadRecipeImage } from '$lib/recipe-images';
import { buildRecipeBundle } from '$lib/recipes';
import type { BasementClient } from '$lib/supabase/client';
import type { Cookbook } from '$lib/types/app';

export type ImportReport = {
	imported: number;
	updated: number;
	skipped: number;
	failed: number;
	titles: string[];
};

function cookbookByTitle(snap: OfflineSnapshot, householdId: string, title: string) {
	const key = title.trim().toLowerCase();
	return snap.cookbooks.find(
		(row) => row.household_id === householdId && row.title.trim().toLowerCase() === key
	);
}

function toCreatedAt(value: string | null) {
	if (!value) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export async function persistMealieDrafts(
	supabase: BasementClient,
	userId: string,
	householdId: string,
	drafts: MealieRecipeDraft[],
	replace = false
): Promise<ImportReport> {
	const report: ImportReport = { imported: 0, updated: 0, skipped: 0, failed: 0, titles: [] };

	for (const draft of drafts) {
		try {
			const snap =
				(await readSnapshot(userId)) ??
				({
					recipes: [],
					cookbooks: [],
					cookbookRecipes: []
				} as Pick<OfflineSnapshot, 'recipes' | 'cookbooks' | 'cookbookRecipes'> as OfflineSnapshot);
			const existing = snap.recipes.find(
				(row) =>
					row.household_id === householdId &&
					row.source === 'mealie' &&
					row.source_key === draft.sourceKey
			);
			if (existing && !replace) {
				report.skipped += 1;
				continue;
			}
			const id = existing?.id ?? crypto.randomUUID();
			let imagePath = existing?.image_path ?? '';
			let imageUrl = existing?.image_url ?? '';
			if (draft.image) {
				const file = mealieFileToBlob(draft.image);
				imagePath = await uploadRecipeImage(supabase, householdId, id, file, imagePath);
				imageUrl = URL.createObjectURL(file);
			}
			const bundle = buildRecipeBundle({
				id,
				householdId,
				userId: existing?.created_by ?? userId,
				title: draft.title,
				description: draft.description,
				servings: draft.servings,
				imagePath,
				imageUrl,
				calories: draft.calories,
				fat_g: draft.fat_g,
				protein_g: draft.protein_g,
				fiber_g: draft.fiber_g,
				source: 'mealie',
				sourceKey: draft.sourceKey,
				ingredients: draft.ingredients,
				steps: draft.steps,
				createdAt: existing?.created_at ?? toCreatedAt(draft.createdAt)
			});
			await persistRecipeUpsert(supabase, userId, bundle.recipe, bundle.ingredients, bundle.steps);

			if (draft.rating) {
				await persistRatingUpsert(supabase, userId, {
					recipe_id: id,
					user_id: userId,
					rating: draft.rating,
					updated_at: nowIso()
				});
			}
			if (draft.lastMade) {
				await persistTimelineAdd(supabase, userId, {
					id: crypto.randomUUID(),
					recipe_id: id,
					household_id: householdId,
					user_id: userId,
					event_type: 'cooked',
					cooked_at: new Date(draft.lastMade).toISOString(),
					rating: draft.rating,
					note: '',
					created_at: nowIso()
				});
			}
			for (const comment of draft.comments) {
				await persistRecipeCommentAdd(supabase, userId, {
					id: crypto.randomUUID(),
					recipe_id: id,
					user_id: userId,
					body: comment.body,
					created_at: comment.createdAt || nowIso(),
					updated_at: comment.createdAt || nowIso()
				});
			}

			for (const title of draft.cookbooks) {
				const live = (await readSnapshot(userId)) ?? snap;
				const found = cookbookByTitle(live, householdId, title);
				const cookbook: Cookbook = found ?? {
					id: crypto.randomUUID(),
					household_id: householdId,
					title,
					description: '',
					created_by: userId,
					created_at: nowIso(),
					updated_at: nowIso()
				};
				const recipeIds = [
					...live.cookbookRecipes
						.filter((row) => row.cookbook_id === cookbook.id)
						.sort((a, b) => a.sort_order - b.sort_order)
						.map((row) => row.recipe_id)
						.filter((recipeId) => recipeId !== id),
					id
				];
				await persistCookbookUpsert(
					supabase,
					userId,
					{ ...cookbook, updated_at: nowIso() },
					recipeIds
				);
			}

			if (existing) report.updated += 1;
			else report.imported += 1;
			report.titles.push(draft.title);
		} catch {
			report.failed += 1;
		}
	}

	return report;
}
