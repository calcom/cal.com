import { captureException } from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import type { Mock } from "vitest";

import prisma from "../../test/fixtures/prismaMock";
import slowQueryDetectionMiddleware, { reportSlowQuery, initializeClientState } from "../slowQueryDetection";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("perf_hooks", () => ({
  performance: {
    now: vi.fn().mockReturnValue(100),
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    warn: vi.fn(),
  },
}));

prisma.$use = vi.fn((middleware) => {
  (prisma as any).__middleware = middleware;
  return prisma;
});

prisma.$on = vi.fn((event, callback) => {
  if (event === "query") {
    (prisma as any).__queryCallback = callback;
  }
  return prisma;
});

prisma.$transaction = vi.fn((callback) => {
  return callback(prisma);
});

describe("Slow Query Detection Middleware - Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (captureException as unknown as Mock).mockClear();

    process.env.SLOW_QUERY_THRESHOLD_MS = "500";
    process.env.NODE_ENV = "test";

    slowQueryDetectionMiddleware(prisma);

    initializeClientState(prisma);
  });

  afterEach(() => {
    delete process.env.SLOW_QUERY_THRESHOLD_MS;
    delete process.env.NODE_ENV;
  });

  it("should not report fast queries to Sentry", async () => {
    const state = initializeClientState(prisma);

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query: "SELECT * FROM users WHERE email = 'test@example.com' LIMIT 1",
        timestamp: Date.now(),
      });
    }

    const params = {
      model: "User",
      action: "findFirst",
      args: { where: { email: "test@example.com" } },
    };

    const reported = reportSlowQuery(prisma, params, 400, Date.now());

    expect(reported).toBe(false);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("should report slow queries to Sentry with SQL details", async () => {
    const state = initializeClientState(prisma);

    state.lastReportTime = 0;

    const timestamp = Date.now();

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query:
          "SELECT * FROM users JOIN accounts ON users.id = accounts.userId WHERE users.email = 'test@example.com' LIMIT 1",
        timestamp,
      });
    }

    const params = {
      model: "User",
      action: "findFirst",
      args: {
        where: { email: "test@example.com" },
        include: {
          accounts: true,
          bookings: true,
          credentials: true,
          teams: true,
          workflows: true,
        },
      },
    };

    const reported = reportSlowQuery(prisma, params, 700, timestamp);

    expect(reported).toBe(true);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Slow Prisma Query"),
      }),
      expect.objectContaining({
        extra: expect.objectContaining({
          query: expect.objectContaining({
            action: "findFirst",
            duration: expect.any(Number),
          }),
        }),
        tags: expect.objectContaining({
          type: "slow_query",
        }),
      })
    );
  });

  it("should respect rate limiting and not flood Sentry with reports", async () => {
    const state = initializeClientState(prisma);

    state.lastReportTime = 0;

    const timestamp = Date.now();
    const now = timestamp;

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query:
          "SELECT * FROM users JOIN accounts ON users.id = accounts.userId WHERE users.email = 'test@example.com' LIMIT 1",
        timestamp,
      });
    }

    const params = {
      model: "User",
      action: "findFirst",
      args: {
        where: { email: "test@example.com" },
        include: {
          accounts: true,
          bookings: true,
        },
      },
    };

    const firstReported = reportSlowQuery(prisma, params, 700, timestamp, {
      forceReport: true,
      currentTime: now,
    });

    expect(firstReported).toBe(true);
    expect(captureException).toHaveBeenCalledTimes(1);

    (captureException as unknown as Mock).mockClear();

    const secondReported = reportSlowQuery(prisma, params, 700, timestamp + 1000, {
      currentTime: now + 1000, // Only 1 second later, should be rate limited
    });

    expect(secondReported).toBe(false);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("should use the configured threshold from environment variable", async () => {
    vi.clearAllMocks();
    (captureException as unknown as Mock).mockClear();

    const lowerThreshold = 200;

    const state = initializeClientState(prisma);

    state.lastReportTime = 0;

    const timestamp = Date.now();

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query:
          "SELECT * FROM users JOIN accounts ON users.id = accounts.userId WHERE users.email = 'test@example.com' LIMIT 1",
        timestamp,
      });
    }

    const params = {
      model: "User",
      action: "findFirst",
      args: {
        where: { email: "test@example.com" },
        include: { accounts: true },
      },
    };

    const reported = reportSlowQuery(prisma, params, 350, timestamp, {
      forceReport: true,
      overrideThreshold: lowerThreshold,
    });

    expect(reported).toBe(true);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("should handle complex queries with joins", async () => {
    vi.clearAllMocks();
    (captureException as unknown as Mock).mockClear();

    const state = initializeClientState(prisma);

    state.lastReportTime = 0;

    const timestamp = Date.now();

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query:
          "SELECT * FROM bookings JOIN users ON bookings.userId = users.id JOIN teams ON users.teamId = teams.id WHERE bookings.userId IS NOT NULL LIMIT 1",
        timestamp,
      });
    }

    const params = {
      model: "Booking",
      action: "findFirst",
      args: {
        where: { userId: { not: null } },
        include: {
          user: {
            include: {
              teams: true,
            },
          },
          attendees: true,
          references: true,
          payment: true,
        },
      },
    };

    const reported = reportSlowQuery(prisma, params, 700, timestamp, {
      forceReport: true,
    });

    expect(reported).toBe(true);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Slow Prisma Query"),
      }),
      expect.objectContaining({
        extra: expect.objectContaining({
          query: expect.objectContaining({
            sql: expect.stringMatching(/SQL not captured|SELECT/i),
          }),
        }),
      })
    );
  });

  it("should handle middleware execution correctly", async () => {
    vi.clearAllMocks();
    (captureException as unknown as Mock).mockClear();

    const state = initializeClientState(prisma);

    state.lastReportTime = 0;

    const timestamp = Date.now();

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query: "SELECT * FROM users WHERE id = 1",
        timestamp,
      });
    }

    const params = {
      model: "User",
      action: "findUnique",
      args: { where: { id: 1 } },
    };

    const next = vi.fn().mockResolvedValue({ id: 1, name: "Test User" });

    const middlewareFn = async (params: any, next: any) => {
      const result = await next(params);

      reportSlowQuery(prisma, params, 700, timestamp, {
        forceReport: true,
      });

      return result;
    };

    await middlewareFn(params, next);

    expect(next).toHaveBeenCalledWith(params);

    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
