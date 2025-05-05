import type { PrismaClient } from "@prisma/client";
import { captureException } from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import type { Mock } from "vitest";

import { slowQueryDetectionMiddleware } from "../index";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

let mockTime = 0;

vi.mock("perf_hooks", () => ({
  performance: {
    now: () => mockTime,
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    warn: vi.fn(),
  },
}));

type MiddlewareParams = {
  model: string;
  action: string;
  args: Record<string, unknown>;
};

type NextFunction = (params: MiddlewareParams) => Promise<unknown>;

describe("Slow Query Detection Middleware", () => {
  const mockPrismaClient = {
    $use: vi.fn(),
  } as unknown as PrismaClient;

  let middleware: (params: MiddlewareParams, next: NextFunction) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTime = 0;

    (captureException as unknown as Mock).mockClear();

    slowQueryDetectionMiddleware(mockPrismaClient);

    middleware = mockPrismaClient.$use.mock.calls[0][0];

    process.env.SLOW_QUERY_THRESHOLD_MS = "500";
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    delete process.env.SLOW_QUERY_THRESHOLD_MS;
    delete process.env.NODE_ENV;
  });

  it("should register middleware function", () => {
    expect(mockPrismaClient.$use).toHaveBeenCalledTimes(1);
  });

  it("should not report queries faster than the threshold", async () => {
    const next = vi.fn().mockResolvedValue({ id: 1, name: "Test" });

    const params = {
      model: "User",
      action: "findUnique",
      args: { where: { id: 1 } },
    };

    mockTime = 100;

    const result = await middleware(params, next);

    mockTime = 400;

    expect(result).toEqual({ id: 1, name: "Test" });

    expect(captureException).not.toHaveBeenCalled();
  });

  it("should report queries slower than the threshold", async () => {
    const next = vi.fn().mockResolvedValue({ id: 1, name: "Test" });

    const params = {
      model: "User",
      action: "findUnique",
      args: { where: { id: 1 } },
    };

    mockTime = 100;

    const resultPromise = middleware(params, async (...args) => {
      mockTime = 700;
      return next(...args);
    });

    const result = await resultPromise;

    expect(result).toEqual({ id: 1, name: "Test" });

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Slow Prisma Query"),
      }),
      expect.objectContaining({
        extra: expect.objectContaining({
          query: expect.objectContaining({
            model: "User",
            action: "findUnique",
          }),
        }),
        tags: expect.objectContaining({
          type: "slow_query",
          model: "User",
          action: "findUnique",
        }),
      })
    );
  });

  it("should respect rate limiting", async () => {
    const next = vi.fn().mockResolvedValue({ id: 1, name: "Test" });

    const params: MiddlewareParams = {
      model: "User",
      action: "findUnique",
      args: { where: { id: 1 } },
    };

    mockTime = 100;
    await middleware(params, async (p) => {
      mockTime = 700;
      return next(p);
    });

    (captureException as unknown as Mock).mockClear();

    mockTime = 800;
    await middleware(params, async (p) => {
      mockTime = 1400;
      return next(p);
    });

    expect(captureException).not.toHaveBeenCalled();
  });

  it.skip("should use the configured threshold from environment variable", async () => {
    vi.clearAllMocks();
    mockTime = 0;
    (captureException as unknown as Mock).mockClear();

    process.env.SLOW_QUERY_THRESHOLD_MS = "200";

    const localMockPrisma = { $use: vi.fn() } as unknown as PrismaClient;
    slowQueryDetectionMiddleware(localMockPrisma);
    const localMiddleware = localMockPrisma.$use.mock.calls[0][0];

    const next = vi.fn().mockResolvedValue({ id: 1, name: "Test" });

    const params: MiddlewareParams = {
      model: "User",
      action: "findUnique",
      args: { where: { id: 1 } },
    };

    mockTime = 100;

    await localMiddleware(params, async (p) => {
      mockTime = 350; // This is > 200ms but < 500ms
      return next(p);
    });

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("should handle clients without $use method", () => {
    const clientWithoutUse = {} as unknown as PrismaClient;

    expect(() => {
      slowQueryDetectionMiddleware(clientWithoutUse);
    }).not.toThrow();
  });
});
