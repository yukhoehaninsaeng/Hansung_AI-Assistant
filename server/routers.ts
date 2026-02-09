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
        // Create a JWT session token that sdk.verifySession expects
        const sessionToken = await sdk.createSessionToken(user.openId || user.username, {
          name: user.name || user.username,
          expiresInMs: ONE_YEAR_MS,
        });
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
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
        // Create a JWT session token that sdk.verifySession expects
        const sessionToken = await sdk.createSessionToken(input.username, {
          name: input.name || input.username,
          expiresInMs: ONE_YEAR_MS,
        });
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
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
        
        // Search internal files first
        let assistantContent = "";
        const fileResults = await searchInternalFiles(input.content);
        
        if (fileResults.length > 0) {
          // Use internal file content as context
          const fileContext = fileResults
            .map(f => `[${f.filename}]\n${f.content}`)
            .join("\n\n");
          
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are a helpful assistant. Use the provided internal documents to answer questions." },
              { role: "user", content: `Internal documents:\n${fileContext}\n\nUser question: ${input.content}` },
            ],
          });
          
          const rawContent = response.choices[0]?.message?.content;
          assistantContent = typeof rawContent === "string" 
            ? rawContent 
            : "Sorry, I couldn't generate a response.";
        } else {
          // Fall back to general LLM response
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: input.content },
            ],
          });
          
          const rawContent = response.choices[0]?.message?.content;
          assistantContent = typeof rawContent === "string" 
            ? rawContent 
            : "Sorry, I couldn't generate a response.";
        }
        
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

  // Admin management
  admin: router({
    // Get pending users for approval
    getPendingUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
      }
      return await getPendingUsers();
    }),

    // Approve user registration
    approveUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
        }
        await approveUser(input.userId);
        return { success: true };
      }),

    // Reject user registration
    rejectUser: protectedProcedure
      .input(z.object({ userId: z.number(), reason: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
        }
        await rejectUser(input.userId, input.reason);
        return { success: true };
      }),

    // Get all users
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
      }
      return await getAllUsers();
    }),

    // Get all user groups
    getUserGroups: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
      }
      return await getAllUserGroups();
    }),

    // Create user group
    createUserGroup: protectedProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
        }
        const groupId = await createUserGroup(input.name, input.description);
        return { id: groupId };
      }),

    // Update user group
    updateUserGroup: protectedProcedure
      .input(z.object({ groupId: z.number(), name: z.string().min(1), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
        }
        await updateUserGroup(input.groupId, input.name, input.description);
        return { success: true };
      }),

    // Assign user to group
    assignUserToGroup: protectedProcedure
      .input(z.object({ userId: z.number(), groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
        }
        await assignUserToGroup(input.userId, input.groupId);
        return { success: true };
      }),

    // Update user information
    updateUser: protectedProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().optional(),
        username: z.string().optional(),
        email: z.string().optional(),
        password: z.string().optional(),
        groupId: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
        }
        await updateUser(input.userId, {
          name: input.name,
          username: input.username,
          email: input.email,
          password: input.password,
          groupId: input.groupId,
        });
        return { success: true };
      }),

    // Get users in a group
    getGroupMembers: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
        }
        return await getUsersByGroupId(input.groupId);
      }),

    // Remove user from group
    removeUserFromGroup: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can access this" });
        }
        await removeUserFromGroup(input.userId);
        return { success: true };
      }),
  }),

  // Internal file management
  files: router({
    // Get all internal files
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return await getAllInternalFiles();
    }),

    // Search internal files
    search: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        return await searchInternalFiles(input.query);
      }),

    // Upload internal file
    upload: protectedProcedure
      .input(z.object({
        filename: z.string().min(1),
        content: z.string().min(1),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can upload files
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can upload files" });
        }

        // Upload to S3
        const fileKey = `internal-files/${ctx.user.id}/${Date.now()}-${input.filename}`;
        const { url } = await storagePut(fileKey, input.content, input.mimeType || "text/plain");

        // Save file metadata to database
        const fileId = await createInternalFile({
          filename: input.filename,
          fileKey,
          fileUrl: url,
          mimeType: input.mimeType || "text/plain",
          fileSize: Buffer.byteLength(input.content),
          content: input.content,
          uploadedBy: ctx.user.id,
        });

        return { id: fileId, url };
      }),

    // Delete internal file
    delete: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete files" });
        }
        await deleteInternalFile(input.fileId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
