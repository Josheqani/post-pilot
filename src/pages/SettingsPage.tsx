import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UnderlineNav, Spinner } from '@primer/react';
import { Box, Heading, Text, Flash } from '@/components/PrimerCompat';
import {
  GearIcon,
  CpuIcon,
  LinkIcon,
  ServerIcon,
  CheckIcon,
  AlertIcon,
} from '@primer/octicons-react';
import { AIProviderSettings } from '@/features/settings/AIProviderSettings';
import { LinkedInSettings } from '@/features/settings/LinkedInSettings';
import { AppSettings } from '@/features/settings/AppSettings';
import { ColorMode } from '@/hooks/useTheme';
import { api } from '@/services/api';

interface SettingsPageProps {
  colorMode: ColorMode;
  onSetColorMode: (mode: ColorMode) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ colorMode, onSetColorMode }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTab = searchParams.get('tab') || 'ai';
  const callbackCode = searchParams.get('code');
  const callbackError = searchParams.get('error');
  const callbackErrorDescription = searchParams.get('error_description');

  const [callbackStatus, setCallbackStatus] = useState<{
    isLoading: boolean;
    error: string | null;
    success: boolean;
  }>(
    callbackError
      ? {
          isLoading: false,
          error:
            (callbackErrorDescription
              ? decodeURIComponent(callbackErrorDescription.replace(/\+/g, ' '))
              : null) ||
            `LinkedIn OAuth failed: ${callbackError}`,
          success: false,
        }
      : {
          isLoading: Boolean(callbackCode),
          error: null,
          success: false,
        }
  );

  // Handle LinkedIn OAuth callback if redirected here with `?code=...`
  useEffect(() => {
    if (callbackCode) {
      const redirectUri = `${window.location.origin}/settings/linkedin/callback`;
      api.linkedin
        .submitCallback(callbackCode, redirectUri)
        .then(() => {
          setCallbackStatus({ isLoading: false, error: null, success: true });
          setTimeout(() => {
            navigate('/settings?tab=linkedin', { replace: true });
          }, 1200);
        })
        .catch((err: Error) => {
          setCallbackStatus({
            isLoading: false,
            error: err.message || 'Failed to exchange LinkedIn code',
            success: false,
          });
        });
    }
  }, [callbackCode, navigate]);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <Box sx={{ maxWidth: '960px', mx: 'auto', p: [3, 4] }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <GearIcon size={24} />
          <Heading as="h1" sx={{ fontSize: 4 }}>
            Settings
          </Heading>
        </Box>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          Configure AI provider endpoints, LinkedIn publishing credentials, and workspace
          preferences.
        </Text>
      </Box>

      {/* OAuth Callback processing alert */}
      {callbackStatus.isLoading && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Spinner />
          <Text sx={{ display: 'block', mt: 2 }}>Connecting your LinkedIn account...</Text>
        </Box>
      )}

      {callbackStatus.success && (
        <Flash variant="success" sx={{ mb: 3 }}>
          <span
            style={{
              marginRight: 8,
              display: 'inline-flex',
              verticalAlign: 'text-bottom',
            }}
          >
            <CheckIcon size={16} />
          </span>
          LinkedIn account successfully connected! Redirecting...
        </Flash>
      )}

      {callbackStatus.error && (
        <Flash variant="danger" sx={{ mb: 3 }}>
          <span
            style={{
              marginRight: 8,
              display: 'inline-flex',
              verticalAlign: 'text-bottom',
            }}
          >
            <AlertIcon size={16} />
          </span>
          Failed to complete LinkedIn connection: {callbackStatus.error}
        </Flash>
      )}

      {/* Settings Navigation Tabs */}
      <Box sx={{ mb: 4 }}>
        <UnderlineNav aria-label="Settings sections">
          <UnderlineNav.Item
            aria-current={currentTab === 'ai' ? 'page' : undefined}
            onSelect={() => setTab('ai')}
            icon={CpuIcon}
          >
            AI Provider
          </UnderlineNav.Item>

          <UnderlineNav.Item
            aria-current={currentTab === 'linkedin' ? 'page' : undefined}
            onSelect={() => setTab('linkedin')}
            icon={LinkIcon}
          >
            LinkedIn
          </UnderlineNav.Item>

          <UnderlineNav.Item
            aria-current={currentTab === 'app' ? 'page' : undefined}
            onSelect={() => setTab('app')}
            icon={ServerIcon}
          >
            Application
          </UnderlineNav.Item>
        </UnderlineNav>
      </Box>

      {/* Tab Panels */}
      {currentTab === 'ai' && <AIProviderSettings />}
      {currentTab === 'linkedin' && <LinkedInSettings />}
      {currentTab === 'app' && (
        <AppSettings colorMode={colorMode} onSetColorMode={onSetColorMode} />
      )}
    </Box>
  );
};
