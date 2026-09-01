<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RecipeForm, { type RecipeFormValue } from '$lib/components/RecipeForm.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { persistRecipeUpsert } from '$lib/offline/sync';
	import { uploadRecipeImage } from '$lib/recipe-images';
	import { asNumber, buildRecipeBundle, parseAmountInput } from '$lib/recipes';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const household = $derived(data.snap.households[0] ?? null);
	let saving = $state(false);
	let error = $state('');

	async function save(value: RecipeFormValue) {
		if (!data.supabase || !data.user || !household) return;
		const title = value.title.trim();
		if (!title) {
			error = t.errors.recipeTitle;
			return;
		}
		saving = true;
		error = '';
		const id = crypto.randomUUID();
		let imagePath = '';
		let imageUrl = '';
		try {
			if (value.file) {
				try {
					imagePath = await uploadRecipeImage(data.supabase, household.id, id, value.file);
					imageUrl = URL.createObjectURL(value.file);
				} catch {
					error = t.errors.recipeImage;
					saving = false;
					return;
				}
			}
			const bundle = buildRecipeBundle({
				id,
				householdId: household.id,
				userId: data.user.id,
				title,
				description: value.description,
				servings: value.servings,
				imagePath,
				imageUrl,
				calories: asNumber(value.calories),
				fat_g: asNumber(value.fat_g),
				protein_g: asNumber(value.protein_g),
				fiber_g: asNumber(value.fiber_g),
				ingredients: value.ingredients.map((row) => ({
					name: row.name,
					amount: parseAmountInput(row.amount),
					unit: row.unit,
					note: row.note,
					category: row.category
				})),
				steps: value.steps.map((row) => ({ instruction: row.instruction }))
			});
			await persistRecipeUpsert(
				data.supabase,
				data.user.id,
				bundle.recipe,
				bundle.ingredients,
				bundle.steps
			);
			await goto(resolve(`/app/recipes/${id}`));
		} catch {
			error = t.errors.generic;
			saving = false;
		}
	}
</script>

<svelte:head><title>{t.recipes.create} · Basement</title></svelte:head>

<div class="space-y-6">
	<a class="text-sm text-gold" href={resolve('/app/recipes')}>{t.recipes.all}</a>
	<h1 class="text-3xl font-semibold tracking-tight">{t.recipes.create}</h1>
	<RecipeForm {saving} {error} onsave={(value) => void save(value)} />
</div>
