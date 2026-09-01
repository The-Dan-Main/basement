<script lang="ts">
	import { CATEGORY_IDS, categoryLabel } from '$lib/categories';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fieldClass } from '$lib/ui';

	let {
		value = $bindable(''),
		id = 'category'
	}: {
		value?: string;
		id?: string;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
</script>

<select class={fieldClass} {id} bind:value aria-label={t.items.aisle}>
	<option value="">{t.categories.none}</option>
	{#each CATEGORY_IDS as category (category)}
		<option value={category}>{categoryLabel(t.categories, category)}</option>
	{/each}
</select>
