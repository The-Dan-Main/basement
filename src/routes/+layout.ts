import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { Database } from '$lib/types/database.types';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	const publicData = {
		session: data.session,
		user: data.user,
		configured: data.configured,
		supabaseUrl: data.supabaseUrl,
		supabaseKey: data.supabaseKey,
		locale: data.locale
	};

	if (!data.configured || !data.supabaseUrl || !data.supabaseKey) {
		return {
			...publicData,
			supabase: null,
			session: null,
			user: null
		};
	}

	const supabase = isBrowser()
		? createBrowserClient<Database>(data.supabaseUrl, data.supabaseKey, {
				global: { fetch }
			})
		: createServerClient<Database>(data.supabaseUrl, data.supabaseKey, {
				global: { fetch },
				cookies: {
					getAll() {
						return data.cookies;
					}
				}
			});

	const {
		data: { session }
	} = await supabase.auth.getSession();

	return {
		...publicData,
		supabase,
		session,
		user: data.user
	};
};
