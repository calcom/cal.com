import { describe, expect, it, vi, afterEach } from "vitest";

import type { BookingRepository } from "@calcom/lib/server/repository/booking";

import { FilterHostsService } from "./filterHostsBySameRoundRobinHost";

const mockBookingRepo = {
  findOriginalRescheduledBookingUserId: vi.fn(),
} as unknown as BookingRepository;

const filterHostsService = new FilterHostsService({
  bookingRepo: mockBookingRepo,
});

afterEach(() => {
  mockBookingRepo.findOriginalRescheduledBookingUserId.mockClear();
});

describe("FilterHostsService", () => {
  it("skips filter if rescheduleWithSameRoundRobinHost set to false", async () => {
    const hosts = [
      { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
    ];
    expect(
      filterHostsService.filterHostsBySameRoundRobinHost({
        hosts,
        rescheduleUid: "some-uid",
        rescheduleWithSameRoundRobinHost: false,
        routedTeamMemberIds: null,
      })
    ).resolves.toStrictEqual(hosts);
  });
  it("skips filter if rerouting", async () => {
    const hosts = [
      { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
    ];
    expect(
      filterHostsService.filterHostsBySameRoundRobinHost({
        hosts,
        rescheduleUid: "some-uid",
        rescheduleWithSameRoundRobinHost: true,
        routedTeamMemberIds: [23],
      })
    ).resolves.toStrictEqual(hosts);
  });

  it("correctly selects the same host if the filter applies and the host is in the RR users", async () => {
    mockBookingRepo.findOriginalRescheduledBookingUserId.mockResolvedValue({ userId: 1 });

    const hosts = [
      { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
      { isFixed: false as const, createdAt: new Date(), user: { id: 2, email: "example2@acme.com" } },
    ];
    expect(
      filterHostsService.filterHostsBySameRoundRobinHost({
        hosts,
        rescheduleUid: "some-uid",
        rescheduleWithSameRoundRobinHost: true,
        routedTeamMemberIds: null,
      })
    ).resolves.toStrictEqual([hosts[0]]);
  });
});
