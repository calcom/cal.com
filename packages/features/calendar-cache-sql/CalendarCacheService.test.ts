import { describe, expect, it, beforeEach, vi } from "vitest";

import type { IntegrationCalendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { CalendarCacheService } from "./CalendarCacheService";
import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

describe("CalendarCacheService", () => {
  let service: CalendarCacheService;
  let mockCredential: CredentialForCalendarService;
  let mockSubscriptionRepo: ICalendarSubscriptionRepository;
  let mockEventRepo: ICalendarEventRepository;

  beforeEach(() => {
    mockCredential = {
      id: 1,
      type: "google_calendar",
      key: { client_id: "test", client_secret: "test" },
      userId: 1,
      teamId: 1,
      appId: "google-calendar",
      invalid: false,
      delegationCredentialId: "test-delegation",
      user: { email: "test@example.com" },
      delegatedTo: null,
    };

    mockSubscriptionRepo = {
      findBySelectedCalendar: vi.fn(),
      findByCredentialId: vi.fn(),
      findBySelectedCalendarIds: vi.fn(),
      findByChannelId: vi.fn(),
      upsert: vi.fn(),
      upsertMany: vi.fn(),
      updateSyncToken: vi.fn(),
      updateWatchDetails: vi.fn(),
      getSubscriptionsToWatch: vi.fn(),
      setWatchError: vi.fn(),
      clearWatchError: vi.fn(),
    };

    mockEventRepo = {
      upsertEvent: vi.fn(),
      getEventsForAvailability: vi.fn(),
      getEventsForAvailabilityBatch: vi.fn(),
      deleteEvent: vi.fn(),
      bulkUpsertEvents: vi.fn(),
      cleanupOldEvents: vi.fn(),
    };

    service = new CalendarCacheService(mockCredential, mockSubscriptionRepo, mockEventRepo);
  });

  describe("getAvailability", () => {
    it("should return empty array when no selected calendars provided", async () => {
      const result = await service.getAvailability("2024-01-01", "2024-01-02", []);
      expect(result).toEqual([]);
    });

    it("should return empty array when no subscriptions found", async () => {
      const selectedCalendars: IntegrationCalendar[] = [
        { id: "cal1", externalId: "cal1", name: "Calendar 1", primary: true, readOnly: false },
      ];

      vi.mocked(mockSubscriptionRepo.findBySelectedCalendarIds).mockResolvedValue([]);

      const result = await service.getAvailability("2024-01-01", "2024-01-02", selectedCalendars);
      expect(result).toEqual([]);
      expect(mockSubscriptionRepo.findBySelectedCalendarIds).toHaveBeenCalledWith(["cal1"]);
    });

    it("should return busy dates from cache when subscriptions exist", async () => {
      const selectedCalendars: IntegrationCalendar[] = [
        { id: "cal1", externalId: "cal1", name: "Calendar 1", primary: true, readOnly: false },
        { id: "cal2", externalId: "cal2", name: "Calendar 2", primary: false, readOnly: false },
      ];

      const mockSubscriptions = [
        {
          id: "sub1",
          selectedCalendarId: "cal1",
          channelId: "channel1",
          channelKind: "api#channel",
          channelResourceId: "resource1",
          channelResourceUri: "uri1",
          channelExpiration: "2024-12-31T23:59:59Z",
          syncCursor: "token1",
          watchError: null,
          syncErrors: 0,
          maxSyncErrors: 5,
          backoffUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "sub2",
          selectedCalendarId: "cal2",
          channelId: "channel2",
          channelKind: "api#channel",
          channelResourceId: "resource2",
          channelResourceUri: "uri2",
          channelExpiration: "2024-12-31T23:59:59Z",
          syncCursor: "token2",
          watchError: null,
          syncErrors: 0,
          maxSyncErrors: 5,
          backoffUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockEvents = [
        {
          id: "event1",
          calendarSubscriptionId: "sub1",
          externalEventId: "google-event1",
          iCalUID: "ical1",
          externalEtag: "etag1",
          iCalSequence: 0,
          summary: "Meeting 1",
          description: null,
          location: null,
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          isAllDay: false,
          status: "confirmed",
          transparency: "opaque",
          visibility: "default",
          recurringEventId: null,
          originalStartTime: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          externalCreatedAt: new Date(),
          externalUpdatedAt: new Date(),
        },
        {
          id: "event2",
          calendarSubscriptionId: "sub2",
          externalEventId: "google-event2",
          iCalUID: "ical2",
          externalEtag: "etag2",
          iCalSequence: 0,
          summary: "Meeting 2",
          description: null,
          location: null,
          start: new Date("2024-01-01T14:00:00Z"),
          end: new Date("2024-01-01T15:00:00Z"),
          isAllDay: false,
          status: "confirmed",
          transparency: "opaque",
          visibility: "default",
          recurringEventId: null,
          originalStartTime: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          externalCreatedAt: new Date(),
          externalUpdatedAt: new Date(),
        },
      ];

      vi.mocked(mockSubscriptionRepo.findBySelectedCalendarIds).mockResolvedValue(mockSubscriptions);
      vi.mocked(mockEventRepo.getEventsForAvailabilityBatch).mockResolvedValue(mockEvents);

      const result = await service.getAvailability("2024-01-01", "2024-01-02", selectedCalendars);

      expect(result).toEqual([
        {
          start: "2024-01-01T10:00:00.000Z",
          end: "2024-01-01T11:00:00.000Z",
          source: "calendar-cache-sql",
          title: "Meeting 1",
        },
        {
          start: "2024-01-01T14:00:00.000Z",
          end: "2024-01-01T15:00:00.000Z",
          source: "calendar-cache-sql",
          title: "Meeting 2",
        },
      ]);

      expect(mockSubscriptionRepo.findBySelectedCalendarIds).toHaveBeenCalledWith(["cal1", "cal2"]);
      expect(mockEventRepo.getEventsForAvailabilityBatch).toHaveBeenCalledWith(
        ["sub1", "sub2"],
        new Date("2024-01-01"),
        new Date("2024-01-02")
      );
    });

    it("should filter out undefined calendar IDs", async () => {
      const selectedCalendars: IntegrationCalendar[] = [
        { id: "cal1", externalId: "cal1", name: "Calendar 1", primary: true, readOnly: false },
        { id: undefined, externalId: "cal2", name: "Calendar 2", primary: false, readOnly: false }, // undefined ID
        { id: "cal3", externalId: "cal3", name: "Calendar 3", primary: false, readOnly: false },
      ];

      vi.mocked(mockSubscriptionRepo.findBySelectedCalendarIds).mockResolvedValue([]);

      await service.getAvailability("2024-01-01", "2024-01-02", selectedCalendars);

      expect(mockSubscriptionRepo.findBySelectedCalendarIds).toHaveBeenCalledWith(["cal1", "cal3"]);
    });
  });

  describe("createEvent", () => {
    it("should throw error as creating events is not supported", async () => {
      const mockEvent = {
        calendarDescription: "Test Calendar",
        type: "meeting",
        title: "Test Event",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "test@example.com",
          name: "Test User",
          timeZone: "UTC",
          language: { translate: vi.fn(), locale: "en" },
        },
        attendees: [],
      };

      await expect(service.createEvent(mockEvent, 1, "calendar-id")).rejects.toThrow(
        "CalendarCacheService does not support creating events"
      );
    });
  });

  describe("updateEvent", () => {
    it("should throw error as updating events is not supported", async () => {
      const mockEvent = {
        calendarDescription: "Test Calendar",
        type: "meeting",
        title: "Updated Event",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "test@example.com",
          name: "Test User",
          timeZone: "UTC",
          language: { translate: vi.fn(), locale: "en" },
        },
        attendees: [],
      };

      await expect(service.updateEvent("event-id", mockEvent, "calendar-id")).rejects.toThrow(
        "CalendarCacheService does not support updating events"
      );
    });
  });

  describe("deleteEvent", () => {
    it("should throw error as deleting events is not supported", async () => {
      const mockEvent = {
        type: "meeting",
        title: "Event to delete",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        organizer: {
          email: "test@example.com",
          name: "Test User",
          timeZone: "UTC",
          language: { translate: vi.fn(), locale: "en" },
        },
        attendees: [],
        uid: "test-uid",
      };

      await expect(service.deleteEvent("event-id", mockEvent, "calendar-id")).rejects.toThrow(
        "CalendarCacheService does not support deleting events"
      );
    });
  });

  describe("listCalendars", () => {
    it("should return empty array as calendar listing is not supported", async () => {
      const result = await service.listCalendars();
      expect(result).toEqual([]);
    });
  });

  describe("getCredentialId", () => {
    it("should return the credential ID", () => {
      const result = service.getCredentialId?.();
      expect(result).toBe(1);
    });
  });
});
