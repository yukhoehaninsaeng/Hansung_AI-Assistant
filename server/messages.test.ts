import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("messages", () => {
  it("should send a message and receive AI response", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a conversation first
    const conversation = await caller.conversations.create({
      title: "Test Chat",
    });

    // Send a message
    const result = await caller.messages.send({
      conversationId: conversation.id,
      content: "Hello, how are you?",
    });

    expect(result).toHaveProperty("userMessage");
    expect(result).toHaveProperty("assistantMessage");
    expect(result.userMessage.content).toBe("Hello, how are you?");
    expect(result.userMessage.role).toBe("user");
    expect(result.assistantMessage.role).toBe("assistant");
    expect(typeof result.assistantMessage.content).toBe("string");
  }, 30000); // 30 second timeout for LLM response

  it("should list messages for a conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a conversation
    const conversation = await caller.conversations.create({
      title: "Test Chat 2",
    });

    // Send a message
    await caller.messages.send({
      conversationId: conversation.id,
      content: "Test message",
    });

    // List messages
    const messages = await caller.messages.list({
      conversationId: conversation.id,
    });

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(2); // user + assistant
  }, 30000);
});
