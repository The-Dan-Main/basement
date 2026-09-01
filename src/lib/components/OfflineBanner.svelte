<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { refreshPending } from '$lib/offline/sync';
	import { offlineStatus, subscribeOffline } from '$lib/offline/status';

	type ToastKind = 'offline' | 'synced';

	const i18n = getI18n();
	const t = $derived(i18n.t);
	let toast = $state<ToastKind | null>(null);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	function dismiss() {
		clearTimeout(hideTimer);
		toast = null;
	}

	function show(kind: ToastKind) {
		toast = kind;
		clearTimeout(hideTimer);
		hideTimer = setTimeout(dismiss, kind === 'offline' ? 5000 : 3500);
	}

	onMount(() => {
		void refreshPending();
		let prevOnline = offlineStatus.online;
		let waitingForSync = false;

		if (!prevOnline) show('offline');

		const unsubscribe = subscribeOffline(() => {
			const { online, pending } = offlineStatus;
			if (!online && prevOnline) {
				waitingForSync = false;
				show('offline');
			} else if (online && !prevOnline) {
				if (pending === 0) show('synced');
				else waitingForSync = true;
			} else if (online && waitingForSync && pending === 0) {
				waitingForSync = false;
				show('synced');
			}
			prevOnline = online;
		});

		return () => {
			unsubscribe();
			clearTimeout(hideTimer);
		};
	});
</script>

<div
	class="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4"
	style="padding-top: max(0.75rem, env(safe-area-inset-top))"
	aria-live="polite"
	aria-atomic="true"
>
	{#if toast}
		<button
			class={[
				'pointer-events-auto max-w-md rounded-2xl border px-4 py-3 text-left text-sm shadow-2xl',
				toast === 'offline'
					? 'border-gold/30 bg-ink-soft text-gold'
					: 'border-mint/30 bg-ink-soft text-mint'
			]}
			type="button"
			in:fly={{ y: -12, duration: 220 }}
			out:fade={{ duration: 160 }}
			onclick={dismiss}
		>
			{toast === 'offline' ? t.offline.away : t.offline.synced}
		</button>
	{/if}
</div>
