import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import type { SelectedCalendar } from "@calcom/prisma/client";

import type { CalendarSubscriptionEventItem } from "../CalendarSubscriptionPort.interface";
import type { ICalendarCacheEventRepository } from "./CalendarCacheEventRepository.interface";
import { CalendarCacheEventService } from "./CalendarCacheEventService";

const mockCalendarCacheEventRepository: ICalendarCacheEventRepository = {
  upsertMany: vi.fn(),
  deleteMany: vi.fn(),
  deleteAllBySelectedCalendarId: vi.fn(),
};

const mockSelectedCalendarRepository: SelectedCalendarRepository = {
  findById: vi.fn(),
  findByChannelId: vi.fn(),
  updateById: vi.fn(),
  findByExternalId: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
};

describe("CalendarCacheEventService", () => {
  let service: CalendarCacheEventService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarCacheEventService({
      selectedCalendarRepository: mockSelectedCalendarRepository,
      calendarCacheEventRepository: mockCalendarCacheEventRepository,
    });
  });

  describe("handleEvents", () => {
    it("should process and cache busy events", async () => {
      const selectedCalendar: SelectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: null,
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event1",
          summary: "Meeting 1",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          busy: true,
        },
        {
          id: "event2",
          summary: "Meeting 2",
          start: new Date("2024-01-01T14:00:00Z"),
          end: new Date("2024-01-01T15:00:00Z"),
          busy: true,
        },
      ];

      mockCalendarCacheEventRepository.upsertMany = vi.fn().mockResolvedValue(undefined);
      mockCalendarCacheEventRepository.deleteMany = vi.fn().mockResolvedValue(undefined);

      await service.handleEvents(selectedCalendar, events);

      expect(mockCalendarCacheEventRepository.upsertMany).toHaveBeenCalledWith([
        {
          selectedCalendarId: "1",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          externalEventId: "event1",
          summary: "Meeting 1",
          description: undefined,
          location: undefined,
        },
        {
          selectedCalendarId: "1",
          start: new Date("2024-01-01T14:00:00Z"),
          end: new Date("2024-01-01T15:00:00Z"),
          externalEventId: "event2",
          summary: "Meeting 2",
          description: undefined,
          location: undefined,
        },
      ]);
    });

    it("should filter out non-busy events", async () => {
      const selectedCalendar: SelectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: null,
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event1",
          summary: "Busy Meeting",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          busy: true,
        },
        {
          id: "event2",
          summary: "Free Time",
          start: new Date("2024-01-01T14:00:00Z"),
          end: new Date("2024-01-01T15:00:00Z"),
          busy: false,
        },
        {
          id: "event3",
          summary: "Cancelled Meeting",
          start: new Date("2024-01-01T16:00:00Z"),
          end: new Date("2024-01-01T17:00:00Z"),
          busy: false,
        },
      ];

      mockCalendarCacheEventRepository.upsertMany = vi.fn().mockResolvedValue(undefined);
      mockCalendarCacheEventRepository.deleteMany = vi.fn().mockResolvedValue(undefined);

      await service.handleEvents(selectedCalendar, events);

      expect(mockCalendarCacheEventRepository.upsertMany).toHaveBeenCalledWith([
        {
          selectedCalendarId: "1",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          externalEventId: "event1",
          summary: "Busy Meeting",
          description: undefined,
          location: undefined,
        },
      ]);

      expect(mockCalendarCacheEventRepository.deleteMany).toHaveBeenCalledWith([
        {
          selectedCalendarId: "1",
          externalEventId: "event2",
        },
        {
          selectedCalendarId: "1",
          externalEventId: "event3",
        },
      ]);
    });

    it("should handle events with all day format", async () => {
      const selectedCalendar: SelectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: null,
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event1",
          summary: "All Day Event",
          start: new Date("2024-01-01T00:00:00.000Z"),
          end: new Date("2024-01-02T00:00:00.000Z"),
          busy: true,
        },
      ];

      mockCalendarCacheEventRepository.upsertMany = vi.fn().mockResolvedValue(undefined);
      mockCalendarCacheEventRepository.deleteMany = vi.fn().mockResolvedValue(undefined);

      await service.handleEvents(selectedCalendar, events);

      expect(mockCalendarCacheEventRepository.upsertMany).toHaveBeenCalledWith([
        {
          selectedCalendarId: "1",
          start: new Date("2024-01-01T00:00:00.000Z"),
          end: new Date("2024-01-02T00:00:00.000Z"),
          externalEventId: "event1",
          summary: "All Day Event",
          description: undefined,
          location: undefined,
        },
      ]);
    });

    it("should handle empty events array", async () => {
      const selectedCalendar: SelectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: null,
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const events: CalendarSubscriptionEventItem[] = [];

      mockCalendarCacheEventRepository.upsertMany = vi.fn().mockResolvedValue(undefined);
      mockCalendarCacheEventRepository.deleteMany = vi.fn().mockResolvedValue(undefined);

      await service.handleEvents(selectedCalendar, events);

      expect(mockCalendarCacheEventRepository.upsertMany).toHaveBeenCalledWith([]);
      expect(mockCalendarCacheEventRepository.deleteMany).toHaveBeenCalledWith([]);
    });

    it("should handle events without summary", async () => {
      const selectedCalendar: SelectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: null,
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event1",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          busy: true,
        },
      ];

      mockCalendarCacheEventRepository.upsertMany = vi.fn().mockResolvedValue(undefined);
      mockCalendarCacheEventRepository.deleteMany = vi.fn().mockResolvedValue(undefined);

      await service.handleEvents(selectedCalendar, events);

      expect(mockCalendarCacheEventRepository.upsertMany).toHaveBeenCalledWith([
        {
          selectedCalendarId: "1",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          externalEventId: "event1",
          summary: undefined,
          description: undefined,
          location: undefined,
        },
      ]);
    });
  });

  describe("cleanupCache", () => {
    it("should delete all events for selected calendar", async () => {
      const selectedCalendar: SelectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: null,
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarCacheEventRepository.deleteAllBySelectedCalendarId = vi.fn().mockResolvedValue(undefined);

      await service.cleanupCache(selectedCalendar);

      expect(mockCalendarCacheEventRepository.deleteAllBySelectedCalendarId).toHaveBeenCalledWith("1");
    });
  });
});
