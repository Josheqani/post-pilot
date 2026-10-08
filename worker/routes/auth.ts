import { RequestContext } from '../types';
import { jsonResponse, errorResponse } from '../middleware/error';
import { UserRow } from '../db/schema';
import { User } from '@/types';

export async function handleAuthRoutes(
  request: Request,
  ctx: RequestContext
): Promise<Response | null> {
  const { url, env, userId } = ctx;

  if (url.pathname === '/api/me' && request.method === 'GET') {
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<UserRow>();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    const payload: User = {
      id: user.id,
      name: user.name,
      email: user.email || undefined,
      avatarUrl: user.avatar_url || undefined,
      createdAt: user.created_at,
    };

    return jsonResponse(payload);
  }

  return null;
}
