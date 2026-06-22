'use client';

import { memo, useCallback, type MouseEvent } from 'react';
import type { Conversation } from '@/types/chat';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui/IconButton';
import { XIcon } from '@/components/ui/icons';

type ChatSidebarItemProps = {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

function getPreview(conv: Conversation, isActive: boolean): { text: string; colorClass: string } {
  const last = conv.messages[conv.messages.length - 1];
  if (!last) return { text: '새로운 대화', colorClass: isActive ? 'text-[#7fd4c1]' : 'text-muted' };
  if (last.status === 'failed') return { text: '실패 · 재시도 가능', colorClass: 'text-danger' };
  if (last.status === 'streaming') return { text: '스트리밍 중…', colorClass: 'text-accent' };

  const prefix = last.role === 'user' ? '나: ' : '';
  return {
    text: prefix + (last.content ? last.content.slice(0, 36) : '…'),
    colorClass: 'text-muted',
  };
}

function ChatSidebarItemComponent({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ChatSidebarItemProps) {
  const preview = getPreview(conversation, isActive);

  const handleSelect = useCallback(() => {
    onSelect(conversation.id);
  }, [conversation.id, onSelect]);

  const handleDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onDelete(conversation.id);
    },
    [conversation.id, onDelete],
  );

  return (
    <div
      className={cn(
        'group flex items-center gap-1 mb-[3px] rounded-[9px] transition-colors cursor-pointer',
        isActive ? 'bg-surface-2' : 'hover:bg-[#13161c]',
      )}
      style={isActive ? { boxShadow: 'inset 0 0 0 1px #232934' } : undefined}
    >
      <button
        onClick={handleSelect}
        aria-label={`${conversation.title} 대화 열기`}
        className="flex-1 text-left px-3 py-[10px] min-w-0 border-none bg-transparent cursor-pointer font-sans"
      >
        <p className={cn('text-[13px] font-semibold tracking-[-0.1px] truncate', isActive ? 'text-ink-strong' : 'text-sub')}>
          {conversation.title}
        </p>
        <p className={cn('text-[11px] mt-[3px] truncate', preview.colorClass)}>
          {preview.text}
        </p>
      </button>
      <IconButton
        onClick={handleDelete}
        title="삭제"
        aria-label={`${conversation.title} 대화 삭제`}
        className="shrink-0 w-6 h-6 mr-2 rounded-[6px] opacity-0 group-hover:opacity-100 transition-all"
      >
        <XIcon />
      </IconButton>
    </div>
  );
}

export const ChatSidebarItem = memo(ChatSidebarItemComponent);
