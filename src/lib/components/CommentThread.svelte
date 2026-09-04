<script lang="ts">
	import { formatDay } from '$lib/i18n/locales';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { btnGhost, fieldClass } from '$lib/ui';

	let {
		comments,
		userId,
		submitting = false,
		onsubmit,
		ondelete
	}: {
		comments: { id: string; user_id: string; body: string; created_at: string; author: string }[];
		userId: string;
		submitting?: boolean;
		onsubmit: (body: string) => void;
		ondelete: (id: string) => void;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
	let body = $state('');
</script>

<section class="space-y-3">
	<h2 class="text-lg font-semibold">{t.recipes.comments}</h2>
	<form
		class="space-y-2"
		onsubmit={(event) => {
			event.preventDefault();
			const next = body.trim();
			if (!next) return;
			onsubmit(next);
			body = '';
		}}
	>
		<textarea
			class={[fieldClass, 'min-h-24']}
			bind:value={body}
			placeholder={t.recipes.commentPlaceholder}></textarea>
		<button class={btnGhost} disabled={submitting || !body.trim()} type="submit">
			{t.recipes.commentAdd}
		</button>
	</form>
	{#if comments.length === 0}
		<p class="text-sm text-fog">{t.recipes.commentEmpty}</p>
	{:else}
		<ul class="space-y-2">
			{#each comments as comment (comment.id)}
				<li class="rounded-2xl border border-line bg-panel p-4">
					<div class="flex items-start justify-between gap-3">
						<p class="text-sm font-semibold">{comment.author}</p>
						<p class="text-xs text-fog">{formatDay(comment.created_at, i18n.locale)}</p>
					</div>
					<p class="mt-2 leading-6">{comment.body}</p>
					{#if comment.user_id === userId}
						<button
							class="mt-2 text-sm font-semibold text-coral"
							type="button"
							onclick={() => ondelete(comment.id)}
						>
							{t.recipes.commentDelete}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
