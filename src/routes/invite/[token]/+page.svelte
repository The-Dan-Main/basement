<script lang="ts">
	import { enhance } from '$app/forms';
	import Logo from '$lib/components/Logo.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { btnPrimary, panelClass } from '$lib/ui';
	import { resolve } from '$app/paths';

	let { data, form } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
</script>

<div class="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
	<div class="mb-8 flex w-full items-center justify-between">
		<a href={resolve('/')} class="text-paper"><Logo size="lg" /></a>
		<LanguageSwitcher />
	</div>
	<section class={[panelClass, 'space-y-4 p-6']}>
		<h1 class="text-2xl font-semibold">{t.invite.title}</h1>
		{#if data.already}
			<p class="text-sm text-fog">{t.invite.used}</p>
			<a class={btnPrimary} href={resolve('/app')}>{t.invite.open}</a>
		{:else if data.emailMismatch}
			<p class="text-sm text-coral">
				{fill(t.invite.mismatch, { email: data.invite.email })}
			</p>
		{:else}
			<p class="text-sm text-fog">{fill(t.invite.invited, { name: data.householdName })}</p>
			{#if form?.code || form?.message}
				<p class="text-sm text-coral">{i18n.errorText(form)}</p>
			{/if}
			<form method="POST" use:enhance>
				<button class={[btnPrimary, 'w-full']} type="submit">{t.invite.join}</button>
			</form>
		{/if}
	</section>
</div>
