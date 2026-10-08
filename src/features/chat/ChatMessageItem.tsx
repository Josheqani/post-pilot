import React, { useState } from 'react';
import { Button } from '@primer/react';
import { Box, Text } from '@/components/PrimerCompat';
import { SparkleIcon, PersonIcon, PlusIcon, CheckIcon, CopyIcon } from '@primer/octicons-react';
import { Message } from '@/types';

interface ChatMessageItemProps {
  message: Message;
  onCreateDraft: (content: string) => void;
  isDraftCreating?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onCreateDraft,
  isDraftCreating,
}) => {
  const isAI = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
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
        borderColor: isAI ? 'border.muted' : 'border.default',
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
          <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>{isAI ? 'PostPilot AI' : 'You'}</Text>

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
          {message.content}
        </Box>

        {/* Action Toolbar for AI responses */}
        {isAI && (
          <Box
            sx={{
              mt: 3,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'border.muted',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Button
              size="small"
              variant="primary"
              leadingVisual={PlusIcon}
              onClick={() => onCreateDraft(message.content)}
              disabled={isDraftCreating}
            >
              Create Draft
            </Button>

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
