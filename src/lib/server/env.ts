import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export function getSupabaseConfig() {
	return {
		url: publicEnv.PUBLIC_SUPABASE_URL?.trim() ?? '',
		publishableKey: publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
		serviceKey: privateEnv.SUPABASE_SERVICE_SECRET_KEY?.trim() ?? '',
		baseUrl: publicEnv.PUBLIC_BASE_URL?.trim() || 'http://localhost:5173'
	};
}

export function isSupabaseConfigured() {
	const { url, publishableKey } = getSupabaseConfig();
	return url.startsWith('http') && publishableKey.length > 20;
}
