import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { z } from "zod";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createConversation,
  createMessage,
  createLocalUser,
  deleteConversation,
  getConversationById,
  getConversationsByUserId,
  searchConversationsByUserId,
  getMessagesByConversationId,
  getUserByUsername,
  updateConversationTimestamp,
  updateConversationTitle,
  updateLastSignedIn,
  verifyPassword,
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers,
  getAllUserGroups,
  createUserGroup,
  updateUserGroup,
  assignUserToGroup,
  createInternalFile,
  searchInternalFiles,
  getAllInternalFiles,
  deleteInternalFile,
  updateUser,
  getUserById,
  getUsersByGroupId,
  removeUserFromGroup,
} from "./db";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

// ── 웹 페이지 텍스트 추출 헬퍼 ──────────────────────────────────────────────

async function fetchPageText(url: string, maxChars = 7000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ").trim();
    return text.slice(0, maxChars);
  } catch {
    return "";
  }
}

// ── RAG: 파일 컨텍스트 빌더 ─────────────────────────────────────────────────

function buildFileContext(files: Array<{ filename: string; content?: string | null }>): string {
  if (!files.length) return "";
  const MAX_PER_FILE = 4000;
  const MAX_TOTAL = 18000;
  let total = 0;
  const parts: string[] = [];

  for (const file of files) {
    const content = (file.content || "").trim().slice(0, MAX_PER_FILE);
    if (!content) continue;
    if (total + content.length > MAX_TOTAL) break;
    parts.push(`📄 [문서명: ${file.filename}]\n${content}`);
    total += content.length;
  }

  return parts.join("\n\n---\n\n");
}

// ── 웹 검색 헬퍼 (DuckDuckGo 기반) ─────────────────────────────────────────

async function searchWeb(query: string): Promise<string> {
  try {
    const searchQuery = `한성대학교 ${query}`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    const text = await Promise.race([
      fetchPageText(url, 2500),
      new Promise<string>((resolve) => setTimeout(() => resolve(""), 6000)),
    ]);
    return text || "";
  } catch {
    return "";
  }
}

// ── LLM 메시지 배열 구성 (파일 + 웹 컨텍스트 주입) ──────────────────────────

function buildMessagesWithContext(
  history: Array<{ role: string; content: string }>,
  fileContext: string,
  webContext: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const knowledgeSections: string[] = [];
  if (fileContext) {
    knowledgeSections.push(
      "## 📁 내부 지식 문서 (최우선 참고 — 이 내용을 기반으로 먼저 답변하세요)\n\n" + fileContext
    );
  }
  if (webContext) {
    knowledgeSections.push(
      "## 🌐 웹 검색 결과 (내부 문서에 없는 내용 보완 참고)\n\n" + webContext
    );
  }
  const knowledgeBlock = knowledgeSections.join("\n\n");

  const baseInstruction = [
    "당신은 한성대학교 AI 도우미입니다.",
    "",
    "【답변 원칙】",
    "1. 내부 문서에 관련 내용이 있으면 반드시 해당 내용을 근거로 답변하세요.",
    "2. 내부 문서에 없는 내용은 웹 검색 결과를 참고하여 답변하세요.",
    "3. 두 곳 모두에 없는 경우 일반 지식으로 답변하되, 공식 홈페이지(www.hansung.ac.kr) 확인을 권장하세요.",
    "4. 항상 친절하고 정확하게, 한국어로 답변하세요.",
  ].join("\n");

  const hasSystemMsg = history.some((m) => m.role === "system");

  if (hasSystemMsg) {
    return history.map((m) => {
      if (m.role === "system") {
        return {
          role: "system" as const,
          content: knowledgeBlock ? `${m.content}\n\n${knowledgeBlock}` : m.content,
        };
      }
      return { role: m.role as "user" | "assistant", content: m.content };
    });
  }

  const systemContent = knowledgeBlock
    ? `${baseInstruction}\n\n${knowledgeBlock}`
    : baseInstruction;

  return [
    { role: "system" as const, content: systemContent },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
}

// ── 대화 제목 자동 생성 ────────────────────────────────────────────────────

function isDefaultConversationTitle(title: string | null | undefined) {
  const value = (title || "").trim().toLowerCase();
  if (!value) return true;
  return ["new chat", "새 채팅", "새 대화", "chat"].includes(value);
}

function sanitizeConversationTitle(raw: string) {
  return raw
    .replace(/[\r\n]+/g, " ")
    .replace(/^["'`[\(\s]+/, "")
    .replace(/["'`\]\)\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40)
    .trim();
}

function fallbackConversationTitleFromText(text: string) {
  const normalized = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "새 채팅";
  return normalized.slice(0, 30).trim();
}

async function maybeAutoUpdateConversationTitle(userId: number, conversationId: number) {
  const conversation = await getConversationById(conversationId, userId);
  if (!conversation) return;

  const msgs = await getMessagesByConversationId(conversationId);
  if (msgs.length === 0) return;

  if (!isDefaultConversationTitle(conversation.title) && msgs.length > 4) return;

  const importantMessages = msgs.slice(-6).map((m) => `${m.role}: ${m.content}`).join("\n");
  const firstUserMessage = msgs.find((m) => m.role === "user")?.content ?? "";
  let nextTitle = "";

  try {
    const titleResult = await invokeLLM({
      maxTokens: 30,
      messages: [
        {
          role: "system",
          content: "Create a short conversation title from the key points. Return only one title, no quotes, no markdown, max 20 characters.",
        },
        {
          role: "user",
          content: `Conversation:\n${importantMessages}\n\nIf needed, focus on the most important user intent.`,
        },
      ],
    });

    const llmContent = titleResult.choices[0]?.message?.content;
    const raw =
      typeof llmContent === "string"
        ? llmContent
        : Array.isArray(llmContent)
          ? llmContent.map((p) => ("text" in p ? p.text : "")).join(" ")
          : "";

    nextTitle = sanitizeConversationTitle(raw);
  } catch (error) {
    console.warn("[ConversationTitle] LLM title generation failed:", error);
  }

  if (!nextTitle) nextTitle = fallbackConversationTitleFromText(firstUserMessage);
  if (!nextTitle || nextTitle === conversation.title) return;

  await updateConversationTitle(conversationId, nextTitle);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByUsername(input.username);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." });
        }
        if (user.status === "pending") {
          throw new TRPCError({ code: "FORBIDDEN", message: "관리자의 승인을 기다리고 있는 계정입니다." });
        }
        if (user.status === "rejected") {
          throw new TRPCError({ code: "FORBIDDEN", message: `가입이 거절되었습니다. 사유: ${user.rejectionReason || "없음"}` });
        }
        const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "비밀번호가 일치하지 않습니다." });
        }
        await updateLastSignedIn(user.id);
        const token = await sdk.createSessionToken(user.id, user.username);
        ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
        return { success: true, user };
      }),

    // 26.04.09 회원가입 시 학번, 학과 추가
    register: publicProcedure
      .input(z.object({
        username: z.string().min(1).max(64),
        password: z.string().min(6).max(255),
        name: z.string().optional(),
        studentId: z.string().min(1, "학번을 입력해주세요"),
        department: z.string().min(1, "학과를 입력해주세요"),
      }))
      .mutation(async ({ ctx, input }) => {
        const existingUser = await getUserByUsername(input.username);
        if (existingUser) {
          throw new TRPCError({ code: "CONFLICT", message: "이미 존재하는 아이디입니다." });
        }
        const userId = await createLocalUser(
          input.username,
          input.password,
          input.name,
          input.studentId,
          input.department,
        );
        const user = await getUserById(userId);
        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "사용자 생성에 실패했습니다." });
        }
        return { success: true, user };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(ctx.req));
      return { success: true };
    }),
  }),

  // 채팅 관련 라우터
  chat: router({
    publicChat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1),
        })),
      }))
      .mutation(async ({ input }) => {
        const [files, webContext] = await Promise.all([
          getAllInternalFiles().catch(() => []),
          input.messages.length > 0
            ? searchWeb(input.messages[input.messages.length - 1].content)
            : Promise.resolve(""),
        ]);
        const fileContext = buildFileContext(files);
        const llmMessages = buildMessagesWithContext(input.messages, fileContext, webContext);
        const llmResult = await invokeLLM({ messages: llmMessages });
        const aiContent = llmResult.choices[0]?.message?.content;
        return {
          content: typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent ?? ""),
        };
      }),

    getConversations: protectedProcedure.query(async ({ ctx }) => {
      return getConversationsByUserId(ctx.user.id);
    }),

    searchConversations: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        return searchConversationsByUserId(ctx.user.id, input.query);
      }),

    createConversation: protectedProcedure
      .input(z.object({ title: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const id = await createConversation({ userId: ctx.user.id, title: input.title });
        return { id };
      }),

    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return getMessagesByConversationId(input.conversationId);
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        await createMessage({ conversationId: input.conversationId, role: "user", content: input.content });
        await updateConversationTimestamp(input.conversationId);

        const history = await getMessagesByConversationId(input.conversationId);
        const [files, webContext] = await Promise.all([
          getAllInternalFiles().catch(() => []),
          searchWeb(input.content),
        ]);
        const fileContext = buildFileContext(files);
        const llmMessages = buildMessagesWithContext(history, fileContext, webContext);
        const llmResult = await invokeLLM({ messages: llmMessages });
        const aiContent = llmResult.choices[0]?.message?.content;
        const aiResponse = typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent ?? "");

        const messageId = await createMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: aiResponse,
        });

        try {
          await maybeAutoUpdateConversationTitle(ctx.user.id, input.conversationId);
        } catch (error) {
          console.warn("[ConversationTitle] Update skipped:", error);
        }

        return { id: messageId, content: aiResponse };
      }),

    startModeConversation: protectedProcedure
      .input(z.object({ mode: z.enum(["notice", "admission"]) }))
      .mutation(async ({ ctx, input }) => {
        const isNotice = input.mode === "notice";
        const title = isNotice ? "공지사항 요약" : "입학 안내 도우미";
        const convId = await createConversation({ userId: ctx.user.id, title });

        let systemContent: string;
        let firstUserContent: string | null = null;

        if (isNotice) {
          const pageText = await fetchPageText("https://www.hansung.ac.kr/hansung/6172/subview.do");
          systemContent = [
            "당신은 한성대학교 AI 도우미입니다. 아래는 한성대학교 공지사항 게시판에서 가져온 내용입니다.",
            "",
            "=== 공지사항 페이지 내용 ===",
            pageText || "(페이지 내용을 불러오지 못했습니다. 한성대학교 공지사항에 대해 일반적인 안내를 제공해주세요.)",
            "=========================",
            "",
            "위 내용을 바탕으로 사용자 질문에 친절하고 정확하게 답변해주세요. 반드시 한국어로 답변하세요.",
          ].join("\n");
          firstUserContent = "위 공지사항 내용에서 가장 최신 게시글 3개를 찾아서 번호, 제목, 날짜, 핵심 내용을 포함하여 알기 쉽게 요약해줘.";
        } else {
          const pageText = await fetchPageText("https://enter.hansung.ac.kr/?m1=home", 4000);
          systemContent = [
            "당신은 한성대학교 입학처 AI 도우미입니다. 입학에 관한 모든 질문에 친절하고 전문적으로 답변해주세요.",
            "",
            ...(pageText ? ["=== 입학처 홈페이지 참고 내용 ===", pageText, "================================", ""] : []),
            "주요 안내 영역:",
            "- 수시/정시 모집요강 및 지원 방법",
            "- 전형별 안내: 학생부교과전형, 학생부종합전형, 논술전형, 실기/실적전형 등",
            "- 입시 일정 및 중요 공지사항",
            "- 학생부종합전형 평가기준 (학업역량, 전공적합성, 인성, 발전가능성)",
            "- 입시설명회 일정 및 등록 방법",
            "- 학생부종합전형 가이드북 내용",
            "",
            "📞 입학처 대표 전화: 02-760-5800",
            "🌐 입학처 홈페이지: https://enter.hansung.ac.kr",
            "",
            "불확실하거나 최신 정보가 필요한 경우에는 입학처에 직접 문의를 권장하세요. 반드시 한국어로 답변하세요.",
          ].join("\n");
        }

        await createMessage({ conversationId: convId, role: "system", content: systemContent });
        if (firstUserContent) {
          await createMessage({ conversationId: convId, role: "user", content: firstUserContent });
        }

        const [history, files] = await Promise.all([
          getMessagesByConversationId(convId),
          getAllInternalFiles().catch(() => []),
        ]);
        const fileContext = buildFileContext(files);

        const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
          history.map(m => {
            if (m.role === "system" && fileContext) {
              return {
                role: "system" as const,
                content: `${m.content}\n\n## 📁 내부 지식 문서 (추가 참고)\n\n${fileContext}`,
              };
            }
            return { role: m.role as "system" | "user" | "assistant", content: m.content };
          });

        if (!isNotice) {
          llmMessages.push({
            role: "user",
            content: "안녕하세요! 입학 안내 도우미로 시작합니다. 자기소개와 함께 어떤 도움을 드릴 수 있는지 알기 쉽게 안내해주세요.",
          });
        }

        const llmResult = await invokeLLM({ messages: llmMessages });
        const aiContent = llmResult.choices[0]?.message?.content;
        const aiResponse = typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent ?? "");

        await createMessage({ conversationId: convId, role: "assistant", content: aiResponse });
        await updateConversationTimestamp(convId);

        return { conversationId: convId, aiResponse };
      }),

    deleteConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConversation(input.conversationId, ctx.user.id);
        return { success: true };
      }),
  }),

  admin: router({
    getPendingUsers: adminProcedure.query(async () => {
      return getPendingUsers();
    }),

    approveUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await approveUser(input.userId);
        return { success: true };
      }),

    rejectUser: adminProcedure
      .input(z.object({ userId: z.number(), reason: z.string().min(1) }))
      .mutation(async ({ input }) => {
        await rejectUser(input.userId, input.reason);
        return { success: true };
      }),

    getAllUsers: adminProcedure.query(async () => {
      return getAllUsers();
    }),

    getUserById: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        const { passwordHash: _passwordHash, ...safeUser } = user;
        return safeUser;
      }),

    getUserGroups: adminProcedure.query(async () => {
      return getAllUserGroups();
    }),

    createUserGroup: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createUserGroup(input.name, input.description);
        return { success: true, id };
      }),

    updateUserGroup: adminProcedure
      .input(z.object({
        groupId: z.number(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateUserGroup(input.groupId, input.name, input.description);
        return { success: true };
      }),

    assignUserToGroup: adminProcedure
      .input(z.object({ userId: z.number(), groupId: z.number() }))
      .mutation(async ({ input }) => {
        await assignUserToGroup(input.userId, input.groupId);
        return { success: true };
      }),

    updateUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        openId: z.string().nullable().optional(),
        name: z.string().optional(),
        username: z.string().optional(),
        email: z.string().nullable().optional(),
        loginMethod: z.string().nullable().optional(),
        role: z.enum(["user", "admin"]).optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        rejectionReason: z.string().nullable().optional(),
        password: z.string().optional(),
        groupId: z.number().nullable().optional(),
        createdAt: z.string().datetime().optional(),
        updatedAt: z.string().datetime().optional(),
        lastSignedIn: z.string().datetime().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateUser(input.userId, {
          openId: input.openId,
          name: input.name,
          username: input.username,
          email: input.email,
          loginMethod: input.loginMethod,
          role: input.role,
          status: input.status,
          rejectionReason: input.rejectionReason,
          password: input.password,
          groupId: input.groupId,
          createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
          updatedAt: input.updatedAt ? new Date(input.updatedAt) : undefined,
          lastSignedIn: input.lastSignedIn ? new Date(input.lastSignedIn) : undefined,
        });
        return { success: true };
      }),

    resetUserPassword: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const user = await getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        const temporaryPassword = String(user.username);
        await updateUser(user.id, { password: temporaryPassword });
        return { success: true, temporaryPassword };
      }),

    getGroupMembers: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return getUsersByGroupId(input.groupId);
      }),

    removeUserFromGroup: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await removeUserFromGroup(input.userId);
        return { success: true };
      }),
  }),

  files: router({
    getAll: adminProcedure.query(async () => {
      return getAllInternalFiles();
    }),

    search: adminProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        return searchInternalFiles(input.query);
      }),

    upload: adminProcedure
      .input(z.object({
        filename: z.string().min(1).max(255),
        content: z.string().min(1),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const safeName = input.filename.replace(/[\\\/]/g, "_");
        const key = `internal-files/${Date.now()}-${safeName}`;
        const uploaded = await storagePut(key, input.content, input.mimeType || "text/plain");
        const fileId = await createInternalFile({
          filename: input.filename,
          fileKey: uploaded.key,
          fileUrl: uploaded.url,
          mimeType: input.mimeType || "text/plain",
          fileSize: Buffer.byteLength(input.content, "utf8"),
          content: input.content,
          uploadedBy: ctx.user.id,
        });
        return { success: true, id: fileId, url: uploaded.url };
      }),

    saveText: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const fileId = await createInternalFile({
          filename: input.title.endsWith(".txt") ? input.title : `${input.title}.txt`,
          fileKey: `text-direct/${Date.now()}`,
          fileUrl: "",
          mimeType: "text/plain",
          fileSize: Buffer.byteLength(input.content, "utf8"),
          content: input.content,
          uploadedBy: ctx.user.id,
        });
        return { success: true, id: fileId };
      }),

    delete: adminProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteInternalFile(input.fileId);
        return { success: true };
      }),
  }),

  // ── 26.04.09 사용자 프로필 라우터 추가 ──────────────────────────────────
  user: router({
    // 내 프로필 조회
    getMe: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다" });
      }
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    }),

    // 이메일 수정
    updateEmail: protectedProcedure
      .input(z.object({
        email: z.string().email("올바른 이메일 형식이 아닙니다"),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUser(ctx.user.id, { email: input.email });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;