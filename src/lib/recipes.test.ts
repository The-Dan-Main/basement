import assert from 'node:assert/strict';
import {
	formatAmount,
	formatQuantity,
	mergeNotes,
	mergeQuantities,
	parseAmountInput,
	parseQuantity,
	planRecipeListAdds,
	scaleAmount,
	scaleFactor,
	scaleNutrition,
	scaledIngredients
} from './recipes.ts';

assert.equal(parseAmountInput('1/2'), 0.5);
assert.equal(parseAmountInput('1,5'), 1.5);
assert.equal(parseAmountInput(''), null);
assert.equal(formatAmount(0.5), '1/2');
assert.equal(formatAmount(2), '2');
assert.equal(formatAmount(1.25), '1.25');
assert.equal(formatQuantity(400, 'g'), '400 g');
assert.equal(formatQuantity(null, 'pinch'), 'pinch');
assert.equal(scaleFactor(2, 4), 2);
assert.equal(scaleAmount(100, 2), 200);
assert.equal(scaleAmount(null, 2), null);

const nutrition = scaleNutrition(
	{ servings: 2, calories: 600, fat_g: 20, protein_g: 40, fiber_g: 10 },
	4
);
assert.deepEqual(nutrition, { calories: 1200, fat_g: 40, protein_g: 80, fiber_g: 20 });

assert.deepEqual(parseQuantity('400 g'), { amount: 400, unit: 'g' });
assert.equal(mergeQuantities('400 g', '200 g'), '600 g');
assert.equal(mergeQuantities('1 kg', '250 g'), '1250 g');
assert.equal(mergeQuantities('1 l', '250 ml'), '1250 ml');
assert.equal(mergeQuantities('2', '3'), '5');
assert.equal(mergeQuantities('1 bunch', '2 tbsp'), '1 bunch + 2 tbsp');
assert.equal(mergeQuantities('', '200 g'), '200 g');
assert.equal(mergeNotes('organic', 'ripe'), 'organic · ripe');
assert.equal(mergeNotes('organic', 'organic'), 'organic');

const plan = planRecipeListAdds(
	[
		{
			id: 'milk',
			list_id: 'list',
			name: 'Milk',
			quantity: '500 ml',
			note: '',
			category: 'dairy',
			checked: false,
			checked_at: null,
			checked_by: null,
			sort_order: 0,
			created_by: 'u',
			created_at: '',
			updated_at: ''
		}
	],
	[
		{ name: 'milk', quantity: '250 ml', note: 'whole', category: 'dairy' },
		{ name: 'Oats', quantity: '80 g', note: '', category: 'pantry' }
	]
);
assert.equal(plan.updates.length, 1);
assert.equal(plan.updates[0]?.quantity, '750 ml');
assert.equal(plan.updates[0]?.note, 'whole');
assert.deepEqual(
	plan.adds.map((row) => row.name),
	['Oats']
);

const scaled = scaledIngredients(
	[
		{
			id: '1',
			recipe_id: 'r',
			name: 'Flour',
			amount: 200,
			unit: 'g',
			note: '',
			category: 'bakery',
			sort_order: 0
		}
	],
	0.5
);
assert.deepEqual(scaled, [{ name: 'Flour', quantity: '100 g', note: '', category: 'bakery' }]);

console.log('recipes.test.ts ok');
