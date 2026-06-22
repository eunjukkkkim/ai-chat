# AI Chat - DeepAuto Frontend Assignment

Next.js 16, React 19, TypeScript, Tailwind CSS로 구현한 streaming chatbot 과제입니다.
LLM 응답은 OpenRouter API를 통해 받고, 채팅 기록은 Prisma + SQLite로 저장합니다.

## 실행 방법

### 1. 환경변수 설정

.env.example에 `OPENROUTER_API_KEY`를 설정합니다. (임시로 your-api-key-here 이라고 작성해두었습니다.)
key 설정 후 example에 있는 env를 복사하여 .env.local을 설정해줍니다.

```bash
cp .env.example .env
cp .env.example .env.local

```

### 2. 의존성 설치

```bash
npm install
```

### 3. DB 설정

Prisma Client 생성과 로컬 SQLite DB 생성/갱신을 진행합니다.

```bash
npm run db:generate
npm run db:push
```

Prisma Studio 실행:

```bash
npm run db:studio
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 됩니다.

## Database

이 프로젝트는 채팅 기록 저장을 위해 Prisma + SQLite를 사용합니다.
현재 UI는 server API와 연결되어 있으므로 conversation, message, message status는 개발 환경의 로컬 SQLite `dev.db` 파일에 저장됩니다.

### Schema

- `Conversation`: 채팅 세션 metadata. `title`, timestamp, `lastMessageAt`, `messages` relation을 가집니다.
- `Message`: conversation에 연결된 개별 메시지. `role`, `content`, `status`, timestamp를 가집니다.
- `MessageRole`: `user`, `assistant`
- `MessageStatus`: `pending`, `streaming`, `completed`, `failed`, `interrupted`

## API Routes

| Method   | Route                                              | Description                                                                          |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `GET`    | `/api/conversations`                               | `updatedAt desc` 기준 conversation 목록 반환                                         |
| `POST`   | `/api/conversations`                               | 새 conversation 생성                                                                 |
| `GET`    | `/api/conversations/[id]/messages`                 | `createdAt asc` 기준 message 목록 반환                                               |
| `DELETE` | `/api/conversations/[id]`                          | conversation 삭제, 관련 message cascade 삭제                                         |
| `POST`   | `/api/chat`                                        | user message 저장, assistant placeholder 생성, OpenRouter 호출, streaming chunk 전달 |
| `POST`   | `/api/conversations/[id]/messages/[id]/regenerate` | 대상 assistant message와 이후 message 삭제 후 새 assistant 응답 재생성               |

## Architecture Overview

```txt
Client (browser)
  └─ page.tsx                        # 전체 레이아웃, sidebar/chat 상태 관리
       ├─ useConversations            # 대화 목록·선택·생성·삭제 상태
       │    └─ conversationApi        # 서버 API fetch 클라이언트
       ├─ ChatSidebar                 # 대화 목록 + 모델명 표시
       │    ├─ NewChatButton          # 새 채팅 버튼
       │    └─ ChatSidebarItem        # 대화 row (제목, 미리보기, 삭제 버튼)
       ├─ DraftChatWindow             # 대화가 없을 때 빈 입력 화면
       │    ├─ ChatHeader             # 사이드바 토글 + 제목 (ChatWindow와 공유)
       │    ├─ MessageList
       │    │    └─ EmptyChatPrompt   # 빈 화면 안내 문구
       │    └─ MessageInput           # textarea + 전송 버튼
       └─ ChatWindow                  # 활성 대화 화면
            ├─ ChatHeader
            ├─ useChat                # 전송·스트리밍·중단·재생성 로직
            ├─ MessageList
            │    └─ MessageItem       # 상태별 메시지 렌더링 (memo)
            │         └─ message/
            │              ├─ AssistantMessage  # Pending·Streaming·Completed·Interrupted·Failed 컴포넌트
            │              └─ MessageActions    # 복사·다시 생성 버튼
            └─ MessageInput

Server (Next.js Route Handler)
  ├─ /api/chat                        # 메시지 전송 + 스트리밍
  └─ /api/conversations/*             # 대화·메시지 CRUD, regenerate API

lib/server/                           # 서버 전용 모듈 (클라이언트 번들 미포함)
  ├─ openrouter.ts                    # OpenRouter fetch 래퍼 (model 고정)
  ├─ openrouterSse.ts                 # buffer 기반 SSE 파서
  ├─ prisma.ts                        # Prisma Client singleton (SQLite adapter)
  └─ streamAssistantResponse.ts       # SSE chunk 클라이언트 전달 + DB 저장

lib/                                  # 클라이언트 / 공유 모듈
  ├─ conversationApi.ts               # 서버 API fetch 클라이언트
  └─ cn.ts                            # className 유틸 (clsx + tailwind-merge)

Database
  └─ dev.db                           # SQLite 파일 (Prisma / Prisma Studio 공용)
```

## 주요 설계 결정

- **API key security**: `OPENROUTER_API_KEY`는 server Route Handler에서만 읽습니다. 브라우저에 노출하지 않습니다.
- **Model**: OpenRouter 요청 model은 항상 `openai/gpt-4o-mini`를 사용합니다.
- **DB 저장과 OpenRouter 호출 분리**: 메시지 저장은 짧은 Prisma transaction으로 먼저 끝내고, OpenRouter 스트리밍 호출은 그 이후에 수행합니다. 스트리밍이 진행되는 수 초 동안 DB 락이 걸리지 않습니다.
- **SSE parsing**: OpenRouter의 `data: ...\n\n` SSE event를 buffer 기반으로 파싱합니다. chunk 경계가 JSON 또는 event 경계와 일치한다고 가정하지 않습니다.
- **Abort / stop**: `AbortController`로 streaming 요청을 중단합니다. Stop button 또는 `Esc` 입력 시 현재까지 받은 content를 `interrupted` 상태로 저장합니다.
- **Conversation API client**: 클라이언트에서 실행되는 conversation 목록/선택/생성/삭제 요청은 `src/lib/conversationApi.ts`에서 server API 호출로 관리합니다.
- **Empty draft flow**: active conversation이 없는 초기 화면에서도 입력창을 제공하고, 첫 메시지를 보내면 conversation 생성 후 같은 메시지를 즉시 전송합니다.
- **Regenerate**: 대상 assistant message와 그 이후 message를 삭제한 뒤, 직전 user message까지의 context로 assistant 응답을 다시 생성합니다.
- **Design tokens**: Tailwind v4 `@theme {}` 블록으로 디자인 토큰을 정의합니다 (`bg-bg`, `text-accent`, `bg-danger` 등). `tailwind.config.ts` 없이 `globals.css` 단일 파일로 관리합니다.
- **State management**: `useConversations`가 대화 목록·선택·생성·삭제 전체 상태를 소유합니다. `useChat`은 상태를 직접 소유하지 않고 active conversation과 `onConversationUpdate` 콜백만 받습니다. 컴포넌트는 두 훅에만 의존하고 상태를 직접 관리하지 않습니다.
- **lib/server 분리**: 서버 전용 모듈(`prisma`, `openrouter`, SSE 파서 등)은 `lib/server/`에 격리합니다. 클라이언트 컴포넌트나 훅에서 직접 import할 수 없어 API key 등 서버 전용 코드가 클라이언트 번들에 포함되지 않습니다.
- **Icon management**: 일반 UI icon은 `lucide-react`를 사용하되, 앱 내부에서는 `src/components/ui/icons.tsx` adapter를 통해 import합니다.

## 구현된 기능

### 챗봇

- [x] OpenRouter API를 통한 스트리밍 응답 (model: `openai/gpt-4o-mini` 고정)
- [x] Chat Completion API 서버 사이드 호출 — API key 클라이언트 노출 없음
- [x] 스트리밍 응답 실시간 화면 업데이트
- [x] "새 채팅" 버튼으로 새 대화 시작
- [x] 메시지 전송 시 conversation context 유지 (이전 메시지 포함해서 전송)

### 채팅 기록

- [x] 채팅 기록 저장 및 불러오기 (새로고침 후에도 유지)
- [x] 빈 화면에서 메시지 전송 시 채팅 목록에 추가
- [x] 채팅 목록에서 이전 대화 선택 후 이어서 채팅
- [x] 메시지를 주고받을 때마다 해당 채팅방 기록 업데이트
- [x] RDBMS(SQLite) + Prisma로 서버 API 구현 _(가산점)_

### 상태 및 인터랙션

- [x] 메시지 상태: `pending` → `streaming` → `completed` / `failed` / `interrupted`
- [x] "응답 중단" 버튼으로 스트리밍 중단, 중단 시점까지 받은 내용 저장
- [x] assistant 답변 "다시 생성" — 해당 메시지와 이후 메시지 제거 후 새 답변 생성
- [x] 오류 발생 시 인라인 에러 상태 표시 및 재시도

### 기타 구현

- [x] 서버에서 한국어 응답 유도 system prompt 적용
- [x] buffer 기반 SSE 파서 — chunk 경계와 무관하게 안정적으로 파싱
- [x] 빈 대화가 이미 있으면 새로 만들지 않고 재사용
- [x] 초기 빈 화면에서 메시지 입력 시 대화 생성과 동시에 전송
- [x] sidebar에서 대화 삭제
- [x] 첫 토큰 대기 중 dot pulse 로딩 인디케이터 / 스트리밍 중 blinking cursor
- [x] `Esc` 키로 스트리밍 중단
- [x] assistant 메시지 복사 버튼
- [x] `Enter` 전송 / `Shift+Enter` 줄바꿈 / 한국어 IME 이중 전송 방지
- [x] sidebar 접기/펼치기 애니메이션, 채팅방 전환 fade-in
- [x] 모바일 반응형 (sidebar drawer, 햄버거 버튼, 반투명 backdrop)
- [x] assistant 답변 markdown / 코드 블록 렌더링 (react-markdown + rehype-highlight)

## Environment Variables

| Variable             | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `OPENROUTER_API_KEY` | OpenRouter API key. 필수                                  |
| `DATABASE_URL`       | Prisma SQLite connection string. 기본값은 `file:./dev.db` |
