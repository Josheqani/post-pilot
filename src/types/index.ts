export type PostStatus = 'draft' | 'ready' | 'published' | 'failed' | 'archived';

export type PostSource = 'manual' | 'ai';

export interface Post {
  id: string;
  userId: string;
  title?: string;
  content: string;
  status: PostStatus;
  source: PostSource;
  conversationId?: string;
  linkedinPostId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreatePostInput {
  title?: string;
  content: string;
  status?: PostStatus;
  source?: PostSource;
  conversationId?: string;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  status?: PostStatus;
}

export interface LinkedInAccount {
  id: string;
  userId: string;
  memberId: string;
  name: string;
  headline?: string;
  vanityName?: string;
  profilePictureUrl?: string;
  isConnected: boolean;
  connectedAt: string;
}

export type AISearchProtocol =
  | 'auto'
  | 'openai_tool'
  | 'google_search'
  | 'openrouter'
  | 'perplexity';

export interface AIConfig {
  id?: string;
  providerType: string;
  baseUrl: string;
  model: string;
  customHeaders?: Record<string, string>;
  temperature: number;
  hasApiKey: boolean;
  maskedApiKey: string;
  enableSearch?: boolean;
  searchProtocol?: AISearchProtocol;
  enableMemory?: boolean;
  memoryLimit?: number;
  memoryContent?: string;
}

export interface SaveAIConfigInput {
  baseUrl: string;
  apiKey?: string;
  model: string;
  customHeaders?: Record<string, string>;
  temperature?: number;
  enableSearch?: boolean;
  searchProtocol?: AISearchProtocol;
  enableMemory?: boolean;
  memoryLimit?: number;
  memoryContent?: string;
}

export interface CompactMemoryRequest {
  content?: string;
  limit?: number;
  model?: string;
}

export interface CompactMemoryResponse {
  success: boolean;
  compactedContent: string;
  originalSize: number;
  compactedSize: number;
  savedChars: number;
  message?: string;
}

export interface AITestResult {
  success: boolean;
  model?: string;
  latencyMs?: number;
  message: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  isPostDraft?: boolean;
  draftContent?: string;
  draftTitle?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
}

export type AIImproveAction =
  | 'improve'
  | 'rewrite'
  | 'change_tone'
  | 'generate_hook'
  | 'generate_hashtags'
  | 'generate_title';

export interface AIImproveRequest {
  action: AIImproveAction;
  content: string;
  tone?: string;
  instructions?: string;
}

export interface AIImproveResponse {
  result: string;
  action: AIImproveAction;
}
