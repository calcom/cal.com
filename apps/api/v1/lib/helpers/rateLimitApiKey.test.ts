import type { Request, Response } from "express";
import type { NextApiResponse, NextApiRequest } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, vi } from "vitest";

import { rateLimitApiKey } from "~/lib/helpers/rateLimitApiKey";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const testUserId = 123;

describe("rateLimitApiKey middleware", () => {
  it("should return 401 if no userId is provided", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: { apiKey: "test-key" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await rateLimitApiKey(req, res, vi.fn() as any);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({ message: "No userId provided" });
  });

  it("should return 401 if no apiKey is provided", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {},
      userId: testUserId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await rateLimitApiKey(req, res, vi.fn() as any);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({ message: "No apiKey provided" });
  });

  it("should call next() when userId and apiKey are provided", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: { apiKey: "test-key" },
      userId: testUserId,
    });

    const next = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await rateLimitApiKey(req, res, next as any);

    expect(next).toHaveBeenCalled();
  });
});
