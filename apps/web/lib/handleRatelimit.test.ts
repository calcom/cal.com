import type { GetServerSidePropsContext } from "next";
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
  const createMockContext = (): GetServerSidePropsContext => {
    return {
      req: {
        headers: {
          "cf-connecting-ip": "192.168.1.1",
        },
      } as unknown as GetServerSidePropsContext["req"],
      res: {
        statusCode: 200,
      } as unknown as GetServerSidePropsContext["res"],
    } as GetServerSidePropsContext;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when rate limit is not exceeded", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    const context = createMockContext();
    const identifier = "[user]/[type]-hashed-127.0.0.1";
    const rateLimitingType = "core";

    const result = await handleRateLimitForNextJs(context, identifier, rateLimitingType);

    expect(result).toBeNull();
    expect(context.res.statusCode).toBe(200);
  });

  it("should return error props and set statusCode to 429 when rate limit is exceeded", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    const resetTime = Date.now() + 10000;
    vi.mocked(checkRateLimitAndThrowError).mockRejectedValue(
      new HttpError({
        statusCode: 429,
        message: `Rate limit exceeded. Try again in ${Math.floor((resetTime - Date.now()) / 1000)} seconds.`,
      })
    );

    const context = createMockContext();
    const identifier = "[user]/[type]-hashed-127.0.0.1";
    const rateLimitingType = "core";

    const result = await handleRateLimitForNextJs(context, identifier, rateLimitingType);

    expect(result).not.toBeNull();
    expect(result).toEqual({
      props: {
        errorMessage: expect.stringContaining("Rate limit exceeded. Try again in"),
      },
    });
    expect(context.res.statusCode).toBe(429);
  });

  it("should use different rate limiting types", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    const context = createMockContext();
    const identifier = "[user]/[type]-hashed-127.0.0.1";

    const result = await handleRateLimitForNextJs(context, identifier, "common");

    expect(result).toBeNull();
  });

  it("should use the provided identifier directly", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    const context = createMockContext();
    const identifier = "test-suffix-hashed-127.0.0.1";

    await handleRateLimitForNextJs(context, identifier);

    expect(checkRateLimitAndThrowError).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "test-suffix-hashed-127.0.0.1",
      })
    );
  });

  it("should pass opts to rate limiter when provided", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue(undefined);

    const context = createMockContext();
    const identifier = "[user]/[type]-hashed-127.0.0.1";
    const opts = undefined;

    await handleRateLimitForNextJs(context, identifier, "core", opts);

    expect(checkRateLimitAndThrowError).toHaveBeenCalled();
  });
});
