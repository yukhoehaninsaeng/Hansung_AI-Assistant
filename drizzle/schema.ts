import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table backing local login auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "approved", "rejected"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  /** Username for local login */
  username: varchar("username", { length: 64 }).notNull().unique(),
  /** Hashed password for local login (bcrypt) */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Manus OAuth identifier (openId) - now optional for local login */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  role: userRoleEnum("role").default("user").notNull(),
  /** Registration status: pending (대기), approved (승인), rejected (거절) */
  status: userStatusEnum("status").default("pending").notNull(),
  /** Reason for rejection (if applicable) */
  rejectionReason: text("rejectionReason"),
  /** Group ID for user grouping */
  groupId: integer("groupId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Conversation table - stores chat conversations for each user
 */
export const conversations = pgTable("conversations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Message table - stores individual messages within conversations
 */
export const messages = pgTable("messages", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  conversationId: integer("conversationId").notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * User Group table - for grouping users
 */
export const userGroups = pgTable("userGroups", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroup = typeof userGroups.$inferInsert;

/**
 * Internal File table - stores uploaded internal files
 */
export const internalFiles = pgTable("internalFiles", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: integer("fileSize"),
  content: text("content"), // Extracted text content from file
  uploadedBy: integer("uploadedBy").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type InternalFile = typeof internalFiles.$inferSelect;
export type InsertInternalFile = typeof internalFiles.$inferInsert;
