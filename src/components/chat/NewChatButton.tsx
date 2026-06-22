'use client';

import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/Spinner';

type NewChatButtonProps = {
  isLoading: boolean;
  onClick: () => void;
  variant: 'sidebar' | 'hero';
};

const variantClass = {
  sidebar:
    'w-full px-[18px] py-[11px] text-[14px] tracking-[-0.2px]',
  hero:
    'min-w-[102px] h-[40px] px-6 py-2.5 text-[14px]',
};

export function NewChatButton({ isLoading, onClick, variant }: NewChatButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      aria-label={isLoading ? '채팅 기록 불러오는 중' : '새 채팅'}
      className={cn(
        'inline-flex items-center justify-center gap-2 bg-accent text-accent-fg font-semibold rounded-[10px] hover:opacity-90 transition-opacity border-none',
        variantClass[variant],
        isLoading ? 'cursor-wait opacity-80' : 'cursor-pointer',
      )}
    >
      {isLoading ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <>
          <span className="text-[18px] leading-none -mt-px">+</span>
          새 채팅
        </>
      )}
    </button>
  );
}
