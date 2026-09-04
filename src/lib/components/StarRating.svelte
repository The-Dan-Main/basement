<script lang="ts">
	import { fill } from '$lib/i18n/locales';
	import { getI18n } from '$lib/i18n/i18n.svelte';

	let {
		value = $bindable(0),
		readonly = false,
		onchange
	}: {
		value?: number;
		readonly?: boolean;
		onchange?: (value: number) => void;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
</script>

<div
	class="flex items-center gap-1.5"
	role={readonly ? 'img' : 'radiogroup'}
	aria-label={t.recipes.rating}
>
	{#each [1, 2, 3, 4, 5] as star (star)}
		<button
			class={[
				'grid size-11 place-items-center rounded-full text-2xl leading-none sm:size-[3.375rem] sm:text-[1.875rem]',
				star <= value ? 'text-gold' : 'text-line',
				readonly ? 'cursor-default' : 'hover:bg-white/5'
			]}
			type="button"
			disabled={readonly}
			aria-pressed={star <= value}
			aria-label={fill(t.recipes.stars, { count: star })}
			onclick={() => {
				if (readonly) return;
				value = value === star ? 0 : star;
				onchange?.(value);
			}}
		>
			★
		</button>
	{/each}
</div>
