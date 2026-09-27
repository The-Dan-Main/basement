import { getGeminiConfig, isGeminiConfigured } from '$lib/server/env';
import { stripJsonFences } from '$lib/ai-recipe';

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

export { isGeminiConfigured };

export async function generateGeminiJson(options: {
	system: string;
	user: string;
	history?: GeminiTurn[];
	schema: Record<string, unknown>;
	temperature?: number;
}): Promise<unknown> {
	const { apiKey, model } = getGeminiConfig();
	if (!apiKey) throw new GeminiError('missing-key', 503);

	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
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
