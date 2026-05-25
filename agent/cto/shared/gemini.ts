import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');

export const ai = new GoogleGenAI({ apiKey });

export const MODELS = {
  pro:   'gemini-2.0-flash',  // high-stakes reasoning — 1500 RPD free tier
  flash: 'gemini-2.0-flash',  // speed-sensitive tasks  — same model, same quota pool
} as const;
// Upgrade pro → gemini-2.5-pro once billing is enabled on the Google AI Studio project

const RETRY_DELAYS_MS = [5000, 15000, 30000];

export async function generate(opts: {
  model: string;
  systemInstruction?: string;
  prompt: string;
  maxOutputTokens?: number;
  jsonMode?: boolean;
}): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: opts.model,
        contents: opts.prompt,
        config: {
          ...(opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : {}),
          maxOutputTokens: opts.maxOutputTokens ?? 4096,
          ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      });
      return response.text ?? '';
    } catch (err: unknown) {
      lastError = err;
      const isRateLimit = String(err).includes('429') || String(err).includes('RESOURCE_EXHAUSTED');
      if (!isRateLimit || attempt === RETRY_DELAYS_MS.length) throw err;
      const delay = RETRY_DELAYS_MS[attempt];
      console.warn(`[gemini] rate limited — retrying in ${delay / 1000}s (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}
