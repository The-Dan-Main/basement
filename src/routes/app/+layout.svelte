<script lang="ts">
	import { bootOffline } from '$lib/offline/boot';
	import AppShell from '$lib/components/AppShell.svelte';

	let { children, data } = $props();

	$effect(() => {
		void bootOffline(data.supabase, data.user?.id ?? data.profile.id, data.profile);
	});
</script>

<AppShell profile={data.profile}>
	{@render children()}
</AppShell>
