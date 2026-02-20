import process from "node:process";
import { SecondaryEmailRepository } from "@calcom/features/users/repositories/SecondaryEmailRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { prisma } from "@calcom/prisma";
import { CreationSource } from "@calcom/prisma/enums";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TestUserRepository } from "./TestUserRepository";

vi.mock("@calcom/features/auth/lib/verifyCodeUnAuthenticated", () => ({
  verifyCodeUnAuthenticated: vi.fn(),
}));

const userRepository = new UserRepository(prisma);
const secondaryEmailRepository = new SecondaryEmailRepository(prisma);
const testUserRepository = new TestUserRepository(prisma);
const createdUserIds: number[] = [];

async function createTestUser({
  email,
  emailVerified = new Date(),
  requiresBookerEmailVerification = false,
  locked = false,
}: {
  email: string;
  emailVerified?: Date | null;
  requiresBookerEmailVerification?: boolean;
  locked?: boolean;
}) {
  const user = await userRepository.create({
    email,
    emailVerified,
    requiresBookerEmailVerification,
    locked,
    username: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    organizationId: null,
    creationSource: CreationSource.WEBAPP,
  });
  createdUserIds.push(user.id);
  return user;
}

async function createTestSecondaryEmail({
  userId,
  email,
  emailVerified = new Date(),
}: {
  userId: number;
  email: string;
  emailVerified?: Date | null;
}) {
  return secondaryEmailRepository.create({ userId, email, emailVerified });
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await testUserRepository.deleteByIds({ ids: createdUserIds });
    createdUserIds.length = 0;
  }
  delete process.env.BLACKLISTED_GUEST_EMAILS;
  vi.clearAllMocks();
});

describe("checkIfBookerEmailIsBlocked - integration", () => {
  describe("no matching user", () => {
    it("should return false when email is not found", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: `nonexistent-${Date.now()}@test-integration.com`,
        isReschedule: false,
      });

      expect(result).toBe(false);
    });

    it("should throw BookerEmailBlocked when email is env-blacklisted but no user exists", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const email = `blacklisted-nouser-${Date.now()}@test-integration.com`;
      process.env.BLACKLISTED_GUEST_EMAILS = email;

      await expect(
        checkIfBookerEmailIsBlocked({
          bookerEmail: email,
          isReschedule: false,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.BookerEmailBlocked,
        })
      );
    });
  });

  describe("primary email match", () => {
    it("should return false when user does not require booker email verification", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const email = `primary-noverify-${Date.now()}@test-integration.com`;

      await createTestUser({ email, requiresBookerEmailVerification: false });

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: email,
        isReschedule: false,
      });

      expect(result).toBe(false);
    });

    it("should throw BookerEmailRequiresLogin when user requires verification and booker is not logged in", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const email = `primary-verify-${Date.now()}@test-integration.com`;

      await createTestUser({ email, requiresBookerEmailVerification: true });

      await expect(
        checkIfBookerEmailIsBlocked({
          bookerEmail: email,
          isReschedule: false,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.BookerEmailRequiresLogin,
        })
      );
    });

    it("should return false when user requires verification but isReschedule is true", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const email = `primary-resched-${Date.now()}@test-integration.com`;

      await createTestUser({ email, requiresBookerEmailVerification: true });

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: email,
        isReschedule: true,
      });

      expect(result).toBe(false);
    });

    it("should not block when loggedInUserId matches the found user", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const email = `primary-loggedin-${Date.now()}@test-integration.com`;

      const user = await createTestUser({ email, requiresBookerEmailVerification: true });

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: email,
        loggedInUserId: user.id,
        isReschedule: false,
      });

      expect(result).toBeUndefined();
    });

    it("should not find user when primary email is unverified", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const email = `primary-unverified-${Date.now()}@test-integration.com`;

      await createTestUser({ email, emailVerified: null, requiresBookerEmailVerification: true });

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: email,
        isReschedule: false,
      });

      expect(result).toBe(false);
    });
  });

  describe("secondary email match", () => {
    it("should throw when secondary email user requires verification", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const ts = Date.now();
      const primaryEmail = `primary-sec-${ts}@test-integration.com`;
      const secondaryEmail = `secondary-${ts}@test-integration.com`;

      const user = await createTestUser({
        email: primaryEmail,
        requiresBookerEmailVerification: true,
      });
      await createTestSecondaryEmail({ userId: user.id, email: secondaryEmail });

      await expect(
        checkIfBookerEmailIsBlocked({
          bookerEmail: secondaryEmail,
          isReschedule: false,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.BookerEmailRequiresLogin,
        })
      );
    });

    it("should return false when secondary email user does not require verification", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const ts = Date.now();
      const primaryEmail = `primary-secnoverify-${ts}@test-integration.com`;
      const secondaryEmail = `secondary-noverify-${ts}@test-integration.com`;

      const user = await createTestUser({
        email: primaryEmail,
        requiresBookerEmailVerification: false,
      });
      await createTestSecondaryEmail({ userId: user.id, email: secondaryEmail });

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: secondaryEmail,
        isReschedule: false,
      });

      expect(result).toBe(false);
    });

    it("should not find user when secondary email is unverified", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const ts = Date.now();
      const primaryEmail = `primary-secunverif-${ts}@test-integration.com`;
      const secondaryEmail = `secondary-unverif-${ts}@test-integration.com`;

      const user = await createTestUser({
        email: primaryEmail,
        requiresBookerEmailVerification: true,
      });
      await createTestSecondaryEmail({ userId: user.id, email: secondaryEmail, emailVerified: null });

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: secondaryEmail,
        isReschedule: false,
      });

      expect(result).toBe(false);
    });
  });

  describe("plus-addressed email handling", () => {
    it("should match plus-addressed email to base email user", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const baseEmail = `plustest-${Date.now()}@test-integration.com`;

      await createTestUser({ email: baseEmail, requiresBookerEmailVerification: true });

      const plusEmail = baseEmail.replace("@", "+tag@");

      await expect(
        checkIfBookerEmailIsBlocked({
          bookerEmail: plusEmail,
          isReschedule: false,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.BookerEmailRequiresLogin,
        })
      );
    });
  });

  describe("env blacklist with existing user", () => {
    it("should throw BookerEmailRequiresLogin when blacklisted and user exists", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const email = `blacklisted-${Date.now()}@test-integration.com`;

      await createTestUser({ email, requiresBookerEmailVerification: false });
      process.env.BLACKLISTED_GUEST_EMAILS = email;

      await expect(
        checkIfBookerEmailIsBlocked({
          bookerEmail: email,
          isReschedule: false,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.BookerEmailRequiresLogin,
        })
      );
    });

    it("should allow blacklisted email when user is logged in as that user", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const email = `blacklisted-loggedin-${Date.now()}@test-integration.com`;

      const user = await createTestUser({ email, requiresBookerEmailVerification: false });
      process.env.BLACKLISTED_GUEST_EMAILS = email;

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: email,
        loggedInUserId: user.id,
        isReschedule: false,
      });

      expect(result).toBeUndefined();
    });
  });

  describe("verification code handling", () => {
    it("should return false when valid verification code is provided", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const { verifyCodeUnAuthenticated } = await import(
        "@calcom/features/auth/lib/verifyCodeUnAuthenticated"
      );
      vi.mocked(verifyCodeUnAuthenticated).mockResolvedValue(true as never);

      const email = `verify-valid-${Date.now()}@test-integration.com`;
      await createTestUser({ email, requiresBookerEmailVerification: true });

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: email,
        verificationCode: "valid-code",
        isReschedule: false,
      });

      expect(result).toBe(false);
      expect(verifyCodeUnAuthenticated).toHaveBeenCalledWith(email, "valid-code");
    });

    it("should throw InvalidVerificationCode when code is invalid", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const { verifyCodeUnAuthenticated } = await import(
        "@calcom/features/auth/lib/verifyCodeUnAuthenticated"
      );
      vi.mocked(verifyCodeUnAuthenticated).mockResolvedValue(false as never);

      const email = `verify-invalid-${Date.now()}@test-integration.com`;
      await createTestUser({ email, requiresBookerEmailVerification: true });

      await expect(
        checkIfBookerEmailIsBlocked({
          bookerEmail: email,
          verificationCode: "bad-code",
          isReschedule: false,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.InvalidVerificationCode,
        })
      );
    });

    it("should throw UnableToValidateVerificationCode when verification service throws", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const { verifyCodeUnAuthenticated } = await import(
        "@calcom/features/auth/lib/verifyCodeUnAuthenticated"
      );
      vi.mocked(verifyCodeUnAuthenticated).mockRejectedValue(new Error("Service unavailable"));

      const email = `verify-error-${Date.now()}@test-integration.com`;
      await createTestUser({ email, requiresBookerEmailVerification: true });

      await expect(
        checkIfBookerEmailIsBlocked({
          bookerEmail: email,
          verificationCode: "some-code",
          isReschedule: false,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.UnableToValidateVerificationCode,
        })
      );
    });
  });

  describe("locked user filtering (via Prisma extension)", () => {
    it("should not find a locked user by primary email", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const email = `locked-user-${Date.now()}@test-integration.com`;

      await createTestUser({ email, requiresBookerEmailVerification: true, locked: true });

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: email,
        isReschedule: false,
      });

      expect(result).toBe(false);
    });

    it("should not find a locked user by secondary email", async () => {
      const { checkIfBookerEmailIsBlocked } = await import("../checkIfBookerEmailIsBlocked");
      const ts = Date.now();
      const primaryEmail = `locked-primary-${ts}@test-integration.com`;
      const secondaryEmail = `locked-secondary-${ts}@test-integration.com`;

      const user = await createTestUser({
        email: primaryEmail,
        requiresBookerEmailVerification: true,
        locked: true,
      });
      await createTestSecondaryEmail({ userId: user.id, email: secondaryEmail });

      const result = await checkIfBookerEmailIsBlocked({
        bookerEmail: secondaryEmail,
        isReschedule: false,
      });

      expect(result).toBe(false);
    });
  });
});
