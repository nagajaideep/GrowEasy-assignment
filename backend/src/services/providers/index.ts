import { AiProvider, env } from '../../config/env';
import { GeminiProvider } from './gemini';
import { OpenAiProvider } from './openai';
import { MockProvider } from './mock';
import { AiProviderClient } from './types';

/**
 * Factory that returns the configured provider. Falls back to the mock provider
 * when a real provider is selected but its API key is missing, so the service
 * never hard-crashes due to misconfiguration.
 */
export function createProvider(provider: AiProvider = env.aiProvider): AiProviderClient {
  switch (provider) {
    case 'gemini':
      if (!env.gemini.apiKey) {
        console.warn('[ai] GEMINI_API_KEY missing — falling back to mock provider.');
        return new MockProvider();
      }
      return new GeminiProvider();
    case 'openai':
      if (!env.openai.apiKey) {
        console.warn('[ai] OPENAI_API_KEY missing — falling back to mock provider.');
        return new MockProvider();
      }
      return new OpenAiProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}

export type { AiProviderClient } from './types';
