export interface OpenRouterSseState {
  buffer: string;
}

export interface OpenRouterSseParseResult {
  content: string;
  done: boolean;
  error?: {
    code?: string;
    message: string;
  };
}

export function createOpenRouterSseState(): OpenRouterSseState {
  return { buffer: '' };
}

export function parseOpenRouterSseChunk(
  chunk: string,
  state: OpenRouterSseState,
): OpenRouterSseParseResult {
  state.buffer += chunk;

  const events = state.buffer.split(/\r?\n\r?\n/);
  state.buffer = events.pop() ?? '';

  let content = '';
  let done = false;
  let error: OpenRouterSseParseResult['error'];

  for (const event of events) {
    const data = event
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n')
      .trim();
    if (!data) continue;

    if (data === '[DONE]') {
      done = true;
      continue;
    }

    try {
      const parsed = JSON.parse(data);
      const streamError = getOpenRouterErrorMessage(parsed);
      if (streamError) {
        error = streamError;
        continue;
      }

      const delta = parsed?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') {
        content += delta;
      }
    } catch {
      // Ignore malformed SSE payloads and wait for the next complete event.
    }
  }

  return { content, done, error };
}

function getOpenRouterErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;

  const record = payload as {
    error?: { code?: unknown; message?: unknown };
    choices?: Array<{ finish_reason?: unknown }>;
  };

  if (record.error) {
    return {
      code: typeof record.error.code === 'string' ? record.error.code : undefined,
      message:
        typeof record.error.message === 'string'
          ? record.error.message
          : 'OpenRouter stream error',
    };
  }

  if (record.choices?.[0]?.finish_reason === 'error') {
    return {
      code: 'server_error',
      message: 'OpenRouter stream terminated with an error',
    };
  }

  return undefined;
}
