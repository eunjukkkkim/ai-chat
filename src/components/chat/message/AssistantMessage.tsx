import type { ReactNode } from 'react';
import { MarkdownContent } from '@/components/chat/MarkdownContent';
import { MessageActions } from './MessageActions';

// ── Shared internals ──────────────────────────────────────────────────────────

function ContentBlock({ content, children }: { content: string; children?: ReactNode }) {
  return (
    <div className="text-[15px] leading-[1.6] text-ink">
      <MarkdownContent content={content} />
      {children}
    </div>
  );
}

const statusNoticeStyles = {
  failed: {
    box: 'border-danger-border bg-danger-bg',
    dot: 'bg-[#e0594f]',
    text: 'text-danger-ink',
    button: 'bg-danger text-white hover:opacity-90 transition-opacity',
  },
  interrupted: {
    box: 'border-line bg-surface-2',
    dot: 'bg-accent',
    text: 'text-sub',
    button: 'border border-line bg-surface text-ink hover:bg-bg transition-colors',
  },
} as const;

function StatusNotice({
  variant,
  message,
  isStreaming,
  onRetry,
}: {
  variant: 'failed' | 'interrupted';
  message: string;
  isStreaming: boolean;
  onRetry?: () => void;
}) {
  const s = statusNoticeStyles[variant];
  return (
    <div className={`flex items-center gap-3 rounded-[11px] border px-[15px] py-[12px] ${s.box}`}>
      <span className={`h-2 w-2 flex-none rounded-full ${s.dot}`} />
      <span className={`flex-1 text-[14px] ${s.text}`}>{message}</span>
      {!isStreaming && onRetry && (
        <button
          onClick={onRetry}
          title="다시 시도"
          aria-label="assistant 응답 다시 시도"
          className={`shrink-0 rounded-[8px] px-3 py-1.5 text-[12px] font-medium ${s.button}`}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

// ── Status variants ───────────────────────────────────────────────────────────

export function PendingMessage() {
  return (
    <div className="flex gap-[5px] py-[6px]">
      {[0, 0.2, 0.4].map((delay, i) => (
        <span
          key={i}
          className="w-[7px] h-[7px] rounded-full bg-muted inline-block"
          style={{ animation: 'dotPulse 1.3s infinite', animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

export function StreamingMessage({ content }: { content: string }) {
  return (
    <ContentBlock content={content}>
      <span
        className="inline-block w-[7px] h-[16px] bg-accent ml-[3px] align-[-2px] rounded-[1px]"
        style={{ animation: 'blink 1s steps(1) infinite' }}
      />
    </ContentBlock>
  );
}

export function CompletedMessage({
  content,
  copied,
  isStreaming,
  onCopy,
  onRegenerate,
}: {
  content: string;
  copied: boolean;
  isStreaming: boolean;
  onCopy: () => void;
  onRegenerate?: () => void;
}) {
  return (
    <>
      <ContentBlock content={content} />
      {!isStreaming && (
        <MessageActions copied={copied} onCopy={onCopy} onRegenerate={onRegenerate} />
      )}
    </>
  );
}

export function InterruptedMessage({
  content,
  isStreaming,
  onRegenerate,
}: {
  content: string;
  isStreaming: boolean;
  onRegenerate?: () => void;
}) {
  return (
    <>
      <ContentBlock content={content} />
      <StatusNotice
        variant="interrupted"
        message="응답이 중단되었습니다"
        isStreaming={isStreaming}
        onRetry={onRegenerate}
      />
    </>
  );
}

export function FailedMessage({
  content,
  isStreaming,
  onRetry,
}: {
  content: string;
  isStreaming: boolean;
  onRetry?: () => void;
}) {
  return (
    <StatusNotice
      variant="failed"
      message={content || '응답 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'}
      isStreaming={isStreaming}
      onRetry={onRetry}
    />
  );
}
