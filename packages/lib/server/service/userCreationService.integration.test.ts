import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, test, expect, vi, beforeEach } from "vitest";

import { CreationSource } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";

import { UserCreationService } from "./userCreationService";

vi.mock("@calcom/features/auth/lib/hashPassword", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: (key: string) => {
      return () => key;
    },
  };
});

describe("userCreationService integration test", () => {
  beforeEach(() => {
    prismock;
  });

  describe("createUser", () => {
    test("should create user", async () => {
      prismock;
      const user = await UserCreationService.createUser({
        data: {
          email: "test@example.com",
          username: "test",
          creationSource: CreationSource.WEBAPP,
        },
      });

      expect(user).not.toHaveProperty("locked");
      expect(user).toEqual(
        expect.objectContaining({
          username: "test",
          email: "test@example.com",
          organizationId: null,
        })
      );
    });

    test("should lock user when email is in watchlist", async () => {
      await prismock.watchlist.create({
        data: {
          type: "EMAIL",
          value: "test@spammer.com",
          severity: "CRITICAL",
          createdById: 1,
        },
      });

      await UserCreationService.createUser({
        data: {
          email: "test@spammer.com",
          username: "test",
          creationSource: CreationSource.WEBAPP,
        },
      });

      const user = await prismock.user.findFirst({
        where: {
          email: "test@spammer.com",
        },
      });

      expect(user).not.toBeNull();
      expect(user?.locked).toBe(true);
    });

    test("should hash password when provided", async () => {
      await UserCreationService.createUser({
        data: {
          email: "test@example.com",
          username: "test",
          password: "password",
          creationSource: CreationSource.WEBAPP,
        },
      });

      const user = await prismock.user.findFirst({
        where: {
          email: "test@example.com",
        },
        include: {
          password: true,
        },
      });

      expect(user).not.toBeNull();

      expect(user?.password).not.toBeNull();
    });

    test("if orgData is passed, user should be created with orgData", async () => {
      await UserCreationService.createUser({
        data: {
          email: "test@example.com",
          username: "test",
          creationSource: CreationSource.WEBAPP,
        },
        orgData: {
          id: 1,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const user = await prismock.user.findFirst({
        where: {
          email: "test@example.com",
        },
        include: {
          profiles: true,
          teams: true,
        },
      });

      expect(user).not.toBeNull();
      expect(user?.profiles).not.toBeNull();
      expect(user?.profiles[0].organizationId).toEqual(1);
      expect(user?.teams).not.toBeNull();
      expect(user?.teams[0].teamId).toEqual(1);
    });
  });
});
