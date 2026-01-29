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

describe("conversations", () => {
  it("should create a new conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.conversations.create({
      title: "Test Conversation",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list conversations for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a conversation first
    await caller.conversations.create({
      title: "Test Conversation 1",
    });

    const conversations = await caller.conversations.list();

    expect(Array.isArray(conversations)).toBe(true);
    expect(conversations.length).toBeGreaterThan(0);
  });

  it("should delete a conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a conversation
    const created = await caller.conversations.create({
      title: "Conversation to Delete",
    });

    // Delete it
    const result = await caller.conversations.delete({ id: created.id });

    expect(result.success).toBe(true);
  });
});
