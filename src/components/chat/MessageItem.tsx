"use client";

import { memo, useState, useCallback } from "react";
import type { Message } from "@/types/chat";
import {
  PendingMessage,
  StreamingMessage,
  CompletedMessage,
  InterruptedMessage,
  FailedMessage,
} from "./message/AssistantMessage";

interface Props {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  isStreaming: boolean;
}

function MessageItemComponent({ message, onRegenerate, onRetry, isStreaming }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard not available
    }
  }, [message.content]);

  const handleRegenerate = useCallback(() => {
    onRegenerate?.(message.id);
  }, [message.id, onRegenerate]);

  const handleRetry = useCallback(() => {
    onRetry?.(message.id);
  }, [message.id, onRetry]);

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-[5px]">
        <div className="bg-surface text-ink-strong text-[15px] leading-normal px-[15px] py-[11px] rounded-[14px] max-w-[80%] whitespace-pre-wrap wrap-break-word">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[9px]">
      {message.status === "pending" && <PendingMessage />}

      {message.status === "streaming" && (
        <StreamingMessage content={message.content} />
      )}

      {message.status === "completed" && (
        <CompletedMessage
          content={message.content}
          copied={copied}
          isStreaming={isStreaming}
          onCopy={handleCopy}
          onRegenerate={onRegenerate ? handleRegenerate : undefined}
        />
      )}

      {message.status === "interrupted" && (
        <InterruptedMessage
          content={message.content}
          isStreaming={isStreaming}
          onRegenerate={onRegenerate ? handleRegenerate : undefined}
        />
      )}

      {message.status === "failed" && (
        <FailedMessage
          content={message.content}
          isStreaming={isStreaming}
          onRetry={onRetry ? handleRetry : undefined}
        />
      )}
    </div>
  );
}

export const MessageItem = memo(MessageItemComponent);
