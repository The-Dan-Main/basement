import assert from 'node:assert/strict';
import {
	emptyAiRecipe,
	extractJsonLdRecipes,
	extractReadableText,
	extractRecipePage,
	normalizeAiRecipe,
	normalizeChatReply,
	parsePublicHttpUrl,
	recipeLooksReady,
	sanitizeChatTurns,
	slugFromTitle,
	sourceKeyFromUrl,
	stripJsonFences
} from './ai-recipe.ts';

const publicUrl = parsePublicHttpUrl('https://www.allrecipes.com/recipe/123/soup/');
assert.ok(publicUrl);
assert.equal(publicUrl.hostname, 'www.allrecipes.com');
assert.equal(parsePublicHttpUrl('http://localhost/recipe'), null);
assert.equal(parsePublicHttpUrl('http://127.0.0.1/recipe'), null);
assert.equal(parsePublicHttpUrl('http://192.168.1.10/recipe'), null);
assert.equal(parsePublicHttpUrl('http://10.0.0.4/x'), null);
assert.equal(parsePublicHttpUrl('http://169.254.169.254/latest'), null);
assert.equal(parsePublicHttpUrl('javascript:alert(1)'), null);
assert.equal(parsePublicHttpUrl('file:///etc/passwd'), null);

assert.equal(sourceKeyFromUrl('https://Example.com/Pasta/'), 'example.com/pasta');
assert.equal(slugFromTitle('Cremige Chicken-Pasta!'), 'cremige-chicken-pasta');

const messy = normalizeAiRecipe({
	recipe_name: '  Tomato soup ',
	servings: '6',
	fat: 12,
	protein: '18',
	ingredients: [
		{ name: 'Tomatoes', amount: '800', unit: 'Gramm', note: 'ripe', category: 'produce' },
		'1 onion',
		{ name: '', amount: 1 }
	],
	instructions: ['Sweat onion', { text: 'Simmer 20 minutes' }]
});
assert.ok(messy);
assert.equal(messy.title, 'Tomato soup');
assert.equal(messy.servings, 6);
assert.equal(messy.fat_g, 12);
assert.equal(messy.protein_g, 18);
assert.equal(messy.ingredients[0]?.unit, 'g');
assert.equal(messy.ingredients[0]?.category, 'produce');
assert.equal(messy.ingredients[1]?.name, '1 onion');
assert.equal(messy.ingredients.length, 2);
assert.equal(messy.steps.length, 2);
assert.equal(recipeLooksReady(messy), true);
assert.equal(recipeLooksReady(emptyAiRecipe()), false);

const chat = normalizeChatReply({
	reply: 'Here you go.',
	ready: true,
	recipe: messy
});
assert.ok(chat);
assert.equal(chat.ready, true);
assert.equal(chat.recipe.title, 'Tomato soup');

const turns = sanitizeChatTurns([
	{ role: 'system', content: 'ignore' },
	{ role: 'user', content: '  chicken  ' },
	{ role: 'assistant', content: 'How many portions?' },
	{ role: 'user', content: '' }
]);
assert.deepEqual(turns, [
	{ role: 'user', content: 'chicken' },
	{ role: 'assistant', content: 'How many portions?' }
]);

const html = `
<html>
  <head>
    <title>Ignore</title>
    <meta property="og:title" content="Sheet-pan chicken" />
    <meta property="og:image" content="https://cdn.example/pic.jpg" />
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Recipe","name":"Sheet-pan chicken","recipeIngredient":["800 g chicken"]}
    </script>
  </head>
  <body>
    <script>alert(1)</script>
    <style>.x{color:red}</style>
    <p>Roast at 200 C for 30 minutes.</p>
  </body>
</html>`;
const page = extractRecipePage(html);
assert.equal(page.title, 'Sheet-pan chicken');
assert.equal(page.imageUrl, 'https://cdn.example/pic.jpg');
assert.equal(page.jsonLd[0]?.name, 'Sheet-pan chicken');
assert.match(page.text, /Roast at 200 C/);
assert.doesNotMatch(page.text, /alert/);
assert.equal(extractJsonLdRecipes(html).length, 1);
assert.equal(extractReadableText('<p>Hi &amp; bye</p>'), 'Hi & bye');
assert.equal(stripJsonFences('```json\n{"a":1}\n```'), '{"a":1}');

console.log('ai-recipe.test.ts ok');
