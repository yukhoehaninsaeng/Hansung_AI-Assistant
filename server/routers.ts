import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { z } from "zod";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
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
        const aiResponse = await invokeLLM([
          { role: "user", content: input.content }
        ]);

        // 4. AI 메시지 저장
        const messageId = await createMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: aiResponse,
        });

        return { id: messageId, content: aiResponse };
      }),

    deleteConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConversation(input.conversationId, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
