import { error, json } from '@sveltejs/kit';
import {
	AI_RECIPE_SCHEMA,
	extractRecipePage,
	normalizeAiRecipe,
	parsePublicHttpUrl,
	recipeLooksReady,
	sourceKeyFromUrl
} from '$lib/ai-recipe';
import { fetchPublicImage, fetchPublicPage, PageFetchError } from '$lib/server/fetch-page';
import { GeminiError, generateGeminiJson, isGeminiConfigured } from '$lib/server/gemini';
import type { RequestHandler } from './$types';

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

const SYSTEM = `You extract recipes from web pages into a clean structured recipe for a household meal app.
Rules:
- Use only facts from the page. Do not invent a different dish.
- Split ingredients into name, numeric amount, unit, optional note, and a grocery aisle category.
- Units must be one of: g, kg, ml, l, tsp, tbsp, cup, piece, pinch, clove, slice, can, pack, bunch, or empty.
- Categories must be one of: produce, dairy, bakery, meat, frozen, drinks, pantry, household, personal, other, or empty.
- Nutrition fields are totals for the stated servings. Use 0 if unknown.
- Servings must be at least 1. Prefer the yield printed on the page.
- Steps are cooking instructions only, in order, one action per step.
- Description is a short note: source yield, time, and any storage hint printed on the page.
- Reply in the language of the page. If mixed, use the user's locale.`;

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) error(401);
	if (!isGeminiConfigured()) error(503, 'gemini-missing');

	const body = asRecord(await request.json().catch(() => null)) ?? {};
	const rawUrl = String(body.url ?? '').trim();
	const locale = body.locale === 'de' ? 'de' : 'en';
	const url = parsePublicHttpUrl(rawUrl);
	if (!url) error(400, 'bad-url');

	try {
		const page = await fetchPublicPage(url.toString());
		const extracted = extractRecipePage(page.html);
		if (!extracted.text && extracted.jsonLd.length === 0) error(422, 'no-recipe');

		const parsed = normalizeAiRecipe(
			await generateGeminiJson({
				system: SYSTEM,
				schema: AI_RECIPE_SCHEMA as unknown as Record<string, unknown>,
				temperature: 0.15,
				user: [
					`User locale: ${locale}`,
					`Canonical URL: ${page.url}`,
					extracted.title ? `Page title: ${extracted.title}` : '',
					extracted.jsonLd.length
						? `JSON-LD recipes found:\n${JSON.stringify(extracted.jsonLd).slice(0, 12000)}`
						: 'No JSON-LD recipe on the page.',
					`Visible page text:\n${extracted.text}`
				]
					.filter(Boolean)
					.join('\n\n')
			})
		);

		if (!parsed || !recipeLooksReady(parsed)) error(422, 'no-recipe');

		const imageUrl = extracted.imageUrl ? new URL(extracted.imageUrl, page.url).toString() : '';
		const image = imageUrl ? await fetchPublicImage(imageUrl) : null;

		return json({
			recipe: parsed,
			sourceUrl: page.url,
			sourceKey: sourceKeyFromUrl(page.url),
			image
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		if (err instanceof PageFetchError) error(err.status, err.message);
		if (err instanceof GeminiError) error(err.status, err.message);
		error(502, 'gemini');
	}
};
