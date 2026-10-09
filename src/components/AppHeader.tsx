import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconButton, Label } from '@primer/react';
import { Box } from '@/components/PrimerCompat';
import {
  CommentDiscussionIcon,
  RepoIcon,
  PlusIcon,
  GearIcon,
  SunIcon,
  MoonIcon,
  ShareIcon,
} from '@primer/octicons-react';
import { ColorMode } from '@/hooks/useTheme';
import { LinkedInAccount } from '@/types';

interface AppHeaderProps {
  colorMode: ColorMode;
  onToggleTheme: () => void;
  linkedInAccount?: LinkedInAccount | null;
  isLinkedInConnected?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  colorMode,
  onToggleTheme,
  linkedInAccount,
  isLinkedInConnected,
}) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isCurrent = (path: string) => {
    if (path === '/posts') {
      return currentPath === '/posts';
    }
    return currentPath.startsWith(path);
  };

  return (
    <Box
      as="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 3,
        py: 2,
        bg: 'canvas.default',
        borderBottom: '1px solid',
        borderColor: 'border.default',
        color: 'fg.default',
        gap: 1,
      }}
    >
      {/* Brand */}
      <Link to="/posts" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 2,
            fontWeight: 'bold',
            color: 'fg.default',
            mr: 3,
            px: 2,
            py: 1,
            borderRadius: 2,
            '&:hover': {
              color: 'fg.default',
            },
          }}
        >
          <ShareIcon size={20} />
          <span>PostPilot</span>
        </Box>
      </Link>

      {/* Nav items */}
      <Box
        as="nav"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Link to="/chat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              px: 2,
              py: 1,
              borderRadius: 2,
              fontSize: 1,
              fontWeight: isCurrent('/chat') ? 'bold' : 'normal',
              color: isCurrent('/chat') ? 'fg.default' : 'fg.muted',
              bg: isCurrent('/chat') ? 'canvas.subtle' : 'transparent',
              '&:hover': {
                color: 'fg.default',
                bg: 'canvas.subtle',
              },
            }}
          >
            <CommentDiscussionIcon size={16} />
            <span>Chat</span>
          </Box>
        </Link>

        <Link to="/posts" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              px: 2,
              py: 1,
              borderRadius: 2,
              fontSize: 1,
              fontWeight: isCurrent('/posts') && currentPath !== '/posts/new' ? 'bold' : 'normal',
              color:
                isCurrent('/posts') && currentPath !== '/posts/new' ? 'fg.default' : 'fg.muted',
              bg:
                isCurrent('/posts') && currentPath !== '/posts/new'
                  ? 'canvas.subtle'
                  : 'transparent',
              '&:hover': {
                color: 'fg.default',
                bg: 'canvas.subtle',
              },
            }}
          >
            <RepoIcon size={16} />
            <span>Posts</span>
          </Box>
        </Link>

        <Link to="/posts/new" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              px: 2,
              py: 1,
              borderRadius: 2,
              fontSize: 1,
              fontWeight: isCurrent('/posts/new') ? 'bold' : 'normal',
              color: isCurrent('/posts/new') ? 'fg.default' : 'fg.muted',
              bg: isCurrent('/posts/new') ? 'canvas.subtle' : 'transparent',
              '&:hover': {
                color: 'fg.default',
                bg: 'canvas.subtle',
              },
            }}
          >
            <PlusIcon size={16} />
            <span>New Post</span>
          </Box>
        </Link>

        <Link to="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              px: 2,
              py: 1,
              borderRadius: 2,
              fontSize: 1,
              fontWeight: isCurrent('/settings') ? 'bold' : 'normal',
              color: isCurrent('/settings') ? 'fg.default' : 'fg.muted',
              bg: isCurrent('/settings') ? 'canvas.subtle' : 'transparent',
              '&:hover': {
                color: 'fg.default',
                bg: 'canvas.subtle',
              },
            }}
          >
            <GearIcon size={16} />
            <span>Settings</span>
          </Box>
        </Link>
      </Box>

      {/* Right controls */}
      <Box
        sx={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {isLinkedInConnected ? (
          <Link to="/settings?tab=linkedin" style={{ textDecoration: 'none' }}>
            <Label
              variant="success"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                }}
              />
              {linkedInAccount?.name ? `LinkedIn: ${linkedInAccount.name}` : 'LinkedIn Connected'}
            </Label>
          </Link>
        ) : (
          <Link to="/settings?tab=linkedin" style={{ textDecoration: 'none' }}>
            <Label variant="secondary" style={{ cursor: 'pointer' }}>
              LinkedIn Disconnected
            </Label>
          </Link>
        )}

        <IconButton
          icon={colorMode === 'night' ? SunIcon : MoonIcon}
          aria-label="Toggle dark/light theme"
          variant="invisible"
          onClick={onToggleTheme}
        />
      </Box>
    </Box>
  );
};
