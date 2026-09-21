import { messages, type Messages } from './i18n/messages.ts';
import type { Locale } from './i18n/locales.ts';
import type { SiteContent } from './types/database.types.ts';

export type LandingCopy = Messages['landing'];

export function contentByLocale(rows: SiteContent[], locale: Locale) {
	const map = new Map<string, string>();
	for (const row of rows) {
		if (row.locale === locale) map.set(row.key, row.value);
	}
	return map;
}

export function siteNameFrom(rows: SiteContent[], locale: Locale) {
	return contentByLocale(rows, locale).get('site.name') ?? 'Basement';
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

export function landingFromContent(rows: SiteContent[], locale: Locale): LandingCopy {
	const base = messages[locale].landing;
	const map = contentByLocale(rows, locale);
	const get = (key: string, fallback: string) => map.get(key) ?? fallback;

	return {
		title: get('landing.title', base.title),
		kicker: get('landing.kicker', base.kicker),
		heading: get('landing.heading', base.heading),
		headingBreak: get('landing.headingBreak', base.headingBreak),
		body: get('landing.body', base.body),
		start: get('landing.start', base.start),
		haveAccount: get('landing.haveAccount', base.haveAccount),
		previewKicker: get('landing.previewKicker', base.previewKicker),
		previewLeft: get('landing.previewLeft', base.previewLeft),
		previewFoot: get('landing.previewFoot', base.previewFoot),
		preview: parseJson(map.get('landing.preview'), base.preview),
		steps: parseJson(map.get('landing.steps'), base.steps),
		features: parseJson(map.get('landing.features'), base.features)
	};
}
