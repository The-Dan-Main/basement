import { browser } from '$app/environment';
import { bumpCatalog, normalizeItemName } from '$lib/catalog';
import { fetchAllRows, nowIso } from '$lib/data';
import { kvGet, kvSet, outboxAdd, outboxAll, outboxCount, outboxDelete } from '$lib/offline/db';
import { publishProfile, publishSnapshot } from '$lib/offline/live.svelte';
import { isOnline, setOfflineStatus } from '$lib/offline/status';
import type { BasementClient } from '$lib/supabase/client';
import type {
	Household,
	HouseholdInvite,
	ItemCatalog,
	ListItem,
	Member,
	Profile,
	ShoppingList
} from '$lib/types/app';

export type OfflineSnapshot = {
	userId: string;
	savedAt: string;
	profile: Profile;
	households: Household[];
	members: Member[];
	invites: HouseholdInvite[];
	lists: ShoppingList[];
	items: ListItem[];
	catalog: ItemCatalog[];
};

export type OutboxPayload =
	| { kind: 'listCreate'; list: ShoppingList }
	| { kind: 'listUpdate'; listId: string; patch: Partial<ShoppingList> }
	| { kind: 'listDelete'; listId: string }
	| { kind: 'itemAdd'; item: ListItem; catalog: ItemCatalog | null }
	| { kind: 'itemUpdate'; itemId: string; patch: Partial<ListItem> }
	| { kind: 'itemToggle'; itemId: string; checked: boolean; checked_at: string | null }
	| { kind: 'itemDelete'; itemId: string }
	| { kind: 'householdUpdate'; householdId: string; patch: Partial<Household> };

const SNAP_KEY = 'snapshot';

export function emptySnapshot(userId: string, profile: Profile): OfflineSnapshot {
	return {
		userId,
		savedAt: nowIso(),
		profile,
		households: [],
		members: [],
		invites: [],
		lists: [],
		items: [],
		catalog: []
	};
}

export async function readSnapshot(userId?: string): Promise<OfflineSnapshot | null> {
	if (!browser) return null;
	const snap = await kvGet<OfflineSnapshot>(SNAP_KEY);
	if (!snap) return null;
	if (userId && snap.userId !== userId) return null;
	return snap;
}

export async function writeSnapshot(snap: OfflineSnapshot): Promise<void> {
	if (!browser) return;
	const next = { ...snap, savedAt: nowIso() };
	await kvSet(SNAP_KEY, next);
	publishSnapshot(next);
	await refreshPending();
}

export async function refreshPending() {
	if (!browser) return;
	setOfflineStatus({
		online: isOnline(),
		pending: await outboxCount(),
		ready: true
	});
}

async function mutateSnapshot(userId: string, update: (snap: OfflineSnapshot) => OfflineSnapshot) {
	const current =
		(await readSnapshot(userId)) ??
		emptySnapshot(userId, {
			id: userId,
			display_name: 'Shopper',
			locale: 'en',
			created_at: nowIso(),
			updated_at: nowIso()
		});
	await writeSnapshot(update(current));
}

export async function outboxAllPendingIds() {
	const pending = await outboxAll<OutboxPayload>();
	return pendingItemIds(pending.map((item) => item.payload));
}

export function pendingItemIds(payloads: OutboxPayload[]) {
	const ids = new Set<string>();
	for (const payload of payloads) {
		if (payload.kind === 'itemAdd') ids.add(payload.item.id);
		if (
			payload.kind === 'itemUpdate' ||
			payload.kind === 'itemToggle' ||
			payload.kind === 'itemDelete'
		) {
			ids.add(payload.itemId);
		}
	}
	return ids;
}

function applyOutbox(snap: OfflineSnapshot, payloads: OutboxPayload[]): OfflineSnapshot {
	let next = snap;
	for (const payload of payloads) {
		if (payload.kind === 'listCreate') {
			next = {
				...next,
				lists: [payload.list, ...next.lists.filter((list) => list.id !== payload.list.id)]
			};
		} else if (payload.kind === 'listUpdate') {
			next = {
				...next,
				lists: next.lists.map((list) =>
					list.id === payload.listId ? { ...list, ...payload.patch } : list
				)
			};
		} else if (payload.kind === 'listDelete') {
			next = {
				...next,
				lists: next.lists.filter((list) => list.id !== payload.listId),
				items: next.items.filter((item) => item.list_id !== payload.listId)
			};
		} else if (payload.kind === 'itemAdd') {
			next = {
				...next,
				items: [payload.item, ...next.items.filter((item) => item.id !== payload.item.id)],
				catalog: payload.catalog
					? [payload.catalog, ...next.catalog.filter((row) => row.id !== payload.catalog?.id)]
					: next.catalog
			};
		} else if (payload.kind === 'itemUpdate') {
			next = {
				...next,
				items: next.items.map((item) =>
					item.id === payload.itemId ? { ...item, ...payload.patch } : item
				)
			};
		} else if (payload.kind === 'itemToggle') {
			next = {
				...next,
				items: next.items.map((item) =>
					item.id === payload.itemId
						? { ...item, checked: payload.checked, checked_at: payload.checked_at }
						: item
				)
			};
		} else if (payload.kind === 'itemDelete') {
			next = { ...next, items: next.items.filter((item) => item.id !== payload.itemId) };
		} else if (payload.kind === 'householdUpdate') {
			next = {
				...next,
				households: next.households.map((household) =>
					household.id === payload.householdId ? { ...household, ...payload.patch } : household
				)
			};
		}
	}
	return next;
}

export async function snapshotWithOutbox(snap: OfflineSnapshot) {
	if (!browser) return snap;
	const pending = await outboxAll<OutboxPayload>();
	return applyOutbox(
		snap,
		pending.map((item) => item.payload)
	);
}

export async function pullSnapshot(
	supabase: BasementClient,
	userId: string,
	profile?: Profile
): Promise<OfflineSnapshot> {
	const [households, memberRows, profileRows, invites, lists, items, catalog, profileRow] =
		await Promise.all([
			fetchAllRows<Household>((from, to) =>
				supabase
					.from('households')
					.select('*')
					.order('created_at', { ascending: true })
					.range(from, to)
			),
			fetchAllRows<{
				household_id: string;
				user_id: string;
				role: Member['role'];
				created_at: string;
			}>((from, to) =>
				supabase
					.from('household_members')
					.select('household_id, user_id, role, created_at')
					.range(from, to)
			),
			fetchAllRows<Profile>((from, to) => supabase.from('profiles').select('*').range(from, to)),
			fetchAllRows<HouseholdInvite>((from, to) =>
				supabase
					.from('household_invites')
					.select('*')
					.is('accepted_at', null)
					.order('created_at', { ascending: false })
					.range(from, to)
			),
			fetchAllRows<ShoppingList>((from, to) =>
				supabase
					.from('lists')
					.select('*')
					.is('archived_at', null)
					.order('sort_order', { ascending: true })
					.range(from, to)
			),
			fetchAllRows<ListItem>((from, to) =>
				supabase
					.from('list_items')
					.select('*')
					.order('sort_order', { ascending: true })
					.range(from, to)
			),
			fetchAllRows<ItemCatalog>((from, to) =>
				supabase
					.from('item_catalog')
					.select('*')
					.order('use_count', { ascending: false })
					.range(from, to)
			),
			supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
		]);

	const names = new Map(profileRows.map((row) => [row.id, row.display_name]));
	const members: Member[] = memberRows.map((row) => ({
		...row,
		display_name: names.get(row.user_id) ?? 'Shopper'
	}));

	const next: OfflineSnapshot = {
		userId,
		savedAt: nowIso(),
		profile: {
			locale: 'en',
			...(profileRow.data ??
				profile ?? {
					id: userId,
					display_name: 'Shopper',
					created_at: nowIso(),
					updated_at: nowIso()
				})
		},
		households,
		members,
		invites,
		lists,
		items,
		catalog
	};
	const merged = await snapshotWithOutbox(next);
	publishProfile(merged.profile);
	await writeSnapshot(merged);
	return merged;
}

async function pushOrQueue(supabase: BasementClient, payload: OutboxPayload) {
	try {
		if (browser && !isOnline()) throw new Error('offline');
		await pushPayload(supabase, payload);
	} catch {
		if (browser) await outboxAdd('mutation', payload);
		else throw new Error('offline');
	}
	await refreshPending();
}

async function pushPayload(supabase: BasementClient, payload: OutboxPayload) {
	if (payload.kind === 'listCreate') {
		const { error } = await supabase.from('lists').insert(payload.list);
		if (error) throw error;
	} else if (payload.kind === 'listUpdate') {
		const { error } = await supabase.from('lists').update(payload.patch).eq('id', payload.listId);
		if (error) throw error;
	} else if (payload.kind === 'listDelete') {
		const { error } = await supabase.from('lists').delete().eq('id', payload.listId);
		if (error) throw error;
	} else if (payload.kind === 'itemAdd') {
		const itemResult = await supabase.from('list_items').insert(payload.item);
		if (itemResult.error) throw itemResult.error;
		if (payload.catalog) {
			const catalogResult = await supabase.from('item_catalog').upsert(payload.catalog, {
				onConflict: 'household_id,name'
			});
			if (catalogResult.error) throw catalogResult.error;
		}
	} else if (payload.kind === 'itemUpdate') {
		const { error } = await supabase
			.from('list_items')
			.update(payload.patch)
			.eq('id', payload.itemId);
		if (error) throw error;
	} else if (payload.kind === 'itemToggle') {
		const { error } = await supabase
			.from('list_items')
			.update({ checked: payload.checked, checked_at: payload.checked_at })
			.eq('id', payload.itemId);
		if (error) throw error;
	} else if (payload.kind === 'itemDelete') {
		const { error } = await supabase.from('list_items').delete().eq('id', payload.itemId);
		if (error) throw error;
	} else if (payload.kind === 'householdUpdate') {
		const { error } = await supabase
			.from('households')
			.update(payload.patch)
			.eq('id', payload.householdId);
		if (error) throw error;
	}
}

export async function flushOutbox(supabase: BasementClient) {
	if (!browser) return;
	const pending = await outboxAll<OutboxPayload>();
	for (const record of pending) {
		if (record.id == null) continue;
		try {
			await pushPayload(supabase, record.payload);
			await outboxDelete(record.id);
		} catch {
			break;
		}
	}
	await refreshPending();
}

export async function loadSnapshotResilient(
	supabase: BasementClient,
	userId: string,
	profile: Profile
) {
	if (browser) {
		const local = await readSnapshot(userId);
		if (!isOnline() && local) {
			const merged = await snapshotWithOutbox({ ...local, profile });
			publishSnapshot(merged);
			return merged;
		}
		try {
			return await pullSnapshot(supabase, userId, profile);
		} catch {
			if (local) {
				const merged = await snapshotWithOutbox({ ...local, profile });
				publishSnapshot(merged);
				return merged;
			}
		}
	}

	try {
		return await pullSnapshot(supabase, userId, profile);
	} catch {
		return emptySnapshot(userId, profile);
	}
}

export async function persistListCreate(
	supabase: BasementClient,
	userId: string,
	list: ShoppingList
) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		lists: [list, ...snap.lists.filter((row) => row.id !== list.id)]
	}));
	await pushOrQueue(supabase, { kind: 'listCreate', list });
}

export async function persistListUpdate(
	supabase: BasementClient,
	userId: string,
	listId: string,
	patch: Partial<ShoppingList>
) {
	const stamped = { ...patch, updated_at: nowIso() };
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		lists: snap.lists.map((list) => (list.id === listId ? { ...list, ...stamped } : list))
	}));
	await pushOrQueue(supabase, { kind: 'listUpdate', listId, patch: stamped });
}

export async function persistListDelete(supabase: BasementClient, userId: string, listId: string) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		lists: snap.lists.filter((list) => list.id !== listId),
		items: snap.items.filter((item) => item.list_id !== listId)
	}));
	await pushOrQueue(supabase, { kind: 'listDelete', listId });
}

export async function persistItemAdd(
	supabase: BasementClient,
	userId: string,
	item: ListItem,
	householdId: string
) {
	let catalogRow: ItemCatalog | null = null;
	await mutateSnapshot(userId, (snap) => {
		const catalog = bumpCatalog(snap.catalog, householdId, item.name);
		catalogRow =
			catalog.find(
				(row) => row.household_id === householdId && row.name === normalizeItemName(item.name)
			) ?? null;
		return {
			...snap,
			items: [item, ...snap.items.filter((row) => row.id !== item.id)],
			catalog
		};
	});
	await pushOrQueue(supabase, { kind: 'itemAdd', item, catalog: catalogRow });
}

export async function persistItemUpdate(
	supabase: BasementClient,
	userId: string,
	itemId: string,
	patch: Partial<ListItem>
) {
	const stamped = { ...patch, updated_at: nowIso() };
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		items: snap.items.map((item) => (item.id === itemId ? { ...item, ...stamped } : item))
	}));
	await pushOrQueue(supabase, { kind: 'itemUpdate', itemId, patch: stamped });
}

export async function persistItemToggle(
	supabase: BasementClient,
	userId: string,
	itemId: string,
	checked: boolean
) {
	const checked_at = checked ? nowIso() : null;
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		items: snap.items.map((item) =>
			item.id === itemId ? { ...item, checked, checked_at, updated_at: nowIso() } : item
		)
	}));
	await pushOrQueue(supabase, { kind: 'itemToggle', itemId, checked, checked_at });
}

export async function persistItemDelete(supabase: BasementClient, userId: string, itemId: string) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		items: snap.items.filter((item) => item.id !== itemId)
	}));
	await pushOrQueue(supabase, { kind: 'itemDelete', itemId });
}

export async function persistHouseholdUpdate(
	supabase: BasementClient,
	userId: string,
	householdId: string,
	patch: Partial<Household>
) {
	const stamped = { ...patch, updated_at: nowIso() };
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		households: snap.households.map((household) =>
			household.id === householdId ? { ...household, ...stamped } : household
		)
	}));
	await pushOrQueue(supabase, { kind: 'householdUpdate', householdId, patch: stamped });
}

export function applyRemoteList(snap: OfflineSnapshot, row: ShoppingList | null, event: string) {
	if (event === 'DELETE' && row) {
		return {
			...snap,
			lists: snap.lists.filter((list) => list.id !== row.id),
			items: snap.items.filter((item) => item.list_id !== row.id)
		};
	}
	if (!row) return snap;
	const existing = snap.lists.find((list) => list.id === row.id);
	if (existing && existing.updated_at > row.updated_at) return snap;
	return {
		...snap,
		lists: [row, ...snap.lists.filter((list) => list.id !== row.id)]
	};
}

export function applyRemoteItem(
	snap: OfflineSnapshot,
	row: ListItem | null,
	event: string,
	blockedIds: Set<string>
) {
	if (row && blockedIds.has(row.id)) return snap;
	if (event === 'DELETE' && row) {
		return { ...snap, items: snap.items.filter((item) => item.id !== row.id) };
	}
	if (!row) return snap;
	const existing = snap.items.find((item) => item.id === row.id);
	if (existing && existing.updated_at > row.updated_at) return snap;
	return {
		...snap,
		items: existing
			? snap.items.map((item) => (item.id === row.id ? row : item))
			: [row, ...snap.items]
	};
}

export function listSummaries(snap: OfflineSnapshot) {
	const households = new Map(snap.households.map((household) => [household.id, household.name]));
	return snap.lists
		.filter((list) => !list.archived_at)
		.map((list) => {
			const items = snap.items.filter((item) => item.list_id === list.id);
			return {
				id: list.id,
				household_id: list.household_id,
				household_name: households.get(list.household_id) ?? 'Household',
				name: list.name,
				unchecked: items.filter((item) => !item.checked).length,
				total: items.length,
				updated_at: list.updated_at
			};
		})
		.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function itemsForList(snap: OfflineSnapshot, listId: string) {
	const items = snap.items.filter((item) => item.list_id === listId);
	const unchecked = items
		.filter((item) => !item.checked)
		.sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
	const checked = items
		.filter((item) => item.checked)
		.sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? ''));
	return { unchecked, checked };
}
