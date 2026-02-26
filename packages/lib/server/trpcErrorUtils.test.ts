import { describe, expect, it } from "vitest";
import { getHTTPStatusCodeFromTRPCErrorLike, isTRPCErrorLike } from "./trpcErrorUtils";

describe("isTRPCErrorLike", () => {
  it("returns true for a valid TRPCError-like object", () => {
    const err = { name: "TRPCError", code: "BAD_REQUEST", message: "Invalid input" };
    expect(isTRPCErrorLike(err)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isTRPCErrorLike(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isTRPCErrorLike(undefined)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isTRPCErrorLike("error")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isTRPCErrorLike(42)).toBe(false);
  });

  it("returns false when name is not 'TRPCError'", () => {
    const err = { name: "Error", code: "BAD_REQUEST", message: "test" };
    expect(isTRPCErrorLike(err)).toBe(false);
  });

  it("returns false when code is missing", () => {
    const err = { name: "TRPCError", message: "test" };
    expect(isTRPCErrorLike(err)).toBe(false);
  });

  it("returns false when message is missing", () => {
    const err = { name: "TRPCError", code: "BAD_REQUEST" };
    expect(isTRPCErrorLike(err)).toBe(false);
  });

  it("returns false when code is not a string", () => {
    const err = { name: "TRPCError", code: 400, message: "test" };
    expect(isTRPCErrorLike(err)).toBe(false);
  });

  it("returns false when message is not a string", () => {
    const err = { name: "TRPCError", code: "BAD_REQUEST", message: 123 };
    expect(isTRPCErrorLike(err)).toBe(false);
  });

  it("returns false for a regular Error instance", () => {
    const err = new Error("regular error");
    expect(isTRPCErrorLike(err)).toBe(false);
  });

  it("returns true for object with additional properties beyond required ones", () => {
    const err = { name: "TRPCError", code: "NOT_FOUND", message: "not found", extra: true };
    expect(isTRPCErrorLike(err)).toBe(true);
  });
});

describe("getHTTPStatusCodeFromTRPCErrorLike", () => {
  it("maps PARSE_ERROR to 400", () => {
    expect(getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "PARSE_ERROR", message: "" })).toBe(
      400
    );
  });

  it("maps BAD_REQUEST to 400", () => {
    expect(getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "BAD_REQUEST", message: "" })).toBe(
      400
    );
  });

  it("maps UNAUTHORIZED to 401", () => {
    expect(getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "UNAUTHORIZED", message: "" })).toBe(
      401
    );
  });

  it("maps NOT_FOUND to 404", () => {
    expect(getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "NOT_FOUND", message: "" })).toBe(
      404
    );
  });

  it("maps FORBIDDEN to 403", () => {
    expect(getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "FORBIDDEN", message: "" })).toBe(
      403
    );
  });

  it("maps TOO_MANY_REQUESTS to 429", () => {
    expect(
      getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "TOO_MANY_REQUESTS", message: "" })
    ).toBe(429);
  });

  it("maps INTERNAL_SERVER_ERROR to 500", () => {
    expect(
      getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "INTERNAL_SERVER_ERROR", message: "" })
    ).toBe(500);
  });

  it("maps CONFLICT to 409", () => {
    expect(getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "CONFLICT", message: "" })).toBe(
      409
    );
  });

  it("maps TIMEOUT to 408", () => {
    expect(getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "TIMEOUT", message: "" })).toBe(408);
  });

  it("defaults to 500 for unknown error codes", () => {
    expect(getHTTPStatusCodeFromTRPCErrorLike({ name: "TRPCError", code: "UNKNOWN_CODE", message: "" })).toBe(
      500
    );
  });
});
