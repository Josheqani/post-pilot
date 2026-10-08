import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header, IconButton, Label } from '@primer/react';
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
    <Header
      style={{ padding: '8px 16px', borderBottom: '1px solid var(--borderColor-default, #d0d7de)' }}
    >
      {/* Brand */}
      <Header.Item>
        <Header.Link
          as={Link}
          to="/posts"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'var(--fgColor-default, #1f2328)',
            textDecoration: 'none',
          }}
        >
          <ShareIcon size={20} />
          <span>PostPilot</span>
        </Header.Link>
      </Header.Item>

      {/* Nav items */}
      <Header.Item style={{ marginLeft: '24px' }}>
        <Header.Link
          as={Link}
          to="/chat"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: isCurrent('/chat') ? 'bold' : 'normal',
            color: isCurrent('/chat')
              ? 'var(--fgColor-default, #1f2328)'
              : 'var(--fgColor-muted, #656d76)',
            textDecoration: 'none',
          }}
        >
          <CommentDiscussionIcon size={16} />
          <span>Chat</span>
        </Header.Link>
      </Header.Item>

      <Header.Item>
        <Header.Link
          as={Link}
          to="/posts"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: isCurrent('/posts') && currentPath !== '/posts/new' ? 'bold' : 'normal',
            color:
              isCurrent('/posts') && currentPath !== '/posts/new'
                ? 'var(--fgColor-default, #1f2328)'
                : 'var(--fgColor-muted, #656d76)',
            textDecoration: 'none',
          }}
        >
          <RepoIcon size={16} />
          <span>Posts</span>
        </Header.Link>
      </Header.Item>

      <Header.Item>
        <Header.Link
          as={Link}
          to="/posts/new"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: isCurrent('/posts/new') ? 'bold' : 'normal',
            color: isCurrent('/posts/new')
              ? 'var(--fgColor-default, #1f2328)'
              : 'var(--fgColor-muted, #656d76)',
            textDecoration: 'none',
          }}
        >
          <PlusIcon size={16} />
          <span>New Post</span>
        </Header.Link>
      </Header.Item>

      <Header.Item>
        <Header.Link
          as={Link}
          to="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: isCurrent('/settings') ? 'bold' : 'normal',
            color: isCurrent('/settings')
              ? 'var(--fgColor-default, #1f2328)'
              : 'var(--fgColor-muted, #656d76)',
            textDecoration: 'none',
          }}
        >
          <GearIcon size={16} />
          <span>Settings</span>
        </Header.Link>
      </Header.Item>

      {/* Right controls */}
      <Header.Item
        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
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
      </Header.Item>
    </Header>
  );
};
