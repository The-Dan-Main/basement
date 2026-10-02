import { CATEGORY_IDS, isCategoryId } from './categories.ts';
import { asAmount, asNumber, normalizeUnit, RECIPE_UNITS } from './recipes.ts';

export const RECIPE_CATEGORIES = ['', ...CATEGORY_IDS] as const;

export type AiIngredientDraft = {
	name: string;
	amount: number | null;
	unit: string;
	note: string;
	category: string;
};

export type AiRecipeDraft = {
	title: string;
	description: string;
	servings: number;
	calories: number;
	fat_g: number;
	protein_g: number;
	fiber_g: number;
	ingredients: AiIngredientDraft[];
	steps: { instruction: string }[];
};

export type ChatTurn = {
	role: 'user' | 'assistant';
	content: string;
};

const UNIT_SET = new Set<string>(RECIPE_UNITS);

const NAME_CATEGORY: [RegExp, string][] = [
	[
		/hühner|hähnchen|haehnchen|chicken|schwein|rind|lachs|fisch|hackfleisch|bacon|wurst|tofu/i,
		'meat'
	],
	[/milch|skyr|joghurt|jogurt|käse|kaese|parmesan|butter|sahne|ei\b|eier|quark|cream/i, 'dairy'],
	[
		/zwiebel|knoblauch|petersilie|basilikum|salat|gurke|karotte|tomate(?!nsauce)|spinat|lauch|broccoli|brokkoli/i,
		'produce'
	],
	[
		/pasta|nudel|reis|mehl|pelati|öl|oel|\boil\b|salz|pfeffer|gewürz|paprikapulver|chili|sauce|reis/i,
		'pantry'
	]
];

export const AI_RECIPE_SCHEMA = {
	type: 'object',
	properties: {
		title: { type: 'string' },
		description: { type: 'string' },
		servings: { type: 'integer' },
		calories: { type: 'number' },
		fat_g: { type: 'number' },
		protein_g: { type: 'number' },
		fiber_g: { type: 'number' },
		ingredients: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					amount: { type: 'number', nullable: true },
					unit: { type: 'string' },
					note: { type: 'string' },
					category: { type: 'string' }
				},
				required: ['name', 'amount', 'unit', 'note', 'category']
			}
		},
		steps: {
			type: 'array',
			items: {
				type: 'object',
				properties: { instruction: { type: 'string' } },
				required: ['instruction']
			}
		}
	},
	required: [
		'title',
		'description',
		'servings',
		'calories',
		'fat_g',
		'protein_g',
		'fiber_g',
		'ingredients',
		'steps'
	]
} as const;

export const AI_CHAT_SCHEMA = {
	type: 'object',
	properties: {
		reply: { type: 'string' },
		ready: { type: 'boolean' },
		recipe: AI_RECIPE_SCHEMA
	},
	required: ['reply', 'ready', 'recipe']
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function asString(value: unknown) {
	return typeof value === 'string' ? value.trim() : '';
}

export function guessIngredientCategory(name: string) {
	for (const [pattern, category] of NAME_CATEGORY) {
		if (pattern.test(name)) return category;
	}
	return '';
}

export function normalizeIngredientUnit(unit: string) {
	const mapped = normalizeUnit(unit);
	return UNIT_SET.has(mapped) ? mapped : mapped.slice(0, 24);
}

function normalizeIngredient(raw: unknown): AiIngredientDraft | null {
	if (typeof raw === 'string') {
		const name = raw.trim();
		return name
			? { name, amount: null, unit: '', note: '', category: guessIngredientCategory(name) }
			: null;
	}
	const row = asRecord(raw);
	if (!row) return null;
	const name = asString(row.name) || asString(row.ingredient);
	if (!name) return null;
	const category = isCategoryId(asString(row.category))
		? asString(row.category)
		: guessIngredientCategory(name);
	return {
		name: name.slice(0, 120),
		amount: asAmount(row.amount ?? row.quantity),
		unit: normalizeIngredientUnit(asString(row.unit)),
		note: asString(row.note).slice(0, 160),
		category
	};
}

export function emptyAiRecipe(): AiRecipeDraft {
	return {
		title: '',
		description: '',
		servings: 4,
		calories: 0,
		fat_g: 0,
		protein_g: 0,
		fiber_g: 0,
		ingredients: [],
		steps: []
	};
}

export function recipeLooksReady(recipe: AiRecipeDraft | null | undefined) {
	if (!recipe?.title.trim()) return false;
	return (
		recipe.ingredients.some((row) => row.name.trim()) &&
		recipe.steps.some((row) => row.instruction.trim())
	);
}

export function normalizeAiRecipe(raw: unknown): AiRecipeDraft | null {
	const row = asRecord(raw);
	if (!row) return null;
	const title = asString(row.title) || asString(row.recipe_name) || asString(row.name);
	if (!title) return null;
	const ingredients = (Array.isArray(row.ingredients) ? row.ingredients : [])
		.map(normalizeIngredient)
		.filter((item): item is AiIngredientDraft => Boolean(item));
	const steps = (
		Array.isArray(row.steps) ? row.steps : Array.isArray(row.instructions) ? row.instructions : []
	)
		.map((item) => {
			if (typeof item === 'string') return item.trim();
			const step = asRecord(item);
			return asString(step?.instruction) || asString(step?.text) || asString(step?.step);
		})
		.filter(Boolean)
		.map((instruction) => ({ instruction: instruction.slice(0, 2000) }));
	return {
		title: title.slice(0, 120),
		description: asString(row.description).slice(0, 4000),
		servings: Math.max(1, Math.round(asNumber(row.servings, 4))),
		calories: Math.max(0, asNumber(row.calories)),
		fat_g: Math.max(0, asNumber(row.fat_g ?? row.fat)),
		protein_g: Math.max(0, asNumber(row.protein_g ?? row.protein)),
		fiber_g: Math.max(0, asNumber(row.fiber_g ?? row.fiber)),
		ingredients,
		steps
	};
}

export function normalizeChatReply(raw: unknown) {
	const row = asRecord(raw);
	if (!row) return null;
	const reply = asString(row.reply) || asString(row.message);
	const recipe = normalizeAiRecipe(row.recipe) ?? emptyAiRecipe();
	if (!reply && !recipe.title) return null;
	return {
		reply,
		ready: Boolean(row.ready) && recipeLooksReady(recipe),
		recipe
	};
}

export function sanitizeChatTurns(raw: unknown, limit = 20): ChatTurn[] {
	if (!Array.isArray(raw)) return [];
	const turns: ChatTurn[] = [];
	for (const item of raw.slice(-limit)) {
		const row = asRecord(item);
		if (!row) continue;
		const role = asString(row.role);
		const content = asString(row.content).slice(0, 2000);
		if ((role !== 'user' && role !== 'assistant') || !content) continue;
		turns.push({ role, content });
	}
	return turns;
}

export function sourceKeyFromUrl(url: string) {
	try {
		const parsed = new URL(url);
		const key = `${parsed.host}${parsed.pathname}`.toLowerCase().replace(/\/+$/, '');
		return key.slice(0, 240) || parsed.host;
	} catch {
		return url.trim().slice(0, 240);
	}
}

export function slugFromTitle(title: string) {
	const slug = title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
	return (slug || 'recipe').slice(0, 80);
}

const PRIVATE_HOSTS = new Set([
	'localhost',
	'0.0.0.0',
	'::1',
	'metadata.google.internal',
	'metadata.goog'
]);

function isPrivateIpv4(host: string) {
	const parts = host.split('.').map(Number);
	if (
		parts.length !== 4 ||
		parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
	) {
		return false;
	}
	const [a, b] = parts;
	if (a === 10 || a === 127 || a === 0) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}

export function parsePublicHttpUrl(value: string): URL | null {
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
	if (PRIVATE_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local'))
		return null;
	if (isPrivateIpv4(host)) return null;
	if (host.includes(':')) return null;
	return url;
}

function decodeEntities(value: string) {
	return value
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>');
}

function metaContent(html: string, property: string) {
	const named = new RegExp(
		`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
		'i'
	);
	const flipped = new RegExp(
		`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
		'i'
	);
	return decodeEntities(html.match(named)?.[1] || html.match(flipped)?.[1] || '').trim();
}

export function extractPageTitle(html: string) {
	const og = metaContent(html, 'og:title');
	if (og) return og;
	const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
	return decodeEntities(title.replace(/<[^>]+>/g, '')).trim();
}

export function extractOgImage(html: string) {
	return metaContent(html, 'og:image');
}

export function extractReadableText(html: string, max = 18000) {
	const text = decodeEntities(
		html
			.replace(/<script[\s\S]*?<\/script>/gi, ' ')
			.replace(/<style[\s\S]*?<\/style>/gi, ' ')
			.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
			.replace(/<!--[\s\S]*?-->/g, ' ')
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
	).trim();
	return text.length > max ? text.slice(0, max) : text;
}

function flattenLd(value: unknown): Record<string, unknown>[] {
	if (Array.isArray(value)) return value.flatMap(flattenLd);
	const row = asRecord(value);
	if (!row) return [];
	if (row['@graph']) return flattenLd(row['@graph']);
	return [row];
}

function isRecipeType(value: unknown) {
	const types = Array.isArray(value) ? value : [value];
	return types.some((item) => String(item).toLowerCase().includes('recipe'));
}

export function extractJsonLdRecipes(html: string): Record<string, unknown>[] {
	const recipes: Record<string, unknown>[] = [];
	const blocks = html.matchAll(
		/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
	);
	for (const block of blocks) {
		try {
			const parsed = JSON.parse(block[1] ?? '') as unknown;
			for (const row of flattenLd(parsed)) {
				if (isRecipeType(row['@type'])) recipes.push(row);
			}
		} catch {
			continue;
		}
	}
	return recipes;
}

export type PageExtract = {
	title: string;
	text: string;
	imageUrl: string;
	jsonLd: Record<string, unknown>[];
};

export function extractRecipePage(html: string): PageExtract {
	return {
		title: extractPageTitle(html),
		text: extractReadableText(html),
		imageUrl: extractOgImage(html),
		jsonLd: extractJsonLdRecipes(html)
	};
}

const COOK_NOTE_LIMIT = 2000;

export function clampCookNote(value: unknown) {
	return typeof value === 'string' ? value.trim().slice(0, COOK_NOTE_LIMIT) : '';
}

export type CookPerson = {
	name: string;
	likes: string;
	avoids: string;
};

export function cookPreferencePrompt(people: CookPerson[], kind: 'chat' | 'extract') {
	const blocks = people
		.map((person) => {
			const dos = clampCookNote(person.likes);
			const donts = clampCookNote(person.avoids);
			if (!dos && !donts) return '';
			const who = person.name.trim() || 'Someone';
			return [`${who}:`, dos ? `Do:\n${dos}` : '', donts ? `Don't:\n${donts}` : '']
				.filter(Boolean)
				.join('\n');
		})
		.filter(Boolean);
	if (blocks.length === 0) return '';
	const intro =
		kind === 'chat'
			? 'Preferences of the people eating this meal. Follow every listed person unless the latest message explicitly overrides one, and mention that override. If two people conflict, choose a version both can eat or ask.'
			: "Preferences of the people this import is for. Keep the dish from the page. If an ingredient conflicts with someone's don't, leave the original and add a short substitution in that ingredient's note.";
	return [intro, ...blocks].join('\n\n');
}

export function stripJsonFences(text: string) {
	const trimmed = text.trim();
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	return (fenced?.[1] ?? trimmed).trim();
}
