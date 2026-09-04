<script lang="ts">
	import {
		CHORE_INTENSITIES,
		CHORE_POINTS,
		type ChoreFrequencyUnit,
		type ChoreIntensity
	} from '$lib/chores';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { fill } from '$lib/i18n/locales';
	import { btnPrimary, fieldClass, selectClass } from '$lib/ui';

	export type ChoreFormValue = {
		title: string;
		description: string;
		frequency_unit: ChoreFrequencyUnit;
		frequency_every: number;
		intensity: ChoreIntensity;
	};

	let {
		value = $bindable(),
		saving = false,
		submitLabel
	}: {
		value: ChoreFormValue;
		saving?: boolean;
		submitLabel: string;
	} = $props();

	const i18n = getI18n();
	const t = $derived(i18n.t);
	const intensityLabel = $derived({
		light: t.chores.light,
		medium: t.chores.medium,
		heavy: t.chores.heavy
	});
</script>

<div class="space-y-5">
	<label class="block space-y-2 text-sm">
		<span>{t.chores.titleLabel}</span>
		<input
			class={fieldClass}
			bind:value={value.title}
			maxlength="80"
			placeholder={t.chores.titlePlaceholder}
			required
		/>
	</label>
	<label class="block space-y-2 text-sm">
		<span>{t.chores.description}</span>
		<textarea
			class={[fieldClass, 'min-h-24']}
			bind:value={value.description}
			placeholder={t.chores.descriptionPlaceholder}
		></textarea>
	</label>
	<fieldset class="space-y-3">
		<legend class="text-sm font-medium">{t.chores.frequency}</legend>
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-sm text-fog">{t.chores.every}</span>
			<input
				class="w-20 min-w-0 rounded-2xl border border-line bg-ink-soft px-3 py-3 text-paper outline-none focus:border-gold/70"
				type="number"
				min="1"
				max="52"
				bind:value={value.frequency_every}
			/>
			<select class={selectClass} bind:value={value.frequency_unit}>
				<option value="week">{t.chores.unitWeek}</option>
				<option value="month">{t.chores.unitMonth}</option>
			</select>
		</div>
	</fieldset>
	<fieldset class="space-y-3">
		<legend class="text-sm font-medium">{t.chores.intensity}</legend>
		<p class="text-sm text-fog">{t.chores.intensityHelp}</p>
		<div class="flex flex-wrap gap-2">
			{#each CHORE_INTENSITIES as intensity (intensity)}
				<button
					class={[
						'rounded-2xl border px-4 py-3 text-left text-sm transition',
						value.intensity === intensity
							? 'border-gold bg-gold/15 text-gold'
							: 'border-line text-paper hover:border-gold/40'
					]}
					type="button"
					onclick={() => (value = { ...value, intensity })}
				>
					<p class="font-semibold">{intensityLabel[intensity]}</p>
					<p class="mt-1 text-xs text-fog">{fill(t.chores.points, { count: CHORE_POINTS[intensity] })}</p>
				</button>
			{/each}
		</div>
	</fieldset>
	<button class={btnPrimary} disabled={saving || !value.title.trim()} type="submit">
		{saving ? t.chores.saving : submitLabel}
	</button>
</div>
