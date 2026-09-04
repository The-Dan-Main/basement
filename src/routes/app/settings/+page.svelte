<script lang="ts">
	import { enhance } from '$app/forms';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { publishProfile } from '$lib/offline/live.svelte';
	import { btnPrimary, fieldClass, labelClass, panelClass } from '$lib/ui';

	let { data, form } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	let pending = $state(false);
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
		{#if form?.code || form?.message}
			<p class="text-sm text-coral">{i18n.errorText(form)}</p>
		{/if}

		<button class={btnPrimary} disabled={pending} type="submit">
			{pending ? t.settings.saving : t.settings.save}
		</button>
	</form>
</div>
