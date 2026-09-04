<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CommentThread from '$lib/components/CommentThread.svelte';
	import { nowIso } from '$lib/data';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import {
		cookbookDetail,
		memberName,
		persistCookbookCommentAdd,
		persistCookbookCommentDelete,
		persistCookbookDelete
	} from '$lib/offline/sync';
	import { formatNutrition, nutritionPerServing } from '$lib/recipes';
	import { btnGhost, btnQuiet, panelClass } from '$lib/ui';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const detail = $derived(cookbookDetail(snap, data.cookbookId));
	const cookbook = $derived(detail.cookbook);
	let submitting = $state(false);

	const comments = $derived(
		detail.comments.map((comment) => ({
			...comment,
			author: memberName(snap, comment.user_id) || t.household.member
		}))
	);

	async function addComment(body: string) {
		if (!data.supabase || !data.user || !cookbook) return;
		submitting = true;
		const now = nowIso();
		await persistCookbookCommentAdd(data.supabase, data.user.id, {
			id: crypto.randomUUID(),
			cookbook_id: cookbook.id,
			user_id: data.user.id,
			body,
			created_at: now,
			updated_at: now
		});
		submitting = false;
	}

	async function removeComment(id: string) {
		if (!data.supabase || !data.user) return;
		await persistCookbookCommentDelete(data.supabase, data.user.id, id);
	}

	async function remove() {
		if (!data.supabase || !data.user || !cookbook) return;
		if (!confirm(fill(t.recipes.deleteConfirm, { name: cookbook.title }))) return;
		await persistCookbookDelete(data.supabase, data.user.id, cookbook.id);
		await goto(resolve('/app/recipes/cookbooks'));
	}
</script>

<svelte:head>
	<title>{cookbook ? `${cookbook.title} · Basement` : t.recipes.cookbooksTitle}</title>
</svelte:head>

{#if !cookbook}
	<p class="text-fog">{t.recipes.cookbookMissing}</p>
{:else}
	<div class="space-y-8">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<a class="text-sm text-gold" href={resolve('/app/recipes/cookbooks')}
					>{t.recipes.cookbookAll}</a
				>
				<h1 class="mt-2 text-3xl font-semibold tracking-tight">{cookbook.title}</h1>
				{#if cookbook.description}
					<p class="mt-2 max-w-2xl text-fog">{cookbook.description}</p>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				<a class={btnGhost} href={resolve(`/app/recipes/cookbooks/${cookbook.id}/edit`)}
					>{t.recipes.cookbookEdit}</a
				>
				<button class={btnQuiet} type="button" onclick={() => void remove()}
					>{t.recipes.delete}</button
				>
			</div>
		</div>

		<section class="grid gap-3 sm:grid-cols-2">
			{#each detail.recipes as recipe (recipe.id)}
				{@const per = nutritionPerServing(recipe)}
				<a
					class={[panelClass, 'overflow-hidden transition hover:border-gold/40']}
					href={resolve(`/app/recipes/${recipe.id}`)}
				>
					{#if recipe.image_url}
						<img src={recipe.image_url} alt="" class="h-40 w-full object-cover" />
					{:else}
						<div class="grid h-40 place-items-center bg-ink-soft text-4xl" aria-hidden="true">
							🍽️
						</div>
					{/if}
					<div class="space-y-2 p-5">
						<h2 class="text-xl font-semibold">{recipe.title}</h2>
						<p class="text-sm text-fog">
							{fill(t.recipes.people, { count: recipe.servings })}
							{#if recipe.calories}
								· {formatNutrition(per.calories)} {t.recipes.kcal}
							{/if}
						</p>
					</div>
				</a>
			{/each}
		</section>

		{#if data.user}
			<CommentThread
				{comments}
				userId={data.user.id}
				{submitting}
				onsubmit={(body) => void addComment(body)}
				ondelete={(id) => void removeComment(id)}
			/>
		{/if}
	</div>
{/if}
