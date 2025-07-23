import { describe, expect, it, beforeEach, vi } from "vitest";

import { CalendarCacheSqlService } from "../calendar-cache-sql.service";
import type { ICalendarEventRepository } from "../calendar-event.repository.interface";
import type { ICalendarSubscriptionRepository } from "../calendar-subscription.repository.interface";

describe("CalendarCacheSqlService", () => {
  let service: CalendarCacheSqlService;
  let mockSubscriptionRepo: ICalendarSubscriptionRepository;
  let mockEventRepo: ICalendarEventRepository;

  beforeEach(() => {
    mockSubscriptionRepo = {
      findByUserAndCalendar: vi.fn(),
      findByChannelId: vi.fn(),
      upsert: vi.fn(),
      updateSyncToken: vi.fn(),
      updateWatchDetails: vi.fn(),
      getSubscriptionsToWatch: vi.fn(),
      setWatchError: vi.fn(),
      clearWatchError: vi.fn(),
    };

    mockEventRepo = {
      upsertEvent: vi.fn(),
      getEventsForAvailability: vi.fn(),
      deleteEvent: vi.fn(),
      bulkUpsertEvents: vi.fn(),
    };

    service = new CalendarCacheSqlService(mockSubscriptionRepo, mockEventRepo);
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

      vi.mocked(mockSubscriptionRepo.findByUserAndCalendar).mockResolvedValue(mockSubscription as any);
      vi.mocked(mockEventRepo.getEventsForAvailability).mockResolvedValue(mockEvents as any);

      const result = await service.getAvailability(
        1,
        "google_calendar",
        "test@example.com",
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
      vi.mocked(mockSubscriptionRepo.findByUserAndCalendar).mockResolvedValue(null);

      await expect(
        service.getAvailability(
          1,
          "google_calendar",
          "test@example.com",
          new Date("2024-01-01T09:00:00Z"),
          new Date("2024-01-01T17:00:00Z")
        )
      ).rejects.toThrow("Calendar subscription not found");
    });
  });

  describe("ensureSubscription", () => {
    it("should create or update subscription", async () => {
      const mockSubscription = {
        id: "subscription-id",
        userId: 1,
        integration: "google_calendar",
        externalId: "test@example.com",
      };

      vi.mocked(mockSubscriptionRepo.upsert).mockResolvedValue(mockSubscription as any);

      const result = await service.ensureSubscription(1, "google_calendar", "test@example.com", 123);

      expect(mockSubscriptionRepo.upsert).toHaveBeenCalledWith({
        user: { connect: { id: 1 } },
        integration: "google_calendar",
        externalId: "test@example.com",
        credential: { connect: { id: 123 } },
        delegationCredential: undefined,
      });

      expect(result).toEqual(mockSubscription);
    });
  });
});
