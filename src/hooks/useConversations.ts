'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Conversation } from '@/types/chat';
import { conversationApi } from '@/lib/conversationApi';
import { queryKeys } from '@/lib/queryKeys';

const EMPTY_CONVERSATIONS: Conversation[] = [];

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}

function upsertConversation(
  conversations: Conversation[] | undefined,
  conversation: Conversation,
) {
  const current = conversations ?? [];
  const next = current.some((item) => item.id === conversation.id)
    ? current.map((item) => (item.id === conversation.id ? conversation : item))
    : [conversation, ...current];

  return sortConversations(next);
}

export function useConversations() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );

  const conversationsQuery = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: conversationApi.listConversations,
  });

  const activeConversationQuery = useQuery({
    queryKey: activeConversationId
      ? queryKeys.conversation(activeConversationId)
      : ['conversation', 'idle'],
    queryFn: () => conversationApi.getConversation(activeConversationId ?? ''),
    enabled: Boolean(activeConversationId),
  });

  const createConversationMutation = useMutation({
    mutationFn: conversationApi.createConversation,
    onSuccess: (conversation) => {
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (current) => upsertConversation(current, conversation),
      );
      queryClient.setQueryData(
        queryKeys.conversation(conversation.id),
        conversation,
      );
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: conversationApi.deleteConversation,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.conversations });
      const previousConversations = queryClient.getQueryData<Conversation[]>(
        queryKeys.conversations,
      );

      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (current) => (current ?? []).filter((conversation) => conversation.id !== id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.conversation(id) });

      if (activeConversationId === id) {
        setActiveConversationId(null);
      }

      return { previousConversations };
    },
    onError: (_error, _id, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(
          queryKeys.conversations,
          context.previousConversations,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });

  const conversations = conversationsQuery.data ?? EMPTY_CONVERSATIONS;
  const activeConversation = activeConversationQuery.data ?? null;

  const pruneEmptyConversation = useCallback(
    (conversation: Conversation | null) => {
      if (!conversation || conversation.messages.length > 0) return;
      deleteConversationMutation.mutate(conversation.id);
    },
    [deleteConversationMutation],
  );

  const startNewChat = useCallback(async () => {
    const emptyConversations = conversations.filter(
      (conversation) => conversation.messages.length === 0,
    );
    const emptyConversation = emptyConversations[0];

    if (emptyConversation) {
      const duplicateEmptyIds = emptyConversations
        .slice(1)
        .map((conversation) => conversation.id);

      duplicateEmptyIds.forEach((id) => {
        deleteConversationMutation.mutate(id);
      });

      setActiveConversationId(emptyConversation.id);
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (current) =>
          upsertConversation(
            (current ?? []).filter((item) => !duplicateEmptyIds.includes(item.id)),
            emptyConversation,
          ),
      );
      queryClient.setQueryData(
        queryKeys.conversation(emptyConversation.id),
        emptyConversation,
      );
      return emptyConversation;
    }

    const conversation = await createConversationMutation.mutateAsync();
    setActiveConversationId(conversation.id);
    return conversation;
  }, [
    conversations,
    createConversationMutation,
    deleteConversationMutation,
    queryClient,
  ]);

  const selectConversation = useCallback(
    (id: string) => {
      pruneEmptyConversation(activeConversation);
      setActiveConversationId(id);
    },
    [activeConversation, pruneEmptyConversation],
  );

  const updateConversation = useCallback(
    (updated: Conversation) => {
      queryClient.setQueryData(queryKeys.conversation(updated.id), updated);
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (current) => upsertConversation(current, updated),
      );
    },
    [queryClient],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await deleteConversationMutation.mutateAsync(id);
    },
    [deleteConversationMutation],
  );

  const isLoadingConversations =
    conversationsQuery.isLoading ||
    createConversationMutation.isPending ||
    deleteConversationMutation.isPending;

  return useMemo(
    () => ({
      conversations,
      isLoadingConversations,
      activeConversation,
      startNewChat,
      selectConversation,
      updateConversation,
      deleteConversation,
    }),
    [
      activeConversation,
      conversations,
      deleteConversation,
      isLoadingConversations,
      selectConversation,
      startNewChat,
      updateConversation,
    ],
  );
}
