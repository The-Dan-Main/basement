<script lang="ts">
	import { resolve } from '$app/paths';
	import Scoreboard from '$lib/components/Scoreboard.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { choreStatuses, householdScores } from '$lib/chores';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill, formatDay } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import {
		lastCookedEvent,
		listSummaries,
		memberName,
		persistChoreComplete,
		recipeFeed,
		recipesForHousehold
	} from '$lib/offline/sync';
	import { formatNutrition, nutritionPerServing } from '$lib/recipes';
	import { btnGhost, btnPrimary, panelClass } from '$lib/ui';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	const lists = $derived(listSummaries(snap).slice(0, 4));
	const recipes = $derived(recipesForHousehold(snap, household?.id).slice(0, 4));
	const chores = $derived(choreStatuses(snap.chores, snap.choreCompletions, household?.id));
	const due = $derived(chores.filter((row) => !row.done).slice(0, 5));
	const scores = $derived(householdScores(snap.members, snap.choreCompletions, household?.id));
	const recentCooks = $derived(recipeFeed(snap, household?.id, 'cooked').slice(0, 4));
	let completing = $state('');

	function frequencyLabel(unit: 'week' | 'month', every: number) {
		if (unit === 'week') {
			return every === 1 ? t.chores.everyWeek : fill(t.chores.everyWeeks, { count: every });
		}
		return every === 1 ? t.chores.everyMonth : fill(t.chores.everyMonths, { count: every });
	}

	async function complete(choreId: string) {
		if (!data.supabase || !data.user || !household) return;
		const row = chores.find((item) => item.chore.id === choreId);
		if (!row || row.done) return;
		completing = choreId;
		await persistChoreComplete(data.supabase, data.user.id, {
			id: crypto.randomUUID(),
			chore_id: row.chore.id,
			household_id: household.id,
			user_id: data.user.id,
			completed_at: nowIso(),
			period_key: row.periodKey,
			points: row.chore.points
		});
		completing = '';
	}
</script>

<svelte:head><title>{t.dashboard.title}</title></svelte:head>

<div class="space-y-8">
	<section>
		<p class="text-sm text-fog">{fill(t.dashboard.hi, { name: data.profile.display_name })}</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.dashboard.heading}</h1>
	</section>

	<section class="space-y-3">
		<div class="flex items-end justify-between gap-3">
			<h2 class="text-lg font-semibold">{t.dashboard.rankings}</h2>
			<a class="text-sm font-semibold text-gold" href={resolve('/app/chores')}>{t.dashboard.openChores}</a>
		</div>
		<Scoreboard {scores} userId={data.user?.id} empty={t.dashboard.rankingsEmpty} />
	</section>

	<section class="space-y-3">
		<div class="flex items-end justify-between gap-3">
			<h2 class="text-lg font-semibold">{t.dashboard.chores}</h2>
			<a class="text-sm font-semibold text-gold" href={resolve('/app/chores')}>{t.dashboard.openChores}</a>
		</div>
		{#if chores.length === 0}
			<section class={[panelClass, 'p-5']}>
				<p class="text-sm text-fog">{t.dashboard.choresEmpty}</p>
				<a class={['mt-3 inline-flex', btnGhost]} href={resolve('/app/chores/new')}>{t.chores.new}</a>
			</section>
		{:else if due.length === 0}
			<p class="text-sm text-fog">{t.dashboard.allCaughtUp}</p>
		{:else}
			<ul class="space-y-2">
				{#each due as row (row.chore.id)}
					<li class={[panelClass, 'flex items-center justify-between gap-3 p-4']}>
						<div class="min-w-0">
							<p class="font-semibold">{row.chore.title}</p>
							<p class="text-xs text-fog">
								{frequencyLabel(row.chore.frequency_unit, row.chore.frequency_every)}
								· {fill(t.chores.points, { count: row.chore.points })}
							</p>
						</div>
						<button
							class={btnPrimary}
							type="button"
							disabled={completing === row.chore.id}
							onclick={() => void complete(row.chore.id)}
						>
							{completing === row.chore.id ? t.chores.doing : t.chores.done}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="grid gap-6 lg:grid-cols-2">
		<div class="space-y-3">
			<div class="flex items-end justify-between gap-3">
				<h2 class="text-lg font-semibold">{t.dashboard.lists}</h2>
				<a class="text-sm font-semibold text-gold" href={resolve('/app/lists')}>{t.dashboard.openLists}</a>
			</div>
			{#if lists.length === 0}
				<section class={[panelClass, 'p-5']}>
					<p class="text-sm text-fog">{t.dashboard.listsEmpty}</p>
				</section>
			{:else}
				<ul class="space-y-2">
					{#each lists as list (list.id)}
						<li>
							<a
								class={[panelClass, 'flex items-center justify-between gap-3 p-4 hover:border-gold/40']}
								href={resolve(`/app/lists/${list.id}`)}
							>
								<p class="min-w-0 truncate font-semibold">
									{#if list.emoji}<span class="mr-1">{list.emoji}</span>{/if}{list.name}
								</p>
								<span class="shrink-0 text-sm text-gold"
									>{fill(t.dashboard.left, { unchecked: list.unchecked })}</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div class="space-y-3">
			<div class="flex items-end justify-between gap-3">
				<h2 class="text-lg font-semibold">{t.dashboard.recipes}</h2>
				<a class="text-sm font-semibold text-gold" href={resolve('/app/recipes')}>{t.dashboard.openRecipes}</a>
			</div>
			{#if recipes.length === 0}
				<section class={[panelClass, 'p-5']}>
					<p class="text-sm text-fog">{t.dashboard.recipesEmpty}</p>
				</section>
			{:else}
				<ul class="space-y-2">
					{#each recipes as recipe (recipe.id)}
						{@const per = nutritionPerServing(recipe)}
						{@const last = lastCookedEvent(snap, recipe.id)}
						<li>
							<a
								class={[panelClass, 'flex gap-3 overflow-hidden hover:border-gold/40']}
								href={resolve(`/app/recipes/${recipe.id}`)}
							>
								{#if recipe.image_url}
									<img src={recipe.image_url} alt="" class="h-20 w-20 shrink-0 object-cover" />
								{:else}
									<div class="grid h-20 w-20 shrink-0 place-items-center bg-ink-soft" aria-hidden="true">
										🍽️
									</div>
								{/if}
								<div class="min-w-0 py-3 pr-3">
									<p class="truncate font-semibold">{recipe.title}</p>
									<p class="text-xs text-fog">
										{#if recipe.calories}{formatNutrition(per.calories)} {t.recipes.kcal}{/if}
										{#if last}
											· {fill(t.recipes.lastCooked, { date: formatDay(last.cooked_at, i18n.locale) })}
										{/if}
									</p>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<section class="space-y-3">
		<div class="flex items-end justify-between gap-3">
			<h2 class="text-lg font-semibold">{t.dashboard.recentCooks}</h2>
			<a class="text-sm font-semibold text-gold" href={resolve('/app/recipes/timeline')}
				>{t.recipes.timelineNav}</a
			>
		</div>
		{#if recentCooks.length === 0}
			<p class="text-sm text-fog">{t.dashboard.recentEmpty}</p>
		{:else}
			<ol class="space-y-2">
				{#each recentCooks as event (event.id)}
					{@const recipe = snap.recipes.find((row) => row.id === event.recipe_id)}
					<li class={[panelClass, 'p-4']}>
						<p class="text-xs text-fog">
							{formatDay(event.at, i18n.locale)}
							{#if memberName(snap, event.user_id)}· {memberName(snap, event.user_id)}{/if}
						</p>
						{#if recipe}
							<a class="mt-1 block font-semibold text-gold" href={resolve(`/app/recipes/${recipe.id}`)}
								>{recipe.title}</a
							>
						{/if}
						{#if event.rating}
							<div class="mt-1"><StarRating value={event.rating} readonly /></div>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</section>
</div>
