<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChoreForm, { type ChoreFormValue } from '$lib/components/ChoreForm.svelte';
	import { clampEvery, pointsForIntensity } from '$lib/chores';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { persistChoreDelete, persistChoreUpsert } from '$lib/offline/sync';
	import { btnQuiet } from '$lib/ui';
	import { untrack } from 'svelte';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const chore = $derived(snap.chores.find((row) => row.id === data.choreId) ?? null);
	let saving = $state(false);
	let value = $state<ChoreFormValue>(
		untrack(() => {
			const row = snap.chores.find((item) => item.id === data.choreId);
			return {
				title: row?.title ?? '',
				description: row?.description ?? '',
				frequency_unit: row?.frequency_unit ?? 'week',
				frequency_every: row?.frequency_every ?? 1,
				intensity: row?.intensity ?? 'medium'
			};
		})
	);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!data.supabase || !data.user || !chore) return;
		const title = value.title.trim();
		if (!title) return;
		saving = true;
		try {
			await persistChoreUpsert(data.supabase, data.user.id, {
				...chore,
				title,
				description: value.description.trim(),
				frequency_unit: value.frequency_unit,
				frequency_every: clampEvery(value.frequency_every),
				intensity: value.intensity,
				points: pointsForIntensity(value.intensity),
				updated_at: nowIso()
			});
			await goto(resolve('/app/chores'));
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!data.supabase || !data.user || !chore) return;
		if (!confirm(fill(t.chores.deleteConfirm, { name: chore.title }))) return;
		await persistChoreDelete(data.supabase, data.user.id, chore.id);
		await goto(resolve('/app/chores'));
	}
</script>

<svelte:head><title>{t.chores.edit} · Basement</title></svelte:head>

{#if !chore}
	<p class="text-fog">{t.chores.missing}</p>
{:else}
	<div class="space-y-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<a class="text-sm text-gold" href={resolve('/app/chores')}>{t.chores.all}</a>
				<h1 class="mt-2 text-3xl font-semibold tracking-tight">{t.chores.edit}</h1>
			</div>
			<button class={btnQuiet} type="button" onclick={() => void remove()}>{t.chores.delete}</button>
		</div>
		<form onsubmit={(event) => void save(event)}>
			<ChoreForm bind:value {saving} submitLabel={t.chores.save} />
		</form>
	</div>
{/if}
