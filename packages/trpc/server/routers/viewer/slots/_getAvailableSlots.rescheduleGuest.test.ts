import { beforeEach, describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { PeriodType, SchedulingType } from "@calcom/prisma/enums";

vi.mock("@calcom/features/watchlist/operations/filter-blocked-hosts.controller", () => ({
  filterBlockedHosts: vi.fn(async (hosts: unknown[]) => ({ eligibleHosts: hosts })),
}));

import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

describe("AvailableSlotsService - rescheduled guest is injected into slot calculation", () => {
  let service: AvailableSlotsService;
  let mockDependencies: {
    redisClient: {};
    qualifiedHostsService: {
      findQualifiedHostsWithDelegationCredentials: ReturnType<typeof vi.fn>;
    };
  };

  const qualifiedHost = {
    isFixed: false,
    groupId: "rr-1",
    user: {
      id: 10,
      email: "host@example.com",
      timeZone: "UTC",
      credentials: [],
    },
  };

  const fallbackHost = {
    isFixed: false,
    groupId: "rr-2",
    user: {
      id: 11,
      email: "fallback@example.com",
      timeZone: "UTC",
      credentials: [],
    },
  };

  const rescheduledGuestUser = {
    id: 20,
    email: "guest@example.com",
    timeZone: "UTC",
    credentials: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      redisClient: {},
      qualifiedHostsService: {
        findQualifiedHostsWithDelegationCredentials: vi.fn().mockResolvedValue({
          qualifiedRRHosts: [qualifiedHost],
          allFallbackRRHosts: [qualifiedHost, fallbackHost],
          fixedHosts: [],
        }),
      },
    };

    service = new AvailableSlotsService(mockDependencies as unknown as IAvailableSlotsService);

    (service as any).getRegularOrDynamicEventType = vi.fn().mockResolvedValue({
      id: 123,
      schedulingType: SchedulingType.ROUND_ROBIN,
      periodType: PeriodType.UNLIMITED,
      minimumBookingNotice: 0,
      length: 30,
      offsetStart: 0,
      slotInterval: 30,
      showOptimizedSlots: false,
      team: null,
      restrictionScheduleId: null,
      useBookerTimezone: false,
    });

    (service as any).resolveOrganizationIdForBlocking = vi.fn().mockResolvedValue(null);
    (service as any).getRescheduledGuestUser = vi.fn().mockResolvedValue(rescheduledGuestUser);
    (service as any).checkRestrictionScheduleEnabled = vi.fn().mockResolvedValue(false);
    (service as any)._getReservedSlotsAndCleanupExpired = vi.fn().mockResolvedValue([]);
  });

  it("passes the guest into both the initial and fallback round-robin host calculations", async () => {
    const calculateHostsAndAvailabilities = vi
      .fn()
      .mockResolvedValueOnce({
        allUsersAvailability: [],
        usersWithCredentials: [],
        currentSeats: undefined,
      })
      .mockResolvedValueOnce({
        allUsersAvailability: [],
        usersWithCredentials: [],
        currentSeats: undefined,
      })
      .mockResolvedValueOnce({
        allUsersAvailability: [],
        usersWithCredentials: [],
        currentSeats: undefined,
      });

    (service as any).calculateHostsAndAvailabilities = calculateHostsAndAvailabilities;

    await (service as any)._getAvailableSlots({
      input: {
        startTime: dayjs().add(20, "day").toISOString(),
        endTime: dayjs().add(21, "day").toISOString(),
        timeZone: "UTC",
        eventTypeSlug: "demo",
        usernameList: ["host"],
        duration: 30,
        rescheduleUid: "booking-uid",
      },
      ctx: undefined,
    });

    expect((service as any).getRescheduledGuestUser).toHaveBeenCalledWith({
      rescheduleUid: "booking-uid",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    expect(calculateHostsAndAvailabilities).toHaveBeenCalledTimes(3);

    const firstCallHosts = calculateHostsAndAvailabilities.mock.calls[0][0].hosts;
    const firstTwoWeeksHosts = calculateHostsAndAvailabilities.mock.calls[1][0].hosts;
    const fallbackCallHosts = calculateHostsAndAvailabilities.mock.calls[2][0].hosts;

    expect(firstCallHosts.map((host: any) => host.user.email)).toEqual([
      "host@example.com",
      "guest@example.com",
    ]);

    expect(firstTwoWeeksHosts.map((host: any) => host.user.email)).toEqual([
      "host@example.com",
      "guest@example.com",
    ]);

    expect(fallbackCallHosts.map((host: any) => host.user.email)).toEqual([
      "host@example.com",
      "fallback@example.com",
      "guest@example.com",
    ]);
  });
});
