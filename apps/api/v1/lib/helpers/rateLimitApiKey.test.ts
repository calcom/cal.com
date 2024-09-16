import type { Request, Response } from "express";
import type { NextApiResponse, NextApiRequest } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, vi } from "vitest";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";

import { rateLimitApiKey } from "~/lib/helpers/rateLimitApiKey";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn(),
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

    const rateLimiterResponse = {
      limit: 100,
      remaining: 99,
      reset: Date.now(),
    };

    (checkRateLimitAndThrowError as any).mockImplementationOnce(({ onRateLimiterResponse }) => {
      onRateLimiterResponse(rateLimiterResponse);
    });

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
});
