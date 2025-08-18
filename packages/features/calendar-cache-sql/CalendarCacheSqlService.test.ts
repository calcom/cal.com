import { describe, expect, it, beforeEach, vi } from "vitest";

import { CalendarCacheSqlService } from "./CalendarCacheSqlService";
import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

describe("CalendarCacheSqlService", () => {
  let service: CalendarCacheSqlService;
  let mockSubscriptionRepo: ICalendarSubscriptionRepository;
  let mockEventRepo: ICalendarEventRepository;

  beforeEach(() => {
    mockSubscriptionRepo = {
      findBySelectedCalendar: vi.fn(),
      findByChannelId: vi.fn(),
      findByCredentialId: vi.fn(),
      findBySelectedCalendarIds: vi.fn(),
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

    const mockSelectedCalendarRepo = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    service = new CalendarCacheSqlService(mockSubscriptionRepo, mockEventRepo, mockSelectedCalendarRepo);
  });

  describe("getAvailability", () => {
    it("should return availability from calendar events", async () => {
      const mockSubscription = {
        id: "subscription-id",
        userId: 1,
        integration: "google_calendar",
        externalId: "test@example.com",
      };

      const mockEvents = [
        {
          id: "event-1",
          summary: "Meeting 1",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
        },
        {
          id: "event-2",
          summary: "Meeting 2",
          start: new Date("2024-01-01T14:00:00Z"),
          end: new Date("2024-01-01T15:00:00Z"),
        },
      ];

      vi.mocked(mockSubscriptionRepo.findBySelectedCalendar).mockResolvedValue(mockSubscription as any);
      vi.mocked(mockEventRepo.getEventsForAvailability).mockResolvedValue(mockEvents as any);

      const result = await service.getAvailability(
        "selected-calendar-id",
        new Date("2024-01-01T09:00:00Z"),
        new Date("2024-01-01T17:00:00Z")
      );

      expect(result).toEqual([
        {
          start: "2024-01-01T10:00:00.000Z",
          end: "2024-01-01T11:00:00.000Z",
          title: "Meeting 1",
          source: "calendar-cache-sql",
        },
        {
          start: "2024-01-01T14:00:00.000Z",
          end: "2024-01-01T15:00:00.000Z",
          title: "Meeting 2",
          source: "calendar-cache-sql",
        },
      ]);
    });

    it("should throw error if subscription not found", async () => {
      vi.mocked(mockSubscriptionRepo.findBySelectedCalendar).mockResolvedValue(null);

      await expect(
        service.getAvailability(
          "selected-calendar-id",
          new Date("2024-01-01T09:00:00Z"),
          new Date("2024-01-01T17:00:00Z")
        )
      ).rejects.toThrow("Calendar subscription not found");
    });
  });

  describe("processWebhookEvents", () => {
    it("should handle cancelled events by updating their status", async () => {
      const mockSubscription = {
        id: "subscription-id",
        selectedCalendar: {
          externalId: "test@example.com",
        },
        nextSyncToken: "sync-token",
      };

      const mockCredential = {
        id: 1,
        key: {
          access_token: "mock-token",
        },
      };

      // Mock the Google Calendar service
      const mockCalendar = {
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  id: "cancelled-event-id",
                  status: "cancelled",
                  start: { dateTime: "2024-01-01T10:00:00Z" },
                  end: { dateTime: "2024-01-01T11:00:00Z" },
                  summary: "Cancelled Event",
                  iCalUID: "cancelled-event@Cal.com",
                },
                {
                  id: "active-event-id",
                  status: "confirmed",
                  start: { dateTime: "2024-01-01T14:00:00Z" },
                  end: { dateTime: "2024-01-01T15:00:00Z" },
                  summary: "Active Event",
                  iCalUID: "active-event@Cal.com",
                },
              ],
              nextSyncToken: "new-sync-token",
            },
          }),
        },
      };

      const mockGoogleCalendarService = {
        authedCalendar: vi.fn().mockResolvedValue(mockCalendar),
      };

      // Mock the import
      vi.doMock("@calcom/app-store/googlecalendar/lib/CalendarService", () => ({
        default: vi.fn().mockImplementation(() => mockGoogleCalendarService),
      }));

      vi.mocked(mockSubscriptionRepo.findByChannelId).mockResolvedValue(mockSubscription as any);
      vi.mocked(mockSubscriptionRepo.updateSyncToken).mockResolvedValue(undefined);
      vi.mocked(mockEventRepo.bulkUpsertEvents).mockResolvedValue(undefined);

      await service.processWebhookEvents("channel-id", mockCredential as any);

      // Verify that bulkUpsertEvents was called with both events
      expect(mockEventRepo.bulkUpsertEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            externalEventId: "cancelled-event-id",
            summary: "Cancelled Event",
            status: "cancelled",
          }),
          expect.objectContaining({
            externalEventId: "active-event-id",
            summary: "Active Event",
            status: "confirmed",
          }),
        ]),
        "subscription-id"
      );

      // Verify that sync token was updated
      expect(mockSubscriptionRepo.updateSyncToken).toHaveBeenCalledWith("subscription-id", "new-sync-token");
    });

    it("should filter PII data for non-Cal.com events", async () => {
      const mockSubscription = {
        id: "subscription-id",
        selectedCalendar: {
          externalId: "test@example.com",
        },
        nextSyncToken: "sync-token",
      };

      const mockCredential = {
        id: 1,
        key: {
          access_token: "mock-token",
        },
      };

      // Mock the Google Calendar service with non-Cal.com events
      const mockCalendar = {
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  id: "external-event-id",
                  status: "confirmed",
                  start: { dateTime: "2024-01-01T10:00:00Z" },
                  end: { dateTime: "2024-01-01T11:00:00Z" },
                  summary: "External Meeting",
                  description: "Sensitive description",
                  location: "Confidential location",
                  iCalUID: "external-event@external-provider.com",
                  creator: {
                    email: "external@example.com",
                    displayName: "External Creator",
                    self: false,
                  },
                  organizer: {
                    email: "organizer@example.com",
                    displayName: "External Organizer",
                    self: true,
                  },
                  attendees: [
                    {
                      email: "attendee@example.com",
                      displayName: "External Attendee",
                      responseStatus: "accepted",
                      organizer: false,
                      self: false,
                    },
                  ],
                },
              ],
              nextSyncToken: "new-sync-token",
            },
          }),
        },
      };

      const mockGoogleCalendarService = {
        authedCalendar: vi.fn().mockResolvedValue(mockCalendar),
      };

      // Mock the import
      vi.doMock("@calcom/app-store/googlecalendar/lib/CalendarService", () => ({
        default: vi.fn().mockImplementation(() => mockGoogleCalendarService),
      }));

      vi.mocked(mockSubscriptionRepo.findByChannelId).mockResolvedValue(mockSubscription as any);
      vi.mocked(mockSubscriptionRepo.updateSyncToken).mockResolvedValue(undefined);
      vi.mocked(mockEventRepo.bulkUpsertEvents).mockResolvedValue(undefined);

      await service.processWebhookEvents("channel-id", mockCredential as any);

      // Verify that bulkUpsertEvents was called with PII fields omitted for non-Cal.com events
      expect(mockEventRepo.bulkUpsertEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            externalEventId: "external-event-id",
            summary: null, // PII filtered out
            description: null, // PII filtered out
            location: null, // PII filtered out
            creator: undefined, // PII filtered out
            organizer: undefined, // PII filtered out
            attendees: undefined, // PII filtered out
            status: "confirmed", // Non-PII field preserved
            iCalUID: "external-event@external-provider.com", // Non-PII field preserved
          }),
        ]),
        "subscription-id"
      );
    });

    it("should capture participant data from Google Calendar events", async () => {
      const mockSubscription = {
        id: "subscription-id",
        selectedCalendar: {
          externalId: "test@example.com",
        },
        nextSyncToken: "sync-token",
      };

      const mockCredential = {
        id: 1,
        key: {
          access_token: "mock-token",
        },
      };

      const mockCalendar = {
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  id: "event-with-participants",
                  status: "confirmed",
                  start: { dateTime: "2024-01-01T10:00:00Z" },
                  end: { dateTime: "2024-01-01T11:00:00Z" },
                  summary: "Meeting with Participants",
                  iCalUID: "meeting-with-participants@Cal.com",
                  creator: {
                    email: "creator@example.com",
                    displayName: "Event Creator",
                    self: false,
                  },
                  organizer: {
                    email: "organizer@example.com",
                    displayName: "Event Organizer",
                    self: true,
                  },
                  attendees: [
                    {
                      email: "attendee1@example.com",
                      displayName: "Attendee One",
                      responseStatus: "accepted",
                      organizer: false,
                      self: false,
                    },
                    {
                      email: "attendee2@example.com",
                      displayName: "Attendee Two",
                      responseStatus: "tentative",
                      organizer: false,
                      self: false,
                    },
                  ],
                },
              ],
              nextSyncToken: "new-sync-token",
            },
          }),
        },
      };

      const mockGoogleCalendarService = {
        authedCalendar: vi.fn().mockResolvedValue(mockCalendar),
      };

      // Mock the import
      vi.doMock("@calcom/app-store/googlecalendar/lib/CalendarService", () => ({
        default: vi.fn().mockImplementation(() => mockGoogleCalendarService),
      }));

      vi.mocked(mockSubscriptionRepo.findByChannelId).mockResolvedValue(mockSubscription as any);
      vi.mocked(mockSubscriptionRepo.updateSyncToken).mockResolvedValue(undefined);
      vi.mocked(mockEventRepo.bulkUpsertEvents).mockResolvedValue(undefined);

      await service.processWebhookEvents("channel-id", mockCredential as any);

      // Verify that bulkUpsertEvents was called with participant data
      expect(mockEventRepo.bulkUpsertEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            externalEventId: "event-with-participants",
            summary: "Meeting with Participants",
            creator: expect.objectContaining({
              create: expect.objectContaining({
                email: "creator@example.com",
                displayName: "Event Creator",
                isSelf: false,
              }),
            }),
            organizer: expect.objectContaining({
              create: expect.objectContaining({
                email: "organizer@example.com",
                displayName: "Event Organizer",
                isSelf: true,
                isOrganizer: true,
              }),
            }),
            attendees: expect.objectContaining({
              createMany: expect.objectContaining({
                data: expect.arrayContaining([
                  expect.objectContaining({
                    email: "attendee1@example.com",
                    displayName: "Attendee One",
                    responseStatus: "accepted",
                    isOrganizer: false,
                    isSelf: false,
                  }),
                  expect.objectContaining({
                    email: "attendee2@example.com",
                    displayName: "Attendee Two",
                    responseStatus: "tentative",
                    isOrganizer: false,
                    isSelf: false,
                  }),
                ]),
              }),
            }),
          }),
        ]),
        "subscription-id"
      );
    });
  });
});
