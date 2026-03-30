import { describe, expect, test } from "vitest";

import { HttpError } from "../http-error";
import { TracedError } from "../tracing/error";
import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";

describe("getServerErrorFromUnknown - uncovered lines", () => {
  test("should handle SyntaxError (line 72)", () => {
    const syntaxError = new SyntaxError("Unexpected token");
    const result = getServerErrorFromUnknown(syntaxError);
    expect(result).toBeInstanceOf(HttpError);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Unexpected error, please reach out for our customer support.");
  });

  test("should handle string cause (line 113)", () => {
    const result = getServerErrorFromUnknown("some string error");
    expect(result).toBeInstanceOf(HttpError);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("some string error");
  });

  test("should handle TracedError wrapping SyntaxError and include traceId (line 72 with trace)", () => {
    const originalError = new SyntaxError("Bad JSON");
    const traceContext = { traceId: "trace-syntax", spanId: "span-1", operation: "parse" };
    const tracedData = { requestId: "req-1" };
    const tracedError = new TracedError(originalError, traceContext, tracedData);
    const result = getServerErrorFromUnknown(tracedError);
    expect(result.statusCode).toBe(500);
    expect(result.data).toEqual({ requestId: "req-1", traceId: "trace-syntax" });
  });

  test("should handle HttpError cause preserving url and method (line 97-107)", () => {
    const httpError = new HttpError({
      statusCode: 403,
      message: "Forbidden",
      url: "https://example.com/api",
      method: "POST",
    });
    const result = getServerErrorFromUnknown(httpError);
    expect(result).toBeInstanceOf(HttpError);
    expect(result.statusCode).toBe(403);
    expect(result.message).toBe("Forbidden");
    expect(result.url).toBe("https://example.com/api");
    expect(result.method).toBe("POST");
  });

  test("should handle TracedError wrapping string cause (line 113 with trace)", () => {
    const tracedError = new TracedError(
      "string error" as unknown as Error,
      { traceId: "trace-str", spanId: "span-str", operation: "op" },
      { key: "val" }
    );
    // TracedError wrapping string: the cause check for TracedError will extract
    // but then cause becomes the string
    const result = getServerErrorFromUnknown(tracedError);
    expect(result.statusCode).toBe(500);
  });
});
