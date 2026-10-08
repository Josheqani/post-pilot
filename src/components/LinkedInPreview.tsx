import React, { useState } from 'react';
import { Avatar, SegmentedControl } from '@primer/react';
import { Box, Text } from '@/components/PrimerCompat';
import {
  ThumbsupIcon,
  CommentDiscussionIcon,
  SyncIcon,
  PaperAirplaneIcon,
  GlobeIcon,
  KebabHorizontalIcon,
} from '@primer/octicons-react';
import { LinkedInAccount } from '@/types';

interface LinkedInPreviewProps {
  content: string;
  account?: LinkedInAccount | null;
}

export const LinkedInPreview: React.FC<LinkedInPreviewProps> = ({ content, account }) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isExpanded, setIsExpanded] = useState(false);

  const authorName = account?.name || 'Your Name';
  const authorHeadline = account?.headline || 'Tech Lead • Building Developer Tools & AI Workflows';
  const authorAvatar =
    account?.profilePictureUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80';

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTimeSeconds = Math.max(5, Math.round((wordCount / 200) * 60));

  // LinkedIn truncates preview in feed around 210-250 characters
  const shouldTruncate = deviceMode === 'mobile' ? charCount > 180 : charCount > 240;
  const displayContent =
    shouldTruncate && !isExpanded
      ? content.slice(0, deviceMode === 'mobile' ? 180 : 240).trim()
      : content;

  // Format hashtags and links for realistic preview
  const formatText = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} style={{ color: '#0a66c2', fontWeight: 600 }}>
            {part}
          </span>
        );
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <span key={index} style={{ color: '#0a66c2', textDecoration: 'underline' }}>
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* View Switcher and Stats */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <SegmentedControl aria-label="Device Preview">
          <SegmentedControl.Button
            selected={deviceMode === 'desktop'}
            onClick={() => setDeviceMode('desktop')}
          >
            Desktop
          </SegmentedControl.Button>
          <SegmentedControl.Button
            selected={deviceMode === 'mobile'}
            onClick={() => setDeviceMode('mobile')}
          >
            Mobile
          </SegmentedControl.Button>
        </SegmentedControl>

        <Box sx={{ display: 'flex', gap: 3, fontSize: 0, color: 'fg.muted' }}>
          <span>
            <strong>{charCount}</strong> / 3,000 chars
          </span>
          <span>
            <strong>{wordCount}</strong> words
          </span>
          <span>~{readingTimeSeconds}s read</span>
        </Box>
      </Box>

      {/* Feed Container */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 3,
          bg: 'canvas.subtle',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'border.default',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: deviceMode === 'mobile' ? '380px' : '560px',
            bg: 'canvas.default',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'border.default',
            boxShadow: 'shadow.medium',
            overflow: 'hidden',
          }}
        >
          {/* Post Header */}
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Avatar src={authorAvatar} size={48} alt={authorName} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Text sx={{ fontWeight: 'bold', fontSize: 1, color: 'fg.default' }}>
                  {authorName}
                </Text>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>• 1st</Text>
              </Box>
              <Text
                sx={{
                  display: 'block',
                  fontSize: 0,
                  color: 'fg.muted',
                  lineHeight: '1.2',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {authorHeadline}
              </Text>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mt: '2px',
                  color: 'fg.subtle',
                }}
              >
                <Text sx={{ fontSize: 0 }}>Now • </Text>
                <GlobeIcon size={12} />
              </Box>
            </Box>
            <Box sx={{ color: 'fg.muted', cursor: 'pointer' }}>
              <KebabHorizontalIcon size={16} />
            </Box>
          </Box>

          {/* Post Content */}
          <Box sx={{ px: 3, py: 2 }}>
            {content.trim() ? (
              <Box
                sx={{
                  fontSize: 1,
                  lineHeight: '1.5',
                  color: 'fg.default',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto',
                }}
              >
                {formatText(displayContent)}
                {shouldTruncate && (
                  <span
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                      color: 'var(--fgColor-muted, #656d76)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginLeft: '4px',
                    }}
                  >
                    {isExpanded ? ' ...less' : ' ...see more'}
                  </span>
                )}
              </Box>
            ) : (
              <Text sx={{ color: 'fg.subtle', fontStyle: 'italic', fontSize: 1 }}>
                Start writing your post or generate one with AI to preview it here...
              </Text>
            )}
          </Box>

          {/* Social Reactions Bar */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 3,
              py: 2,
              borderTop: '1px solid',
              borderColor: 'border.muted',
              color: 'fg.muted',
              fontSize: 0,
            }}
          >
            <span>👍 ❤️ 💡 42</span>
            <span>6 comments • 2 reposts</span>
          </Box>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              py: 2,
              borderTop: '1px solid',
              borderColor: 'border.muted',
              color: 'fg.muted',
              fontSize: 0,
              fontWeight: 600,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                p: 1,
                borderRadius: 1,
              }}
            >
              <ThumbsupIcon size={16} />
              <span>Like</span>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                p: 1,
                borderRadius: 1,
              }}
            >
              <CommentDiscussionIcon size={16} />
              <span>Comment</span>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                p: 1,
                borderRadius: 1,
              }}
            >
              <SyncIcon size={16} />
              <span>Repost</span>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                p: 1,
                borderRadius: 1,
              }}
            >
              <PaperAirplaneIcon size={16} />
              <span>Send</span>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
