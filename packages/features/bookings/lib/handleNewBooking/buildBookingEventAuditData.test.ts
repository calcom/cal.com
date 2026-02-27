import { BookingStatus } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { buildBookingCreatedAuditData, buildBookingRescheduledAuditData } from "./buildBookingEventAuditData";

describe("buildBookingCreatedAuditData", () => {
  it("returns audit data with timestamps in milliseconds", () => {
    const startTime = new Date("2025-06-01T10:00:00Z");
    const endTime = new Date("2025-06-01T10:30:00Z");

    const result = buildBookingCreatedAuditData({
      booking: {
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
        userUuid: "user-uuid-123",
      },
      attendeeSeatId: null,
    });

    expect(result).toEqual({
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      status: BookingStatus.ACCEPTED,
      hostUserUuid: "user-uuid-123",
      seatReferenceUid: null,
    });
  });

  it("includes attendeeSeatId when provided", () => {
    const result = buildBookingCreatedAuditData({
      booking: {
        startTime: new Date("2025-06-01T10:00:00Z"),
        endTime: new Date("2025-06-01T10:30:00Z"),
        status: BookingStatus.PENDING,
        userUuid: null,
      },
      attendeeSeatId: "seat-ref-abc",
    });

    expect(result.seatReferenceUid).toBe("seat-ref-abc");
  });

  it("handles null userUuid", () => {
    const result = buildBookingCreatedAuditData({
      booking: {
        startTime: new Date("2025-06-01T10:00:00Z"),
        endTime: new Date("2025-06-01T10:30:00Z"),
        status: BookingStatus.ACCEPTED,
        userUuid: null,
      },
      attendeeSeatId: null,
    });

    expect(result.hostUserUuid).toBeNull();
  });
});

describe("buildBookingRescheduledAuditData", () => {
  it("returns old and new timestamps and rescheduled UID", () => {
    const oldStart = new Date("2025-06-01T10:00:00Z");
    const oldEnd = new Date("2025-06-01T10:30:00Z");
    const newStart = new Date("2025-06-02T14:00:00Z");
    const newEnd = new Date("2025-06-02T14:30:00Z");

    const result = buildBookingRescheduledAuditData({
      oldBooking: { startTime: oldStart, endTime: oldEnd },
      newBooking: { startTime: newStart, endTime: newEnd, uid: "new-booking-uid" },
    });

    expect(result).toEqual({
      startTime: {
        old: oldStart.getTime(),
        new: newStart.getTime(),
      },
      endTime: {
        old: oldEnd.getTime(),
        new: newEnd.getTime(),
      },
      rescheduledToUid: {
        old: null,
        new: "new-booking-uid",
      },
    });
  });

  it("sets old rescheduledToUid to null", () => {
    const result = buildBookingRescheduledAuditData({
      oldBooking: { startTime: new Date(), endTime: new Date() },
      newBooking: { startTime: new Date(), endTime: new Date(), uid: "abc" },
    });

    expect(result.rescheduledToUid.old).toBeNull();
  });
});
