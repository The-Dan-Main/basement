import type { ListItem, ShoppingList } from '$lib/types/app';

export function formatListShare(
	list: Pick<ShoppingList, 'name' | 'emoji'>,
	items: ListItem[],
	labels: { open: string; done: string }
) {
	const unchecked = items.filter((item) => !item.checked);
	const checked = items.filter((item) => item.checked);
	const title = [list.emoji, list.name].filter(Boolean).join(' ');
	const lines = [title, `${unchecked.length} / ${items.length}`];

	if (unchecked.length) {
		lines.push('', labels.open);
		for (const item of unchecked) lines.push(formatShareLine('☐', item));
	}
	if (checked.length) {
		lines.push('', labels.done);
		for (const item of checked) lines.push(formatShareLine('☑', item));
	}

	return lines.join('\n');
}

function formatShareLine(mark: string, item: ListItem) {
	const extra = [item.quantity, item.note].filter(Boolean).join(' · ');
	return extra ? `${mark} ${item.name} · ${extra}` : `${mark} ${item.name}`;
}

export async function shareOrCopy(title: string, text: string, url?: string) {
	if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
		try {
			await navigator.share(url ? { title, text, url } : { title, text });
			return 'shared' as const;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled' as const;
		}
	}
	if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(url || text);
		return 'copied' as const;
	}
	throw new Error('share');
}
