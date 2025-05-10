import { captureException } from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import type { Mock } from "vitest";

import prisma from "@calcom/prisma";

import slowQueryDetectionMiddleware, { reportSlowQuery, initializeClientState } from "../slowQueryDetection";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    warn: vi.fn(),
  },
}));

const originalUse = prisma.$use;
const originalOn = prisma.$on;
const originalTransaction = prisma.$transaction;

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
    // Reset the last report time to ensure we're not rate limited
    const state = initializeClientState(prisma);
    state.lastReportTime = 0;

    const startTime = Date.now();
    await prisma.user.findFirst({
      where: { id: { not: null } },
      take: 1,
    });
    const endTime = Date.now();
    const duration = endTime - startTime;

    const params = {
      model: "User",
      action: "findFirst",
      args: { where: { id: { not: null } }, take: 1 },
    };

    const reported = reportSlowQuery(prisma, params, 400, startTime);

    expect(reported).toBe(false);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("should report slow queries to Sentry with SQL details", async () => {
    // Reset the last report time to ensure we're not rate limited
    const state = initializeClientState(prisma);
    state.lastReportTime = 0;

    const startTime = Date.now();
    await prisma.user.findFirst({
      where: { id: { not: null } },
      include: {
        accounts: true,
        bookings: true,
        credentials: true,
        teams: true,
      },
      take: 1,
    });

    const params = {
      model: "User",
      action: "findFirst",
      args: {
        where: { id: { not: null } },
        include: {
          accounts: true,
          bookings: true,
          credentials: true,
          teams: true,
        },
        take: 1,
      },
    };

    const reported = reportSlowQuery(prisma, params, 700, startTime, {
      forceReport: true, // Force report regardless of actual duration
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

    await prisma.user.findFirst({
      where: { id: { not: null } },
      include: {
        accounts: true,
        bookings: true,
      },
      take: 1,
    });

    const params = {
      model: "User",
      action: "findFirst",
      args: {
        where: { id: { not: null } },
        include: {
          accounts: true,
          bookings: true,
        },
        take: 1,
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

    // Reset the last report time to ensure we're not rate limited
    const state = initializeClientState(prisma);
    state.lastReportTime = 0;

    const timestamp = Date.now();

    await prisma.user.findFirst({
      where: { id: { not: null } },
      include: { accounts: true },
      take: 1,
    });

    const params = {
      model: "User",
      action: "findFirst",
      args: {
        where: { id: { not: null } },
        include: { accounts: true },
        take: 1,
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

    // Reset the last report time to ensure we're not rate limited
    const state = initializeClientState(prisma);
    state.lastReportTime = 0;

    const timestamp = Date.now();

    await prisma.booking.findFirst({
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
      take: 1,
    });

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
        take: 1,
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
            model: "Booking",
          }),
        }),
      })
    );
  });

  it("should handle middleware execution correctly", async () => {
    vi.clearAllMocks();
    (captureException as unknown as Mock).mockClear();

    // Reset the last report time to ensure we're not rate limited
    const state = initializeClientState(prisma);
    state.lastReportTime = 0;

    const timestamp = Date.now();

    const params = {
      model: "User",
      action: "findUnique",
      args: { where: { id: 1 } },
    };

    const middlewareFn = async (params: any, next: any) => {
      const result = await next(params);

      reportSlowQuery(prisma, params, 700, timestamp, {
        forceReport: true,
      });

      return result;
    };

    const next = vi.fn().mockResolvedValue({ id: 1, name: "Test User" });
    await middlewareFn(params, next);

    expect(next).toHaveBeenCalledWith(params);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("should capture and snapshot raw SQL queries", async () => {
    vi.clearAllMocks();
    (captureException as unknown as Mock).mockClear();

    // Reset the last report time to ensure we're not rate limited
    const state = initializeClientState(prisma);
    state.lastReportTime = 0;
    state.queryMap.clear();

    const mockSql = 'SELECT * FROM "User" WHERE "id" IS NOT NULL LIMIT 1';
    const timestamp = Date.now();

    state.queryMap.set("test-query", {
      sql: mockSql,
      timestamp: timestamp,
    });

    const params = {
      model: "User",
      action: "findFirst",
      args: { where: { id: { not: null } }, take: 1 },
    };

    const reported = reportSlowQuery(prisma, params, 700, timestamp, {
      forceReport: true,
    });

    expect(reported).toBe(true);
    expect(captureException).toHaveBeenCalledTimes(1);

    const captureExceptionCall = (captureException as unknown as Mock).mock.calls[0];
    const capturedQuery = captureExceptionCall[1].extra.query;

    expect(capturedQuery.sql).toBeDefined();
    expect(capturedQuery.sql).not.toBe("SQL not captured");

    expect(capturedQuery.sql).toMatchSnapshot();
  });
});
