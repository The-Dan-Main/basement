<script lang="ts">
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';

	let {
		value = $bindable(2),
		min = 1,
		max = 99
	}: {
		value?: number;
		min?: number;
		max?: number;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);

	function set(next: number) {
		value = Math.min(max, Math.max(min, Math.round(next)));
	}
</script>

<div class="inline-flex items-center gap-2 rounded-full border border-line bg-ink-soft px-2 py-1">
	<button
		class="grid h-9 w-9 place-items-center rounded-full text-lg font-semibold text-paper hover:bg-white/5"
		type="button"
		aria-label="-"
		onclick={() => set(value - 1)}
	>
		−
	</button>
	<span class="min-w-24 text-center text-sm font-semibold"
		>{fill(t.recipes.people, { count: value })}</span
	>
	<button
		class="grid h-9 w-9 place-items-center rounded-full text-lg font-semibold text-paper hover:bg-white/5"
		type="button"
		aria-label="+"
		onclick={() => set(value + 1)}
	>
		+
	</button>
</div>
