<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChoreForm, { type ChoreFormValue } from '$lib/components/ChoreForm.svelte';
	import { clampEvery, pointsForIntensity } from '$lib/chores';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { persistChoreUpsert } from '$lib/offline/sync';
	import type { Chore } from '$lib/types/app';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	let saving = $state(false);
	let error = $state('');
	let value = $state<ChoreFormValue>({
		title: '',
		description: '',
		frequency_unit: 'week',
		frequency_every: 1,
		intensity: 'medium'
	});

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!data.supabase || !data.user || !household) return;
		const title = value.title.trim();
		if (!title) return;
		saving = true;
		error = '';
		const now = nowIso();
		const chore: Chore = {
			id: crypto.randomUUID(),
			household_id: household.id,
			title,
			description: value.description.trim(),
			frequency_unit: value.frequency_unit,
			frequency_every: clampEvery(value.frequency_every),
			intensity: value.intensity,
			points: pointsForIntensity(value.intensity),
			created_by: data.user.id,
			created_at: now,
			updated_at: now,
			archived_at: null
		};
		try {
			await persistChoreUpsert(data.supabase, data.user.id, chore);
			await goto(resolve('/app/chores'));
		} catch {
			error = t.errors.generic;
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>{t.chores.create} · Basement</title></svelte:head>

<div class="space-y-6">
	<div>
		<a class="text-sm text-gold" href={resolve('/app/chores')}>{t.chores.all}</a>
		<h1 class="mt-2 text-3xl font-semibold tracking-tight">{t.chores.create}</h1>
	</div>
	<form onsubmit={(event) => void save(event)}>
		<ChoreForm bind:value {saving} submitLabel={t.chores.save} />
	</form>
	{#if error}
		<p class="text-sm text-coral">{error}</p>
	{/if}
</div>
