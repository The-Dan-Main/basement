<script lang="ts">
	import { enhance } from '$app/forms';
	import { fill } from '$lib/i18n/locales';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import PushReminders from '$lib/components/PushReminders.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { publishProfile } from '$lib/offline/live.svelte';
	import { btnGhost, btnPrimary, fieldClass, labelClass, panelClass } from '$lib/ui';

	let { data, form } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	let pending = $state(false);
	let geminiPending = $state(false);
	let displayName = $state('');

	const nameValue = $derived(displayName || data.profile.display_name);
</script>

<svelte:head><title>{t.settings.title}</title></svelte:head>

<div class="mx-auto max-w-xl space-y-6">
	<div>
		<h1 class="text-3xl font-semibold">{t.settings.heading}</h1>
		<p class="mt-2 text-fog">{t.settings.body}</p>
	</div>

	<div class={[panelClass, 'space-y-4 p-6']}>
		<div class="space-y-1">
			<h2 class="text-lg font-semibold">{t.settings.language}</h2>
			<p class="text-sm text-fog">{t.settings.languageHelp}</p>
		</div>
		<LanguageSwitcher />
	</div>

	<PushReminders
		vapidPublicKey={data.vapidPublicKey}
		supabase={data.supabase}
		userId={data.user?.id}
	/>

	<form
		class={[panelClass, 'space-y-5 p-6']}
		method="POST"
		action="?/name"
		use:enhance={() => {
			pending = true;
			return async ({ update, result }) => {
				pending = false;
				await update();
				if (result.type === 'success') {
					publishProfile({ ...data.profile, display_name: nameValue });
				}
			};
		}}
	>
		<label class={labelClass}>
			<span class="font-medium">{t.settings.displayName}</span>
			<input
				class={fieldClass}
				name="display_name"
				maxlength="40"
				autocomplete="nickname"
				required
				value={nameValue}
				oninput={(event) => (displayName = event.currentTarget.value)}
			/>
			<p class="text-xs text-fog">{t.settings.displayNameHelp}</p>
		</label>

		{#if form?.saved}
			<p class="text-sm text-mint">{t.settings.saved}</p>
		{/if}
		{#if !form?.gemini && (form?.code === 'nameRequired' || form?.message)}
			<p class="text-sm text-coral">{i18n.errorText(form)}</p>
		{/if}

		<button class={btnPrimary} disabled={pending} type="submit">
			{pending ? t.settings.saving : t.settings.save}
		</button>
	</form>

	<form
		class={[panelClass, 'space-y-5 p-6']}
		method="POST"
		action="?/gemini"
		use:enhance={() => {
			geminiPending = true;
			return async ({ update }) => {
				geminiPending = false;
				await update();
			};
		}}
	>
		<div class="space-y-1">
			<h2 class="text-lg font-semibold">{t.settings.gemini}</h2>
			<p class="text-sm text-fog">{t.settings.geminiHelp}</p>
		</div>
		<label class={labelClass}>
			<span class="font-medium">{t.settings.geminiKey}</span>
			<input
				class={fieldClass}
				name="gemini_api_key"
				type="password"
				autocomplete="off"
				spellcheck="false"
				placeholder={t.settings.geminiPlaceholder}
			/>
			{#if data.hasGeminiKey && data.geminiHint}
				<p class="text-xs text-fog">{fill(t.settings.geminiHint, { hint: data.geminiHint })}</p>
			{/if}
		</label>
		{#if form?.geminiSaved}
			<p class="text-sm text-mint">{t.settings.geminiSaved}</p>
		{/if}
		{#if form?.geminiCleared}
			<p class="text-sm text-mint">{t.settings.geminiCleared}</p>
		{/if}
		{#if form?.code === 'geminiKey' || (form?.gemini && form?.message)}
			<p class="text-sm text-coral">
				{form?.code === 'geminiKey' ? t.errors.geminiKey : i18n.errorText(form)}
			</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			<button class={btnPrimary} disabled={geminiPending} type="submit">
				{geminiPending ? t.settings.saving : t.settings.geminiSave}
			</button>
			{#if data.hasGeminiKey}
				<button class={btnGhost} disabled={geminiPending} formaction="?/clearGemini" type="submit">
					{t.settings.geminiClear}
				</button>
			{/if}
		</div>
	</form>
</div>
