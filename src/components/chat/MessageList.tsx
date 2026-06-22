"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { EmptyChatPrompt } from "./EmptyChatPrompt";

interface Props {
  messages: Message[];
  isStreaming: boolean;
  onRegenerate?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
}

export function MessageList({
  messages,
  isStreaming,
  onRegenerate,
  onRetry,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <EmptyChatPrompt />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto px-6 py-[30px] flex flex-col gap-[26px]">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isStreaming={isStreaming}
            onRegenerate={
              message.role === "assistant" ? onRegenerate : undefined
            }
            onRetry={message.role === "assistant" ? onRetry : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
