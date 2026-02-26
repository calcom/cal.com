import { describe, expect, it, vi } from "vitest";

import { getClientErrorFromUnknown, withErrorFromUnknown } from "./getClientErrorFromUnknown";
import { HttpError } from "./http-error";

describe("getClientErrorFromUnknown", () => {
  it("extracts statusCode and message from HttpError", () => {
    const httpError = new HttpError({ statusCode: 404, message: "Not Found" });
    const result = getClientErrorFromUnknown(httpError);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("404: Not Found");
  });

  it("extracts message from regular Error", () => {
    const error = new Error("something broke");
    const result = getClientErrorFromUnknown(error);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("something broke");
  });

  it("wraps string cause as Error", () => {
    const result = getClientErrorFromUnknown("string error");

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("string error");
  });

  it("wraps unknown types with descriptive message", () => {
    const result = getClientErrorFromUnknown(42);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("Unhandled error of type 'number'");
  });

  it("handles null cause", () => {
    const result = getClientErrorFromUnknown(null);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("Unhandled error of type 'object'");
  });

  it("handles undefined cause", () => {
    const result = getClientErrorFromUnknown(undefined);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("Unhandled error of type 'undefined'");
  });

  it("handles object cause (not an Error instance)", () => {
    const result = getClientErrorFromUnknown({ foo: "bar" });

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("Unhandled error of type 'object'");
  });
});

describe("withErrorFromUnknown", () => {
  it("wraps a callback to receive normalized Error", () => {
    const handler = vi.fn();
    const wrapped = withErrorFromUnknown(handler);

    wrapped("raw string error");

    expect(handler).toHaveBeenCalledOnce();
    const receivedError = handler.mock.calls[0][0];
    expect(receivedError).toBeInstanceOf(Error);
    expect(receivedError.message).toBe("raw string error");
  });

  it("passes HttpError through normalization", () => {
    const handler = vi.fn();
    const wrapped = withErrorFromUnknown(handler);

    wrapped(new HttpError({ statusCode: 500, message: "Server Error" }));

    const receivedError = handler.mock.calls[0][0];
    expect(receivedError.message).toBe("500: Server Error");
  });
});
