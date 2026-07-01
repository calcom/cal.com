import dayjs from "@calcom/dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

describe("AvailableSlotsService - calculateHostsAndAvailabilities", () => {
  let service: AvailableSlotsService;
  let mockDependencies: {
    bookingRepo: {
      findAllExistingBookingsForEventTypeBetween: ReturnType<typeof vi.fn>;
    };
    oooRepo: {
      findManyOOO: ReturnType<typeof vi.fn>;
    };
    busyTimesService: {
      getBusyTimesForLimitChecks: ReturnType<typeof vi.fn>;
    };
    userAvailabilityService: {
      getUsersAvailability: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      bookingRepo: {
        findAllExistingBookingsForEventTypeBetween: vi.fn().mockResolvedValue([]),
      },
      oooRepo: {
        findManyOOO: vi.fn().mockResolvedValue([]),
      },
      busyTimesService: {
        getBusyTimesForLimitChecks: vi.fn().mockResolvedValue([]),
      },
      userAvailabilityService: {
        getUsersAvailability: vi.fn().mockResolvedValue([
          {
            busy: [],
            dateRanges: [],
            oooExcludedDateRanges: [],
            timeZone: "UTC",
            datesOutOfOffice: [],
          },
        ]),
      },
    };

    service = new AvailableSlotsService(mockDependencies as unknown as IAvailableSlotsService);
  });

  it("widens the booking prefetch window by the max defined buffer on both sides", async () => {
    const startTime = dayjs("2026-06-11T09:20:00.000Z");
    const endTime = dayjs("2026-06-11T10:00:00.000Z");

    const input = {
      duration: 20,
      rescheduleUid: undefined,
    };

    const eventType = {
      id: 42,
      seatsPerTimeSlot: null,
      afterEventBuffer: 30,
      beforeEventBuffer: 0,
      schedule: { timeZone: "UTC" },
      bookingLimits: null,
      durationLimits: null,
    };

    const hosts = [
      {
        user: {
          id: 1,
          email: "host@example.com",
          timeZone: "UTC",
          credentials: [],
        },
      },
    ];

    await (
      service as unknown as {
        calculateHostsAndAvailabilities: (args: {
          input: typeof input;
          eventType: typeof eventType;
          hosts: typeof hosts;
          loggerWithEventDetails: {
            debug: ReturnType<typeof vi.fn>;
            info: ReturnType<typeof vi.fn>;
          };
          startTime: typeof startTime;
          endTime: typeof endTime;
          bypassBusyCalendarTimes: boolean;
          silentCalendarFailures: boolean;
          mode?: "slots";
        }) => Promise<unknown>;
      }
    ).calculateHostsAndAvailabilities({
      input,
      eventType,
      hosts,
      loggerWithEventDetails: {
        debug: vi.fn(),
        info: vi.fn(),
      },
      startTime,
      endTime,
      bypassBusyCalendarTimes: false,
      silentCalendarFailures: false,
      mode: "slots",
    });

    expect(mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween).toHaveBeenCalledTimes(1);

    const [query] = mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween.mock.calls[0];
    expect(query.startDate.getTime()).toBe(startTime.toDate().getTime() - 120 * 60 * 1000);
    expect(query.endDate.getTime()).toBe(endTime.toDate().getTime() + 120 * 60 * 1000);
  });
});
