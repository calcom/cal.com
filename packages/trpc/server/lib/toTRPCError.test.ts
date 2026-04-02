import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertErrorWithCodeToTRPCError } from "./toTRPCError";

describe("convertErrorWithCodeToTRPCError", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("converts ErrorWithCode with Forbidden code to TRPCError with FORBIDDEN", () => {
    const error = new ErrorWithCode(ErrorCode.Forbidden, "This invitation is not for your account");

    const result = convertErrorWithCodeToTRPCError(error);

    expect(result).toBeInstanceOf(TRPCError);
    expect((result as TRPCError).code).toBe("FORBIDDEN");
    expect((result as TRPCError).message).toBe("This invitation is not for your account");
  });

  it("converts ErrorWithCode with NotFound code to TRPCError with NOT_FOUND", () => {
    const error = new ErrorWithCode(ErrorCode.NotFound, "User not found");

    const result = convertErrorWithCodeToTRPCError(error);

    expect(result).toBeInstanceOf(TRPCError);
    expect((result as TRPCError).code).toBe("NOT_FOUND");
    expect((result as TRPCError).message).toBe("User not found");
  });

  it("converts ErrorWithCode with Unauthorized code to TRPCError with UNAUTHORIZED", () => {
    const error = new ErrorWithCode(ErrorCode.Unauthorized, "Not authenticated");

    const result = convertErrorWithCodeToTRPCError(error);

    expect(result).toBeInstanceOf(TRPCError);
    expect((result as TRPCError).code).toBe("UNAUTHORIZED");
    expect((result as TRPCError).message).toBe("Not authenticated");
  });

  it("converts ErrorWithCode with BadRequest code to TRPCError with BAD_REQUEST", () => {
    const error = new ErrorWithCode(ErrorCode.BadRequest, "Invalid input");

    const result = convertErrorWithCodeToTRPCError(error);

    expect(result).toBeInstanceOf(TRPCError);
    expect((result as TRPCError).code).toBe("BAD_REQUEST");
    expect((result as TRPCError).message).toBe("Invalid input");
  });

  it("returns generic Error unchanged", () => {
    const error = new Error("Something went wrong");

    const result = convertErrorWithCodeToTRPCError(error);

    expect(result).toBe(error);
    expect(result).not.toBeInstanceOf(TRPCError);
  });

  it("returns TRPCError unchanged", () => {
    const error = new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });

    const result = convertErrorWithCodeToTRPCError(error);

    expect(result).toBe(error);
  });

  it("returns string error unchanged", () => {
    const error = "Something went wrong";

    const result = convertErrorWithCodeToTRPCError(error);

    expect(result).toBe(error);
  });

  it("returns unknown error type unchanged", () => {
    const error = { unexpected: "object" };

    const result = convertErrorWithCodeToTRPCError(error);

    expect(result).toBe(error);
  });
});
