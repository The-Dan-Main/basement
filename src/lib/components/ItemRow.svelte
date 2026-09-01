<script lang="ts">
	import CategorySelect from '$lib/components/CategorySelect.svelte';
	import { categoryLabel } from '$lib/categories';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { fieldClass } from '$lib/ui';
	import type { ListItem } from '$lib/types/app';

	let {
		item,
		addedBy,
		checkedBy,
		ontoggle,
		ondelete,
		onsave
	}: {
		item: ListItem;
		addedBy: string;
		checkedBy: string;
		ontoggle: () => void;
		ondelete: () => void;
		onsave: (patch: { name: string; quantity: string; note: string; category: string }) => void;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
	let editing = $state(false);
	let name = $state('');
	let quantity = $state('');
	let note = $state('');
	let category = $state('');

	function startEdit() {
		name = item.name;
		quantity = item.quantity;
		note = item.note;
		category = item.category ?? '';
		editing = true;
	}

	function save() {
		const trimmed = name.trim();
		if (!trimmed) return;
		onsave({
			name: trimmed,
			quantity: quantity.trim(),
			note: note.trim(),
			category
		});
		editing = false;
	}
</script>

<article class="rounded-3xl border border-line bg-panel">
	<div class="flex items-stretch">
		<button
			class="grid w-16 shrink-0 place-items-center text-gold"
			type="button"
			onclick={ontoggle}
			aria-pressed={item.checked}
			aria-label={fill(item.checked ? t.items.uncheck : t.items.check, { name: item.name })}
		>
			<span
				class={[
					'grid h-8 w-8 place-items-center rounded-full border-2',
					item.checked ? 'border-mint bg-mint text-ink' : 'border-gold/50'
				]}
			>
				{#if item.checked}
					<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path
							d="M3.5 8.2 6.4 11l6.1-7"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{/if}
			</span>
		</button>
		<div class="min-w-0 flex-1 py-4 pr-3">
			{#if editing}
				<div class="space-y-2">
					<input class={fieldClass} bind:value={name} />
					<div class="grid grid-cols-2 gap-2">
						<input class={fieldClass} bind:value={quantity} placeholder={t.items.qty} />
						<input class={fieldClass} bind:value={note} placeholder={t.items.note} />
					</div>
					<CategorySelect bind:value={category} />
					<div class="flex gap-2">
						<button class="text-sm font-semibold text-gold" type="button" onclick={save}
							>{t.items.save}</button
						>
						<button class="text-sm text-fog" type="button" onclick={() => (editing = false)}
							>{t.items.cancel}</button
						>
					</div>
				</div>
			{:else}
				<p class={['text-lg font-semibold', item.checked && 'text-fog line-through']}>
					{item.name}
				</p>
				{#if item.quantity || item.note || item.category}
					<p class="mt-1 text-sm text-fog">
						{[
							item.quantity,
							item.note,
							item.category ? categoryLabel(t.categories, item.category) : ''
						]
							.filter(Boolean)
							.join(' · ')}
					</p>
				{/if}
				{#if addedBy || (item.checked && checkedBy)}
					<p class="mt-1 text-xs text-fog/80">
						{[
							addedBy ? fill(t.list.addedBy, { name: addedBy }) : '',
							item.checked && checkedBy ? fill(t.list.checkedBy, { name: checkedBy }) : ''
						]
							.filter(Boolean)
							.join(' · ')}
					</p>
				{/if}
				<div class="mt-3 flex gap-3 text-sm">
					<button class="text-gold" type="button" onclick={startEdit}>{t.items.edit}</button>
					<button class="text-coral" type="button" onclick={ondelete}>{t.items.delete}</button>
				</div>
			{/if}
		</div>
	</div>
</article>
