# Personal AI Chat

Next.js, React, TypeScript, Tailwind CSS로 구현한 개인용 스트리밍 AI 채팅 앱입니다.
OpenRouter API의 무료 모델 라우터로 LLM 응답을 스트리밍하고, 대화 기록은 Prisma와 SQLite로 저장합니다.

## Features

- OpenRouter Chat Completions API 기반 실시간 스트리밍 응답
- 서버 Route Handler에서만 API key 사용
- Prisma + SQLite 기반 대화 및 메시지 영속화
- 대화 생성, 선택, 삭제, 이어서 채팅
- 응답 중단, 실패 상태 표시, assistant 응답 재생성
- Markdown 및 코드 블록 렌더링
- 모바일 sidebar drawer와 데스크톱 sidebar 접기/펼치기
- 한국어 IME 입력 중 Enter 이중 전송 방지

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- TanStack Query
- Prisma 7 + SQLite
- OpenRouter API

## Getting Started

### 1. 환경변수 설정

`.env.example`을 복사해 `.env.local`을 만들고 본인 OpenRouter 계정의 `OPENROUTER_API_KEY`를 설정합니다.
기본 모델은 OpenRouter 무료 모델 라우터인 `openrouter/free`입니다.

```bash
cp .env.example .env.local
```

### 2. 의존성 설치

```bash
npm install
```

### 3. DB 설정

```bash
npm run db:generate
npm run db:push
```

Prisma Studio가 필요하면 다음 명령을 실행합니다.

```bash
npm run db:studio
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## Environment Variables

| Variable                       | Description                                               |
| ------------------------------ | --------------------------------------------------------- |
| `OPENROUTER_API_KEY`           | 본인 OpenRouter API key. 무료 모델도 key는 필요합니다.    |
| `OPENROUTER_BASE_URL`          | OpenRouter API base URL. 기본값은 OpenRouter 공식 API URL |
| `OPENROUTER_MODEL`             | 서버에서 사용할 모델. 기본값은 `openrouter/free`          |
| `NEXT_PUBLIC_OPENROUTER_MODEL` | sidebar에 표시할 모델명. 기본값은 `openrouter/free`       |
| `DATABASE_URL`                 | Prisma SQLite connection string. 기본값은 `file:./dev.db` |

## Project Structure

```txt
src/app/
  page.tsx                                      # 앱 레이아웃과 active conversation 상태 연결
  api/chat/route.ts                            # 메시지 저장, OpenRouter 호출, 스트리밍 응답
  api/conversations/*                          # 대화 목록/상세/삭제 및 메시지 재생성 API

src/components/
  chat/                                        # 채팅 화면, sidebar, 메시지 UI
  ui/                                          # 공통 버튼, 아이콘, spinner

src/hooks/
  useConversations.ts                          # TanStack Query 기반 대화 서버 상태
  useChat.ts                                   # 전송/중단/재생성/스트리밍 상태

src/lib/
  conversationApi.ts                           # 클라이언트 API 래퍼
  openrouterSse.ts                             # 공유 SSE 파서
  queryKeys.ts                                 # TanStack Query key 정의
  server/                                      # 서버 전용 OpenRouter, Prisma, stream 저장 로직

prisma/
  schema.prisma                                # Conversation / Message schema
```

## Design Notes

- `OPENROUTER_API_KEY`는 서버 Route Handler에서만 읽어 브라우저 번들에 포함되지 않습니다.
- `OPENROUTER_MODEL` 기본값은 `openrouter/free`라 특정 유료 모델을 전제로 하지 않습니다.
- 대화 목록과 상세 데이터는 TanStack Query cache로 관리하고, sidebar 상태 같은 UI 상태만 React local state에 둡니다.
- `GET /api/conversations/[conversationId]`는 conversation metadata와 messages를 함께 반환해 클라이언트 조립 로직을 줄입니다.
- OpenRouter의 SSE 응답은 chunk 경계가 이벤트 경계와 일치하지 않아도 처리되도록 buffer 기반으로 파싱합니다.
- 메시지는 먼저 짧은 Prisma transaction으로 저장하고, OpenRouter 스트리밍 호출은 transaction 밖에서 실행해 DB lock 시간을 줄입니다.
- 클라이언트는 optimistic message를 먼저 보여준 뒤 응답 header의 실제 DB id로 치환합니다.
- 스트리밍 중단 시 현재까지 받은 content를 `interrupted` 상태로 저장합니다.
