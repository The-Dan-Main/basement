<script lang="ts">
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { formatQuantity } from '$lib/recipes';
	import { btnPrimary, panelClass } from '$lib/ui';
	import type { AiRecipeDraft } from '$lib/ai-recipe';

	let {
		draft,
		ready = false,
		actionLabel = '',
		busy = false,
		onaction
	}: {
		draft: AiRecipeDraft;
		ready?: boolean;
		actionLabel?: string;
		busy?: boolean;
		onaction?: () => void;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
</script>

<section class={[panelClass, 'space-y-3 p-5']}>
	<div>
		<p class="text-xs tracking-[0.16em] text-fog uppercase">{t.recipes.chatDraftTitle}</p>
		<h3 class="mt-1 text-xl font-semibold">{draft.title}</h3>
		<p class="mt-1 text-sm text-fog">
			{fill(t.recipes.people, { count: draft.servings })}
			· {fill(t.recipes.cookbookRecipes, { count: draft.ingredients.length })}
		</p>
	</div>
	{#if draft.description}
		<p class="text-sm leading-6 text-fog">{draft.description}</p>
	{/if}
	{#if draft.ingredients.length}
		<ul class="space-y-1 text-sm">
			{#each draft.ingredients as row, index (`${index}-${row.name}`)}
				<li>
					<span class="text-fog">{formatQuantity(row.amount, row.unit)}</span>
					{row.name}
					{#if row.note}
						<span class="text-fog">· {row.note}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	{#if draft.steps.length}
		<ol class="list-decimal space-y-1 pl-5 text-sm leading-6">
			{#each draft.steps as step, index (index)}
				<li>{step.instruction}</li>
			{/each}
		</ol>
	{/if}
	{#if ready}
		<p class="text-sm text-mint">{t.recipes.chatReady}</p>
	{/if}
	{#if onaction && actionLabel}
		<button class={btnPrimary} disabled={busy} type="button" onclick={onaction}>
			{actionLabel}
		</button>
	{/if}
</section>
