import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { Conversation, Message } from '@/types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track conversation IDs that were just created locally to prevent redundant fetch races
  const newlyCreatedConvIdRef = useRef<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoadingList(true);
    setError(null);
    try {
      const data = await api.conversations.list();
      setConversations(data);
      setActiveConversationId((current) => {
        if (!current && data.length > 0) {
          return data[0]!.id;
        }
        return current;
      });
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const refreshConversationsList = async () => {
    try {
      const data = await api.conversations.list();
      setConversations(data);
    } catch {
      // ignore background refresh errors
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await api.conversations.get(convId);
      setMessages((prev) => {
        // Retain any pending optimistic messages for this conversation if sending
        const pendingTemp = prev.filter(
          (m) => m.id.startsWith('temp-') && m.conversationId === convId
        );
        // Avoid keeping temp message if the real message already exists in fetched data
        const uniqueTemp = pendingTemp.filter(
          (temp) => !data.messages.some((m) => m.role === temp.role && m.content === temp.content)
        );
        return [...data.messages, ...uniqueTemp];
      });
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      // If this conversation was just created locally, it is known to be empty.
      // Skipping fetch prevents a race condition that duplicates the first user message.
      if (newlyCreatedConvIdRef.current === activeConversationId) {
        newlyCreatedConvIdRef.current = null;
        return;
      }
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages]);

  const createConversation = async (title?: string): Promise<Conversation> => {
    const newConv = await api.conversations.create(title);
    newlyCreatedConvIdRef.current = newConv.id;
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setMessages([]);
    return newConv;
  };

  const deleteConversation = async (convId: string): Promise<void> => {
    await api.conversations.delete(convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  const sendMessageToConv = async (convId: string, content: string) => {
    setIsSending(true);
    setError(null);

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await api.conversations.sendMessage(convId, content);
      setMessages((prev) => {
        // Robust deduplication: remove optimistic temp and any matching IDs
        const withoutTemp = prev.filter(
          (m) =>
            m.id !== tempUserMsg.id &&
            m.id !== result.userMessage.id &&
            m.id !== result.assistantMessage.id
        );
        return [...withoutTemp, result.userMessage, result.assistantMessage];
      });
      // Refresh titles in sidebar without resetting active selection
      refreshConversationsList();
      return result;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
      // Remove optimistic message on error so it doesn't linger as a phantom message
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      throw e;
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!activeConversationId) {
      // Auto-create conversation first
      const newConv = await createConversation();
      return sendMessageToConv(newConv.id, content);
    }
    return sendMessageToConv(activeConversationId, content);
  };

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    isLoadingList,
    isLoadingMessages,
    isSending,
    error,
    createConversation,
    deleteConversation,
    sendMessage,
    refreshConversations: fetchConversations,
  };
}
