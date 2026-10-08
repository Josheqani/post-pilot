import { AIProvider, AIProviderConfig } from './types';
import { OpenAICompatibleProvider } from './openai';

export function createAIProvider(config: AIProviderConfig): AIProvider {
  const providerType = config.providerType || 'openai-compatible';

  switch (providerType) {
    case 'openai-compatible':
    default:
      return new OpenAICompatibleProvider(config);
  }
}
