import React, { useState } from 'react';
import { Button, Label } from '@primer/react';
import { Box, Text } from '@/components/PrimerCompat';
import {
  SparkleIcon,
  PersonIcon,
  PlusIcon,
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  LinkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@primer/octicons-react';
import { Message } from '@/types';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ThinkingOrb } from 'thinking-orbs';
import { useTheme } from '@/hooks/useTheme';

interface ChatMessageItemProps {
  message: Message;
  onCreateDraft: (content: string, title?: string) => void;
  isDraftCreating?: boolean;
}

function getPostDraftInfo(message: Message): {
  isPostDraft: boolean;
  draftContent: string;
  draftTitle?: string;
} {
  // If explicitly flagged by the worker
  if (typeof message.isPostDraft === 'boolean') {
    return {
      isPostDraft: message.isPostDraft,
      draftContent: message.draftContent || message.content,
      draftTitle: message.draftTitle,
    };
  }

  let draftTitle: string | undefined = undefined;
  const titleTagMatch = message.content.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleTagMatch && titleTagMatch[1]) {
    draftTitle = titleTagMatch[1].trim();
  }

  // Check for explicit <post>...</post> or <linkedin_post> tags
  const tagMatch = message.content.match(/<(?:post|linkedin_post)>([\s\S]*?)<\/(?:post|linkedin_post)>/i);
  if (tagMatch && tagMatch[1]) {
    const draftContent = tagMatch[1].trim();
    if (!draftTitle) {
      const firstLine = draftContent.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
      const cleaned = firstLine.replace(/^[#\s*•\->]+/, '').replace(/^["'“”]/, '').replace(/["'“”]$/, '').trim();
      if (cleaned) draftTitle = cleaned.length > 60 ? cleaned.slice(0, 57).trim() + '...' : cleaned;
    }
    return {
      isPostDraft: true,
      draftContent,
      draftTitle,
    };
  }

  // Heuristic: has hashtags, multiple paragraphs, length >= 120, not a numbered list of ideas
  const hasHashtags = /#[\w\d_]{2,}/.test(message.content);
  const hasParagraphs = (message.content.match(/\n\s*\n/g) || []).length >= 2;
  const isNumberedList = /^\s*1\.\s+.*\n\s*2\.\s+/m.test(message.content);
  if (hasHashtags && hasParagraphs && message.content.length >= 120 && !isNumberedList) {
    const draftContent = message.content.trim();
    if (!draftTitle) {
      const firstLine = draftContent.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
      const cleaned = firstLine.replace(/^[#\s*•\->]+/, '').replace(/^["'“”]/, '').replace(/["'“”]$/, '').trim();
      if (cleaned) draftTitle = cleaned.length > 60 ? cleaned.slice(0, 57).trim() + '...' : cleaned;
    }
    return {
      isPostDraft: true,
      draftContent,
      draftTitle,
    };
  }

  return {
    isPostDraft: false,
    draftContent: message.content,
  };
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onCreateDraft,
  isDraftCreating,
}) => {
  const { colorMode } = useTheme();
  const isAI = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const draftInfo = isAI ? getPostDraftInfo(message) : { isPostDraft: false, draftContent: message.content };

  // Parse <thinking> or <reasoning> tags
  let thinkingContent = '';
  let cleanContent = message.content;
  const thinkingMatch = cleanContent.match(/<(?:thinking|reasoning)>([\s\S]*?)<\/(?:thinking|reasoning)>/i);
  if (thinkingMatch && thinkingMatch[1]) {
    thinkingContent = thinkingMatch[1].trim();
    cleanContent = cleanContent.replace(/<(?:thinking|reasoning)>[\s\S]*?<\/(?:thinking|reasoning)>/gi, '').trim();
  }

  // Strip XML-like draft tags for clean message reading
  const displayContent = cleanContent
    .replace(/<\/?(?:title|post|linkedin_post)>/gi, '')
    .trim();

  // Detect web search or links citations
  const hasWebSearch = /(?:search results|github\.com|searched the web|according to the search)/i.test(displayContent);
  const hasLinks = /https?:\/\/[^\s]+|\[[^\]]+\]\([^)]+\)/.test(displayContent);

  const handleCopy = () => {
    const textToCopy = draftInfo.isPostDraft ? draftInfo.draftContent : displayContent;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        p: 3,
        bg: isAI ? 'canvas.subtle' : 'canvas.default',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isAI ? (draftInfo.isPostDraft ? 'accent.muted' : 'border.muted') : 'border.default',
        mb: 2,
      }}
    >
      {/* Avatar */}
      <Box sx={{ flexShrink: 0 }}>
        {isAI ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bg: 'accent.emphasis',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <SparkleIcon size={18} />
          </Box>
        ) : isSystem ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bg: 'neutral.subtle',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SparkleIcon size={18} />
          </Box>
        ) : (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bg: 'neutral.subtle',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'fg.default',
            }}
          >
            <PersonIcon size={18} />
          </Box>
        )}
      </Box>

      {/* Message Body */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>{isAI ? 'PostPilot AI' : 'You'}</Text>
            {isAI && draftInfo.isPostDraft && (
              <Label variant="accent">
                LinkedIn Draft
              </Label>
            )}
            {isAI && hasWebSearch && (
              <Label variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <GlobeIcon size={12} /> Web Grounded
              </Label>
            )}
            {isAI && !hasWebSearch && hasLinks && (
              <Label variant="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <LinkIcon size={12} /> Sources Cited
              </Label>
            )}
          </Box>

          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Box>

        {/* Thinking Process Drawer if present */}
        {isAI && thinkingContent && (
          <Box
            sx={{
              mb: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'border.muted',
              bg: 'canvas.default',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setShowThinking(!showThinking)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--fgColor-muted, #656d76)',
                fontSize: '12px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ThinkingOrb
                  state="solving"
                  size={20}
                  theme={
                    colorMode === 'night' ||
                    (colorMode === 'auto' &&
                      typeof window !== 'undefined' &&
                      window.matchMedia('(prefers-color-scheme: dark)').matches)
                      ? 'dark'
                      : 'light'
                  }
                />
                <strong>Thinking Process ({thinkingContent.split(/\s+/).length} words)</strong>
              </span>
              {showThinking ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
            </button>
            {showThinking && (
              <Box sx={{ p: 2, pt: 1, borderTop: '1px dashed', borderColor: 'border.muted', fontSize: 0 }}>
                <MarkdownContent content={thinkingContent} />
              </Box>
            )}
          </Box>
        )}

        {/* Suggested Title preview for draft */}
        {isAI && draftInfo.isPostDraft && draftInfo.draftTitle && (
          <Box
            sx={{
              mb: 2,
              px: 2,
              py: 1,
              bg: 'canvas.default',
              borderLeft: '3px solid',
              borderColor: 'accent.emphasis',
              borderRadius: 1,
            }}
          >
            <Text sx={{ fontSize: 0, color: 'fg.muted', display: 'block' }}>Suggested Title:</Text>
            <Text sx={{ fontSize: 1, fontWeight: 'bold', color: 'fg.default' }}>
              {draftInfo.draftTitle}
            </Text>
          </Box>
        )}

        {/* Content Body: Markdown for AI responses, plain text for User */}
        {isAI ? (
          <MarkdownContent content={displayContent} />
        ) : (
          <Box
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 1,
              lineHeight: 1.6,
              color: 'fg.default',
            }}
          >
            {displayContent}
          </Box>
        )}

        {/* Action Toolbar for AI responses */}
        {isAI && (
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'border.muted',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {/* ONLY show Create Draft button when the response is flagged as a post draft */}
            {draftInfo.isPostDraft && (
              <Button
                size="small"
                variant="primary"
                leadingVisual={PlusIcon}
                onClick={() => onCreateDraft(draftInfo.draftContent, draftInfo.draftTitle)}
                disabled={isDraftCreating}
              >
                Create Draft
              </Button>
            )}

            <Button
              size="small"
              variant="invisible"
              leadingVisual={copied ? CheckIcon : CopyIcon}
              onClick={handleCopy}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};
