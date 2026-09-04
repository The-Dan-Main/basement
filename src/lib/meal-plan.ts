import type { MealPlanEntry, Recipe, RecipeIngredient } from './types/app.ts';
import {
	collapseListAdds,
	scaleFactor,
	scaledIngredients,
	type ListAddInput
} from './recipes.ts';
import type { Locale } from './i18n/locales.ts';

export const WEEKDAY_COUNT = 7;

function pad(value: number) {
	return String(value).padStart(2, '0');
}

export function toDateKey(date: Date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string) {
	const [year, month, day] = key.split('-').map(Number);
	return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function addDays(key: string, days: number) {
	const date = parseDateKey(key);
	date.setDate(date.getDate() + days);
	return toDateKey(date);
}

export function mondayOf(date = new Date()) {
	const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	local.setDate(local.getDate() - ((local.getDay() + 6) % 7));
	return toDateKey(local);
}

export function weekDates(monday: string) {
	return Array.from({ length: WEEKDAY_COUNT }, (_, index) => addDays(monday, index));
}

export function isValidMonday(key: string) {
	return toDateKey(parseDateKey(key)) === key && parseDateKey(key).getDay() === 1;
}

export function newPublicSlug() {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 12);
}

export function nextEntrySort(entries: Pick<MealPlanEntry, 'sort_order'>[]) {
	if (entries.length === 0) return 0;
	return Math.max(...entries.map((row) => row.sort_order)) + 1;
}

export function publicRecipeUrl(slug: string, origin: string) {
	return `${origin.replace(/\/$/, '')}/r/${slug}`;
}

export function entryServings(entry: Pick<MealPlanEntry, 'servings'>, recipe: Pick<Recipe, 'servings'>) {
	return entry.servings > 0 ? entry.servings : recipe.servings;
}

export function ingredientsForEntries(
	entries: MealPlanEntry[],
	recipes: Recipe[],
	ingredients: RecipeIngredient[]
): ListAddInput[] {
	const byRecipe = new Map(recipes.map((recipe) => [recipe.id, recipe]));
	const rows: ListAddInput[] = [];
	for (const entry of entries) {
		const recipe = byRecipe.get(entry.recipe_id);
		if (!recipe) continue;
		const factor = scaleFactor(recipe.servings, entryServings(entry, recipe));
		rows.push(
			...scaledIngredients(
				ingredients.filter((row) => row.recipe_id === recipe.id),
				factor
			)
		);
	}
	return collapseListAdds(rows);
}

export function formatWeekday(key: string, locale: Locale) {
	return parseDateKey(key).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
		weekday: 'long'
	});
}

export function formatWeekdayShort(key: string, locale: Locale) {
	return parseDateKey(key).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
		weekday: 'short'
	});
}

export function formatPlanDay(key: string, locale: Locale) {
	return parseDateKey(key).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
		day: 'numeric',
		month: 'short'
	});
}

export function formatWeekRange(monday: string, locale: Locale) {
	const start = parseDateKey(monday);
	const end = parseDateKey(addDays(monday, 6));
	const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
	const loc = locale === 'de' ? 'de-DE' : 'en-GB';
	if (start.getFullYear() !== end.getFullYear()) {
		return `${start.toLocaleDateString(loc, { ...opts, year: 'numeric' })} – ${end.toLocaleDateString(loc, { ...opts, year: 'numeric' })}`;
	}
	if (start.getMonth() !== end.getMonth()) {
		return `${start.toLocaleDateString(loc, opts)} – ${end.toLocaleDateString(loc, { ...opts, year: 'numeric' })}`;
	}
	return `${start.toLocaleDateString(loc, { day: 'numeric' })}.–${end.toLocaleDateString(loc, { ...opts, year: 'numeric' })}`;
}
