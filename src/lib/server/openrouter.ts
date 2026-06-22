import { MODEL, OPENROUTER_API_URL } from '@/constants';

const SYSTEM_PROMPT = '너는 한국어로 답변하는 assistant야.';

export type OpenRouterErrorCode =
  | 'invalid_prompt'
  | 'rate_limit_exceeded'
  | 'image_content_policy_violation'
  | 'server_error'
  | string;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type OpenRouterMessage = ChatMessage | {
  role: 'system';
  content: string;
};

export interface OpenRouterErrorBody {
  error: {
    code?: OpenRouterErrorCode | number;
    message: string;
  };
  metadata?: unknown;
}

export class OpenRouterApiError extends Error {
  status: number;
  code: OpenRouterErrorCode;
  metadata?: unknown;

  constructor({
    status,
    code,
    message,
    metadata,
  }: {
    status: number;
    code: OpenRouterErrorCode;
    message: string;
    metadata?: unknown;
  }) {
    super(message);
    this.name = 'OpenRouterApiError';
    this.status = status;
    this.code = code;
    this.metadata = metadata;
  }
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  apiKey: string,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: withSystemPrompt(messages),
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    throw await parseOpenRouterErrorResponse(response);
  }

  return response;
}

function withSystemPrompt(messages: ChatMessage[]): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    ...messages,
  ];
}

export async function parseOpenRouterErrorResponse(response: Response) {
  const rawBody = await response.text();
  const body = parseErrorBody(rawBody);
  const code = normalizeErrorCode(body?.error.code, response.status);
  const message =
    typeof body?.error.message === 'string' && body.error.message.trim().length > 0
      ? body.error.message
      : `OpenRouter API error ${response.status}`;

  return new OpenRouterApiError({
    status: response.status,
    code,
    message,
    metadata: body?.metadata,
  });
}

export function getOpenRouterClientStatus(error: OpenRouterApiError) {
  if (error.code === 'invalid_prompt') return 400;
  if (error.code === 'image_content_policy_violation') return 400;
  if (error.code === 'rate_limit_exceeded') return 429;
  if (error.code === 'server_error') return error.status >= 500 ? error.status : 502;

  if (error.status >= 400 && error.status < 600) {
    return error.status;
  }

  return 502;
}

export function getOpenRouterUserMessage(error: OpenRouterApiError) {
  if (error.code === 'invalid_prompt') {
    return '요청 내용을 처리할 수 없습니다. 메시지를 짧게 줄이거나 내용을 수정해 주세요.';
  }

  if (error.code === 'rate_limit_exceeded') {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (error.code === 'image_content_policy_violation') {
    return '입력 또는 출력이 콘텐츠 정책에 의해 차단되었습니다.';
  }

  if (error.code === 'server_error') {
    return '모델 제공자 또는 OpenRouter 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (error.status === 401) {
    return 'OpenRouter API 키 인증에 실패했습니다. 서버 설정을 확인해 주세요.';
  }

  if (error.status === 402) {
    return 'OpenRouter 크레딧 또는 결제 상태를 확인해 주세요.';
  }

  if (error.status >= 500) {
    return '모델 응답을 생성하는 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  return '응답 생성에 실패했습니다. 요청 내용을 확인한 뒤 다시 시도해 주세요.';
}

export function toOpenRouterErrorResponse(error: OpenRouterApiError) {
  return {
    error: {
      code: error.code,
      message: getOpenRouterUserMessage(error),
    },
    metadata: error.metadata ?? null,
  };
}

function parseErrorBody(rawBody: string): OpenRouterErrorBody | undefined {
  try {
    const parsed = JSON.parse(rawBody);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      parsed.error &&
      typeof parsed.error === 'object'
    ) {
      return parsed as OpenRouterErrorBody;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function normalizeErrorCode(code: unknown, status: number): OpenRouterErrorCode {
  if (typeof code === 'string') return code;
  if (typeof code === 'number') return String(code);

  if (status === 400) return 'invalid_prompt';
  if (status === 429) return 'rate_limit_exceeded';
  if (status >= 500) return 'server_error';

  return String(status);
}
