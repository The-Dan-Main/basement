<script lang="ts">
	import { resolve } from '$app/paths';
	import StarRating from '$lib/components/StarRating.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill, formatCompactDay } from '$lib/i18n/locales';
	import type { RecipeFeedItem } from '$lib/offline/sync';
	import type { Recipe } from '$lib/types/app';
	import { panelClass } from '$lib/ui';

	let {
		events,
		recipes,
		nameFor
	}: {
		events: RecipeFeedItem[];
		recipes: Recipe[];
		nameFor: (userId: string) => string;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);

	function recipeOf(id: string) {
		return recipes.find((row) => row.id === id);
	}

	function initials(name: string) {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
	}

	function status(event: RecipeFeedItem) {
		if (event.kind === 'cooked') {
			return fill(t.recipes.cookedBy, { name: nameFor(event.user_id) || t.recipes.someone });
		}
		return t.recipes.recipeCreated;
	}
</script>

<ol class="recipe-timeline relative m-0 list-none p-0">
	{#each events as event, index (event.id)}
		{@const recipe = recipeOf(event.recipe_id)}
		{@const cooked = event.kind === 'cooked'}
		{@const even = index % 2 === 0}
		{@const who = nameFor(event.user_id) || t.recipes.someone}
		<li
			class={[
				'timeline-item relative grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 pb-10',
				'md:grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)]'
			]}
		>
			<div
				class="relative col-start-1 row-span-2 row-start-1 flex justify-center md:col-start-2 md:row-span-1"
			>
				<span
					class="relative z-10 mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-gold text-ink shadow-[0_0_0_4px_var(--color-ink)]"
					aria-hidden="true"
				>
					{#if cooked}
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm-2 12H6v-2h12v2Zm0-3H6V9h12v2Zm0-3H6V6h12v2Z"
							/>
						</svg>
					{:else}
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
							<path
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 5v14M5 12h14"
							/>
						</svg>
					{/if}
				</span>
			</div>

			<time
				class={[
					'col-start-2 row-start-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-ink-soft px-2.5 py-1 text-xs text-fog ring-1 ring-line',
					even ? 'md:col-start-1 md:ml-auto' : 'md:col-start-3'
				]}
				datetime={event.at}
			>
				<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.8"
						d="M8 3v3m8-3v3M4.5 9h15M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z"
					/>
				</svg>
				{formatCompactDay(event.at, i18n.locale)}
			</time>

			<article
				class={[
					panelClass,
					'col-start-2 row-start-2 min-w-0 overflow-hidden shadow-lg md:row-start-1 md:max-w-md',
					even ? 'md:col-start-3' : 'md:col-start-1 md:justify-self-end'
				]}
			>
				<header class="flex items-center gap-3 px-4 pt-4">
					<span
						class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/20 text-xs font-semibold tracking-wide text-gold"
						aria-hidden="true">{initials(who)}</span
					>
					<p class="min-w-0 text-sm font-medium">{status(event)}</p>
				</header>
				<div class="space-y-3 p-4">
					<div class="flex gap-3">
						{#if recipe?.image_url}
							<img
								src={recipe.image_url}
								alt=""
								class="h-20 w-20 shrink-0 rounded-xl object-cover"
							/>
						{:else}
							<div
								class="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-ink-soft text-2xl"
								aria-hidden="true"
							>
								{cooked ? '🍽️' : '📥'}
							</div>
						{/if}
						<div class="min-w-0 flex-1">
							{#if recipe}
								<a
									class="block truncate text-base font-semibold hover:text-gold"
									href={resolve(`/app/recipes/${recipe.id}`)}>{recipe.title}</a
								>
								{#if recipe.description}
									<p class="mt-1 line-clamp-2 text-sm text-fog">{recipe.description}</p>
								{/if}
							{:else}
								<p class="text-base font-semibold">{t.recipes.missing}</p>
							{/if}
						</div>
					</div>
					{#if event.rating}
						<div class="-ml-1 max-w-full overflow-hidden">
							<StarRating value={event.rating} readonly />
						</div>
					{/if}
				</div>
				{#if event.note}
					<p class="border-t border-line px-4 py-3 text-sm text-fog">{event.note}</p>
				{/if}
			</article>
		</li>
	{/each}
</ol>

<style>
	.recipe-timeline::before {
		content: '';
		position: absolute;
		top: 0.7rem;
		bottom: 2.2rem;
		left: 1.3rem;
		width: 2px;
		background: color-mix(in srgb, var(--color-paper) 16%, transparent);
	}

	@media (min-width: 768px) {
		.recipe-timeline::before {
			left: 50%;
			transform: translateX(-50%);
		}
	}
</style>
