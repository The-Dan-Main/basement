import type { BasementClient } from '$lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '$lib/types/app';
import type { Locale } from '$lib/i18n/locales';

export function displayNameFromUser(user: User) {
	return (
		(user.user_metadata?.display_name as string | undefined)?.trim() ||
		user.email?.split('@')[0] ||
		'Shopper'
	);
}

export async function ensureProfile(
	supabase: BasementClient,
	user: User,
	locale?: Locale
): Promise<Profile | null> {
	const existing = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
	if (existing.data) {
		const profile = { ...existing.data, locale: existing.data.locale ?? 'en' };
		await ensureHousehold(supabase, user, profile);
		return profile;
	}

	const displayName = displayNameFromUser(user);
	const inserted = await supabase
		.from('profiles')
		.insert({ id: user.id, display_name: displayName, locale: locale ?? 'en' })
		.select('*')
		.maybeSingle();

	if (!inserted.data) return null;
	await ensureHousehold(supabase, user, inserted.data);
	return inserted.data;
}

async function ensureHousehold(supabase: BasementClient, user: User, profile: Profile) {
	const { data: membership } = await supabase
		.from('household_members')
		.select('household_id')
		.eq('user_id', user.id)
		.limit(1)
		.maybeSingle();
	if (membership) return;

	const { data: household, error } = await supabase
		.from('households')
		.insert({ name: `${profile.display_name}'s household`, created_by: user.id })
		.select('*')
		.maybeSingle();
	if (error || !household) return;

	await supabase.from('household_members').insert({
		household_id: household.id,
		user_id: user.id,
		role: 'owner'
	});
}
