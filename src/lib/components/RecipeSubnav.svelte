<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getI18n } from '$lib/i18n/i18n.svelte';

	const i18n = getI18n();
	const t = $derived(i18n.t);
	const path = $derived(page.url.pathname);

	const links = $derived([
		{ href: '/app/recipes' as const, label: t.recipes.heading, match: path === '/app/recipes' },
		{
			href: '/app/recipes/cookbooks' as const,
			label: t.recipes.cookbooks,
			match: path.startsWith('/app/recipes/cookbooks')
		},
		{
			href: '/app/recipes/timeline' as const,
			label: t.recipes.timelineNav,
			match: path.startsWith('/app/recipes/timeline')
		},
		{
			href: '/app/recipes/import' as const,
			label: t.recipes.import,
			match: path.startsWith('/app/recipes/import')
		}
	]);
</script>

<nav class="flex flex-wrap gap-2">
	{#each links as link (link.href)}
		<a
			href={resolve(link.href)}
			class={[
				'rounded-full px-4 py-2 text-sm font-semibold',
				link.match ? 'bg-gold text-ink' : 'border border-line text-fog hover:text-paper'
			]}
		>
			{link.label}
		</a>
	{/each}
</nav>
