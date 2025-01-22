import type { RatelimitResponse } from "@unkey/ratelimit";
import type { Request, Response } from "express";
import type { NextApiResponse, NextApiRequest } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, vi } from "vitest";

import { handleAutoLock } from "@calcom/lib/autoLock";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";

import { rateLimitApiKey } from "~/lib/helpers/rateLimitApiKey";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn(),
}));

vi.mock("@calcom/lib/autoLock", () => ({
  handleAutoLock: vi.fn(),
}));

describe("rateLimitApiKey middleware", () => {
  it("should return 401 if no apiKey is provided", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {},
    });

    await rateLimitApiKey(req, res, vi.fn() as any);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({ message: "No apiKey provided" });
  });

  it("should call checkRateLimitAndThrowError with correct parameters", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test-key" },
    });

    (checkRateLimitAndThrowError as any).mockResolvedValueOnce({
      limit: 100,
      remaining: 99,
      reset: Date.now(),
    });

    // @ts-expect-error weird typing between middleware and createMocks
    await rateLimitApiKey(req, res, vi.fn() as any);

    expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
      identifier: "test-key",
      rateLimitingType: "api",
      onRateLimiterResponse: expect.any(Function),
    });
  });

  it("should set rate limit headers correctly", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test-key" },
    });

    const rateLimiterResponse: RatelimitResponse = {
      limit: 100,
      remaining: 99,
      reset: Date.now(),
      success: true,
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (checkRateLimitAndThrowError as any).mockImplementationOnce(
      ({ onRateLimiterResponse }: { onRateLimiterResponse: (response: RatelimitResponse) => void }) => {
        onRateLimiterResponse(rateLimiterResponse);
      }
    );

    // @ts-expect-error weird typing between middleware and createMocks
    await rateLimitApiKey(req, res, vi.fn() as any);

    expect(res.getHeader("X-RateLimit-Limit")).toBe(rateLimiterResponse.limit);
    expect(res.getHeader("X-RateLimit-Remaining")).toBe(rateLimiterResponse.remaining);
    expect(res.getHeader("X-RateLimit-Reset")).toBe(rateLimiterResponse.reset);
  });

  it("should return 429 if rate limit is exceeded", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test-key" },
    });

    (checkRateLimitAndThrowError as any).mockRejectedValue(new Error("Rate limit exceeded"));

    // @ts-expect-error weird typing between middleware and createMocks
    await rateLimitApiKey(req, res, vi.fn() as any);

    expect(res._getStatusCode()).toBe(429);
    expect(res._getJSONData()).toEqual({ message: "Rate limit exceeded" });
  });

  it("should lock API key when rate limit is repeatedly exceeded", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test-key" },
    });

    const rateLimiterResponse: RatelimitResponse = {
      success: false,
      remaining: 0,
      limit: 100,
      reset: Date.now(),
    };

    // Mock rate limiter to trigger the onRateLimiterResponse callback
    (checkRateLimitAndThrowError as any).mockImplementationOnce(
      ({ onRateLimiterResponse }: { onRateLimiterResponse: (response: RatelimitResponse) => void }) => {
        onRateLimiterResponse(rateLimiterResponse);
      }
    );

    // Mock handleAutoLock to indicate the key was locked
    vi.mocked(handleAutoLock).mockResolvedValueOnce(true);

    // @ts-expect-error weird typing between middleware and createMocks
    await rateLimitApiKey(req, res, vi.fn() as any);

    expect(handleAutoLock).toHaveBeenCalledWith({
      identifier: "test-key",
      identifierType: "apiKey",
      rateLimitResponse: rateLimiterResponse,
    });

    expect(res._getStatusCode()).toBe(429);
    expect(res._getJSONData()).toEqual({ message: "Too many requests" });
  });

  it("should handle API key not found error during auto-lock", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test-key" },
    });

    const rateLimiterResponse: RatelimitResponse = {
      success: false,
      remaining: 0,
      limit: 100,
      reset: Date.now(),
    };

    // Mock rate limiter to trigger the onRateLimiterResponse callback
    (checkRateLimitAndThrowError as any).mockImplementationOnce(
      ({ onRateLimiterResponse }: { onRateLimiterResponse: (response: RatelimitResponse) => void }) => {
        onRateLimiterResponse(rateLimiterResponse);
      }
    );

    // Mock handleAutoLock to throw a "No user found" error
    vi.mocked(handleAutoLock).mockRejectedValueOnce(new Error("No user found for this API key."));

    // @ts-expect-error weird typing between middleware and createMocks
    await rateLimitApiKey(req, res, vi.fn() as any);

    expect(handleAutoLock).toHaveBeenCalledWith({
      identifier: "test-key",
      identifierType: "apiKey",
      rateLimitResponse: rateLimiterResponse,
    });

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({ message: "No user found for this API key." });
  });

  it("should continue if auto-lock returns false (not locked)", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test-key" },
    });

    const rateLimiterResponse: RatelimitResponse = {
      success: false,
      remaining: 0,
      limit: 100,
      reset: Date.now(),
    };

    // Mock rate limiter to trigger the onRateLimiterResponse callback
    (checkRateLimitAndThrowError as any).mockImplementationOnce(
      ({ onRateLimiterResponse }: { onRateLimiterResponse: (response: RatelimitResponse) => void }) => {
        onRateLimiterResponse(rateLimiterResponse);
      }
    );

    // Mock handleAutoLock to indicate the key was not locked
    vi.mocked(handleAutoLock).mockResolvedValueOnce(false);

    const next = vi.fn();
    // @ts-expect-error weird typing between middleware and createMocks
    await rateLimitApiKey(req, res, next);

    expect(handleAutoLock).toHaveBeenCalledWith({
      identifier: "test-key",
      identifierType: "apiKey",
      rateLimitResponse: rateLimiterResponse,
    });

    // Verify headers were set but request continued
    expect(res.getHeader("X-RateLimit-Limit")).toBe(rateLimiterResponse.limit);
    expect(next).toHaveBeenCalled();
  });

  it("should handle HttpError during rate limiting", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test-key" },
    });

    // Mock checkRateLimitAndThrowError to throw HttpError
    vi.mocked(checkRateLimitAndThrowError).mockRejectedValueOnce(
      new HttpError({
        statusCode: 429,
        message: "Custom rate limit error",
      })
    );

    // @ts-expect-error weird typing between middleware and createMocks
    await rateLimitApiKey(req, res, vi.fn() as any);

    expect(res._getStatusCode()).toBe(429);
    expect(res._getJSONData()).toEqual({ message: "Custom rate limit error" });
  });
});
