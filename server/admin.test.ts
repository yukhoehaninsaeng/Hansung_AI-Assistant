import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  createLocalUser,
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers,
  createUserGroup,
  getAllUserGroups,
  assignUserToGroup,
  createInternalFile,
  searchInternalFiles,
  getAllInternalFiles,
} from "./db";

describe("Admin Functions", () => {
  let testUserId: number;
  let testGroupId: number;
  let testFileId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
  });

  describe("User Management", () => {
    it("should create a local user with pending status", async () => {
      testUserId = await createLocalUser("testadmin", "password123", "Test Admin");
      expect(testUserId).toBeGreaterThan(0);
    });

    it("should get pending users", async () => {
      const pendingUsers = await getPendingUsers();
      expect(Array.isArray(pendingUsers)).toBe(true);
      expect(pendingUsers.length).toBeGreaterThan(0);
    });

    it("should approve a user", async () => {
      await approveUser(testUserId);
      const allUsers = await getAllUsers();
      const approvedUser = allUsers.find((u) => u.id === testUserId);
      expect(approvedUser?.status).toBe("approved");
    });

    it("should reject a user with reason", async () => {
      const testUserId2 = await createLocalUser("testuser2", "password456", "Test User 2");
      await rejectUser(testUserId2, "Duplicate account");
      const allUsers = await getAllUsers();
      const rejectedUser = allUsers.find((u) => u.id === testUserId2);
      expect(rejectedUser?.status).toBe("rejected");
      expect(rejectedUser?.rejectionReason).toBe("Duplicate account");
    });

    it("should get all users", async () => {
      const allUsers = await getAllUsers();
      expect(Array.isArray(allUsers)).toBe(true);
      expect(allUsers.length).toBeGreaterThan(0);
    });
  });

  describe("User Group Management", () => {
    it("should create a user group", async () => {
      testGroupId = await createUserGroup("Engineering", "Engineering team members");
      expect(testGroupId).toBeGreaterThan(0);
    });

    it("should get all user groups", async () => {
      const groups = await getAllUserGroups();
      expect(Array.isArray(groups)).toBe(true);
      expect(groups.length).toBeGreaterThan(0);
    });

    it("should assign user to group", async () => {
      await assignUserToGroup(testUserId, testGroupId);
      const db = await getDb();
      if (db) {
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db
          .select()
          .from(users)
          .where(eq(users.id, testUserId))
          .limit(1);
        expect(result[0]?.groupId).toBe(testGroupId);
      }
    });
  });

  describe("Internal File Management", () => {
    it("should create an internal file", async () => {
      testFileId = await createInternalFile({
        filename: "company_policy.txt",
        fileKey: "internal-files/1/company_policy.txt",
        fileUrl: "https://example.com/company_policy.txt",
        mimeType: "text/plain",
        fileSize: 1024,
        content: "This is a company policy document.",
        uploadedBy: testUserId,
      });
      expect(testFileId).toBeGreaterThan(0);
    });

    it("should search internal files", async () => {
      const results = await searchInternalFiles("company");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.filename).toContain("company");
    });

    it("should get all internal files", async () => {
      const files = await getAllInternalFiles();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should search files by content", async () => {
      const results = await searchInternalFiles("policy");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
