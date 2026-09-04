<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { btnGhost, btnPrimary, fieldClass, labelClass, panelClass } from '$lib/ui';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { form, data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	let pending = $state(false);
	const formText = $derived(i18n.errorText(form));
</script>

<div class="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
	<div class="mb-8 flex w-full items-center justify-between">
		<a href={resolve('/')} class="text-paper"><Logo size="lg" /></a>
		<LanguageSwitcher />
	</div>
	<section class={[panelClass, 'p-6 sm:p-8']}>
		<h1 class="text-2xl font-semibold">{t.auth.welcome}</h1>
		<p class="mt-2 text-sm text-fog">{t.auth.welcomeBody}</p>
		<form
			class="mt-6 space-y-4"
			method="POST"
			action="?/password"
			use:enhance={() => {
				pending = true;
				return async ({ update }) => {
					pending = false;
					await update();
				};
			}}
		>
			<label class={labelClass}>
				<span>{t.auth.email}</span>
				<input class={fieldClass} name="email" type="email" autocomplete="email" required />
			</label>
			<label class={labelClass}>
				<span>{t.auth.password}</span>
				<input class={fieldClass} name="password" type="password" autocomplete="current-password" />
			</label>
			{#if formText}
				<p class={['text-sm', form?.ok ? 'text-mint' : 'text-coral']}>{formText}</p>
			{/if}
			<button class={[btnPrimary, 'w-full']} disabled={pending || !data.configured} type="submit">
				{pending ? t.auth.signingIn : t.auth.logIn}
			</button>
			<button
				class={[btnGhost, 'w-full']}
				disabled={pending || !data.configured}
				formaction="?/magic"
				type="submit"
			>
				{t.auth.magic}
			</button>
		</form>
		<p class="mt-6 text-sm text-fog">
			{t.auth.newHere}
			<a class="text-gold" href={resolve('/signup')}>{t.auth.createAccount}</a>
		</p>
	</section>
</div>
