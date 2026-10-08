import { RequestContext } from '../types';
import { jsonResponse, errorResponse } from '../middleware/error';
import { ConversationRow, MessageRow, AIConfigRow } from '../db/schema';
import { Conversation, Message } from '@/types';
import { generateId } from '../db/client';
import { decryptSecret } from '../services/crypto';
import { createAIProvider } from '../services/ai/factory';
import { chatWithAssistant } from '../services/ai/service';
import { AIMessage } from '../services/ai/types';

export async function handleConversationRoutes(
  request: Request,
  ctx: RequestContext
): Promise<Response | null> {
  const { url, env, userId } = ctx;
  const path = url.pathname;

  // 1. List conversations: GET /api/conversations
  if (path === '/api/conversations' && request.method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT c.*, COUNT(m.id) as message_count
         FROM conversations c
         LEFT JOIN messages m ON c.id = m.conversation_id
         WHERE c.user_id = ?
         GROUP BY c.id
         ORDER BY c.updated_at DESC`
    )
      .bind(userId)
      .all<ConversationRow & { message_count: number }>();

    const conversations: Conversation[] = (rows.results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
    }));

    return jsonResponse(conversations);
  }

  // 2. Create conversation: POST /api/conversations
  if (path === '/api/conversations' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const id = generateId('conv');
    const now = new Date().toISOString();
    const title = body.title?.trim() || 'New Discussion';

    await env.DB.prepare(
      `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
    )
      .bind(id, userId, title, now, now)
      .run();

    const conversation: Conversation = {
      id,
      userId,
      title,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };

    return jsonResponse(conversation, 201);
  }

  // Matches /api/conversations/:id and /api/conversations/:id/messages
  const convIdMatch = path.match(/^\/api\/conversations\/([^/]+)(\/.*)?$/);
  if (!convIdMatch) {
    return null;
  }

  const conversationId = convIdMatch[1]!;
  const subPath = convIdMatch[2];

  // 3. Get conversation with messages: GET /api/conversations/:id
  if (!subPath && request.method === 'GET') {
    const conv = await env.DB.prepare(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1'
    )
      .bind(conversationId, userId)
      .first<ConversationRow>();

    if (!conv) {
      return errorResponse('Conversation not found', 404);
    }

    const messageRows = await env.DB.prepare(
      `SELECT * FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`
    )
      .bind(conversationId)
      .all<MessageRow>();

    const messages: Message[] = (messageRows.results || []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));

    return jsonResponse({
      conversation: {
        id: conv.id,
        userId: conv.user_id,
        title: conv.title,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        messageCount: messages.length,
      },
      messages,
    });
  }

  // 4. Delete conversation: DELETE /api/conversations/:id
  if (!subPath && request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?')
      .bind(conversationId, userId)
      .run();

    return jsonResponse({ success: true });
  }

  // 5. Send message: POST /api/conversations/:id/messages
  if (subPath === '/messages' && request.method === 'POST') {
    const body = (await request.json()) as { content?: string };
    if (!body.content || !body.content.trim()) {
      return errorResponse('Message content is required', 400);
    }

    // Verify conversation exists
    const conv = await env.DB.prepare(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1'
    )
      .bind(conversationId, userId)
      .first<ConversationRow>();

    if (!conv) {
      return errorResponse('Conversation not found', 404);
    }

    const now = new Date().toISOString();
    const userMsgId = generateId('msg');
    const userContent = body.content.trim();

    // Insert user message
    await env.DB.prepare(
      `INSERT INTO messages (id, conversation_id, role, content, created_at)
         VALUES (?, ?, 'user', ?, ?)`
    )
      .bind(userMsgId, conversationId, userContent, now)
      .run();

    // Auto-update conversation title if it's the first message and title is default
    if (conv.title === 'New Discussion' || conv.title === 'New Chat') {
      const suggestedTitle =
        userContent.slice(0, 35).trim() + (userContent.length > 35 ? '...' : '');
      await env.DB.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?')
        .bind(suggestedTitle, now, conversationId)
        .run();
    } else {
      await env.DB.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
        .bind(now, conversationId)
        .run();
    }

    // Load AI Provider
    const configRow = await env.DB.prepare(
      'SELECT * FROM ai_configs WHERE user_id = ? AND is_active = 1 LIMIT 1'
    )
      .bind(userId)
      .first<AIConfigRow>();

    if (!configRow) {
      // Create fallback assistant notice
      const assistantMsgId = generateId('msg');
      const assistantNotice =
        '⚠️ PostPilot AI is not configured yet.\n\nPlease go to **Settings > AI Provider** and enter your API key (such as OpenAI, Groq, Ollama, or OpenRouter) to enable intelligent content generation.';

      await env.DB.prepare(
        `INSERT INTO messages (id, conversation_id, role, content, created_at)
           VALUES (?, ?, 'assistant', ?, ?)`
      )
        .bind(assistantMsgId, conversationId, assistantNotice, new Date().toISOString())
        .run();

      return jsonResponse({
        userMessage: {
          id: userMsgId,
          conversationId,
          role: 'user',
          content: userContent,
          createdAt: now,
        },
        assistantMessage: {
          id: assistantMsgId,
          conversationId,
          role: 'assistant',
          content: assistantNotice,
          createdAt: new Date().toISOString(),
        },
      });
    }

    try {
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

      // Load previous messages for conversational history
      const historyRows = await env.DB.prepare(
        `SELECT role, content FROM messages
           WHERE conversation_id = ?
           ORDER BY created_at ASC
           LIMIT 15`
      )
        .bind(conversationId)
        .all<MessageRow>();

      const history: AIMessage[] = (historyRows.results || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await chatWithAssistant(provider, history);

      const assistantMsgId = generateId('msg');
      const assistantTime = new Date().toISOString();

      await env.DB.prepare(
        `INSERT INTO messages (id, conversation_id, role, content, created_at)
           VALUES (?, ?, 'assistant', ?, ?)`
      )
        .bind(assistantMsgId, conversationId, reply, assistantTime)
        .run();

      return jsonResponse({
        userMessage: {
          id: userMsgId,
          conversationId,
          role: 'user',
          content: userContent,
          createdAt: now,
        },
        assistantMessage: {
          id: assistantMsgId,
          conversationId,
          role: 'assistant',
          content: reply,
          createdAt: assistantTime,
        },
      });
    } catch (err: unknown) {
      const error = err as Error;
      const assistantMsgId = generateId('msg');
      const assistantTime = new Date().toISOString();
      const assistantNotice = `⚠️ **AI Provider Communication Error**\n\n${error.message}\n\nPlease check your configuration in **Settings > AI Provider** or verify your API key and base URL.`;

      await env.DB.prepare(
        `INSERT INTO messages (id, conversation_id, role, content, created_at)
           VALUES (?, ?, 'assistant', ?, ?)`
      )
        .bind(assistantMsgId, conversationId, assistantNotice, assistantTime)
        .run();

      return jsonResponse({
        userMessage: {
          id: userMsgId,
          conversationId,
          role: 'user',
          content: userContent,
          createdAt: now,
        },
        assistantMessage: {
          id: assistantMsgId,
          conversationId,
          role: 'assistant',
          content: assistantNotice,
          createdAt: assistantTime,
        },
      });
    }
  }

  return null;
}
