import type { Messages } from '$lib/i18n/messages';
import type { ListItem } from '$lib/types/app';

export const CATEGORY_IDS = [
	'produce',
	'dairy',
	'bakery',
	'meat',
	'frozen',
	'drinks',
	'pantry',
	'household',
	'personal',
	'other'
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const LIST_EMOJIS = [
	'🛒',
	'🥦',
	'🥖',
	'🧀',
	'🍖',
	'🧃',
	'🧹',
	'🛠️',
	'💊',
	'🐾',
	'🎁',
	'🏠'
] as const;

export function isCategoryId(value: string): value is CategoryId {
	return (CATEGORY_IDS as readonly string[]).includes(value);
}

export function categoryOrder(value: string) {
	if (!value) return -1;
	const index = CATEGORY_IDS.indexOf(value as CategoryId);
	return index === -1 ? CATEGORY_IDS.length : index;
}

export function categoryLabel(labels: Messages['categories'], id: string) {
	if (!id) return labels.none;
	if (isCategoryId(id)) return labels[id];
	return id;
}

export function groupItemsByCategory(items: ListItem[]) {
	const buckets = new Map<string, ListItem[]>();
	for (const item of items) {
		const key = item.category || '';
		const group = buckets.get(key) ?? [];
		group.push(item);
		buckets.set(key, group);
	}
	return [...buckets.entries()]
		.sort(([a], [b]) => categoryOrder(a) - categoryOrder(b) || a.localeCompare(b))
		.map(([category, group]) => ({ category, items: group }));
}
