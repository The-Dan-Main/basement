export const LOCALES = ['en', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = 'basement_locale';

export const LOCALE_LABELS: Record<Locale, string> = {
	en: 'English',
	de: 'Deutsch'
};

export const LOCALE_COOKIE_OPTIONS = {
	path: '/',
	maxAge: 60 * 60 * 24 * 365,
	sameSite: 'lax' as const,
	httpOnly: false
};

export function isLocale(value: string | null | undefined): value is Locale {
	return value === 'en' || value === 'de';
}

export function parseLocale(value: string | null | undefined): Locale {
	return isLocale(value) ? value : 'en';
}

export function localeFromAccept(header: string | null | undefined): Locale {
	const lower = header?.toLowerCase() ?? '';
	if (lower.includes('de')) return 'de';
	return 'en';
}

export function fill(template: string, vars: Record<string, string | number> = {}): string {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}
