export interface LinkedInProfile {
  memberId: string;
  name: string;
  headline?: string;
  vanityName?: string;
  profilePictureUrl?: string;
}

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface LinkedInPublishResult {
  success: boolean;
  postId?: string;
  urn?: string;
  error?: string;
}
