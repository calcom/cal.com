import prismaMock from "../../tests/libs/__mocks__/prismaMock";

import { type RatelimitResponse } from "@unkey/ratelimit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimitAndThrowError, enforceSMSAbusePrevention } from "./checkRateLimitAndThrowError";
import { rateLimiter } from "./rateLimit";

vi.mock("./rateLimit", () => {
  return {
    rateLimiter: vi.fn(),
  };
});

vi.mock("./sendEmailWithNodeMailer", () => ({
  default: vi.fn(),
}));

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

describe("enforceSMSAbusePrevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.membership.findFirst.mockResolvedValue(null);
    prismaMock.calIdMembership.findFirst.mockResolvedValue(null);
    prismaMock.calIdTeam.findUnique.mockResolvedValue(null);
    prismaMock.team.findUnique.mockResolvedValue(null);
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.calIdTeam.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.team.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.$executeRaw.mockResolvedValue(0);
  });

  it("applies rate limiting for user identifier", async () => {
    const limiterFn = vi.fn().mockReturnValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    } as RatelimitResponse);
    vi.mocked(rateLimiter).mockReturnValue(limiterFn as never);

    await expect(enforceSMSAbusePrevention({ userId: 101 })).resolves.not.toThrow();

    expect(limiterFn).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "sms:user:101",
        rateLimitingType: "smsMonth",
      })
    );
  });

  it("applies rate limiting for team identifier", async () => {
    const limiterFn = vi.fn().mockReturnValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    } as RatelimitResponse);
    vi.mocked(rateLimiter).mockReturnValue(limiterFn as never);

    await expect(enforceSMSAbusePrevention({ calIdTeamId: 202 })).resolves.not.toThrow();

    expect(limiterFn).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "sms:team:202",
        rateLimitingType: "sms",
      })
    );
  });

  it("applies rate limiting for ip identifier", async () => {
    const limiterFn = vi.fn().mockReturnValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    } as RatelimitResponse);
    vi.mocked(rateLimiter).mockReturnValue(limiterFn as never);

    await expect(enforceSMSAbusePrevention({ ipAddress: "203.0.113.10" })).resolves.not.toThrow();

    expect(limiterFn).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "sms:ip:203.0.113.10",
        rateLimitingType: "sms",
      })
    );
  });

  it("applies rate limiting across all provided identifiers", async () => {
    const limiterFn = vi.fn().mockReturnValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    } as RatelimitResponse);
    vi.mocked(rateLimiter).mockReturnValue(limiterFn as never);

    await expect(
      enforceSMSAbusePrevention({
        userId: 111,
        calIdTeamId: 222,
        ipAddress: "198.51.100.7",
      })
    ).resolves.not.toThrow();

    expect(limiterFn).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "sms:user:111", rateLimitingType: "smsMonth" })
    );
    expect(limiterFn).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "sms:team:222", rateLimitingType: "sms" })
    );
    expect(limiterFn).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "sms:ip:198.51.100.7", rateLimitingType: "sms" })
    );
  });

  it("throws when user identifier rate limit is exceeded", async () => {
    const limiterFn = vi.fn().mockReturnValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 10000,
    } as RatelimitResponse);
    vi.mocked(rateLimiter).mockReturnValue(limiterFn as never);

    await expect(enforceSMSAbusePrevention({ userId: 333 })).rejects.toThrow("Rate limit exceeded");
  });

  it("throws when team identifier rate limit is exceeded", async () => {
    const limiterFn = vi.fn().mockReturnValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 10000,
    } as RatelimitResponse);
    vi.mocked(rateLimiter).mockReturnValue(limiterFn as never);

    await expect(enforceSMSAbusePrevention({ calIdTeamId: 444 })).rejects.toThrow("Rate limit exceeded");
  });

  it("throws when ip identifier rate limit is exceeded", async () => {
    const limiterFn = vi.fn().mockReturnValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 10000,
    } as RatelimitResponse);
    vi.mocked(rateLimiter).mockReturnValue(limiterFn as never);

    await expect(enforceSMSAbusePrevention({ ipAddress: "192.0.2.44" })).rejects.toThrow(
      "Rate limit exceeded"
    );
  });
});
