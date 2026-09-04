<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RecipeForm, { type RecipeFormValue } from '$lib/components/RecipeForm.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { persistRecipeUpsert, recipeDetail } from '$lib/offline/sync';
	import { removeRecipeImage, uploadRecipeImage } from '$lib/recipe-images';
	import { asNumber, buildRecipeBundle, parseAmountInput } from '$lib/recipes';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const detail = $derived(recipeDetail(snap, data.recipeId));
	let saving = $state(false);
	let error = $state('');

	async function save(value: RecipeFormValue) {
		if (!data.supabase || !data.user || !detail.recipe) return;
		const title = value.title.trim();
		if (!title) {
			error = t.errors.recipeTitle;
			return;
		}
		saving = true;
		error = '';
		let imagePath = detail.recipe.image_path;
		let imageUrl = detail.recipe.image_url ?? '';
		try {
			if (value.removeImage && imagePath) {
				await removeRecipeImage(data.supabase, imagePath);
				imagePath = '';
				imageUrl = '';
			}
			if (value.file) {
				try {
					imagePath = await uploadRecipeImage(
						data.supabase,
						detail.recipe.household_id,
						detail.recipe.id,
						value.file,
						imagePath
					);
					imageUrl = URL.createObjectURL(value.file);
				} catch {
					error = t.errors.recipeImage;
					saving = false;
					return;
				}
			}
			const bundle = buildRecipeBundle({
				id: detail.recipe.id,
				householdId: detail.recipe.household_id,
				userId: detail.recipe.created_by,
				title,
				description: value.description,
				servings: value.servings,
				imagePath,
				imageUrl,
				calories: asNumber(value.calories),
				fat_g: asNumber(value.fat_g),
				protein_g: asNumber(value.protein_g),
				fiber_g: asNumber(value.fiber_g),
				source: detail.recipe.source,
				sourceKey: detail.recipe.source_key,
				ingredients: value.ingredients.map((row) => ({
					name: row.name,
					amount: parseAmountInput(row.amount),
					unit: row.unit,
					note: row.note,
					category: row.category
				})),
				steps: value.steps.map((row) => ({ instruction: row.instruction })),
				createdAt: detail.recipe.created_at
			});
			await persistRecipeUpsert(
				data.supabase,
				data.user.id,
				bundle.recipe,
				bundle.ingredients,
				bundle.steps
			);
			await goto(resolve(`/app/recipes/${detail.recipe.id}`));
		} catch {
			error = t.errors.generic;
			saving = false;
		}
	}
</script>

<svelte:head><title>{t.recipes.edit} · Basement</title></svelte:head>

<div class="space-y-6">
	<a class="text-sm text-gold" href={resolve(`/app/recipes/${data.recipeId}`)}
		>{detail.recipe?.title ?? t.recipes.all}</a
	>
	<h1 class="text-3xl font-semibold tracking-tight">{t.recipes.edit}</h1>
	{#if detail.recipe}
		<RecipeForm
			recipe={detail.recipe}
			ingredients={detail.ingredients}
			steps={detail.steps}
			{saving}
			{error}
			onsave={(value) => void save(value)}
		/>
	{/if}
</div>
