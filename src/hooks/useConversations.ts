'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Conversation } from '@/types/chat';
import { conversationApi } from '@/lib/conversationApi';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const activeConversationRef = useRef<Conversation | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    conversationApi.listConversations().then((list) => {
      setConversations(list);
    }).catch(() => {
      setConversations([]);
    }).finally(() => {
      setIsLoadingConversations(false);
    });
  }, []);

  const pruneEmptyActive = useCallback((currentActive: Conversation | null) => {
    if (currentActive && currentActive.messages.length === 0) {
      conversationApi.deleteConversation(currentActive.id).catch(() => {
        // Ignore cleanup errors for empty draft conversations.
      });
      setConversations((prev) => prev.filter((c) => c.id !== currentActive.id));
    }
  }, []);

  const startNewChat = useCallback(async () => {
    const emptyConversations = conversationsRef.current.filter(
      (conversation) => conversation.messages.length === 0,
    );
    const emptyConversation = emptyConversations[0];

    if (emptyConversation) {
      const duplicateEmptyIds = emptyConversations.slice(1).map((conversation) => conversation.id);
      duplicateEmptyIds.forEach((id) => {
        conversationApi.deleteConversation(id).catch(() => {
          // Ignore cleanup errors for duplicate empty draft conversations.
        });
      });

      setActiveConversation(emptyConversation);
      setConversations((prev) => [
        emptyConversation,
        ...prev.filter(
          (c) => c.id !== emptyConversation.id && !duplicateEmptyIds.includes(c.id),
        ),
      ]);
      return emptyConversation;
    }

    setActiveConversation(null);
    const conv = await conversationApi.createConversation();
    setActiveConversation(conv);
    setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
    return conv;
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    pruneEmptyActive(activeConversationRef.current);
    const conv = await conversationApi.getConversation(id);
    if (conv) setActiveConversation(conv);
  }, [pruneEmptyActive]);

  const updateConversation = useCallback((updated: Conversation) => {
    setActiveConversation(updated);
    setConversations((prev) => {
      const index = prev.findIndex((c) => c.id === updated.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = updated;
        return next.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return [updated, ...prev];
    });
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await conversationApi.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationRef.current?.id === id) {
      setActiveConversation(null);
    }
  }, []);

  return {
    conversations,
    isLoadingConversations,
    activeConversation,
    startNewChat,
    selectConversation,
    updateConversation,
    deleteConversation,
  };
}
