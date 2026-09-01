import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '$lib/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

export type BasementClient = SupabaseClient<Database>;

export function createBrowserSupabase(url: string, key: string): BasementClient {
	return createBrowserClient<Database>(url, key);
}
