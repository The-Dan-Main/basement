import type { ItemCatalog } from '$lib/types/app';

export function normalizeItemName(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function suggestCatalog(catalog: ItemCatalog[], query: string, limit = 8): ItemCatalog[] {
	const q = normalizeItemName(query);
	const ranked = catalog
		.filter((item) => {
			if (!q) return true;
			return item.name.includes(q) || item.display_name.toLowerCase().includes(q);
		})
		.sort((a, b) => {
			if (b.use_count !== a.use_count) return b.use_count - a.use_count;
			return b.last_used_at.localeCompare(a.last_used_at);
		});
	return ranked.slice(0, limit);
}

export function bumpCatalog(
	catalog: ItemCatalog[],
	householdId: string,
	displayName: string,
	now = new Date().toISOString()
): ItemCatalog[] {
	const name = normalizeItemName(displayName);
	if (!name) return catalog;
	const existing = catalog.find((item) => item.household_id === householdId && item.name === name);
	if (existing) {
		return catalog.map((item) =>
			item.id === existing.id
				? {
						...item,
						display_name: displayName.trim() || item.display_name,
						use_count: item.use_count + 1,
						last_used_at: now,
						updated_at: now
					}
				: item
		);
	}
	return [
		...catalog,
		{
			id: crypto.randomUUID(),
			household_id: householdId,
			name,
			display_name: displayName.trim(),
			use_count: 1,
			last_used_at: now,
			created_at: now,
			updated_at: now
		}
	];
}
