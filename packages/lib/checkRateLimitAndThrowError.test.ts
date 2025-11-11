import type { GetServerSidePropsContext } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimitAndThrowError, handleRateLimitForNextJs } from "./checkRateLimitAndThrowError";
import { rateLimiter } from "./rateLimit";
import type { RatelimitResponse } from "./rateLimit";

vi.mock("@calcom/prisma", () => {
  return {
    prisma: vi.fn(),
  };
});

vi.mock("./rateLimit", () => {
  return {
    rateLimiter: vi.fn(),
  };
});

vi.mock("./getIP", () => {
  return {
    default: vi.fn(() => "127.0.0.1"),
  };
});

vi.mock("@calcom/lib/server/PiiHasher", () => {
  return {
    piiHasher: {
      hash: vi.fn((value: string) => `hashed-${value}`),
    },
  };
});

describe("checkRateLimitAndThrowError", () => {
  it("should throw an error if rate limit is exceeded", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    vi.mocked(rateLimiter).mockReturnValue(() => {
      return {
        limit: 10,
        remaining: -1,
        reset: Date.now() + 10000,
        success: false,
      } as RatelimitResponse;
    });

    const identifier = "test-identifier";
    const rateLimitingType = "core";

    await expect(checkRateLimitAndThrowError({ rateLimitingType, identifier })).rejects.toThrow();
  });

  it("should not throw an error if rate limit is not exceeded", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";
    vi.mocked(rateLimiter).mockReturnValue(() => {
      return {
        limit: 10,
        remaining: 5,
        reset: Date.now() + 10000,
        success: true,
      } as RatelimitResponse;
    });

    const identifier = "test-identifier";
    const rateLimitingType = "core";

    await expect(checkRateLimitAndThrowError({ rateLimitingType, identifier })).resolves.not.toThrow();
  });
  it("should notthrow even if upstash is not enabled", async () => {
    // returned value when upstash env vars are not set
    vi.mocked(rateLimiter).mockReturnValue(() => {
      return {
        success: true,
        limit: 10,
        remaining: 999,
        reset: 0,
      } as RatelimitResponse;
    });

    const identifier = "test-identifier";
    const rateLimitingType = "core";

    await expect(checkRateLimitAndThrowError({ rateLimitingType, identifier })).resolves.not.toThrow();
  });
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

    vi.mocked(rateLimiter).mockReturnValue(() => {
      return {
        limit: 10,
        remaining: 5,
        reset: Date.now() + 10000,
        success: true,
      } as RatelimitResponse;
    });

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
    vi.mocked(rateLimiter).mockReturnValue(() => {
      return {
        limit: 10,
        remaining: -1,
        reset: resetTime,
        success: false,
      } as RatelimitResponse;
    });

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

    vi.mocked(rateLimiter).mockReturnValue(() => {
      return {
        limit: 10,
        remaining: 5,
        reset: Date.now() + 10000,
        success: true,
      } as RatelimitResponse;
    });

    const context = createMockContext();
    const identifier = "[user]/[type]-hashed-127.0.0.1";

    const result = await handleRateLimitForNextJs(context, identifier, "common");

    expect(result).toBeNull();
  });

  it("should use the provided identifier directly", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    const mockRateLimiter = vi.fn(() => {
      return {
        limit: 10,
        remaining: 5,
        reset: Date.now() + 10000,
        success: true,
      } as RatelimitResponse;
    });

    vi.mocked(rateLimiter).mockReturnValue(mockRateLimiter);

    const context = createMockContext();
    const identifier = "test-suffix-hashed-127.0.0.1";

    await handleRateLimitForNextJs(context, identifier);

    expect(mockRateLimiter).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "test-suffix-hashed-127.0.0.1",
      })
    );
  });

  it("should pass opts to rate limiter when provided", async () => {
    process.env.UNKEY_ROOT_KEY = "unkey_mock";

    const mockRateLimiter = vi.fn(() => {
      return {
        limit: 10,
        remaining: 5,
        reset: Date.now() + 10000,
        success: true,
      } as RatelimitResponse;
    });

    vi.mocked(rateLimiter).mockReturnValue(mockRateLimiter);

    const context = createMockContext();
    const identifier = "[user]/[type]-hashed-127.0.0.1";
    const opts = undefined;

    await handleRateLimitForNextJs(context, identifier, "core", opts);

    expect(mockRateLimiter).toHaveBeenCalled();
  });
});
