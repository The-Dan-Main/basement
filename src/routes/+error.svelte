<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import Logo from '$lib/components/Logo.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { btnGhost, panelClass } from '$lib/ui';

	const i18n = getI18n();
	const t = $derived(i18n.t);
	const offline = $derived(browser && !navigator.onLine);
	const keyed = $derived(
		page.error?.message
			? i18n.t.errors[page.error.message as keyof typeof i18n.t.errors]
			: undefined
	);
</script>

<div class="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
	<Logo size="lg" />
	<section class={[panelClass, 'mt-8 p-6']}>
		<p class="text-sm text-gold">{offline ? t.errorPage.offline : page.status}</p>
		<h1 class="mt-2 text-2xl font-semibold">
			{offline ? t.errorPage.offlineBody : (keyed ?? page.error?.message ?? t.errors.generic)}
		</h1>
		<a class={['mt-6', btnGhost]} href={resolve('/app')}
			>{offline ? t.errorPage.backLists : t.errorPage.backHome}</a
		>
	</section>
</div>
