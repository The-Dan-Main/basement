<script lang="ts">
	import { browser } from '$app/environment';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { btnGhost, btnPrimary, panelClass } from '$lib/ui';

	const i18n = getI18n();
	const t = $derived(i18n.t);

	let deferred = $state<BeforeInstallPromptEvent | null>(null);
	let hidden = $state(false);
	let iosHelp = $state(false);

	const standalone = $derived(
		browser &&
			(window.matchMedia('(display-mode: standalone)').matches ||
				Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
	);

	const ios = $derived(browser && /iphone|ipad|ipod/i.test(navigator.userAgent));

	function onBeforeInstall(event: Event) {
		event.preventDefault();
		deferred = event as BeforeInstallPromptEvent;
	}

	async function install() {
		if (!deferred) {
			iosHelp = true;
			return;
		}
		await deferred.prompt();
		await deferred.userChoice;
		deferred = null;
		hidden = true;
	}
</script>

<svelte:window onbeforeinstallprompt={onBeforeInstall} />

{#if browser && !standalone && !hidden && (deferred || ios)}
	<div
		class={[
			panelClass,
			'fixed right-4 bottom-24 left-4 z-40 p-4 shadow-2xl md:right-6 md:bottom-6 md:left-auto md:w-96'
		]}
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<p class="font-semibold">{t.install.title}</p>
				<p class="mt-1 text-sm text-fog">
					{#if ios}
						{t.install.ios}
					{:else}
						{t.install.other}
					{/if}
				</p>
			</div>
			<button
				class="text-fog"
				type="button"
				onclick={() => (hidden = true)}
				aria-label={t.install.dismiss}>✕</button
			>
		</div>
		{#if iosHelp && ios}
			<p class="mt-3 text-sm text-gold">{t.install.iosHelp}</p>
		{/if}
		<div class="mt-4 flex gap-2">
			<button class={btnPrimary} type="button" onclick={install}>{t.install.install}</button>
			<button class={btnGhost} type="button" onclick={() => (hidden = true)}
				>{t.install.later}</button
			>
		</div>
	</div>
{/if}
