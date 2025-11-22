import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

import { VerificationTokenRepository } from "@calcom/lib/server/repository/verificationToken";

import { VerificationTokenService } from "../VerificationTokenService";

vi.mock("@calcom/lib/server/repository/verificationToken", () => ({
  VerificationTokenRepository: {
    create: vi.fn(),
  },
}));

describe("VerificationTokenService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXTAUTH_SECRET = "test-secret";

    vi.mocked(VerificationTokenRepository.create).mockResolvedValue({
      identifier: "test@example.com",
      token: "hashed-token",
      expires: new Date(),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("create", () => {
    test("should create a verification token and return unhashed token", async () => {
      const identifier = "test@example.com";
      const expires = new Date(Date.now() + 86400 * 1000);

      const result = await VerificationTokenService.create({
        identifier,
        expires,
      });

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(VerificationTokenRepository.create).toHaveBeenCalled();
    });

    test("should call repository with correct identifier and expires", async () => {
      const identifier = "user@example.com";
      const expires = new Date("2025-12-31T23:59:59.000Z");

      await VerificationTokenService.create({
        identifier,
        expires,
      });

      expect(VerificationTokenRepository.create).toHaveBeenCalledWith({
        identifier,
        token: expect.any(String),
        expires,
      });

      const callArgs = vi.mocked(VerificationTokenRepository.create).mock.calls[0][0];
      expect(callArgs.identifier).toBe(identifier);
      expect(callArgs.expires).toBe(expires);
      expect(callArgs.token).toBeTruthy();
    });

    test("should hash token with NEXTAUTH_SECRET", async () => {
      const identifier = "test@example.com";
      const expires = new Date(Date.now() + 86400 * 1000);

      await VerificationTokenService.create({
        identifier,
        expires,
      });

      const callArgs = vi.mocked(VerificationTokenRepository.create).mock.calls[0][0];
      // The hashed token should be a 64-character hex string (SHA-256)
      expect(callArgs.token).toMatch(/^[a-f0-9]{64}$/);
    });

    test("should generate unique tokens on multiple calls", async () => {
      const identifier = "test@example.com";
      const expires = new Date(Date.now() + 86400 * 1000);

      const result1 = await VerificationTokenService.create({
        identifier,
        expires,
      });

      const result2 = await VerificationTokenService.create({
        identifier,
        expires,
      });

      expect(result1).not.toBe(result2);
      expect(VerificationTokenRepository.create).toHaveBeenCalledTimes(2);
    });

    test("should handle Date objects for expires", async () => {
      const identifier = "test@example.com";
      const expires = new Date(2025, 11, 31, 23, 59, 59);

      await VerificationTokenService.create({
        identifier,
        expires,
      });

      expect(VerificationTokenRepository.create).toHaveBeenCalledWith({
        identifier,
        token: expect.any(String),
        expires: expect.any(Date),
      });

      const callArgs = vi.mocked(VerificationTokenRepository.create).mock.calls[0][0];
      expect(callArgs.expires).toBeInstanceOf(Date);
      expect(callArgs.expires.getTime()).toBe(expires.getTime());
    });

    test("should generate 32-byte random token in hex format", async () => {
      const identifier = "test@example.com";
      const expires = new Date(Date.now() + 86400 * 1000);

      const token = await VerificationTokenService.create({
        identifier,
        expires,
      });

      // 32 bytes = 64 hex characters
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
