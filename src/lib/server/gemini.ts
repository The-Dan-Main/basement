import { env as privateEnv } from '$env/dynamic/private';
import { isGeminiKey } from '$lib/ai-key';
import { stripJsonFences } from '$lib/ai-recipe';
import type { BasementClient } from '$lib/supabase/client';

export class GeminiError extends Error {
	status: number;
	constructor(message: string, status = 502) {
		super(message);
		this.name = 'GeminiError';
		this.status = status;
	}
}

type GeminiPart = { text?: string };
type GeminiResponse = {
	candidates?: { content?: { parts?: GeminiPart[] } }[];
	error?: { message?: string };
};

export type GeminiTurn = {
	role: 'user' | 'model';
	parts: { text: string }[];
};

export function getGeminiModel() {
	return privateEnv.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

export async function loadUserGeminiKey(supabase: BasementClient, userId: string) {
	const { data } = await supabase
		.from('user_ai_keys')
		.select('gemini_api_key')
		.eq('user_id', userId)
		.maybeSingle();
	const key = data?.gemini_api_key?.trim() ?? '';
	return isGeminiKey(key) ? key : '';
}

export async function generateGeminiJson(options: {
	apiKey: string;
	system: string;
	user: string;
	history?: GeminiTurn[];
	schema: Record<string, unknown>;
	temperature?: number;
}): Promise<unknown> {
	const apiKey = options.apiKey.trim();
	if (!isGeminiKey(apiKey)) throw new GeminiError('missing-key', 503);

	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getGeminiModel())}:generateContent`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-goog-api-key': apiKey,
				'User-Agent': 'Mozilla/5.0 (compatible; Basement/1.0)'
			},
			body: JSON.stringify({
				systemInstruction: { parts: [{ text: options.system }] },
				contents: [...(options.history ?? []), { role: 'user', parts: [{ text: options.user }] }],
				generationConfig: {
					temperature: options.temperature ?? 0.35,
					responseMimeType: 'application/json',
					responseSchema: options.schema
				}
			}),
			signal: AbortSignal.timeout(45000)
		}
	);

	const payload = (await response.json().catch(() => null)) as GeminiResponse | null;
	if (!response.ok) {
		const client = response.status >= 400 && response.status < 500;
		throw new GeminiError(payload?.error?.message || 'gemini', client ? 400 : 502);
	}

	const text = (payload?.candidates?.[0]?.content?.parts ?? [])
		.map((part) => part.text ?? '')
		.join('')
		.trim();
	if (!text) throw new GeminiError('empty', 502);
	try {
		return JSON.parse(stripJsonFences(text));
	} catch {
		throw new GeminiError('invalid-json', 502);
	}
}
