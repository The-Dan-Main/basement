<script lang="ts">
	import { resolve } from '$app/paths';
	import Scoreboard from '$lib/components/Scoreboard.svelte';
	import { choreStatuses, householdScores } from '$lib/chores';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill, formatDay } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { memberName, persistChoreComplete, persistChoreUncomplete } from '$lib/offline/sync';
	import { btnGhost, btnPrimary, panelClass } from '$lib/ui';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	const chores = $derived(choreStatuses(snap.chores, snap.choreCompletions, household?.id));
	const due = $derived(chores.filter((row) => !row.done));
	const done = $derived(chores.filter((row) => row.done));
	const scores = $derived(householdScores(snap.members, snap.choreCompletions, household?.id));
	let busy = $state('');

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
		busy = choreId;
		await persistChoreComplete(data.supabase, data.user.id, {
			id: crypto.randomUUID(),
			chore_id: row.chore.id,
			household_id: household.id,
			user_id: data.user.id,
			completed_at: nowIso(),
			period_key: row.periodKey,
			points: row.chore.points
		});
		busy = '';
	}

	async function undo(choreId: string) {
		if (!data.supabase || !data.user) return;
		const row = chores.find((item) => item.chore.id === choreId);
		const completion = snap.choreCompletions.find(
			(item) => item.chore_id === choreId && item.period_key === row?.periodKey
		);
		if (!completion || completion.user_id !== data.user.id) return;
		busy = choreId;
		await persistChoreUncomplete(data.supabase, data.user.id, completion.id);
		busy = '';
	}
</script>

<svelte:head><title>{t.chores.title}</title></svelte:head>

<div class="space-y-8">
	<section class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{t.chores.heading}</h1>
			<p class="mt-2 text-sm text-fog">{t.chores.rankingsHelp}</p>
		</div>
		{#if household}
			<a class={btnPrimary} href={resolve('/app/chores/new')}>{t.chores.new}</a>
		{/if}
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">{t.chores.rankings}</h2>
		<Scoreboard {scores} userId={data.user?.id} empty={t.dashboard.rankingsEmpty} />
	</section>

	{#if chores.length === 0}
		<section class={[panelClass, 'p-6']}>
			<p class="font-semibold">{t.chores.emptyTitle}</p>
			<p class="mt-2 text-sm text-fog">{t.chores.emptyBody}</p>
		</section>
	{:else}
		<section class="space-y-3">
			<h2 class="text-lg font-semibold">{t.chores.due}</h2>
			{#if due.length === 0}
				<p class="text-sm text-fog">{t.dashboard.allCaughtUp}</p>
			{:else}
				<ul class="space-y-2">
					{#each due as row (row.chore.id)}
						<li class={[panelClass, 'flex flex-wrap items-center justify-between gap-3 p-4']}>
							<a class="min-w-0 flex-1" href={resolve(`/app/chores/${row.chore.id}/edit`)}>
								<p class="font-semibold">{row.chore.title}</p>
								<p class="text-sm text-fog">
									{frequencyLabel(row.chore.frequency_unit, row.chore.frequency_every)}
									· {fill(t.chores.points, { count: row.chore.points })}
								</p>
								{#if row.lastDoneAt}
									<p class="mt-1 text-xs text-fog">
										{fill(t.chores.lastDone, { date: formatDay(row.lastDoneAt, i18n.locale) })}
									</p>
								{:else}
									<p class="mt-1 text-xs text-fog">{t.chores.never}</p>
								{/if}
							</a>
							<button
								class={btnPrimary}
								type="button"
								disabled={busy === row.chore.id}
								onclick={() => void complete(row.chore.id)}
							>
								{busy === row.chore.id ? t.chores.doing : t.chores.done}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if done.length > 0}
			<section class="space-y-3">
				<h2 class="text-lg font-semibold">{t.chores.caughtUp}</h2>
				<ul class="space-y-2">
					{#each done as row (row.chore.id)}
						<li class={[panelClass, 'flex flex-wrap items-center justify-between gap-3 p-4']}>
							<a class="min-w-0 flex-1" href={resolve(`/app/chores/${row.chore.id}/edit`)}>
								<p class="font-semibold">{row.chore.title}</p>
								<p class="text-sm text-fog">
									{frequencyLabel(row.chore.frequency_unit, row.chore.frequency_every)}
									· {fill(t.chores.points, { count: row.chore.points })}
								</p>
								{#if row.doneAt}
									<p class="mt-1 text-xs text-mint">
										{fill(t.chores.doneBy, {
											name: memberName(snap, row.doneBy) || t.household.member,
											date: formatDay(row.doneAt, i18n.locale)
										})}
									</p>
								{/if}
							</a>
							{#if row.doneBy === data.user?.id}
								<button
									class={btnGhost}
									type="button"
									disabled={busy === row.chore.id}
									onclick={() => void undo(row.chore.id)}
								>
									{t.chores.undo}
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</div>
