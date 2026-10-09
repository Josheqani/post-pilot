import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Button } from '@primer/react';
import { Box, Heading, Text, Flash } from '@/components/PrimerCompat';
import { AlertIcon, SparkleIcon } from '@primer/octicons-react';
import { useConversations } from '@/hooks/useConversations';
import { ConversationSidebar } from '@/features/chat/ConversationSidebar';
import { ChatMessageItem } from '@/features/chat/ChatMessageItem';
import { ChatInput } from '@/features/chat/ChatInput';
import { ThinkingOrbLoader } from '@/components/ThinkingOrbLoader';
import { api } from '@/services/api';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    isLoadingList,
    isLoadingMessages,
    isSending,
    error,
    startNewChat,
    deleteConversation,
    sendMessage,
  } = useConversations();

  const [isDraftCreating, setIsDraftCreating] = React.useState(false);
  const [draftNotice, setDraftNotice] = React.useState<string | null>(null);
  const [lastSentPrompt, setLastSentPrompt] = React.useState<string>('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (content: string) => {
    setLastSentPrompt(content);
    await sendMessage(content);
  };

  const handleCreateDraft = async (content: string, title?: string) => {
    setIsDraftCreating(true);
    setDraftNotice(null);
    try {
      // Create a new post draft from this AI message including the generated title
      const post = await api.posts.create({
        title: title?.trim() || undefined,
        content,
        source: 'ai',
        status: 'draft',
        conversationId: activeConversationId || undefined,
      });

      setDraftNotice(`Draft "${post.title || 'Untitled'}" created successfully! Redirecting to editor...`);
      setTimeout(() => {
        navigate(`/posts/${post.id}`);
      }, 800);
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Failed to create draft: ${e.message}`);
    } finally {
      setIsDraftCreating(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: ['column', 'column', 'row'],
        height: 'calc(100vh - 65px)',
        overflow: 'hidden',
      }}
    >
      {/* Conversations Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={startNewChat}
        onDelete={deleteConversation}
        isLoading={isLoadingList}
      />

      {/* Main Chat Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          bg: 'canvas.default',
        }}
      >
        {/* Chat Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid',
            borderColor: 'border.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SparkleIcon size={18} />
            <Heading as="h2" sx={{ fontSize: 2, fontWeight: 'bold' }}>
              LinkedIn AI Strategist
            </Heading>
          </Box>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            Brainstorm hooks, structure posts, and turn ideas into drafts
          </Text>
        </Box>

        {draftNotice && (
          <Flash variant="success" sx={{ m: 3, mb: 0 }}>
            {draftNotice}
          </Flash>
        )}

        {error && (
          <Flash
            variant="danger"
            sx={{
              m: 3,
              mb: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, gap: 2 }}>
              <AlertIcon size={16} />
              <Text sx={{ fontSize: 1, wordBreak: 'break-word' }}>{error}</Text>
            </Box>
            {(error.includes('AI Provider') || error.includes('Settings')) && (
              <Button
                size="small"
                onClick={() => navigate('/settings?tab=ai')}
                style={{ marginLeft: 8, flexShrink: 0 }}
              >
                Go to AI Settings
              </Button>
            )}
          </Flash>
        )}

        {/* Message Thread */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {isLoadingMessages ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Spinner />
              <Text sx={{ display: 'block', mt: 2, color: 'fg.muted' }}>Loading discussion...</Text>
            </Box>
          ) : messages.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
                px: 3,
                maxWidth: '480px',
                mx: 'auto',
                color: 'fg.muted',
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bg: 'accent.subtle',
                  color: 'accent.fg',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <SparkleIcon size={28} />
              </Box>
              <Heading as="h3" sx={{ fontSize: 2, color: 'fg.default', mb: 1 }}>
                Talk with PostPilot AI
              </Heading>
              <Text sx={{ fontSize: 1 }}>
                Ask anything about LinkedIn content strategy, crafting compelling hooks, or drafting
                technical stories. When you love an answer, click <strong>Create Draft</strong> to
                transfer it into your editor!
              </Text>
            </Box>
          ) : (
            messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onCreateDraft={handleCreateDraft}
                isDraftCreating={isDraftCreating}
              />
            ))
          )}

          {isSending && (
            <Box sx={{ mb: 2 }}>
              <ThinkingOrbLoader
                prompt={
                  lastSentPrompt ||
                  (messages[messages.length - 1]?.role === 'user' ? messages[messages.length - 1]?.content : undefined)
                }
                size={32}
              />
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input Footer */}
        <ChatInput onSend={handleSendMessage} isLoading={isSending} />
      </Box>
    </Box>
  );
};
