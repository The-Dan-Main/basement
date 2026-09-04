import assert from 'node:assert/strict';
import test from 'node:test';
import type { MealPlanEntry, Recipe, RecipeIngredient } from './types/app.ts';
import {
	addDays,
	entryServings,
	ingredientsForEntries,
	isValidMonday,
	mondayOf,
	newPublicSlug,
	nextEntrySort,
	publicRecipeUrl,
	toDateKey,
	weekDates
} from './meal-plan.ts';

function recipe(partial: Partial<Recipe> & Pick<Recipe, 'id' | 'household_id'>): Recipe {
	return {
		title: 'Test',
		description: '',
		servings: 2,
		image_path: '',
		calories: 0,
		fat_g: 0,
		protein_g: 0,
		fiber_g: 0,
		source: '',
		source_key: '',
		is_public: false,
		public_slug: '',
		created_by: '',
		created_at: '',
		updated_at: '',
		...partial
	};
}

function ingredient(
	partial: Partial<RecipeIngredient> & Pick<RecipeIngredient, 'id' | 'recipe_id'>
): RecipeIngredient {
	return {
		name: 'Mehl',
		amount: 100,
		unit: 'g',
		note: '',
		category: '',
		sort_order: 0,
		...partial
	};
}

function entry(
	partial: Partial<MealPlanEntry> & Pick<MealPlanEntry, 'id' | 'household_id' | 'recipe_id'>
): MealPlanEntry {
	return {
		plan_date: '2026-09-07',
		servings: 0,
		sort_order: 0,
		created_by: '',
		created_at: '',
		...partial
	};
}

test('mondayOf returns Monday for midweek and Sunday', () => {
	assert.equal(mondayOf(new Date(2026, 8, 9)), '2026-09-07');
	assert.equal(mondayOf(new Date(2026, 8, 7)), '2026-09-07');
	assert.equal(mondayOf(new Date(2026, 8, 13)), '2026-09-07');
});

test('weekDates returns seven consecutive days from Monday', () => {
	const days = weekDates(mondayOf(new Date(2026, 8, 10)));
	assert.equal(days.length, 7);
	assert.equal(days[0], '2026-09-07');
	assert.equal(days[6], '2026-09-13');
});

test('addDays and toDateKey stay calendar-stable', () => {
	const monday = mondayOf(new Date(2026, 8, 9));
	assert.equal(addDays(monday, 3), '2026-09-10');
	assert.equal(toDateKey(new Date(2026, 8, 10)), '2026-09-10');
});

test('isValidMonday accepts only calendar Mondays', () => {
	assert.equal(isValidMonday('2026-09-07'), true);
	assert.equal(isValidMonday('2026-09-08'), false);
	assert.equal(isValidMonday('nope'), false);
});

test('entryServings uses recipe default when stored as 0', () => {
	const r = recipe({ id: 'r1', household_id: 'h1', servings: 4 });
	assert.equal(
		entryServings(entry({ id: 'e1', household_id: 'h1', recipe_id: 'r1', servings: 0 }), r),
		4
	);
	assert.equal(
		entryServings(entry({ id: 'e1', household_id: 'h1', recipe_id: 'r1', servings: 6 }), r),
		6
	);
});

test('ingredientsForEntries scales and collapses matching items', () => {
	const recipes = [
		recipe({ id: 'r1', household_id: 'h1', servings: 2 }),
		recipe({ id: 'r2', household_id: 'h1', servings: 4, title: 'Soup' })
	];
	const ingredients = [
		ingredient({ id: 'i1', recipe_id: 'r1', name: 'Mehl', amount: 100, unit: 'g' }),
		ingredient({ id: 'i2', recipe_id: 'r1', name: 'Milch', amount: 200, unit: 'ml' }),
		ingredient({ id: 'i3', recipe_id: 'r2', name: 'Mehl', amount: 200, unit: 'g' })
	];
	const entries = [
		entry({ id: 'e1', household_id: 'h1', recipe_id: 'r1', servings: 4 }),
		entry({ id: 'e2', household_id: 'h1', recipe_id: 'r2', servings: 4 })
	];
	const adds = ingredientsForEntries(entries, recipes, ingredients);
	const flour = adds.find((item) => item.name === 'Mehl');
	const milk = adds.find((item) => item.name === 'Milch');
	assert.equal(flour?.quantity, '400 g');
	assert.equal(milk?.quantity, '400 ml');
});

test('nextEntrySort appends after existing items', () => {
	assert.equal(nextEntrySort([]), 0);
	assert.equal(nextEntrySort([{ sort_order: 2 }, { sort_order: 0 }]), 3);
});

test('newPublicSlug is a 12-char hex token', () => {
	assert.match(newPublicSlug(), /^[0-9a-f]{12}$/);
});

test('publicRecipeUrl joins origin and slug', () => {
	assert.equal(publicRecipeUrl('abc123abc123', 'https://example.com/'), 'https://example.com/r/abc123abc123');
});
