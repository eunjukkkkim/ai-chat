"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SendIcon, StopIcon } from "@/components/ui/icons";

interface Props {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function MessageInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposing = useRef(false);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing.current) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    },
    [],
  );

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;
  const actionButtonClass =
    "shrink-0 w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors";

  return (
    <div className="shrink-0 border-t border-line bg-bg">
      <div className="mx-auto p-4">
        <div
          className="flex items-center gap-[9px] bg-input rounded-[14px] px-4 py-2 w-full"
          style={{ border: "1px solid #262b34" }}
        >
          <label htmlFor="chat-message-input" className="sr-only">
            메시지 입력
          </label>
          <textarea
            id="chat-message-input"
            name="message"
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposing.current = true;
            }}
            onCompositionEnd={() => {
              isComposing.current = false;
            }}
            placeholder="메시지를 입력하세요"
            disabled={disabled}
            rows={1}
            className="flex-1 min-h-8 py-1 resize-none bg-transparent text-ink text-[15px] leading-[1.6] placeholder:text-muted focus:outline-none overflow-hidden"
          />

          {isStreaming ? (
            <button
              onClick={onStop}
              title="응답 중단"
              aria-label="응답 중단"
              className={cn(
                actionButtonClass,
                "bg-danger hover:opacity-80 transition-opacity text-white",
              )}
            >
              <StopIcon />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              title="전송"
              aria-label="메시지 전송"
              className={cn(
                actionButtonClass,
                canSend ? "bg-accent text-accent-fg" : "bg-line text-muted",
                "disabled:cursor-not-allowed",
              )}
            >
              <SendIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
