import { describe, test, expect, vi, beforeEach } from "vitest";

import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import type { SelectedCalendar } from "@calcom/prisma/client";

import { CalendarSyncService } from "../CalendarSyncService";

vi.mock("@calcom/features/bookings/lib/handleNewBooking", () => ({
  default: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/lib/server/repository/booking", () => ({
  BookingRepository: {
    findMany: vi.fn(),
  },
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

describe("CalendarSyncService", () => {
  let service: CalendarSyncService;

  beforeEach(() => {
    service = new CalendarSyncService();
    vi.clearAllMocks();
  });

  describe("handleEvents", () => {
    test("should only process Cal.com events", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event-1",
          iCalUID: "event-1@cal.com",
          start: new Date("2023-12-01T10:00:00Z"),
          end: new Date("2023-12-01T11:00:00Z"),
          busy: true,
          summary: "Cal.com Event",
          description: "Cal.com Description",
          location: "Cal.com Location",
          status: "confirmed",
          isAllDay: false,
          timeZone: "UTC",
          recurringEventId: null,
          originalStartDate: null,
          createdAt: new Date("2023-12-01T09:00:00Z"),
          updatedAt: new Date("2023-12-01T09:30:00Z"),
          etag: "test-etag",
          kind: "calendar#event",
        },
        {
          id: "event-2",
          iCalUID: "event-2@external.com",
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
          createdAt: new Date("2023-12-01T11:00:00Z"),
          updatedAt: new Date("2023-12-01T11:30:00Z"),
          etag: "test-etag-2",
          kind: "calendar#event",
        },
      ];

      const cancelBookingSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleBookingSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      await service.handleEvents(mockSelectedCalendar, events);

      expect(rescheduleBookingSpy).toHaveBeenCalledTimes(1);
      expect(rescheduleBookingSpy).toHaveBeenCalledWith(events[0]);
      expect(cancelBookingSpy).not.toHaveBeenCalled();
    });

    test("should handle cancelled Cal.com events", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event-1",
          iCalUID: "event-1@cal.com",
          start: new Date("2023-12-01T10:00:00Z"),
          end: new Date("2023-12-01T11:00:00Z"),
          busy: true,
          summary: "Cancelled Cal.com Event",
          description: "Cancelled Description",
          location: "Cancelled Location",
          status: "cancelled",
          isAllDay: false,
          timeZone: "UTC",
          recurringEventId: null,
          originalStartDate: null,
          createdAt: new Date("2023-12-01T09:00:00Z"),
          updatedAt: new Date("2023-12-01T09:30:00Z"),
          etag: "test-etag",
          kind: "calendar#event",
        },
      ];

      const cancelBookingSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleBookingSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      await service.handleEvents(mockSelectedCalendar, events);

      expect(cancelBookingSpy).toHaveBeenCalledTimes(1);
      expect(cancelBookingSpy).toHaveBeenCalledWith(events[0]);
      expect(rescheduleBookingSpy).not.toHaveBeenCalled();
    });

    test("should return early when no Cal.com events are found", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event-1",
          iCalUID: "event-1@external.com",
          start: new Date("2023-12-01T10:00:00Z"),
          end: new Date("2023-12-01T11:00:00Z"),
          busy: true,
          summary: "External Event",
          description: "External Description",
          location: "External Location",
          status: "confirmed",
          isAllDay: false,
          timeZone: "UTC",
          recurringEventId: null,
          originalStartDate: null,
          createdAt: new Date("2023-12-01T09:00:00Z"),
          updatedAt: new Date("2023-12-01T09:30:00Z"),
          etag: "test-etag",
          kind: "calendar#event",
        },
      ];

      const cancelBookingSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleBookingSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      await service.handleEvents(mockSelectedCalendar, events);

      expect(cancelBookingSpy).not.toHaveBeenCalled();
      expect(rescheduleBookingSpy).not.toHaveBeenCalled();
    });

    test("should handle empty events array", async () => {
      const cancelBookingSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleBookingSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      await service.handleEvents(mockSelectedCalendar, []);

      expect(cancelBookingSpy).not.toHaveBeenCalled();
      expect(rescheduleBookingSpy).not.toHaveBeenCalled();
    });

    test("should handle events with null or undefined iCalUID", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event-1",
          iCalUID: null,
          start: new Date("2023-12-01T10:00:00Z"),
          end: new Date("2023-12-01T11:00:00Z"),
          busy: true,
          summary: "Event without iCalUID",
          description: "Description",
          location: "Location",
          status: "confirmed",
          isAllDay: false,
          timeZone: "UTC",
          recurringEventId: null,
          originalStartDate: null,
          createdAt: new Date("2023-12-01T09:00:00Z"),
          updatedAt: new Date("2023-12-01T09:30:00Z"),
          etag: "test-etag",
          kind: "calendar#event",
        },
        {
          id: "event-2",
          iCalUID: undefined,
          start: new Date("2023-12-01T12:00:00Z"),
          end: new Date("2023-12-01T13:00:00Z"),
          busy: true,
          summary: "Event without iCalUID",
          description: "Description",
          location: "Location",
          status: "confirmed",
          isAllDay: false,
          timeZone: "UTC",
          recurringEventId: null,
          originalStartDate: null,
          createdAt: new Date("2023-12-01T11:00:00Z"),
          updatedAt: new Date("2023-12-01T11:30:00Z"),
          etag: "test-etag-2",
          kind: "calendar#event",
        },
      ];

      const cancelBookingSpy = vi.spyOn(service, "cancelBooking").mockResolvedValue(undefined);
      const rescheduleBookingSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      await service.handleEvents(mockSelectedCalendar, events);

      expect(cancelBookingSpy).not.toHaveBeenCalled();
      expect(rescheduleBookingSpy).not.toHaveBeenCalled();
    });

    test("should handle case-insensitive Cal.com domain matching", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event-1",
          iCalUID: "event-1@CAL.COM",
          start: new Date("2023-12-01T10:00:00Z"),
          end: new Date("2023-12-01T11:00:00Z"),
          busy: true,
          summary: "Uppercase Cal.com Event",
          description: "Description",
          location: "Location",
          status: "confirmed",
          isAllDay: false,
          timeZone: "UTC",
          recurringEventId: null,
          originalStartDate: null,
          createdAt: new Date("2023-12-01T09:00:00Z"),
          updatedAt: new Date("2023-12-01T09:30:00Z"),
          etag: "test-etag",
          kind: "calendar#event",
        },
      ];

      const rescheduleBookingSpy = vi.spyOn(service, "rescheduleBooking").mockResolvedValue(undefined);

      await service.handleEvents(mockSelectedCalendar, events);

      expect(rescheduleBookingSpy).toHaveBeenCalledTimes(1);
      expect(rescheduleBookingSpy).toHaveBeenCalledWith(events[0]);
    });
  });

  describe("cancelBooking", () => {
    test("should be a placeholder method", async () => {
      const event: CalendarSubscriptionEventItem = {
        id: "event-1",
        iCalUID: "event-1@cal.com",
        start: new Date("2023-12-01T10:00:00Z"),
        end: new Date("2023-12-01T11:00:00Z"),
        busy: true,
        summary: "Test Event",
        description: "Test Description",
        location: "Test Location",
        status: "cancelled",
        isAllDay: false,
        timeZone: "UTC",
        recurringEventId: null,
        originalStartDate: null,
        createdAt: new Date("2023-12-01T09:00:00Z"),
        updatedAt: new Date("2023-12-01T09:30:00Z"),
        etag: "test-etag",
        kind: "calendar#event",
      };

      await expect(service.cancelBooking(event)).resolves.toBeUndefined();
    });
  });

  describe("rescheduleBooking", () => {
    test("should return early when no iCalUID is provided", async () => {
      const event: CalendarSubscriptionEventItem = {
        id: "event-1",
        iCalUID: null,
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
        createdAt: new Date("2023-12-01T09:00:00Z"),
        updatedAt: new Date("2023-12-01T09:30:00Z"),
        etag: "test-etag",
        kind: "calendar#event",
      };

      await expect(service.rescheduleBooking(event)).resolves.toBeUndefined();
    });

    test("should handle valid events with iCalUID", async () => {
      const event: CalendarSubscriptionEventItem = {
        id: "event-1",
        iCalUID: "event-1@cal.com",
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
        createdAt: new Date("2023-12-01T09:00:00Z"),
        updatedAt: new Date("2023-12-01T09:30:00Z"),
        etag: "test-etag",
        kind: "calendar#event",
      };

      await expect(service.rescheduleBooking(event)).resolves.toBeUndefined();
    });
  });
});
