# ChatGPT API 연결 상세 가이드

현재 애플리케이션은 Manus의 기본 LLM API를 사용하고 있습니다. 이를 OpenAI의 ChatGPT API로 변경하는 방법을 **경로, 파일명, 줄 번호**를 포함하여 상세하게 설명합니다.

---

## 📋 목차
1. [Step 1: OpenAI API 키 발급](#step-1-openai-api-키-발급)
2. [Step 2: 환경 변수 설정](#step-2-환경-변수-설정)
3. [Step 3: 코드 수정](#step-3-코드-수정)
4. [Step 4: 테스트](#step-4-테스트)

---

## Step 1: OpenAI API 키 발급

### 1.1 OpenAI 계정 생성 및 API 키 발급

1. [OpenAI 웹사이트](https://platform.openai.com)에 접속합니다.
2. 우측 상단 **Sign up** 버튼을 클릭하여 계정을 생성합니다.
   - 이메일 주소로 가입
   - 이메일 인증 완료
3. 로그인 후, 좌측 메뉴에서 **API keys** 또는 **View API keys**를 클릭합니다.
4. **Create new secret key** 버튼을 클릭합니다.
5. 생성된 API 키를 **복사**하여 안전한 곳에 저장합니다.
   - ⚠️ **주의**: 이 키는 한 번만 표시되므로 반드시 복사해서 저장하세요!

### 1.2 API 키 형식
```
sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 2: 환경 변수 설정

### 방법 A: Manus 관리 UI 사용 (권장 - 프로덕션)

**Manus 관리 UI에서 설정:**

1. Manus 관리 패널 우측 상단 **Settings** 아이콘 클릭
2. **Secrets** 탭 선택
3. **Add New Secret** 버튼 클릭
4. 다음 정보 입력:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: 발급받은 API 키 (sk-로 시작하는 전체 문자열)
5. **Save** 클릭

**결과:**
- 환경 변수 `OPENAI_API_KEY`가 서버에 자동으로 주입됨
- 코드에서 `process.env.OPENAI_API_KEY`로 접근 가능

---

### 방법 B: 로컬 개발 환경 (.env 파일)

**파일 경로**: `/home/ubuntu/chatgpt-style-webapp/.env.local`

**파일이 없으면 생성:**

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 다음 내용을 추가합니다:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
```

**예시:**
```env
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl
OPENAI_MODEL=gpt-4o-mini
```

---

## Step 3: 코드 수정

### 3.1 현재 코드 위치 확인

**파일 경로**: `/home/ubuntu/chatgpt-style-webapp/server/routers.ts`

**현재 코드 (88-98번 줄):**
```typescript
// Generate AI response using LLM
const response = await invokeLLM({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: input.content },
  ],
});

const rawContent = response.choices[0]?.message?.content;
const assistantContent = typeof rawContent === "string" 
  ? rawContent 
  : "Sorry, I couldn't generate a response.";
```

---

### 3.2 ChatGPT API로 변경하기

**파일 경로**: `/home/ubuntu/chatgpt-style-webapp/server/routers.ts`

#### 옵션 A: 기본 fetch API 사용 (추천)

**Step A1: Import 문 수정**

**파일**: `server/routers.ts`
**줄 번호**: 1-15번 (import 섹션)

**현재 코드 (4번 줄):**
```typescript
import { invokeLLM } from "./_core/llm";
```

**변경 후 (4번 줄 제거, 필요 없음):**
```typescript
// import { invokeLLM } from "./_core/llm"; // 이 줄을 삭제하거나 주석 처리
```

---

**Step A2: messages.send 프로시저 수정**

**파일**: `server/routers.ts`
**줄 번호**: 68-124번 (send 프로시저 전체)

**현재 코드를 다음과 같이 변경:**

```typescript
send: protectedProcedure
  .input(z.object({
    conversationId: z.number(),
    content: z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify conversation belongs to user
    const conversation = await getConversationById(input.conversationId, ctx.user.id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    // Save user message
    const userMessageId = await createMessage({
      conversationId: input.conversationId,
      role: "user",
      content: input.content,
    });
    
    // Generate AI response using ChatGPT API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: input.content },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const assistantContent = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    // Save assistant message
    const assistantMessageId = await createMessage({
      conversationId: input.conversationId,
      role: "assistant",
      content: assistantContent,
    });
    
    // Update conversation timestamp
    await updateConversationTimestamp(input.conversationId);
    
    return {
      userMessage: {
        id: userMessageId,
        role: "user" as const,
        content: input.content,
        createdAt: new Date(),
      },
      assistantMessage: {
        id: assistantMessageId,
        role: "assistant" as const,
        content: assistantContent,
        createdAt: new Date(),
      },
    };
  }),
```

---

#### 옵션 B: OpenAI 공식 SDK 사용 (더 안전함)

**Step B1: 패키지 설치**

```bash
cd /home/ubuntu/chatgpt-style-webapp
pnpm add openai
```

---

**Step B2: Import 문 추가**

**파일**: `server/routers.ts`
**줄 번호**: 1-15번 (import 섹션)

**추가할 코드 (4번 줄 다음에 추가):**
```typescript
import OpenAI from "openai";
```

**전체 import 섹션:**
```typescript
import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import OpenAI from "openai";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createConversation,
  createMessage,
  deleteConversation,
  getConversationById,
  getConversationsByUserId,
  getMessagesByConversationId,
  updateConversationTimestamp,
} from "./db";
```

---

**Step B3: messages.send 프로시저 수정**

**파일**: `server/routers.ts`
**줄 번호**: 68-124번

```typescript
send: protectedProcedure
  .input(z.object({
    conversationId: z.number(),
    content: z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify conversation belongs to user
    const conversation = await getConversationById(input.conversationId, ctx.user.id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    // Save user message
    const userMessageId = await createMessage({
      conversationId: input.conversationId,
      role: "user",
      content: input.content,
    });
    
    // Generate AI response using ChatGPT API
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: input.content },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const assistantContent = response.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    // Save assistant message
    const assistantMessageId = await createMessage({
      conversationId: input.conversationId,
      role: "assistant",
      content: assistantContent,
    });
    
    // Update conversation timestamp
    await updateConversationTimestamp(input.conversationId);
    
    return {
      userMessage: {
        id: userMessageId,
        role: "user" as const,
        content: input.content,
        createdAt: new Date(),
      },
      assistantMessage: {
        id: assistantMessageId,
        role: "assistant" as const,
        content: assistantContent,
        createdAt: new Date(),
      },
    };
  }),
```

---

## Step 4: 테스트

### 4.1 서버 재시작

```bash
cd /home/ubuntu/chatgpt-style-webapp
pnpm dev
```

### 4.2 애플리케이션 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. 로그인
3. 새 대화 시작
4. 메시지 입력 및 전송
5. ChatGPT 응답 확인

### 4.3 문제 해결

**문제**: `OPENAI_API_KEY is not set`
- **해결**: 환경 변수가 제대로 설정되었는지 확인
- Manus UI에서 Secrets 확인
- 또는 `.env.local` 파일 확인

**문제**: `401 Unauthorized`
- **해결**: API 키가 올바른지 확인
- OpenAI 대시보드에서 API 키 상태 확인
- 새로운 API 키 생성 시도

**문제**: `429 Too Many Requests`
- **해결**: API 요청 제한 도달
- OpenAI 계정 업그레이드 필요
- 또는 요청 간격 조정

---

## 📊 모델 선택 가이드

| 모델 | 성능 | 비용 | 속도 | 추천 용도 |
|------|------|------|------|---------|
| `gpt-4o` | ⭐⭐⭐⭐⭐ | 높음 | 중간 | 복잡한 작업 |
| `gpt-4o-mini` | ⭐⭐⭐⭐ | 중간 | 빠름 | **일반 채팅** |
| `gpt-3.5-turbo` | ⭐⭐⭐ | 낮음 | 매우 빠름 | 간단한 작업 |

**권장**: `gpt-4o-mini` (성능과 비용의 최적 균형)

---

## 💰 비용 관리

### 월별 사용량 확인
1. [OpenAI 대시보드](https://platform.openai.com/account/billing/overview) 접속
2. **Usage** 탭에서 월별 비용 확인

### 비용 절감 팁
1. 더 저렴한 모델 사용 (`gpt-3.5-turbo`)
2. `max_tokens` 값 줄이기
3. 불필요한 API 호출 제거

### 비용 제한 설정
1. OpenAI 대시보드 → **Billing** → **Usage limits**
2. 월별 최대 지출 금액 설정

---

## 🔒 보안 주의사항

⚠️ **API 키 보안 규칙:**

1. **절대 코드에 하드코딩하지 마세요**
   ```typescript
   // ❌ 절대 금지!
   const apiKey = "sk-proj-abc123...";
   ```

2. **환경 변수로만 관리하세요**
   ```typescript
   // ✅ 올바른 방법
   const apiKey = process.env.OPENAI_API_KEY;
   ```

3. **GitHub에 커밋하지 마세요**
   - `.env.local` 파일은 `.gitignore`에 포함됨
   - Manus Secrets에서 관리

4. **API 키가 노출되면 즉시 재생성**
   - OpenAI 대시보드에서 기존 키 삭제
   - 새로운 키 생성

---

## 📞 추가 지원

- [OpenAI API 공식 문서](https://platform.openai.com/docs/api-reference)
- [OpenAI Python SDK](https://github.com/openai/openai-python)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)

---

## ✅ 체크리스트

- [ ] OpenAI 계정 생성
- [ ] API 키 발급
- [ ] 환경 변수 설정 (OPENAI_API_KEY)
- [ ] 코드 수정 (routers.ts)
- [ ] 서버 재시작
- [ ] 테스트 메시지 전송
- [ ] ChatGPT 응답 확인
