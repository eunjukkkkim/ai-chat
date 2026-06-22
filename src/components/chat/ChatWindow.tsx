'use client';

import { useEffect, useRef } from 'react';
import type { Conversation } from '@/types/chat';
import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';

interface Props {
  conversation: Conversation;
  onConversationUpdate: (conversation: Conversation) => void;
  onOpenSidebar: () => void;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  initialMessage?: string | null;
  onInitialMessageConsumed?: () => void;
}

export function ChatWindow({
  conversation,
  onConversationUpdate,
  onOpenSidebar,
  onToggleSidebar,
  isSidebarCollapsed,
  initialMessage,
  onInitialMessageConsumed,
}: Props) {
  const { isStreaming, sendMessage, stopStreaming, regenerate, retry } = useChat({
    conversation,
    onConversationUpdate,
  });
  const consumedInitialMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isStreaming) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      stopStreaming();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, stopStreaming]);

  useEffect(() => {
    if (!initialMessage) return;
    if (consumedInitialMessageRef.current === initialMessage) return;

    consumedInitialMessageRef.current = initialMessage;
    onInitialMessageConsumed?.();
    void sendMessage(initialMessage);
  }, [initialMessage, onInitialMessageConsumed, sendMessage]);

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-[fadeIn_0.18s_ease-out]">
      <ChatHeader
        title={conversation.title}
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenSidebar={onOpenSidebar}
        onToggleSidebar={onToggleSidebar}
      />

      <MessageList
        messages={conversation.messages}
        isStreaming={isStreaming}
        onRegenerate={regenerate}
        onRetry={retry}
      />

      <MessageInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
      />
    </div>
  );
}
