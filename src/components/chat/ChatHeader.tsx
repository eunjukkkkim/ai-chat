'use client';

import { SidebarCloseIcon, SidebarOpenIcon } from '@/components/ui/icons';

interface Props {
  title: string;
  isSidebarCollapsed: boolean;
  onOpenSidebar: () => void;
  onToggleSidebar: () => void;
}

export function ChatHeader({ title, isSidebarCollapsed, onOpenSidebar, onToggleSidebar }: Props) {
  return (
    <header className="shrink-0 h-[54px] border-b border-line flex items-center gap-3 px-5">
      <button
        onClick={onOpenSidebar}
        title="채팅 기록 열기"
        aria-label="채팅 기록 열기"
        className="md:hidden flex items-center justify-center w-9 h-9 -ml-2 flex-none border-none bg-transparent rounded-[8px] text-sub hover:bg-surface-2 cursor-pointer transition-colors"
      >
        <SidebarOpenIcon />
      </button>

      <button
        onClick={onToggleSidebar}
        title={isSidebarCollapsed ? '채팅 목록 펼치기' : '채팅 목록 접기'}
        aria-label={isSidebarCollapsed ? '채팅 목록 펼치기' : '채팅 목록 접기'}
        aria-pressed={!isSidebarCollapsed}
        className="hidden md:flex items-center justify-center w-9 h-9 -ml-2 flex-none border-none bg-transparent rounded-[8px] text-sub hover:bg-surface-2 cursor-pointer transition-colors"
      >
        {isSidebarCollapsed ? <SidebarOpenIcon /> : <SidebarCloseIcon />}
      </button>

      <h2 className="flex-1 text-[16px] font-semibold tracking-[-0.2px] text-ink-strong truncate min-w-0">
        {title}
      </h2>
    </header>
  );
}
