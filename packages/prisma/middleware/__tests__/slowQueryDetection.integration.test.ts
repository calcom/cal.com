import { captureException } from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import type { Mock } from "vitest";

import prisma from "../../test/fixtures/prismaMock";
import slowQueryDetectionMiddleware from "../slowQueryDetection";

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
    mockTime = 0;

    (captureException as unknown as Mock).mockClear();

    process.env.SLOW_QUERY_THRESHOLD_MS = "500";
    process.env.NODE_ENV = "test";

    slowQueryDetectionMiddleware(prisma);
  });

  afterEach(() => {
    delete process.env.SLOW_QUERY_THRESHOLD_MS;
    delete process.env.NODE_ENV;
  });

  it("should not report fast queries to Sentry", async () => {
    mockTime = 100;

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query: "SELECT * FROM users WHERE email = 'test@example.com' LIMIT 1",
        timestamp: Date.now(),
      });
    }

    await prisma.user.findFirst({
      where: { email: "test@example.com" },
    });

    mockTime = 400;

    expect(captureException).not.toHaveBeenCalled();
  });

  it("should report slow queries to Sentry with SQL details", async () => {
    mockTime = 100;

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query:
          "SELECT * FROM users JOIN accounts ON users.id = accounts.userId WHERE users.email = 'test@example.com' LIMIT 1",
        timestamp: Date.now(),
      });
    }

    const queryPromise = prisma.$transaction(async (tx) => {
      return tx.user.findFirst({
        where: { email: "test@example.com" },
        include: {
          accounts: true,
          bookings: true,
          credentials: true,
          teams: true,
          workflows: true,
        },
      });
    });

    mockTime = 700;

    await queryPromise;

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Slow Prisma Query"),
      }),
      expect.objectContaining({
        extra: expect.objectContaining({
          query: expect.objectContaining({
            action: expect.any(String),
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
    mockTime = 100;

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query:
          "SELECT * FROM users JOIN accounts ON users.id = accounts.userId WHERE users.email = 'test@example.com' LIMIT 1",
        timestamp: Date.now(),
      });
    }

    await prisma.user.findFirst({
      where: { email: "test@example.com" },
      include: {
        accounts: true,
        bookings: true,
      },
    });

    mockTime = 700;

    (captureException as unknown as Mock).mockClear();

    mockTime = 800;

    await prisma.user.findFirst({
      where: { email: "test@example.com" },
      include: {
        accounts: true,
        bookings: true,
      },
    });

    mockTime = 1400;

    expect(captureException).not.toHaveBeenCalled();
  });

  it("should use the configured threshold from environment variable", async () => {
    vi.clearAllMocks();
    mockTime = 0;
    (captureException as unknown as Mock).mockClear();

    process.env.SLOW_QUERY_THRESHOLD_MS = "200";

    slowQueryDetectionMiddleware(prisma);

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query:
          "SELECT * FROM users JOIN accounts ON users.id = accounts.userId WHERE users.email = 'test@example.com' LIMIT 1",
        timestamp: Date.now(),
      });
    }

    mockTime = 100;

    const queryPromise = prisma.user.findFirst({
      where: { email: "test@example.com" },
      include: { accounts: true },
    });

    mockTime = 350;

    await queryPromise;

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("should handle complex queries with joins", async () => {
    vi.clearAllMocks();
    mockTime = 0;
    (captureException as unknown as Mock).mockClear();

    if ((prisma as any).__queryCallback) {
      (prisma as any).__queryCallback({
        query:
          "SELECT * FROM bookings JOIN users ON bookings.userId = users.id JOIN teams ON users.teamId = teams.id WHERE bookings.userId IS NOT NULL LIMIT 1",
        timestamp: Date.now(),
      });
    }

    mockTime = 100;

    const queryPromise = prisma.booking.findFirst({
      where: {
        userId: { not: null },
      },
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
    });

    mockTime = 700;

    await queryPromise;

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
});
