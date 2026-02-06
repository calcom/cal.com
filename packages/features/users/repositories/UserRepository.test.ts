import prismock from "@calcom/testing/lib/__mocks__/prisma";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
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

  describe("findUsersByEmails", () => {
    test("returns empty array for empty emails input", async () => {
      const result = await new UserRepository(prismock).findUsersByEmails({ emails: [] });
      expect(result).toEqual([]);
    });

    test("queries by primary email and verified secondary emails", async () => {
      const mockFindMany = vi.fn().mockResolvedValue([{ id: 1, email: "test@example.com" }]);
      const mockPrisma = { user: { findMany: mockFindMany } } as any;
      const userRepo = new UserRepository(mockPrisma);

      const result = await userRepo.findUsersByEmails({ emails: ["test@example.com"] });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, email: "test@example.com" });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ email: { in: ["test@example.com"], mode: "insensitive" } }]),
          }),
          select: { id: true, email: true },
        })
      );
    });

    test("selects only id and email fields", async () => {
      const mockFindMany = vi.fn().mockResolvedValue([{ id: 2, email: "user@example.com" }]);
      const mockPrisma = { user: { findMany: mockFindMany } } as any;
      const userRepo = new UserRepository(mockPrisma);

      await userRepo.findUsersByEmails({ emails: ["user@example.com"] });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { id: true, email: true },
        })
      );
    });
  });
});
