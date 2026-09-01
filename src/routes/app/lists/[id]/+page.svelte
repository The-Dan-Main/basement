<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AddItemBar from '$lib/components/AddItemBar.svelte';
	import EmojiPicker from '$lib/components/EmojiPicker.svelte';
	import ItemRow from '$lib/components/ItemRow.svelte';
	import SortableList from '$lib/components/SortableList.svelte';
	import { categoryLabel, groupItemsByCategory } from '$lib/categories';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import {
		applyRemoteItem,
		applyRemoteList,
		itemsForList,
		matchesQuery,
		memberName,
		outboxAllPendingIds,
		persistItemAdd,
		persistItemDelete,
		persistItemsDelete,
		persistItemsReorder,
		persistItemToggle,
		persistItemUpdate,
		persistListDelete,
		persistListUpdate,
		writeSnapshot
	} from '$lib/offline/sync';
	import { formatListShare, shareOrCopy } from '$lib/share';
	import {
		groupOrderPatches,
		nextFrontSortOrder,
		sortableGroupKey,
		transferToGroup,
		type OrderGroup
	} from '$lib/sort';
	import { btnGhost, btnQuiet, fieldClass } from '$lib/ui';
	import type { ListItem } from '$lib/types/app';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	let renaming = $state(false);
	let listName = $state('');
	let listEmoji = $state('');
	let showChecked = $state(false);
	let query = $state('');
	let shareState = $state<'idle' | 'copied' | 'shared'>('idle');

	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const list = $derived(snap.lists.find((row) => row.id === data.listId));
	const grouped = $derived(
		list ? itemsForList(snap, list.id) : { items: [], unchecked: [], checked: [] }
	);
	const visibleUnchecked = $derived(grouped.unchecked.filter((item) => matchesQuery(item, query)));
	const visibleChecked = $derived(grouped.checked.filter((item) => matchesQuery(item, query)));
	const aisleGroups = $derived(groupItemsByCategory(visibleUnchecked));
	const showCheckedSection = $derived(
		showChecked || Boolean(query.trim() && visibleChecked.length > 0)
	);

	function startRename() {
		listName = list?.name ?? '';
		listEmoji = list?.emoji ?? '';
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

	async function addItem(input: {
		name: string;
		quantity: string;
		note: string;
		category: string;
	}) {
		if (!data.supabase || !data.user || !list) return;
		const now = nowIso();
		const item: ListItem = {
			id: crypto.randomUUID(),
			list_id: list.id,
			name: input.name,
			quantity: input.quantity,
			note: input.note,
			category: input.category,
			checked: false,
			checked_at: null,
			checked_by: null,
			sort_order: nextFrontSortOrder(
				grouped.unchecked
					.filter((row) => (row.category || '') === (input.category || ''))
					.map((row) => row.sort_order)
			),
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
		await persistListUpdate(data.supabase, data.user.id, list.id, {
			name: trimmed,
			emoji: listEmoji
		});
		renaming = false;
	}

	async function removeList() {
		if (!data.supabase || !data.user || !list) return;
		if (!confirm(fill(t.list.deleteConfirm, { name: list.name }))) return;
		await persistListDelete(data.supabase, data.user.id, list.id);
		await goto(resolve('/app'));
	}

	async function clearChecked() {
		if (!data.supabase || !data.user || !list) return;
		const ids = grouped.checked.map((item) => item.id);
		if (ids.length === 0) return;
		if (!confirm(fill(t.list.clearConfirm, { count: ids.length }))) return;
		await persistItemsDelete(data.supabase, data.user.id, ids);
	}

	async function shareList() {
		if (!list) return;
		try {
			const result = await shareOrCopy(
				list.name,
				formatListShare(list, grouped.items, {
					open: t.list.shareOpen,
					done: t.list.shareDone
				})
			);
			if (result === 'copied' || result === 'shared') {
				shareState = result === 'shared' ? 'shared' : 'copied';
				setTimeout(() => (shareState = 'idle'), 1800);
			}
		} catch {
			shareState = 'idle';
		}
	}

	function actor(userId: string | null | undefined) {
		return memberName(snap, userId);
	}

	function currentGroups(): OrderGroup<ListItem>[] {
		return aisleGroups.map((group) => ({ category: group.category, items: group.items }));
	}

	async function persistGroups(groups: OrderGroup<ListItem>[]) {
		if (!data.supabase || !data.user) return;
		await persistItemsReorder(data.supabase, data.user.id, groupOrderPatches(groups));
	}

	async function reorderGroup(category: string, ordered: ListItem[]) {
		await persistGroups(
			currentGroups().map((group) =>
				group.category === category ? { ...group, items: ordered } : group
			)
		);
	}

	async function transferItem(itemId: string, toCategory: string, index: number) {
		await persistGroups(transferToGroup(currentGroups(), itemId, toCategory, index));
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
						class="mt-3 space-y-3"
						onsubmit={(event) => {
							event.preventDefault();
							void rename();
						}}
					>
						<input class={fieldClass} bind:value={listName} />
						<EmojiPicker bind:value={listEmoji} />
						<button class="text-sm font-semibold text-gold" type="submit">{t.list.save}</button>
					</form>
				{:else}
					<h1 class="mt-2 text-3xl font-semibold tracking-tight">
						{#if list.emoji}<span class="mr-2">{list.emoji}</span>{/if}{list.name}
					</h1>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				<button class={btnGhost} type="button" onclick={() => void shareList()}>
					{shareState === 'copied' || shareState === 'shared' ? t.list.copied : t.list.share}
				</button>
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
			existing={grouped.items}
			onadd={(input) => void addItem(input)}
		/>

		<label class="block">
			<span class="sr-only">{t.list.search}</span>
			<input class={fieldClass} placeholder={t.list.search} bind:value={query} />
		</label>

		<section class="space-y-5">
			{#if visibleUnchecked.length === 0}
				<p class="rounded-3xl border border-line bg-panel p-5 text-fog">
					{query.trim() ? fill(t.list.emptySearch, { query: query.trim() }) : t.list.empty}
				</p>
			{:else}
				{#each aisleGroups as group (group.category || 'none')}
					<SortableList
						items={group.items}
						getId={(item) => item.id}
						group={sortableGroupKey(group.category)}
						disabled={Boolean(query.trim())}
						onreorder={(ordered) => void reorderGroup(group.category, ordered)}
						ontransfer={(itemId, toCategory, index) => void transferItem(itemId, toCategory, index)}
					>
						{#snippet lead()}
							{#if group.category || aisleGroups.length > 1}
								<p class="text-xs tracking-[0.18em] text-fog uppercase">
									{categoryLabel(t.categories, group.category)}
								</p>
							{/if}
						{/snippet}
						{#snippet children(item, { dragging })}
							<ItemRow
								{item}
								{dragging}
								sortable={!query.trim()}
								addedBy={actor(item.created_by)}
								checkedBy={actor(item.checked_by)}
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
						{/snippet}
					</SortableList>
				{/each}
			{/if}
		</section>

		{#if grouped.checked.length > 0}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<button
					class="text-sm font-semibold text-fog"
					type="button"
					onclick={() => (showChecked = !showChecked)}
				>
					{fill(showCheckedSection ? t.list.hideChecked : t.list.showChecked, {
						count: grouped.checked.length
					})}
				</button>
				<button
					class="text-sm font-semibold text-coral"
					type="button"
					onclick={() => void clearChecked()}
				>
					{t.list.clearChecked}
				</button>
			</div>
			{#if showCheckedSection}
				<section class="space-y-3">
					{#each visibleChecked as item (item.id)}
						<ItemRow
							{item}
							addedBy={actor(item.created_by)}
							checkedBy={actor(item.checked_by)}
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
