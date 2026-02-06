import prismock from "@calcom/testing/lib/__mocks__/prisma";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { CreationSource } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: async (locale: string, namespace: string) => {
      const t = (key: string) => key;
      t.locale = locale;
      t.namespace = namespace;
      return t;
    },
  };
});

describe("UserRepository", () => {
  beforeEach(() => {
    prismock;
  });

  describe("create", () => {
    test("Should create a user without a password", async () => {
      const user = await new UserRepository(prismock).create({
        username: "test",
        email: "test@example.com",
        organizationId: null,
        creationSource: CreationSource.WEBAPP,
        locked: false,
      });

      expect(user).toEqual(
        expect.objectContaining({
          username: "test",
          email: "test@example.com",
          organizationId: null,
          creationSource: CreationSource.WEBAPP,
          locked: false,
        })
      );

      const password = await prismock.userPassword.findUnique({
        where: {
          userId: user.id,
        },
      });

      expect(password).toBeNull();
    });

    test("If locked param is passed, user should be locked", async () => {
      const user = await new UserRepository(prismock).create({
        username: "test",
        email: "test@example.com",
        organizationId: null,
        creationSource: CreationSource.WEBAPP,
        locked: true,
      });

      const userQuery = await prismock.user.findUnique({
        where: {
          email: "test@example.com",
        },
        select: {
          locked: true,
        },
      });

      expect(userQuery).toEqual(
        expect.objectContaining({
          locked: true,
        })
      );
    });

    test("If organizationId is passed, user should be associated with the organization", async () => {
      const organizationId = 123;
      const username = "test";

      const user = await new UserRepository(prismock).create({
        username,
        email: "test@example.com",
        organizationId,
        creationSource: CreationSource.WEBAPP,
        locked: true,
      });

      expect(user).toEqual(
        expect.objectContaining({
          organizationId,
        })
      );

      const profile = await prismock.profile.findFirst({
        where: {
          organizationId,
          username,
        },
      });

      expect(profile).toEqual(
        expect.objectContaining({
          organizationId,
          username,
        })
      );
    });
  });

  describe("findUsersByEmails", () => {
    // Note: Prismock doesn't support `mode: "insensitive"`, so we test with lowercase emails
    // since the implementation normalizes emails to lowercase before querying.
    test("Should find user by primary email", async () => {
      // Create a test user
      await prismock.user.create({
        data: {
          id: 1,
          email: "test@example.com",
          username: "testuser",
        },
      });

      const repo = new UserRepository(prismock);
      const users = await repo.findUsersByEmails({ emails: ["test@example.com"] });

      expect(users).toHaveLength(1);
      expect(users[0].email).toBe("test@example.com");
      expect(users[0]).toHaveProperty("secondaryEmails");
    });

    test("Should find user by verified secondary email and include secondary emails in result", async () => {
      // Create a test user with secondary email
      const user = await prismock.user.create({
        data: {
          id: 2,
          email: "primary@example.com",
          username: "testuser2",
        },
      });

      await prismock.secondaryEmail.create({
        data: {
          id: 1,
          email: "secondary@example.com",
          userId: user.id,
          emailVerified: new Date(),
        },
      });

      const repo = new UserRepository(prismock);
      const users = await repo.findUsersByEmails({ emails: ["secondary@example.com"] });

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(user.id);
      expect(users[0]).toHaveProperty("secondaryEmails");
    });

    test("Should return empty array for non-existent email", async () => {
      const repo = new UserRepository(prismock);
      const users = await repo.findUsersByEmails({ emails: ["nonexistent@example.com"] });

      expect(users).toHaveLength(0);
    });

    test("Should return empty array for empty emails input", async () => {
      const repo = new UserRepository(prismock);
      const users = await repo.findUsersByEmails({ emails: [] });

      expect(users).toHaveLength(0);
    });

    test("Should dedupe users found by both primary and secondary email", async () => {
      // Create a test user
      const user = await prismock.user.create({
        data: {
          id: 3,
          email: "both@example.com",
          username: "testuser3",
        },
      });

      await prismock.secondaryEmail.create({
        data: {
          id: 2,
          email: "both-secondary@example.com",
          userId: user.id,
          emailVerified: new Date(),
        },
      });

      const repo = new UserRepository(prismock);
      // Search for both emails - should return same user only once
      // Using lowercase since the implementation normalizes to lowercase
      const users = await repo.findUsersByEmails({
        emails: ["both@example.com", "both-secondary@example.com"],
      });

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(user.id);
    });
  });
});
