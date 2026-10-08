import { useState, useEffect, useCallback } from 'react';
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

  const fetchConversations = useCallback(async () => {
    setIsLoadingList(true);
    setError(null);
    try {
      const data = await api.conversations.list();
      setConversations(data);
      if (data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0]!.id);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setIsLoadingList(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await api.conversations.get(convId);
      setMessages(data.messages);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages]);

  const createConversation = async (title?: string): Promise<Conversation> => {
    const newConv = await api.conversations.create(title);
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

  const sendMessage = async (content: string) => {
    if (!activeConversationId) {
      // Auto-create conversation first
      const newConv = await createConversation();
      return sendMessageToConv(newConv.id, content);
    }
    return sendMessageToConv(activeConversationId, content);
  };

  const sendMessageToConv = async (convId: string, content: string) => {
    setIsSending(true);
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
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        result.userMessage,
        result.assistantMessage,
      ]);
      // Update title in conversations list if changed
      fetchConversations();
      return result;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      throw e;
    } finally {
      setIsSending(false);
    }
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
