"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createOpenRouterSseState,
  parseOpenRouterSseChunk,
} from "@/lib/server/openrouterSse";
import type { Conversation, Message, MessageStatus } from "@/types/chat";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseHeaderDate(value: string | null) {
  return value ? new Date(value).getTime() : Date.now();
}

function getFailureMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return "응답 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

interface UseChatOptions {
  conversation: Conversation;
  onConversationUpdate: (conversation: Conversation) => void;
}

export function useChat({
  conversation,
  onConversationUpdate,
}: UseChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationRef = useRef(conversation);
  const isStreamingRef = useRef(false);
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreamingRef.current) return;

      const conversation = conversationRef.current;
      const isFirstMessage = conversation.messages.length === 0;
      const title = isFirstMessage ? content.slice(0, 60) : conversation.title;

      const optimisticUserMessage: Message = {
        id: generateId(),
        role: "user",
        content,
        status: "completed",
        createdAt: Date.now(),
      };

      const optimisticAssistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        status: "pending",
        createdAt: Date.now(),
      };

      const optimisticConversation: Conversation = {
        ...conversation,
        title,
        messages: [
          ...conversation.messages,
          optimisticUserMessage,
          optimisticAssistantMessage,
        ],
        updatedAt: Date.now(),
      };

      onConversationUpdate(optimisticConversation);
      setIsStreaming(true);
      isStreamingRef.current = true;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      stopRequestedRef.current = false;
      let handledErrorResponse = false;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.id,
            content,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const failedPayload = await response.json().catch(() => null);
          const failureMessage = getFailureMessage(failedPayload);
          if (
            failedPayload &&
            typeof failedPayload.userMessageId === "string" &&
            typeof failedPayload.assistantMessageId === "string"
          ) {
            handledErrorResponse = true;
            onConversationUpdate({
              ...optimisticConversation,
              title,
              messages: optimisticConversation.messages.map((message) => {
                if (message.id === optimisticUserMessage.id) {
                  return { ...message, id: failedPayload.userMessageId };
                }

                if (message.id === optimisticAssistantMessage.id) {
                  return {
                    ...message,
                    id: failedPayload.assistantMessageId,
                    content: failureMessage,
                    status: "failed",
                  };
                }

                return message;
              }),
              updatedAt: Date.now(),
            });
          } else {
            handledErrorResponse = true;
            onConversationUpdate({
              ...optimisticConversation,
              messages: optimisticConversation.messages.map((message) =>
                message.id === optimisticAssistantMessage.id
                  ? { ...message, content: failureMessage, status: "failed" }
                  : message,
              ),
              updatedAt: Date.now(),
            });
          }

          throw new Error(`HTTP ${response.status}`);
        }

        const userMessage: Message = {
          id: response.headers.get("X-User-Message-Id") ?? generateId(),
          role: "user",
          content,
          status: "completed",
          createdAt: parseHeaderDate(
            response.headers.get("X-User-Message-Created-At"),
          ),
        };

        const assistantMessage: Message = {
          id: response.headers.get("X-Assistant-Message-Id") ?? generateId(),
          role: "assistant",
          content: "",
          status: "pending",
          createdAt: parseHeaderDate(
            response.headers.get("X-Assistant-Message-Created-At"),
          ),
        };

        const withUser: Conversation = {
          ...optimisticConversation,
          title: decodeURIComponent(
            response.headers.get("X-Conversation-Title") ?? title,
          ),
          messages: optimisticConversation.messages.map((message) => {
            if (message.id === optimisticUserMessage.id) return userMessage;
            if (message.id === optimisticAssistantMessage.id)
              return assistantMessage;
            return message;
          }),
          updatedAt: Date.now(),
        };

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        const sseState = createOpenRouterSseState();
        let accumulated = "";
        let currentConv = withUser;

        const setStatus = (status: MessageStatus, extra?: Partial<Message>) => {
          currentConv = {
            ...currentConv,
            messages: currentConv.messages.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: accumulated, status, ...extra }
                : m,
            ),
            updatedAt: Date.now(),
          };
        };

        setStatus("streaming");
        onConversationUpdate(currentConv);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const parsed = parseOpenRouterSseChunk(
              decoder.decode(value, { stream: true }),
              sseState,
            );

            if (parsed.error) {
              throw new Error(parsed.error.message);
            }

            if (parsed.content) {
              accumulated += parsed.content;
              setStatus("streaming");
              onConversationUpdate(currentConv);
            }

            if (parsed.done) break;
          }

          setStatus(
            controller.signal.aborted || stopRequestedRef.current
              ? "interrupted"
              : "completed",
          );
          onConversationUpdate(currentConv);
        } catch (streamErr) {
          const isAbort =
            (streamErr instanceof DOMException &&
              streamErr.name === "AbortError") ||
            controller.signal.aborted ||
            stopRequestedRef.current;
          // Save whatever was accumulated before the abort/error
          setStatus(isAbort ? "interrupted" : "failed");
          onConversationUpdate(currentConv);
        }
      } catch (err) {
        // Fetch itself failed before a streaming body was available.
        void err;
        if (!handledErrorResponse) {
          const status: MessageStatus =
            controller.signal.aborted || stopRequestedRef.current
              ? "interrupted"
              : "failed";

          onConversationUpdate({
            ...optimisticConversation,
            messages: optimisticConversation.messages.map((message) =>
              message.id === optimisticAssistantMessage.id
                ? { ...message, status }
                : message,
            ),
            updatedAt: Date.now(),
          });
        }
      } finally {
        setIsStreaming(false);
        isStreamingRef.current = false;
        abortControllerRef.current = null;
        stopRequestedRef.current = false;
      }
    },
    [onConversationUpdate],
  );

  const stopStreaming = useCallback(() => {
    stopRequestedRef.current = true;
    abortControllerRef.current?.abort();
  }, []);

  const regenerate = useCallback(
    async (messageId: string) => {
      if (isStreamingRef.current) return;

      const conversation = conversationRef.current;
      const messages = conversation.messages;
      const index = messages.findIndex((m) => m.id === messageId);
      if (index < 0) return;

      // Find the user message just before this assistant message
      let userIndex = index - 1;
      while (userIndex >= 0 && messages[userIndex].role !== "user") {
        userIndex--;
      }
      if (userIndex < 0) return;

      const trimmedMessages = messages.slice(0, index);

      const trimmedConv: Conversation = {
        ...conversation,
        messages: trimmedMessages,
        updatedAt: Date.now(),
      };

      const optimisticAssistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        status: "streaming",
        createdAt: Date.now(),
      };

      const withAssistant: Conversation = {
        ...trimmedConv,
        messages: [...trimmedConv.messages, optimisticAssistantMessage],
        updatedAt: Date.now(),
      };

      onConversationUpdate(withAssistant);
      setIsStreaming(true);
      isStreamingRef.current = true;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      stopRequestedRef.current = false;
      let handledErrorResponse = false;

      try {
        const response = await fetch(
          `/api/conversations/${conversation.id}/messages/${messageId}/regenerate`,
          {
            method: "POST",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const failedPayload = await response.json().catch(() => null);
          const failureMessage = getFailureMessage(failedPayload);
          if (
            failedPayload &&
            typeof failedPayload.assistantMessageId === "string"
          ) {
            handledErrorResponse = true;
            onConversationUpdate({
              ...withAssistant,
              messages: withAssistant.messages.map((message) =>
                message.id === optimisticAssistantMessage.id
                  ? {
                      ...message,
                      id: failedPayload.assistantMessageId,
                      content: failureMessage,
                      status: "failed",
                    }
                  : message,
              ),
              updatedAt: Date.now(),
            });
          }

          throw new Error(`HTTP ${response.status}`);
        }

        const assistantMessage: Message = {
          id:
            response.headers.get("X-Assistant-Message-Id") ??
            optimisticAssistantMessage.id,
          role: "assistant",
          content: "",
          status: "streaming",
          createdAt: parseHeaderDate(
            response.headers.get("X-Assistant-Message-Created-At"),
          ),
        };

        const serverConv: Conversation = {
          ...withAssistant,
          messages: withAssistant.messages.map((message) =>
            message.id === optimisticAssistantMessage.id
              ? assistantMessage
              : message,
          ),
          updatedAt: Date.now(),
        };

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        const sseState = createOpenRouterSseState();
        let accumulated = "";
        let currentConv = serverConv;

        const setStatus = (status: MessageStatus) => {
          currentConv = {
            ...currentConv,
            messages: currentConv.messages.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: accumulated, status }
                : m,
            ),
            updatedAt: Date.now(),
          };
        };

        setStatus("streaming");
        onConversationUpdate(currentConv);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const parsed = parseOpenRouterSseChunk(
              decoder.decode(value, { stream: true }),
              sseState,
            );

            if (parsed.error) {
              throw new Error(parsed.error.message);
            }

            if (parsed.content) {
              accumulated += parsed.content;
              setStatus("streaming");
              onConversationUpdate(currentConv);
            }

            if (parsed.done) break;
          }

          setStatus(
            controller.signal.aborted || stopRequestedRef.current
              ? "interrupted"
              : "completed",
          );
          onConversationUpdate(currentConv);
        } catch (streamErr) {
          const isAbort =
            (streamErr instanceof DOMException &&
              streamErr.name === "AbortError") ||
            controller.signal.aborted ||
            stopRequestedRef.current;
          setStatus(isAbort ? "interrupted" : "failed");
          onConversationUpdate(currentConv);
        }
      } catch (err) {
        void err;

        if (!handledErrorResponse) {
          const status: MessageStatus =
            controller.signal.aborted || stopRequestedRef.current
              ? "interrupted"
              : "failed";

          onConversationUpdate({
            ...withAssistant,
            messages: withAssistant.messages.map((message) =>
              message.id === optimisticAssistantMessage.id
                ? { ...message, status }
                : message,
            ),
            updatedAt: Date.now(),
          });
        }
      } finally {
        setIsStreaming(false);
        isStreamingRef.current = false;
        abortControllerRef.current = null;
        stopRequestedRef.current = false;
      }
    },
    [onConversationUpdate],
  );

  const retry = useCallback(
    async (messageId: string) => {
      await regenerate(messageId);
    },
    [regenerate],
  );

  return { isStreaming, sendMessage, stopStreaming, regenerate, retry };
}
