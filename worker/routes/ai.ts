import { RequestContext } from '../types';
import { jsonResponse, errorResponse } from '../middleware/error';
import { AIConfigRow } from '../db/schema';
import {
  AIConfig,
  SaveAIConfigInput,
  AIImproveRequest,
  AISearchProtocol,
  CompactMemoryRequest,
} from '@/types';
import { encryptSecret, decryptSecret, maskSecret } from '../services/crypto';
import { createAIProvider } from '../services/ai/factory';
import { improveContent } from '../services/ai/service';
import { generateId } from '../db/client';

export async function handleAIRoutes(
  request: Request,
  ctx: RequestContext
): Promise<Response | null> {
  const { url, env, userId } = ctx;

  // 1. Get AI Configuration
  if (url.pathname === '/api/ai/config' && request.method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT * FROM ai_configs WHERE user_id = ? AND is_active = 1 LIMIT 1'
    )
      .bind(userId)
      .first<AIConfigRow>();

    if (!row) {
      // Return defaults if none configured yet
      const payload: AIConfig = {
        providerType: 'openai-compatible',
        baseUrl: env.DEFAULT_AI_BASE_URL || 'https://api.openai.com/v1',
        model: env.DEFAULT_AI_MODEL || 'gpt-4o',
        temperature: 0.7,
        hasApiKey: Boolean(env.DEFAULT_AI_API_KEY),
        maskedApiKey: env.DEFAULT_AI_API_KEY ? maskSecret(env.DEFAULT_AI_API_KEY) : '',
        customHeaders: {},
      };
      return jsonResponse(payload);
    }

    let customHeaders: Record<string, string> = {};
    let enableSearch = false;
    let searchProtocol: AISearchProtocol = 'auto';
    let enableMemory = false;
    let memoryLimit = 2000;
    let memoryContent = '';

    if (row.custom_headers) {
      try {
        const parsed = JSON.parse(row.custom_headers);
        if (parsed._enable_search === 'true' || parsed._enable_search === true) {
          enableSearch = true;
        }
        if (parsed._search_protocol) {
          searchProtocol = parsed._search_protocol;
        }
        if (parsed._enable_memory === 'true' || parsed._enable_memory === true) {
          enableMemory = true;
        }
        if (typeof parsed._memory_limit === 'number') {
          memoryLimit = parsed._memory_limit;
        } else if (parsed._memory_limit) {
          memoryLimit = parseInt(parsed._memory_limit, 10) || 2000;
        }
        if (typeof parsed._memory_content === 'string') {
          memoryContent = parsed._memory_content;
        }

        delete parsed._enable_search;
        delete parsed._search_protocol;
        delete parsed._enable_memory;
        delete parsed._memory_limit;
        delete parsed._memory_content;
        customHeaders = parsed;
      } catch {
        // ignore
      }
    }

    let rawKey = '';
    try {
      rawKey = await decryptSecret(row.api_key, env.ENCRYPTION_KEY);
    } catch {
      // fallback
    }

    const payload: AIConfig = {
      id: row.id,
      providerType: row.provider_type,
      baseUrl: row.base_url,
      model: row.model,
      customHeaders,
      temperature: row.temperature,
      hasApiKey: Boolean(row.api_key),
      maskedApiKey: maskSecret(rawKey),
      enableSearch,
      searchProtocol,
      enableMemory,
      memoryLimit,
      memoryContent,
    };

    return jsonResponse(payload);
  }

  // 2. Save / Update AI Configuration
  if (url.pathname === '/api/ai/config' && request.method === 'PUT') {
    const body = (await request.json()) as SaveAIConfigInput;

    if (!body.baseUrl) {
      return errorResponse('Base URL is required', 400);
    }
    if (!body.model) {
      return errorResponse('Model is required', 400);
    }

    const existing = await env.DB.prepare('SELECT * FROM ai_configs WHERE user_id = ? LIMIT 1')
      .bind(userId)
      .first<AIConfigRow>();

    let encryptedKey = existing ? existing.api_key : '';

    if (body.apiKey && body.apiKey.trim().length > 0) {
      encryptedKey = await encryptSecret(body.apiKey.trim(), env.ENCRYPTION_KEY);
    }

    if (!encryptedKey) {
      return errorResponse('API key is required', 400);
    }

    let normalizedBaseUrl = body.baseUrl.trim();
    if (normalizedBaseUrl.endsWith('/')) {
      normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
    }

    let normalizedModel = body.model.trim();
    if (normalizedModel === 'gpt-luna-6') normalizedModel = 'gpt-6-luna';
    else if (normalizedModel === 'gpt-luna-5.6') normalizedModel = 'gpt-5.6-luna';
    else if (normalizedModel === 'gpt-sol-6') normalizedModel = 'gpt-6-sol';
    else if (normalizedModel === 'gpt-sol-6.1') normalizedModel = 'gpt-6.1-sol';
    else if (normalizedModel === 'gpt-astra-6') normalizedModel = 'gpt-6-astra';
    else if (normalizedModel === 'gpt-terra-5.6') normalizedModel = 'gpt-5.6-terra';

    let existingMemoryContent = '';
    let existingMemoryLimit = 2000;
    let existingEnableMemory = false;

    if (existing?.custom_headers) {
      try {
        const parsedExisting = JSON.parse(existing.custom_headers);
        if (typeof parsedExisting._memory_content === 'string') {
          existingMemoryContent = parsedExisting._memory_content;
        }
        if (typeof parsedExisting._memory_limit === 'number') {
          existingMemoryLimit = parsedExisting._memory_limit;
        }
        if (parsedExisting._enable_memory === 'true' || parsedExisting._enable_memory === true) {
          existingEnableMemory = true;
        }
      } catch {
        // ignore
      }
    }

    const mergedHeaders: Record<string, unknown> = {
      ...(body.customHeaders || {}),
      ...(body.enableSearch !== undefined ? { _enable_search: body.enableSearch ? 'true' : 'false' } : {}),
      ...(body.searchProtocol ? { _search_protocol: body.searchProtocol } : {}),
      _enable_memory:
        body.enableMemory !== undefined
          ? body.enableMemory
            ? 'true'
            : 'false'
          : existingEnableMemory
            ? 'true'
            : 'false',
      _memory_limit: body.memoryLimit !== undefined ? body.memoryLimit : existingMemoryLimit,
      _memory_content: body.memoryContent !== undefined ? body.memoryContent : existingMemoryContent,
    };
    const headersJson = JSON.stringify(mergedHeaders);
    const temp = body.temperature ?? 0.7;
    const now = new Date().toISOString();

    if (existing) {
      await env.DB.prepare(
        `UPDATE ai_configs SET
            base_url = ?,
            api_key = ?,
            model = ?,
            custom_headers = ?,
            temperature = ?,
            is_active = 1,
            updated_at = ?
           WHERE id = ?`
      )
        .bind(
          normalizedBaseUrl,
          encryptedKey,
          normalizedModel,
          headersJson,
          temp,
          now,
          existing.id
        )
        .run();
    } else {
      const id = generateId('ai');
      await env.DB.prepare(
        `INSERT INTO ai_configs
            (id, user_id, provider_type, base_url, api_key, model, custom_headers, temperature, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
        .bind(
          id,
          userId,
          'openai-compatible',
          normalizedBaseUrl,
          encryptedKey,
          normalizedModel,
          headersJson,
          temp,
          now,
          now
        )
        .run();
    }

    return jsonResponse({
      success: true,
      message: 'AI provider configuration saved successfully',
    });
  }

  // 3. Test Connection
  if (url.pathname === '/api/ai/test' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as Partial<SaveAIConfigInput>;

    let baseUrl = body.baseUrl;
    let model = body.model;
    let apiKey = body.apiKey;
    let customHeaders = body.customHeaders;

    // If apiKey wasn't passed in, load from existing config
    if (!apiKey) {
      const existing = await env.DB.prepare(
        'SELECT * FROM ai_configs WHERE user_id = ? AND is_active = 1 LIMIT 1'
      )
        .bind(userId)
        .first<AIConfigRow>();

      if (existing) {
        baseUrl = baseUrl || existing.base_url;
        model = model || existing.model;
        if (!customHeaders && existing.custom_headers) {
          try {
            customHeaders = JSON.parse(existing.custom_headers);
          } catch {
            // ignore
          }
        }
        try {
          apiKey = await decryptSecret(existing.api_key, env.ENCRYPTION_KEY);
        } catch {
          // ignore
        }
      }
    }

    if (!baseUrl) {
      return errorResponse('Base URL is required to test connection', 400);
    }
    if (!apiKey) {
      return errorResponse('API key is required to test connection', 400);
    }

    const provider = createAIProvider({
      baseUrl,
      apiKey,
      model: model || 'gpt-4o',
      customHeaders,
      searchProtocol: body.searchProtocol,
    });

    const result = await provider.testConnection();
    return jsonResponse(result);
  }

  // 4. Content Improvement (AI Editor actions)
  if (url.pathname === '/api/ai/improve' && request.method === 'POST') {
    const body = (await request.json()) as AIImproveRequest;

    if (!body.content || !body.content.trim()) {
      return errorResponse('Post content is required for AI improvement', 400);
    }

    const configRow = await env.DB.prepare(
      'SELECT * FROM ai_configs WHERE user_id = ? AND is_active = 1 LIMIT 1'
    )
      .bind(userId)
      .first<AIConfigRow>();

    if (!configRow) {
      return errorResponse(
        'AI Provider is not configured. Please add your API key in Settings > AI Provider.',
        400
      );
    }

    const apiKey = await decryptSecret(configRow.api_key, env.ENCRYPTION_KEY);
    let customHeaders: Record<string, string> = {};
    let searchProtocol: AISearchProtocol = 'auto';
    if (configRow.custom_headers) {
      try {
        const parsed = JSON.parse(configRow.custom_headers);
        if (parsed._search_protocol) {
          searchProtocol = parsed._search_protocol;
        }
        delete parsed._enable_search;
        delete parsed._search_protocol;
        customHeaders = parsed;
      } catch {
        // ignore
      }
    }

    const provider = createAIProvider({
      providerType: configRow.provider_type,
      baseUrl: configRow.base_url,
      apiKey,
      model: configRow.model,
      customHeaders,
      temperature: configRow.temperature,
      searchProtocol,
    });

    try {
      const result = await improveContent(provider, body);
      return jsonResponse({
        result,
        action: body.action,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return errorResponse(error.message || 'AI improvement request failed', 500);
    }
  }

  // 5. Compact Memory with Model
  if (url.pathname === '/api/ai/memory/compact' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as CompactMemoryRequest;

    const configRow = await env.DB.prepare(
      'SELECT * FROM ai_configs WHERE user_id = ? AND is_active = 1 LIMIT 1'
    )
      .bind(userId)
      .first<AIConfigRow>();

    let currentHeaders: Record<string, unknown> = {};
    if (configRow?.custom_headers) {
      try {
        currentHeaders = JSON.parse(configRow.custom_headers);
      } catch {
        // ignore
      }
    }

    const currentContent =
      typeof body.content === 'string'
        ? body.content
        : typeof currentHeaders._memory_content === 'string'
          ? (currentHeaders._memory_content as string)
          : '';

    const limit =
      typeof body.limit === 'number'
        ? body.limit
        : typeof currentHeaders._memory_limit === 'number'
          ? (currentHeaders._memory_limit as number)
          : 2000;

    if (!currentContent.trim()) {
      return jsonResponse({
        success: true,
        compactedContent: '',
        originalSize: 0,
        compactedSize: 0,
        savedChars: 0,
        message: 'Memory is already empty. Nothing to compact.',
      });
    }

    const originalSize = currentContent.length;
    let compactedContent = '';

    // If API key is configured, compact with the configured AI model
    if (configRow?.api_key) {
      try {
        const apiKey = await decryptSecret(configRow.api_key, env.ENCRYPTION_KEY);
        const provider = createAIProvider({
          providerType: configRow.provider_type,
          baseUrl: configRow.base_url,
          apiKey,
          model: body.model || configRow.model,
          temperature: 0.3,
        });

        const systemPrompt = `You are a precision AI Memory Compactor and Summarizer.
Your goal is to compress, organize, and deduplicate long-term memory facts for a LinkedIn creator.
Rules:
1. Return ONLY high-density, cleanly structured markdown bullet points.
2. Deduplicate repeated facts, remove obsolete details, and condense wordy phrases into crisp points.
3. Preserve key identity: creator name, bio, goals, writing style, topic preferences, and audience traits.
4. Strictly keep total output length under ${limit} characters.
5. Do NOT include any conversational preamble or sign-off. Output ONLY the bullet points.`;

        const prompt = `Compress the following memory entries to stay strictly under ${limit} characters while preserving all essential details:\n\n---\n${currentContent}\n---`;

        const resp = await provider.generate({
          systemPrompt,
          prompt,
          temperature: 0.3,
          maxTokens: 1024,
        });

        compactedContent = resp.content.trim();
      } catch {
        // fallback to local deduplication & compaction if model call fails
      }
    }

    // Local compaction fallback if no AI provider configured or model call failed
    if (!compactedContent) {
      const lines = currentContent
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const uniqueLines = Array.from(new Set(lines));
      compactedContent = uniqueLines
        .map((l) => (l.startsWith('-') || l.startsWith('•') ? l : `• ${l}`))
        .join('\n');
      if (compactedContent.length > limit) {
        compactedContent = compactedContent.slice(0, limit);
      }
    }

    const compactedSize = compactedContent.length;
    const savedChars = Math.max(0, originalSize - compactedSize);

    // Persist the compacted memory back into DB
    if (configRow) {
      currentHeaders._memory_content = compactedContent;
      currentHeaders._memory_limit = limit;
      const now = new Date().toISOString();
      await env.DB.prepare('UPDATE ai_configs SET custom_headers = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(currentHeaders), now, configRow.id)
        .run();
    }

    return jsonResponse({
      success: true,
      compactedContent,
      originalSize,
      compactedSize,
      savedChars,
      message: `Compacted memory from ${originalSize} to ${compactedSize} chars (saved ${savedChars} chars).`,
    });
  }

  // 6. Delete / Clear Memory
  if (url.pathname === '/api/ai/memory' && request.method === 'DELETE') {
    const configRow = await env.DB.prepare(
      'SELECT * FROM ai_configs WHERE user_id = ? AND is_active = 1 LIMIT 1'
    )
      .bind(userId)
      .first<AIConfigRow>();

    if (configRow) {
      let currentHeaders: Record<string, unknown> = {};
      if (configRow.custom_headers) {
        try {
          currentHeaders = JSON.parse(configRow.custom_headers);
        } catch {
          // ignore
        }
      }
      currentHeaders._memory_content = '';
      const now = new Date().toISOString();
      await env.DB.prepare('UPDATE ai_configs SET custom_headers = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(currentHeaders), now, configRow.id)
        .run();
    }

    return jsonResponse({
      success: true,
      message: 'AI Memory cleared successfully.',
    });
  }

  return null;
}
