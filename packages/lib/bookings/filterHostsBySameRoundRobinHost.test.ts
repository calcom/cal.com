import { describe, expect, it, vi, afterEach } from "vitest";

import prisma from "@calcom/prisma";

import { filterHostsBySameRoundRobinHost } from "./filterHostsBySameRoundRobinHost";

// Mocking setup
const prismaMock = {
  booking: {
    findFirst: vi.fn(), // Mock the findFirst method
  },
};

// Use `vi.spyOn` to make `prisma.booking.groupBy` call the mock instead
vi.spyOn(prisma.booking, "findFirst").mockImplementation(prismaMock.booking.findFirst);

afterEach(() => {
  // Clear call history before each test to avoid cross-test interference
  prismaMock.booking.findFirst.mockClear();
});

describe("filterHostsBySameRoundRobinHost", () => {
  it("skips filter if rescheduleWithSameRoundRobinHost set to false", async () => {
    const hosts = [
      { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
    ];
    expect(
      filterHostsBySameRoundRobinHost({
        hosts,
        rescheduleUid: "some-uid",
        rescheduleWithSameRoundRobinHost: false,
        routedTeamMemberIds: null,
      })
    ).resolves.toStrictEqual(hosts);
  });
  it("skips filter if rerouting", async () => {
    const hosts = [
      { isFixed: true as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
    ];
    expect(
      filterHostsBySameRoundRobinHost({
        hosts,
        rescheduleUid: "some-uid",
        rescheduleWithSameRoundRobinHost: true,
        routedTeamMemberIds: [23],
      })
    ).resolves.toStrictEqual(hosts);
  });

  it("correctly selects the same host if the filter applies and the host is in the RR users", async () => {
    prismaMock.booking.findFirst.mockResolvedValue({ userId: 1 });

    const hosts = [
      { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
      { isFixed: false as const, createdAt: new Date(), user: { id: 2, email: "example2@acme.com" } },
    ];
    // Same host should be selected
    expect(
      filterHostsBySameRoundRobinHost({
        hosts,
        rescheduleUid: "some-uid",
        rescheduleWithSameRoundRobinHost: true,
        routedTeamMemberIds: null,
      })
    ).resolves.toStrictEqual([hosts[0]]);
  });

  // Tests for bookings that have more than one host
  describe("Fixed hosts and round robin groups support", () => {
    it("should return organizer and attendee hosts", async () => {
      prismaMock.booking.findFirst.mockResolvedValue({
        userId: 1,
        attendees: [
          { email: "host2@acme.com" },
          { email: "host3@acme.com" },
          { email: "attendee@example.com" }, // Non-host attendee
        ],
      });

      const hosts = [
        { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "host1@acme.com" } },
        { isFixed: false as const, createdAt: new Date(), user: { id: 2, email: "host2@acme.com" } },
        { isFixed: false as const, createdAt: new Date(), user: { id: 3, email: "host3@acme.com" } },
        { isFixed: false as const, createdAt: new Date(), user: { id: 4, email: "host4@acme.com" } },
      ];

      const result = await filterHostsBySameRoundRobinHost({
        hosts,
        rescheduleUid: "some-uid",
        rescheduleWithSameRoundRobinHost: true,
        routedTeamMemberIds: null,
      });

      // Should return organizer host (id: 1) and attendee hosts (ids: 2, 3)
      expect(result).toHaveLength(3);
      expect(result).toEqual([
        expect.objectContaining({ user: { id: 1, email: "host1@acme.com" } }), // organizer
        expect.objectContaining({ user: { id: 2, email: "host2@acme.com" } }), // attendee
        expect.objectContaining({ user: { id: 3, email: "host3@acme.com" } }), // attendee
      ]);
    });

    it("should return only organizer host when no attendees match current hosts", async () => {
      prismaMock.booking.findFirst.mockResolvedValue({
        userId: 1,
        attendees: [
          { email: "attendee1@example.com" }, // Non-host attendee
          { email: "attendee2@example.com" }, // Non-host attendee
        ],
      });

      const hosts = [
        { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "host1@acme.com" } },
        { isFixed: false as const, createdAt: new Date(), user: { id: 2, email: "host2@acme.com" } },
      ];

      const result = await filterHostsBySameRoundRobinHost({
        hosts,
        rescheduleUid: "some-uid",
        rescheduleWithSameRoundRobinHost: true,
        routedTeamMemberIds: null,
      });

      // Should return only organizer host
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ user: { id: 1, email: "host1@acme.com" } }));
    });
  });
});
