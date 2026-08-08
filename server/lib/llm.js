/**
 * server/lib/llm.js
 *
 * Gemini client singleton.
 * This module lives on the server only — the API key is never exposed to the client.
 * The client is initialised lazily so that the server starts even if the key is
 * missing (the fallback mode handles that case gracefully).
 */
import { GoogleGenAI } from '@google/genai';

let _client = null;

/**
 * Returns the shared GoogleGenAI client instance.
 * Throws a clear error if GEMINI_API_KEY is not set, rather than letting the
 * SDK throw an opaque error later.
 */
export function getLlmClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY is not set in server/.env. ' +
        'Set AI_FALLBACK=true to use deterministic mock classification instead.'
    );
  }

  if (!_client) {
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('[llm] Gemini client initialised');
  }

  return _client;
}

/**
 * Returns the configured model name.
 * Falls back to gemini-2.5-pro if GEMINI_MODEL is not set.
 */
export function getModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-pro';
}
