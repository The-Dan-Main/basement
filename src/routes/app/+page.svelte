<script lang="ts">
	import { resolve } from '$app/paths';
	import EmojiPicker from '$lib/components/EmojiPicker.svelte';
	import GripHandle from '$lib/components/GripHandle.svelte';
	import SortableList from '$lib/components/SortableList.svelte';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { listSummaries, persistListCreate, persistListsReorder } from '$lib/offline/sync';
	import { nextFrontSortOrder, orderPatches } from '$lib/sort';
	import { btnPrimary, fieldClass, panelClass } from '$lib/ui';
	import type { ListSummary, ShoppingList } from '$lib/types/app';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	let name = $state('');
	let emoji = $state('🛒');
	let creating = $state(false);

	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const lists = $derived(listSummaries(snap));
	const defaultHousehold = $derived(snap.households[0] ?? null);

	async function createList() {
		const trimmed = name.trim();
		if (!trimmed || !data.supabase || !data.user || !defaultHousehold) return;
		creating = true;
		const now = nowIso();
		const list: ShoppingList = {
			id: crypto.randomUUID(),
			household_id: defaultHousehold.id,
			name: trimmed,
			emoji,
			sort_order: nextFrontSortOrder(lists.map((row) => row.sort_order)),
			archived_at: null,
			created_by: data.user.id,
			created_at: now,
			updated_at: now
		};
		await persistListCreate(data.supabase, data.user.id, list);
		name = '';
		creating = false;
	}

	async function reorderLists(ordered: ListSummary[]) {
		if (!data.supabase || !data.user) return;
		await persistListsReorder(data.supabase, data.user.id, orderPatches(ordered));
	}
</script>

<svelte:head><title>{t.lists.title}</title></svelte:head>

<div class="space-y-8">
	<section class="space-y-3">
		<p class="text-sm text-fog">{fill(t.lists.hi, { name: data.profile.display_name })}</p>
		<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{t.lists.heading}</h1>
		{#if defaultHousehold}
			<form
				class="flex flex-col gap-3 sm:flex-row"
				onsubmit={(event) => {
					event.preventDefault();
					void createList();
				}}
			>
				<input
					class={[fieldClass, 'sm:flex-1']}
					placeholder={t.lists.placeholder}
					bind:value={name}
					maxlength="80"
				/>
				<button class={btnPrimary} disabled={creating || !name.trim()} type="submit">
					{creating ? t.lists.adding : t.lists.add}
				</button>
			</form>
			<EmojiPicker bind:value={emoji} />
		{/if}
	</section>

	{#if lists.length === 0}
		<section class={[panelClass, 'p-6']}>
			<p class="font-semibold">{t.lists.emptyTitle}</p>
			<p class="mt-2 text-sm text-fog">{t.lists.emptyBody}</p>
		</section>
	{:else}
		<SortableList items={lists} getId={(list) => list.id} group="lists" onreorder={reorderLists}>
			{#snippet children(list, { dragging })}
				<div
					class={[
						panelClass,
						'flex items-stretch overflow-hidden transition',
						dragging ? 'border-gold/50' : 'hover:border-gold/40'
					]}
				>
					{#if lists.length > 1}
						<GripHandle label={fill(t.lists.drag, { name: list.name })} />
					{/if}
					<a class="block min-w-0 flex-1 p-5" href={resolve(`/app/lists/${list.id}`)}>
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs tracking-[0.18em] text-fog uppercase">{list.household_name}</p>
								<h2 class="mt-2 text-xl font-semibold">
									{#if list.emoji}<span class="mr-1">{list.emoji}</span>{/if}{list.name}
								</h2>
							</div>
							<span class="rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
								{list.unchecked}
							</span>
						</div>
						<p class="mt-3 text-sm text-fog">
							{fill(t.lists.left, { unchecked: list.unchecked, total: list.total })}
						</p>
					</a>
				</div>
			{/snippet}
		</SortableList>
	{/if}
</div>
