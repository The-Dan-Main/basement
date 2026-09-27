export function normalizeGeminiKey(value: string) {
	return value.trim();
}

export function isGeminiKey(value: string) {
	const key = normalizeGeminiKey(value);
	return key.length >= 20 && !/\s/.test(key);
}

export function geminiKeyHint(value: string) {
	const key = normalizeGeminiKey(value);
	if (!isGeminiKey(key)) return '';
	return key.slice(-4);
}
