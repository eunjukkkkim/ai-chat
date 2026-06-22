'use client';

import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { ChatHeader } from './ChatHeader';

interface Props {
  onSend: (content: string) => void;
  onOpenSidebar: () => void;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  disabled?: boolean;
}

export function DraftChatWindow({
  onSend,
  onOpenSidebar,
  onToggleSidebar,
  isSidebarCollapsed,
  disabled,
}: Props) {
  return (
    <div className="flex-1 flex flex-col min-h-0 animate-[fadeIn_0.18s_ease-out]">
      <ChatHeader
        title="새 채팅"
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenSidebar={onOpenSidebar}
        onToggleSidebar={onToggleSidebar}
      />

      <MessageList messages={[]} isStreaming={false} />

      <MessageInput
        onSend={onSend}
        onStop={() => {}}
        isStreaming={false}
        disabled={disabled}
      />
    </div>
  );
}
