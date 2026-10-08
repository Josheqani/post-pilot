import { RequestContext, Env } from '../types';
import { DEFAULT_USER_ID, ensureDefaultUser } from '../db/client';

export async function resolveContext(request: Request, env: Env): Promise<RequestContext> {
  const url = new URL(request.url);
  const headerUserId = request.headers.get('x-user-id');
  const userId = headerUserId || DEFAULT_USER_ID;

  // Ensure database has at least the default user record provisioned
  try {
    await ensureDefaultUser(env.DB);
  } catch (err) {
    console.warn('Could not auto-ensure default user in D1:', err);
  }

  return {
    env,
    userId,
    url,
  };
}
