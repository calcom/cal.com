import { describe, it, expect, vi } from "vitest";

import { getGuestBusyTimesForReschedule } from "./util";
import type { GuestBusyTimesDeps } from "./util";

function makeDeps(overrides?: Partial<GuestBusyTimesDeps>): GuestBusyTimesDeps {
  return {
    bookingRepo: {
      findByUidIncludeEventType: vi.fn().mockResolvedValue(null),
      findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([]),
      ...overrides?.bookingRepo,
    } as GuestBusyTimesDeps["bookingRepo"],
    userRepo: {
      findUsersByEmails: vi.fn().mockResolvedValue([]),
      ...overrides?.userRepo,
    } as GuestBusyTimesDeps["userRepo"],
  };
}

const BASE_ARGS = {
  rescheduleUid: "booking-uid-123",
  startDate: new Date("2025-03-01T00:00:00Z"),
  endDate: new Date("2025-03-02T00:00:00Z"),
  hostEmails: ["host@example.com"],
};

describe("getGuestBusyTimesForReschedule", () => {
  it("returns empty when booking has no attendees", async () => {
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({ attendees: [] }),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(result).toEqual([]);
  });

  it("returns empty when booking is not found", async () => {
    const deps = makeDeps();
    const result = await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(result).toEqual([]);
  });

  it("filters out host emails and only looks up guests", async () => {
    const findUsersByEmails = vi.fn().mockResolvedValue([]);
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({
          attendees: [{ email: "host@example.com" }, { email: "guest@example.com" }],
        }),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([]),
      },
      userRepo: { findUsersByEmails },
    });

    await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(findUsersByEmails).toHaveBeenCalledWith({ emails: ["guest@example.com"] });
  });

  it("filters host emails case-insensitively", async () => {
    const findUsersByEmails = vi.fn().mockResolvedValue([]);
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({
          attendees: [{ email: "Host@Example.COM" }, { email: "guest@test.com" }],
        }),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([]),
      },
      userRepo: { findUsersByEmails },
    });

    await getGuestBusyTimesForReschedule({
      ...BASE_ARGS,
      hostEmails: ["host@example.com"],
      ...deps,
    });
    expect(findUsersByEmails).toHaveBeenCalledWith({ emails: ["guest@test.com"] });
  });

  it("returns empty when all attendees are hosts (no guests)", async () => {
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({
          attendees: [{ email: "host@example.com" }],
        }),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(result).toEqual([]);
    expect(deps.userRepo.findUsersByEmails).not.toHaveBeenCalled();
  });

  it("returns empty when guests have no Cal.com accounts", async () => {
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({
          attendees: [{ email: "host@example.com" }, { email: "external@gmail.com" }],
        }),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([]),
      },
      userRepo: {
        findUsersByEmails: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(result).toEqual([]);
    expect(deps.bookingRepo.findAcceptedBookingsByUserIdsOrEmails).not.toHaveBeenCalled();
  });

  it("returns busy times from guest bookings", async () => {
    const guestBookings = [
      {
        uid: "other-booking-1",
        startTime: new Date("2025-03-01T10:00:00Z"),
        endTime: new Date("2025-03-01T11:00:00Z"),
      },
      {
        uid: "other-booking-2",
        startTime: new Date("2025-03-01T14:00:00Z"),
        endTime: new Date("2025-03-01T15:00:00Z"),
      },
    ];

    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({
          attendees: [{ email: "host@example.com" }, { email: "guest@cal.com" }],
        }),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue(guestBookings),
      },
      userRepo: {
        findUsersByEmails: vi.fn().mockResolvedValue([{ id: 42, email: "guest@cal.com" }]),
      },
    });

    const result = await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(result).toEqual([
      { start: "2025-03-01T10:00:00.000Z", end: "2025-03-01T11:00:00.000Z", source: "guest-availability" },
      { start: "2025-03-01T14:00:00.000Z", end: "2025-03-01T15:00:00.000Z", source: "guest-availability" },
    ]);
  });

  it("handles multiple guests with Cal.com accounts", async () => {
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({
          attendees: [
            { email: "host@example.com" },
            { email: "guest1@cal.com" },
            { email: "guest2@cal.com" },
          ],
        }),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([
          {
            uid: "b1",
            startTime: new Date("2025-03-01T09:00:00Z"),
            endTime: new Date("2025-03-01T09:30:00Z"),
          },
        ]),
      },
      userRepo: {
        findUsersByEmails: vi.fn().mockResolvedValue([
          { id: 10, email: "guest1@cal.com" },
          { id: 20, email: "guest2@cal.com" },
        ]),
      },
    });

    const result = await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(result).toHaveLength(1);

    // Verify we passed both user IDs
    expect(deps.bookingRepo.findAcceptedBookingsByUserIdsOrEmails).toHaveBeenCalledWith({
      userIds: [10, 20],
      emails: ["guest1@cal.com", "guest2@cal.com"],
      startDate: BASE_ARGS.startDate,
      endDate: BASE_ARGS.endDate,
      excludeUid: "booking-uid-123",
    });
  });

  it("excludes the rescheduled booking from guest busy times", async () => {
    const findAccepted = vi.fn().mockResolvedValue([]);
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({
          attendees: [{ email: "host@example.com" }, { email: "guest@cal.com" }],
        }),
        findAcceptedBookingsByUserIdsOrEmails: findAccepted,
      },
      userRepo: {
        findUsersByEmails: vi.fn().mockResolvedValue([{ id: 1, email: "guest@cal.com" }]),
      },
    });

    await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(findAccepted).toHaveBeenCalledWith(
      expect.objectContaining({ excludeUid: "booking-uid-123" })
    );
  });

  it("gracefully returns empty on repo failure", async () => {
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockRejectedValue(new Error("DB connection lost")),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(result).toEqual([]);
  });

  it("gracefully returns empty when user lookup fails", async () => {
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({
          attendees: [{ email: "host@example.com" }, { email: "guest@cal.com" }],
        }),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([]),
      },
      userRepo: {
        findUsersByEmails: vi.fn().mockRejectedValue(new Error("timeout")),
      },
    });

    const result = await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(result).toEqual([]);
  });

  it("skips bookings with missing startTime or endTime", async () => {
    const deps = makeDeps({
      bookingRepo: {
        findByUidIncludeEventType: vi.fn().mockResolvedValue({
          attendees: [{ email: "host@example.com" }, { email: "guest@cal.com" }],
        }),
        findAcceptedBookingsByUserIdsOrEmails: vi.fn().mockResolvedValue([
          { uid: "b1", startTime: new Date("2025-03-01T10:00:00Z"), endTime: null },
          { uid: "b2", startTime: null, endTime: new Date("2025-03-01T11:00:00Z") },
          {
            uid: "b3",
            startTime: new Date("2025-03-01T12:00:00Z"),
            endTime: new Date("2025-03-01T13:00:00Z"),
          },
        ]),
      },
      userRepo: {
        findUsersByEmails: vi.fn().mockResolvedValue([{ id: 1, email: "guest@cal.com" }]),
      },
    });

    const result = await getGuestBusyTimesForReschedule({ ...BASE_ARGS, ...deps });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      start: "2025-03-01T12:00:00.000Z",
      end: "2025-03-01T13:00:00.000Z",
      source: "guest-availability",
    });
  });
});
