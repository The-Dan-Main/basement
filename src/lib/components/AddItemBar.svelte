<script lang="ts">
	import { catalogCategory, normalizeItemName, stapleCatalog, suggestCatalog } from '$lib/catalog';
	import CategorySelect from '$lib/components/CategorySelect.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { btnPrimary, fieldClass } from '$lib/ui';
	import type { ItemCatalog, ListItem } from '$lib/types/app';

	let {
		catalog,
		householdId,
		existing,
		onadd
	}: {
		catalog: ItemCatalog[];
		householdId: string;
		existing: ListItem[];
		onadd: (input: { name: string; quantity: string; note: string; category: string }) => void;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
	let name = $state('');
	let quantity = $state('');
	let note = $state('');
	let category = $state('');
	let open = $state(false);
	let picked = $state(false);

	const householdCatalog = $derived(catalog.filter((item) => item.household_id === householdId));
	const suggestions = $derived(suggestCatalog(householdCatalog, name));
	const openNames = $derived(
		existing.filter((item) => !item.checked).map((item) => normalizeItemName(item.name))
	);
	const staples = $derived(stapleCatalog(householdCatalog, openNames));
	const duplicate = $derived(Boolean(name.trim()) && openNames.includes(normalizeItemName(name)));

	function submit() {
		const trimmed = name.trim();
		if (!trimmed) return;
		onadd({
			name: trimmed,
			quantity: quantity.trim(),
			note: note.trim(),
			category: category || catalogCategory(householdCatalog, householdId, trimmed)
		});
		name = '';
		quantity = '';
		note = '';
		category = '';
		open = false;
		picked = false;
	}

	function pick(item: ItemCatalog) {
		name = item.display_name;
		category = item.category || category;
		open = false;
		picked = true;
	}

	function addStaple(item: ItemCatalog) {
		onadd({
			name: item.display_name,
			quantity: '',
			note: '',
			category: item.category || ''
		});
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
			oninput={() => {
				open = true;
				picked = false;
			}}
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
	{#if duplicate}
		<p class="text-sm text-gold">{t.items.duplicate}</p>
	{/if}
	<div class="grid grid-cols-[7rem_1fr] gap-2 sm:grid-cols-[7rem_1fr_10rem_auto]">
		<input class={fieldClass} placeholder={t.items.qty} bind:value={quantity} />
		<input class={fieldClass} placeholder={t.items.note} bind:value={note} />
		<div class="col-span-2 sm:col-span-1">
			<CategorySelect bind:value={category} />
		</div>
		<button class={[btnPrimary, 'col-span-2 sm:col-span-1']} type="submit">{t.items.add}</button>
	</div>
	{#if !name.trim() && !picked && staples.length > 0}
		<div class="space-y-2">
			<p class="text-xs tracking-[0.16em] text-fog uppercase">{t.items.staples}</p>
			<div class="flex flex-wrap gap-2">
				{#each staples as item (item.id)}
					<button
						class="rounded-full border border-line bg-ink-soft px-3 py-1.5 text-sm hover:border-gold/50"
						type="button"
						onclick={() => addStaple(item)}
					>
						{item.display_name}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</form>
