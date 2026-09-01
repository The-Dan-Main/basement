<script lang="ts">
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { panelClass } from '$lib/ui';

	let { sql }: { sql: string } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(sql);
		copied = true;
		setTimeout(() => (copied = false), 1800);
	}
</script>

<section class={[panelClass, 'space-y-5 p-6 sm:p-8']}>
	<div class="space-y-2">
		<p class="text-xs font-semibold tracking-[0.2em] text-gold uppercase">{t.setup.kicker}</p>
		<h2 class="text-2xl font-semibold">{t.setup.title}</h2>
		<p class="max-w-2xl text-sm leading-6 text-fog">
			{t.setup.body}
		</p>
	</div>
	<div class="flex flex-wrap gap-3">
		<button
			class="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink"
			type="button"
			onclick={copy}
		>
			{copied ? t.setup.copied : t.setup.copy}
		</button>
		<a
			class="rounded-full border border-line px-4 py-2 text-sm font-semibold"
			href="https://supabase.com/dashboard"
			target="_blank"
			rel="noreferrer"
		>
			{t.setup.dashboard}
		</a>
	</div>
	<pre class="max-h-72 overflow-auto rounded-2xl bg-ink p-4 text-xs leading-5 text-fog">{sql}</pre>
</section>
