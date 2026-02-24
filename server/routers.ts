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

function isDefaultConversationTitle(title: string | null | undefined) {
  const value = (title || "").trim().toLowerCase();
  if (!value) return true;
  return [
    "new chat",
    "새 채팅",
    "새 대화",
    "chat",
  ].includes(value);
}

function sanitizeConversationTitle(raw: string) {
  const singleLine = raw
    .replace(/[\r\n]+/g, " ")
    .replace(/^["'`[\(\s]+/, "")
    .replace(/["'`\]\)\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return singleLine.slice(0, 40).trim();
}

function fallbackConversationTitleFromText(text: string) {
  const normalized = text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "새 채팅";
  return normalized.slice(0, 30).trim();
}

async function maybeAutoUpdateConversationTitle(userId: number, conversationId: number) {
  const conversation = await getConversationById(conversationId, userId);
  if (!conversation) return;

  const msgs = await getMessagesByConversationId(conversationId);
  if (msgs.length === 0) return;

  // Only auto-title early conversations or conversations still on a generic title.
  if (!isDefaultConversationTitle(conversation.title) && msgs.length > 4) return;

  const importantMessages = msgs
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const firstUserMessage = msgs.find((m) => m.role === "user")?.content ?? "";
  let nextTitle = "";

  try {
    const titleResult = await invokeLLM({
      maxTokens: 30,
      messages: [
        {
          role: "system",
          content:
            "Create a short conversation title from the key points. Return only one title, no quotes, no markdown, max 20 characters.",
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

  if (!nextTitle) {
    nextTitle = fallbackConversationTitleFromText(firstUserMessage);
  }

  if (!nextTitle) return;
  if (nextTitle === conversation.title) return;

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

    register: publicProcedure
      .input(z.object({
        username: z.string().min(1).max(64),
        password: z.string().min(6).max(255),
        name: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existingUser = await getUserByUsername(input.username);
        if (existingUser) {
          throw new TRPCError({ code: "CONFLICT", message: "이미 존재하는 아이디입니다." });
        }

        const userId = await createLocalUser(input.username, input.password, input.name);
        const user = await getUserById(userId);

        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "사용자 생성에 실패했습니다." });
        }

        // 회원가입 성공 후 자동 로그인을 원할 경우 아래 주석 해제 (단, 승인 절차가 있다면 주석 유지)
        /*
        const token = await sdk.createSessionToken(user.id, user.username);
        ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
        */

        return { success: true, user };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(ctx.req));
      return { success: true };
    }),
  }),

  // 채팅 관련 라우터
  chat: router({
    getConversations: protectedProcedure.query(async ({ ctx }) => {
      return getConversationsByUserId(ctx.user.id);
    }),

    createConversation: protectedProcedure
      .input(z.object({ title: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const id = await createConversation({
          userId: ctx.user.id,
          title: input.title,
        });
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
        // 1. 사용자 메시지 저장
        await createMessage({
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        });

        // 2. 대화 업데이트 시간 갱신
        await updateConversationTimestamp(input.conversationId);

        // 3. AI 응답 생성 (간단한 예시)
        const llmResult = await invokeLLM({
          messages: [{ role: "user", content: input.content }],
        });
        const aiContent = llmResult.choices[0]?.message?.content;
        const aiResponse =
          typeof aiContent === "string"
            ? aiContent
            : JSON.stringify(aiContent ?? "");

        // 4. AI 메시지 저장
        const messageId = await createMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: aiResponse,
        });

        // Best-effort auto title generation from conversation key points.
        try {
          await maybeAutoUpdateConversationTitle(ctx.user.id, input.conversationId);
        } catch (error) {
          console.warn("[ConversationTitle] Update skipped:", error);
        }

        return { id: messageId, content: aiResponse };
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
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const id = await createUserGroup(input.name, input.description);
        return { success: true, id };
      }),

    updateUserGroup: adminProcedure
      .input(
        z.object({
          groupId: z.number(),
          name: z.string().min(1).max(255),
          description: z.string().optional(),
        }),
      )
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
      .input(
        z.object({
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
        }),
      )
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

        // "사용자ID"는 로그인 아이디(username)로 해석하여 초기 비밀번호를 설정
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
      .input(
        z.object({
          filename: z.string().min(1).max(255),
          content: z.string().min(1),
          mimeType: z.string().optional(),
        }),
      )
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

    delete: adminProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteInternalFile(input.fileId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
