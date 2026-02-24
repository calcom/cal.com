import { ErrorCode } from "@calcom/lib/errorCodes";
import { describe, expect, it } from "vitest";
import { ErrorWithCode, getErrorFromUnknown, handleErrorsJson, handleErrorsRaw } from "./errors";

describe("ErrorWithCode", () => {
  it("creates an error with code and message", () => {
    const error = new ErrorWithCode(ErrorCode.NotFound, "Resource not found");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(ErrorCode.NotFound);
    expect(error.message).toBe("Resource not found");
  });

  it("creates an error with code only", () => {
    const error = new ErrorWithCode(ErrorCode.Unauthorized);
    expect(error.code).toBe(ErrorCode.Unauthorized);
    expect(error.message).toBe("");
  });

  it("creates an error with code, message, and data", () => {
    const data = { userId: 123 };
    const error = new ErrorWithCode(ErrorCode.Forbidden, "Access denied", data);
    expect(error.code).toBe(ErrorCode.Forbidden);
    expect(error.message).toBe("Access denied");
    expect(error.data).toEqual({ userId: 123 });
  });

  describe("Factory", () => {
    it("creates an error via Factory for a known error code", () => {
      const error = ErrorWithCode.Factory.NotFound("not found");
      expect(error).toBeInstanceOf(ErrorWithCode);
      expect(error.code).toBe(ErrorCode.NotFound);
      expect(error.message).toBe("not found");
    });

    it("creates an error via Factory with data", () => {
      const error = ErrorWithCode.Factory.BadRequest("bad input", { field: "email" });
      expect(error).toBeInstanceOf(ErrorWithCode);
      expect(error.code).toBe(ErrorCode.BadRequest);
      expect(error.data).toEqual({ field: "email" });
    });

    it("creates an error via Factory without a message", () => {
      const error = ErrorWithCode.Factory.Unauthorized();
      expect(error).toBeInstanceOf(ErrorWithCode);
      expect(error.code).toBe(ErrorCode.Unauthorized);
    });

    it("throws for an unknown error code", () => {
      expect(() => {
        // @ts-expect-error testing unknown property access on Factory proxy
        ErrorWithCode.Factory.NonExistentCode;
      }).toThrow("Unknown error code: NonExistentCode");
    });
  });
});

describe("getErrorFromUnknown", () => {
  it("returns the same Error if cause is an Error", () => {
    const original = new Error("test error");
    const result = getErrorFromUnknown(original);
    expect(result).toBe(original);
  });

  it("wraps a string cause into an Error", () => {
    const result = getErrorFromUnknown("something went wrong");
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("something went wrong");
  });

  it("wraps an unknown type into an Error with type description", () => {
    const result = getErrorFromUnknown(42);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("number");
  });

  it("wraps undefined into an Error", () => {
    const result = getErrorFromUnknown(undefined);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("undefined");
  });

  it("wraps null into an Error", () => {
    const result = getErrorFromUnknown(null);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("object");
  });

  it("wraps an object into an Error", () => {
    const result = getErrorFromUnknown({ foo: "bar" });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("object");
  });
});

describe("handleErrorsJson", () => {
  it("parses JSON from a successful response", async () => {
    const response = new Response(JSON.stringify({ id: 1 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const result = await handleErrorsJson<{ id: number }>(response);
    expect(result).toEqual({ id: 1 });
  });

  it("returns empty object for 204 status", async () => {
    const response = new Response(null, { status: 204 });
    const result = await handleErrorsJson(response);
    expect(result).toEqual({});
  });

  it("handles gzip content-encoding by parsing text as JSON", async () => {
    const response = new Response(JSON.stringify({ compressed: true }), {
      status: 200,
      headers: { "content-encoding": "gzip" },
    });
    const result = await handleErrorsJson<{ compressed: boolean }>(response);
    expect(result).toEqual({ compressed: true });
  });

  it("throws for non-ok error responses", async () => {
    const response = new Response(JSON.stringify({ error: "bad" }), {
      status: 400,
      statusText: "Bad Request",
    });
    await expect(handleErrorsJson(response)).rejects.toThrow("Bad Request");
  });

  it("throws for 500 error responses", async () => {
    const response = new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      statusText: "Internal Server Error",
    });
    await expect(handleErrorsJson(response)).rejects.toThrow("Internal Server Error");
  });
});

describe("handleErrorsRaw", () => {
  it("returns text from a successful response", async () => {
    const response = new Response("raw text", { status: 200 });
    const result = await handleErrorsRaw(response);
    expect(result).toBe("raw text");
  });

  it("returns '{}' for 204 status", () => {
    const response = new Response(null, { status: 204 });
    const result = handleErrorsRaw(response);
    expect(result).toBe("{}");
  });

  it("throws for non-ok error responses", () => {
    const response = new Response("error", {
      status: 400,
      statusText: "Bad Request",
    });
    expect(() => handleErrorsRaw(response)).toThrow("Bad Request");
  });

  it("throws for 500 error responses", () => {
    const response = new Response("error", {
      status: 500,
      statusText: "Internal Server Error",
    });
    expect(() => handleErrorsRaw(response)).toThrow("Internal Server Error");
  });
});
