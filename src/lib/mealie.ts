const IMAGE_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif'
};

const LABEL_CATEGORY: Record<string, string> = {
	'dairy & eggs': 'dairy',
	dairy: 'dairy',
	cheese: 'dairy',
	bakery: 'bakery',
	bread: 'bakery',
	produce: 'produce',
	vegetables: 'produce',
	fruit: 'produce',
	meat: 'meat',
	'meat & seafood': 'meat',
	seafood: 'meat',
	fish: 'meat',
	frozen: 'frozen',
	beverages: 'drinks',
	drinks: 'drinks',
	'oils & fats': 'pantry',
	pantry: 'pantry',
	spices: 'pantry',
	canned: 'pantry'
};

const NAME_CATEGORY: [RegExp, string][] = [
	[/hühner|hähnchen|haehnchen|chicken|schwein|rind|lachs|fisch|hackfleisch|bacon|wurst/i, 'meat'],
	[/milch|skyr|joghurt|jogurt|käse|kaese|parmesan|butter|sahne|ei\b|eier|quark/i, 'dairy'],
	[
		/zwiebel|knoblauch|petersilie|basilikum|salat|gurke|karotte|tomate(?!nsauce)|spinat|lauch/i,
		'produce'
	],
	[
		/pasta|nudel|reis|mehl|pelati|öl|oel|\boil\b|salz|pfeffer|gewürz|paprikapulver|chili|sauce/i,
		'pantry'
	]
];

const UNIT_ALIASES: Record<string, string> = {
	g: 'g',
	gram: 'g',
	grams: 'g',
	gramm: 'g',
	gramme: 'g',
	ml: 'ml',
	milliliter: 'ml',
	millilitre: 'ml',
	zehe: 'clove',
	zehen: 'clove',
	clove: 'clove',
	cloves: 'clove',
	stück: 'piece',
	stueck: 'piece',
	el: 'tbsp',
	tl: 'tsp'
};

function asNumber(value: unknown, fallback = 0) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value.replace(',', '.'));
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallback;
}

function asAmount(value: unknown): number | null {
	if (value == null || value === '') return null;
	const parsed = asNumber(value, Number.NaN);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUnit(unit: string) {
	return UNIT_ALIASES[unit.trim().toLowerCase()] ?? unit.trim().toLowerCase();
}

const LOCAL_SIG = 0x04034b50;
const EOCD_SIG = 0x06054b50;

function u16(view: DataView, offset: number) {
	return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number) {
	return view.getUint32(offset, true);
}

async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const min = Math.max(0, bytes.length - 65557);
	let eocd = -1;
	for (let i = bytes.length - 22; i >= min; i--) {
		if (u32(view, i) === EOCD_SIG) {
			eocd = i;
			break;
		}
	}
	if (eocd < 0) throw new Error('zip: missing central directory');
	const count = u16(view, eocd + 10);
	let offset = u32(view, eocd + 16);
	const files = new Map<string, Uint8Array>();
	for (let i = 0; i < count; i++) {
		if (u32(view, offset) !== 0x02014b50) throw new Error('zip: bad central directory');
		const method = u16(view, offset + 10);
		const compressed = u32(view, offset + 20);
		const nameLen = u16(view, offset + 28);
		const extraLen = u16(view, offset + 30);
		const commentLen = u16(view, offset + 32);
		const localOffset = u32(view, offset + 42);
		const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
		offset += 46 + nameLen + extraLen + commentLen;
		if (
			name.endsWith('/') ||
			name.startsWith('__MACOSX/') ||
			name.split('/').includes('.DS_Store')
		) {
			continue;
		}
		if (u32(view, localOffset) !== LOCAL_SIG) throw new Error(`zip: bad local header for ${name}`);
		const localNameLen = u16(view, localOffset + 26);
		const localExtraLen = u16(view, localOffset + 28);
		const dataStart = localOffset + 30 + localNameLen + localExtraLen;
		const payload = bytes.subarray(dataStart, dataStart + compressed);
		let body: Uint8Array | null = null;
		if (method === 0) body = payload.slice();
		else if (method === 8) {
			const copy = new Uint8Array(payload.byteLength);
			copy.set(payload);
			const stream = new DecompressionStream('deflate-raw');
			const writer = stream.writable.getWriter();
			await writer.write(copy);
			await writer.close();
			body = new Uint8Array(await new Response(stream.readable).arrayBuffer());
		}
		if (!body) throw new Error(`zip: unsupported compression ${method} for ${name}`);
		files.set(name.replace(/\\/g, '/'), body);
	}
	return files;
}

export type MealieIngredientDraft = {
	name: string;
	amount: number | null;
	unit: string;
	note: string;
	category: string;
};

export type MealieCommentDraft = {
	body: string;
	createdAt: string | null;
};

export type MealieImageDraft = {
	bytes: Uint8Array;
	name: string;
	type: string;
};

export type MealieRecipeDraft = {
	title: string;
	slug: string;
	description: string;
	servings: number;
	calories: number;
	fat_g: number;
	protein_g: number;
	fiber_g: number;
	ingredients: MealieIngredientDraft[];
	steps: { instruction: string }[];
	cookbooks: string[];
	rating: number | null;
	lastMade: string | null;
	comments: MealieCommentDraft[];
	image: MealieImageDraft | null;
	sourceKey: string;
	createdAt: string | null;
};

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;
}

function asString(value: unknown) {
	return typeof value === 'string' ? value.trim() : '';
}

function asList(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

export function isMealieRecipe(value: unknown): value is Json {
	const row = asRecord(value);
	if (!row) return false;
	if (!asString(row.name) && !asString(row.title) && !asString(row.slug)) return false;
	return (
		'slug' in row ||
		'recipe_ingredient' in row ||
		'recipeIngredient' in row ||
		'recipe_instructions' in row ||
		'recipeInstructions' in row
	);
}

function foodName(ingredient: Json) {
	const food = asRecord(ingredient.food);
	return asString(ingredient.display) || asString(food?.name) || asString(ingredient.note);
}

function mapUnit(ingredient: Json) {
	const unit = asRecord(ingredient.unit);
	const raw =
		asString(unit?.abbreviation) || asString(unit?.name) || asString(ingredient.unit) || '';
	const mapped = normalizeUnit(raw);
	return mapped === 'zehe' ? 'clove' : mapped;
}

function mapCategory(ingredient: Json, name: string) {
	const food = asRecord(ingredient.food);
	const label = asRecord(food?.label);
	const labelName = asString(label?.name).toLowerCase();
	if (labelName && LABEL_CATEGORY[labelName]) return LABEL_CATEGORY[labelName];
	for (const [pattern, category] of NAME_CATEGORY) {
		if (pattern.test(name)) return category;
	}
	return '';
}

function parseIngredient(raw: unknown): MealieIngredientDraft | null {
	if (typeof raw === 'string') {
		const name = raw.trim();
		return name ? { name, amount: null, unit: '', note: '', category: '' } : null;
	}
	const row = asRecord(raw);
	if (!row) return null;
	const food = asRecord(row.food);
	const name = asString(food?.name) || asString(row.name) || foodName(row);
	if (!name) return null;
	const amount = asAmount(row.quantity ?? row.amount);
	return {
		name,
		amount: amount && amount > 0 ? amount : null,
		unit: mapUnit(row),
		note: asString(row.note),
		category: mapCategory(row, name)
	};
}

function parseStep(raw: unknown): string {
	if (typeof raw === 'string') return raw.trim();
	const row = asRecord(raw);
	if (!row) return '';
	const title = asString(row.title);
	const text = asString(row.text) || asString(row.instruction) || asString(row.summary);
	return [title, text].filter(Boolean).join(' — ');
}

function parseComments(value: unknown): MealieCommentDraft[] {
	return asList(value)
		.map((item) => {
			const row = asRecord(item);
			if (!row) return null;
			const body = asString(row.text) || asString(row.comment) || asString(row.body);
			if (!body) return null;
			return { body, createdAt: asString(row.created_at) || asString(row.createdAt) || null };
		})
		.filter((row): row is MealieCommentDraft => Boolean(row));
}

function nutritionTotals(nutrition: Json | null, servings: number) {
	const per = {
		calories: asNumber(nutrition?.calories ?? nutrition?.calorieContent),
		fat_g: asNumber(nutrition?.fat_content ?? nutrition?.fatContent ?? nutrition?.fat),
		protein_g: asNumber(
			nutrition?.protein_content ?? nutrition?.proteinContent ?? nutrition?.protein
		),
		fiber_g: asNumber(nutrition?.fiber_content ?? nutrition?.fiberContent ?? nutrition?.fiber)
	};
	// Mealie nutrition on this export is per serving; Basement stores recipe totals.
	const factor = Math.max(1, servings);
	return {
		calories: per.calories * factor,
		fat_g: per.fat_g * factor,
		protein_g: per.protein_g * factor,
		fiber_g: per.fiber_g * factor
	};
}

function namedGroups(value: unknown) {
	return asList(value)
		.map((item) => (typeof item === 'string' ? item : asString(asRecord(item)?.name)))
		.filter(Boolean);
}

export function mapMealieRecipe(
	raw: unknown,
	image: MealieImageDraft | null = null
): MealieRecipeDraft | null {
	if (!isMealieRecipe(raw)) return null;
	const row = raw;
	const title = asString(row.name) || asString(row.title);
	if (!title) return null;
	const servings = Math.max(
		1,
		Math.round(asNumber(row.recipe_servings ?? row.recipeYieldQuantity ?? row.servings, 2))
	);
	const notes = asList(row.notes)
		.map((item) => {
			const note = asRecord(item);
			if (!note) return typeof item === 'string' ? item : '';
			return [asString(note.title), asString(note.text)].filter(Boolean).join(': ');
		})
		.filter(Boolean);
	const description = [asString(row.description), ...notes].filter(Boolean).join('\n\n');
	const nutrition = nutritionTotals(asRecord(row.nutrition), servings);
	const slug = asString(row.slug) || title.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
	const ratingRaw = asNumber(row.rating, Number.NaN);
	const rating =
		Number.isFinite(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? Math.round(ratingRaw) : null;
	return {
		title,
		slug,
		description,
		servings,
		...nutrition,
		ingredients: asList(row.recipe_ingredient ?? row.recipeIngredient)
			.map(parseIngredient)
			.filter((item): item is MealieIngredientDraft => Boolean(item)),
		steps: asList(row.recipe_instructions ?? row.recipeInstructions)
			.map(parseStep)
			.filter(Boolean)
			.map((instruction) => ({ instruction })),
		cookbooks: namedGroups(row.recipe_category ?? row.recipeCategory),
		rating,
		lastMade: asString(row.last_made) || asString(row.lastMade) || null,
		comments: parseComments(row.comments),
		image,
		sourceKey: slug,
		createdAt: asString(row.date_added) || asString(row.created_at) || asString(row.createdAt) || null
	};
}

function extOf(name: string) {
	return name.split('.').pop()?.toLowerCase() ?? '';
}

function imageDraft(name: string, bytes: Uint8Array): MealieImageDraft | null {
	const type = IMAGE_TYPES[extOf(name)];
	if (!type) return null;
	return { bytes, name: name.split('/').pop() || name, type };
}

function dirOf(path: string) {
	const index = path.lastIndexOf('/');
	return index === -1 ? '' : path.slice(0, index + 1);
}

function imageForJson(jsonPath: string, files: Map<string, Uint8Array>) {
	const dir = dirOf(jsonPath);
	const preferred = ['original.webp', 'min-original.webp', 'images/original.webp'];
	for (const name of preferred) {
		const bytes = files.get(dir + name);
		if (bytes) return imageDraft(dir + name, bytes);
	}
	for (const [path, bytes] of files) {
		if (!path.startsWith(dir) || path === jsonPath) continue;
		const nested = path.slice(dir.length);
		if (nested.includes('/') && !nested.startsWith('images/')) continue;
		const image = imageDraft(path, bytes);
		if (image) return image;
	}
	return null;
}

export async function recipesFromZipBytes(bytes: Uint8Array): Promise<MealieRecipeDraft[]> {
	const files = await unzip(bytes);
	const recipes: MealieRecipeDraft[] = [];
	for (const [path, body] of files) {
		if (!path.toLowerCase().endsWith('.json')) continue;
		try {
			const parsed = JSON.parse(new TextDecoder().decode(body)) as unknown;
			const mapped = mapMealieRecipe(parsed, imageForJson(path, files));
			if (mapped) recipes.push(mapped);
		} catch {
			continue;
		}
	}
	return recipes;
}

export async function recipesFromUploads(uploads: File[]): Promise<MealieRecipeDraft[]> {
	const recipes: MealieRecipeDraft[] = [];
	for (const file of uploads) {
		const lower = file.name.toLowerCase();
		const bytes = new Uint8Array(await file.arrayBuffer());
		if (lower.endsWith('.zip')) {
			recipes.push(...(await recipesFromZipBytes(bytes)));
			continue;
		}
		if (lower.endsWith('.json')) {
			try {
				const mapped = mapMealieRecipe(JSON.parse(new TextDecoder().decode(bytes)));
				if (mapped) recipes.push(mapped);
			} catch {
				continue;
			}
		}
	}
	return recipes;
}

export function mealieFileToBlob(image: MealieImageDraft) {
	const copy = new Uint8Array(image.bytes.byteLength);
	copy.set(image.bytes);
	return new File([copy], image.name, { type: image.type });
}

export function deserializeMealieImage(
	row: {
		name: string;
		type: string;
		base64: string;
	} | null
): MealieImageDraft | null {
	if (!row?.base64) return null;
	const binary = atob(row.base64);
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return { name: row.name, type: row.type, bytes };
}

export function serializeMealieImage(image: MealieImageDraft | null) {
	if (!image) return null;
	let binary = '';
	for (const byte of image.bytes) binary += String.fromCharCode(byte);
	return { name: image.name, type: image.type, base64: btoa(binary) };
}

export type MealieListItem = {
	slug: string;
	name: string;
};

export function mealieApiUrl(baseUrl: string, path: string) {
	return `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function mealieFetchJson(
	baseUrl: string,
	token: string,
	path: string,
	fetchFn: typeof fetch = fetch
) {
	const response = await fetchFn(mealieApiUrl(baseUrl, path), {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
	});
	if (!response.ok) {
		throw new Error(`Mealie ${response.status}`);
	}
	return response.json() as Promise<unknown>;
}

export async function mealieFetchImage(
	baseUrl: string,
	token: string,
	recipeId: string,
	fetchFn: typeof fetch = fetch
): Promise<MealieImageDraft | null> {
	const response = await fetchFn(
		mealieApiUrl(baseUrl, `/api/media/recipes/${recipeId}/images/original.webp`),
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!response.ok) return null;
	const bytes = new Uint8Array(await response.arrayBuffer());
	if (!bytes.byteLength) return null;
	return { bytes, name: 'original.webp', type: 'image/webp' };
}
