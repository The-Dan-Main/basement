import { env as privateEnv } from '$env/dynamic/private';
import { isGeminiKey } from '$lib/ai-key';
import {
	clampCookNote,
	cookPreferencePrompt,
	stripJsonFences,
	type CookPerson
} from '$lib/ai-recipe';
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
	return privateEnv.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
}

export async function loadCookNotes(
	supabase: BasementClient,
	userId: string,
	householdId: string,
	preferUserIds: string[]
) {
	const wanted = [...new Set(preferUserIds.filter((id) => id.trim()))].slice(0, 12);
	const ids = wanted.length > 0 ? wanted : [userId];
	let allowed = new Set<string>();

	if (householdId) {
		const { data: membership } = await supabase
			.from('household_members')
			.select('user_id')
			.eq('household_id', householdId)
			.eq('user_id', userId)
			.maybeSingle();
		if (membership) {
			const { data: mates } = await supabase
				.from('household_members')
				.select('user_id')
				.eq('household_id', householdId)
				.in('user_id', ids);
			allowed = new Set((mates ?? []).map((row) => row.user_id));
		}
	}
	if (ids.includes(userId)) allowed.add(userId);
	if (allowed.size === 0) return [];

	const { data, error } = await supabase
		.from('profiles')
		.select('id, display_name, cook_likes, cook_avoids')
		.in('id', [...allowed]);
	if (error || !data) return [];

	const byId = new Map(data.map((row) => [row.id, row]));
	return ids
		.filter((id) => allowed.has(id))
		.map((id) => {
			const row = byId.get(id);
			return {
				id,
				name: row?.display_name?.trim() || '',
				likes: row?.cook_likes ?? '',
				avoids: row?.cook_avoids ?? ''
			};
		});
}

export async function cookPreferenceBlock(
	supabase: BasementClient,
	userId: string,
	body: Record<string, unknown>,
	kind: 'chat' | 'extract'
) {
	const prefer = Array.isArray(body.prefer_user_ids)
		? body.prefer_user_ids.filter((id): id is string => typeof id === 'string')
		: [];
	const householdId = typeof body.household_id === 'string' ? body.household_id : '';
	const stored = await loadCookNotes(supabase, userId, householdId, prefer);
	const fallbackLikes = clampCookNote(body.cook_likes);
	const fallbackAvoids = clampCookNote(body.cook_avoids);
	const includeSelf = prefer.length === 0 || prefer.includes(userId);
	let people: CookPerson[];
	if (stored.length === 0) {
		people =
			includeSelf && (fallbackLikes || fallbackAvoids)
				? [{ name: '', likes: fallbackLikes, avoids: fallbackAvoids }]
				: [];
	} else {
		people = stored.map((person) =>
			person.id === userId
				? {
						name: person.name,
						likes: person.likes || fallbackLikes,
						avoids: person.avoids || fallbackAvoids
					}
				: { name: person.name, likes: person.likes, avoids: person.avoids }
		);
	}
	return cookPreferencePrompt(people, kind);
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
