import { RequestContext } from '../types';
import { jsonResponse, errorResponse } from '../middleware/error';
import { AIConfigRow } from '../db/schema';
import { AIConfig, SaveAIConfigInput, AIImproveRequest } from '@/types';
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
    if (row.custom_headers) {
      try {
        customHeaders = JSON.parse(row.custom_headers);
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

    const headersJson = body.customHeaders ? JSON.stringify(body.customHeaders) : null;
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
          body.baseUrl.trim(),
          encryptedKey,
          body.model.trim(),
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
          body.baseUrl.trim(),
          encryptedKey,
          body.model.trim(),
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
    if (configRow.custom_headers) {
      try {
        customHeaders = JSON.parse(configRow.custom_headers);
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

  return null;
}
