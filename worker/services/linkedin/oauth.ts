import { LinkedInProfile, LinkedInTokenResponse } from './types';

const LINKEDIN_AUTH_BASE = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

export function getLinkedInAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email w_member_social',
  });

  return `${LINKEDIN_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeLinkedInCode(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = `OAuth token exchange failed (HTTP ${res.status})`;
    try {
      const parsed = JSON.parse(errorText) as { error_description?: string; error?: string };
      if (parsed.error_description) {
        message = parsed.error_description;
      }
    } catch {
      if (errorText) message += `: ${errorText.slice(0, 150)}`;
    }
    throw new Error(message);
  }

  return (await res.json()) as LinkedInTokenResponse;
}

export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Failed to fetch LinkedIn profile (HTTP ${res.status}): ${errorText.slice(0, 150)}`
    );
  }

  const data = (await res.json()) as {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email?: string;
  };

  return {
    memberId: data.sub,
    name:
      data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim() || 'LinkedIn User',
    profilePictureUrl: data.picture,
  };
}
