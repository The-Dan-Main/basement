<script lang="ts">
	let { size = 'md' }: { size?: 'sm' | 'md' | 'lg' } = $props();

	const box = $derived(size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-8 w-8' : 'h-9 w-9');
	const mark = $derived(size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5');
</script>

<span
	class={[
		'inline-flex items-center gap-2 font-semibold tracking-tight',
		size === 'lg' && 'text-xl'
	]}
>
	<span
		class={['relative grid place-items-center rounded-2xl bg-gold/15 ring-1 ring-gold/30', box]}
	>
		<svg class={['text-gold', mark]} viewBox="0 0 32 32" fill="none" aria-hidden="true">
			<rect x="7" y="8" width="18" height="17" rx="3" fill="currentColor" />
			<rect x="10" y="11" width="12" height="2" rx="1" fill="#061018" opacity="0.45" />
			<rect x="10" y="15" width="9" height="2" rx="1" fill="#061018" opacity="0.35" />
			<rect x="10" y="19" width="11" height="2" rx="1" fill="#061018" opacity="0.35" />
		</svg>
	</span>
	<span>Basement</span>
</span>
