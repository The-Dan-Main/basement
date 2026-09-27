<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RecipeDraftCard from '$lib/components/RecipeDraftCard.svelte';
	import RecipeSubnav from '$lib/components/RecipeSubnav.svelte';
	import {
		emptyAiRecipe,
		recipeLooksReady,
		slugFromTitle,
		type AiRecipeDraft,
		type ChatTurn
	} from '$lib/ai-recipe';
	import { aiDraftToMealie } from '$lib/ai-recipe-persist';
	import { persistMealieDrafts } from '$lib/import-persist';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { btnGhost, btnPrimary, fieldClass } from '$lib/ui';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);

	let messages = $state<ChatTurn[]>([]);
	let input = $state('');
	let busy = $state(false);
	let saving = $state(false);
	let error = $state('');
	let recipe = $state<AiRecipeDraft>(emptyAiRecipe());
	let ready = $state(false);
	let scroller: HTMLDivElement | undefined;

	const welcome = $derived(t.recipes.chatStart);

	$effect(() => {
		void messages;
		void recipe.title;
		if (scroller) scroller.scrollTop = scroller.scrollHeight;
	});

	function mapError(status: number) {
		if (status === 503) return t.errors.geminiMissing;
		if (status === 400) return t.errors.chatEmpty;
		return t.errors.geminiFailed;
	}

	async function send() {
		const content = input.trim();
		if (!content || busy) return;
		const next: ChatTurn[] = [...messages, { role: 'user', content }];
		messages = next;
		input = '';
		busy = true;
		error = '';
		try {
			const response = await fetch(resolve('/app/recipes/chat/ask'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					locale: i18n.locale,
					messages: next,
					recipe: recipeLooksReady(recipe) ? recipe : null
				})
			});
			if (!response.ok) throw Object.assign(new Error('chat'), { status: response.status });
			const payload = (await response.json()) as {
				reply: string;
				ready: boolean;
				recipe: AiRecipeDraft;
			};
			if (payload.reply) messages = [...next, { role: 'assistant', content: payload.reply }];
			if (payload.recipe?.title) recipe = payload.recipe;
			ready = Boolean(payload.ready && recipeLooksReady(payload.recipe));
		} catch (err) {
			const status = err && typeof err === 'object' && 'status' in err ? Number(err.status) : 502;
			error = mapError(status);
		}
		busy = false;
	}

	async function save() {
		if (!data.supabase || !data.user || !household || !recipeLooksReady(recipe)) return;
		saving = true;
		error = '';
		try {
			const report = await persistMealieDrafts(
				data.supabase,
				data.user.id,
				household.id,
				[aiDraftToMealie(recipe, `gemini-${slugFromTitle(recipe.title)}-${Date.now()}`)],
				false,
				'gemini'
			);
			const id = report.ids[0];
			if (id) {
				await goto(resolve(`/app/recipes/${id}`));
				return;
			}
			error = t.errors.generic;
		} catch {
			error = t.errors.generic;
		}
		saving = false;
	}

	function reset() {
		messages = [];
		recipe = emptyAiRecipe();
		ready = false;
		error = '';
		input = '';
	}
</script>

<svelte:head><title>{t.recipes.chatTitle}</title></svelte:head>

<div class="space-y-6">
	<RecipeSubnav />
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight">{t.recipes.chatHeading}</h1>
			<p class="mt-2 max-w-2xl text-fog">{t.recipes.chatBody}</p>
		</div>
		<button class={btnGhost} type="button" onclick={reset}>{t.recipes.chatReset}</button>
	</div>

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
		<section class="flex min-h-[28rem] flex-col">
			<div
				bind:this={scroller}
				class="max-h-[70vh] flex-1 space-y-3 overflow-y-auto rounded-3xl border border-line bg-ink-soft p-4"
			>
				<div class="max-w-[90%] rounded-3xl rounded-tl-md bg-panel px-4 py-3 text-sm leading-6">
					<p class="text-xs font-semibold text-gold">{t.recipes.chatGemini}</p>
					<p class="mt-1">{welcome}</p>
				</div>
				{#each messages as turn, index (`${turn.role}-${index}`)}
					<div
						class={[
							'max-w-[90%] rounded-3xl px-4 py-3 text-sm leading-6',
							turn.role === 'user' ? 'ml-auto rounded-tr-md bg-gold/15' : 'rounded-tl-md bg-panel'
						]}
					>
						<p class="text-xs font-semibold text-gold">
							{turn.role === 'user' ? t.recipes.chatYou : t.recipes.chatGemini}
						</p>
						<p class="mt-1 whitespace-pre-wrap">{turn.content}</p>
					</div>
				{/each}
				{#if busy}
					<p class="text-sm text-fog">{t.recipes.chatSending}</p>
				{/if}
				{#if messages.length === 0 && !busy}
					<p class="text-sm text-fog">{t.recipes.chatEmptyHint}</p>
				{/if}
			</div>
			<form
				class="mt-3 flex flex-col gap-2 sm:flex-row"
				onsubmit={(event) => {
					event.preventDefault();
					void send();
				}}
			>
				<textarea
					class={[fieldClass, 'min-h-20 flex-1']}
					bind:value={input}
					placeholder={t.recipes.chatPlaceholder}
					disabled={busy}
					onkeydown={(event) => {
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							void send();
						}
					}}></textarea>
				<button class={btnPrimary} disabled={busy || !input.trim()} type="submit">
					{busy ? t.recipes.chatSending : t.recipes.chatSend}
				</button>
			</form>
			{#if error}
				<p class="text-sm text-coral">{error}</p>
			{/if}
		</section>

		{#if recipeLooksReady(recipe)}
			<RecipeDraftCard
				draft={recipe}
				{ready}
				busy={saving}
				actionLabel={saving ? t.recipes.chatSaving : t.recipes.chatSave}
				onaction={() => void save()}
			/>
		{/if}
	</div>
</div>
