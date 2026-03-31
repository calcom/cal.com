import { ErrorCode } from "@calcom/lib/errorCodes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindVerifiedUserByEmail = vi.fn();

const mockVerifyCode = vi.fn();
vi.mock("@calcom/features/auth/lib/verifyCodeUnAuthenticated", () => ({
  verifyCodeUnAuthenticated: (...args: unknown[]) => mockVerifyCode(...args),
}));

vi.mock("@calcom/lib/extract-base-email", () => ({
  extractBaseEmail: (email: string) => email.split("+")[0].split("@")[0] + "@" + email.split("@")[1],
}));

import { checkIfBookerEmailIsBlocked } from "./checkIfBookerEmailIsBlocked";

import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

const mockUserRepository = {
  findVerifiedUserByEmail: mockFindVerifiedUserByEmail,
} as unknown as UserRepository;

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
      userRepository: mockUserRepository,
    });

    expect(result).toBe(false);
  });

  it("throws BookerEmailBlocked when email is in BLACKLISTED_GUEST_EMAILS and no user found", async () => {
    process.env.BLACKLISTED_GUEST_EMAILS = "blocked@example.com,spam@example.com";

    await expect(
      checkIfBookerEmailIsBlocked({
        bookerEmail: "blocked@example.com",
        isReschedule: false,
        userRepository: mockUserRepository,
      })
    ).rejects.toThrow("Cannot use this email to create the booking.");
  });

  it("blacklist matching is case-insensitive", async () => {
    process.env.BLACKLISTED_GUEST_EMAILS = "Blocked@Example.com";

    await expect(
      checkIfBookerEmailIsBlocked({
        bookerEmail: "blocked@example.com",
        isReschedule: false,
        userRepository: mockUserRepository,
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
        userRepository: mockUserRepository,
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
      userRepository: mockUserRepository,
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
      userRepository: mockUserRepository,
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
      userRepository: mockUserRepository,
    });

    expect(result).toBe(false);
    expect(mockVerifyCode).toHaveBeenCalledWith("verified@example.com", "123456");
  });

  it("passes base email (not plus-addressed) to verifyCode when booker uses plus-addressing", async () => {
    mockFindVerifiedUserByEmail.mockResolvedValue({
      id: 42,
      email: "user@example.com",
      requiresBookerEmailVerification: true,
    });
    mockVerifyCode.mockResolvedValue(true);

    const result = await checkIfBookerEmailIsBlocked({
      bookerEmail: "user+tag@example.com",
      verificationCode: "123456",
      isReschedule: false,
      userRepository: mockUserRepository,
    });

    expect(result).toBe(false);
    expect(mockVerifyCode).toHaveBeenCalledWith("user@example.com", "123456");
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
        userRepository: mockUserRepository,
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
        userRepository: mockUserRepository,
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
      userRepository: mockUserRepository,
    });

    expect(result).toBe(false);
  });
});
