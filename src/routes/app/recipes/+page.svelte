<script lang="ts">
	import { resolve } from '$app/paths';
	import RecipeSubnav from '$lib/components/RecipeSubnav.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill, formatDay } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { averageRating, recipesForHousehold } from '$lib/offline/sync';
	import { formatNutrition, nutritionPerServing } from '$lib/recipes';
	import { btnPrimary, panelClass } from '$lib/ui';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	const recipes = $derived(recipesForHousehold(snap, household?.id));
</script>

<svelte:head><title>{t.recipes.title}</title></svelte:head>

<div class="space-y-8">
	<RecipeSubnav />
	<section class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{t.recipes.heading}</h1>
		</div>
		{#if household}
			<a class={btnPrimary} href={resolve('/app/recipes/new')}>{t.recipes.new}</a>
		{/if}
	</section>

	{#if recipes.length === 0}
		<section class={[panelClass, 'p-6']}>
			<p class="font-semibold">{t.recipes.emptyTitle}</p>
			<p class="mt-2 text-sm text-fog">{t.recipes.emptyBody}</p>
		</section>
	{:else}
		<section class="grid gap-3 sm:grid-cols-2">
			{#each recipes as recipe (recipe.id)}
				{@const per = nutritionPerServing(recipe)}
				{@const ratings = snap.recipeRatings.filter((row) => row.recipe_id === recipe.id)}
				{@const avg = averageRating(ratings)}
				{@const last = snap.recipeTimeline
					.filter((row) => row.recipe_id === recipe.id)
					.sort((a, b) => b.cooked_at.localeCompare(a.cooked_at))[0]}
				<a
					class={[panelClass, 'overflow-hidden transition hover:border-gold/40']}
					href={resolve(`/app/recipes/${recipe.id}`)}
				>
					{#if recipe.image_url}
						<img src={recipe.image_url} alt="" class="h-40 w-full object-cover" />
					{:else}
						<div class="grid h-40 place-items-center bg-ink-soft text-4xl" aria-hidden="true">
							🍽️
						</div>
					{/if}
					<div class="space-y-2 p-5">
						<h2 class="text-xl font-semibold">{recipe.title}</h2>
						<p class="text-sm text-fog">
							{fill(t.recipes.people, { count: recipe.servings })}
							{#if recipe.calories}
								· {formatNutrition(per.calories)} {t.recipes.kcal}
							{/if}
						</p>
						{#if avg}
							<StarRating value={Math.round(avg)} readonly />
						{/if}
						<p class="text-xs text-fog">
							{last
								? fill(t.recipes.lastCooked, { date: formatDay(last.cooked_at, i18n.locale) })
								: t.recipes.neverCooked}
						</p>
					</div>
				</a>
			{/each}
		</section>
	{/if}
</div>
