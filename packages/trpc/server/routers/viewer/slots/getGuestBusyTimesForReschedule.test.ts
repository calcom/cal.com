/**
 * Unit tests for guest availability check during host-initiated reschedule.
 * See: https://github.com/calcom/cal.com/issues/16378
 */
import dayjs from "@calcom/dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

// Type helper to access private method for testing
type PrivateAvailableSlotsService = {
  _getGuestBusyTimesForReschedule: (params: {
    rescheduleUid: string;
    startTime: ReturnType<typeof dayjs>;
    endTime: ReturnType<typeof dayjs>;
    hostUserIds: Set<number>;
  }) => Promise<{ start: Date; end: Date }[]>;
};

/** Build the { users, byEmail } shape that findManyByEmailsIncludingSecondary now returns. */
function makeUserResult(userList: { id: number; email: string }[]) {
  const byEmail = new Map(userList.map((u) => [u.email.toLowerCase(), u]));
  return { users: userList, byEmail };
}

describe("AvailableSlotsService - _getGuestBusyTimesForReschedule", () => {
  let service: AvailableSlotsService;
  let mockDependencies: {
    bookingRepo: {
      findBookingByUid: ReturnType<typeof vi.fn>;
      findAllExistingBookingsForEventTypeBetween: ReturnType<typeof vi.fn>;
    };
    userRepo: {
      findManyByEmailsIncludingSecondary: ReturnType<typeof vi.fn>;
    };
  };

  const startTime = dayjs("2026-03-15T09:00:00.000Z");
  const endTime = dayjs("2026-03-15T17:00:00.000Z");
  const rescheduleUid = "test-reschedule-uid-123";

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      bookingRepo: {
        findBookingByUid: vi.fn(),
        findAllExistingBookingsForEventTypeBetween: vi.fn().mockResolvedValue([]),
      },
      userRepo: {
        findManyByEmailsIncludingSecondary: vi.fn().mockResolvedValue(makeUserResult([])),
      },
    };

    service = new AvailableSlotsService(mockDependencies as unknown as IAvailableSlotsService);
  });

  it("should return empty array when original booking is not found", async () => {
    mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(null);

    const result = await (
      service as unknown as PrivateAvailableSlotsService
    )._getGuestBusyTimesForReschedule({
      rescheduleUid,
      startTime,
      endTime,
      hostUserIds: new Set([1]),
    });

    expect(result).toEqual([]);
    expect(mockDependencies.userRepo.findManyByEmailsIncludingSecondary).not.toHaveBeenCalled();
  });

  it("should return empty array when the booking has no attendees", async () => {
    mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue({
      id: 1,
      uid: rescheduleUid,
      attendees: [],
    });

    const result = await (
      service as unknown as PrivateAvailableSlotsService
    )._getGuestBusyTimesForReschedule({
      rescheduleUid,
      startTime,
      endTime,
      hostUserIds: new Set([1]),
    });

    expect(result).toEqual([]);
    expect(mockDependencies.userRepo.findManyByEmailsIncludingSecondary).not.toHaveBeenCalled();
  });

  it("should return empty array when attendee is not a Cal.com user", async () => {
    mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue({
      id: 1,
      uid: rescheduleUid,
      attendees: [{ email: "guest@external.com", name: "External Guest" }],
    });
    // No matching Cal.com user found
    mockDependencies.userRepo.findManyByEmailsIncludingSecondary.mockResolvedValue(makeUserResult([]));

    const result = await (
      service as unknown as PrivateAvailableSlotsService
    )._getGuestBusyTimesForReschedule({
      rescheduleUid,
      startTime,
      endTime,
      hostUserIds: new Set([1]),
    });

    expect(result).toEqual([]);
    expect(mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween).not.toHaveBeenCalled();
  });

  it("should return empty array when the guest is already a host", async () => {
    const hostUserId = 42;
    mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue({
      id: 1,
      uid: rescheduleUid,
      attendees: [{ email: "host@example.com", name: "Host User" }],
    });
    // The attendee IS a Cal.com user — but they're also a host
    mockDependencies.userRepo.findManyByEmailsIncludingSecondary.mockResolvedValue(
      makeUserResult([{ id: hostUserId, email: "host@example.com" }])
    );

    const result = await (
      service as unknown as PrivateAvailableSlotsService
    )._getGuestBusyTimesForReschedule({
      rescheduleUid,
      startTime,
      endTime,
      hostUserIds: new Set([hostUserId]),
    });

    expect(result).toEqual([]);
    expect(mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween).not.toHaveBeenCalled();
  });

  it("should return guest busy times when the attendee is a Cal.com user and not a host", async () => {
    const guestUserId = 99;
    const guestEmail = "guest@calcom-user.com";

    const guestBookingStart = new Date("2026-03-15T10:00:00.000Z");
    const guestBookingEnd = new Date("2026-03-15T11:00:00.000Z");

    mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue({
      id: 1,
      uid: rescheduleUid,
      attendees: [{ email: guestEmail, name: "Cal.com Guest" }],
    });

    mockDependencies.userRepo.findManyByEmailsIncludingSecondary.mockResolvedValue(
      makeUserResult([{ id: guestUserId, email: guestEmail }])
    );

    mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween.mockResolvedValue([
      {
        id: 200,
        uid: "another-booking-uid",
        userId: guestUserId,
        startTime: guestBookingStart,
        endTime: guestBookingEnd,
        title: "Guest's Existing Meeting",
        attendees: [],
        eventType: { id: 10, beforeEventBuffer: 0, afterEventBuffer: 0, seatsPerTimeSlot: null },
      },
    ]);

    const result = await (
      service as unknown as PrivateAvailableSlotsService
    )._getGuestBusyTimesForReschedule({
      rescheduleUid,
      startTime,
      endTime,
      hostUserIds: new Set([1]), // host is user ID 1, not 99
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      start: guestBookingStart,
      end: guestBookingEnd,
    });

    expect(mockDependencies.userRepo.findManyByEmailsIncludingSecondary).toHaveBeenCalledWith({
      emails: [guestEmail],
    });

    expect(mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween).toHaveBeenCalledWith({
      userIdAndEmailMap: new Map([[guestUserId, guestEmail]]),
      startDate: startTime.toDate(),
      endDate: endTime.toDate(),
    });
  });

  it("should match attendee by secondary/alias email (not just primary email)", async () => {
    const guestUserId = 99;
    const primaryEmail = "primary@calcom-user.com";
    const aliasEmail = "alias@gmail.com"; // the email the attendee used to book

    const guestBookingStart = new Date("2026-03-15T10:00:00.000Z");
    const guestBookingEnd = new Date("2026-03-15T11:00:00.000Z");

    mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue({
      id: 1,
      uid: rescheduleUid,
      attendees: [{ email: aliasEmail, name: "Alias Guest" }],
    });

    // byEmail map is keyed by the alias email (secondary), not the primary
    const guestUser = { id: guestUserId, email: primaryEmail };
    mockDependencies.userRepo.findManyByEmailsIncludingSecondary.mockResolvedValue({
      users: [guestUser],
      byEmail: new Map([[aliasEmail, guestUser]]),
    });

    mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween.mockResolvedValue([
      {
        id: 200,
        uid: "another-booking-uid",
        userId: guestUserId,
        startTime: guestBookingStart,
        endTime: guestBookingEnd,
        title: "Guest's Existing Meeting",
        attendees: [],
        eventType: { id: 10, beforeEventBuffer: 0, afterEventBuffer: 0, seatsPerTimeSlot: null },
      },
    ]);

    const result = await (
      service as unknown as PrivateAvailableSlotsService
    )._getGuestBusyTimesForReschedule({
      rescheduleUid,
      startTime,
      endTime,
      hostUserIds: new Set([1]),
    });

    // Guest should be found even though they booked with their secondary email
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ start: guestBookingStart, end: guestBookingEnd });
  });

  it("should skip the booking being rescheduled itself from guest busy times", async () => {
    const guestUserId = 99;
    const guestEmail = "guest@calcom-user.com";

    mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue({
      id: 1,
      uid: rescheduleUid,
      attendees: [{ email: guestEmail, name: "Cal.com Guest" }],
    });

    mockDependencies.userRepo.findManyByEmailsIncludingSecondary.mockResolvedValue(
      makeUserResult([{ id: guestUserId, email: guestEmail }])
    );

    // The guest's bookings include the booking being rescheduled
    mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween.mockResolvedValue([
      {
        id: 1,
        uid: rescheduleUid, // same UID as the booking being rescheduled — should be skipped
        userId: guestUserId,
        startTime: new Date("2026-03-15T09:00:00.000Z"),
        endTime: new Date("2026-03-15T10:00:00.000Z"),
        title: "The booking being rescheduled",
        attendees: [],
        eventType: { id: 10, beforeEventBuffer: 0, afterEventBuffer: 0, seatsPerTimeSlot: null },
      },
    ]);

    const result = await (
      service as unknown as PrivateAvailableSlotsService
    )._getGuestBusyTimesForReschedule({
      rescheduleUid,
      startTime,
      endTime,
      hostUserIds: new Set([1]),
    });

    // The rescheduled booking itself should not be returned as a busy time
    expect(result).toHaveLength(0);
  });

  it("should aggregate busy times from multiple Cal.com guest attendees", async () => {
    const guest1UserId = 99;
    const guest1Email = "guest1@calcom-user.com";
    const guest2UserId = 100;
    const guest2Email = "guest2@calcom-user.com";

    const guest1BookingStart = new Date("2026-03-15T10:00:00.000Z");
    const guest1BookingEnd = new Date("2026-03-15T11:00:00.000Z");
    const guest2BookingStart = new Date("2026-03-15T14:00:00.000Z");
    const guest2BookingEnd = new Date("2026-03-15T15:00:00.000Z");

    mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue({
      id: 1,
      uid: rescheduleUid,
      attendees: [
        { email: guest1Email, name: "Cal.com Guest 1" },
        { email: guest2Email, name: "Cal.com Guest 2" },
      ],
    });

    // Both guests returned in single batch query
    mockDependencies.userRepo.findManyByEmailsIncludingSecondary.mockResolvedValue(
      makeUserResult([
        { id: guest1UserId, email: guest1Email },
        { id: guest2UserId, email: guest2Email },
      ])
    );

    mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween
      .mockResolvedValueOnce([
        {
          id: 200,
          uid: "guest1-booking",
          userId: guest1UserId,
          startTime: guest1BookingStart,
          endTime: guest1BookingEnd,
          title: "Guest 1 Existing Meeting",
          attendees: [],
          eventType: { id: 10, beforeEventBuffer: 0, afterEventBuffer: 0, seatsPerTimeSlot: null },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 201,
          uid: "guest2-booking",
          userId: guest2UserId,
          startTime: guest2BookingStart,
          endTime: guest2BookingEnd,
          title: "Guest 2 Existing Meeting",
          attendees: [],
          eventType: { id: 11, beforeEventBuffer: 0, afterEventBuffer: 0, seatsPerTimeSlot: null },
        },
      ]);

    const result = await (
      service as unknown as PrivateAvailableSlotsService
    )._getGuestBusyTimesForReschedule({
      rescheduleUid,
      startTime,
      endTime,
      hostUserIds: new Set([1]),
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ start: guest1BookingStart, end: guest1BookingEnd });
    expect(result[1]).toEqual({ start: guest2BookingStart, end: guest2BookingEnd });

    // Verify only ONE batch query was made for all attendees
    expect(mockDependencies.userRepo.findManyByEmailsIncludingSecondary).toHaveBeenCalledTimes(1);
    expect(mockDependencies.userRepo.findManyByEmailsIncludingSecondary).toHaveBeenCalledWith({
      emails: [guest1Email, guest2Email],
    });
  });
});
