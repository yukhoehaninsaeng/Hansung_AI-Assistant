# ChatGPT API 연결 가이드

현재 애플리케이션은 Manus의 기본 LLM API를 사용하고 있습니다. 이를 OpenAI의 ChatGPT API로 변경하는 방법을 설명합니다.

## 1. OpenAI API 키 발급

1. [OpenAI 웹사이트](https://platform.openai.com)에 접속합니다.
2. 계정을 생성하거나 로그인합니다.
3. 좌측 메뉴에서 **API keys** 또는 **View API keys**를 클릭합니다.
4. **Create new secret key** 버튼을 클릭하여 새로운 API 키를 생성합니다.
5. 생성된 API 키를 안전하게 복사하여 저장합니다. (한 번만 표시됩니다)

## 2. 환경 변수 설정

### 방법 1: 로컬 개발 환경 (.env 파일)

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 다음을 추가합니다:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
```

### 방법 2: Manus 관리 UI (권장)

1. Manus 관리 UI의 **Settings** → **Secrets** 패널을 엽니다.
2. **Add New Secret** 버튼을 클릭합니다.
3. 다음 정보를 입력합니다:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: 발급받은 OpenAI API 키
4. **Save** 버튼을 클릭합니다.

## 3. 백엔드 코드 수정

### 파일 경로: `/home/ubuntu/chatgpt-style-webapp/server/routers.ts`

**수정 위치: 76-82번 줄**

현재 코드:
```typescript
// Generate AI response using LLM
const response = await invokeLLM({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: input.content },
  ],
});
```

ChatGPT API를 사용하도록 변경:
```typescript
// Generate AI response using ChatGPT API
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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
  throw new Error(`OpenAI API error: ${response.statusText}`);
}

const data = await response.json() as any;
```

### 파일 경로: `/home/ubuntu/chatgpt-style-webapp/server/routers.ts`

**수정 위치: 95-98번 줄**

현재 코드:
```typescript
const rawContent = response.choices[0]?.message?.content;
const assistantContent = typeof rawContent === "string" 
  ? rawContent 
  : "Sorry, I couldn't generate a response.";
```

ChatGPT API 응답 처리로 변경:
```typescript
const assistantContent = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
```

## 4. 필요한 패키지 확인

현재 프로젝트에서는 추가 패키지가 필요하지 않습니다. (기본 `fetch` API 사용)

만약 더 나은 타입 지원을 원한다면:
```bash
pnpm add openai
```

그 후 코드를 다음과 같이 수정할 수 있습니다:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: input.content },
  ],
});

const assistantContent = response.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
```

## 5. 테스트

1. 애플리케이션을 재시작합니다:
   ```bash
   pnpm dev
   ```

2. 로그인하여 새 대화를 시작합니다.

3. 메시지를 입력하고 전송합니다.

4. ChatGPT의 응답이 표시되는지 확인합니다.

## 6. 비용 관리

- OpenAI API는 사용량 기반으로 과금됩니다.
- [OpenAI 대시보드](https://platform.openai.com/account/billing/overview)에서 사용량과 비용을 모니터링할 수 있습니다.
- 필요시 API 키를 비활성화하거나 사용량 제한을 설정할 수 있습니다.

## 7. 문제 해결

### API 키가 작동하지 않는 경우
- API 키가 올바르게 복사되었는지 확인합니다.
- 환경 변수가 제대로 로드되었는지 확인합니다.
- OpenAI 계정에 충분한 크레딧이 있는지 확인합니다.

### 응답이 느린 경우
- 모델을 더 빠른 모델로 변경합니다 (예: `gpt-3.5-turbo`).
- `max_tokens` 값을 줄입니다.

### 401 Unauthorized 오류
- API 키가 유효한지 확인합니다.
- API 키가 만료되었을 수 있으니 새로운 키를 생성합니다.

## 8. 모델 선택 가이드

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 최고 성능, 최신 기능 | 높음 |
| `gpt-4o-mini` | 균형잡힌 성능과 비용 | 중간 |
| `gpt-3.5-turbo` | 빠른 응답, 저렴함 | 낮음 |

## 9. 추가 설정 (선택사항)

### 스트리밍 응답 구현

ChatGPT API의 스트리밍 기능을 사용하면 응답이 실시간으로 표시됩니다:

```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: input.content },
    ],
    stream: true,
  }),
});

// 스트리밍 처리 로직...
```

더 자세한 정보는 [OpenAI API 문서](https://platform.openai.com/docs/api-reference)를 참고하세요.
