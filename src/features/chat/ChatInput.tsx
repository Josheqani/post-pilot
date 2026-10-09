import React, { useState, useMemo, KeyboardEvent } from 'react';
import { Button, Textarea, Label } from '@primer/react';
import { Box, Text } from '@/components/PrimerCompat';
import {
  PaperAirplaneIcon,
  MarkGithubIcon,
  RepoIcon,
  LinkExternalIcon,
} from '@primer/octicons-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
}

interface DetectedGitHub {
  rawUrl: string;
  fullName: string;
  owner: string;
  repo?: string;
}

function extractGitHubUrls(text: string): DetectedGitHub[] {
  const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)(?:\/([a-zA-Z0-9_.-]+))?(?:\/[^\s]*)?/gi;
  const list: DetectedGitHub[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const rawUrl = match[0];
    const owner = match[1];
    if (!owner) continue;
    const repo = match[2] ? match[2].replace(/\.git$/i, '') : undefined;
    const fullName = repo ? `${owner}/${repo}` : owner;

    if (!seen.has(fullName)) {
      seen.add(fullName);
      list.push({ rawUrl, fullName, owner, repo });
    }
  }

  return list;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [content, setContent] = useState('');

  const detectedGitHub = useMemo(() => extractGitHubUrls(content), [content]);
  const primaryGitHub = detectedGitHub[0];
  const hasGitHub = Boolean(primaryGitHub);

  const handleSend = () => {
    if (!content.trim() || isLoading) return;
    onSend(content.trim());
    setContent('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        borderTop: '1px solid',
        borderColor: 'border.default',
        bg: 'canvas.default',
      }}
    >
      {/* Input Container */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* GitHub Highlight Bar: Shown when user types or pastes a github.com URL */}
        {hasGitHub && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              px: 3,
              py: 2,
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'accent.emphasis',
              borderRadius: '6px 6px 0 0',
              borderBottom: 'none',
              animation: 'fadeIn 0.2s ease-in-out',
            }}
          >
            {/* Left: GitHub Icon beside content with GitHub theme */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1,
                  bg: 'canvas.default',
                  border: '1px solid',
                  borderColor: 'border.default',
                  borderRadius: 2,
                  color: 'fg.default',
                }}
              >
                <MarkGithubIcon size={16} />
                <Text
                  sx={{
                    fontFamily: 'mono',
                    fontWeight: 600,
                    fontSize: 1,
                    color: 'fg.default',
                  }}
                >
                  {primaryGitHub?.fullName}
                </Text>
                {primaryGitHub?.repo && (
                  <Label variant="accent" size="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <RepoIcon size={11} /> Repo
                  </Label>
                )}
              </Box>

              {detectedGitHub.length > 1 && (
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  +{detectedGitHub.length - 1} more repo{detectedGitHub.length > 2 ? 's' : ''}
                </Text>
              )}
            </Box>

            {/* Right: Live Reader status indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: '#2da44e',
                    display: 'inline-block',
                    boxShadow: '0 0 0 2px rgba(45, 164, 78, 0.25)',
                  }}
                />
                <Text sx={{ fontSize: 0, fontWeight: 500, color: 'success.fg' }}>
                  Live GitHub & README Reader Active
                </Text>
              </Box>

              {primaryGitHub && (
                <a
                  href={
                    primaryGitHub.rawUrl.startsWith('http')
                      ? primaryGitHub.rawUrl
                      : `https://${primaryGitHub.rawUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: '12px',
                    color: 'inherit',
                    textDecoration: 'none',
                    opacity: 0.75,
                  }}
                  title="Open GitHub repo in new tab"
                >
                  <LinkExternalIcon size={12} />
                </a>
              )}
            </Box>
          </Box>
        )}

        {/* Textarea Box & Send Button */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <Box
            sx={{
              flex: 1,
              position: 'relative',
              borderRadius: hasGitHub ? '0 0 6px 6px' : 2,
              border: hasGitHub ? '1px solid' : 'none',
              borderColor: hasGitHub ? 'accent.emphasis' : 'transparent',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              boxShadow: hasGitHub ? '0 0 0 1px var(--borderColor-accent-emphasis, #1f6feb)' : 'none',
            }}
          >
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask PostPilot AI to write a LinkedIn post, brainstorm hooks, or read a GitHub repo... (Enter to send, Shift+Enter for newline)"
              rows={3}
              block
              style={{
                resize: 'none',
                borderRadius: hasGitHub ? '0 0 6px 6px' : undefined,
              }}
              disabled={isLoading}
            />
          </Box>

          <Button
            variant="primary"
            leadingVisual={PaperAirplaneIcon}
            onClick={handleSend}
            disabled={!content.trim() || isLoading}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
