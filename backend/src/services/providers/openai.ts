import { env } from '../../config/env';
import { RawRecord } from '../../types/crm';
import { buildBatchPrompt, SYSTEM_PROMPT } from '../../prompts/extractionPrompt';
import { AiExtractionItem, AiProviderClient, parseJsonResponse } from './types';

/**
 * OpenAI provider using the Chat Completions REST API with JSON mode.
 * Uses the global fetch available in Node 18+.
 */
export class OpenAiProvider implements AiProviderClient {
  readonly name = `openai:${env.openai.model}`;

  async extract(rows: RawRecord[]): Promise<AiExtractionItem[]> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: env.openai.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildBatchPrompt(rows) },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${detail.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('OpenAI returned an empty response');

    return parseJsonResponse(text);
  }
}
