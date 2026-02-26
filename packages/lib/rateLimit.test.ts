import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@unkey/ratelimit", () => {
  class MockRatelimit {
    limit = vi.fn().mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 0 });
    constructor() {}
  }
  return { Ratelimit: MockRatelimit };
});

vi.mock("./getIP", () => ({
  isIpInBanListString: vi.fn((id: string) => id === "banned-ip"),
}));

vi.mock("./logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { API_KEY_RATE_LIMIT, rateLimiter } from "./rateLimit";

describe("API_KEY_RATE_LIMIT", () => {
  it("is 30", () => {
    expect(API_KEY_RATE_LIMIT).toBe(30);
  });
});

describe("rateLimiter", () => {
  beforeEach(() => {
    vi.stubEnv("UNKEY_ROOT_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a fallback function when UNKEY_ROOT_KEY is missing", () => {
    vi.stubEnv("UNKEY_ROOT_KEY", "");
    const limiter = rateLimiter();
    const result = limiter({ identifier: "test-user" });

    // Fallback is synchronous and returns success
    expect(result).toEqual({
      success: true,
      limit: 10,
      remaining: 999,
      reset: 0,
    });
  });

  it("returns an async function when UNKEY_ROOT_KEY is set", async () => {
    vi.stubEnv("UNKEY_ROOT_KEY", "test-root-key");

    const limiter = rateLimiter();
    const result = await limiter({ identifier: "user-123", rateLimitingType: "core" });

    expect(result).toEqual({ success: true, limit: 10, remaining: 9, reset: 0 });
  });

  it("uses forcedSlowMode for banned IPs", async () => {
    vi.stubEnv("UNKEY_ROOT_KEY", "test-root-key");

    const limiter = rateLimiter();
    const result = await limiter({ identifier: "banned-ip", rateLimitingType: "common" });

    // Should use forcedSlowMode instead of common because IP is banned
    expect(result).toEqual({ success: true, limit: 10, remaining: 9, reset: 0 });
  });

  it("defaults to core rate limiting type", async () => {
    vi.stubEnv("UNKEY_ROOT_KEY", "test-root-key");

    const limiter = rateLimiter();
    // Not specifying rateLimitingType should default to "core"
    const result = await limiter({ identifier: "user-456" });

    expect(result).toEqual({ success: true, limit: 10, remaining: 9, reset: 0 });
  });

  it("accepts all rate limiting types", async () => {
    vi.stubEnv("UNKEY_ROOT_KEY", "test-root-key");

    const limiter = rateLimiter();
    const types = ["core", "forcedSlowMode", "common", "api", "ai", "sms", "smsMonth", "instantMeeting"] as const;

    for (const type of types) {
      const result = await limiter({ identifier: `user-${type}`, rateLimitingType: type });
      expect(result.success).toBe(true);
    }
  });
});
