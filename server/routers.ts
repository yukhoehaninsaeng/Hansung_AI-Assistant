import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
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
} from "./db";

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
          throw new Error("Invalid username or password");
        }
        
        const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error("Invalid username or password");
        }
        
        // Update last signed in
        await updateLastSignedIn(user.id);
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, JSON.stringify({
          userId: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          loginMethod: "local",
        }), cookieOptions);
        
        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),
    
    register: publicProcedure
      .input(z.object({
        username: z.string().min(1).max(64),
        password: z.string().min(6),
        name: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already exists
        const existingUser = await getUserByUsername(input.username);
        if (existingUser) {
          throw new Error("Username already exists");
        }
        
        // Create new user
        const userId = await createLocalUser(input.username, input.password, input.name);
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, JSON.stringify({
          userId: userId,
          username: input.username,
          name: input.name || input.username,
          email: null,
          role: "user",
          loginMethod: "local",
        }), cookieOptions);
        
        return {
          success: true,
          user: {
            id: userId,
            username: input.username,
            name: input.name || input.username,
            email: null,
            role: "user",
          },
        };
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Conversation management
  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getConversationsByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({ title: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const conversationId = await createConversation({
          userId: ctx.user.id,
          title: input.title,
        });
        return { id: conversationId };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConversation(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
  
  // Message management
  messages: router({
    list: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify conversation belongs to user
        const conversation = await getConversationById(input.conversationId, ctx.user.id);
        if (!conversation) {
          throw new Error("Conversation not found");
        }
        return await getMessagesByConversationId(input.conversationId);
      }),
    
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
  }),
});

export type AppRouter = typeof appRouter;
