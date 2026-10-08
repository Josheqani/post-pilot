import React from 'react';
import { SegmentedControl, Label } from '@primer/react';
import { Box, Heading, Text } from '@/components/PrimerCompat';
import { ServerIcon, MarkGithubIcon } from '@primer/octicons-react';
import { ColorMode } from '@/hooks/useTheme';

interface AppSettingsProps {
  colorMode: ColorMode;
  onSetColorMode: (mode: ColorMode) => void;
}

export const AppSettings: React.FC<AppSettingsProps> = ({ colorMode, onSetColorMode }) => {
  return (
    <Box sx={{ maxWidth: '680px' }}>
      <Box sx={{ mb: 3 }}>
        <Heading as="h3" sx={{ fontSize: 3 }}>
          Application Settings
        </Heading>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          Customize your PostPilot workspace preferences and review runtime environment details.
        </Text>
      </Box>

      {/* Theme Selection */}
      <Box
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          bg: 'canvas.default',
          mb: 3,
        }}
      >
        <Heading as="h4" sx={{ fontSize: 2, mb: 1 }}>
          Interface Theme
        </Heading>
        <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 3, display: 'block' }}>
          Select your preferred GitHub Primer visual mode.
        </Text>

        <SegmentedControl aria-label="Color Theme">
          <SegmentedControl.Button
            selected={colorMode === 'day'}
            onClick={() => onSetColorMode('day')}
          >
            Light
          </SegmentedControl.Button>
          <SegmentedControl.Button
            selected={colorMode === 'night'}
            onClick={() => onSetColorMode('night')}
          >
            Dark
          </SegmentedControl.Button>
          <SegmentedControl.Button
            selected={colorMode === 'auto'}
            onClick={() => onSetColorMode('auto')}
          >
            System Default
          </SegmentedControl.Button>
        </SegmentedControl>
      </Box>

      {/* Runtime & Persistence Info */}
      <Box
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          bg: 'canvas.default',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <ServerIcon size={18} />
          <Heading as="h4" sx={{ fontSize: 2 }}>
            System Architecture
          </Heading>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'border.muted',
            }}
          >
            <Text sx={{ color: 'fg.muted' }}>Backend Platform:</Text>
            <Text sx={{ fontWeight: 600 }}>Cloudflare Workers (Edge)</Text>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'border.muted',
            }}
          >
            <Text sx={{ color: 'fg.muted' }}>Database Persistence:</Text>
            <Text sx={{ fontWeight: 600 }}>Cloudflare D1 (Serverless SQLite)</Text>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'border.muted',
            }}
          >
            <Text sx={{ color: 'fg.muted' }}>Design System:</Text>
            <Text sx={{ fontWeight: 600 }}>GitHub Primer React</Text>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Text sx={{ color: 'fg.muted' }}>License:</Text>
            <Label variant="secondary">MIT Open Source</Label>
          </Box>
        </Box>

        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'border.muted',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'fg.muted',
            fontSize: 0,
          }}
        >
          <MarkGithubIcon size={16} />
          <span>PostPilot — Self-hosted LinkedIn content workspace</span>
        </Box>
      </Box>
    </Box>
  );
};
