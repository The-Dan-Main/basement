<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import RecipeSubnav from '$lib/components/RecipeSubnav.svelte';
	import ServingsStepper from '$lib/components/ServingsStepper.svelte';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import {
		addDays,
		entryServings,
		formatPlanDay,
		formatWeekday,
		formatWeekRange,
		ingredientsForEntries,
		isValidMonday,
		mondayOf,
		nextEntrySort,
		toDateKey,
		weekDates
	} from '$lib/meal-plan';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import {
		listSummaries,
		mealPlanForRange,
		persistMealPlanDelete,
		persistMealPlanUpsert,
		persistRecipeToList,
		recipesForHousehold
	} from '$lib/offline/sync';
	import { btnGhost, btnPrimary, btnQuiet, fieldClass, panelClass, selectClass } from '$lib/ui';
	import type { MealPlanEntry, Recipe } from '$lib/types/app';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	const recipes = $derived(recipesForHousehold(snap, household?.id));
	const lists = $derived(listSummaries(snap));
	const today = toDateKey(new Date());
	const thisMonday = mondayOf();
	const weekParam = $derived(page.url.searchParams.get('week') ?? '');
	const monday = $derived(isValidMonday(weekParam) ? weekParam : thisMonday);
	const days = $derived(weekDates(monday));
	const entries = $derived(
		household ? mealPlanForRange(snap, household.id, days[0] ?? monday, days[6] ?? monday) : []
	);
	const byDay = $derived.by(() => {
		const map = new Map<string, MealPlanEntry[]>();
		for (const day of days) map.set(day, []);
		for (const entry of entries) {
			const list = map.get(entry.plan_date);
			if (list) list.push(entry);
		}
		return map;
	});
	const recipeById = $derived(new Map(recipes.map((recipe) => [recipe.id, recipe])));

	let listId = $state('');
	let pushing = $state('');
	let message = $state('');
	let addedListId = $state('');
	let openDay = $state('');
	let query = $state('');
	let busyId = $state('');

	$effect(() => {
		if (!listId && lists[0]) listId = lists[0].id;
	});

	const matches = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const pool = recipes;
		if (!q) return pool.slice(0, 12);
		return pool
			.filter(
				(recipe) =>
					recipe.title.toLowerCase().includes(q) || recipe.description.toLowerCase().includes(q)
			)
			.slice(0, 12);
	});

	function goWeek(nextMonday: string) {
		const href = resolve('/app/recipes/plan');
		void goto(nextMonday === thisMonday ? href : `${href}?week=${nextMonday}`);
	}

	function recipeOf(entry: MealPlanEntry): Recipe | undefined {
		return recipeById.get(entry.recipe_id);
	}

	async function addRecipe(day: string, recipe: Recipe) {
		if (!data.supabase || !data.user || !household) return;
		const existing = byDay.get(day) ?? [];
		const row: MealPlanEntry = {
			id: crypto.randomUUID(),
			household_id: household.id,
			recipe_id: recipe.id,
			plan_date: day,
			servings: 0,
			sort_order: nextEntrySort(existing),
			created_by: data.user.id,
			created_at: nowIso()
		};
		await persistMealPlanUpsert(data.supabase, data.user.id, row);
		openDay = '';
		query = '';
	}

	async function setServings(entry: MealPlanEntry, recipe: Recipe, next: number) {
		if (!data.supabase || !data.user) return;
		busyId = entry.id;
		await persistMealPlanUpsert(data.supabase, data.user.id, {
			...entry,
			servings: next || recipe.servings
		});
		busyId = '';
	}

	async function remove(entryId: string) {
		if (!data.supabase || !data.user) return;
		busyId = entryId;
		await persistMealPlanDelete(data.supabase, data.user.id, entryId);
		busyId = '';
	}

	async function pushEntries(kind: string, rows: MealPlanEntry[]) {
		if (!data.supabase || !data.user || rows.length === 0) return;
		const list = snap.lists.find((row) => row.id === listId);
		if (!list) return;
		pushing = kind;
		message = '';
		try {
			const result = await persistRecipeToList(
				data.supabase,
				data.user.id,
				list,
				ingredientsForEntries(rows, snap.recipes, snap.recipeIngredients)
			);
			addedListId = list.id;
			message = fill(t.recipes.added, result);
		} catch {
			message = t.errors.generic;
		}
		pushing = '';
	}

	function toggleDay(day: string) {
		if (openDay === day) {
			openDay = '';
			query = '';
			return;
		}
		openDay = day;
		query = '';
	}
</script>

<svelte:head><title>{t.plan.title}</title></svelte:head>

<div class="space-y-8">
	<RecipeSubnav />
	<section class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{t.plan.heading}</h1>
			<p class="mt-2 text-sm text-fog">{t.plan.emptyWeek}</p>
		</div>
		<button class={btnGhost} type="button" onclick={() => goWeek(thisMonday)}>{t.plan.thisWeek}</button>
	</section>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<button class={btnQuiet} type="button" onclick={() => goWeek(addDays(monday, -7))}>
			← {t.plan.prev}
		</button>
		<p class="text-center text-sm font-semibold sm:text-base">
			{fill(t.plan.weekOf, { range: formatWeekRange(monday, i18n.locale) })}
		</p>
		<button class={btnQuiet} type="button" onclick={() => goWeek(addDays(monday, 7))}>
			{t.plan.next} →
		</button>
	</div>

	{#if !household}
		<section class={[panelClass, 'p-6']}>
			<p class="text-sm text-fog">{t.plan.noRecipes}</p>
		</section>
	{:else if recipes.length === 0}
		<section class={[panelClass, 'p-6']}>
			<p class="font-semibold">{t.plan.noRecipes}</p>
			<a class={['mt-3 inline-flex', btnPrimary]} href={resolve('/app/recipes/new')}>{t.recipes.new}</a>
		</section>
	{:else}
		<ol class="space-y-3">
			{#each days as day (day)}
				{@const dayEntries = byDay.get(day) ?? []}
				<li class={[panelClass, 'overflow-hidden', day === today && 'ring-1 ring-gold/40']}>
					<div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
						<div>
							<p class="text-xs tracking-[0.16em] text-fog uppercase">
								{formatWeekday(day, i18n.locale)}
								{#if day === today}
									· {t.plan.today}
								{/if}
							</p>
							<p class="mt-1 font-semibold">{formatPlanDay(day, i18n.locale)}</p>
						</div>
						<div class="flex flex-wrap gap-2">
							{#if dayEntries.length > 0}
								<button
									class={btnQuiet}
									disabled={pushing !== '' || !listId}
									type="button"
									onclick={() => void pushEntries(day, dayEntries)}
								>
									{pushing === day ? t.plan.pushing : t.plan.toListDay}
								</button>
							{/if}
							<button class={btnGhost} type="button" onclick={() => toggleDay(day)}>
								{t.plan.add}
							</button>
						</div>
					</div>
					<div class="space-y-3 p-5">
						{#if dayEntries.length === 0}
							<p class="text-sm text-fog">{t.plan.emptyDay}</p>
						{:else}
							<ul class="space-y-3">
								{#each dayEntries as entry (entry.id)}
									{@const recipe = recipeOf(entry)}
									{#if recipe}
										<li class="rounded-2xl border border-line bg-ink-soft p-4">
											<div class="flex flex-wrap items-start justify-between gap-3">
												<a
													class="min-w-0 font-semibold text-gold hover:underline"
													href={resolve(`/app/recipes/${recipe.id}`)}>{recipe.title}</a
												>
												<button
													class="text-sm font-semibold text-coral"
													disabled={busyId === entry.id}
													type="button"
													onclick={() => void remove(entry.id)}>{t.plan.remove}</button
												>
											</div>
											<div class="mt-3 flex flex-wrap items-center gap-3">
												<ServingsStepper
													value={entryServings(entry, recipe)}
													onchange={(next) => void setServings(entry, recipe, next)}
												/>
												<p class="text-xs text-fog">{t.plan.servingsHelp}</p>
											</div>
										</li>
									{/if}
								{/each}
							</ul>
						{/if}
						{#if openDay === day}
							<div class="space-y-3 rounded-2xl border border-line p-4">
								<p class="text-sm font-semibold">{t.plan.pickRecipe}</p>
								<input
									class={fieldClass}
									type="search"
									placeholder={t.plan.search}
									bind:value={query}
								/>
								{#if matches.length === 0}
									<p class="text-sm text-fog">{t.plan.searchEmpty}</p>
								{:else}
									<ul class="space-y-2">
										{#each matches as recipe (recipe.id)}
											<li>
												<button
													class="w-full rounded-2xl border border-line px-4 py-3 text-left hover:border-gold/40"
													type="button"
													onclick={() => void addRecipe(day, recipe)}
												>
													<span class="font-medium">{recipe.title}</span>
													<span class="mt-1 block text-xs text-fog"
														>{fill(t.recipes.people, { count: recipe.servings })}</span
													>
												</button>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ol>

		<section class={[panelClass, 'space-y-4 p-5']}>
			<h2 class="text-lg font-semibold">{t.plan.toList}</h2>
			{#if lists.length === 0}
				<p class="text-sm text-fog">{t.plan.noLists}</p>
				<a class={['inline-flex', btnGhost]} href={resolve('/app/lists')}>{t.dashboard.openLists}</a>
			{:else}
				<label class="flex min-w-0 flex-col gap-2 text-sm">
					<span>{t.plan.chooseList}</span>
					<select class={[selectClass, 'max-w-full']} bind:value={listId}>
						{#each lists as list (list.id)}
							<option value={list.id}>{list.emoji} {list.name}</option>
						{/each}
					</select>
				</label>
				<button
					class={btnPrimary}
					disabled={pushing !== '' || entries.length === 0 || !listId}
					type="button"
					onclick={() => void pushEntries('week', entries)}
				>
					{pushing === 'week' ? t.plan.pushing : t.plan.toList}
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
	{/if}
</div>
