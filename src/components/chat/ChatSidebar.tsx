"use client";

import type { Conversation } from "@/types/chat";
import { cn } from "@/lib/cn";
import { ChatSidebarItem } from "./ChatSidebarItem";
import { NewChatButton } from "./NewChatButton";
import { Spinner } from "@/components/ui/Spinner";
import { MODEL } from "@/constants";

interface Props {
  conversations: Conversation[];
  isLoading: boolean;
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
}

export function ChatSidebar({
  conversations,
  isLoading,
  activeId,
  onNew,
  onSelect,
  onDelete,
  isOpen,
}: Props) {
  return (
    <aside
      className={cn(
        "fixed md:static inset-y-0 left-0 z-50",
        "w-[264px] shrink-0 bg-bg-deep flex flex-col h-full",
        "border-r border-line",
        "transition-transform duration-200 ease-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
      style={{ boxShadow: isOpen ? "0 0 50px rgba(0,0,0,0.5)" : "none" }}
    >
      {/* New chat button */}
      <div className="px-[14px] pt-4 pb-[10px]">
        <NewChatButton
          onClick={onNew}
          isLoading={isLoading}
          variant="sidebar"
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <ConversationListLoading />
        ) : conversations.length === 0 ? (
          <p className="text-[12px] text-muted text-center mt-8 px-4">
            아직 대화가 없습니다
          </p>
        ) : (
          conversations.map((conv) => (
            <ChatSidebarItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <div className="px-4 py-[13px] border-t border-[#1b1f27] font-mono text-[11px] text-muted truncate">
        {MODEL}
      </div>
    </aside>
  );
}

function ConversationListLoading() {
  return (
    <div
      className="mt-8 flex items-center justify-center gap-2 text-[12px] text-muted"
      aria-live="polite"
      aria-label="채팅 기록 불러오는 중"
    >
      <Spinner className="h-3 w-3 border border-muted border-t-accent" />
      <span>채팅 기록 불러오는 중</span>
    </div>
  );
}
