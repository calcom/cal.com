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
});
