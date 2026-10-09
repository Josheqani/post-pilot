import React from 'react';
import { Button, IconButton, Spinner } from '@primer/react';
import { Box, Text } from '@/components/PrimerCompat';
import { PlusIcon, TrashIcon, CommentDiscussionIcon } from '@primer/octicons-react';
import { Conversation } from '@/types';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  isResponding?: boolean;
  respondingId?: string | null;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isLoading,
  isResponding = false,
  respondingId = null,
}) => {
  return (
    <Box
      sx={{
        width: ['100%', '100%', '280px'],
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'border.default',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'border.muted' }}>
        <Button
          leadingVisual={PlusIcon}
          block
          variant="primary"
          onClick={onNew}
          disabled={isLoading}
        >
          New Chat
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {conversations.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'fg.muted' }}>
            <CommentDiscussionIcon size={24} />
            <Text sx={{ display: 'block', mt: 1, fontSize: 1 }}>No conversations yet</Text>
          </Box>
        ) : (
          <Box
            as="ul"
            role="list"
            sx={{
              listStyle: 'none',
              p: 0,
              m: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              width: '100%',
            }}
          >
            {conversations.map((c) => {
              const isSelected = c.id === activeId;
              const isChatResponding = Boolean(
                respondingId ? respondingId === c.id : (isResponding && isSelected)
              );
              return (
                <Box
                  as="li"
                  key={c.id}
                  role="listitem"
                  aria-current={isSelected ? 'page' : undefined}
                  onClick={() => onSelect(c.id)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: '6px',
                    height: '38px',
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                    bg: isSelected
                      ? 'var(--bgColor-accent-muted, rgba(9, 105, 218, 0.1))'
                      : 'transparent',
                    color: isSelected
                      ? 'var(--fgColor-accent, #0969da)'
                      : 'var(--fgColor-default, inherit)',
                    borderLeft: isSelected
                      ? '3px solid var(--borderColor-accent-emphasis, #0969da)'
                      : '3px solid transparent',
                    '&:hover': {
                      bg: isSelected
                        ? 'var(--bgColor-accent-muted, rgba(9, 105, 218, 0.15))'
                        : 'var(--bgColor-neutral-muted, rgba(175, 184, 193, 0.12))',
                    },
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      height: '100%',
                      overflow: 'hidden',
                      mr: 1,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        marginRight: 8,
                        flexShrink: 0,
                        opacity: isSelected ? 1 : 0.65,
                      }}
                      title={isChatResponding ? 'Generating response...' : undefined}
                    >
                      {isChatResponding ? (
                        <Spinner size="small" />
                      ) : (
                        <CommentDiscussionIcon size={14} />
                      )}
                    </span>
                    <Text
                      sx={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: 1,
                        lineHeight: 'normal',
                        color: 'inherit',
                      }}
                    >
                      {c.title || 'Untitled Chat'}
                    </Text>
                  </Box>

                  <IconButton
                    icon={TrashIcon}
                    aria-label="Delete chat"
                    size="small"
                    variant="invisible"
                    style={{
                      flexShrink: 0,
                      cursor: 'pointer',
                      opacity: isSelected ? 0.9 : 0.6,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (window.confirm('Delete this conversation?')) {
                        onDelete(c.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};
