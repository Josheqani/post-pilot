import { UserRow } from './schema';

export const DEFAULT_USER_ID = 'user_default';

/**
 * Ensures the default user exists in D1.
 * For single-user self-hosted instances, this acts as the active workspace user.
 */
export async function ensureDefaultUser(db: D1Database): Promise<UserRow> {
  const existing = await db
    .prepare('SELECT * FROM users WHERE id = ? LIMIT 1')
    .bind(DEFAULT_USER_ID)
    .first<UserRow>();

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO users (id, name, email, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      DEFAULT_USER_ID,
      'PostPilot Creator',
      'creator@postpilot.local',
      'https://avatars.githubusercontent.com/u/9919?s=200&v=4',
      now,
      now
    )
    .run();

  return {
    id: DEFAULT_USER_ID,
    name: 'PostPilot Creator',
    email: 'creator@postpilot.local',
    avatar_url: 'https://avatars.githubusercontent.com/u/9919?s=200&v=4',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Generates a clean random UUID string.
 */
export function generateId(prefix = ''): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}_${uuid.replace(/-/g, '').slice(0, 16)}` : uuid;
}
