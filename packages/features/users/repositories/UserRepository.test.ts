import prismock from "@calcom/testing/lib/__mocks__/prisma";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { PrismaClient } from "@calcom/prisma";
import { CreationSource } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichHostsWithDelegationCredentials: vi.fn(),
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
  getCredentialForSelectedCalendar: vi.fn(),
}));

vi.mock("@calcom/i18n/server", () => {
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

  describe("findByEmails", () => {
    let mockPrismaClient: {
      user: {
        findMany: ReturnType<typeof vi.fn>;
      };
    };
    let repo: UserRepository;

    beforeEach(() => {
      mockPrismaClient = {
        user: {
          findMany: vi.fn(),
        },
      };
      repo = new UserRepository(mockPrismaClient as unknown as PrismaClient);
    });

    test("should return empty array when emails list is empty", async () => {
      const result = await repo.findByEmails({ emails: [] });

      expect(result).toEqual([]);
      expect(mockPrismaClient.user.findMany).not.toHaveBeenCalled();
    });

    test("should look up users by primary email", async () => {
      mockPrismaClient.user.findMany
        .mockResolvedValueOnce([{ id: 1, email: "user@example.com" }])
        .mockResolvedValueOnce([]);

      const result = await repo.findByEmails({ emails: ["user@example.com"] });

      expect(result).toEqual([
        { id: 1, email: "user@example.com", matchedEmails: ["user@example.com"] },
      ]);
      expect(mockPrismaClient.user.findMany).toHaveBeenCalledTimes(2);
    });

    test("should look up users by secondary (verified) email and return the matched address", async () => {
      mockPrismaClient.user.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 2,
            email: "primary@example.com",
            secondaryEmails: [{ email: "secondary@example.com" }],
          },
        ]);

      const result = await repo.findByEmails({ emails: ["secondary@example.com"] });

      expect(result).toEqual([
        { id: 2, email: "primary@example.com", matchedEmails: ["secondary@example.com"] },
      ]);
      expect(mockPrismaClient.user.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            secondaryEmails: {
              some: {
                email: { in: ["secondary@example.com"], mode: "insensitive" },
                emailVerified: { not: null },
              },
            },
          },
        })
      );
    });

    test("should union primary and secondary matches for the same user", async () => {
      mockPrismaClient.user.findMany
        .mockResolvedValueOnce([{ id: 1, email: "user@example.com" }])
        .mockResolvedValueOnce([
          {
            id: 1,
            email: "user@example.com",
            secondaryEmails: [{ email: "alias@example.com" }],
          },
        ]);

      const result = await repo.findByEmails({ emails: ["user@example.com", "alias@example.com"] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].matchedEmails.sort()).toEqual(["alias@example.com", "user@example.com"]);
    });

    test("should normalize emails to lowercase and deduplicate input", async () => {
      mockPrismaClient.user.findMany
        .mockResolvedValueOnce([{ id: 1, email: "user@example.com" }])
        .mockResolvedValueOnce([]);

      await repo.findByEmails({ emails: ["User@Example.COM", "user@example.com"] });

      expect(mockPrismaClient.user.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { email: { in: ["user@example.com"], mode: "insensitive" } },
        })
      );
      expect(mockPrismaClient.user.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            secondaryEmails: {
              some: {
                email: { in: ["user@example.com"], mode: "insensitive" },
                emailVerified: { not: null },
              },
            },
          },
        })
      );
    });

    test("should return multiple distinct users with their matched emails", async () => {
      mockPrismaClient.user.findMany
        .mockResolvedValueOnce([
          { id: 1, email: "user1@example.com" },
          { id: 2, email: "user2@example.com" },
        ])
        .mockResolvedValueOnce([]);

      const result = await repo.findByEmails({
        emails: ["user1@example.com", "user2@example.com"],
      });

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { id: 1, email: "user1@example.com", matchedEmails: ["user1@example.com"] },
          { id: 2, email: "user2@example.com", matchedEmails: ["user2@example.com"] },
        ])
      );
    });
  });
});
