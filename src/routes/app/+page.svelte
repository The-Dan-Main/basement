<script lang="ts">
	import { resolve } from '$app/paths';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { listSummaries, persistListCreate } from '$lib/offline/sync';
	import { btnPrimary, fieldClass, panelClass } from '$lib/ui';
	import type { ShoppingList } from '$lib/types/app';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	let name = $state('');
	let creating = $state(false);

	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const lists = $derived(listSummaries(snap));
	const defaultHousehold = $derived(snap.households[0] ?? null);

	async function createList() {
		const trimmed = name.trim();
		if (!trimmed || !data.supabase || !data.user || !defaultHousehold) return;
		creating = true;
		const now = nowIso();
		const list: ShoppingList = {
			id: crypto.randomUUID(),
			household_id: defaultHousehold.id,
			name: trimmed,
			sort_order: 0,
			archived_at: null,
			created_by: data.user.id,
			created_at: now,
			updated_at: now
		};
		await persistListCreate(data.supabase, data.user.id, list);
		name = '';
		creating = false;
	}
</script>

<svelte:head><title>{t.lists.title}</title></svelte:head>

<div class="space-y-8">
	<section class="space-y-3">
		<p class="text-sm text-fog">{fill(t.lists.hi, { name: data.profile.display_name })}</p>
		<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{t.lists.heading}</h1>
		{#if defaultHousehold}
			<form
				class="flex flex-col gap-3 sm:flex-row"
				onsubmit={(event) => {
					event.preventDefault();
					void createList();
				}}
			>
				<input
					class={[fieldClass, 'sm:flex-1']}
					placeholder={t.lists.placeholder}
					bind:value={name}
					maxlength="80"
				/>
				<button class={btnPrimary} disabled={creating || !name.trim()} type="submit">
					{creating ? t.lists.adding : t.lists.add}
				</button>
			</form>
		{/if}
	</section>

	{#if lists.length === 0}
		<section class={[panelClass, 'p-6']}>
			<p class="font-semibold">{t.lists.emptyTitle}</p>
			<p class="mt-2 text-sm text-fog">{t.lists.emptyBody}</p>
		</section>
	{:else}
		<section class="grid gap-3">
			{#each lists as list (list.id)}
				<a
					class={[panelClass, 'block p-5 transition hover:border-gold/40']}
					href={resolve(`/app/lists/${list.id}`)}
				>
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-xs tracking-[0.18em] text-fog uppercase">{list.household_name}</p>
							<h2 class="mt-2 text-xl font-semibold">{list.name}</h2>
						</div>
						<span class="rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
							{list.unchecked}
						</span>
					</div>
					<p class="mt-3 text-sm text-fog">
						{fill(t.lists.left, { unchecked: list.unchecked, total: list.total })}
					</p>
				</a>
			{/each}
		</section>
	{/if}
</div>
