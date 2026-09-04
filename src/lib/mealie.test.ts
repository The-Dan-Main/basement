import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mapMealieRecipe, recipesFromZipBytes } from './mealie.ts';

async function main() {
	const jsonPath = new URL('./fixtures/cremige-chicken-tomaten-pasta.json', import.meta.url);
	const zipPath = new URL('./fixtures/cremige-chicken-tomaten-pasta.zip', import.meta.url);

	const raw = JSON.parse(await readFile(jsonPath, 'utf8'));
	const recipe = mapMealieRecipe(raw);
	assert.ok(recipe);
	assert.equal(recipe.title, 'Cremige Chicken-Tomaten-Pasta');
	assert.equal(recipe.servings, 2);
	assert.equal(recipe.sourceKey, 'cremige-chicken-tomaten-pasta');
	assert.ok(
		recipe.ingredients.some(
			(row) => row.name === 'Hühnerbrust' && row.amount === 250 && row.unit === 'g'
		)
	);
	assert.ok(recipe.ingredients.some((row) => row.name === 'Knoblauch' && row.unit === 'clove'));
	assert.ok(recipe.ingredients.some((row) => row.name === 'Skyr' && row.category === 'dairy'));
	assert.ok(
		recipe.ingredients.some((row) => row.name === 'Hühnerbrust' && row.category === 'meat')
	);
	assert.equal(recipe.steps.length, 10);
	assert.equal(recipe.steps[0]?.instruction, 'Nudeln kochen');
	assert.deepEqual(recipe.cookbooks.sort(), ['Chicken', 'Leicht']);
	assert.equal(recipe.calories, 1024);
	assert.equal(recipe.protein_g, 78);
	assert.equal(recipe.createdAt, '2026-06-13');

	const fromZip = await recipesFromZipBytes(await readFile(zipPath));
	assert.equal(fromZip.length, 1);
	assert.equal(fromZip[0]?.title, recipe.title);
	assert.ok(fromZip[0]?.image);
	assert.equal(fromZip[0]?.image?.type, 'image/webp');
	assert.ok((fromZip[0]?.image?.bytes.length ?? 0) > 1000);

	console.log('mealie.test.ts ok');
}

await main();
