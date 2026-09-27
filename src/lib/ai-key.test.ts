import assert from 'node:assert/strict';
import { geminiKeyHint, isGeminiKey, normalizeGeminiKey } from './ai-key.ts';

assert.equal(normalizeGeminiKey('  AIzaSyDummyKeyForTests12345  '), 'AIzaSyDummyKeyForTests12345');
assert.equal(isGeminiKey(''), false);
assert.equal(isGeminiKey('short'), false);
assert.equal(isGeminiKey('AIza with spaces that are long enough'), false);
assert.equal(isGeminiKey('AIzaSyDummyKeyForTests12345'), true);
assert.equal(geminiKeyHint('AIzaSyDummyKeyForTests12345'), '2345');
assert.equal(geminiKeyHint('nope'), '');

console.log('ai-key.test.ts ok');
