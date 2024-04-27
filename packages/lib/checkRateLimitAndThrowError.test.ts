import { describe, expect, it, vi } from "vitest";

import { checkRateLimitAndThrowError } from "./checkRateLimitAndThrowError";
import { rateLimiter } from "./rateLimit";
import type { RatelimitResponse } from "./rateLimit";

vi.mock("./rateLimit", () => {
  return {
    rateLimiter: vi.fn(),
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
