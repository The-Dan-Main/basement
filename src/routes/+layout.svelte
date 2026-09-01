<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { afterNavigate, invalidate } from '$app/navigation';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { I18n, setI18n } from '$lib/i18n/i18n.svelte';
	import { untrack } from 'svelte';

	let { children, data } = $props();
	const i18n = setI18n(new I18n(untrack(() => data.locale)));
	let syncedLocale = untrack(() => data.locale);

	$effect(() => {
		const next = data.locale;
		if (next === syncedLocale) return;
		syncedLocale = next;
		untrack(() => {
			i18n.locale = next;
		});
	});

	$effect(() => {
		if (!data.supabase) return;
		const {
			data: { subscription }
		} = data.supabase.auth.onAuthStateChange((event) => {
			if (event === 'INITIAL_SESSION') return;
			void invalidate('supabase:auth');
		});
		return () => subscription.unsubscribe();
	});

	afterNavigate(() => {
		if (typeof navigator !== 'undefined' && navigator.serviceWorker?.getRegistration) {
			navigator.serviceWorker.getRegistration().then((registration) => registration?.update());
		}
	});
</script>

<svelte:head>
	<title>Basement</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<InstallPrompt />
