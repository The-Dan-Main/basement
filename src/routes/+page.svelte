<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import SetupPanel from '$lib/components/SetupPanel.svelte';
	import { getI18n } from '$lib/i18n/i18n.svelte';
	import { btnGhost, btnPrimary, panelClass } from '$lib/ui';
	import { resolve } from '$app/paths';

	let { data } = $props();
	const i18n = getI18n();
	const t = $derived(i18n.t);
</script>

<svelte:head>
	<title>{t.landing.title}</title>
</svelte:head>

<div class="relative overflow-hidden">
	<div class="glow glow-a" aria-hidden="true"></div>
	<div class="glow glow-b" aria-hidden="true"></div>

	<header class="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
		<Logo size="lg" />
		<nav class="flex items-center gap-2">
			<LanguageSwitcher />
			<a class={btnGhost} href={resolve('/login')}>{t.nav.logIn}</a>
			<a class={btnPrimary} href={resolve('/signup')}>{t.nav.getStarted}</a>
		</nav>
	</header>

	<main class="relative mx-auto max-w-6xl space-y-16 px-4 py-10 md:px-6 md:py-16">
		<section class="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
			<div class="space-y-6">
				<p class="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
					{t.landing.kicker}
				</p>
				<h1 class="max-w-xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
					{t.landing.heading}<br class="hidden sm:block" />
					{t.landing.headingBreak}
				</h1>
				<p class="max-w-lg text-base leading-7 text-fog sm:text-lg">
					{t.landing.body}
				</p>
				<div class="flex flex-wrap gap-3">
					<a class={btnPrimary} href={resolve('/signup')}>{t.landing.start}</a>
					<a class={btnGhost} href={resolve('/login')}>{t.landing.haveAccount}</a>
				</div>
			</div>

			<div class="relative mx-auto w-full max-w-md">
				<div class="absolute -top-8 -right-6 h-40 w-40 rounded-full bg-gold/15 blur-3xl"></div>
				<div
					class="absolute -bottom-10 -left-8 h-36 w-36 rounded-full bg-sky-500/20 blur-3xl"
				></div>
				<div
					class={[
						panelClass,
						'relative overflow-hidden p-6 shadow-[0_24px_80px_rgba(6,16,24,0.55)]'
					]}
				>
					<div class="flex items-center justify-between">
						<p class="text-xs tracking-[0.2em] text-gold uppercase">{t.landing.previewKicker}</p>
						<span class="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold"
							>{t.landing.previewLeft}</span
						>
					</div>
					<ul class="mt-6 space-y-3">
						{#each t.landing.preview as item (item.name)}
							<li class="flex items-center gap-3 rounded-2xl bg-ink-soft/80 px-3 py-3">
								<span
									class={[
										'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2',
										item.done ? 'border-gold bg-gold text-ink' : 'border-gold/40'
									]}
								>
									{#if item.done}
										<svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
											<path
												d="M3.5 8.2 6.4 11l6.1-7"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									{/if}
								</span>
								<div class="min-w-0">
									<p class={['font-semibold', item.done && 'text-fog line-through']}>{item.name}</p>
									{#if item.note}
										<p class="text-xs text-fog">{item.note}</p>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
					<p class="mt-5 text-xs text-fog">{t.landing.previewFoot}</p>
				</div>
			</div>
		</section>

		{#if !data.configured}
			<SetupPanel sql={data.sql} />
		{/if}

		<section class="grid gap-3 md:grid-cols-3">
			{#each t.landing.steps as step, index (step.title)}
				<article class={[panelClass, 'p-5']}>
					<p class="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
						0{index + 1}
					</p>
					<h2 class="mt-3 text-lg font-semibold">{step.title}</h2>
					<p class="mt-2 text-sm leading-6 text-fog">{step.body}</p>
				</article>
			{/each}
		</section>

		<section class="grid gap-4 md:grid-cols-3">
			{#each t.landing.features as feature (feature.title)}
				<article class={[panelClass, 'p-6']}>
					<h2 class="text-lg font-semibold">{feature.title}</h2>
					<p class="mt-3 text-sm leading-6 text-fog">{feature.body}</p>
				</article>
			{/each}
		</section>
	</main>
</div>

<style>
	.glow {
		pointer-events: none;
		position: absolute;
		border-radius: 999px;
		filter: blur(80px);
	}

	.glow-a {
		top: -6rem;
		left: 20%;
		width: 28rem;
		height: 22rem;
		background: color-mix(in srgb, var(--color-gold) 22%, transparent);
	}

	.glow-b {
		top: 4rem;
		right: -4rem;
		width: 22rem;
		height: 22rem;
		background: color-mix(in srgb, #1d6bff 18%, transparent);
	}
</style>
