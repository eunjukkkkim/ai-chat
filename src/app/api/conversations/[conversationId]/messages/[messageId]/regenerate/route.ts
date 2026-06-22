import { prisma } from '@/lib/server/prisma';
import {
  OpenRouterApiError,
  getOpenRouterClientStatus,
  getOpenRouterUserMessage,
  streamChatCompletion,
  toOpenRouterErrorResponse,
} from '@/lib/server/openrouter';
import { streamAssistantResponse } from '@/lib/server/streamAssistantResponse';

type RouteParams = {
  params: Promise<{
    conversationId: string;
    messageId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { conversationId, messageId } = await params;

  const setup = await prisma.$transaction(async (tx) => {
    const targetMessage = await tx.message.findUnique({
      where: { id: messageId },
    });

    if (!targetMessage || targetMessage.conversationId !== conversationId) {
      return { error: 'Message not found' as const };
    }

    if (targetMessage.role !== 'assistant') {
      return { error: 'Only assistant messages can be regenerated' as const };
    }

    const previousUserMessage = await tx.message.findFirst({
      where: {
        conversationId,
        role: 'user',
        createdAt: { lt: targetMessage.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!previousUserMessage) {
      return { error: 'Previous user message not found' as const };
    }

    const contextMessages = await tx.message.findMany({
      where: {
        conversationId,
        createdAt: { lte: previousUserMessage.createdAt },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
        status: true,
      },
    });

    await tx.message.deleteMany({
      where: {
        conversationId,
        createdAt: { gte: targetMessage.createdAt },
      },
    });

    const assistantMessage = await tx.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: '',
        status: 'streaming',
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: assistantMessage.createdAt,
      },
    });

    return {
      assistantMessage,
      apiMessages: contextMessages
        .filter((message) => message.role === 'user' || message.status === 'completed')
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    };
  });

  if ('error' in setup) {
    return Response.json({ error: setup.error }, { status: 400 });
  }

  try {
    const apiKey = getOpenRouterApiKey();
    const upstream = await streamChatCompletion(setup.apiMessages, apiKey, request.signal);

    return streamAssistantResponse({
      upstream,
      signal: request.signal,
      assistantMessageId: setup.assistantMessage.id,
      headers: {
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
        assistantMessageId: setup.assistantMessage.id,
      },
      { status },
    );
  }
}

function getOpenRouterApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  return apiKey;
}
