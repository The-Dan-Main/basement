<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ServingsStepper from '$lib/components/ServingsStepper.svelte';
	import CommentThread from '$lib/components/CommentThread.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { categoryLabel } from '$lib/categories';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill, formatDay } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import {
		listSummaries,
		memberName,
		persistListCreate,
		persistRatingUpsert,
		persistRecipeCommentAdd,
		persistRecipeCommentDelete,
		persistRecipeDelete,
		persistRecipeToList,
		persistTimelineAdd,
		persistTimelineDelete,
		recipeDetail,
		userRating
	} from '$lib/offline/sync';
	import {
		formatNutrition,
		nutritionPerServing,
		scaleFactor,
		scaledIngredients,
		scaleNutrition
	} from '$lib/recipes';
	import { nextFrontSortOrder } from '$lib/sort';
	import { btnGhost, btnPrimary, btnQuiet, fieldClass, panelClass } from '$lib/ui';
	import type { ShoppingList } from '$lib/types/app';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const detail = $derived(recipeDetail(snap, data.recipeId));
	const recipe = $derived(detail.recipe);
	const lists = $derived(listSummaries(snap));
	let servings = $state(0);
	let listId = $state('');
	let pushing = $state(false);
	let message = $state('');
	let addedListId = $state('');
	let cookedOn = $state(new Date().toISOString().slice(0, 10));
	let cookedNote = $state('');
	let cookedRating = $state(0);
	let savingCook = $state(false);
	let commentBusy = $state(false);

	$effect(() => {
		if (recipe && servings === 0) {
			servings = recipe.servings;
			listId = lists[0]?.id ?? '';
		}
	});

	const factor = $derived(recipe ? scaleFactor(recipe.servings, servings || recipe.servings) : 1);
	const scaled = $derived(scaledIngredients(detail.ingredients, factor));
	const totals = $derived(recipe ? scaleNutrition(recipe, servings || recipe.servings) : null);
	const perPerson = $derived(recipe ? nutritionPerServing(recipe) : null);
	const myRating = $derived(userRating(detail.ratings, data.user?.id ?? ''));
	const comments = $derived(
		detail.comments.map((comment) => ({
			...comment,
			author: memberName(snap, comment.user_id) || t.household.member
		}))
	);

	async function setRating(next: number) {
		if (!data.supabase || !data.user || !recipe || next < 1) return;
		await persistRatingUpsert(data.supabase, data.user.id, {
			recipe_id: recipe.id,
			user_id: data.user.id,
			rating: next,
			updated_at: nowIso()
		});
	}

	async function addCooked() {
		if (!data.supabase || !data.user || !recipe) return;
		savingCook = true;
		const rating = cookedRating >= 1 ? cookedRating : null;
		await persistTimelineAdd(data.supabase, data.user.id, {
			id: crypto.randomUUID(),
			recipe_id: recipe.id,
			household_id: recipe.household_id,
			user_id: data.user.id,
			event_type: 'cooked',
			cooked_at: new Date(`${cookedOn}T12:00:00`).toISOString(),
			rating,
			note: cookedNote.trim(),
			created_at: nowIso()
		});
		if (rating) {
			await persistRatingUpsert(data.supabase, data.user.id, {
				recipe_id: recipe.id,
				user_id: data.user.id,
				rating,
				updated_at: nowIso()
			});
		}
		cookedNote = '';
		savingCook = false;
	}

	async function removeCooked(id: string) {
		if (!data.supabase || !data.user) return;
		await persistTimelineDelete(data.supabase, data.user.id, id);
	}

	async function addComment(body: string) {
		if (!data.supabase || !data.user || !recipe) return;
		commentBusy = true;
		const now = nowIso();
		await persistRecipeCommentAdd(data.supabase, data.user.id, {
			id: crypto.randomUUID(),
			recipe_id: recipe.id,
			user_id: data.user.id,
			body,
			created_at: now,
			updated_at: now
		});
		commentBusy = false;
	}

	async function removeComment(id: string) {
		if (!data.supabase || !data.user) return;
		await persistRecipeCommentDelete(data.supabase, data.user.id, id);
	}

	async function addToList() {
		if (!data.supabase || !data.user || !recipe) return;
		const list = snap.lists.find((row) => row.id === listId);
		if (!list) return;
		pushing = true;
		message = '';
		try {
			const result = await persistRecipeToList(data.supabase, data.user.id, list, scaled);
			addedListId = list.id;
			message = fill(t.recipes.added, result);
		} catch {
			message = t.errors.generic;
		}
		pushing = false;
	}

	async function createListFromRecipe() {
		if (!data.supabase || !data.user || !recipe) return;
		pushing = true;
		message = '';
		const now = nowIso();
		const list: ShoppingList = {
			id: crypto.randomUUID(),
			household_id: recipe.household_id,
			name: recipe.title,
			emoji: '🍽️',
			sort_order: nextFrontSortOrder(lists.map((row) => row.sort_order)),
			archived_at: null,
			created_by: data.user.id,
			created_at: now,
			updated_at: now
		};
		try {
			await persistListCreate(data.supabase, data.user.id, list);
			const result = await persistRecipeToList(data.supabase, data.user.id, list, scaled);
			addedListId = list.id;
			listId = list.id;
			message = fill(t.recipes.added, result);
		} catch {
			message = t.errors.generic;
		}
		pushing = false;
	}

	async function remove() {
		if (!data.supabase || !data.user || !recipe) return;
		if (!confirm(fill(t.recipes.deleteConfirm, { name: recipe.title }))) return;
		await persistRecipeDelete(data.supabase, data.user.id, recipe.id, recipe.image_path);
		await goto(resolve('/app/recipes'));
	}
</script>

<svelte:head><title>{recipe ? `${recipe.title} · Basement` : t.recipes.title}</title></svelte:head>

{#if !recipe}
	<p class="text-fog">{t.recipes.missing}</p>
{:else}
	<div class="space-y-8">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<a class="text-sm text-gold" href={resolve('/app/recipes')}>{t.recipes.all}</a>
				<h1 class="mt-2 text-3xl font-semibold tracking-tight">{recipe.title}</h1>
				{#if recipe.description}
					<p class="mt-2 max-w-2xl text-fog">{recipe.description}</p>
				{/if}
				<div class="mt-3 flex flex-wrap items-center gap-3">
					<StarRating value={myRating} onchange={(next) => void setRating(next)} />
					<p class="text-sm text-fog">
						{detail.timeline[0]
							? fill(t.recipes.lastCooked, {
									date: formatDay(detail.timeline[0].cooked_at, i18n.locale)
								})
							: t.recipes.neverCooked}
					</p>
				</div>
				{#if detail.cookbooks.length > 0}
					<div class="mt-3 flex flex-wrap gap-2">
						{#each detail.cookbooks as cookbook (cookbook.id)}
							<a
								class="rounded-full border border-line px-3 py-1 text-sm text-gold"
								href={resolve(`/app/recipes/cookbooks/${cookbook.id}`)}>{cookbook.title}</a
							>
						{/each}
					</div>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				<a class={btnGhost} href={resolve(`/app/recipes/${recipe.id}/edit`)}>{t.recipes.edit}</a>
				<button class={btnQuiet} type="button" onclick={() => void remove()}
					>{t.recipes.delete}</button
				>
			</div>
		</div>

		{#if recipe.image_url}
			<img src={recipe.image_url} alt="" class="max-h-80 w-full rounded-3xl object-cover" />
		{/if}

		<section class="flex flex-wrap items-center justify-between gap-3">
			<ServingsStepper bind:value={servings} />
			<p class="text-sm text-fog">{t.recipes.servingsHelp}</p>
		</section>

		{#if totals && perPerson}
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
		{/if}

		<section class="space-y-3">
			<h2 class="text-lg font-semibold">{t.recipes.ingredients}</h2>
			<ul class="space-y-2">
				{#each scaled as item, index (detail.ingredients[index]?.id ?? item.name)}
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

		{#if detail.steps.length > 0}
			<section class="space-y-3">
				<h2 class="text-lg font-semibold">{t.recipes.steps}</h2>
				<ol class="space-y-3">
					{#each detail.steps as step, index (step.id)}
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

		<section class={[panelClass, 'space-y-4 p-5']}>
			<h2 class="text-lg font-semibold">{t.recipes.addToList}</h2>
			{#if lists.length > 0}
				<label class="block space-y-2 text-sm">
					<span>{t.recipes.chooseList}</span>
					<select class={fieldClass} bind:value={listId}>
						{#each lists as list (list.id)}
							<option value={list.id}>{list.emoji} {list.name}</option>
						{/each}
					</select>
				</label>
				<div class="flex flex-wrap gap-2">
					<button
						class={btnPrimary}
						disabled={pushing || !listId}
						type="button"
						onclick={() => void addToList()}
					>
						{pushing ? t.recipes.pushing : t.recipes.push}
					</button>
					<button
						class={btnGhost}
						disabled={pushing}
						type="button"
						onclick={() => void createListFromRecipe()}
					>
						{t.recipes.newList}
					</button>
				</div>
			{:else}
				<p class="text-sm text-fog">{t.recipes.noLists}</p>
				<button
					class={btnPrimary}
					disabled={pushing}
					type="button"
					onclick={() => void createListFromRecipe()}
				>
					{t.recipes.newList}
				</button>
			{/if}
			{#if message}
				<p class="text-sm text-mint">{message}</p>
			{/if}
			{#if addedListId}
				<a class="text-sm font-semibold text-gold" href={resolve(`/app/lists/${addedListId}`)}>
					{t.recipes.openList}
				</a>
			{/if}
		</section>

		<section class={[panelClass, 'space-y-4 p-5']}>
			<h2 class="text-lg font-semibold">{t.recipes.cooked}</h2>
			<label class="block space-y-2 text-sm">
				<span>{t.recipes.cookedWhen}</span>
				<input class={fieldClass} type="date" bind:value={cookedOn} />
			</label>
			<div class="space-y-2">
				<p class="text-sm">{t.recipes.rating}</p>
				<StarRating bind:value={cookedRating} />
			</div>
			<label class="block space-y-2 text-sm">
				<span>{t.recipes.cookedNote}</span>
				<textarea class={[fieldClass, 'min-h-20']} bind:value={cookedNote}></textarea>
			</label>
			<button
				class={btnPrimary}
				disabled={savingCook}
				type="button"
				onclick={() => void addCooked()}
			>
				{savingCook ? t.recipes.cookedSaving : t.recipes.cookedSave}
			</button>
			{#if detail.timeline.length > 0}
				<ol class="space-y-2">
					{#each detail.timeline as event (event.id)}
						<li class="rounded-2xl border border-line px-4 py-3">
							<p class="text-sm font-semibold">
								{formatDay(event.cooked_at, i18n.locale)}
								{#if memberName(snap, event.user_id)}
									· {memberName(snap, event.user_id)}
								{/if}
							</p>
							{#if event.rating}
								<StarRating value={event.rating} readonly />
							{/if}
							{#if event.note}
								<p class="mt-1 text-sm text-fog">{event.note}</p>
							{/if}
							{#if event.user_id === data.user?.id}
								<button
									class="mt-2 text-sm font-semibold text-coral"
									type="button"
									onclick={() => void removeCooked(event.id)}>{t.recipes.delete}</button
								>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		{#if data.user}
			<CommentThread
				{comments}
				userId={data.user.id}
				submitting={commentBusy}
				onsubmit={(body) => void addComment(body)}
				ondelete={(id) => void removeComment(id)}
			/>
		{/if}
	</div>
{/if}
