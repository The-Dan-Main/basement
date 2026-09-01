import { redirect } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { session } = await parent();
	if (session) redirect(303, '/app');

	const migrations = path.join(process.cwd(), 'supabase/migrations');
	const [init, locale] = await Promise.all([
		readFile(path.join(migrations, '001_init.sql'), 'utf8'),
		readFile(path.join(migrations, '002_locale.sql'), 'utf8')
	]);
	return { configured: locals.configured, sql: `${init}\n\n${locale}` };
};
