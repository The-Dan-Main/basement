<script lang="ts">
	import { recallCookPrefs, rememberCookPrefs } from '$lib/cook-prefs';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { persistProfileCookPrefs } from '$lib/offline/sync';
	import type { BasementClient } from '$lib/supabase/client';
	import type { Member, Profile } from '$lib/types/app';
	import { btnPrimary, fieldClass, labelClass } from '$lib/ui';

	let {
		supabase,
		userId,
		profile,
		members,
		picked = $bindable(null)
	}: {
		supabase: BasementClient | null;
		userId: string | undefined;
		profile: Profile;
		members: Member[];
		picked?: string[] | null;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
	let likesDraft = $state<string | null>(null);
	let avoidsDraft = $state<string | null>(null);
	let pending = $state(false);
	let saved = $state(false);

	const remembered = $derived(userId ? recallCookPrefs(userId) : { likes: '', avoids: '' });
	const likes = $derived(likesDraft ?? (profile.cook_likes || remembered.likes));
	const avoids = $derived(avoidsDraft ?? (profile.cook_avoids || remembered.avoids));
	const selected = $derived(picked ?? (userId ? [userId] : []));

	function toggle(id: string) {
		picked = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
	}

	async function save() {
		if (!supabase || !userId || pending) return;
		pending = true;
		saved = false;
		const cookLikes = likes.trim().slice(0, 2000);
		const cookAvoids = avoids.trim().slice(0, 2000);
		try {
			rememberCookPrefs(userId, cookLikes, cookAvoids);
			await persistProfileCookPrefs(supabase, userId, cookLikes, cookAvoids);
			likesDraft = cookLikes;
			avoidsDraft = cookAvoids;
			saved = true;
		} catch {
			saved = false;
		}
		pending = false;
	}
</script>

<form
	class="space-y-4"
	onsubmit={(event) => {
		event.preventDefault();
		void save();
	}}
>
	<p class="text-sm text-fog">{t.household.cookPrefsHelp}</p>
	{#if members.length > 1}
		<fieldset class="space-y-2">
			<legend class="text-sm font-medium">{t.household.cookFor}</legend>
			{#each members as member (member.user_id)}
				<label class="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={selected.includes(member.user_id)}
						onchange={() => toggle(member.user_id)}
					/>
					<span>
						{member.user_id === userId ? t.household.cookForYou : member.display_name}
					</span>
				</label>
			{/each}
		</fieldset>
	{/if}
	<label class={labelClass}>
		<span class="font-medium">{t.household.cookLikes}</span>
		<textarea
			class={[fieldClass, 'min-h-24']}
			maxlength="2000"
			placeholder={t.household.cookLikesPlaceholder}
			value={likes}
			oninput={(event) => {
				likesDraft = event.currentTarget.value;
				saved = false;
			}}></textarea>
	</label>
	<label class={labelClass}>
		<span class="font-medium">{t.household.cookAvoids}</span>
		<textarea
			class={[fieldClass, 'min-h-24']}
			maxlength="2000"
			placeholder={t.household.cookAvoidsPlaceholder}
			value={avoids}
			oninput={(event) => {
				avoidsDraft = event.currentTarget.value;
				saved = false;
			}}></textarea>
	</label>
	{#if saved}
		<p class="text-sm text-mint">{t.household.cookPrefsSaved}</p>
	{/if}
	<button class={btnPrimary} disabled={pending || !supabase || !userId} type="submit">
		{pending ? t.settings.saving : t.household.save}
	</button>
</form>
