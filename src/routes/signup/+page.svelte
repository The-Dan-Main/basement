<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { btnPrimary, fieldClass, labelClass, panelClass } from '$lib/ui';
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
		<h1 class="text-2xl font-semibold">{t.auth.signupTitle}</h1>
		<p class="mt-2 text-sm text-fog">{t.auth.signupBody}</p>
		<form
			class="mt-6 space-y-4"
			method="POST"
			use:enhance={() => {
				pending = true;
				return async ({ update }) => {
					pending = false;
					await update();
				};
			}}
		>
			<input type="hidden" name="locale" value={i18n.locale} />
			<label class={labelClass}>
				<span>{t.auth.displayName}</span>
				<input class={fieldClass} name="displayName" maxlength="40" autocomplete="nickname" />
			</label>
			<label class={labelClass}>
				<span>{t.auth.email}</span>
				<input class={fieldClass} name="email" type="email" autocomplete="email" required />
			</label>
			<label class={labelClass}>
				<span>{t.auth.password}</span>
				<input
					class={fieldClass}
					name="password"
					type="password"
					autocomplete="new-password"
					required
					minlength="6"
				/>
			</label>
			{#if formText}
				<p class={['text-sm', form?.ok ? 'text-mint' : 'text-coral']}>{formText}</p>
			{/if}
			<button class={[btnPrimary, 'w-full']} disabled={pending || !data.configured} type="submit">
				{pending ? t.auth.creating : t.auth.create}
			</button>
		</form>
		<p class="mt-6 text-sm text-fog">
			{t.auth.already}
			<a class="text-gold" href={resolve('/login')}>{t.auth.logIn}</a>
		</p>
	</section>
</div>
