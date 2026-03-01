import { BookingStatus } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { buildBookingCreatedAuditData, buildBookingRescheduledAuditData } from "./buildBookingEventAuditData";

describe("buildBookingCreatedAuditData", () => {
  it("returns audit data with timestamps and status", () => {
    const startTime = new Date("2024-01-15T10:00:00Z");
    const endTime = new Date("2024-01-15T10:30:00Z");
    const result = buildBookingCreatedAuditData({
      booking: { startTime, endTime, status: BookingStatus.ACCEPTED, userUuid: "user-uuid-123" },
      attendeeSeatId: null,
    });

    expect(result.startTime).toBe(startTime.getTime());
    expect(result.endTime).toBe(endTime.getTime());
    expect(result.status).toBe(BookingStatus.ACCEPTED);
    expect(result.hostUserUuid).toBe("user-uuid-123");
    expect(result.seatReferenceUid).toBeNull();
  });

  it("includes attendeeSeatId when provided", () => {
    const result = buildBookingCreatedAuditData({
      booking: {
        startTime: new Date("2024-01-15T10:00:00Z"),
        endTime: new Date("2024-01-15T10:30:00Z"),
        status: BookingStatus.PENDING,
        userUuid: null,
      },
      attendeeSeatId: "seat-ref-123",
    });

    expect(result.seatReferenceUid).toBe("seat-ref-123");
    expect(result.hostUserUuid).toBeNull();
  });
});

describe("buildBookingRescheduledAuditData", () => {
  it("returns old and new time data", () => {
    const oldStart = new Date("2024-01-15T10:00:00Z");
    const oldEnd = new Date("2024-01-15T10:30:00Z");
    const newStart = new Date("2024-01-16T14:00:00Z");
    const newEnd = new Date("2024-01-16T14:30:00Z");

    const result = buildBookingRescheduledAuditData({
      oldBooking: { startTime: oldStart, endTime: oldEnd },
      newBooking: { startTime: newStart, endTime: newEnd, uid: "new-uid-456" },
    });

    expect(result.startTime.old).toBe(oldStart.getTime());
    expect(result.startTime.new).toBe(newStart.getTime());
    expect(result.endTime.old).toBe(oldEnd.getTime());
    expect(result.endTime.new).toBe(newEnd.getTime());
    expect(result.rescheduledToUid.old).toBeNull();
    expect(result.rescheduledToUid.new).toBe("new-uid-456");
  });
});
