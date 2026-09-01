<script lang="ts">
	let { label }: { label: string } = $props();
</script>

<button
	class="grid w-10 shrink-0 cursor-grab touch-none place-items-center text-fog/80 hover:text-paper active:cursor-grabbing"
	type="button"
	data-sortable-handle
	aria-label={label}
	title={label}
>
	<svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
		<circle cx="5" cy="3.5" r="1.15" />
		<circle cx="11" cy="3.5" r="1.15" />
		<circle cx="5" cy="8" r="1.15" />
		<circle cx="11" cy="8" r="1.15" />
		<circle cx="5" cy="12.5" r="1.15" />
		<circle cx="11" cy="12.5" r="1.15" />
	</svg>
</button>
