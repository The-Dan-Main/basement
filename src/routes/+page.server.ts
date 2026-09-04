import { redirect } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { session } = await parent();
	if (session) redirect(303, '/app');

	const migrations = path.join(process.cwd(), 'supabase/migrations');
	const files = [
		'001_init.sql',
		'002_locale.sql',
		'003_shopping_features.sql',
		'004_recipes.sql',
		'005_cookbooks_social.sql'
	];
	const chunks = await Promise.all(
		files.map((file) => readFile(path.join(migrations, file), 'utf8'))
	);
	return { configured: locals.configured, sql: chunks.join('\n\n') };
};
