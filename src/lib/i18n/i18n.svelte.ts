import { createContext } from 'svelte';
import { browser } from '$app/environment';
import { messages, type Messages } from '$lib/i18n/messages';
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, type Locale } from '$lib/i18n/locales';
import type { BasementClient } from '$lib/supabase/client';

export class I18n {
	locale = $state<Locale>('en');
	t = $derived(messages[this.locale]);

	constructor(initial: Locale) {
		this.locale = initial;
	}

	async setLocale(
		next: Locale,
		opts?: { supabase?: BasementClient | null; userId?: string | null }
	) {
		this.locale = next;
		if (browser) {
			document.cookie = `${LOCALE_COOKIE}=${next}; Path=${LOCALE_COOKIE_OPTIONS.path}; Max-Age=${LOCALE_COOKIE_OPTIONS.maxAge}; SameSite=${LOCALE_COOKIE_OPTIONS.sameSite}`;
			document.documentElement.lang = next;
		}
		if (opts?.supabase && opts.userId) {
			await opts.supabase.from('profiles').update({ locale: next }).eq('id', opts.userId);
		}
	}

	errorText(form?: { code?: string; message?: string } | null): string {
		if (!form) return '';
		const keyed = form.code ? this.t.errors[form.code as keyof Messages['errors']] : undefined;
		return keyed ?? form.message ?? '';
	}
}

export const [getI18n, setI18n] = createContext<I18n>();
export type { Messages };
