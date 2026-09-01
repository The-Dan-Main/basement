export function moveItem<T>(items: T[], from: number, to: number): T[] {
	if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
		return items;
	}
	const next = items.slice();
	const [item] = next.splice(from, 1);
	next.splice(to, 0, item);
	return next;
}

export function insertAt<T>(items: T[], index: number, item: T): T[] {
	const next = items.slice();
	next.splice(Math.max(0, Math.min(index, next.length)), 0, item);
	return next;
}

export function nextFrontSortOrder(orders: number[]) {
	if (orders.length === 0) return 0;
	return Math.min(...orders) - 1;
}

export function sameOrder<T>(a: T[], b: T[], getId: (item: T) => string) {
	if (a.length !== b.length) return false;
	return a.every((item, index) => getId(item) === getId(b[index]));
}

export type OrderPatch = {
	id: string;
	sort_order: number;
	category?: string;
};

export type OrderGroup<T extends { id: string; category?: string | null }> = {
	category: string;
	items: T[];
};

export function orderPatches<T extends { id: string }>(items: T[], start = 0): OrderPatch[] {
	return items.map((item, index) => ({ id: item.id, sort_order: start + index }));
}

export function groupOrderPatches<T extends { id: string; category?: string | null }>(
	groups: OrderGroup<T>[]
): OrderPatch[] {
	const patches: OrderPatch[] = [];
	let order = 0;
	for (const group of groups) {
		for (const item of group.items) {
			const patch: OrderPatch = { id: item.id, sort_order: order++, category: group.category };
			patches.push(patch);
		}
	}
	return patches;
}

export function transferToGroup<T extends { id: string; category?: string | null }>(
	groups: OrderGroup<T>[],
	itemId: string,
	toCategory: string,
	index: number
): OrderGroup<T>[] {
	const found = groups.flatMap((group) => group.items).find((item) => item.id === itemId);
	if (!found) return groups;
	const moved = { ...found, category: toCategory };
	const without = groups.map((group) => ({
		...group,
		items: group.items.filter((item) => item.id !== itemId)
	}));
	let inserted = false;
	const result = without.map((group) => {
		if (group.category !== toCategory) return group;
		inserted = true;
		return { ...group, items: insertAt(group.items, index, moved) };
	});
	if (!inserted) {
		result.push({ category: toCategory, items: [moved] });
	}
	return result;
}

export const NONE_GROUP = '__none__';

export function sortableGroupKey(category: string) {
	return category || NONE_GROUP;
}

export function sortableGroupValue(key: string) {
	return key === NONE_GROUP ? '' : key;
}
