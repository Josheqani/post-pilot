import { RequestContext } from '../types';
import { jsonResponse, errorResponse } from '../middleware/error';
import { PostRow, LinkedInAccountRow } from '../db/schema';
import { Post, CreatePostInput, UpdatePostInput } from '@/types';
import { generateId } from '../db/client';
import { LinkedInService } from '../services/linkedin/service';

function mapPost(row: PostRow): Post {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || undefined,
    content: row.content,
    status: row.status,
    source: row.source,
    conversationId: row.conversation_id || undefined,
    linkedinPostId: row.linkedin_post_id || undefined,
    errorMessage: row.error_message || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || undefined,
  };
}

export async function handlePostRoutes(
  request: Request,
  ctx: RequestContext
): Promise<Response | null> {
  const { url, env, userId } = ctx;
  const path = url.pathname;

  // 1. List posts: GET /api/posts
  if (path === '/api/posts' && request.method === 'GET') {
    const statusParam = url.searchParams.get('status');
    const searchParam = url.searchParams.get('search');

    let query = 'SELECT * FROM posts WHERE user_id = ?';
    const bindings: unknown[] = [userId];

    if (statusParam && statusParam !== 'all') {
      query += ' AND status = ?';
      bindings.push(statusParam);
    }

    if (searchParam && searchParam.trim()) {
      query += ' AND (content LIKE ? OR title LIKE ?)';
      const term = `%${searchParam.trim()}%`;
      bindings.push(term, term);
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = env.DB.prepare(query);
    const rows = await stmt.bind(...bindings).all<PostRow>();

    const posts = (rows.results || []).map(mapPost);
    return jsonResponse(posts);
  }

  // 2. Create post: POST /api/posts
  if (path === '/api/posts' && request.method === 'POST') {
    const body = (await request.json()) as CreatePostInput;

    if (!body.content || !body.content.trim()) {
      return errorResponse('Content is required to create a post', 400);
    }

    const id = generateId('post');
    const now = new Date().toISOString();
    const status = body.status || 'draft';
    const source = body.source || 'manual';

    await env.DB.prepare(
      `INSERT INTO posts
          (id, user_id, title, content, status, source, conversation_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        userId,
        body.title?.trim() || null,
        body.content.trim(),
        status,
        source,
        body.conversationId || null,
        now,
        now
      )
      .run();

    const createdRow = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(id)
      .first<PostRow>();

    if (!createdRow) {
      return errorResponse('Failed to create post', 500);
    }

    return jsonResponse(mapPost(createdRow), 201);
  }

  // Matches /api/posts/:id and /api/posts/:id/publish
  const postIdMatch = path.match(/^\/api\/posts\/([^/]+)(\/.*)?$/);
  if (!postIdMatch) {
    return null;
  }

  const postId = postIdMatch[1]!;
  const subPath = postIdMatch[2];

  // 3. Get post by id: GET /api/posts/:id
  if (!subPath && request.method === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ? LIMIT 1')
      .bind(postId, userId)
      .first<PostRow>();

    if (!row) {
      return errorResponse('Post not found', 404);
    }

    return jsonResponse(mapPost(row));
  }

  // 4. Update post: PUT /api/posts/:id
  if (!subPath && request.method === 'PUT') {
    const body = (await request.json()) as UpdatePostInput;

    const existing = await env.DB.prepare(
      'SELECT * FROM posts WHERE id = ? AND user_id = ? LIMIT 1'
    )
      .bind(postId, userId)
      .first<PostRow>();

    if (!existing) {
      return errorResponse('Post not found', 404);
    }

    const now = new Date().toISOString();
    const updatedTitle = body.title !== undefined ? body.title?.trim() || null : existing.title;
    const updatedContent = body.content !== undefined ? body.content.trim() : existing.content;
    const updatedStatus = body.status || existing.status;

    await env.DB.prepare(
      `UPDATE posts SET
          title = ?,
          content = ?,
          status = ?,
          updated_at = ?
         WHERE id = ? AND user_id = ?`
    )
      .bind(updatedTitle, updatedContent, updatedStatus, now, postId, userId)
      .run();

    const updatedRow = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(postId)
      .first<PostRow>();

    return jsonResponse(mapPost(updatedRow!));
  }

  // 5. Delete post: DELETE /api/posts/:id
  if (!subPath && request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?')
      .bind(postId, userId)
      .run();

    return jsonResponse({ success: true, id: postId });
  }

  // 6. Publish post to LinkedIn: POST /api/posts/:id/publish
  if (subPath === '/publish' && request.method === 'POST') {
    const postRow = await env.DB.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ? LIMIT 1')
      .bind(postId, userId)
      .first<PostRow>();

    if (!postRow) {
      return errorResponse('Post not found', 404);
    }

    if (!postRow.content.trim()) {
      return errorResponse('Cannot publish an empty post', 400);
    }

    // Retrieve active LinkedIn account
    const accountRow = await env.DB.prepare(
      'SELECT * FROM linkedin_accounts WHERE user_id = ? AND is_connected = 1 LIMIT 1'
    )
      .bind(userId)
      .first<LinkedInAccountRow>();

    if (!accountRow) {
      return errorResponse(
        'No connected LinkedIn account. Please connect your LinkedIn account in Settings first.',
        400
      );
    }

    // Call LinkedIn publishing service
    const publishResult = await LinkedInService.publishPost(accountRow, postRow.content, env);

    const now = new Date().toISOString();

    if (publishResult.success && publishResult.postId) {
      await env.DB.prepare(
        `UPDATE posts SET
            status = 'published',
            linkedin_post_id = ?,
            error_message = NULL,
            published_at = ?,
            updated_at = ?
           WHERE id = ?`
      )
        .bind(publishResult.postId, now, now, postId)
        .run();

      const updatedRow = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
        .bind(postId)
        .first<PostRow>();

      return jsonResponse({
        success: true,
        post: mapPost(updatedRow!),
        linkedinPostId: publishResult.postId,
      });
    } else {
      // Record failed state cleanly
      const failureReason = publishResult.error || 'LinkedIn API rejected the post';
      await env.DB.prepare(
        `UPDATE posts SET
            status = 'failed',
            error_message = ?,
            updated_at = ?
           WHERE id = ?`
      )
        .bind(failureReason, now, postId)
        .run();

      const updatedRow = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
        .bind(postId)
        .first<PostRow>();

      return jsonResponse(
        {
          success: false,
          error: failureReason,
          post: mapPost(updatedRow!),
        },
        422
      );
    }
  }

  return null;
}
