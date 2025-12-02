import { describe, it, expect, vi, beforeEach } from "vitest";

import { TRPCError } from "@trpc/server";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import { toTRPCError } from "./toTRPCError";

describe("toTRPCError", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns TRPCError unchanged", () => {
    const original = new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });

    const result = toTRPCError(original);

    expect(result).toBe(original);
    expect(result.code).toBe("NOT_FOUND");
    expect(result.message).toBe("Resource not found");
  });

  it("converts ErrorWithCode with Forbidden code to TRPCError with FORBIDDEN", () => {
    const error = new ErrorWithCode(ErrorCode.Forbidden, "This invitation is not for your account");

    const result = toTRPCError(error);

    expect(result).toBeInstanceOf(TRPCError);
    expect(result.code).toBe("FORBIDDEN");
    expect(result.message).toBe("This invitation is not for your account");
  });

  it("converts ErrorWithCode with NotFound code to TRPCError with NOT_FOUND", () => {
    const error = new ErrorWithCode(ErrorCode.NotFound, "User not found");

    const result = toTRPCError(error);

    expect(result).toBeInstanceOf(TRPCError);
    expect(result.code).toBe("NOT_FOUND");
    expect(result.message).toBe("User not found");
  });

  it("converts ErrorWithCode with Unauthorized code to TRPCError with UNAUTHORIZED", () => {
    const error = new ErrorWithCode(ErrorCode.Unauthorized, "Not authenticated");

    const result = toTRPCError(error);

    expect(result).toBeInstanceOf(TRPCError);
    expect(result.code).toBe("UNAUTHORIZED");
    expect(result.message).toBe("Not authenticated");
  });

  it("converts ErrorWithCode with BadRequest code to TRPCError with BAD_REQUEST", () => {
    const error = new ErrorWithCode(ErrorCode.BadRequest, "Invalid input");

    const result = toTRPCError(error);

    expect(result).toBeInstanceOf(TRPCError);
    expect(result.code).toBe("BAD_REQUEST");
    expect(result.message).toBe("Invalid input");
  });

  it("converts generic Error to TRPCError with INTERNAL_SERVER_ERROR", () => {
    const error = new Error("Something went wrong");

    const result = toTRPCError(error);

    expect(result).toBeInstanceOf(TRPCError);
    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.cause).toBe(error);
  });

  it("converts string error to TRPCError with INTERNAL_SERVER_ERROR", () => {
    const result = toTRPCError("Something went wrong");

    expect(result).toBeInstanceOf(TRPCError);
    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe("Something went wrong");
  });

  it("converts unknown error type to TRPCError with INTERNAL_SERVER_ERROR", () => {
    const result = toTRPCError({ unexpected: "object" });

    expect(result).toBeInstanceOf(TRPCError);
    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
