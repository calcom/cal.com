import { hashPassword } from "@calcom/lib/auth/hashPassword";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { verifyPasswordHandler } from "./verifyPassword.handler";

let user: User;
const timestamp = Date.now();
const password = "TestPassword123!";

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      identityProvider: u.identityProvider,
      locale: u.locale ?? "en",
      timeZone: u.timeZone ?? "UTC",
      role: u.role,
      organizationId: null,
      organization: { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      profile: {
        id: u.id,
        upId: `usr-${u.id}`,
        username: u.username ?? "",
        userId: u.id,
        organizationId: null,
        organization: null,
      },
    } as unknown as NonNullable<TrpcSessionUser>,
  };
}

describe("auth.verifyPassword - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `auth-verifypw-${timestamp}`,
        email: `auth-verifypw-${timestamp}@example.com`,
        name: "VerifyPassword Test User",
        identityProvider: IdentityProvider.CAL,
      },
    });

    const hashedPassword = await hashPassword(password);
    await prisma.userPassword.create({
      data: {
        userId: user.id,
        hash: hashedPassword,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.userPassword.deleteMany({ where: { userId: user?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should verify correct password without throwing", async () => {
    await expect(
      verifyPasswordHandler({
        ctx: createCtx(user),
        input: { passwordInput: password },
      })
    ).resolves.toBeUndefined();
  });

  it("should throw UNAUTHORIZED when password is incorrect", async () => {
    await expect(
      verifyPasswordHandler({
        ctx: createCtx(user),
        input: { passwordInput: "WrongPassword123!" },
      })
    ).rejects.toThrow();
  });

  it("should throw when user has no password hash", async () => {
    const userNoPassword = await prisma.user.create({
      data: {
        username: `auth-verifypw-nopw-${timestamp}`,
        email: `auth-verifypw-nopw-${timestamp}@example.com`,
        name: "No Password User",
      },
    });

    try {
      await expect(
        verifyPasswordHandler({
          ctx: createCtx(userNoPassword),
          input: { passwordInput: "anything" },
        })
      ).rejects.toThrow();
    } finally {
      await prisma.user.deleteMany({ where: { id: userNoPassword.id } });
    }
  });
});
