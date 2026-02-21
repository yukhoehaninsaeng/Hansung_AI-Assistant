import { and, desc, eq, or, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { conversations, InsertConversation, InsertMessage, InsertUser, messages, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import bcryptjs from "bcryptjs";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Local login functions
export async function createLocalUser(username: string, password: string, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const passwordHash = await bcryptjs.hash(password, 10);
  
  const result = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      name: name || username,
      loginMethod: "local",
      lastSignedIn: new Date(),
    })
    .returning({ id: users.id });

  return result[0].id;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
  if (!passwordHash) return false;
  return bcryptjs.compare(password, passwordHash);
}

export async function updateLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Generate username from openId if not provided
    const username = user.username || `user_${user.openId.substring(0, 8)}`;
    
    const values: InsertUser = {
      openId: user.openId,
      username,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Conversation queries
export async function getConversationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
  
  return result;
}

export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .insert(conversations)
    .values(data)
    .returning({ id: conversations.id });
  return result[0].id;
}

export async function deleteConversation(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First delete all messages in the conversation
  await db.delete(messages).where(eq(messages.conversationId, conversationId));
  
  // Then delete the conversation
  await db
    .delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
}

export async function getConversationById(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

// Message queries
export async function getMessagesByConversationId(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
  
  return result;
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .insert(messages)
    .values(data)
    .returning({ id: messages.id });
  return result[0].id;
}

export async function updateConversationTimestamp(conversationId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}


// Admin functions
export async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.status, "pending"))
    .orderBy(users.createdAt);
  
  return result;
}

export async function approveUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(users)
    .set({ status: "approved" })
    .where(eq(users.id, userId));
}

export async function rejectUser(userId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(users)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));
  
  return result;
}

// User Group functions
export async function getAllUserGroups() {
  const db = await getDb();
  if (!db) return [];
  
  const { userGroups } = await import("../drizzle/schema");
  const result = await db.select().from(userGroups).orderBy(userGroups.name);
  
  return result;
}

export async function createUserGroup(name: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { userGroups } = await import("../drizzle/schema");
  const result = await db
    .insert(userGroups)
    .values({ name, description })
    .returning({ id: userGroups.id });

  return result[0].id;
}

export async function updateUserGroup(groupId: number, name: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { userGroups } = await import("../drizzle/schema");
  await db
    .update(userGroups)
    .set({ name, description })
    .where(eq(userGroups.id, groupId));
}

export async function assignUserToGroup(userId: number, groupId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(users)
    .set({ groupId })
    .where(eq(users.id, userId));
}

// Internal File functions
export async function createInternalFile(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { internalFiles } = await import("../drizzle/schema");
  const result = await db
    .insert(internalFiles)
    .values(data)
    .returning({ id: internalFiles.id });

  return result[0].id;
}

export async function searchInternalFiles(query: string) {
  const db = await getDb();
  if (!db) return [];
  
  const { internalFiles } = await import("../drizzle/schema");
  // Simple text search in filename and content
  const result = await db
    .select()
    .from(internalFiles)
    .where(
      or(
        like(internalFiles.filename, `%${query}%`),
        like(internalFiles.content, `%${query}%`)
      )
    );
  
  return result;
}

export async function getInternalFileById(fileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const { internalFiles } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(internalFiles)
    .where(eq(internalFiles.id, fileId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteInternalFile(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { internalFiles } = await import("../drizzle/schema");
  await db.delete(internalFiles).where(eq(internalFiles.id, fileId));
}

export async function getAllInternalFiles() {
  const db = await getDb();
  if (!db) return [];
  
  const { internalFiles } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(internalFiles)
    .orderBy(desc(internalFiles.uploadedAt));
  
  return result;
}

// Update user information
export async function updateUser(userId: number, data: {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  groupId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.groupId !== undefined) updateData.groupId = data.groupId;
  
  if (data.password !== undefined) {
    updateData.passwordHash = await bcryptjs.hash(data.password, 10);
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));
}

// Get user by ID
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Get users in a group
export async function getUsersByGroupId(groupId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(users)
    .where(eq(users.groupId, groupId));
  
  return result;
}

// Remove user from group
export async function removeUserFromGroup(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ groupId: null })
    .where(eq(users.id, userId));
}
