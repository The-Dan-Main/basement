<script lang="ts">
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import {
		disableReminders,
		enableReminders,
		reminderStatus,
		type ReminderStatus
	} from '$lib/push-client';
	import type { BasementClient } from '$lib/supabase/client';
	import { btnGhost, btnPrimary, panelClass } from '$lib/ui';
	import { onMount } from 'svelte';

	let {
		vapidPublicKey,
		supabase,
		userId
	}: {
		vapidPublicKey: string;
		supabase: BasementClient | null;
		userId: string | undefined;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
	let status = $state<ReminderStatus | 'loading' | 'error' | 'unavailable'>('loading');
	let working = $state(false);

	onMount(() => {
		if (!vapidPublicKey) {
			status = 'unavailable';
			return;
		}
		let cancelled = false;
		void reminderStatus(supabase, userId).then((next) => {
			if (!cancelled) status = next;
		});
		return () => {
			cancelled = true;
		};
	});

	async function turnOn() {
		if (!supabase || !userId || !vapidPublicKey) return;
		working = true;
		try {
			status = await enableReminders(supabase, userId, vapidPublicKey);
		} catch {
			status = 'error';
		} finally {
			working = false;
		}
	}

	async function turnOff() {
		if (!supabase) return;
		working = true;
		try {
			status = await disableReminders(supabase);
		} catch {
			status = 'error';
		} finally {
			working = false;
		}
	}
</script>

<div class={[panelClass, 'space-y-4 p-6']}>
	<div class="space-y-1">
		<h2 class="text-lg font-semibold">{t.settings.reminders}</h2>
		<p class="text-sm text-fog">{t.settings.remindersHelp}</p>
	</div>

	{#if status === 'unavailable'}
		<p class="text-sm text-fog">{t.settings.remindersUnavailable}</p>
	{:else if status === 'ios-install'}
		<p class="text-sm text-gold">{t.settings.remindersIos}</p>
	{:else if status === 'unsupported'}
		<p class="text-sm text-fog">{t.settings.remindersUnsupported}</p>
	{:else if status === 'denied'}
		<p class="text-sm text-coral">{t.settings.remindersDenied}</p>
	{:else if status === 'on'}
		<p class="text-sm text-mint">{t.settings.remindersOn}</p>
		<button class={btnGhost} type="button" disabled={working} onclick={turnOff}>
			{working ? t.settings.saving : t.settings.remindersDisable}
		</button>
	{:else if status === 'off' || status === 'error'}
		{#if status === 'error'}
			<p class="text-sm text-coral">{t.settings.remindersFailed}</p>
		{:else}
			<p class="text-sm text-fog">{t.settings.remindersOff}</p>
		{/if}
		<button class={btnPrimary} type="button" disabled={working || !userId} onclick={turnOn}>
			{working ? t.settings.saving : t.settings.remindersEnable}
		</button>
	{/if}
</div>
