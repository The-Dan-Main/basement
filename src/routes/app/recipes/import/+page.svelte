<script lang="ts">
	import { resolve } from '$app/paths';
	import RecipeSubnav from '$lib/components/RecipeSubnav.svelte';
	import { persistMealieDrafts } from '$lib/import-persist';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import {
		deserializeMealieImage,
		recipesFromUploads,
		type MealieListItem,
		type MealieRecipeDraft
	} from '$lib/mealie';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { btnGhost, btnPrimary, fieldClass, labelClass, panelClass } from '$lib/ui';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);

	let files = $state<File[]>([]);
	let replace = $state(false);
	let busy = $state(false);
	let message = $state('');
	let error = $state('');
	let baseUrl = $state('');
	let token = $state('');
	let remote = $state<MealieListItem[]>([]);

	function onFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		files = [...(input.files ?? [])];
	}

	async function importDrafts(drafts: MealieRecipeDraft[]) {
		if (!data.supabase || !data.user || !household) return;
		if (drafts.length === 0) {
			error = t.recipes.importNone;
			return;
		}
		busy = true;
		error = '';
		message = '';
		try {
			const report = await persistMealieDrafts(
				data.supabase,
				data.user.id,
				household.id,
				drafts,
				replace
			);
			message = fill(t.recipes.importResult, {
				imported: report.imported,
				updated: report.updated,
				skipped: report.skipped,
				failed: report.failed
			});
		} catch {
			error = t.errors.importFailed;
		}
		busy = false;
	}

	async function importFiles() {
		error = '';
		const drafts = await recipesFromUploads(files);
		await importDrafts(drafts);
	}

	async function loadRemote() {
		busy = true;
		error = '';
		message = '';
		try {
			const response = await fetch(resolve('/app/recipes/import/mealie'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ baseUrl, token, action: 'list' })
			});
			if (!response.ok) throw new Error('mealie');
			const payload = (await response.json()) as { recipes: MealieListItem[] };
			remote = payload.recipes ?? [];
			message = fill(t.recipes.cookbookRecipes, { count: remote.length });
		} catch {
			error = t.errors.importApi;
		}
		busy = false;
	}

	async function importRemote() {
		if (!remote.length) return;
		busy = true;
		error = '';
		message = '';
		try {
			const drafts: MealieRecipeDraft[] = [];
			for (let i = 0; i < remote.length; i += 20) {
				const slugs = remote.slice(i, i + 20).map((row) => row.slug);
				const response = await fetch(resolve('/app/recipes/import/mealie'), {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ baseUrl, token, action: 'fetch', slugs })
				});
				if (!response.ok) throw new Error('mealie');
				const payload = (await response.json()) as {
					recipes: (Omit<MealieRecipeDraft, 'image'> & {
						image: { name: string; type: string; base64: string } | null;
					})[];
				};
				for (const row of payload.recipes ?? []) {
					drafts.push({ ...row, image: deserializeMealieImage(row.image) });
				}
			}
			busy = false;
			await importDrafts(drafts);
		} catch {
			error = t.errors.importApi;
			busy = false;
		}
	}
</script>

<svelte:head><title>{t.recipes.importTitle}</title></svelte:head>

<div class="space-y-8">
	<RecipeSubnav />
	<div>
		<h1 class="text-3xl font-semibold tracking-tight">{t.recipes.importHeading}</h1>
		<p class="mt-2 max-w-2xl text-fog">{t.recipes.importBody}</p>
	</div>

	<section class={[panelClass, 'space-y-4 p-5']}>
		<h2 class="text-lg font-semibold">{t.recipes.importFiles}</h2>
		<p class="text-sm text-fog">{t.recipes.importFilesHelp}</p>
		<input
			class="text-sm"
			type="file"
			accept=".zip,.json,application/json,application/zip"
			multiple
			onchange={onFiles}
		/>
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={replace} />
			{t.recipes.importReplace}
		</label>
		<button
			class={btnPrimary}
			disabled={busy || !household || files.length === 0}
			type="button"
			onclick={() => void importFiles()}
		>
			{busy ? t.recipes.importing : t.recipes.importRun}
		</button>
	</section>

	<section class={[panelClass, 'space-y-4 p-5']}>
		<h2 class="text-lg font-semibold">{t.recipes.importApi}</h2>
		<p class="text-sm text-fog">{t.recipes.importApiHelp}</p>
		<label class={labelClass}>
			<span>{t.recipes.importApiUrl}</span>
			<input class={fieldClass} bind:value={baseUrl} placeholder="https://mealie.example.com" />
		</label>
		<label class={labelClass}>
			<span>{t.recipes.importApiToken}</span>
			<input class={fieldClass} type="password" bind:value={token} autocomplete="off" />
		</label>
		<div class="flex flex-wrap gap-2">
			<button
				class={btnGhost}
				disabled={busy || !baseUrl || !token}
				type="button"
				onclick={() => void loadRemote()}
			>
				{t.recipes.importApiLoad}
			</button>
			<button
				class={btnPrimary}
				disabled={busy || !household || remote.length === 0}
				type="button"
				onclick={() => void importRemote()}
			>
				{t.recipes.importApiRun}
			</button>
		</div>
		{#if remote.length > 0}
			<p class="text-sm text-fog">{fill(t.recipes.cookbookRecipes, { count: remote.length })}</p>
			<ul class="max-h-48 space-y-1 overflow-auto text-sm">
				{#each remote as recipe (recipe.slug)}
					<li>{recipe.name}</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if message}
		<p class="text-sm text-mint">{message}</p>
	{/if}
	{#if error}
		<p class="text-sm text-coral">{error}</p>
	{/if}
</div>
