import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";

import { handleRateLimitForNextJs } from "./handleRatelimit";

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => {
  return {
    checkRateLimitAndThrowError: vi.fn(),
  };
});

describe("handleRateLimitForNextJs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when rate limit is not exceeded", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    const identifier = "[user]/[type]-hashed-127.0.0.1";
    const rateLimitingType = "core";

    const result = await handleRateLimitForNextJs(identifier, rateLimitingType);

    expect(result).toBeNull();
  });

  it("should return NextResponse with 429 status when rate limit is exceeded", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    const resetTime = Date.now() + 10000;
    vi.mocked(checkRateLimitAndThrowError).mockRejectedValue(
      new HttpError({
        statusCode: 429,
        message: `Rate limit exceeded. Try again in ${Math.floor((resetTime - Date.now()) / 1000)} seconds.`,
      })
    );

    const identifier = "[user]/[type]-hashed-127.0.0.1";
    const rateLimitingType = "core";

    const result = await handleRateLimitForNextJs(identifier, rateLimitingType);

    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(NextResponse);
    expect(result?.status).toBe(429);
    const json = await result?.json();
    expect(json.message).toContain("Rate limit exceeded. Try again in");
  });

  it("should use different rate limiting types", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    const identifier = "[user]/[type]-hashed-127.0.0.1";

    const result = await handleRateLimitForNextJs(identifier, "common");

    expect(result).toBeNull();
  });

  it("should use the provided identifier directly", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    const identifier = "test-suffix-hashed-127.0.0.1";

    await handleRateLimitForNextJs(identifier);

    expect(checkRateLimitAndThrowError).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "test-suffix-hashed-127.0.0.1",
      })
    );
  });

  it("should pass opts to rate limiter when provided", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    const identifier = "[user]/[type]-hashed-127.0.0.1";
    const opts = undefined;

    await handleRateLimitForNextJs(identifier, "core", opts);

    expect(checkRateLimitAndThrowError).toHaveBeenCalled();
  });
});
