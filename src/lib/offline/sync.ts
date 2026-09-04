import { browser } from '$app/environment';
import { bumpCatalog, normalizeItemName } from '$lib/catalog';
import { fetchAllRows, nowIso } from '$lib/data';
import { kvGet, kvSet, outboxAdd, outboxAll, outboxCount, outboxDelete } from '$lib/offline/db';
import { publishProfile, publishSnapshot } from '$lib/offline/live.svelte';
import { isOnline, setOfflineStatus } from '$lib/offline/status';
import { signRecipeImageUrls } from '$lib/recipe-images';
import {
	hydrateIngredient,
	hydrateRecipe,
	planRecipeListAdds,
	toRecipeRow,
	type ListAddInput
} from '$lib/recipes';
import { nextFrontSortOrder, type OrderPatch } from '$lib/sort';
import type { BasementClient } from '$lib/supabase/client';
import type {
	Chore,
	ChoreCompletion,
	Cookbook,
	CookbookComment,
	CookbookRecipe,
	Household,
	HouseholdInvite,
	ItemCatalog,
	ListItem,
	Member,
	Profile,
	Recipe,
	RecipeComment,
	RecipeIngredient,
	RecipeRating,
	RecipeStep,
	RecipeTimelineEvent,
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
	recipes: Recipe[];
	recipeIngredients: RecipeIngredient[];
	recipeSteps: RecipeStep[];
	cookbooks: Cookbook[];
	cookbookRecipes: CookbookRecipe[];
	recipeRatings: RecipeRating[];
	recipeTimeline: RecipeTimelineEvent[];
	recipeComments: RecipeComment[];
	cookbookComments: CookbookComment[];
	chores: Chore[];
	choreCompletions: ChoreCompletion[];
};

export type OutboxPayload =
	| { kind: 'listCreate'; list: ShoppingList }
	| { kind: 'listUpdate'; listId: string; patch: Partial<ShoppingList> }
	| { kind: 'listDelete'; listId: string }
	| { kind: 'itemAdd'; item: ListItem; catalog: ItemCatalog | null }
	| { kind: 'itemUpdate'; itemId: string; patch: Partial<ListItem> }
	| {
			kind: 'itemToggle';
			itemId: string;
			checked: boolean;
			checked_at: string | null;
			checked_by: string | null;
	  }
	| { kind: 'itemDelete'; itemId: string }
	| { kind: 'itemsDelete'; itemIds: string[] }
	| { kind: 'listsReorder'; updates: OrderPatch[]; updated_at: string }
	| { kind: 'itemsReorder'; updates: OrderPatch[]; updated_at: string }
	| { kind: 'householdUpdate'; householdId: string; patch: Partial<Household> }
	| { kind: 'recipeUpsert'; recipe: Recipe; ingredients: RecipeIngredient[]; steps: RecipeStep[] }
	| { kind: 'recipeDelete'; recipeId: string; imagePath?: string }
	| { kind: 'cookbookUpsert'; cookbook: Cookbook; recipeIds: string[] }
	| { kind: 'cookbookDelete'; cookbookId: string }
	| { kind: 'ratingUpsert'; rating: RecipeRating }
	| { kind: 'timelineAdd'; event: RecipeTimelineEvent }
	| { kind: 'timelineDelete'; eventId: string }
	| { kind: 'recipeCommentAdd'; comment: RecipeComment }
	| { kind: 'recipeCommentDelete'; commentId: string }
	| { kind: 'cookbookCommentAdd'; comment: CookbookComment }
	| { kind: 'cookbookCommentDelete'; commentId: string }
	| { kind: 'choreUpsert'; chore: Chore }
	| { kind: 'choreDelete'; choreId: string }
	| { kind: 'choreComplete'; completion: ChoreCompletion }
	| { kind: 'choreUncomplete'; completionId: string };

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
		catalog: [],
		recipes: [],
		recipeIngredients: [],
		recipeSteps: [],
		cookbooks: [],
		cookbookRecipes: [],
		recipeRatings: [],
		recipeTimeline: [],
		recipeComments: [],
		cookbookComments: [],
		chores: [],
		choreCompletions: []
	};
}

function hydrateSnapshot(snap: OfflineSnapshot): OfflineSnapshot {
	return {
		...snap,
		lists: snap.lists.map((list) => ({ ...list, emoji: list.emoji ?? '' })),
		items: snap.items.map((item) => ({
			...item,
			category: item.category ?? '',
			checked_by: item.checked_by ?? null
		})),
		catalog: snap.catalog.map((row) => ({ ...row, category: row.category ?? '' })),
		recipes: (snap.recipes ?? []).map(hydrateRecipe),
		recipeIngredients: (snap.recipeIngredients ?? []).map(hydrateIngredient),
		recipeSteps: snap.recipeSteps ?? [],
		cookbooks: snap.cookbooks ?? [],
		cookbookRecipes: snap.cookbookRecipes ?? [],
		recipeRatings: snap.recipeRatings ?? [],
		recipeTimeline: snap.recipeTimeline ?? [],
		recipeComments: snap.recipeComments ?? [],
		cookbookComments: snap.cookbookComments ?? [],
		chores: snap.chores ?? [],
		choreCompletions: snap.choreCompletions ?? []
	};
}

export async function readSnapshot(userId?: string): Promise<OfflineSnapshot | null> {
	if (!browser) return null;
	const snap = await kvGet<OfflineSnapshot>(SNAP_KEY);
	if (!snap) return null;
	if (userId && snap.userId !== userId) return null;
	return hydrateSnapshot(snap);
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
		if (payload.kind === 'itemsDelete') {
			for (const id of payload.itemIds) ids.add(id);
		}
		if (payload.kind === 'itemsReorder') {
			for (const update of payload.updates) ids.add(update.id);
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
						? {
								...item,
								checked: payload.checked,
								checked_at: payload.checked_at,
								checked_by: payload.checked_by
							}
						: item
				)
			};
		} else if (payload.kind === 'itemDelete') {
			next = { ...next, items: next.items.filter((item) => item.id !== payload.itemId) };
		} else if (payload.kind === 'itemsDelete') {
			const removed = new Set(payload.itemIds);
			next = { ...next, items: next.items.filter((item) => !removed.has(item.id)) };
		} else if (payload.kind === 'listsReorder') {
			next = applyOrderPatches(next, 'lists', payload.updates, payload.updated_at);
		} else if (payload.kind === 'itemsReorder') {
			next = applyOrderPatches(next, 'items', payload.updates, payload.updated_at);
		} else if (payload.kind === 'householdUpdate') {
			next = {
				...next,
				households: next.households.map((household) =>
					household.id === payload.householdId ? { ...household, ...payload.patch } : household
				)
			};
		} else if (payload.kind === 'recipeUpsert') {
			next = applyRecipeBundle(next, payload.recipe, payload.ingredients, payload.steps);
		} else if (payload.kind === 'recipeDelete') {
			next = removeRecipeFromSnap(next, payload.recipeId);
		} else if (payload.kind === 'cookbookUpsert') {
			next = applyCookbook(next, payload.cookbook, payload.recipeIds);
		} else if (payload.kind === 'cookbookDelete') {
			next = removeCookbookFromSnap(next, payload.cookbookId);
		} else if (payload.kind === 'ratingUpsert') {
			next = applyRating(next, payload.rating);
		} else if (payload.kind === 'timelineAdd') {
			next = {
				...next,
				recipeTimeline: [
					payload.event,
					...next.recipeTimeline.filter((row) => row.id !== payload.event.id)
				]
			};
		} else if (payload.kind === 'timelineDelete') {
			next = {
				...next,
				recipeTimeline: next.recipeTimeline.filter((row) => row.id !== payload.eventId)
			};
		} else if (payload.kind === 'recipeCommentAdd') {
			next = {
				...next,
				recipeComments: [
					payload.comment,
					...next.recipeComments.filter((row) => row.id !== payload.comment.id)
				]
			};
		} else if (payload.kind === 'recipeCommentDelete') {
			next = {
				...next,
				recipeComments: next.recipeComments.filter((row) => row.id !== payload.commentId)
			};
		} else if (payload.kind === 'cookbookCommentAdd') {
			next = {
				...next,
				cookbookComments: [
					payload.comment,
					...next.cookbookComments.filter((row) => row.id !== payload.comment.id)
				]
			};
		} else if (payload.kind === 'cookbookCommentDelete') {
			next = {
				...next,
				cookbookComments: next.cookbookComments.filter((row) => row.id !== payload.commentId)
			};
		} else if (payload.kind === 'choreUpsert') {
			next = applyChore(next, payload.chore);
		} else if (payload.kind === 'choreDelete') {
			next = removeChoreFromSnap(next, payload.choreId);
		} else if (payload.kind === 'choreComplete') {
			next = applyChoreCompletion(next, payload.completion);
		} else if (payload.kind === 'choreUncomplete') {
			next = {
				...next,
				choreCompletions: next.choreCompletions.filter((row) => row.id !== payload.completionId)
			};
		}
	}
	return next;
}

function applyRecipeBundle(
	snap: OfflineSnapshot,
	recipe: Recipe,
	ingredients: RecipeIngredient[],
	steps: RecipeStep[]
): OfflineSnapshot {
	return {
		...snap,
		recipes: [recipe, ...snap.recipes.filter((row) => row.id !== recipe.id)],
		recipeIngredients: [
			...ingredients,
			...snap.recipeIngredients.filter((row) => row.recipe_id !== recipe.id)
		],
		recipeSteps: [...steps, ...snap.recipeSteps.filter((row) => row.recipe_id !== recipe.id)]
	};
}

function applyCookbook(
	snap: OfflineSnapshot,
	cookbook: Cookbook,
	recipeIds: string[]
): OfflineSnapshot {
	return {
		...snap,
		cookbooks: [cookbook, ...snap.cookbooks.filter((row) => row.id !== cookbook.id)],
		cookbookRecipes: [
			...recipeIds.map((recipeId, index) => ({
				cookbook_id: cookbook.id,
				recipe_id: recipeId,
				sort_order: index
			})),
			...snap.cookbookRecipes.filter((row) => row.cookbook_id !== cookbook.id)
		]
	};
}

function removeCookbookFromSnap(snap: OfflineSnapshot, cookbookId: string): OfflineSnapshot {
	return {
		...snap,
		cookbooks: snap.cookbooks.filter((row) => row.id !== cookbookId),
		cookbookRecipes: snap.cookbookRecipes.filter((row) => row.cookbook_id !== cookbookId),
		cookbookComments: snap.cookbookComments.filter((row) => row.cookbook_id !== cookbookId)
	};
}

function applyChore(snap: OfflineSnapshot, chore: Chore): OfflineSnapshot {
	return {
		...snap,
		chores: [chore, ...snap.chores.filter((row) => row.id !== chore.id)]
	};
}

function removeChoreFromSnap(snap: OfflineSnapshot, choreId: string): OfflineSnapshot {
	return {
		...snap,
		chores: snap.chores.filter((row) => row.id !== choreId),
		choreCompletions: snap.choreCompletions.filter((row) => row.chore_id !== choreId)
	};
}

function applyChoreCompletion(snap: OfflineSnapshot, completion: ChoreCompletion): OfflineSnapshot {
	return {
		...snap,
		choreCompletions: [
			completion,
			...snap.choreCompletions.filter(
				(row) =>
					row.id !== completion.id &&
					!(row.chore_id === completion.chore_id && row.period_key === completion.period_key)
			)
		]
	};
}

function applyRating(snap: OfflineSnapshot, rating: RecipeRating): OfflineSnapshot {
	return {
		...snap,
		recipeRatings: [
			rating,
			...snap.recipeRatings.filter(
				(row) => !(row.recipe_id === rating.recipe_id && row.user_id === rating.user_id)
			)
		]
	};
}

function removeRecipeFromSnap(snap: OfflineSnapshot, recipeId: string): OfflineSnapshot {
	return {
		...snap,
		recipes: snap.recipes.filter((row) => row.id !== recipeId),
		recipeIngredients: snap.recipeIngredients.filter((row) => row.recipe_id !== recipeId),
		recipeSteps: snap.recipeSteps.filter((row) => row.recipe_id !== recipeId),
		cookbookRecipes: snap.cookbookRecipes.filter((row) => row.recipe_id !== recipeId),
		recipeRatings: snap.recipeRatings.filter((row) => row.recipe_id !== recipeId),
		recipeTimeline: snap.recipeTimeline.filter((row) => row.recipe_id !== recipeId),
		recipeComments: snap.recipeComments.filter((row) => row.recipe_id !== recipeId)
	};
}

function applyOrderPatches(
	snap: OfflineSnapshot,
	key: 'lists' | 'items',
	updates: OrderPatch[],
	updated_at: string
): OfflineSnapshot {
	const byId = new Map(updates.map((update) => [update.id, update]));
	if (key === 'lists') {
		return {
			...snap,
			lists: snap.lists.map((row) => {
				const patch = byId.get(row.id);
				return patch ? { ...row, sort_order: patch.sort_order, updated_at } : row;
			})
		};
	}
	return {
		...snap,
		items: snap.items.map((row) => {
			const patch = byId.get(row.id);
			if (!patch) return row;
			return {
				...row,
				sort_order: patch.sort_order,
				...(patch.category !== undefined ? { category: patch.category } : {}),
				updated_at
			};
		})
	};
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
	const [
		households,
		memberRows,
		profileRows,
		invites,
		lists,
		items,
		catalog,
		recipes,
		recipeIngredients,
		recipeSteps,
		cookbooks,
		cookbookRecipes,
		recipeRatings,
		recipeTimeline,
		recipeComments,
		cookbookComments,
		chores,
		choreCompletions,
		profileRow
	] = await Promise.all([
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
		fetchAllRows<Recipe>((from, to) =>
			supabase.from('recipes').select('*').order('updated_at', { ascending: false }).range(from, to)
		),
		fetchAllRows<RecipeIngredient>((from, to) =>
			supabase
				.from('recipe_ingredients')
				.select('*')
				.order('sort_order', { ascending: true })
				.range(from, to)
		),
		fetchAllRows<RecipeStep>((from, to) =>
			supabase
				.from('recipe_steps')
				.select('*')
				.order('sort_order', { ascending: true })
				.range(from, to)
		),
		fetchAllRows<Cookbook>((from, to) =>
			supabase
				.from('cookbooks')
				.select('*')
				.order('updated_at', { ascending: false })
				.range(from, to)
		),
		fetchAllRows<CookbookRecipe>((from, to) =>
			supabase
				.from('cookbook_recipes')
				.select('*')
				.order('sort_order', { ascending: true })
				.range(from, to)
		),
		fetchAllRows<RecipeRating>((from, to) =>
			supabase.from('recipe_ratings').select('*').range(from, to)
		),
		fetchAllRows<RecipeTimelineEvent>((from, to) =>
			supabase
				.from('recipe_timeline')
				.select('*')
				.order('cooked_at', { ascending: false })
				.range(from, to)
		),
		fetchAllRows<RecipeComment>((from, to) =>
			supabase
				.from('recipe_comments')
				.select('*')
				.order('created_at', { ascending: false })
				.range(from, to)
		),
		fetchAllRows<CookbookComment>((from, to) =>
			supabase
				.from('cookbook_comments')
				.select('*')
				.order('created_at', { ascending: false })
				.range(from, to)
		),
		fetchAllRows<Chore>((from, to) =>
			supabase
				.from('chores')
				.select('*')
				.is('archived_at', null)
				.order('updated_at', { ascending: false })
				.range(from, to)
		),
		fetchAllRows<ChoreCompletion>((from, to) =>
			supabase
				.from('chore_completions')
				.select('*')
				.order('completed_at', { ascending: false })
				.range(from, to)
		),
		supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
	]);

	const imageUrls = await signRecipeImageUrls(
		supabase,
		recipes.map((row) => row.image_path)
	);

	const names = new Map(profileRows.map((row) => [row.id, row.display_name]));
	const members: Member[] = memberRows.map((row) => ({
		...row,
		display_name: names.get(row.user_id) ?? 'Shopper'
	}));

	const next: OfflineSnapshot = hydrateSnapshot({
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
		catalog,
		recipes: recipes.map((row) => ({ ...row, image_url: imageUrls.get(row.image_path) ?? '' })),
		recipeIngredients,
		recipeSteps,
		cookbooks,
		cookbookRecipes,
		recipeRatings,
		recipeTimeline,
		recipeComments,
		cookbookComments,
		chores,
		choreCompletions
	});
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

function missingColumn(error: { message?: string } | null, column: string) {
	const message = error?.message ?? '';
	return message.includes(`'${column}'`) || message.includes(`"${column}"`);
}

async function writeRow<T extends Record<string, unknown>>(
	run: (row: T) => PromiseLike<{ error: { message: string } | null }>,
	row: T,
	optional: (keyof T)[]
) {
	let current = { ...row };
	for (let attempt = 0; attempt <= optional.length; attempt++) {
		const { error } = await run(current);
		if (!error) return;
		const drop = optional.find((key) => missingColumn(error, String(key)));
		if (!drop) throw error;
		const next = { ...current };
		delete next[drop];
		current = next;
	}
}

async function pushPayload(supabase: BasementClient, payload: OutboxPayload) {
	if (payload.kind === 'listCreate') {
		await writeRow((row) => supabase.from('lists').insert(row), payload.list, ['emoji']);
	} else if (payload.kind === 'listUpdate') {
		await writeRow(
			(row) => supabase.from('lists').update(row).eq('id', payload.listId),
			payload.patch,
			['emoji']
		);
	} else if (payload.kind === 'listDelete') {
		const { error } = await supabase.from('lists').delete().eq('id', payload.listId);
		if (error) throw error;
	} else if (payload.kind === 'itemAdd') {
		await writeRow((row) => supabase.from('list_items').insert(row), payload.item, [
			'category',
			'checked_by'
		]);
		if (payload.catalog) {
			await writeRow(
				(row) =>
					supabase.from('item_catalog').upsert(row, {
						onConflict: 'household_id,name'
					}),
				payload.catalog,
				['category']
			);
		}
	} else if (payload.kind === 'itemUpdate') {
		await writeRow(
			(row) => supabase.from('list_items').update(row).eq('id', payload.itemId),
			payload.patch,
			['category', 'checked_by']
		);
	} else if (payload.kind === 'itemToggle') {
		await writeRow(
			(row) => supabase.from('list_items').update(row).eq('id', payload.itemId),
			{
				checked: payload.checked,
				checked_at: payload.checked_at,
				checked_by: payload.checked_by
			},
			['checked_by']
		);
	} else if (payload.kind === 'itemDelete') {
		const { error } = await supabase.from('list_items').delete().eq('id', payload.itemId);
		if (error) throw error;
	} else if (payload.kind === 'itemsDelete') {
		if (payload.itemIds.length === 0) return;
		const { error } = await supabase.from('list_items').delete().in('id', payload.itemIds);
		if (error) throw error;
	} else if (payload.kind === 'listsReorder') {
		await pushOrderPatches(supabase, 'lists', payload.updates, payload.updated_at);
	} else if (payload.kind === 'itemsReorder') {
		await pushOrderPatches(supabase, 'list_items', payload.updates, payload.updated_at);
	} else if (payload.kind === 'householdUpdate') {
		const { error } = await supabase
			.from('households')
			.update(payload.patch)
			.eq('id', payload.householdId);
		if (error) throw error;
	} else if (payload.kind === 'recipeUpsert') {
		const { error: recipeError } = await supabase
			.from('recipes')
			.upsert(toRecipeRow(payload.recipe));
		if (recipeError) throw recipeError;
		const { error: clearIngredients } = await supabase
			.from('recipe_ingredients')
			.delete()
			.eq('recipe_id', payload.recipe.id);
		if (clearIngredients) throw clearIngredients;
		if (payload.ingredients.length > 0) {
			const { error } = await supabase.from('recipe_ingredients').insert(payload.ingredients);
			if (error) throw error;
		}
		const { error: clearSteps } = await supabase
			.from('recipe_steps')
			.delete()
			.eq('recipe_id', payload.recipe.id);
		if (clearSteps) throw clearSteps;
		if (payload.steps.length > 0) {
			const { error } = await supabase.from('recipe_steps').insert(payload.steps);
			if (error) throw error;
		}
	} else if (payload.kind === 'recipeDelete') {
		const { error } = await supabase.from('recipes').delete().eq('id', payload.recipeId);
		if (error) throw error;
		if (payload.imagePath) {
			await supabase.storage.from('recipe-images').remove([payload.imagePath]);
		}
	} else if (payload.kind === 'cookbookUpsert') {
		const { error: cookbookError } = await supabase.from('cookbooks').upsert(payload.cookbook);
		if (cookbookError) throw cookbookError;
		const { error: clearLinks } = await supabase
			.from('cookbook_recipes')
			.delete()
			.eq('cookbook_id', payload.cookbook.id);
		if (clearLinks) throw clearLinks;
		if (payload.recipeIds.length > 0) {
			const { error } = await supabase.from('cookbook_recipes').insert(
				payload.recipeIds.map((recipeId, index) => ({
					cookbook_id: payload.cookbook.id,
					recipe_id: recipeId,
					sort_order: index
				}))
			);
			if (error) throw error;
		}
	} else if (payload.kind === 'cookbookDelete') {
		const { error } = await supabase.from('cookbooks').delete().eq('id', payload.cookbookId);
		if (error) throw error;
	} else if (payload.kind === 'ratingUpsert') {
		const { error } = await supabase.from('recipe_ratings').upsert(payload.rating);
		if (error) throw error;
	} else if (payload.kind === 'timelineAdd') {
		const { error } = await supabase.from('recipe_timeline').insert(payload.event);
		if (error) throw error;
	} else if (payload.kind === 'timelineDelete') {
		const { error } = await supabase.from('recipe_timeline').delete().eq('id', payload.eventId);
		if (error) throw error;
	} else if (payload.kind === 'recipeCommentAdd') {
		const { error } = await supabase.from('recipe_comments').insert(payload.comment);
		if (error) throw error;
	} else if (payload.kind === 'recipeCommentDelete') {
		const { error } = await supabase.from('recipe_comments').delete().eq('id', payload.commentId);
		if (error) throw error;
	} else if (payload.kind === 'cookbookCommentAdd') {
		const { error } = await supabase.from('cookbook_comments').insert(payload.comment);
		if (error) throw error;
	} else if (payload.kind === 'cookbookCommentDelete') {
		const { error } = await supabase.from('cookbook_comments').delete().eq('id', payload.commentId);
		if (error) throw error;
	} else if (payload.kind === 'choreUpsert') {
		const { error } = await supabase.from('chores').upsert(payload.chore);
		if (error) throw error;
	} else if (payload.kind === 'choreDelete') {
		const { error } = await supabase.from('chores').delete().eq('id', payload.choreId);
		if (error) throw error;
	} else if (payload.kind === 'choreComplete') {
		const { error } = await supabase.from('chore_completions').insert(payload.completion);
		if (error) throw error;
	} else if (payload.kind === 'choreUncomplete') {
		const { error } = await supabase.from('chore_completions').delete().eq('id', payload.completionId);
		if (error) throw error;
	}
}

async function pushOrderPatches(
	supabase: BasementClient,
	table: 'lists' | 'list_items',
	updates: OrderPatch[],
	updated_at: string
) {
	for (const update of updates) {
		if (table === 'lists') {
			await writeRow(
				(next) => supabase.from('lists').update(next).eq('id', update.id),
				{ sort_order: update.sort_order, updated_at },
				[]
			);
			continue;
		}
		await writeRow(
			(next) => supabase.from('list_items').update(next).eq('id', update.id),
			{
				sort_order: update.sort_order,
				updated_at,
				...(update.category !== undefined ? { category: update.category } : {})
			},
			[]
		);
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

export async function persistListsReorder(
	supabase: BasementClient,
	userId: string,
	updates: OrderPatch[]
) {
	if (updates.length === 0) return;
	const updated_at = nowIso();
	await mutateSnapshot(userId, (snap) => applyOrderPatches(snap, 'lists', updates, updated_at));
	await pushOrQueue(supabase, { kind: 'listsReorder', updates, updated_at });
}

export async function persistItemAdd(
	supabase: BasementClient,
	userId: string,
	item: ListItem,
	householdId: string
) {
	let catalogRow: ItemCatalog | null = null;
	await mutateSnapshot(userId, (snap) => {
		const catalog = bumpCatalog(snap.catalog, householdId, item.name, nowIso(), item.category);
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
	const checked_by = checked ? userId : null;
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		items: snap.items.map((item) =>
			item.id === itemId ? { ...item, checked, checked_at, checked_by, updated_at: nowIso() } : item
		)
	}));
	await pushOrQueue(supabase, { kind: 'itemToggle', itemId, checked, checked_at, checked_by });
}

export async function persistItemDelete(supabase: BasementClient, userId: string, itemId: string) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		items: snap.items.filter((item) => item.id !== itemId)
	}));
	await pushOrQueue(supabase, { kind: 'itemDelete', itemId });
}

export async function persistItemsDelete(
	supabase: BasementClient,
	userId: string,
	itemIds: string[]
) {
	if (itemIds.length === 0) return;
	const removed = new Set(itemIds);
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		items: snap.items.filter((item) => !removed.has(item.id))
	}));
	await pushOrQueue(supabase, { kind: 'itemsDelete', itemIds });
}

export async function persistItemsReorder(
	supabase: BasementClient,
	userId: string,
	updates: OrderPatch[]
) {
	if (updates.length === 0) return;
	const updated_at = nowIso();
	await mutateSnapshot(userId, (snap) => applyOrderPatches(snap, 'items', updates, updated_at));
	await pushOrQueue(supabase, { kind: 'itemsReorder', updates, updated_at });
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

export async function persistRecipeUpsert(
	supabase: BasementClient,
	userId: string,
	recipe: Recipe,
	ingredients: RecipeIngredient[],
	steps: RecipeStep[]
) {
	await mutateSnapshot(userId, (snap) => applyRecipeBundle(snap, recipe, ingredients, steps));
	await pushOrQueue(supabase, { kind: 'recipeUpsert', recipe, ingredients, steps });
}

export async function persistRecipeDelete(
	supabase: BasementClient,
	userId: string,
	recipeId: string,
	imagePath = ''
) {
	await mutateSnapshot(userId, (snap) => removeRecipeFromSnap(snap, recipeId));
	await pushOrQueue(supabase, { kind: 'recipeDelete', recipeId, imagePath });
}

export async function persistCookbookUpsert(
	supabase: BasementClient,
	userId: string,
	cookbook: Cookbook,
	recipeIds: string[]
) {
	await mutateSnapshot(userId, (snap) => applyCookbook(snap, cookbook, recipeIds));
	await pushOrQueue(supabase, { kind: 'cookbookUpsert', cookbook, recipeIds });
}

export async function persistCookbookDelete(
	supabase: BasementClient,
	userId: string,
	cookbookId: string
) {
	await mutateSnapshot(userId, (snap) => removeCookbookFromSnap(snap, cookbookId));
	await pushOrQueue(supabase, { kind: 'cookbookDelete', cookbookId });
}

export async function persistRatingUpsert(
	supabase: BasementClient,
	userId: string,
	rating: RecipeRating
) {
	await mutateSnapshot(userId, (snap) => applyRating(snap, rating));
	await pushOrQueue(supabase, { kind: 'ratingUpsert', rating });
}

export async function persistTimelineAdd(
	supabase: BasementClient,
	userId: string,
	event: RecipeTimelineEvent
) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		recipeTimeline: [event, ...snap.recipeTimeline.filter((row) => row.id !== event.id)]
	}));
	await pushOrQueue(supabase, { kind: 'timelineAdd', event });
}

export async function persistTimelineDelete(
	supabase: BasementClient,
	userId: string,
	eventId: string
) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		recipeTimeline: snap.recipeTimeline.filter((row) => row.id !== eventId)
	}));
	await pushOrQueue(supabase, { kind: 'timelineDelete', eventId });
}

export async function persistRecipeCommentAdd(
	supabase: BasementClient,
	userId: string,
	comment: RecipeComment
) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		recipeComments: [comment, ...snap.recipeComments.filter((row) => row.id !== comment.id)]
	}));
	await pushOrQueue(supabase, { kind: 'recipeCommentAdd', comment });
}

export async function persistRecipeCommentDelete(
	supabase: BasementClient,
	userId: string,
	commentId: string
) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		recipeComments: snap.recipeComments.filter((row) => row.id !== commentId)
	}));
	await pushOrQueue(supabase, { kind: 'recipeCommentDelete', commentId });
}

export async function persistCookbookCommentAdd(
	supabase: BasementClient,
	userId: string,
	comment: CookbookComment
) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		cookbookComments: [comment, ...snap.cookbookComments.filter((row) => row.id !== comment.id)]
	}));
	await pushOrQueue(supabase, { kind: 'cookbookCommentAdd', comment });
}

export async function persistCookbookCommentDelete(
	supabase: BasementClient,
	userId: string,
	commentId: string
) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		cookbookComments: snap.cookbookComments.filter((row) => row.id !== commentId)
	}));
	await pushOrQueue(supabase, { kind: 'cookbookCommentDelete', commentId });
}

export async function persistChoreUpsert(supabase: BasementClient, userId: string, chore: Chore) {
	await mutateSnapshot(userId, (snap) => applyChore(snap, chore));
	await pushOrQueue(supabase, { kind: 'choreUpsert', chore });
}

export async function persistChoreDelete(supabase: BasementClient, userId: string, choreId: string) {
	await mutateSnapshot(userId, (snap) => removeChoreFromSnap(snap, choreId));
	await pushOrQueue(supabase, { kind: 'choreDelete', choreId });
}

export async function persistChoreComplete(
	supabase: BasementClient,
	userId: string,
	completion: ChoreCompletion
) {
	await mutateSnapshot(userId, (snap) => applyChoreCompletion(snap, completion));
	await pushOrQueue(supabase, { kind: 'choreComplete', completion });
}

export async function persistChoreUncomplete(
	supabase: BasementClient,
	userId: string,
	completionId: string
) {
	await mutateSnapshot(userId, (snap) => ({
		...snap,
		choreCompletions: snap.choreCompletions.filter((row) => row.id !== completionId)
	}));
	await pushOrQueue(supabase, { kind: 'choreUncomplete', completionId });
}

export async function persistRecipeToList(
	supabase: BasementClient,
	userId: string,
	list: ShoppingList,
	ingredients: ListAddInput[]
) {
	const snap =
		(await readSnapshot(userId)) ??
		emptySnapshot(userId, {
			id: userId,
			display_name: 'Shopper',
			locale: 'en',
			created_at: nowIso(),
			updated_at: nowIso()
		});
	const existing = snap.items.filter((item) => item.list_id === list.id);
	const plan = planRecipeListAdds(existing, ingredients);
	for (const update of plan.updates) {
		await persistItemUpdate(supabase, userId, update.itemId, {
			quantity: update.quantity,
			note: update.note,
			category: update.category
		});
	}
	for (const input of plan.adds) {
		const now = nowIso();
		const sort_order = nextFrontSortOrder(
			existing
				.filter((item) => !item.checked && (item.category || '') === (input.category || ''))
				.map((item) => item.sort_order)
		);
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
			sort_order,
			created_by: userId,
			created_at: now,
			updated_at: now
		};
		existing.push(item);
		await persistItemAdd(supabase, userId, item, list.household_id);
	}
	await persistListUpdate(supabase, userId, list.id, { updated_at: nowIso() });
	return { added: plan.adds.length, merged: plan.updates.length };
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
				emoji: list.emoji ?? '',
				unchecked: items.filter((item) => !item.checked).length,
				total: items.length,
				sort_order: list.sort_order,
				updated_at: list.updated_at
			};
		})
		.sort((a, b) => a.sort_order - b.sort_order || b.updated_at.localeCompare(a.updated_at));
}

export function itemsForList(snap: OfflineSnapshot, listId: string) {
	const items = snap.items.filter((item) => item.list_id === listId);
	const unchecked = items
		.filter((item) => !item.checked)
		.sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
	const checked = items
		.filter((item) => item.checked)
		.sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? ''));
	return { items, unchecked, checked };
}

export function memberName(snap: OfflineSnapshot, userId: string | null | undefined) {
	if (!userId) return '';
	return snap.members.find((member) => member.user_id === userId)?.display_name ?? '';
}

export function matchesQuery(item: ListItem, query: string) {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return (
		item.name.toLowerCase().includes(q) ||
		item.note.toLowerCase().includes(q) ||
		item.quantity.toLowerCase().includes(q) ||
		item.category.toLowerCase().includes(q)
	);
}

export function recipesForHousehold(snap: OfflineSnapshot, householdId?: string) {
	return snap.recipes
		.filter((recipe) => !householdId || recipe.household_id === householdId)
		.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.title.localeCompare(b.title));
}

export function recipeDetail(snap: OfflineSnapshot, recipeId: string) {
	const recipe = snap.recipes.find((row) => row.id === recipeId) ?? null;
	const ingredients = snap.recipeIngredients
		.filter((row) => row.recipe_id === recipeId)
		.sort((a, b) => a.sort_order - b.sort_order);
	const steps = snap.recipeSteps
		.filter((row) => row.recipe_id === recipeId)
		.sort((a, b) => a.sort_order - b.sort_order);
	const comments = snap.recipeComments
		.filter((row) => row.recipe_id === recipeId)
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	const timeline = snap.recipeTimeline
		.filter((row) => row.recipe_id === recipeId && isCookedEvent(row))
		.sort((a, b) => b.cooked_at.localeCompare(a.cooked_at));
	const ratings = snap.recipeRatings.filter((row) => row.recipe_id === recipeId);
	const cookbooks = snap.cookbooks
		.filter((cookbook) =>
			snap.cookbookRecipes.some(
				(link) => link.cookbook_id === cookbook.id && link.recipe_id === recipeId
			)
		)
		.sort((a, b) => a.title.localeCompare(b.title));
	return { recipe, ingredients, steps, comments, timeline, ratings, cookbooks };
}

export function cookbooksForHousehold(snap: OfflineSnapshot, householdId?: string) {
	return snap.cookbooks
		.filter((cookbook) => !householdId || cookbook.household_id === householdId)
		.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.title.localeCompare(b.title));
}

export function cookbookDetail(snap: OfflineSnapshot, cookbookId: string) {
	const cookbook = snap.cookbooks.find((row) => row.id === cookbookId) ?? null;
	const recipeIds = snap.cookbookRecipes
		.filter((row) => row.cookbook_id === cookbookId)
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((row) => row.recipe_id);
	const recipes = recipeIds
		.map((id) => snap.recipes.find((recipe) => recipe.id === id))
		.filter((recipe): recipe is Recipe => Boolean(recipe));
	const comments = snap.cookbookComments
		.filter((row) => row.cookbook_id === cookbookId)
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	return { cookbook, recipes, recipeIds, comments };
}

export function isCookedEvent(event: RecipeTimelineEvent) {
	return !event.event_type || event.event_type === 'cooked';
}

export type RecipeFeedKind = 'created' | 'cooked';

export type RecipeFeedItem = {
	id: string;
	kind: RecipeFeedKind;
	at: string;
	recipe_id: string;
	household_id: string;
	user_id: string;
	rating: number | null;
	note: string;
};

export function recipeFeed(
	snap: OfflineSnapshot,
	householdId?: string,
	filter: 'all' | RecipeFeedKind = 'all'
): RecipeFeedItem[] {
	const recipes = snap.recipes.filter(
		(recipe) => !householdId || recipe.household_id === householdId
	);
	const created: RecipeFeedItem[] = recipes.map((recipe) => ({
		id: `created:${recipe.id}`,
		kind: 'created',
		at: recipe.created_at,
		recipe_id: recipe.id,
		household_id: recipe.household_id,
		user_id: recipe.created_by,
		rating: null,
		note: ''
	}));
	const cooked: RecipeFeedItem[] = snap.recipeTimeline
		.filter((event) => isCookedEvent(event) && (!householdId || event.household_id === householdId))
		.map((event) => ({
			id: event.id,
			kind: 'cooked' as const,
			at: event.cooked_at,
			recipe_id: event.recipe_id,
			household_id: event.household_id,
			user_id: event.user_id,
			rating: event.rating,
			note: event.note
		}));
	return [...created, ...cooked]
		.filter((item) => filter === 'all' || item.kind === filter)
		.sort((a, b) => b.at.localeCompare(a.at) || a.kind.localeCompare(b.kind));
}

export function lastCookedEvent(snap: OfflineSnapshot, recipeId: string) {
	return (
		snap.recipeTimeline
			.filter((row) => row.recipe_id === recipeId && isCookedEvent(row))
			.sort((a, b) => b.cooked_at.localeCompare(a.cooked_at))[0] ?? null
	);
}

export function householdTimeline(snap: OfflineSnapshot, householdId?: string) {
	return recipeFeed(snap, householdId, 'cooked').map((item) => ({
		id: item.id,
		recipe_id: item.recipe_id,
		household_id: item.household_id,
		user_id: item.user_id,
		event_type: 'cooked' as const,
		cooked_at: item.at,
		rating: item.rating,
		note: item.note,
		created_at: item.at
	}));
}

export function averageRating(ratings: RecipeRating[]) {
	if (ratings.length === 0) return null;
	return ratings.reduce((sum, row) => sum + row.rating, 0) / ratings.length;
}

export function userRating(ratings: RecipeRating[], userId: string) {
	return ratings.find((row) => row.user_id === userId)?.rating ?? 0;
}
