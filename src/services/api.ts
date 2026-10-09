import {
  Post,
  PostStatus,
  CreatePostInput,
  UpdatePostInput,
  LinkedInAccount,
  AIConfig,
  SaveAIConfigInput,
  AITestResult,
  Conversation,
  Message,
  User,
  AIImproveRequest,
  AIImproveResponse,
  CompactMemoryRequest,
  CompactMemoryResponse,
} from '@/types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data: unknown;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorObj = data as { error?: string; details?: unknown };
    const errorMsg =
      errorObj?.error ||
      (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    throw new ApiError(errorMsg, response.status, errorObj?.details);
  }

  return data as T;
}

export const api = {
  auth: {
    getMe: () => request<User>('/me'),
  },

  linkedin: {
    getStatus: () =>
      request<{ isConnected: boolean; account: LinkedInAccount | null }>('/linkedin/status'),
    getAuthUrl: (redirectUri?: string) => {
      const q = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
      return request<{ isConfigured: boolean; url?: string; message?: string }>(
        `/linkedin/auth-url${q}`
      );
    },
    submitCallback: (code: string, redirectUri?: string) =>
      request<{ success: boolean; profile: unknown }>('/linkedin/callback', {
        method: 'POST',
        body: JSON.stringify({ code, redirectUri }),
      }),
    disconnect: () =>
      request<{ success: boolean }>('/linkedin/disconnect', {
        method: 'POST',
      }),
    mockConnect: (data?: { name?: string; headline?: string }) =>
      request<{ success: boolean; account: LinkedInAccount }>('/linkedin/mock-connect', {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
  },

  ai: {
    getConfig: () => request<AIConfig>('/ai/config'),
    saveConfig: (data: SaveAIConfigInput) =>
      request<{ success: boolean; message: string }>('/ai/config', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    testConnection: (data?: Partial<SaveAIConfigInput>) =>
      request<AITestResult>('/ai/test', {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    improveContent: (data: AIImproveRequest) =>
      request<AIImproveResponse>('/ai/improve', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    compactMemory: (data: CompactMemoryRequest) =>
      request<CompactMemoryResponse>('/ai/memory/compact', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    clearMemory: () =>
      request<{ success: boolean; message: string }>('/ai/memory', {
        method: 'DELETE',
      }),
  },

  conversations: {
    list: () => request<Conversation[]>('/conversations'),
    create: (title?: string) =>
      request<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    get: (id: string) =>
      request<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
    delete: (id: string) =>
      request<{ success: boolean }>(`/conversations/${id}`, {
        method: 'DELETE',
      }),
    sendMessage: (id: string, content: string) =>
      request<{ userMessage: Message; assistantMessage: Message }>(
        `/conversations/${id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        }
      ),
  },

  posts: {
    list: (status?: PostStatus | 'all', search?: string) => {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search && search.trim()) params.append('search', search.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<Post[]>(`/posts${query}`);
    },
    get: (id: string) => request<Post>(`/posts/${id}`),
    create: (data: CreatePostInput) =>
      request<Post>('/posts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdatePostInput) =>
      request<Post>(`/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; id: string }>(`/posts/${id}`, {
        method: 'DELETE',
      }),
    publish: (id: string) =>
      request<{ success: boolean; post: Post; linkedinPostId?: string; error?: string }>(
        `/posts/${id}/publish`,
        {
          method: 'POST',
        }
      ),
  },
};
