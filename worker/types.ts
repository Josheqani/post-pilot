export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  ENVIRONMENT?: string;
  ENCRYPTION_KEY?: string;

  // Optional LinkedIn OAuth App Credentials
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_REDIRECT_URI?: string;

  // Optional Server-level AI fallback
  DEFAULT_AI_BASE_URL?: string;
  DEFAULT_AI_API_KEY?: string;
  DEFAULT_AI_MODEL?: string;
}

export interface RequestContext {
  env: Env;
  userId: string;
  url: URL;
}
