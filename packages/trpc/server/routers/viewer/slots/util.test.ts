import dayjs from "@calcom/dayjs";
import { BookingDateInPastError, isTimeOutOfBounds } from "@calcom/lib/isOutOfBounds";
import { SchedulingType } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvailableSlotsService } from "./util";

describe("BookingDateInPastError handling", () => {
  it("should convert BookingDateInPastError to TRPCError with BAD_REQUEST code", () => {
    const testFilteringLogic = () => {
      const mockSlot = {
        time: "2024-05-20T12:30:00.000Z", // Past date
        attendees: 1,
      };

      const mockEventType = {
        minimumBookingNotice: 0,
      };

      const isFutureLimitViolationForTheSlot = false; // Mock this to false

      let isOutOfBounds = false;
      try {
        // This will throw BookingDateInPastError for past dates
        isOutOfBounds = isTimeOutOfBounds({
          time: mockSlot.time,
          minimumBookingNotice: mockEventType.minimumBookingNotice,
        });
      } catch (error) {
        if (error instanceof BookingDateInPastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }

      return !isFutureLimitViolationForTheSlot && !isOutOfBounds;
    };

    // This should throw a TRPCError with BAD_REQUEST code
    expect(() => testFilteringLogic()).toThrow(TRPCError);
    expect(() => testFilteringLogic()).toThrow("Attempting to book a meeting in the past.");
  });
});

describe("AvailableSlotsService._getRescheduleGuestUser", () => {
  const findByUidIncludeEventType = vi.fn();
  const findBySeatReferenceUidIncludeEventType = vi.fn();
  const findAvailabilityUserByEmail = vi.fn();

  const serviceDependencies = {
    bookingRepo: {
      findByUidIncludeEventType,
      findBySeatReferenceUidIncludeEventType,
    },
    userRepo: {
      findAvailabilityUserByEmail,
    },
  };

  const service = new AvailableSlotsService(
    serviceDependencies as unknown as ConstructorParameters<typeof AvailableSlotsService>[0]
  );

  type GetRescheduleGuestUserArgs = {
    rescheduleUid?: string | null;
    organizerEmails: string[];
    schedulingType: SchedulingType | null;
    rescheduledBy?: string | null;
  };

  type GetAggregatedAvailabilityForEventArgs = {
    allUsersAvailability: {
      dateRanges: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
      oooExcludedDateRanges: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
      user: { isFixed: boolean; groupId: string | null };
    }[];
    schedulingType: SchedulingType | null;
    hasInjectedRescheduleGuest: boolean;
  };

  const typedService = service as unknown as {
    _getRescheduleGuestUser: (args: GetRescheduleGuestUserArgs) => Promise<unknown>;
    getAggregatedAvailabilityForEvent: (
      args: GetAggregatedAvailabilityForEventArgs
    ) => { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
  };

  const getRescheduleGuestUser = (args: GetRescheduleGuestUserArgs) => {
    return typedService._getRescheduleGuestUser(args);
  };

  const getAggregatedAvailabilityForEvent = (args: GetAggregatedAvailabilityForEventArgs) => {
    return typedService.getAggregatedAvailabilityForEvent(args);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns guest availability user for host-initiated reschedule", async () => {
    findByUidIncludeEventType.mockResolvedValue({
      user: {
        email: "host@example.com",
      },
      attendees: [
        {
          email: "host@example.com",
        },
        {
          email: "guest@example.com",
        },
      ],
    });

    const expectedGuestUser = {
      id: 102,
      email: "guest@example.com",
      username: "guest",
      timeZone: "UTC",
      bufferTime: 0,
      availability: [],
      timeFormat: null,
      defaultScheduleId: null,
      isPlatformManaged: false,
      schedules: [],
      credentials: [],
      allSelectedCalendars: [],
      userLevelSelectedCalendars: [],
      travelSchedules: [],
      groupId: null,
      isFixed: true,
    };
    findAvailabilityUserByEmail.mockResolvedValue(expectedGuestUser);

    const result = await getRescheduleGuestUser({
      rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: "host@example.com",
    });

    expect(findByUidIncludeEventType).toHaveBeenCalledWith({
      bookingUid: "BOOKING_TO_RESCHEDULE_UID",
    });
    expect(findBySeatReferenceUidIncludeEventType).not.toHaveBeenCalled();
    expect(findAvailabilityUserByEmail).toHaveBeenCalledWith({
      email: "guest@example.com",
    });
    expect(result).toEqual(expectedGuestUser);
  });

  it("returns null when booking cannot be resolved by uid or seat reference", async () => {
    findByUidIncludeEventType.mockResolvedValue(null);
    findBySeatReferenceUidIncludeEventType.mockResolvedValue(null);

    const result = await getRescheduleGuestUser({
      rescheduleUid: "UNKNOWN_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: "host@example.com",
    });

    expect(findByUidIncludeEventType).toHaveBeenCalledWith({
      bookingUid: "UNKNOWN_UID",
    });
    expect(findBySeatReferenceUidIncludeEventType).toHaveBeenCalledWith({
      seatReferenceUid: "UNKNOWN_UID",
    });
    expect(findAvailabilityUserByEmail).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("resolves seat reference UID to booking for host-initiated reschedule", async () => {
    findByUidIncludeEventType.mockResolvedValue(null);
    findBySeatReferenceUidIncludeEventType.mockResolvedValue({
      user: {
        email: "host@example.com",
      },
      attendees: [
        {
          email: "host@example.com",
        },
        {
          email: "guest@example.com",
        },
      ],
    });
    findAvailabilityUserByEmail.mockResolvedValue({
      id: 102,
      email: "guest@example.com",
    });

    const result = await getRescheduleGuestUser({
      rescheduleUid: "SEAT_REFERENCE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: "host@example.com",
    });

    expect(findByUidIncludeEventType).toHaveBeenCalledWith({
      bookingUid: "SEAT_REFERENCE_UID",
    });
    expect(findBySeatReferenceUidIncludeEventType).toHaveBeenCalledWith({
      seatReferenceUid: "SEAT_REFERENCE_UID",
    });
    expect(findAvailabilityUserByEmail).toHaveBeenCalledWith({
      email: "guest@example.com",
    });
    expect(result).toEqual({
      id: 102,
      email: "guest@example.com",
    });
  });

  it("preserves attendee alias email when resolved user has a different primary email", async () => {
    findByUidIncludeEventType.mockResolvedValue({
      user: {
        email: "host@example.com",
      },
      attendees: [
        {
          email: "host@example.com",
        },
        {
          email: "guest-alias@example.com",
        },
      ],
    });

    findAvailabilityUserByEmail.mockResolvedValue({
      id: 102,
      email: "guest-primary@example.com",
    });

    const result = await getRescheduleGuestUser({
      rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: "host@example.com",
    });

    expect(findAvailabilityUserByEmail).toHaveBeenCalledWith({
      email: "guest-alias@example.com",
    });
    expect(result).toEqual({
      id: 102,
      email: "guest-alias@example.com",
    });
  });

  it("returns null when booking has no attendees", async () => {
    findByUidIncludeEventType.mockResolvedValue({
      user: {
        email: "host@example.com",
      },
      attendees: [],
    });

    const result = await getRescheduleGuestUser({
      rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: "host@example.com",
    });

    expect(result).toBeNull();
    expect(findAvailabilityUserByEmail).not.toHaveBeenCalled();
  });

  it("filters organizer attendees case-insensitively", async () => {
    findByUidIncludeEventType.mockResolvedValue({
      user: {
        email: "host@example.com",
      },
      attendees: [
        {
          email: "HOST@EXAMPLE.COM",
        },
      ],
    });

    const result = await getRescheduleGuestUser({
      rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: "host@example.com",
    });

    expect(result).toBeNull();
    expect(findAvailabilityUserByEmail).not.toHaveBeenCalled();
  });

  it("matches host-initiated reschedule case-insensitively", async () => {
    findByUidIncludeEventType.mockResolvedValue({
      user: {
        email: "HOST@EXAMPLE.COM",
      },
      attendees: [
        {
          email: "host@example.com",
        },
        {
          email: "guest@example.com",
        },
      ],
    });
    findAvailabilityUserByEmail.mockResolvedValue({
      id: 102,
      email: "guest@example.com",
    });

    const result = await getRescheduleGuestUser({
      rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: "host@example.com",
    });

    expect(findAvailabilityUserByEmail).toHaveBeenCalledWith({
      email: "guest@example.com",
    });
    expect(result).toEqual({
      id: 102,
      email: "guest@example.com",
    });
  });

  it("returns null when attendee initiates reschedule", async () => {
    findByUidIncludeEventType.mockResolvedValue({
      user: {
        email: "host@example.com",
      },
      attendees: [
        {
          email: "guest@example.com",
        },
      ],
    });

    const result = await getRescheduleGuestUser({
      rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: "guest@example.com",
    });

    expect(result).toBeNull();
    expect(findAvailabilityUserByEmail).not.toHaveBeenCalled();
  });

  it("returns null when guest is not a Cal.com user", async () => {
    findByUidIncludeEventType.mockResolvedValue({
      user: {
        email: "host@example.com",
      },
      attendees: [
        {
          email: "guest@external.com",
        },
      ],
    });
    findAvailabilityUserByEmail.mockResolvedValue(null);

    const result = await getRescheduleGuestUser({
      rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: "host@example.com",
    });

    expect(result).toBeNull();
    expect(findAvailabilityUserByEmail).toHaveBeenCalledWith({
      email: "guest@external.com",
    });
  });

  it("returns null for collective scheduling", async () => {
    const result = await getRescheduleGuestUser({
      rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.COLLECTIVE,
      rescheduledBy: "host@example.com",
    });

    expect(result).toBeNull();
    expect(findByUidIncludeEventType).not.toHaveBeenCalled();
    expect(findAvailabilityUserByEmail).not.toHaveBeenCalled();
  });

  it("returns null when rescheduledBy is missing", async () => {
    const result = await getRescheduleGuestUser({
      rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      organizerEmails: ["host@example.com"],
      schedulingType: SchedulingType.ROUND_ROBIN,
      rescheduledBy: null,
    });

    expect(result).toBeNull();
    expect(findByUidIncludeEventType).not.toHaveBeenCalled();
    expect(findAvailabilityUserByEmail).not.toHaveBeenCalled();
  });

  it("preserves single-host OOO semantics when reschedule guest is injected", async () => {
    const hostRangeStart = dayjs("2025-01-23T11:00:00.000Z");
    const hostRangeEnd = dayjs("2025-01-23T11:30:00.000Z");

    const aggregatedAvailability = getAggregatedAvailabilityForEvent({
      allUsersAvailability: [
        {
          dateRanges: [{ start: hostRangeStart, end: hostRangeEnd }],
          oooExcludedDateRanges: [],
          user: { isFixed: true, groupId: null },
        },
        {
          dateRanges: [{ start: hostRangeStart, end: hostRangeEnd }],
          oooExcludedDateRanges: [{ start: hostRangeStart, end: hostRangeEnd }],
          user: { isFixed: true, groupId: null },
        },
      ],
      schedulingType: null,
      hasInjectedRescheduleGuest: true,
    });

    expect(aggregatedAvailability).toEqual([{ start: hostRangeStart, end: hostRangeEnd }]);
  });

  it("intersects single-host availability with injected guest availability windows", async () => {
    const hostRangeStart = dayjs("2025-01-23T10:00:00.000Z");
    const hostRangeEnd = dayjs("2025-01-23T12:00:00.000Z");
    const guestWindowStart = dayjs("2025-01-23T10:30:00.000Z");
    const guestWindowEnd = dayjs("2025-01-23T11:00:00.000Z");

    const aggregatedAvailability = getAggregatedAvailabilityForEvent({
      allUsersAvailability: [
        {
          dateRanges: [{ start: hostRangeStart, end: hostRangeEnd }],
          oooExcludedDateRanges: [],
          user: { isFixed: true, groupId: null },
        },
        {
          dateRanges: [{ start: hostRangeStart, end: hostRangeEnd }],
          oooExcludedDateRanges: [{ start: guestWindowStart, end: guestWindowEnd }],
          user: { isFixed: true, groupId: null },
        },
      ],
      schedulingType: null,
      hasInjectedRescheduleGuest: true,
    });

    expect(
      aggregatedAvailability.map((range) => ({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      }))
    ).toEqual([
      {
        start: "2025-01-23T10:30:00.000Z",
        end: "2025-01-23T11:00:00.000Z",
      },
    ]);
  });
});
