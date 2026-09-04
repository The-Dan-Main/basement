<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { cookbookDetail, persistCookbookUpsert, recipesForHousehold } from '$lib/offline/sync';
	import { btnPrimary, fieldClass } from '$lib/ui';
	import { untrack } from 'svelte';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const seed = untrack(() => cookbookDetail(data.snap, data.cookbookId));
	const detail = $derived(cookbookDetail(snap, data.cookbookId));
	const recipes = $derived(recipesForHousehold(snap, detail.cookbook?.household_id));
	let title = $state(seed.cookbook?.title ?? '');
	let description = $state(seed.cookbook?.description ?? '');
	let selected = $state<string[]>([...seed.recipeIds]);
	let saving = $state(false);
	let error = $state('');

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
	}

	async function save() {
		if (!data.supabase || !data.user || !detail.cookbook) return;
		const name = title.trim();
		if (!name) {
			error = t.errors.nameRequired;
			return;
		}
		saving = true;
		try {
			await persistCookbookUpsert(
				data.supabase,
				data.user.id,
				{
					...detail.cookbook,
					title: name,
					description: description.trim(),
					updated_at: nowIso()
				},
				selected
			);
			await goto(resolve(`/app/recipes/cookbooks/${detail.cookbook.id}`));
		} catch {
			error = t.errors.generic;
			saving = false;
		}
	}
</script>

<svelte:head><title>{t.recipes.cookbookEdit} · Basement</title></svelte:head>

<div class="space-y-6">
	<a class="text-sm text-gold" href={resolve(`/app/recipes/cookbooks/${data.cookbookId}`)}
		>{detail.cookbook?.title ?? t.recipes.cookbookAll}</a
	>
	<h1 class="text-3xl font-semibold tracking-tight">{t.recipes.cookbookEdit}</h1>
	<form
		class="space-y-6"
		onsubmit={(event) => {
			event.preventDefault();
			void save();
		}}
	>
		<label class="block space-y-2 text-sm">
			<span>{t.recipes.titleLabel}</span>
			<input class={fieldClass} bind:value={title} maxlength="120" required />
		</label>
		<label class="block space-y-2 text-sm">
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
