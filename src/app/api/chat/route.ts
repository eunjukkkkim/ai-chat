import { prisma } from '@/lib/server/prisma';
import {
  OpenRouterApiError,
  getOpenRouterClientStatus,
  getOpenRouterApiKey,
  getOpenRouterUserMessage,
  streamChatCompletion,
  toOpenRouterErrorResponse,
} from '@/lib/server/openrouter';
import { streamAssistantResponse } from '@/lib/server/streamAssistantResponse';

type ChatRequestBody = {
  conversationId: string;
  content: string;
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          code: 'invalid_request',
          message: 'Invalid request body',
        },
        metadata: null,
      },
      { status: 400 },
    );
  }

  const parsedBody = parseChatRequestBody(body);
  if (!parsedBody.ok) {
    return Response.json(
      {
        error: {
          code: 'invalid_request',
          message: parsedBody.message,
        },
        metadata: null,
      },
      { status: 400 },
    );
  }

  return handleChat(parsedBody.body, request.signal);
}

async function handleChat(body: ChatRequestBody, signal: AbortSignal) {
  const now = new Date();

  const setup = await prisma.$transaction(async (tx) => {
    const existingMessages = await tx.message.findMany({
      where: { conversationId: body.conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
        status: true,
      },
    });

    const conversation = await tx.conversation.update({
      where: { id: body.conversationId },
      data: {
        title: existingMessages.length === 0 ? body.content.slice(0, 60) : undefined,
        lastMessageAt: now,
      },
    });

    const userMessage = await tx.message.create({
      data: {
        conversationId: body.conversationId,
        role: 'user',
        content: body.content,
        status: 'completed',
        createdAt: now,
      },
    });

    const assistantMessage = await tx.message.create({
      data: {
        conversationId: body.conversationId,
        role: 'assistant',
        content: '',
        status: 'pending',
      },
    });

    return {
      conversation,
      userMessage,
      assistantMessage,
      apiMessages: [
        ...existingMessages
          .filter((message) => message.role === 'user' || message.status === 'completed')
          .map((message) => ({
            role: message.role,
            content: message.content,
          })),
        { role: 'user' as const, content: body.content },
      ],
    };
  });

  try {
    const apiKey = getOpenRouterApiKey();
    const upstream = await streamChatCompletion(setup.apiMessages, apiKey, signal);

    return streamAssistantResponse({
      upstream,
      signal,
      assistantMessageId: setup.assistantMessage.id,
      headers: {
        'X-Conversation-Id': setup.conversation.id,
        'X-Conversation-Title': encodeURIComponent(setup.conversation.title ?? '새 채팅'),
        'X-User-Message-Id': setup.userMessage.id,
        'X-User-Message-Created-At': setup.userMessage.createdAt.toISOString(),
        'X-Assistant-Message-Id': setup.assistantMessage.id,
        'X-Assistant-Message-Created-At': setup.assistantMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const failedContent =
      error instanceof OpenRouterApiError ? getOpenRouterUserMessage(error) : '';

    await prisma.message.update({
      where: { id: setup.assistantMessage.id },
      data: {
        content: failedContent,
        status: 'failed',
      },
    });

    const responseBody =
      error instanceof OpenRouterApiError
        ? toOpenRouterErrorResponse(error)
        : {
            error: {
              code: 'server_error',
              message: '응답 생성 중 서버 오류가 발생했습니다.',
            },
            metadata: null,
          };
    const status =
      error instanceof OpenRouterApiError ? getOpenRouterClientStatus(error) : 500;

    return Response.json(
      {
        ...responseBody,
        conversationId: setup.conversation.id,
        userMessageId: setup.userMessage.id,
        assistantMessageId: setup.assistantMessage.id,
      },
      { status },
    );
  }
}

function parseChatRequestBody(body: unknown):
  | { ok: true; body: ChatRequestBody }
  | { ok: false; message: string } {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('conversationId' in body) ||
    typeof body.conversationId !== 'string' ||
    !('content' in body) ||
    typeof body.content !== 'string'
  ) {
    return { ok: false, message: 'Invalid request body' };
  }

  const content = body.content.trim();
  if (!content) {
    return { ok: false, message: '메시지를 입력해 주세요.' };
  }

  return {
    ok: true,
    body: {
      conversationId: body.conversationId,
      content,
    },
  };
}
