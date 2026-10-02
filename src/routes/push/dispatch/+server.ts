import { json, text } from '@sveltejs/kit';
import { getSupabaseConfig } from '$lib/server/env';
import { bearerMatches, dispatchNoonReminders } from '$lib/server/push';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { pushCronSecret } = getSupabaseConfig();
	if (!pushCronSecret) return text('Not configured', { status: 503 });
	if (!bearerMatches(request.headers.get('authorization'), pushCronSecret)) {
		return text('Unauthorized', { status: 401 });
	}
	const result = await dispatchNoonReminders();
	if ('error' in result) return text('Not configured', { status: 503 });
	return json(result);
};
