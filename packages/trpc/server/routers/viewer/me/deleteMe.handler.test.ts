import { describe, it, expect } from "vitest";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { HttpError } from "@calcom/lib/http-error";

import { deleteMeHandler } from "./deleteMe.handler";
import type { DeleteMeOptions } from "./deleteMe.handler";
  
const makeMockCtx = (role: "USER" | "ADMIN" = "USER") =>
  ({
    user: {
      id: 123,
      name: "Test User",
      email: "test@example.com",
      role,
    },
  } as DeleteMeOptions["ctx"]);

describe("deleteMeHandler", () => {
  describe("Password presence validation", () => {
    it("should throw error when password is empty", async () => {
      await expect(
        deleteMeHandler({
          ctx: makeMockCtx(),
          input: { password: "" },
        })
      ).rejects.toThrow(new HttpError({ statusCode: 400, message: ErrorCode.UserMissingPassword }));
    });

    it("should throw error when password is only whitespace", async () => {
      await expect(
        deleteMeHandler({
          ctx: makeMockCtx(),
          input: { password: "   " },
        })
      ).rejects.toThrow(new HttpError({ statusCode: 400, message: ErrorCode.UserMissingPassword }));
    });
  });

  describe("Password policy validation", () => {
    it("should throw error for a weak password (USER role)", async () => {
      await expect(
        deleteMeHandler({
          ctx: makeMockCtx("USER"),
          input: { password: "weak" },
        })
      ).rejects.toThrow(
        new HttpError({ statusCode: 400, message: ErrorCode.PasswordPolicyViolation })
      );
    });

    it("should throw error for a weak password (ADMIN role)", async () => {
      await expect(
        deleteMeHandler({
          ctx: makeMockCtx("ADMIN"),
          input: { password: "weak" },
        })
      ).rejects.toThrow(
        new HttpError({ statusCode: 400, message: ErrorCode.PasswordPolicyViolation })
      );
    });
  });
});