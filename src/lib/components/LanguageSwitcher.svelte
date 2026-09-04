<script lang="ts">
	import { page } from '$app/state';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { LOCALES, LOCALE_LABELS, parseLocale } from '$lib/i18n/locales';

	const i18n = getI18n();

	async function onChange(event: Event) {
		const next = parseLocale((event.currentTarget as HTMLSelectElement).value);
		await i18n.setLocale(next, {
			supabase: page.data.supabase,
			userId: page.data.user?.id ?? null
		});
	}
</script>

<label class="inline-flex items-center gap-2 text-xs text-fog">
	<span class="sr-only">{i18n.t.language}</span>
	<select
		class="select-chevron rounded-full border border-line bg-ink-soft py-1.5 pr-8 pl-3 text-xs font-medium text-paper outline-none focus:border-gold/70"
		bind:value={i18n.locale}
		onchange={onChange}
	>
		{#each LOCALES as locale (locale)}
			<option value={locale}>{LOCALE_LABELS[locale]}</option>
		{/each}
	</select>
</label>
