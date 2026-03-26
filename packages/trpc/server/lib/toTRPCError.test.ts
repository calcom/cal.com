import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertErrorWithCodeToTRPCError, httpStatusToTrpcCode } from "./toTRPCError";

describe("httpStatusToTrpcCode", () => {
  it.each([
    [400, "BAD_REQUEST"],
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [405, "METHOD_NOT_SUPPORTED"],
    [408, "TIMEOUT"],
    [409, "CONFLICT"],
    [412, "PRECONDITION_FAILED"],
    [413, "PAYLOAD_TOO_LARGE"],
    [422, "UNPROCESSABLE_CONTENT"],
    [429, "TOO_MANY_REQUESTS"],
    [499, "CLIENT_CLOSED_REQUEST"],
    [501, "NOT_IMPLEMENTED"],
  ] as const)("maps HTTP %i to %s", (status, expected) => {
    expect(httpStatusToTrpcCode(status)).toBe(expected);
  });

  it("maps unknown status codes to INTERNAL_SERVER_ERROR", () => {
    expect(httpStatusToTrpcCode(500)).toBe("INTERNAL_SERVER_ERROR");
    expect(httpStatusToTrpcCode(502)).toBe("INTERNAL_SERVER_ERROR");
    expect(httpStatusToTrpcCode(503)).toBe("INTERNAL_SERVER_ERROR");
    expect(httpStatusToTrpcCode(418)).toBe("INTERNAL_SERVER_ERROR");
    expect(httpStatusToTrpcCode(0)).toBe("INTERNAL_SERVER_ERROR");
    expect(httpStatusToTrpcCode(999)).toBe("INTERNAL_SERVER_ERROR");
  });
});

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
