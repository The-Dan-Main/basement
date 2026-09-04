<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { btnQuiet } from '$lib/ui';
	import type { Profile } from '$lib/types/app';
	import Logo from '$lib/components/Logo.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import { resolveProfile } from '$lib/offline/live.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import type { Snippet } from 'svelte';

	let {
		profile,
		children
	}: {
		profile: Profile;
		children: Snippet;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
	const live = $derived(resolveProfile(profile));
	const path = $derived(page.url.pathname);

	const links = $derived([
		{
			href: '/app' as const,
			label: t.nav.home,
			match: (value: string) => value === '/app'
		},
		{
			href: '/app/lists' as const,
			label: t.nav.lists,
			match: (value: string) => value.startsWith('/app/lists')
		},
		{
			href: '/app/recipes' as const,
			label: t.nav.recipes,
			match: (value: string) => value.startsWith('/app/recipes')
		},
		{
			href: '/app/chores' as const,
			label: t.nav.chores,
			match: (value: string) => value.startsWith('/app/chores')
		},
		{
			href: '/app/household' as const,
			label: t.nav.household,
			match: (value: string) => value.startsWith('/app/household')
		},
		{
			href: '/app/settings' as const,
			label: t.nav.settings,
			match: (value: string) => value.startsWith('/app/settings')
		}
	]);
	const mobileLinks = $derived(links.filter((link) => link.href !== '/app/settings'));
</script>

<div class="min-h-dvh overflow-x-clip bg-ink">
	<OfflineBanner />
	<header
		class="sticky top-0 z-30 flex min-w-0 items-center justify-between gap-3 overflow-x-clip border-b border-line/80 bg-ink/85 px-4 py-3 backdrop-blur-md md:px-6"
		style="padding-top: max(0.75rem, env(safe-area-inset-top))"
	>
		<a href={resolve('/app')} class="min-w-0 shrink text-paper"><Logo /></a>
		<div class="flex min-w-0 shrink-0 items-center gap-2 text-sm">
			<LanguageSwitcher />
			<span class="max-w-24 truncate rounded-full bg-white/5 px-3 py-1 text-fog">{live.display_name}</span>
			<a
				class="grid h-9 w-9 place-items-center rounded-full border border-line text-fog hover:text-paper md:hidden"
				href={resolve('/app/settings')}
				aria-label={t.nav.settings}
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.8"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z"
					/>
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.8"
						d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
					/>
				</svg>
			</a>
		</div>
	</header>

	<div class="mx-auto flex w-full min-w-0 max-w-6xl">
		<nav class="sticky top-20 hidden w-48 shrink-0 flex-col gap-1 self-start p-4 md:flex">
			{#each links as link (link.href)}
				<a
					href={resolve(link.href)}
					class={[
						'flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
						link.match(path) ? 'bg-white/8 text-gold' : 'text-fog hover:bg-white/5 hover:text-paper'
					]}
				>
					{link.label}
				</a>
			{/each}
			<form class="mt-6" method="POST" action="/logout">
				<button class={btnQuiet} type="submit">{t.nav.signOut}</button>
			</form>
		</nav>

		<main class="min-w-0 flex-1 overflow-x-clip px-4 py-6 pb-28 md:px-6 md:pb-10">
			{@render children()}
		</main>
	</div>

	<nav
		class="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-5 border-t border-line bg-ink/90 px-1 pt-2 backdrop-blur-md md:hidden"
		style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom))"
	>
		{#each mobileLinks as link (link.href)}
			<a
				href={resolve(link.href)}
				class={[
					'rounded-2xl px-1 py-3 text-center text-xs font-semibold sm:text-sm',
					link.match(path) ? 'text-gold' : 'text-fog'
				]}
			>
				{link.label}
			</a>
		{/each}
	</nav>
</div>
