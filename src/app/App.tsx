import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, BaseStyles } from '@primer/react';
import { Box } from '@/components/PrimerCompat';
import { useTheme } from '@/hooks/useTheme';
import { useLinkedIn } from '@/hooks/useLinkedIn';
import { AppHeader } from '@/components/AppHeader';
import { ChatPage } from '@/pages/ChatPage';
import { PostsPage } from '@/pages/PostsPage';
import { PostEditorPage } from '@/pages/PostEditorPage';
import { SettingsPage } from '@/pages/SettingsPage';

export const App: React.FC = () => {
  const { colorMode, setColorMode, toggleTheme } = useTheme();
  const { account, isConnected } = useLinkedIn();

  return (
    <ThemeProvider colorMode={colorMode} dayScheme="light" nightScheme="dark">
      <BaseStyles>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bg: 'canvas.default',
            color: 'fg.default',
          }}
        >
          <AppHeader
            colorMode={colorMode}
            onToggleTheme={toggleTheme}
            linkedInAccount={account}
            isLinkedInConnected={isConnected}
          />

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/posts" replace />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/posts" element={<PostsPage />} />
              <Route path="/posts/new" element={<PostEditorPage />} />
              <Route path="/posts/:id" element={<PostEditorPage />} />
              <Route
                path="/settings"
                element={<SettingsPage colorMode={colorMode} onSetColorMode={setColorMode} />}
              />
              <Route
                path="/settings/linkedin/callback"
                element={<SettingsPage colorMode={colorMode} onSetColorMode={setColorMode} />}
              />
              <Route path="*" element={<Navigate to="/posts" replace />} />
            </Routes>
          </Box>
        </Box>
      </BaseStyles>
    </ThemeProvider>
  );
};
