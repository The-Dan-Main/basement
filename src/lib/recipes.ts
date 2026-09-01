import type { ListItem, Recipe, RecipeIngredient, RecipeStep } from '$lib/types/app';

function itemKey(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const RECIPE_UNITS = [
	'',
	'g',
	'kg',
	'ml',
	'l',
	'tsp',
	'tbsp',
	'cup',
	'piece',
	'pinch',
	'clove',
	'slice',
	'can',
	'pack',
	'bunch'
] as const;

export type RecipeUnit = (typeof RECIPE_UNITS)[number];

export type ParsedQuantity = {
	amount: number;
	unit: string;
};

export type ListAddInput = {
	name: string;
	quantity: string;
	note: string;
	category: string;
};

export type ListAddPlan = {
	updates: { itemId: string; quantity: string; note: string; category: string }[];
	adds: ListAddInput[];
};

const UNIT_ALIASES: Record<string, string> = {
	g: 'g',
	gram: 'g',
	grams: 'g',
	gramm: 'g',
	kg: 'kg',
	kilogram: 'kg',
	kilogramm: 'kg',
	ml: 'ml',
	milliliter: 'ml',
	l: 'l',
	liter: 'l',
	litre: 'l',
	tsp: 'tsp',
	tl: 'tsp',
	tbsp: 'tbsp',
	el: 'tbsp',
	cup: 'cup',
	cups: 'cup',
	tasse: 'cup',
	tassen: 'cup',
	piece: 'piece',
	pieces: 'piece',
	stk: 'piece',
	stück: 'piece',
	stueck: 'piece',
	pinch: 'pinch',
	prise: 'pinch',
	clove: 'clove',
	zehe: 'clove',
	slice: 'slice',
	scheibe: 'slice',
	can: 'can',
	dose: 'can',
	pack: 'pack',
	packung: 'pack',
	bunch: 'bunch',
	bund: 'bunch'
};

const CONVERT_TO: Record<string, { unit: string; factor: number }> = {
	g: { unit: 'g', factor: 1 },
	kg: { unit: 'g', factor: 1000 },
	ml: { unit: 'ml', factor: 1 },
	l: { unit: 'ml', factor: 1000 }
};

export function asNumber(value: unknown, fallback = 0) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value.replace(',', '.'));
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallback;
}

export function asAmount(value: unknown): number | null {
	if (value == null || value === '') return null;
	const parsed = asNumber(value, Number.NaN);
	return Number.isFinite(parsed) ? parsed : null;
}

export function parseAmountInput(value: string): number | null {
	const trimmed = value.trim().replace(',', '.');
	if (!trimmed) return null;
	const fraction = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
	if (fraction) {
		const num = Number(fraction[1]);
		const den = Number(fraction[2]);
		if (!den) return null;
		return num / den;
	}
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

export function formatAmount(amount: number | null) {
	if (amount == null) return '';
	const rounded = Math.round(amount * 1000) / 1000;
	if (Number.isInteger(rounded)) return String(rounded);
	const fractions: [number, string][] = [
		[0.25, '1/4'],
		[0.333, '1/3'],
		[0.5, '1/2'],
		[0.666, '2/3'],
		[0.75, '3/4']
	];
	for (const [value, label] of fractions) {
		if (Math.abs(rounded - value) < 0.02) return label;
	}
	return String(Number(rounded.toFixed(2)));
}

export function formatQuantity(amount: number | null, unit: string) {
	const qty = formatAmount(amount);
	const trimmedUnit = unit.trim();
	if (qty && trimmedUnit) return `${qty} ${trimmedUnit}`;
	return qty || trimmedUnit;
}

export function scaleFactor(baseServings: number, servings: number) {
	const base = Math.max(1, asNumber(baseServings, 1));
	const next = Math.max(1, asNumber(servings, 1));
	return next / base;
}

export function scaleAmount(amount: number | null, factor: number) {
	if (amount == null) return null;
	return amount * factor;
}

export function scaleNutrition(
	recipe: Pick<Recipe, 'calories' | 'fat_g' | 'protein_g' | 'fiber_g' | 'servings'>,
	servings: number
) {
	const factor = scaleFactor(recipe.servings, servings);
	return {
		calories: asNumber(recipe.calories) * factor,
		fat_g: asNumber(recipe.fat_g) * factor,
		protein_g: asNumber(recipe.protein_g) * factor,
		fiber_g: asNumber(recipe.fiber_g) * factor
	};
}

export function nutritionPerServing(
	recipe: Pick<Recipe, 'calories' | 'fat_g' | 'protein_g' | 'fiber_g' | 'servings'>
) {
	const servings = Math.max(1, asNumber(recipe.servings, 1));
	return {
		calories: asNumber(recipe.calories) / servings,
		fat_g: asNumber(recipe.fat_g) / servings,
		protein_g: asNumber(recipe.protein_g) / servings,
		fiber_g: asNumber(recipe.fiber_g) / servings
	};
}

export function normalizeUnit(unit: string) {
	return UNIT_ALIASES[unit.trim().toLowerCase()] ?? unit.trim().toLowerCase();
}

export function parseQuantity(text: string): ParsedQuantity | null {
	const trimmed = text.trim();
	if (!trimmed) return null;
	const match = trimmed.match(/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)\s*(.*)$/);
	if (!match) return null;
	const amount = parseAmountInput(match[1] ?? '');
	if (amount == null) return null;
	return { amount, unit: (match[2] ?? '').trim() };
}

function toBase(parsed: ParsedQuantity) {
	const unit = normalizeUnit(parsed.unit);
	const convert = CONVERT_TO[unit];
	if (!convert) return { amount: parsed.amount, unit, display: parsed.unit || unit };
	return {
		amount: parsed.amount * convert.factor,
		unit: convert.unit,
		display: convert.unit
	};
}

export function mergeQuantities(existing: string, incoming: string) {
	const left = existing.trim();
	const right = incoming.trim();
	if (!left) return right;
	if (!right) return left;
	const parsedLeft = parseQuantity(left);
	const parsedRight = parseQuantity(right);
	if (!parsedLeft || !parsedRight) {
		if (left === right) return left;
		return `${left} + ${right}`;
	}
	const baseLeft = toBase(parsedLeft);
	const baseRight = toBase(parsedRight);
	if (baseLeft.unit && baseRight.unit && baseLeft.unit === baseRight.unit) {
		return formatQuantity(baseLeft.amount + baseRight.amount, baseLeft.display);
	}
	if (!baseLeft.unit && !baseRight.unit) {
		return formatQuantity(baseLeft.amount + baseRight.amount, '');
	}
	return `${left} + ${right}`;
}

export function mergeNotes(existing: string, incoming: string) {
	const left = existing.trim();
	const right = incoming.trim();
	if (!left) return right;
	if (!right || left.includes(right)) return left;
	return `${left} · ${right}`;
}

export function planRecipeListAdds(existing: ListItem[], ingredients: ListAddInput[]): ListAddPlan {
	const open = existing.filter((item) => !item.checked);
	const used = new Set<string>();
	const updates: ListAddPlan['updates'] = [];
	const adds: ListAddInput[] = [];

	for (const ingredient of ingredients) {
		const name = ingredient.name.trim();
		if (!name) continue;
		const match = open.find((item) => !used.has(item.id) && itemKey(item.name) === itemKey(name));
		if (match) {
			used.add(match.id);
			updates.push({
				itemId: match.id,
				quantity: mergeQuantities(match.quantity, ingredient.quantity),
				note: mergeNotes(match.note, ingredient.note),
				category: match.category || ingredient.category
			});
			continue;
		}
		adds.push({
			name,
			quantity: ingredient.quantity,
			note: ingredient.note,
			category: ingredient.category
		});
	}

	return { updates, adds };
}

export function scaledIngredients(ingredients: RecipeIngredient[], factor: number): ListAddInput[] {
	return [...ingredients]
		.sort((a, b) => a.sort_order - b.sort_order)
		.filter((row) => row.name.trim())
		.map((row) => ({
			name: row.name.trim(),
			quantity: formatQuantity(scaleAmount(asAmount(row.amount), factor), row.unit),
			note: row.note.trim(),
			category: row.category
		}));
}

export function toRecipeRow(recipe: Recipe) {
	const { image_url: _imageUrl, ...row } = recipe;
	return row;
}

export function hydrateRecipe(row: Recipe): Recipe {
	return {
		...row,
		servings: Math.max(1, Math.round(asNumber(row.servings, 2))),
		calories: asNumber(row.calories),
		fat_g: asNumber(row.fat_g),
		protein_g: asNumber(row.protein_g),
		fiber_g: asNumber(row.fiber_g),
		description: row.description ?? '',
		image_path: row.image_path ?? '',
		image_url: row.image_url ?? ''
	};
}

export function buildRecipeBundle(input: {
	id: string;
	householdId: string;
	userId: string;
	title: string;
	description: string;
	servings: number;
	imagePath: string;
	imageUrl?: string;
	calories: number;
	fat_g: number;
	protein_g: number;
	fiber_g: number;
	ingredients: {
		name: string;
		amount: number | null;
		unit: string;
		note: string;
		category: string;
	}[];
	steps: { instruction: string }[];
	createdAt?: string;
	updatedAt?: string;
}) {
	const now = new Date().toISOString();
	const recipe: Recipe = {
		id: input.id,
		household_id: input.householdId,
		title: input.title.trim(),
		description: input.description.trim(),
		servings: Math.max(1, Math.round(input.servings)),
		image_path: input.imagePath,
		image_url: input.imageUrl ?? '',
		calories: input.calories,
		fat_g: input.fat_g,
		protein_g: input.protein_g,
		fiber_g: input.fiber_g,
		created_by: input.userId,
		created_at: input.createdAt ?? now,
		updated_at: input.updatedAt ?? now
	};
	const ingredients: RecipeIngredient[] = input.ingredients
		.filter((row) => row.name.trim())
		.map((row, index) => ({
			id: crypto.randomUUID(),
			recipe_id: input.id,
			name: row.name.trim(),
			amount: row.amount,
			unit: row.unit.trim(),
			note: row.note.trim(),
			category: row.category,
			sort_order: index
		}));
	const steps: RecipeStep[] = input.steps
		.filter((row) => row.instruction.trim())
		.map((row, index) => ({
			id: crypto.randomUUID(),
			recipe_id: input.id,
			instruction: row.instruction.trim(),
			sort_order: index
		}));
	return { recipe, ingredients, steps };
}

export function formatNutrition(value: number, digits = 0) {
	const factor = 10 ** digits;
	return (Math.round(asNumber(value) * factor) / factor).toFixed(digits);
}

export function hydrateIngredient(row: RecipeIngredient): RecipeIngredient {
	return {
		...row,
		amount: asAmount(row.amount),
		unit: row.unit ?? '',
		note: row.note ?? '',
		category: row.category ?? '',
		sort_order: asNumber(row.sort_order)
	};
}
