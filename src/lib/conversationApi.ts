import type { Conversation, Message } from '@/types/chat';

type ApiConversation = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
  messages?: ApiMessage[];
};

type ApiMessage = {
  id: string;
  conversationId: string;
  role: Message['role'];
  content: string;
  status: Message['status'];
  createdAt: string;
  updatedAt: string;
};

function toTimestamp(value: string) {
  return new Date(value).getTime();
}

function toMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    status: message.status,
    createdAt: toTimestamp(message.createdAt),
  };
}

function toConversation(conversation: ApiConversation): Conversation {
  return {
    id: conversation.id,
    title: conversation.title ?? '새 채팅',
    messages: (conversation.messages ?? []).map(toMessage),
    createdAt: toTimestamp(conversation.createdAt),
    updatedAt: toTimestamp(conversation.updatedAt),
  };
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const conversationApi = {
  async listConversations() {
    const { conversations } = await requestJson<{ conversations: ApiConversation[] }>(
      '/api/conversations',
    );

    return conversations.map(toConversation);
  },

  async getConversation(id: string) {
    const [conversationsResult, messagesResult] = await Promise.all([
      requestJson<{ conversations: ApiConversation[] }>('/api/conversations'),
      requestJson<{ messages: ApiMessage[] }>(`/api/conversations/${id}/messages`),
    ]);

    const conversation = conversationsResult.conversations.find((item) => item.id === id);
    if (!conversation) return null;

    return toConversation({
      ...conversation,
      messages: messagesResult.messages,
    });
  },

  async createConversation() {
    const { conversation } = await requestJson<{ conversation: ApiConversation }>(
      '/api/conversations',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '새 채팅' }),
      },
    );

    return toConversation(conversation);
  },

  async deleteConversation(id: string) {
    const response = await fetch(`/api/conversations/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Request failed: ${response.status}`);
    }
  },
};
