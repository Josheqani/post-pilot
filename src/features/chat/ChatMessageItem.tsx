import React, { useState } from 'react';
import { Button, Label } from '@primer/react';
import { Box, Text } from '@/components/PrimerCompat';
import { SparkleIcon, PersonIcon, PlusIcon, CheckIcon, CopyIcon } from '@primer/octicons-react';
import { Message } from '@/types';

interface ChatMessageItemProps {
  message: Message;
  onCreateDraft: (content: string) => void;
  isDraftCreating?: boolean;
}

function getPostDraftInfo(message: Message): { isPostDraft: boolean; draftContent: string } {
  // If explicitly flagged by the worker
  if (typeof message.isPostDraft === 'boolean') {
    return {
      isPostDraft: message.isPostDraft,
      draftContent: message.draftContent || message.content,
    };
  }

  // Check for explicit <post>...</post> or <linkedin_post> tags
  const tagMatch = message.content.match(/<(?:post|linkedin_post)>([\s\S]*?)<\/(?:post|linkedin_post)>/i);
  if (tagMatch && tagMatch[1]) {
    return {
      isPostDraft: true,
      draftContent: tagMatch[1].trim(),
    };
  }

  // Heuristic: has hashtags, multiple paragraphs, length >= 120, not a numbered list of ideas
  const hasHashtags = /#[\w\d_]{2,}/.test(message.content);
  const hasParagraphs = (message.content.match(/\n\s*\n/g) || []).length >= 2;
  const isNumberedList = /^\s*1\.\s+.*\n\s*2\.\s+/m.test(message.content);
  if (hasHashtags && hasParagraphs && message.content.length >= 120 && !isNumberedList) {
    return {
      isPostDraft: true,
      draftContent: message.content.trim(),
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
  const isAI = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);

  const draftInfo = isAI ? getPostDraftInfo(message) : { isPostDraft: false, draftContent: message.content };

  // Strip XML-like draft tags for clean message reading
  const displayContent = message.content
    .replace(/<\/?(?:post|linkedin_post)>/gi, '')
    .trim();

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
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>{isAI ? 'PostPilot AI' : 'You'}</Text>
            {isAI && draftInfo.isPostDraft && (
              <Label variant="accent">
                LinkedIn Draft
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
                onClick={() => onCreateDraft(draftInfo.draftContent)}
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
