import { describe, expect, it } from "vitest";
import { RetryableError } from "./errors";

describe("RetryableError", () => {
  it("is instanceof Error", () => {
    const err = new RetryableError("fail");
    expect(err).toBeInstanceOf(Error);
  });

  it("is instanceof RetryableError", () => {
    const err = new RetryableError("fail");
    expect(err).toBeInstanceOf(RetryableError);
  });

  it("stores message", () => {
    const err = new RetryableError("something went wrong");
    expect(err.message).toBe("something went wrong");
  });

  it("has a stack trace", () => {
    const err = new RetryableError("test");
    expect(err.stack).toBeDefined();
  });
});
