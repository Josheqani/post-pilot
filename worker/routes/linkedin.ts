import { RequestContext } from '../types';
import { jsonResponse, errorResponse } from '../middleware/error';
import { LinkedInAccountRow } from '../db/schema';
import { LinkedInAccount } from '@/types';
import {
  getLinkedInAuthUrl,
  exchangeLinkedInCode,
  fetchLinkedInProfile,
} from '../services/linkedin/oauth';
import { encryptSecret } from '../services/crypto';
import { generateId } from '../db/client';

export async function handleLinkedInRoutes(
  request: Request,
  ctx: RequestContext
): Promise<Response | null> {
  const { url, env, userId } = ctx;

  // 1. Connection status
  if (url.pathname === '/api/linkedin/status' && request.method === 'GET') {
    const accountRow = await env.DB.prepare(
      'SELECT * FROM linkedin_accounts WHERE user_id = ? AND is_connected = 1 LIMIT 1'
    )
      .bind(userId)
      .first<LinkedInAccountRow>();

    if (!accountRow) {
      return jsonResponse({
        isConnected: false,
        account: null,
      });
    }

    const account: LinkedInAccount = {
      id: accountRow.id,
      userId: accountRow.user_id,
      memberId: accountRow.member_id,
      name: accountRow.name,
      headline: accountRow.headline || undefined,
      vanityName: accountRow.vanity_name || undefined,
      profilePictureUrl: accountRow.profile_picture_url || undefined,
      isConnected: Boolean(accountRow.is_connected),
      connectedAt: accountRow.updated_at,
    };

    return jsonResponse({
      isConnected: true,
      account,
    });
  }

  // 2. Auth URL for OAuth redirect
  if (url.pathname === '/api/linkedin/auth-url' && request.method === 'GET') {
    const clientId = env.LINKEDIN_CLIENT_ID;
    const clientRedirect = url.searchParams.get('redirect_uri');
    const redirectUri =
      env.LINKEDIN_REDIRECT_URI || clientRedirect || `${url.origin}/settings/linkedin/callback`;

    if (!clientId) {
      return jsonResponse({
        isConfigured: false,
        message: 'LINKEDIN_CLIENT_ID not configured in Worker environment.',
      });
    }

    const state = generateId('state');
    const authUrl = getLinkedInAuthUrl(clientId, redirectUri, state);

    return jsonResponse({
      isConfigured: true,
      url: authUrl,
      state,
    });
  }

  // 3. OAuth callback code exchange
  if (url.pathname === '/api/linkedin/callback' && request.method === 'POST') {
    const body = (await request.json()) as { code?: string; redirectUri?: string };
    if (!body.code) {
      return errorResponse('Missing authorization code', 400);
    }

    const clientId = env.LINKEDIN_CLIENT_ID;
    const clientSecret = env.LINKEDIN_CLIENT_SECRET;
    const redirectUri =
      env.LINKEDIN_REDIRECT_URI || body.redirectUri || `${url.origin}/settings/linkedin/callback`;

    if (!clientId || !clientSecret) {
      return errorResponse('LinkedIn OAuth credentials not configured on server', 500);
    }

    try {
      const tokens = await exchangeLinkedInCode(clientId, clientSecret, redirectUri, body.code);
      const profile = await fetchLinkedInProfile(tokens.access_token);

      const encryptedToken = await encryptSecret(tokens.access_token, env.ENCRYPTION_KEY);
      const encryptedRefresh = tokens.refresh_token
        ? await encryptSecret(tokens.refresh_token, env.ENCRYPTION_KEY)
        : null;

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      const now = new Date().toISOString();

      // Upsert LinkedIn account
      const existing = await env.DB.prepare(
        'SELECT id FROM linkedin_accounts WHERE user_id = ? LIMIT 1'
      )
        .bind(userId)
        .first<{ id: string }>();

      if (existing) {
        await env.DB.prepare(
          `UPDATE linkedin_accounts SET
              member_id = ?,
              name = ?,
              profile_picture_url = ?,
              access_token = ?,
              refresh_token = ?,
              token_expires_at = ?,
              scope = ?,
              is_connected = 1,
              updated_at = ?
             WHERE id = ?`
        )
          .bind(
            profile.memberId,
            profile.name,
            profile.profilePictureUrl || null,
            encryptedToken,
            encryptedRefresh,
            expiresAt,
            tokens.scope,
            now,
            existing.id
          )
          .run();
      } else {
        const id = generateId('li');
        await env.DB.prepare(
          `INSERT INTO linkedin_accounts
              (id, user_id, member_id, name, profile_picture_url, access_token, refresh_token, token_expires_at, scope, is_connected, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        )
          .bind(
            id,
            userId,
            profile.memberId,
            profile.name,
            profile.profilePictureUrl || null,
            encryptedToken,
            encryptedRefresh,
            expiresAt,
            tokens.scope,
            now,
            now
          )
          .run();
      }

      return jsonResponse({
        success: true,
        profile,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return errorResponse(error.message || 'Failed to exchange LinkedIn code', 500);
    }
  }

  // 4. Disconnect LinkedIn
  if (url.pathname === '/api/linkedin/disconnect' && request.method === 'POST') {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE linkedin_accounts
         SET is_connected = 0, access_token = '', updated_at = ?
         WHERE user_id = ?`
    )
      .bind(now, userId)
      .run();

    return jsonResponse({ success: true, isConnected: false });
  }

  // 5. Dev / Self-hosted Simulation Mode connect
  if (url.pathname === '/api/linkedin/mock-connect' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      headline?: string;
    };
    const now = new Date().toISOString();
    const id = generateId('li');
    const mockToken = await encryptSecret('simulated_access_token_demo', env.ENCRYPTION_KEY);

    const name = body.name || 'Alex Creator';
    const headline = body.headline || 'Senior Tech Lead & Content Strategist';
    const avatar =
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80';

    const existing = await env.DB.prepare(
      'SELECT id FROM linkedin_accounts WHERE user_id = ? LIMIT 1'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (existing) {
      await env.DB.prepare(
        `UPDATE linkedin_accounts SET
            member_id = ?,
            name = ?,
            headline = ?,
            profile_picture_url = ?,
            access_token = ?,
            is_connected = 1,
            updated_at = ?
           WHERE id = ?`
      )
        .bind('mock-member-12345', name, headline, avatar, mockToken, now, existing.id)
        .run();
    } else {
      await env.DB.prepare(
        `INSERT INTO linkedin_accounts
            (id, user_id, member_id, name, headline, profile_picture_url, access_token, is_connected, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
        .bind(id, userId, 'mock-member-12345', name, headline, avatar, mockToken, now, now)
        .run();
    }

    return jsonResponse({
      success: true,
      account: {
        id: existing?.id || id,
        userId,
        memberId: 'mock-member-12345',
        name,
        headline,
        profilePictureUrl: avatar,
        isConnected: true,
        connectedAt: now,
      },
    });
  }

  return null;
}
