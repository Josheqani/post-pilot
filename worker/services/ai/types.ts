export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIChatOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  enableSearch?: boolean;
}

export interface AIGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enableSearch?: boolean;
}

export interface AIProviderConfig {
  providerType?: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  customHeaders?: Record<string, string>;
  temperature?: number;
  enableSearch?: boolean;
}

export interface AITestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  model?: string;
}

/**
 * Universal interface for AI Providers in PostPilot.
 * Implementations handle specific vendor protocols (OpenAI-compatible, Anthropic, etc.).
 */
export interface AIProvider {
  readonly name: string;
  testConnection(): Promise<AITestResult>;
  chat(options: AIChatOptions): Promise<AIResponse>;
  generate(options: AIGenerateOptions): Promise<AIResponse>;
}
