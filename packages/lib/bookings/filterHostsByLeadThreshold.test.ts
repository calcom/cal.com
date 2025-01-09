import { describe, expect, it, vi, afterEach } from "vitest";

import prisma from "@calcom/prisma";

import {
  filterHostsByLeadThreshold,
  errorCodes,
  _filterHostByLeadThreshold,
} from "./filterHostsByLeadThreshold";

// Import the original Prisma client

// Mocking setup
const prismaMock = {
  booking: {
    groupBy: vi.fn(), // Mock the groupBy method
  },
};

// Use `vi.spyOn` to make `prisma.booking.groupBy` call the mock instead
vi.spyOn(prisma.booking, "groupBy").mockImplementation(prismaMock.booking.groupBy);

afterEach(() => {
  // Clear call history before each test to avoid cross-test interference
  prismaMock.booking.groupBy.mockClear();
});

describe("filterHostByLeadThreshold", () => {
  it("skips filter if lead threshold is null", async () => {
    const hosts = [
      { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "member1-acme@example.com" } },
    ];
    expect(
      filterHostsByLeadThreshold({
        hosts,
        maxLeadThreshold: null,
        eventTypeId: 1,
      })
    ).resolves.toStrictEqual(hosts);
  });
  it("throws error when maxLeadThreshold = 0, 0 ahead makes no sense.", () => {
    expect(() =>
      _filterHostByLeadThreshold({
        host: { leadOffset: 3 },
        maxLeadThreshold: 0,
      })
    ).toThrow(errorCodes.MAX_LEAD_THRESHOLD_FALSY);
  });

  it("correctly disqualifies a host when the lead offset is exceeding the threshold", async () => {
    prismaMock.booking.groupBy.mockResolvedValue([
      { userId: 1, _count: { _all: 5 } },
      { userId: 2, _count: { _all: 10 } },
    ]);
    const hosts = [
      { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
      { isFixed: false as const, createdAt: new Date(), user: { id: 2, email: "example2@acme.com" } },
    ];
    // host is not disqualified as the threshold of 11 is not exceeded.
    expect(
      filterHostsByLeadThreshold({
        hosts,
        maxLeadThreshold: 11,
        eventTypeId: 1,
      })
    ).resolves.toStrictEqual(hosts);
    // with a reduced threshold of 3 the second host (t=10) is disqualified
    expect(
      filterHostsByLeadThreshold({
        hosts,
        maxLeadThreshold: 3,
        eventTypeId: 1,
      })
    ).resolves.toStrictEqual([hosts.find(({ user: { id: userId } }) => userId === 1)]);
    // double check that lead thresholds are disabled when maxLeadThreshold=null as I'm paranoid.
    expect(
      filterHostsByLeadThreshold({
        hosts,
        maxLeadThreshold: null,
        eventTypeId: 1,
      })
    ).resolves.toStrictEqual(hosts);
  });
});
