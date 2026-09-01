<script lang="ts">
	import CategorySelect from '$lib/components/CategorySelect.svelte';
	import ServingsStepper from '$lib/components/ServingsStepper.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { RECIPE_UNITS } from '$lib/recipes';
	import { btnGhost, btnPrimary, fieldClass, panelClass } from '$lib/ui';
	import type { Recipe, RecipeIngredient, RecipeStep } from '$lib/types/app';
	import { untrack } from 'svelte';

	export type IngredientDraft = {
		key: string;
		name: string;
		amount: string;
		unit: string;
		note: string;
		category: string;
	};

	export type StepDraft = {
		key: string;
		instruction: string;
	};

	export type RecipeFormValue = {
		title: string;
		description: string;
		servings: number;
		calories: string;
		fat_g: string;
		protein_g: string;
		fiber_g: string;
		ingredients: IngredientDraft[];
		steps: StepDraft[];
		file: File | null;
		removeImage: boolean;
	};

	let {
		recipe = null,
		ingredients = [],
		steps = [],
		saving = false,
		error = '',
		onsave
	}: {
		recipe?: Recipe | null;
		ingredients?: RecipeIngredient[];
		steps?: RecipeStep[];
		saving?: boolean;
		error?: string;
		onsave: (value: RecipeFormValue) => void;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);

	function blankIngredient(): IngredientDraft {
		return {
			key: crypto.randomUUID(),
			name: '',
			amount: '',
			unit: 'g',
			note: '',
			category: ''
		};
	}

	function blankStep(): StepDraft {
		return { key: crypto.randomUUID(), instruction: '' };
	}

	const seed = untrack(() => ({
		title: recipe?.title ?? '',
		description: recipe?.description ?? '',
		servings: recipe?.servings ?? 2,
		calories: recipe ? String(recipe.calories || '') : '',
		fat: recipe ? String(recipe.fat_g || '') : '',
		protein: recipe ? String(recipe.protein_g || '') : '',
		fiber: recipe ? String(recipe.fiber_g || '') : '',
		ingredients: ingredients.length
			? ingredients.map((row) => ({
					key: row.id,
					name: row.name,
					amount: row.amount == null ? '' : String(row.amount),
					unit: row.unit,
					note: row.note,
					category: row.category
				}))
			: [blankIngredient()],
		steps: steps.length
			? steps.map((row) => ({ key: row.id, instruction: row.instruction }))
			: [blankStep()],
		preview: recipe?.image_url || ''
	}));

	let title = $state(seed.title);
	let description = $state(seed.description);
	let servings = $state(seed.servings);
	let calories = $state(seed.calories);
	let fat = $state(seed.fat);
	let protein = $state(seed.protein);
	let fiber = $state(seed.fiber);
	let ingredientRows = $state<IngredientDraft[]>(seed.ingredients);
	let stepRows = $state<StepDraft[]>(seed.steps);
	let file = $state<File | null>(null);
	let removeImage = $state(false);
	let preview = $state(seed.preview);

	function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const next = input.files?.[0] ?? null;
		file = next;
		removeImage = false;
		if (next) preview = URL.createObjectURL(next);
	}

	function clearPhoto() {
		file = null;
		removeImage = true;
		preview = '';
	}

	function submit() {
		onsave({
			title,
			description,
			servings,
			calories,
			fat_g: fat,
			protein_g: protein,
			fiber_g: fiber,
			ingredients: ingredientRows,
			steps: stepRows,
			file,
			removeImage
		});
	}
</script>

<form
	class="space-y-8"
	onsubmit={(event) => {
		event.preventDefault();
		submit();
	}}
>
	<section class="space-y-4">
		<label class="block space-y-2 text-sm">
			<span>{t.recipes.titleLabel}</span>
			<input
				class={fieldClass}
				bind:value={title}
				placeholder={t.recipes.titlePlaceholder}
				maxlength="120"
				required
			/>
		</label>
		<label class="block space-y-2 text-sm">
			<span>{t.recipes.description}</span>
			<textarea
				class={[fieldClass, 'min-h-24']}
				bind:value={description}
				placeholder={t.recipes.descriptionPlaceholder}></textarea>
		</label>
		<div class="space-y-2">
			<p class="text-sm">{t.recipes.servings}</p>
			<ServingsStepper bind:value={servings} />
			<p class="text-sm text-fog">{t.recipes.servingsHelp}</p>
		</div>
	</section>

	<section class={[panelClass, 'space-y-3 p-5']}>
		<p class="font-semibold">{t.recipes.photo}</p>
		<p class="text-sm text-fog">{t.recipes.photoHelp}</p>
		{#if preview}
			<img src={preview} alt="" class="max-h-64 w-full rounded-2xl object-cover" />
		{/if}
		<div class="flex flex-wrap gap-2">
			<label class={[btnGhost, 'cursor-pointer']}>
				{preview ? t.recipes.photoReplace : t.recipes.photo}
				<input
					class="sr-only"
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					onchange={onFile}
				/>
			</label>
			{#if preview}
				<button class={btnGhost} type="button" onclick={clearPhoto}>{t.recipes.photoRemove}</button>
			{/if}
		</div>
	</section>

	<section class="space-y-3">
		<div>
			<h2 class="text-lg font-semibold">{t.recipes.nutrition}</h2>
			<p class="mt-1 text-sm text-fog">{t.recipes.nutritionHelp}</p>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<label class="block space-y-2 text-sm">
				<span>{t.recipes.calories} ({t.recipes.kcal})</span>
				<input class={fieldClass} type="number" min="0" step="any" bind:value={calories} />
			</label>
			<label class="block space-y-2 text-sm">
				<span>{t.recipes.fat} ({t.recipes.grams})</span>
				<input class={fieldClass} type="number" min="0" step="any" bind:value={fat} />
			</label>
			<label class="block space-y-2 text-sm">
				<span>{t.recipes.protein} ({t.recipes.grams})</span>
				<input class={fieldClass} type="number" min="0" step="any" bind:value={protein} />
			</label>
			<label class="block space-y-2 text-sm">
				<span>{t.recipes.fiber} ({t.recipes.grams})</span>
				<input class={fieldClass} type="number" min="0" step="any" bind:value={fiber} />
			</label>
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">{t.recipes.ingredients}</h2>
		{#each ingredientRows as row (row.key)}
			<div class={[panelClass, 'space-y-3 p-4']}>
				<input class={fieldClass} placeholder={t.recipes.ingredient} bind:value={row.name} />
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-[7rem_8rem_1fr]">
					<input class={fieldClass} placeholder={t.recipes.amount} bind:value={row.amount} />
					<select class={fieldClass} bind:value={row.unit} aria-label={t.recipes.unit}>
						{#each RECIPE_UNITS as unit (unit || 'none')}
							<option value={unit}>{unit ? t.recipes.units[unit] : t.recipes.units.none}</option>
						{/each}
					</select>
					<input class={fieldClass} placeholder={t.items.note} bind:value={row.note} />
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<div class="min-w-40 flex-1">
						<CategorySelect bind:value={row.category} id={`aisle-${row.key}`} />
					</div>
					<button
						class="text-sm font-semibold text-coral"
						type="button"
						onclick={() => (ingredientRows = ingredientRows.filter((item) => item.key !== row.key))}
					>
						{t.recipes.remove}
					</button>
				</div>
			</div>
		{/each}
		<button
			class={btnGhost}
			type="button"
			onclick={() => (ingredientRows = [...ingredientRows, blankIngredient()])}
		>
			{t.recipes.addIngredient}
		</button>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">{t.recipes.steps}</h2>
		{#each stepRows as row, index (row.key)}
			<div class="space-y-2">
				<label class="block space-y-2 text-sm">
					<span>{fill(t.recipes.step, { n: index + 1 })}</span>
					<textarea
						class={[fieldClass, 'min-h-24']}
						placeholder={t.recipes.stepPlaceholder}
						bind:value={row.instruction}></textarea>
				</label>
				<button
					class="text-sm font-semibold text-coral"
					type="button"
					onclick={() => (stepRows = stepRows.filter((item) => item.key !== row.key))}
				>
					{t.recipes.remove}
				</button>
			</div>
		{/each}
		<button class={btnGhost} type="button" onclick={() => (stepRows = [...stepRows, blankStep()])}>
			{t.recipes.addStep}
		</button>
	</section>

	{#if error}
		<p class="text-sm text-coral">{error}</p>
	{/if}

	<button class={btnPrimary} disabled={saving || !title.trim()} type="submit">
		{saving ? t.recipes.saving : t.recipes.save}
	</button>
</form>
