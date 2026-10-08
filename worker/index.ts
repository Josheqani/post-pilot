import { Env } from './types';
import { handleCors, setCorsHeaders } from './middleware/cors';
import { resolveContext } from './middleware/auth';
import { errorResponse } from './middleware/error';
import { handleAuthRoutes } from './routes/auth';
import { handleLinkedInRoutes } from './routes/linkedin';
import { handleAIRoutes } from './routes/ai';
import { handleConversationRoutes } from './routes/conversations';
import { handlePostRoutes } from './routes/posts';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight requests
    const corsPreflight = handleCors(request);
    if (corsPreflight) {
      return corsPreflight;
    }

    const url = new URL(request.url);

    // Only route /api paths to our worker backend handlers
    if (url.pathname.startsWith('/api')) {
      try {
        const reqContext = await resolveContext(request, env);

        let response: Response | null = null;

        // Route through handlers
        response =
          (await handleAuthRoutes(request, reqContext)) ||
          (await handleLinkedInRoutes(request, reqContext)) ||
          (await handleAIRoutes(request, reqContext)) ||
          (await handleConversationRoutes(request, reqContext)) ||
          (await handlePostRoutes(request, reqContext));

        if (!response) {
          response = errorResponse(`Endpoint not found: ${request.method} ${url.pathname}`, 404);
        }

        return setCorsHeaders(response);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Unhandled worker API error:', error);
        return setCorsHeaders(
          errorResponse(
            error.message || 'Internal Server Error',
            500,
            env.ENVIRONMENT === 'development' ? error.stack : undefined
          )
        );
      }
    }

    // Serve static assets via Cloudflare Assets binding if available
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
