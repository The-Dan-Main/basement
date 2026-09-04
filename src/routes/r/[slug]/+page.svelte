<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import ServingsStepper from '$lib/components/ServingsStepper.svelte';
	import { categoryLabel } from '$lib/categories';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill, formatDay } from '$lib/i18n/locales';
	import { publicRecipeUrl } from '$lib/meal-plan';
	import {
		formatNutrition,
		nutritionPerServing,
		scaleFactor,
		scaledIngredients,
		scaleNutrition
	} from '$lib/recipes';
	import { btnPrimary, fieldClass, labelClass, panelClass } from '$lib/ui';

	let { data, form } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const recipe = $derived(data.recipe);
	let servings = $state(0);

	$effect(() => {
		if (recipe && servings === 0) servings = recipe.servings;
	});

	const factor = $derived(scaleFactor(recipe.servings, servings || recipe.servings));
	const scaled = $derived(scaledIngredients(data.ingredients, factor));
	const totals = $derived(scaleNutrition(recipe, servings || recipe.servings));
	const perPerson = $derived(nutritionPerServing(recipe));
	const shareUrl = $derived(publicRecipeUrl(recipe.public_slug, data.origin));
	const formText = $derived(i18n.errorText(form));
	const image = $derived(data.imageUrl || recipe.image_url || '');
</script>

<svelte:head>
	<title>{recipe.title} · Basement</title>
	<meta name="description" content={recipe.description || t.recipes.fromBasement} />
	<meta property="og:title" content={recipe.title} />
	<meta property="og:description" content={recipe.description || t.recipes.fromBasement} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content={shareUrl} />
	{#if image}
		<meta property="og:image" content={image} />
		<meta name="twitter:card" content="summary_large_image" />
	{/if}
</svelte:head>

<div class="min-h-dvh bg-ink">
	<header
		class="sticky top-0 z-20 border-b border-line/80 bg-ink/85 px-4 py-3 backdrop-blur-md md:px-6"
		style="padding-top: max(0.75rem, env(safe-area-inset-top))"
	>
		<div class="mx-auto flex max-w-3xl items-center justify-between gap-3">
			<a href={resolve('/')} class="text-paper"><Logo /></a>
			<LanguageSwitcher />
		</div>
	</header>

	<main class="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-6">
		<p class="text-xs tracking-[0.18em] text-gold uppercase">{t.recipes.fromBasement}</p>
		<div>
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{recipe.title}</h1>
			{#if recipe.description}
				<p class="mt-3 max-w-2xl text-lg leading-7 text-fog">{recipe.description}</p>
			{/if}
		</div>

		{#if image}
			<img src={image} alt="" class="max-h-96 w-full rounded-3xl object-cover" />
		{/if}

		<section class="flex flex-wrap items-center justify-between gap-3">
			<ServingsStepper bind:value={servings} />
			<p class="text-sm text-fog">{t.recipes.servingsHelp}</p>
		</section>

		<section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each [{ label: t.recipes.calories, value: formatNutrition(totals.calories), unit: t.recipes.kcal, each: formatNutrition(perPerson.calories) }, { label: t.recipes.fat, value: formatNutrition(totals.fat_g, 1), unit: t.recipes.grams, each: formatNutrition(perPerson.fat_g, 1) }, { label: t.recipes.protein, value: formatNutrition(totals.protein_g, 1), unit: t.recipes.grams, each: formatNutrition(perPerson.protein_g, 1) }, { label: t.recipes.fiber, value: formatNutrition(totals.fiber_g, 1), unit: t.recipes.grams, each: formatNutrition(perPerson.fiber_g, 1) }] as card (card.label)}
				<div class={[panelClass, 'p-4']}>
					<p class="text-xs tracking-[0.16em] text-fog uppercase">{card.label}</p>
					<p class="mt-2 text-2xl font-semibold">
						{card.value} <span class="text-sm text-fog">{card.unit}</span>
					</p>
					<p class="mt-1 text-xs text-fog">
						{t.recipes.perPerson}: {card.each}
						{card.unit}
					</p>
				</div>
			{/each}
		</section>

		<section class="space-y-3">
			<h2 class="text-lg font-semibold">{t.recipes.ingredients}</h2>
			<ul class="space-y-2">
				{#each scaled as item, index (data.ingredients[index]?.id ?? item.name)}
					<li class={[panelClass, 'flex items-start justify-between gap-3 p-4']}>
						<div>
							<p class="font-medium">{item.name}</p>
							{#if item.note}
								<p class="text-sm text-fog">{item.note}</p>
							{/if}
							{#if item.category}
								<p class="mt-1 text-xs tracking-[0.14em] text-fog uppercase">
									{categoryLabel(t.categories, item.category)}
								</p>
							{/if}
						</div>
						{#if item.quantity}
							<p class="shrink-0 font-semibold text-gold">{item.quantity}</p>
						{/if}
					</li>
				{/each}
			</ul>
		</section>

		{#if data.steps.length > 0}
			<section class="space-y-3">
				<h2 class="text-lg font-semibold">{t.recipes.steps}</h2>
				<ol class="space-y-3">
					{#each data.steps as step, index (step.id)}
						<li class={[panelClass, 'p-4']}>
							<p class="text-xs tracking-[0.16em] text-gold uppercase">
								{fill(t.recipes.step, { n: index + 1 })}
							</p>
							<p class="mt-2 leading-6">{step.instruction}</p>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<section class="space-y-3">
			<h2 class="text-lg font-semibold">{t.recipes.guestComment}</h2>
			<form class="space-y-3" method="POST" use:enhance>
				<div class="sr-only" aria-hidden="true">
					<label>
						website
						<input name="website" tabindex="-1" autocomplete="off" />
					</label>
				</div>
				<label class={labelClass}>
					<span>{t.recipes.guestName}</span>
					<input class={fieldClass} name="author" maxlength="40" required autocomplete="name" />
				</label>
				<label class={labelClass}>
					<span>{t.recipes.guestComment}</span>
					<textarea
						class={[fieldClass, 'min-h-24']}
						name="body"
						maxlength="2000"
						required
						placeholder={t.recipes.commentPlaceholder}
					></textarea>
				</label>
				{#if formText}
					<p class="text-sm text-coral">{formText}</p>
				{:else if form?.ok}
					<p class="text-sm text-mint">{t.recipes.guestCommentThanks}</p>
				{/if}
				<button class={btnPrimary} type="submit">{t.recipes.guestCommentAdd}</button>
			</form>
			{#if data.comments.length === 0}
				<p class="text-sm text-fog">{t.recipes.guestCommentEmpty}</p>
			{:else}
				<ul class="space-y-2">
					{#each data.comments as comment (comment.id)}
						<li class={[panelClass, 'p-4']}>
							<div class="flex items-start justify-between gap-3">
								<p class="text-sm font-semibold">{comment.author_name}</p>
								<p class="text-xs text-fog">{formatDay(comment.created_at, i18n.locale)}</p>
							</div>
							<p class="mt-2 leading-6">{comment.body}</p>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</main>
</div>
