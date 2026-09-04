import { json, error } from '@sveltejs/kit';
import {
	mapMealieRecipe,
	mealieFetchImage,
	mealieFetchJson,
	type MealieImageDraft,
	type MealieListItem
} from '$lib/mealie';
import type { RequestHandler } from './$types';

type MealiePage = {
	items?: { slug?: string; name?: string; id?: string }[];
	total?: number;
	page?: number;
	per_page?: number;
};

function encodeImage(image: MealieImageDraft | null) {
	if (!image) return null;
	return {
		name: image.name,
		type: image.type,
		base64: Buffer.from(image.bytes).toString('base64')
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) error(401);
	const body = asRecord(await request.json()) ?? {};
	const baseUrl = String(body.baseUrl ?? '').trim();
	const token = String(body.token ?? '').trim();
	const action = String(body.action ?? '');
	if (!/^https?:\/\//i.test(baseUrl) || !token) error(400, 'missing');

	try {
		if (action === 'list') {
			const recipes: MealieListItem[] = [];
			for (let page = 1; page <= 50; page++) {
				const payload = (await mealieFetchJson(
					baseUrl,
					token,
					`/api/recipes?page=${page}&perPage=50&orderBy=name`
				)) as MealiePage;
				const items = payload.items ?? [];
				for (const item of items) {
					if (item.slug && item.name) recipes.push({ slug: item.slug, name: item.name });
				}
				if (items.length < 50 || recipes.length >= (payload.total ?? recipes.length)) break;
			}
			return json({ recipes });
		}

		if (action === 'fetch') {
			const slugs = Array.isArray(body.slugs) ? body.slugs.map((slug) => String(slug)) : [];
			const recipes = [];
			for (const slug of slugs.slice(0, 25)) {
				const raw = asRecord(
					await mealieFetchJson(baseUrl, token, `/api/recipes/${encodeURIComponent(slug)}`)
				);
				if (!raw) continue;
				const recipeId = String(raw.id ?? '');
				const image = recipeId ? await mealieFetchImage(baseUrl, token, recipeId) : null;
				const mapped = mapMealieRecipe(raw, image);
				if (!mapped) continue;
				recipes.push({
					...mapped,
					image: encodeImage(mapped.image)
				});
			}
			return json({ recipes });
		}
	} catch {
		error(502, 'mealie');
	}

	error(400, 'unknown action');
};
