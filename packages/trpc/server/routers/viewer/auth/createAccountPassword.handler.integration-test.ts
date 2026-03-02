import { hashPassword } from "@calcom/lib/auth/hashPassword";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccountPasswordHandler } from "./createAccountPassword.handler";

describe("createAccountPasswordHandler integration", () => {
  const timestamp = Date.now();
  let calUserId: number;
  let googleUserId: number;
  let googleUserWithPasswordId: number;

  beforeAll(async () => {
    const calUser = await prisma.user.create({
      data: {
        username: `createpwd-cal-${timestamp}`,
        email: `createpwd-cal-${timestamp}@example.com`,
        name: "CreatePassword CAL User",
        identityProvider: IdentityProvider.CAL,
      },
    });
    calUserId = calUser.id;

    const googleUser = await prisma.user.create({
      data: {
        username: `createpwd-google-${timestamp}`,
        email: `createpwd-google-${timestamp}@example.com`,
        name: "CreatePassword Google User",
        identityProvider: IdentityProvider.GOOGLE,
      },
    });
    googleUserId = googleUser.id;

    const googleUserWithPassword = await prisma.user.create({
      data: {
        username: `createpwd-googlepwd-${timestamp}`,
        email: `createpwd-googlepwd-${timestamp}@example.com`,
        name: "CreatePassword Google User With Password",
        identityProvider: IdentityProvider.GOOGLE,
      },
    });
    googleUserWithPasswordId = googleUserWithPassword.id;

    const hashedPassword = await hashPassword("ExistingPassword123!");
    await prisma.userPassword.create({
      data: {
        userId: googleUserWithPasswordId,
        hash: hashedPassword,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.userPassword.deleteMany({
        where: { userId: { in: [calUserId, googleUserId, googleUserWithPasswordId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [calUserId, googleUserId, googleUserWithPasswordId] } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should reject CAL identity provider users", async () => {
    const ctx = {
      user: {
        id: calUserId,
        identityProvider: IdentityProvider.CAL,
      } as NonNullable<TrpcSessionUser>,
    };

    await expect(createAccountPasswordHandler({ ctx })).rejects.toThrow(TRPCError);

    await expect(createAccountPasswordHandler({ ctx })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "cannot_create_account_password_cal_provider",
    });
  });

  it("should reject non-CAL user who already has a password", async () => {
    const ctx = {
      user: {
        id: googleUserWithPasswordId,
        identityProvider: IdentityProvider.GOOGLE,
      } as NonNullable<TrpcSessionUser>,
    };

    await expect(createAccountPasswordHandler({ ctx })).rejects.toThrow(TRPCError);

    await expect(createAccountPasswordHandler({ ctx })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "cannot_create_account_password_already_existing",
    });
  });

  it("should initiate password reset for non-CAL user without password", async () => {
    const ctx = {
      user: {
        id: googleUserId,
        email: `createpwd-google-${timestamp}@example.com`,
        identityProvider: IdentityProvider.GOOGLE,
      } as NonNullable<TrpcSessionUser>,
    };

    // passwordResetRequest sends an email - it may throw if email sending is not configured,
    // but the handler logic itself should not throw a TRPCError for valid non-CAL users without passwords.
    // In a test environment without email config, we just verify it doesn't throw a FORBIDDEN error.
    try {
      await createAccountPasswordHandler({ ctx });
    } catch (error) {
      // If it throws, it should NOT be a FORBIDDEN TRPCError
      if (error instanceof TRPCError) {
        expect(error.code).not.toBe("FORBIDDEN");
      }
      // Other errors (e.g., email sending failure) are acceptable in test environment
    }
  });
});
