'use client';

import { IconButton } from '@/components/ui/IconButton';
import { CheckIcon, CopyIcon, RefreshIcon } from '@/components/ui/icons';

type MessageActionsProps = {
  copied: boolean;
  onCopy: () => void;
  onRegenerate?: () => void;
};

export function MessageActions({ copied, onCopy, onRegenerate }: MessageActionsProps) {
  return (
    <div className="flex items-center gap-[6px] mt-[2px]">
      <IconButton
        onClick={onCopy}
        title={copied ? '복사됨' : '복사'}
        aria-label={copied ? '복사됨' : '메시지 복사'}
        className="w-[30px] h-[28px] hover:bg-surface-2"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </IconButton>
      {onRegenerate && (
        <IconButton
          onClick={onRegenerate}
          title="다시 생성"
          aria-label="assistant 응답 다시 생성"
          className="w-[30px] h-[28px] hover:bg-surface-2"
        >
          <RefreshIcon />
        </IconButton>
      )}
    </div>
  );
}
