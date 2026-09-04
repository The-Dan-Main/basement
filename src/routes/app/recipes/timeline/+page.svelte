<script lang="ts">
	import { resolve } from '$app/paths';
	import RecipeSubnav from '$lib/components/RecipeSubnav.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill, formatDay } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { householdTimeline, memberName } from '$lib/offline/sync';
	import { panelClass } from '$lib/ui';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	const events = $derived(householdTimeline(snap, household?.id));
</script>

<svelte:head><title>{t.recipes.timelineTitle}</title></svelte:head>

<div class="space-y-8">
	<RecipeSubnav />
	<h1 class="text-3xl font-semibold tracking-tight">{t.recipes.timelineHeading}</h1>

	{#if events.length === 0}
		<section class={[panelClass, 'p-6']}>
			<p class="text-fog">{t.recipes.timelineEmpty}</p>
		</section>
	{:else}
		<ol class="space-y-3">
			{#each events as event (event.id)}
				{@const recipe = snap.recipes.find((row) => row.id === event.recipe_id)}
				<li class={[panelClass, 'p-5']}>
					<p class="text-xs tracking-[0.16em] text-fog uppercase">
						{formatDay(event.cooked_at, i18n.locale)}
						{#if memberName(snap, event.user_id)}
							· {memberName(snap, event.user_id)}
						{/if}
					</p>
					{#if recipe}
						<a
							class="mt-2 block text-xl font-semibold text-gold"
							href={resolve(`/app/recipes/${recipe.id}`)}>{recipe.title}</a
						>
					{:else}
						<p class="mt-2 text-xl font-semibold">{t.recipes.missing}</p>
					{/if}
					{#if event.rating}
						<div class="mt-2">
							<StarRating value={event.rating} readonly />
						</div>
					{/if}
					{#if event.note}
						<p class="mt-2 text-fog">{event.note}</p>
					{/if}
					{#if !event.rating && !event.note}
						<p class="mt-2 text-sm text-fog">
							{fill(t.recipes.lastCooked, { date: formatDay(event.cooked_at, i18n.locale) })}
						</p>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</div>
