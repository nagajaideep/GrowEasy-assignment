import dotenv from 'dotenv';

dotenv.config();

/**
 * Supported AI providers. `mock` is a deterministic, key-free heuristic
 * extractor that lets the app run end-to-end without any API keys (useful for
 * local dev, CI, and reviewers). Real prompt-engineered extraction happens via
 * `gemini` or `openai`.
 */
export type AiProvider = 'gemini' | 'openai' | 'mock';

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const explicitProvider = process.env.AI_PROVIDER as AiProvider | undefined;

/**
 * Resolve the active provider. If the user explicitly sets AI_PROVIDER we
 * respect it; otherwise we auto-detect based on which API key is present and
 * fall back to the mock provider so the service always boots.
 */
function resolveProvider(): AiProvider {
  if (explicitProvider) return explicitProvider;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'mock';
}

export const env = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  aiProvider: resolveProvider(),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-flash-latest',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  },

  /** How many CSV rows to send to the AI per request. */
  batchSize: num(process.env.AI_BATCH_SIZE, 20),
  /** How many times to retry a failed AI batch before giving up. */
  maxRetries: num(process.env.AI_MAX_RETRIES, 3),
  /** Max uploaded file size in MB. */
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 10),
} as const;
