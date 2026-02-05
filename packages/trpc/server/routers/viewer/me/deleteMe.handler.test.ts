import { describe, it, expect, vi, beforeEach } from "vitest";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { isPasswordValid } from "@calcom/lib/auth/isPasswordValid";
import { HttpError } from "@calcom/lib/http-error";

import { deleteMeHandler } from "./deleteMe.handler";

vi.mock("@calcom/lib/auth/isPasswordValid", () => ({
  isPasswordValid: vi.fn(),
}));

describe("deleteMeHandler", () => {
  const mockIsPasswordValid = vi.mocked(isPasswordValid);

  const mockUser = {
    id: 123,
    name: "Test User",
    email: "test@example.com",
    role: "USER" as const,
  };

  const mockCtx = {
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CALENDSO_ENCRYPTION_KEY = "test-encryption-key-32-characters";
  });

  describe("Password validation", () => {
    it("should throw error when password is missing", async () => {
      await expect(
        deleteMeHandler({
          ctx: mockCtx,
          input: { password: "" },
        })
      ).rejects.toThrow(new HttpError({ statusCode: 400, message: ErrorCode.UserMissingPassword }));
    });

    it("should throw error when password is only whitespace", async () => {
      await expect(
        deleteMeHandler({
          ctx: mockCtx,
          input: { password: "   " },
        })
      ).rejects.toThrow(new HttpError({ statusCode: 400, message: ErrorCode.UserMissingPassword }));
    });

    it("should validate password with strict mode for non-USER roles", async () => {
      const adminCtx = {
        user: { ...mockUser, role: "ADMIN" as const },
      };

      mockIsPasswordValid.mockReturnValue(false);

      await expect(
        deleteMeHandler({
          ctx: adminCtx,
          input: { password: "weak" },
        })
      ).rejects.toThrow(new HttpError({ statusCode: 400, message: ErrorCode.PasswordPolicyViolation }));

      expect(mockIsPasswordValid).toHaveBeenCalledWith("weak", false, true);
    });

    it("should validate password with non-strict mode for USER role", async () => {
      mockIsPasswordValid.mockReturnValue(false);

      await expect(
        deleteMeHandler({
          ctx: mockCtx,
          input: { password: "weak" },
        })
      ).rejects.toThrow(new HttpError({ statusCode: 400, message: ErrorCode.PasswordPolicyViolation }));

      expect(mockIsPasswordValid).toHaveBeenCalledWith("weak", false, false);
    });
  });
});
