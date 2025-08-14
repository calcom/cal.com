import { describe, it, expect } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

import {
  getDryRunBookingSuccessfulEventPayload,
  getDryRunRescheduleBookingSuccessfulEventPayload,
} from "./useBookings";

describe("Dry run event payload functions", () => {
  it("should create dry run booking payload without uid field", () => {
    const mockBooking = {
      title: "Test Booking",
      startTime: "2024-01-01T10:00:00Z",
      endTime: "2024-01-01T10:30:00Z",
      eventTypeId: 1,
      status: BookingStatus.ACCEPTED,
      paymentRequired: false,
      isRecurring: false,
      videoCallUrl: "https://example.com/video",
    };

    const payload = getDryRunBookingSuccessfulEventPayload(mockBooking);

    expect(payload).toEqual({
      title: "Test Booking",
      startTime: "2024-01-01T10:00:00Z",
      endTime: "2024-01-01T10:30:00Z",
      eventTypeId: 1,
      status: BookingStatus.ACCEPTED,
      paymentRequired: false,
      isRecurring: false,
      videoCallUrl: "https://example.com/video",
    });

    expect(payload).not.toHaveProperty("uid");
  });

  it("should create dry run reschedule payload without uid field", () => {
    const mockBooking = {
      title: "Test Reschedule",
      startTime: "2024-01-01T11:00:00Z",
      endTime: "2024-01-01T11:30:00Z",
      eventTypeId: 2,
      status: BookingStatus.ACCEPTED,
      paymentRequired: true,
      isRecurring: true,
      videoCallUrl: "https://example.com/video2",
    };

    const payload = getDryRunRescheduleBookingSuccessfulEventPayload(mockBooking);

    expect(payload).toEqual({
      title: "Test Reschedule",
      startTime: "2024-01-01T11:00:00Z",
      endTime: "2024-01-01T11:30:00Z",
      eventTypeId: 2,
      status: BookingStatus.ACCEPTED,
      paymentRequired: true,
      isRecurring: true,
      videoCallUrl: "https://example.com/video2",
    });

    expect(payload).not.toHaveProperty("uid");
  });

  it("should handle optional fields correctly", () => {
    const mockBooking = {
      startTime: "2024-01-01T10:00:00Z",
      endTime: "2024-01-01T10:30:00Z",
      eventTypeId: null,
      status: undefined,
      paymentRequired: false,
      isRecurring: false,
    };

    const payload = getDryRunBookingSuccessfulEventPayload(mockBooking);

    expect(payload).toEqual({
      title: undefined,
      startTime: "2024-01-01T10:00:00Z",
      endTime: "2024-01-01T10:30:00Z",
      eventTypeId: null,
      status: undefined,
      paymentRequired: false,
      isRecurring: false,
      videoCallUrl: undefined,
    });

    expect(payload).not.toHaveProperty("uid");
  });
});
