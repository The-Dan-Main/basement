<script lang="ts">
	import { fill } from '$lib/i18n/locales';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { panelClass } from '$lib/ui';
	import type { ScoreRow } from '$lib/chores';

	let {
		scores,
		userId,
		empty
	}: {
		scores: ScoreRow[];
		userId?: string;
		empty: string;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
	const medals = ['🥇', '🥈', '🥉'];
</script>

{#if scores.length === 0}
	<p class="text-sm text-fog">{empty}</p>
{:else}
	<ol class="space-y-2">
		{#each scores as row (row.userId)}
			<li
				class={[
					panelClass,
					'flex items-center justify-between gap-3 px-4 py-3',
					row.userId === userId ? 'border-gold/50' : ''
				]}
			>
				<div class="flex min-w-0 items-center gap-3">
					<span class="w-8 text-center text-lg" aria-hidden="true">
						{medals[row.rank - 1] ?? fill(t.chores.place, { rank: row.rank })}
					</span>
					<div class="min-w-0">
						<p class="truncate font-semibold">
							{row.displayName}
							{#if row.userId === userId}
								<span class="text-xs font-medium text-gold">· {t.chores.you}</span>
							{/if}
						</p>
						<p class="text-xs text-fog">{fill(t.chores.week, { count: row.weekPoints })}</p>
					</div>
				</div>
				<span class="shrink-0 rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
					{fill(t.chores.points, { count: row.points })}
				</span>
			</li>
		{/each}
	</ol>
{/if}
