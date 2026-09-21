import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '$lib/server/env';
import { signRecipeImageUrls } from '$lib/recipe-images';
import { hydrateIngredient, hydrateRecipe } from '$lib/recipes';
import type { BasementClient } from '$lib/supabase/client';
import type { Database } from '$lib/types/database.types';
import type { Recipe, RecipeIngredient, RecipePublicComment, RecipeStep } from '$lib/types/app';

const SLUG = /^[0-9a-f]{12}$/;

export function createServiceSupabase() {
	const { url, serviceKey } = getSupabaseConfig();
	if (!url || !serviceKey) return null;
	return createClient<Database>(url, serviceKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

export async function publicRecipeImageUrl(supabase: BasementClient, imagePath: string) {
	if (!imagePath) return '';
	const signed = await signRecipeImageUrls(supabase, [imagePath]);
	const fromClient = signed.get(imagePath) ?? '';
	if (fromClient) return fromClient;
	const admin = createServiceSupabase();
	if (!admin) return '';
	const adminSigned = await signRecipeImageUrls(admin as BasementClient, [imagePath]);
	return adminSigned.get(imagePath) ?? '';
}

export async function loadPublicRecipe(
	supabase: BasementClient,
	slug: string
): Promise<{
	recipe: Recipe;
	ingredients: RecipeIngredient[];
	steps: RecipeStep[];
	comments: RecipePublicComment[];
	imageUrl: string;
} | null> {
	const trimmed = slug.trim().toLowerCase();
	if (!SLUG.test(trimmed)) return null;

	const { data: row, error } = await supabase
		.from('recipes')
		.select('*')
		.eq('public_slug', trimmed)
		.eq('is_public', true)
		.maybeSingle();
	if (error || !row) return null;

	const recipe = hydrateRecipe({ ...row, image_url: '' });
	const [{ data: ingredientRows }, { data: stepRows }, { data: commentRows }, imageUrl] =
		await Promise.all([
			supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipe.id),
			supabase.from('recipe_steps').select('*').eq('recipe_id', recipe.id),
			supabase
				.from('recipe_public_comments')
				.select('*')
				.eq('recipe_id', recipe.id)
				.order('created_at', { ascending: false }),
			publicRecipeImageUrl(supabase, recipe.image_path)
		]);

	const ingredients = (ingredientRows ?? [])
		.map(hydrateIngredient)
		.sort((a, b) => a.sort_order - b.sort_order);
	const steps = (stepRows ?? [])
		.map((step) => ({
			...step,
			instruction: step.instruction ?? '',
			sort_order: step.sort_order ?? 0
		}))
		.sort((a, b) => a.sort_order - b.sort_order);

	return {
		recipe: { ...recipe, image_url: imageUrl },
		ingredients,
		steps,
		comments: commentRows ?? [],
		imageUrl
	};
}
