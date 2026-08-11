import {
  createOpenRouterSseState,
  parseOpenRouterSseChunk,
} from '@/lib/openrouterSse';
import { prisma } from '@/lib/server/prisma';

type AssistantFinalStatus = 'completed' | 'failed' | 'interrupted';
type AssistantStatus = 'streaming' | AssistantFinalStatus;

export function streamAssistantResponse({
  upstream,
  signal,
  assistantMessageId,
  headers,
}: {
  upstream: Response;
  signal: AbortSignal;
  assistantMessageId: string;
  headers?: Record<string, string>;
}) {
  const upstreamBody = upstream.body;
  if (!upstreamBody) {
    throw new Error('OpenRouter response body is empty');
  }

  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  const sseState = createOpenRouterSseState();
  let accumulated = '';
  let savedFinalState = false;

  const saveAssistant = async (status: AssistantStatus) => {
    savedFinalState = status !== 'streaming';

    await prisma.message.update({
      where: { id: assistantMessageId },
      data: {
        content: accumulated,
        status,
      },
    });
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await saveAssistant('streaming');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const parsed = parseOpenRouterSseChunk(
            decoder.decode(value, { stream: true }),
            sseState,
          );
          accumulated += parsed.content;
          controller.enqueue(value);

          if (parsed.error) {
            await saveAssistant('failed');
            controller.close();
            return;
          }

          if (parsed.done) {
            await saveAssistant(signal.aborted ? 'interrupted' : 'completed');
            controller.close();
            return;
          }
        }

        await saveAssistant(signal.aborted ? 'interrupted' : 'completed');
        controller.close();
      } catch (error) {
        await saveAssistant(signal.aborted ? 'interrupted' : 'failed');

        if (signal.aborted) {
          controller.close();
          return;
        }

        controller.error(error);
      }
    },

    async cancel() {
      try {
        await reader.cancel();
      } finally {
        if (!savedFinalState) {
          await saveAssistant('interrupted');
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...streamHeaders(),
      ...headers,
    },
  });
}

function streamHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };
}
