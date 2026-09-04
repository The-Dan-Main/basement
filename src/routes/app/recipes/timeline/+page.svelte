<script lang="ts">
	import { resolve } from '$app/paths';
	import RecipeSubnav from '$lib/components/RecipeSubnav.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { dayKey, formatDay } from '$lib/i18n/locales';
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
	const groups = $derived.by(() => {
		const rows: { day: string; items: typeof events }[] = [];
		for (const event of events) {
			const key = dayKey(event.at);
			const last = rows.at(-1);
			if (last && last.day === key) last.items.push(event);
			else rows.push({ day: key, items: [event] });
		}
		return rows;
	});
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
		<ol class="space-y-8">
			{#each groups as group (group.day)}
				<li class="space-y-3">
					<h2 class="text-xs tracking-[0.16em] text-fog uppercase">{formatDay(group.items[0]?.at ?? group.day, i18n.locale)}</h2>
					<ol class="space-y-3">
						{#each group.items as event (event.id)}
							{@const recipe = snap.recipes.find((row) => row.id === event.recipe_id)}
							<li class={[panelClass, 'flex gap-4 overflow-hidden']}>
								{#if recipe?.image_url}
									<img src={recipe.image_url} alt="" class="h-24 w-24 shrink-0 object-cover" />
								{:else}
									<div class="grid h-24 w-24 shrink-0 place-items-center bg-ink-soft text-2xl" aria-hidden="true">
										{event.kind === 'cooked' ? '🍽️' : '📥'}
									</div>
								{/if}
								<div class="min-w-0 flex-1 py-4 pr-4">
									<p class="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
										{event.kind === 'cooked' ? t.recipes.eventCooked : t.recipes.eventAdded}
									</p>
									{#if recipe}
										<a
											class="mt-1 block truncate text-lg font-semibold"
											href={resolve(`/app/recipes/${recipe.id}`)}>{recipe.title}</a
										>
									{:else}
										<p class="mt-1 text-lg font-semibold">{t.recipes.missing}</p>
									{/if}
									<p class="mt-1 text-sm text-fog">
										{#if memberName(snap, event.user_id)}{memberName(snap, event.user_id)}{/if}
									</p>
									{#if event.rating}
										<div class="mt-2">
											<StarRating value={event.rating} readonly />
										</div>
									{/if}
									{#if event.note}
										<p class="mt-2 text-fog">{event.note}</p>
									{/if}
								</div>
							</li>
						{/each}
					</ol>
				</li>
			{/each}
		</ol>
	{/if}
</div>
