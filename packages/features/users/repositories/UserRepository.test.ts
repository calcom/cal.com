import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, test, vi, expect, beforeEach } from "vitest";

import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { CreationSource } from "@calcom/prisma/enums";

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

  describe("countLockedSince", () => {
    test("returns 0 when no locked users exist", async () => {
      const count = await new UserRepository(prismock).countLockedSince({
        since: new Date(Date.now() - 5 * 60 * 1000),
      });

      expect(count).toBe(0);
    });

    test("counts locked users whose emailVerified is within the window", async () => {
      const now = new Date();
      const withinWindow = new Date(now.getTime() - 60_000); // 1 min ago

      await prismock.user.create({
        data: {
          username: "locked-recent",
          email: "locked-recent@example.com",
          locked: true,
          emailVerified: withinWindow,
        },
      });

      const count = await new UserRepository(prismock).countLockedSince({
        since: new Date(now.getTime() - 5 * 60 * 1000),
      });

      expect(count).toBe(1);
    });

    test("does not count locked users whose emailVerified is before the window", async () => {
      const now = new Date();
      const beforeWindow = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago

      await prismock.user.create({
        data: {
          username: "locked-old",
          email: "locked-old@example.com",
          locked: true,
          emailVerified: beforeWindow,
        },
      });

      const count = await new UserRepository(prismock).countLockedSince({
        since: new Date(now.getTime() - 5 * 60 * 1000),
      });

      expect(count).toBe(0);
    });

    test("does not count unlocked users even if emailVerified is within the window", async () => {
      const now = new Date();
      const withinWindow = new Date(now.getTime() - 60_000);

      await prismock.user.create({
        data: {
          username: "unlocked-recent",
          email: "unlocked-recent@example.com",
          locked: false,
          emailVerified: withinWindow,
        },
      });

      const count = await new UserRepository(prismock).countLockedSince({
        since: new Date(now.getTime() - 5 * 60 * 1000),
      });

      expect(count).toBe(0);
    });
  });
});
