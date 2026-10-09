import React, { useState } from 'react';
import { Button, Avatar, Label, Spinner } from '@primer/react';
import { Box, Heading, Text, Flash } from '@/components/PrimerCompat';
import { LinkIcon, XCircleIcon, AlertIcon, KeyIcon } from '@primer/octicons-react';
import { useLinkedIn } from '@/hooks/useLinkedIn';
import { api } from '@/services/api';

export const LinkedInSettings: React.FC = () => {
  const { account, isConnected, isLoading, error, disconnect, mockConnect } = useLinkedIn();

  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dynamic OAuth redirect URI based on the current origin, matching the
  // server-side fallback in worker/routes/linkedin.ts
  const redirectUri = `${window.location.origin}/settings/linkedin/callback`;

  const handleOAuthConnect = async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      const res = await api.linkedin.getAuthUrl(redirectUri);
      if (res.isConfigured && res.url) {
        window.location.href = res.url;
      } else {
        setAuthError(
          res.message ||
            'LinkedIn Client ID is not configured on the server. You can use Simulation Mode below to test publishing!'
        );
      }
    } catch (err: unknown) {
      const e = err as Error;
      setAuthError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleMockConnect = async () => {
    setIsConnecting(true);
    try {
      await mockConnect({
        name: 'Alex Creator',
        headline: 'Staff Engineer & Technical Writer • PostPilot Demo',
      });
    } catch (err: unknown) {
      const e = err as Error;
      setAuthError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Spinner />
        <Text sx={{ display: 'block', mt: 2 }}>Checking LinkedIn status...</Text>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '680px' }}>
      <Box sx={{ mb: 3 }}>
        <Heading as="h3" sx={{ fontSize: 3 }}>
          LinkedIn Account Connection
        </Heading>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          Connect your LinkedIn profile to publish posts directly from PostPilot. OAuth tokens are
          stored securely on your Cloudflare Worker and never exposed client-side.
        </Text>
      </Box>

      {error && (
        <Flash variant="danger" sx={{ mb: 3 }}>
          <AlertIcon size={16} />
          {error}
        </Flash>
      )}

      {authError && (
        <Flash variant="warning" sx={{ mb: 3 }}>
          <AlertIcon size={16} />
          {authError}
        </Flash>
      )}

      {isConnected && account ? (
        <Box
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            bg: 'canvas.default',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                src={
                  account.profilePictureUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
                }
                size={56}
                alt={account.name}
              />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Text sx={{ fontWeight: 'bold', fontSize: 2 }}>{account.name}</Text>
                  <Label variant="success">Connected</Label>
                </Box>
                {account.headline && (
                  <Text sx={{ fontSize: 1, color: 'fg.muted', display: 'block' }}>
                    {account.headline}
                  </Text>
                )}
                <Text sx={{ fontSize: 0, color: 'fg.subtle', fontFamily: 'monospace', mt: 1 }}>
                  Member ID: {account.memberId}
                </Text>
              </Box>
            </Box>

            <Button
              variant="danger"
              leadingVisual={XCircleIcon}
              onClick={() => {
                if (confirm('Disconnect this LinkedIn account?')) {
                  disconnect();
                }
              }}
            >
              Disconnect
            </Button>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            p: 4,
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            bg: 'canvas.subtle',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bg: 'neutral.subtle',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LinkIcon size={24} />
          </Box>

          <Box>
            <Text sx={{ fontWeight: 'bold', fontSize: 2, display: 'block' }}>
              No LinkedIn Account Connected
            </Text>
            <Text sx={{ fontSize: 1, color: 'fg.muted', mt: 1 }}>
              Authorize PostPilot to publish posts to your personal LinkedIn feed.
            </Text>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="primary"
              leadingVisual={LinkIcon}
              onClick={handleOAuthConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Redirecting...' : 'Connect with LinkedIn'}
            </Button>

            <Button leadingVisual={KeyIcon} onClick={handleMockConnect} disabled={isConnecting}>
              Use Simulation / Demo Account
            </Button>
          </Box>
        </Box>
      )}

      {/* Setup Instructions Card */}
      <Box
        sx={{
          mt: 4,
          p: 3,
          border: '1px solid',
          borderColor: 'border.muted',
          borderRadius: 2,
          bg: 'canvas.default',
        }}
      >
        <Heading as="h4" sx={{ fontSize: 1, mb: 2 }}>
          Self-Hosting LinkedIn OAuth Setup Guide:
        </Heading>
        <Box as="ol" sx={{ pl: 3, m: 0, fontSize: 1, color: 'fg.muted', lineHeight: 1.6 }}>
          <li>
            Create an application in the{' '}
            <a
              href="https://www.linkedin.com/developers/apps"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0969da' }}
            >
              LinkedIn Developer Portal
            </a>
            .
          </li>
          <li>
            Under <strong>Products</strong>, request access to:
            <Box as="ul" sx={{ pl: 3, my: 1 }}>
              <li>
                <code>Sign In with LinkedIn using OpenID Connect</code>
              </li>
              <li>
                <code>Share on LinkedIn</code>
              </li>
            </Box>
          </li>
          <li>
            Under <strong>Auth</strong>, add your Authorized Redirect URL:
            <Box
              as="code"
              sx={{
                display: 'block',
                my: 1,
                p: 1,
                bg: 'canvas.subtle',
                borderRadius: 1,
                fontSize: 0,
              }}
            >
              {redirectUri}
            </Box>
          </li>
          <li>
            Set <code>LINKEDIN_CLIENT_ID</code> and <code>LINKEDIN_CLIENT_SECRET</code> in your{' '}
            <code>.env</code> or Cloudflare Worker secrets.
          </li>
        </Box>
      </Box>
    </Box>
  );
};
