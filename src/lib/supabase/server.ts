import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import type { Database } from '$lib/types/database.types';
import type { BasementClient } from '$lib/supabase/client';

export function createServerSupabase(
	url: string,
	key: string,
	cookies: Cookies,
	fetchFn: typeof fetch
): BasementClient {
	return createServerClient<Database>(url, key, {
		global: { fetch: fetchFn },
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookiesToSet) => {
				for (const { name, value, options } of cookiesToSet) {
					cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});
}
