<script lang="ts">
	import { enhance } from '$app/forms';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { resolveSnapshot } from '$lib/offline/live.svelte';
	import { persistHouseholdUpdate, pullSnapshot } from '$lib/offline/sync';
	import { btnGhost, btnPrimary, fieldClass, panelClass } from '$lib/ui';

	let { data, form } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
	const snap = $derived(resolveSnapshot(data.snap) ?? data.snap);
	const household = $derived(snap.households[0] ?? null);
	const members = $derived(
		household ? snap.members.filter((member) => member.household_id === household.id) : []
	);
	const invites = $derived(
		household ? snap.invites.filter((invite) => invite.household_id === household.id) : []
	);
	const isOwner = $derived(
		Boolean(
			household &&
			members.some((member) => member.user_id === data.user?.id && member.role === 'owner')
		)
	);

	let householdName = $state('');
	let copied = $state(false);

	async function rename() {
		if (!data.supabase || !data.user || !household) return;
		const trimmed = (householdName || household.name).trim();
		if (!trimmed) return;
		await persistHouseholdUpdate(data.supabase, data.user.id, household.id, { name: trimmed });
		householdName = trimmed;
	}

	async function copyLink(url: string) {
		await navigator.clipboard.writeText(url);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}

	function roleLabel(role: string) {
		return role === 'owner' ? t.household.owner : t.household.member;
	}
</script>

<svelte:head><title>{t.household.title}</title></svelte:head>

<div class="space-y-8">
	<section class="space-y-3">
		<p class="text-sm text-fog">{t.household.kicker}</p>
		<h1 class="text-3xl font-semibold tracking-tight">{t.household.heading}</h1>
	</section>

	{#if !household}
		<section class={[panelClass, 'p-6']}>
			<p class="text-fog">{t.household.missing}</p>
		</section>
	{:else}
		<section class={[panelClass, 'space-y-4 p-6']}>
			<h2 class="text-lg font-semibold">{t.household.name}</h2>
			<form
				class="flex flex-col gap-3 sm:flex-row"
				onsubmit={(event) => {
					event.preventDefault();
					void rename();
				}}
			>
				<input
					class={[fieldClass, 'sm:flex-1']}
					value={householdName || household.name}
					oninput={(event) => (householdName = event.currentTarget.value)}
				/>
				<button class={btnPrimary} type="submit">{t.household.save}</button>
			</form>
		</section>

		<section class={[panelClass, 'space-y-4 p-6']}>
			<h2 class="text-lg font-semibold">{t.household.members}</h2>
			<ul class="space-y-2">
				{#each members as member (member.user_id)}
					<li class="flex items-center justify-between rounded-2xl bg-ink-soft px-4 py-3">
						<span>{member.display_name}</span>
						<span class="text-xs tracking-[0.16em] text-fog uppercase"
							>{roleLabel(member.role)}</span
						>
					</li>
				{/each}
			</ul>
		</section>

		{#if isOwner}
			<section class={[panelClass, 'space-y-4 p-6']}>
				<h2 class="text-lg font-semibold">{t.household.invite}</h2>
				<p class="text-sm text-fog">{t.household.inviteHelp}</p>
				<form
					class="flex flex-col gap-3 sm:flex-row"
					method="POST"
					action="?/invite"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							if (data.supabase && data.user) {
								await pullSnapshot(data.supabase, data.user.id, data.profile);
							}
						};
					}}
				>
					<input type="hidden" name="householdId" value={household.id} />
					<input
						class={[fieldClass, 'sm:flex-1']}
						name="email"
						type="email"
						required
						placeholder={t.household.invitePlaceholder}
					/>
					<button class={btnPrimary} type="submit">{t.household.createInvite}</button>
				</form>
				{#if form?.code || form?.message}
					<p class={['text-sm', form.ok ? 'text-mint' : 'text-coral']}>{i18n.errorText(form)}</p>
				{/if}
				{#if form?.inviteUrl}
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
						<code class="min-w-0 flex-1 truncate text-xs text-fog">{form.inviteUrl}</code>
						<button
							class={btnGhost}
							type="button"
							onclick={() => void copyLink(form.inviteUrl ?? '')}
						>
							{copied ? t.household.copied : t.household.copy}
						</button>
					</div>
				{/if}

				{#if invites.length > 0}
					<ul class="space-y-2">
						{#each invites as invite (invite.id)}
							<li
								class="flex items-center justify-between gap-3 rounded-2xl bg-ink-soft px-4 py-3 text-sm"
							>
								<span>{invite.email}</span>
								<form method="POST" action="?/revoke" use:enhance>
									<input type="hidden" name="inviteId" value={invite.id} />
									<button class="text-coral" type="submit">{t.household.revoke}</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	{/if}
</div>
