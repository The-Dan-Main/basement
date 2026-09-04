<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { persistCookbookUpsert, recipesForHousehold } from '$lib/offline/sync';
	import { btnPrimary, fieldClass, labelClass } from '$lib/ui';
	import type { Cookbook } from '$lib/types/app';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	const recipes = $derived(recipesForHousehold(snap, household?.id));
	let title = $state('');
	let description = $state('');
	let selected = $state<string[]>([]);
	let saving = $state(false);
	let error = $state('');

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
	}

	async function save() {
		if (!data.supabase || !data.user || !household) return;
		const name = title.trim();
		if (!name) {
			error = t.errors.nameRequired;
			return;
		}
		saving = true;
		const cookbook: Cookbook = {
			id: crypto.randomUUID(),
			household_id: household.id,
			title: name,
			description: description.trim(),
			created_by: data.user.id,
			created_at: nowIso(),
			updated_at: nowIso()
		};
		try {
			await persistCookbookUpsert(data.supabase, data.user.id, cookbook, selected);
			await goto(resolve(`/app/recipes/cookbooks/${cookbook.id}`));
		} catch {
			error = t.errors.generic;
			saving = false;
		}
	}
</script>

<svelte:head><title>{t.recipes.cookbookCreate} · Basement</title></svelte:head>

<div class="space-y-6">
	<a class="text-sm text-gold" href={resolve('/app/recipes/cookbooks')}>{t.recipes.cookbookAll}</a>
	<h1 class="text-3xl font-semibold tracking-tight">{t.recipes.cookbookCreate}</h1>
	<form
		class="space-y-6"
		onsubmit={(event) => {
			event.preventDefault();
			void save();
		}}
	>
		<label class={labelClass}>
			<span>{t.recipes.titleLabel}</span>
			<input class={fieldClass} bind:value={title} maxlength="120" required />
		</label>
		<label class={labelClass}>
			<span>{t.recipes.description}</span>
			<textarea class={[fieldClass, 'min-h-24']} bind:value={description}></textarea>
		</label>
		<section class="space-y-3">
			<h2 class="text-lg font-semibold">{t.recipes.cookbookPick}</h2>
			{#each recipes as recipe (recipe.id)}
				<label class="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
					<input
						type="checkbox"
						checked={selected.includes(recipe.id)}
						onchange={() => toggle(recipe.id)}
					/>
					<span>{recipe.title}</span>
				</label>
			{/each}
		</section>
		{#if error}
			<p class="text-sm text-coral">{error}</p>
		{/if}
		<button class={btnPrimary} disabled={saving || !title.trim()} type="submit">
			{saving ? t.recipes.saving : t.recipes.save}
		</button>
	</form>
</div>
