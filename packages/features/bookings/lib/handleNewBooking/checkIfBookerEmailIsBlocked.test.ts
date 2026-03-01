import { ErrorCode } from "@calcom/lib/errorCodes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindVerifiedUserByEmail = vi.fn();
vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: class MockUserRepository {
      findVerifiedUserByEmail = mockFindVerifiedUserByEmail;
    },
  };
});

const mockVerifyCode = vi.fn();
vi.mock("@calcom/features/auth/lib/verifyCodeUnAuthenticated", () => ({
  verifyCodeUnAuthenticated: (...args: unknown[]) => mockVerifyCode(...args),
}));

vi.mock("@calcom/lib/extract-base-email", () => ({
  extractBaseEmail: (email: string) => email.split("+")[0].split("@")[0] + "@" + email.split("@")[1],
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
}));

import { checkIfBookerEmailIsBlocked } from "./checkIfBookerEmailIsBlocked";

describe("checkIfBookerEmailIsBlocked", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindVerifiedUserByEmail.mockResolvedValue(null);
    process.env = { ...originalEnv };
    delete process.env.BLACKLISTED_GUEST_EMAILS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false when email is not blocked and user has no verification requirement", async () => {
    const result = await checkIfBookerEmailIsBlocked({
      bookerEmail: "test@example.com",
      isReschedule: false,
    });

    expect(result).toBe(false);
  });

  it("throws BookerEmailBlocked when email is in BLACKLISTED_GUEST_EMAILS and no user found", async () => {
    process.env.BLACKLISTED_GUEST_EMAILS = "blocked@example.com,spam@example.com";

    await expect(
      checkIfBookerEmailIsBlocked({
        bookerEmail: "blocked@example.com",
        isReschedule: false,
      })
    ).rejects.toThrow("Cannot use this email to create the booking.");
  });

  it("blacklist matching is case-insensitive", async () => {
    process.env.BLACKLISTED_GUEST_EMAILS = "Blocked@Example.com";

    await expect(
      checkIfBookerEmailIsBlocked({
        bookerEmail: "blocked@example.com",
        isReschedule: false,
      })
    ).rejects.toThrow("Cannot use this email to create the booking.");
  });

  it("throws BookerEmailRequiresLogin when user requires verification and no code provided", async () => {
    mockFindVerifiedUserByEmail.mockResolvedValue({
      id: 42,
      email: "verified@example.com",
      requiresBookerEmailVerification: true,
    });

    await expect(
      checkIfBookerEmailIsBlocked({
        bookerEmail: "verified@example.com",
        isReschedule: false,
      })
    ).rejects.toThrow(/Attendee email has been blocked/);
  });

  it("returns false when user requires verification but this is a reschedule", async () => {
    mockFindVerifiedUserByEmail.mockResolvedValue({
      id: 42,
      email: "verified@example.com",
      requiresBookerEmailVerification: true,
    });

    const result = await checkIfBookerEmailIsBlocked({
      bookerEmail: "verified@example.com",
      isReschedule: true,
    });

    expect(result).toBe(false);
  });

  it("returns false when user requires verification and loggedInUserId matches", async () => {
    mockFindVerifiedUserByEmail.mockResolvedValue({
      id: 42,
      email: "verified@example.com",
      requiresBookerEmailVerification: true,
    });

    const result = await checkIfBookerEmailIsBlocked({
      bookerEmail: "verified@example.com",
      loggedInUserId: 42,
      isReschedule: false,
    });

    expect(result).toBeUndefined();
  });

  it("returns false when verification code is valid", async () => {
    mockFindVerifiedUserByEmail.mockResolvedValue({
      id: 42,
      email: "verified@example.com",
      requiresBookerEmailVerification: true,
    });
    mockVerifyCode.mockResolvedValue(true);

    const result = await checkIfBookerEmailIsBlocked({
      bookerEmail: "verified@example.com",
      verificationCode: "123456",
      isReschedule: false,
    });

    expect(result).toBe(false);
    expect(mockVerifyCode).toHaveBeenCalledWith("verified@example.com", "123456");
  });

  it("throws InvalidVerificationCode when code is invalid", async () => {
    mockFindVerifiedUserByEmail.mockResolvedValue({
      id: 42,
      email: "verified@example.com",
      requiresBookerEmailVerification: true,
    });
    mockVerifyCode.mockResolvedValue(false);

    await expect(
      checkIfBookerEmailIsBlocked({
        bookerEmail: "verified@example.com",
        verificationCode: "wrong-code",
        isReschedule: false,
      })
    ).rejects.toThrow("Invalid verification code");
  });

  it("throws UnableToValidateVerificationCode when verifyCode throws", async () => {
    mockFindVerifiedUserByEmail.mockResolvedValue({
      id: 42,
      email: "verified@example.com",
      requiresBookerEmailVerification: true,
    });
    mockVerifyCode.mockRejectedValue(new Error("Service unavailable"));

    await expect(
      checkIfBookerEmailIsBlocked({
        bookerEmail: "verified@example.com",
        verificationCode: "123456",
        isReschedule: false,
      })
    ).rejects.toThrow("There was an error validating the verification code");
  });

  it("does not require verification when user has requiresBookerEmailVerification=false", async () => {
    mockFindVerifiedUserByEmail.mockResolvedValue({
      id: 42,
      email: "verified@example.com",
      requiresBookerEmailVerification: false,
    });

    const result = await checkIfBookerEmailIsBlocked({
      bookerEmail: "verified@example.com",
      isReschedule: false,
    });

    expect(result).toBe(false);
  });
});
