import { parsePublicHttpUrl } from '$lib/ai-recipe';

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const FETCH_HEADERS = {
	Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
	'Accept-Language': 'de,en;q=0.8',
	'User-Agent':
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
};

export class PageFetchError extends Error {
	status: number;
	constructor(message: string, status = 502) {
		super(message);
		this.name = 'PageFetchError';
		this.status = status;
	}
}

async function readLimited(response: Response, max = MAX_BYTES) {
	const length = Number(response.headers.get('content-length') ?? 0);
	if (length && length > max) throw new PageFetchError('too-large', 400);
	if (!response.body) return new Uint8Array();
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		total += value.byteLength;
		if (total > max) throw new PageFetchError('too-large', 400);
		chunks.push(value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

export async function fetchPublicPage(rawUrl: string) {
	let current = parsePublicHttpUrl(rawUrl);
	if (!current) throw new PageFetchError('bad-url', 400);

	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		const response = await fetch(current, {
			redirect: 'manual',
			headers: FETCH_HEADERS,
			signal: AbortSignal.timeout(12000)
		});
		if (response.status >= 300 && response.status < 400) {
			const next = response.headers.get('location');
			response.body?.cancel();
			if (!next) throw new PageFetchError('redirect', 502);
			const resolved = parsePublicHttpUrl(new URL(next, current).toString());
			if (!resolved) throw new PageFetchError('bad-url', 400);
			current = resolved;
			continue;
		}
		if (!response.ok) throw new PageFetchError('fetch', 502);
		const type = (response.headers.get('content-type') ?? '').toLowerCase();
		if (
			type &&
			!type.includes('text/html') &&
			!type.includes('application/xhtml') &&
			!type.includes('application/json') &&
			!type.includes('text/plain')
		) {
			throw new PageFetchError('type', 400);
		}
		const bytes = await readLimited(response);
		return { url: current.toString(), html: new TextDecoder().decode(bytes) };
	}
	throw new PageFetchError('redirect', 502);
}

export async function fetchPublicImage(rawUrl: string) {
	const url = parsePublicHttpUrl(rawUrl);
	if (!url) return null;
	try {
		const response = await fetch(url, {
			redirect: 'follow',
			headers: { Accept: 'image/*', 'User-Agent': FETCH_HEADERS['User-Agent'] },
			signal: AbortSignal.timeout(10000)
		});
		if (!response.ok) return null;
		const type = (response.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
		if (!type.startsWith('image/')) return null;
		const bytes = await readLimited(response, 2_500_000);
		if (!bytes.byteLength) return null;
		const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
		return {
			name: `import.${ext}`,
			type,
			base64: Buffer.from(bytes).toString('base64')
		};
	} catch {
		return null;
	}
}
