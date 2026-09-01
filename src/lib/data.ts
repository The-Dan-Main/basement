const PAGE = 1000;

export async function fetchAllRows<T>(
	loadPage: (
		from: number,
		to: number
	) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
	const rows: T[] = [];
	for (let from = 0; ; from += PAGE) {
		const { data, error } = await loadPage(from, from + PAGE - 1);
		if (error) throw error;
		const chunk = data ?? [];
		rows.push(...chunk);
		if (chunk.length < PAGE) break;
	}
	return rows;
}

export function nowIso() {
	return new Date().toISOString();
}
