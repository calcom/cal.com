import { beforeEach, describe, expect, test, vi } from "vitest";

import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import type { BookingRepository } from "@calcom/lib/server/repository/booking";
import type { SelectedCalendar } from "@calcom/prisma/client";

import { CalendarSyncService } from "../CalendarSyncService";

const { mockHandleCancelBooking, mockHandleNewBooking } = vi.hoisted(() => ({
  mockHandleCancelBooking: vi.fn().mockResolvedValue(undefined),
  mockHandleNewBooking: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/bookings/lib/handleCancelBooking", () => ({
  default: mockHandleCancelBooking,
}));

vi.mock("@calcom/features/bookings/lib/handleNewBooking", () => ({
  default: mockHandleNewBooking,
}));

const mockSelectedCalendar: SelectedCalendar = {
  id: "test-calendar-id",
  userId: 1,
  credentialId: 1,
  integration: "google_calendar",
  externalId: "test@example.com",
  eventTypeId: null,
  delegationCredentialId: null,
  domainWideDelegationCredentialId: null,
  googleChannelId: null,
  googleChannelKind: null,
  googleChannelResourceId: null,
  googleChannelResourceUri: null,
  googleChannelExpiration: null,
  error: null,
  lastErrorAt: null,
  watchAttempts: 0,
  maxAttempts: 3,
  unwatchAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  channelId: "test-channel-id",
  channelKind: "web_hook",
  channelResourceId: "test-resource-id",
  channelResourceUri: "test-resource-uri",
  channelExpiration: new Date(Date.now() + 86400000),
  syncSubscribedAt: new Date(),
  syncToken: "test-sync-token",
  syncedAt: new Date(),
  syncErrorAt: null,
  syncErrorCount: 0,
};

const mockBooking = {
  id: 1,
  uid: "test-booking-uid",
  userId: 1,
  userPrimaryEmail: "user@example.com",
  startTime: "2023-12-01T10:00:00Z",
  endTime: "2023-12-01T11:00:00Z",
  eventType: {
    id: 1,
    title: "Test Event Type",
  },
};

const mockCalComEvent: CalendarSubscriptionEventItem = {
  id: "event-1",
  iCalUID: "test-booking-uid@cal.com",
  start: new Date("2023-12-01T10:00:00Z"),
  end: new Date("2023-12-01T11:00:00Z"),
  busy: true,
  summary: "Test Event",
  description: "Test Description",
  location: "Test Location",
  status: "confirmed",
  isAllDay: false,
  timeZone: "UTC",
  recurringEventId: null,
  originalStartDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  etag: "test-etag",
  kind: "calendar#event",
};

const mockNonCalComEvent: CalendarSubscriptionEventItem = {
  id: "event-2",
  iCalUID: "external-event@external.com",
  start: new Date("2023-12-01T12:00:00Z"),
  end: new Date("2023-12-01T13:00:00Z"),
  busy: true,
  summary: "External Event",
  description: "External Description",
  location: "External Location",
  status: "confirmed",
  isAllDay: false,
  timeZone: "UTC",
  recurringEventId: null,
  originalStartDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  etag: "test-etag",
  kind: "calendar#event",
};

const mockCancelledEvent: CalendarSubscriptionEventItem = {
  ...mockCalComEvent,
  id: "event-3",
  iCalUID: "cancelled-booking-uid@cal.com",
  status: "cancelled",
};

describe("CalendarSyncService", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findBookingByUidWithEventType: vi.fn(),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({
      bookingRepository: mockBookingRepository,
    });

    vi.clearAllMocks();
  });

  describe("handleEvents", () => {
    test("should process only Cal.com events", async () => {
      const events = [mockCalComEvent, mockNonCalComEvent, mockCancelledEvent];

      mockBookingRepository.findBookingByUidWithEventType = vi
        .fn()
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(mockBooking);

      await service.handleEvents(mockSelectedCalendar, events);

      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalledTimes(2);
      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
      });
      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalledWith({
        bookingUid: "cancelled-booking-uid",
      });
    });

    test("should return early when no Cal.com events", async () => {
      const events = [mockNonCalComEvent];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(mockBookingRepository.findBookingByUidWithEventType).not.toHaveBeenCalled();
    });

    test("should return early when no events", async () => {
      await service.handleEvents(mockSelectedCalendar, []);

      expect(mockBookingRepository.findBookingByUidWithEventType).not.toHaveBeenCalled();
    });

    test("should handle mixed case iCalUID", async () => {
      const eventWithMixedCase: CalendarSubscriptionEventItem = {
        ...mockCalComEvent,
        iCalUID: "test-booking-uid@CAL.COM",
      };

      mockBookingRepository.findBookingByUidWithEventType = vi.fn().mockResolvedValue(mockBooking);

      await service.handleEvents(mockSelectedCalendar, [eventWithMixedCase]);

      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
      });
    });

    test("should handle events with null iCalUID", async () => {
      const eventWithNullUID: CalendarSubscriptionEventItem = {
        ...mockCalComEvent,
        iCalUID: null,
      };

      await service.handleEvents(mockSelectedCalendar, [eventWithNullUID]);

      expect(mockBookingRepository.findBookingByUidWithEventType).not.toHaveBeenCalled();
    });
  });

  describe("cancelBooking", () => {
    test("should successfully cancel a booking", async () => {
      mockBookingRepository.findBookingByUidWithEventType = vi.fn().mockResolvedValue(mockBooking);

      await service.cancelBooking(mockCancelledEvent);

      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalledWith({
        bookingUid: "cancelled-booking-uid",
      });

      expect(mockHandleCancelBooking).toHaveBeenCalledWith({
        userId: mockBooking.userId,
        bookingData: {
          uid: mockBooking.uid,
          allRemainingBookings: true,
          cancelSubsequentBookings: true,
          cancellationReason: "Cancelled on user's calendar",
          cancelledBy: mockBooking.userPrimaryEmail,
          skipCalendarSyncTaskCancellation: true,
        },
      });
    });

    test("should return early when booking UID is missing", async () => {
      const eventWithoutUID: CalendarSubscriptionEventItem = {
        ...mockCancelledEvent,
        iCalUID: null,
      };

      await service.cancelBooking(eventWithoutUID);

      expect(mockBookingRepository.findBookingByUidWithEventType).not.toHaveBeenCalled();
      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("should return early when booking UID is malformed", async () => {
      const eventWithMalformedUID: CalendarSubscriptionEventItem = {
        ...mockCancelledEvent,
        iCalUID: "@cal.com",
      };

      await service.cancelBooking(eventWithMalformedUID);

      expect(mockBookingRepository.findBookingByUidWithEventType).not.toHaveBeenCalled();
      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("should return early when booking is not found", async () => {
      mockBookingRepository.findBookingByUidWithEventType = vi.fn().mockResolvedValue(null);

      await service.cancelBooking(mockCancelledEvent);

      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalledWith({
        bookingUid: "cancelled-booking-uid",
      });
      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("should handle cancellation errors gracefully", async () => {
      mockBookingRepository.findBookingByUidWithEventType = vi.fn().mockResolvedValue(mockBooking);
      mockHandleCancelBooking.mockRejectedValue(new Error("Cancellation failed"));

      await expect(service.cancelBooking(mockCancelledEvent)).rejects.toThrow("Cancellation failed");

      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalled();
      expect(mockHandleCancelBooking).toHaveBeenCalled();
    });
  });

  describe("rescheduleBooking", () => {
    test("should successfully reschedule a booking", async () => {
      const updatedEvent: CalendarSubscriptionEventItem = {
        ...mockCalComEvent,
        start: new Date("2023-12-01T14:00:00Z"),
        end: new Date("2023-12-01T15:00:00Z"),
      };

      mockBookingRepository.findBookingByUidWithEventType = vi.fn().mockResolvedValue(mockBooking);

      await service.rescheduleBooking(updatedEvent);

      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
      });

      expect(mockHandleNewBooking).toHaveBeenCalledWith({
        bookingData: {
          ...mockBooking,
          startTime: "2023-12-01T14:00:00.000Z",
          endTime: "2023-12-01T15:00:00.000Z",
        },
        skipCalendarSyncTaskCreation: true,
      });
    });

    test("should use original times when event times are null", async () => {
      const eventWithNullTimes: CalendarSubscriptionEventItem = {
        ...mockCalComEvent,
        start: null,
        end: null,
      };

      mockBookingRepository.findBookingByUidWithEventType = vi.fn().mockResolvedValue(mockBooking);

      await service.rescheduleBooking(eventWithNullTimes);

      expect(mockHandleNewBooking).toHaveBeenCalledWith({
        bookingData: {
          ...mockBooking,
          startTime: mockBooking.startTime,
          endTime: mockBooking.endTime,
        },
        skipCalendarSyncTaskCreation: true,
      });
    });

    test("should return early when booking UID is missing", async () => {
      const eventWithoutUID: CalendarSubscriptionEventItem = {
        ...mockCalComEvent,
        iCalUID: null,
      };

      await service.rescheduleBooking(eventWithoutUID);

      expect(mockBookingRepository.findBookingByUidWithEventType).not.toHaveBeenCalled();
      expect(mockHandleNewBooking).not.toHaveBeenCalled();
    });

    test("should return early when booking UID is malformed", async () => {
      const eventWithMalformedUID: CalendarSubscriptionEventItem = {
        ...mockCalComEvent,
        iCalUID: "@cal.com",
      };

      await service.rescheduleBooking(eventWithMalformedUID);

      expect(mockBookingRepository.findBookingByUidWithEventType).not.toHaveBeenCalled();
      expect(mockHandleNewBooking).not.toHaveBeenCalled();
    });

    test("should return early when booking is not found", async () => {
      mockBookingRepository.findBookingByUidWithEventType = vi.fn().mockResolvedValue(null);

      await service.rescheduleBooking(mockCalComEvent);

      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
      });
      expect(mockHandleNewBooking).not.toHaveBeenCalled();
    });

    test("should handle rescheduling errors gracefully", async () => {
      mockBookingRepository.findBookingByUidWithEventType = vi.fn().mockResolvedValue(mockBooking);
      mockHandleNewBooking.mockRejectedValue(new Error("Rescheduling failed"));

      await expect(service.rescheduleBooking(mockCalComEvent)).rejects.toThrow("Rescheduling failed");

      expect(mockBookingRepository.findBookingByUidWithEventType).toHaveBeenCalled();
      expect(mockHandleNewBooking).toHaveBeenCalled();
    });
  });
});
