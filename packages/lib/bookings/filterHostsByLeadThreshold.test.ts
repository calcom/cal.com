import { describe, expect, it, vi, afterEach } from "vitest";

import prisma from "@calcom/prisma";

import { getOrderedListOfLuckyUsers } from "../server/getLuckyUser";
import { filterHostsByLeadThreshold, errorCodes } from "./filterHostsByLeadThreshold";

// Import the original Prisma client

// Mocking setup
const prismaMock = {
  booking: {
    groupBy: vi.fn(), // Mock the groupBy method
  },
};

// Use `vi.spyOn` to make `prisma.booking.groupBy` call the mock instead
vi.spyOn(prisma.booking, "groupBy").mockImplementation(prismaMock.booking.groupBy);

vi.mock("../server/getLuckyUser", () => ({
  getOrderedListOfLuckyUsers: vi.fn(),
}));

afterEach(() => {
  // Clear call history before each test to avoid cross-test interference
  prismaMock.booking.groupBy.mockClear();
});

describe("filterHostByLeadThreshold", () => {
  it("skips filter if lead threshold is null", async () => {
    const hosts = [
      {
        isFixed: false as const,
        createdAt: new Date(),
        user: {
          id: 1,
          email: "member1-acme@example.com",
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];
    expect(
      filterHostsByLeadThreshold({
        hosts,
        maxLeadThreshold: null,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: {
            parentId: null,
          },
        },
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual(hosts);
  });

  it("throws error when maxLeadThreshold = 0, 0 ahead makes no sense.", async () => {
    expect(
      filterHostsByLeadThreshold({
        hosts: [],
        maxLeadThreshold: 0,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: {
            parentId: null,
          },
        },
        routingFormResponse: null,
      })
    ).rejects.toThrow(errorCodes.MAX_LEAD_THRESHOLD_FALSY);
  });

  it("correctly disqualifies a host when the lead offset is exceeding the threshold without weights", async () => {
    const hosts = [
      {
        isFixed: false as const,
        createdAt: new Date(),
        user: {
          id: 1,
          email: "member1-acme@example.com",
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
      {
        isFixed: false as const,
        createdAt: new Date(),
        user: {
          id: 2,
          email: "member2-acme@example.com",
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];

    getOrderedListOfLuckyUsers.mockResolvedValue({
      perUserData: {
        bookingsCount: { 1: 10, 2: 6 },
      },
    });

    expect(
      filterHostsByLeadThreshold({
        hosts,
        maxLeadThreshold: 3,
        eventType: {
          id: 1,
          isRRWeightsEnabled: false,
          team: {
            parentId: null,
          },
        },
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual([hosts[1]]); // host 1 (host[0]) disqualified
  });

  it("correctly disqualifies a host when the lead offset is exceeding the threshold with weights", async () => {
    const hosts = [
      {
        isFixed: false as const,
        createdAt: new Date(),
        user: {
          id: 1,
          email: "member1-acme@example.com",
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
      {
        isFixed: false as const,
        createdAt: new Date(),
        user: {
          id: 2,
          email: "member2-acme@example.com",
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
      {
        isFixed: false as const,
        createdAt: new Date(),
        user: {
          id: 3,
          email: "member3-acme@example.com",
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];

    getOrderedListOfLuckyUsers.mockResolvedValue({
      perUserData: {
        bookingsCount: { 1: 7, 2: 5, 3: 0 },
        weights: { 1: 100, 2: 50, 3: 20 },
        bookingShortfalls: { 1: 1, 2: -3, 3: 0 },
        calibrations: { 1: 1, 2: 2, 3: 1 },
      },
    });

    const test = filterHostsByLeadThreshold({
      hosts,
      maxLeadThreshold: 3,
      eventType: {
        id: 1,
        isRRWeightsEnabled: true,
        team: {
          parentId: null,
        },
      },
      routingFormResponse: null,
    });

    expect(
      filterHostsByLeadThreshold({
        hosts,
        maxLeadThreshold: 3,
        eventType: {
          id: 1,
          isRRWeightsEnabled: true,
          team: {
            parentId: null,
          },
        },
        routingFormResponse: null,
      })
    ).resolves.toStrictEqual([hosts[0], hosts[2]]); // host 2 (host[1]) disqualified
  });
});
