<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AddItemBar from '$lib/components/AddItemBar.svelte';
	import ItemRow from '$lib/components/ItemRow.svelte';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import {
		applyRemoteItem,
		applyRemoteList,
		itemsForList,
		outboxAllPendingIds,
		persistItemAdd,
		persistItemDelete,
		persistItemToggle,
		persistItemUpdate,
		persistListDelete,
		persistListUpdate,
		writeSnapshot
	} from '$lib/offline/sync';
	import { btnGhost, btnQuiet, fieldClass } from '$lib/ui';
	import type { ListItem } from '$lib/types/app';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	let renaming = $state(false);
	let listName = $state('');
	let showChecked = $state(false);

	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const list = $derived(snap.lists.find((row) => row.id === data.listId));
	const grouped = $derived(list ? itemsForList(snap, list.id) : { unchecked: [], checked: [] });

	function startRename() {
		listName = list?.name ?? '';
		renaming = true;
	}

	$effect(() => {
		const supabase = data.supabase;
		const userId = data.user?.id;
		const listId = data.listId;
		if (!supabase || !userId || !listId) return;

		const channel = supabase
			.channel(`list:${listId}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'list_items', filter: `list_id=eq.${listId}` },
				(payload) => {
					void (async () => {
						const current = resolveSnapshot(data.snap);
						if (!current) return;
						const blocked = await outboxAllPendingIds();
						const row = (payload.new ?? payload.old) as ListItem | null;
						const next = applyRemoteItem(current, row, payload.eventType, blocked);
						await writeSnapshot(next);
					})();
				}
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'lists', filter: `id=eq.${listId}` },
				(payload) => {
					void (async () => {
						const current = resolveSnapshot(data.snap);
						if (!current) return;
						const row = (payload.new ?? payload.old) as typeof list;
						const next = applyRemoteList(current, row ?? null, payload.eventType);
						await writeSnapshot(next);
					})();
				}
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	});

	async function addItem(input: { name: string; quantity: string; note: string }) {
		if (!data.supabase || !data.user || !list) return;
		const now = nowIso();
		const item: ListItem = {
			id: crypto.randomUUID(),
			list_id: list.id,
			name: input.name,
			quantity: input.quantity,
			note: input.note,
			checked: false,
			checked_at: null,
			sort_order: 0,
			created_by: data.user.id,
			created_at: now,
			updated_at: now
		};
		await persistItemAdd(data.supabase, data.user.id, item, list.household_id);
	}

	async function rename() {
		if (!data.supabase || !data.user || !list) return;
		const trimmed = listName.trim();
		if (!trimmed) return;
		await persistListUpdate(data.supabase, data.user.id, list.id, { name: trimmed });
		renaming = false;
	}

	async function removeList() {
		if (!data.supabase || !data.user || !list) return;
		if (!confirm(fill(t.list.deleteConfirm, { name: list.name }))) return;
		await persistListDelete(data.supabase, data.user.id, list.id);
		await goto(resolve('/app'));
	}
</script>

<svelte:head><title>{fill(t.list.title, { name: list?.name ?? '' })}</title></svelte:head>

{#if !list}
	<p class="text-fog">{t.list.missing}</p>
{:else}
	<div class="space-y-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
				<a class="text-sm text-gold" href={resolve('/app')}>{t.list.all}</a>
				{#if renaming}
					<form
						class="mt-3 flex gap-2"
						onsubmit={(event) => {
							event.preventDefault();
							void rename();
						}}
					>
						<input class={fieldClass} bind:value={listName} />
						<button class="text-sm font-semibold text-gold" type="submit">{t.list.save}</button>
					</form>
				{:else}
					<h1 class="mt-2 text-3xl font-semibold tracking-tight">{list.name}</h1>
				{/if}
			</div>
			<div class="flex gap-2">
				<button
					class={btnGhost}
					type="button"
					onclick={() => (renaming ? (renaming = false) : startRename())}>{t.list.rename}</button
				>
				<button class={btnQuiet} type="button" onclick={() => void removeList()}
					>{t.list.delete}</button
				>
			</div>
		</div>

		<AddItemBar
			catalog={snap.catalog}
			householdId={list.household_id}
			onadd={(input) => void addItem(input)}
		/>

		<section class="space-y-3">
			{#if grouped.unchecked.length === 0}
				<p class="rounded-3xl border border-line bg-panel p-5 text-fog">{t.list.empty}</p>
			{:else}
				{#each grouped.unchecked as item (item.id)}
					<ItemRow
						{item}
						ontoggle={() =>
							data.supabase &&
							data.user &&
							persistItemToggle(data.supabase, data.user.id, item.id, !item.checked)}
						ondelete={() =>
							data.supabase && data.user && persistItemDelete(data.supabase, data.user.id, item.id)}
						onsave={(patch) =>
							data.supabase &&
							data.user &&
							persistItemUpdate(data.supabase, data.user.id, item.id, patch)}
					/>
				{/each}
			{/if}
		</section>

		{#if grouped.checked.length > 0}
			<button
				class="text-sm font-semibold text-fog"
				type="button"
				onclick={() => (showChecked = !showChecked)}
			>
				{fill(showChecked ? t.list.hideChecked : t.list.showChecked, {
					count: grouped.checked.length
				})}
			</button>
			{#if showChecked}
				<section class="space-y-3">
					{#each grouped.checked as item (item.id)}
						<ItemRow
							{item}
							ontoggle={() =>
								data.supabase &&
								data.user &&
								persistItemToggle(data.supabase, data.user.id, item.id, !item.checked)}
							ondelete={() =>
								data.supabase &&
								data.user &&
								persistItemDelete(data.supabase, data.user.id, item.id)}
							onsave={(patch) =>
								data.supabase &&
								data.user &&
								persistItemUpdate(data.supabase, data.user.id, item.id, patch)}
						/>
					{/each}
				</section>
			{/if}
		{/if}
	</div>
{/if}
