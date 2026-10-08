export interface UserRow {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedInAccountRow {
  id: string;
  user_id: string;
  member_id: string;
  name: string;
  headline: string | null;
  vanity_name: string | null;
  profile_picture_url: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  is_connected: number;
  created_at: string;
  updated_at: string;
}

export interface AIConfigRow {
  id: string;
  user_id: string;
  provider_type: string;
  base_url: string;
  api_key: string;
  model: string;
  custom_headers: string | null;
  temperature: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface PostRow {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  status: 'draft' | 'ready' | 'published' | 'failed' | 'archived';
  source: 'manual' | 'ai';
  conversation_id: string | null;
  linkedin_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}
