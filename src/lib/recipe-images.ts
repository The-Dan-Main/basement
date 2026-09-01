import type { BasementClient } from '$lib/supabase/client';

const BUCKET = 'recipe-images';
const SIGNED_TTL = 60 * 60 * 24;

const EXT_BY_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif'
};

export function recipeImagePath(householdId: string, recipeId: string, file: File) {
	const fromName = file.name.split('.').pop()?.toLowerCase() ?? '';
	const mapped =
		EXT_BY_TYPE[file.type] ??
		(fromName === 'jpeg'
			? 'jpg'
			: ['jpg', 'png', 'webp', 'gif'].includes(fromName)
				? fromName
				: 'jpg');
	return `${householdId}/${recipeId}.${mapped}`;
}

export async function uploadRecipeImage(
	supabase: BasementClient,
	householdId: string,
	recipeId: string,
	file: File,
	previousPath = ''
) {
	const path = recipeImagePath(householdId, recipeId, file);
	const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
		upsert: true,
		contentType: file.type || undefined
	});
	if (error) throw error;
	if (previousPath && previousPath !== path) {
		await supabase.storage.from(BUCKET).remove([previousPath]);
	}
	return path;
}

export async function removeRecipeImage(supabase: BasementClient, path: string) {
	if (!path) return;
	const { error } = await supabase.storage.from(BUCKET).remove([path]);
	if (error) throw error;
}

export async function signRecipeImageUrls(supabase: BasementClient, paths: string[]) {
	const unique = [...new Set(paths.filter(Boolean))];
	if (unique.length === 0) return new Map<string, string>();
	const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, SIGNED_TTL);
	if (error || !data) return new Map<string, string>();
	return new Map(
		data
			.filter((row) => row.path && row.signedUrl)
			.map((row) => [row.path as string, row.signedUrl as string])
	);
}
