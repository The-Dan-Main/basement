import { error, json } from '@sveltejs/kit';
import {
	AI_CHAT_SCHEMA,
	normalizeAiRecipe,
	normalizeChatReply,
	recipeLooksReady,
	sanitizeChatTurns
} from '$lib/ai-recipe';
import {
	GeminiError,
	cookPreferenceBlock,
	generateGeminiJson,
	loadUserGeminiKey,
	type GeminiTurn
} from '$lib/server/gemini';
import type { RequestHandler } from './$types';

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

const SYSTEM = `You are Basement's meal-prep cook. You chat with one household cook and turn the conversation into a saveable recipe.
Defaults:
- Meal prep is on unless they explicitly want a one-off dinner.
- Aim for 4–6 portions that reheat well. Ask if you do not know the count.
- Cover storage (fridge/freezer, how many days) and reheating in the recipe description and last steps.
- Prefer batch-friendly methods: sheet pans, pots, one-pan bakes, jars.
Conversation:
- First learn what they crave, what ingredients they have or want to use, allergies, and time.
- Ask one or two focused questions at a time. Do not dump a full recipe until you have enough to cook from.
- Talk about substitutions and leftover ingredients when they come up.
- Reply in the user's locale (en or de). Be concise and practical.
When you write the recipe:
- title, description, servings, nutrition totals for those servings, ingredients, and ordered steps.
- Ingredient units: g, kg, ml, l, tsp, tbsp, cup, piece, pinch, clove, slice, can, pack, bunch, or empty.
- Categories: produce, dairy, bakery, meat, frozen, drinks, pantry, household, personal, other, or empty.
- Nutrition can be an honest estimate. Use 0 if you truly cannot tell.
- Set ready=true only when the recipe can be cooked as-is (title, at least 3 ingredients, at least 3 steps).
- If you are still gathering info, keep ready=false and return an empty title.
- If a draft already exists, refine it from the latest message instead of starting over.`;

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user || !locals.supabase) error(401);
	const apiKey = await loadUserGeminiKey(locals.supabase, user.id);
	if (!apiKey) error(503, 'gemini-missing');

	const body = asRecord(await request.json().catch(() => null)) ?? {};
	const locale = body.locale === 'de' ? 'de' : 'en';
	const turns = sanitizeChatTurns(body.messages);
	const latest = turns.at(-1);
	if (!latest || latest.role !== 'user') error(400, 'empty');

	const history: GeminiTurn[] = turns.slice(0, -1).map((turn) => ({
		role: turn.role === 'assistant' ? 'model' : 'user',
		parts: [{ text: turn.content }]
	}));
	const draft = normalizeAiRecipe(body.recipe);
	const preferences = await cookPreferenceBlock(locals.supabase, user.id, body, 'chat');

	try {
		const parsed = normalizeChatReply(
			await generateGeminiJson({
				apiKey,
				system: preferences ? `${SYSTEM}\n\n${preferences}` : SYSTEM,
				schema: AI_CHAT_SCHEMA as unknown as Record<string, unknown>,
				temperature: 0.6,
				history,
				user: [
					`User locale: ${locale}`,
					draft && recipeLooksReady(draft)
						? `Current draft JSON:\n${JSON.stringify(draft)}`
						: 'No saveable draft yet.',
					`Latest user message:\n${latest.content}`
				].join('\n\n')
			})
		);
		if (!parsed) error(502, 'gemini');
		return json(parsed);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		if (err instanceof GeminiError) error(err.status, err.message);
		error(502, 'gemini');
	}
};
