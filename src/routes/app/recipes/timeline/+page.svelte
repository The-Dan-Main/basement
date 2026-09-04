<script lang="ts">
	import RecipeSubnav from '$lib/components/RecipeSubnav.svelte';
	import RecipeTimeline from '$lib/components/RecipeTimeline.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { memberName, recipeFeed, type RecipeFeedKind } from '$lib/offline/sync';
	import { panelClass } from '$lib/ui';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	let filter = $state<'all' | RecipeFeedKind>('all');
	const events = $derived(recipeFeed(snap, household?.id, filter));
	const filters = $derived([
		{ id: 'all' as const, label: t.recipes.timelineAll },
		{ id: 'cooked' as const, label: t.recipes.timelineCooked },
		{ id: 'created' as const, label: t.recipes.timelineAdded }
	]);
</script>

<svelte:head><title>{t.recipes.timelineTitle}</title></svelte:head>

<div class="space-y-8">
	<RecipeSubnav />
	<h1 class="text-3xl font-semibold tracking-tight">{t.recipes.timelineHeading}</h1>
	<div class="flex flex-wrap gap-2">
		{#each filters as item (item.id)}
			<button
				class={[
					'rounded-full px-4 py-2 text-sm font-semibold',
					filter === item.id ? 'bg-gold text-ink' : 'border border-line text-fog hover:text-paper'
				]}
				type="button"
				onclick={() => (filter = item.id)}
			>
				{item.label}
			</button>
		{/each}
	</div>

	{#if events.length === 0}
		<section class={[panelClass, 'p-6']}>
			<p class="text-fog">{t.recipes.timelineEmpty}</p>
		</section>
	{:else}
		<RecipeTimeline
			{events}
			recipes={snap.recipes}
			nameFor={(userId) => memberName(snap, userId)}
		/>
	{/if}
</div>
