<script lang="ts">
	import { resolve } from '$app/paths';
	import RecipeSubnav from '$lib/components/RecipeSubnav.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { cookbooksForHousehold } from '$lib/offline/sync';
	import { btnPrimary, panelClass } from '$lib/ui';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	const cookbooks = $derived(cookbooksForHousehold(snap, household?.id));
</script>

<svelte:head><title>{t.recipes.cookbooksTitle}</title></svelte:head>

<div class="space-y-8">
	<RecipeSubnav />
	<section class="flex flex-wrap items-end justify-between gap-3">
		<h1 class="text-3xl font-semibold tracking-tight">{t.recipes.cookbooksHeading}</h1>
		{#if household}
			<a class={btnPrimary} href={resolve('/app/recipes/cookbooks/new')}>{t.recipes.cookbookNew}</a>
		{/if}
	</section>

	{#if cookbooks.length === 0}
		<section class={[panelClass, 'p-6']}>
			<p class="font-semibold">{t.recipes.cookbookEmptyTitle}</p>
			<p class="mt-2 text-sm text-fog">{t.recipes.cookbookEmptyBody}</p>
		</section>
	{:else}
		<section class="grid gap-3 sm:grid-cols-2">
			{#each cookbooks as cookbook (cookbook.id)}
				{@const count = snap.cookbookRecipes.filter(
					(row) => row.cookbook_id === cookbook.id
				).length}
				<a
					class={[panelClass, 'p-5 transition hover:border-gold/40']}
					href={resolve(`/app/recipes/cookbooks/${cookbook.id}`)}
				>
					<h2 class="text-xl font-semibold">{cookbook.title}</h2>
					<p class="mt-2 text-sm text-fog">{fill(t.recipes.cookbookRecipes, { count })}</p>
					{#if cookbook.description}
						<p class="mt-2 line-clamp-3 text-sm text-fog">{cookbook.description}</p>
					{/if}
				</a>
			{/each}
		</section>
	{/if}
</div>
