import { RawRecord } from '../../types/crm';

/**
 * A single element of the AI's response for a batch. It is either a
 * (loosely-typed) CRM record OR an explicit skip marker.
 */
export interface AiExtractionItem {
  skip?: boolean;
  reason?: string;
  [field: string]: unknown;
}

/** Uniform interface every provider implements. */
export interface AiProviderClient {
  /** Human-readable provider id, surfaced in the API response. */
  readonly name: string;
  /**
   * Map a batch of raw CSV rows into extraction items. Must return one item per
   * input row, in order. Should throw on transport/parse errors so the batch
   * processor can retry.
   */
  extract(rows: RawRecord[]): Promise<AiExtractionItem[]>;
}

/**
 * Pull a JSON object/array out of a possibly-noisy LLM text response.
 * Handles markdown code fences and leading/trailing prose.
 */
export function parseJsonResponse(text: string): AiExtractionItem[] {
  let cleaned = text.trim();

  // Strip ```json ... ``` or ``` ... ``` fences.
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // If there's still surrounding prose, grab the first {...} or [...] block.
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const objStart = cleaned.indexOf('{');
    const arrStart = cleaned.indexOf('[');
    const start =
      objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
    if (start > -1) cleaned = cleaned.slice(start);
  }

  const parsed = JSON.parse(cleaned);

  if (Array.isArray(parsed)) return parsed as AiExtractionItem[];
  if (parsed && Array.isArray(parsed.records)) return parsed.records as AiExtractionItem[];
  if (parsed && typeof parsed === 'object') return [parsed as AiExtractionItem];

  throw new Error('AI response did not contain a records array');
}
