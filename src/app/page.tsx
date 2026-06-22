'use client';

import { useCallback, useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { cn } from '@/lib/cn';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { DraftChatWindow } from '@/components/chat/DraftChatWindow';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isStartingFromDraft, setIsStartingFromDraft] = useState(false);
  const [queuedInitialMessage, setQueuedInitialMessage] = useState<{
    conversationId: string;
    content: string;
  } | null>(null);
  const {
    conversations,
    isLoadingConversations,
    activeConversation,
    startNewChat,
    selectConversation,
    updateConversation,
    deleteConversation,
  } = useConversations();

  const handleNewChat = useCallback(() => {
    if (isLoadingConversations) return;
    void startNewChat();
    setSidebarOpen(false);
  }, [isLoadingConversations, startNewChat]);

  const handleDraftSend = useCallback(async (content: string) => {
    if (isLoadingConversations || isStartingFromDraft) return;

    setIsStartingFromDraft(true);
    try {
      const conversation = await startNewChat();
      setQueuedInitialMessage({
        conversationId: conversation.id,
        content,
      });
    } finally {
      setIsStartingFromDraft(false);
    }
  }, [isLoadingConversations, isStartingFromDraft, startNewChat]);

  const handleSelect = useCallback((id: string) => {
    selectConversation(id);
    setSidebarOpen(false);
  }, [selectConversation]);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((current) => !current);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/55 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar wrapper — desktop width animation, mobile fixed overlay unaffected */}
      <div
        className={cn(
          "w-0 md:shrink-0 md:overflow-hidden",
          "md:transition-[width] md:duration-200 md:ease-out",
          sidebarCollapsed ? "md:w-0" : "md:w-[264px]",
        )}
      >
        <ChatSidebar
          conversations={conversations}
          isLoading={isLoadingConversations}
          activeId={activeConversation?.id ?? null}
          onNew={handleNewChat}
          onSelect={handleSelect}
          onDelete={deleteConversation}
          isOpen={sidebarOpen}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {activeConversation ? (
          <ChatWindow
            key={activeConversation.id}
            conversation={activeConversation}
            onConversationUpdate={updateConversation}
            onOpenSidebar={openSidebar}
            onToggleSidebar={toggleSidebarCollapsed}
            isSidebarCollapsed={sidebarCollapsed}
            initialMessage={
              queuedInitialMessage?.conversationId === activeConversation.id
                ? queuedInitialMessage.content
                : null
            }
            onInitialMessageConsumed={() => {
              setQueuedInitialMessage(null);
            }}
          />
        ) : (
          <DraftChatWindow
            onSend={handleDraftSend}
            onOpenSidebar={openSidebar}
            onToggleSidebar={toggleSidebarCollapsed}
            isSidebarCollapsed={sidebarCollapsed}
            disabled={isLoadingConversations || isStartingFromDraft}
          />
        )}
      </main>
    </div>
  );
}
