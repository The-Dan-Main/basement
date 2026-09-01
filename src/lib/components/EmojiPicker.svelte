<script lang="ts">
	import { LIST_EMOJIS } from '$lib/categories';
	import { getI18n } from '$lib/i18n/i18n.svelte';

	let {
		value = $bindable(''),
		label
	}: {
		value?: string;
		label?: string;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
</script>

<div class="space-y-2">
	<p class="text-xs font-medium text-fog">{label ?? t.lists.emoji}</p>
	<div class="flex flex-wrap gap-1.5">
		<button
			class={[
				'grid h-10 w-10 place-items-center rounded-2xl border text-lg',
				value === '' ? 'border-gold bg-gold/15' : 'border-line bg-ink-soft hover:border-gold/40'
			]}
			type="button"
			aria-pressed={value === ''}
			onclick={() => (value = '')}
		>
			<span class="text-xs text-fog">∅</span>
		</button>
		{#each LIST_EMOJIS as emoji (emoji)}
			<button
				class={[
					'grid h-10 w-10 place-items-center rounded-2xl border text-lg',
					value === emoji
						? 'border-gold bg-gold/15'
						: 'border-line bg-ink-soft hover:border-gold/40'
				]}
				type="button"
				aria-pressed={value === emoji}
				onclick={() => (value = value === emoji ? '' : emoji)}
			>
				{emoji}
			</button>
		{/each}
	</div>
</div>
