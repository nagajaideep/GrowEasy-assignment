import { env } from '../../config/env';
import { RawRecord } from '../../types/crm';
import { buildBatchPrompt, SYSTEM_PROMPT } from '../../prompts/extractionPrompt';
import { AiExtractionItem, AiProviderClient, parseJsonResponse } from './types';

/**
 * Google Gemini provider using the Generative Language REST API.
 * Uses the global fetch available in Node 18+.
 */
export class GeminiProvider implements AiProviderClient {
  readonly name = `gemini:${env.gemini.model}`;

  async extract(rows: RawRecord[]): Promise<AiExtractionItem[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.gemini.model}:generateContent?key=${env.gemini.apiKey}`;

    const body = {
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildBatchPrompt(rows) }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('Gemini returned an empty response');

    return parseJsonResponse(text);
  }
}
