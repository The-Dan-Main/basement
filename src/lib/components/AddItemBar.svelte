<script lang="ts">
	import { suggestCatalog } from '$lib/catalog';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { btnPrimary, fieldClass } from '$lib/ui';
	import type { ItemCatalog } from '$lib/types/app';

	let {
		catalog,
		householdId,
		onadd
	}: {
		catalog: ItemCatalog[];
		householdId: string;
		onadd: (input: { name: string; quantity: string; note: string }) => void;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
	let name = $state('');
	let quantity = $state('');
	let note = $state('');
	let open = $state(false);

	const suggestions = $derived(
		householdId
			? suggestCatalog(
					catalog.filter((item) => item.household_id === householdId),
					name
				)
			: []
	);

	function submit() {
		const trimmed = name.trim();
		if (!trimmed) return;
		onadd({ name: trimmed, quantity: quantity.trim(), note: note.trim() });
		name = '';
		quantity = '';
		note = '';
		open = false;
	}

	function pick(item: ItemCatalog) {
		name = item.display_name;
		open = false;
	}
</script>

<form
	class="space-y-3"
	onsubmit={(event) => {
		event.preventDefault();
		submit();
	}}
>
	<div class="relative">
		<input
			class={[fieldClass, 'text-base']}
			placeholder={t.items.placeholder}
			bind:value={name}
			autocomplete="off"
			onfocus={() => (open = true)}
			oninput={() => (open = true)}
		/>
		{#if open && suggestions.length > 0}
			<ul
				class="absolute inset-x-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-2xl border border-line bg-ink-soft shadow-2xl"
			>
				{#each suggestions as item (item.id)}
					<li>
						<button
							class="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-white/5"
							type="button"
							onclick={() => pick(item)}
						>
							<span>{item.display_name}</span>
							<span class="text-xs text-fog">{item.use_count}×</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	<div class="grid grid-cols-[7rem_1fr_auto] gap-2">
		<input class={fieldClass} placeholder={t.items.qty} bind:value={quantity} />
		<input class={fieldClass} placeholder={t.items.note} bind:value={note} />
		<button class={btnPrimary} type="submit">{t.items.add}</button>
	</div>
</form>
