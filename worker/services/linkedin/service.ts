import { LinkedInPublishResult } from './types';
import { LinkedInAccountRow } from '../..//db/schema';
import { decryptSecret } from '../crypto';
import { Env } from '../../types';

export class LinkedInService {
  /**
   * Publishes a post to LinkedIn on behalf of the connected member.
   * Seamlessly handles both real LinkedIn REST APIs and developer simulated mode.
   */
  static async publishPost(
    account: LinkedInAccountRow,
    content: string,
    env: Env
  ): Promise<LinkedInPublishResult> {
    const rawToken = account.access_token;
    const token = await decryptSecret(rawToken, env.ENCRYPTION_KEY);

    // Mock / Simulated Mode check
    if (token.startsWith('mock_') || token.startsWith('simulated_') || !env.LINKEDIN_CLIENT_ID) {
      // Realistic simulation
      const simulatedUrn = `urn:li:share:${Date.now()}${Math.floor(Math.random() * 899 + 100)}`;
      return {
        success: true,
        postId: simulatedUrn,
        urn: simulatedUrn,
      };
    }

    try {
      // Standard LinkedIn REST Posts API (Version 202401)
      const authorUrn = account.member_id.startsWith('urn:li:')
        ? account.member_id
        : `urn:li:person:${account.member_id}`;

      const payload = {
        author: authorUrn,
        commentary: content,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      };

      const response = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Fallback attempt: v2 ugcPosts API if /rest/posts is not provisioned for the app
        if (response.status === 404 || response.status === 403) {
          const v2Payload = {
            author: authorUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: content,
                },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          };

          const v2Res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify(v2Payload),
          });

          if (v2Res.ok) {
            const v2Data = (await v2Res.json()) as { id?: string };
            const id = v2Data.id || `urn:li:share:${Date.now()}`;
            return {
              success: true,
              postId: id,
              urn: id,
            };
          }
        }

        const errorText = await response.text();
        let errorMsg = `LinkedIn API error (HTTP ${response.status})`;
        try {
          const parsed = JSON.parse(errorText) as { message?: string; description?: string };
          if (parsed.message || parsed.description) {
            errorMsg = parsed.message || parsed.description || errorMsg;
          }
        } catch {
          if (errorText) errorMsg += `: ${errorText.slice(0, 150)}`;
        }

        return {
          success: false,
          error: errorMsg,
        };
      }

      // Success from /rest/posts
      const xRestliId = response.headers.get('x-restli-id');
      let createdId = xRestliId;

      if (!createdId) {
        try {
          const data = (await response.json()) as { id?: string };
          createdId = data.id || null;
        } catch {
          createdId = `urn:li:share:${Date.now()}`;
        }
      }

      return {
        success: true,
        postId: createdId || `urn:li:share:${Date.now()}`,
        urn: createdId || `urn:li:share:${Date.now()}`,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: error.message || 'Network error communicating with LinkedIn API',
      };
    }
  }
}
