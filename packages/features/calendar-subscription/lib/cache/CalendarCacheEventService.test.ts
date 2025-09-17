import { describe, expect, it, beforeEach, vi } from "vitest";

import type { SelectedCalendar } from "@calcom/prisma/client";

import type { CalendarSubscriptionEventItem } from "../CalendarSubscriptionPort.interface";
import type { ICalendarCacheEventRepository } from "./CalendarCacheEventRepository.interface";
import { CalendarCacheEventService } from "./CalendarCacheEventService";

const mockRepository: ICalendarCacheEventRepository = {
  upsertMany: vi.fn(),
  deleteMany: vi.fn(),
  deleteAllBySelectedCalendarId: vi.fn(),
  findAllBySelectedCalendarIds: vi.fn(),
};

const mockSelectedCalendar: SelectedCalendar = {
  id: "test-calendar-id",
  userId: 1,
  integration: "google_calendar",
  externalId: "test@example.com",
  credentialId: 1,
  delegationCredentialId: null,
  googleChannelId: null,
  googleChannelKind: null,
  googleChannelResourceId: null,
  googleChannelResourceUri: null,
  googleChannelExpiration: null,
  error: null,
  eventTypeIds: null,
};

describe("CalendarCacheEventService", () => {
  let service: CalendarCacheEventService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarCacheEventService({
      calendarCacheEventRepository: mockRepository,
    });
  });

  describe("handleEvents", () => {
    it("should upsert busy non-cancelled events", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event-1",
          busy: true,
          status: "confirmed",
          start: new Date("2025-01-01T10:00:00Z"),
          end: new Date("2025-01-01T11:00:00Z"),
          summary: "Test Event",
          description: "Test Description",
          location: "Test Location",
          isAllDay: false,
          timeZone: "UTC",
          originalStartDate: new Date("2025-01-01T10:00:00Z"),
          recurringEventId: null,
          etag: "test-etag",
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:30:00Z"),
        },
      ];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(mockRepository.upsertMany).toHaveBeenCalledWith([
        {
          externalId: "event-1",
          selectedCalendarId: "test-calendar-id",
          start: new Date("2025-01-01T10:00:00Z"),
          end: new Date("2025-01-01T11:00:00Z"),
          summary: "Test Event",
          description: "Test Description",
          location: "Test Location",
          isAllDay: false,
          timeZone: "UTC",
          originalStartTime: new Date("2025-01-01T10:00:00Z"),
          recurringEventId: null,
          externalEtag: "test-etag",
          externalCreatedAt: new Date("2025-01-01T09:00:00Z"),
          externalUpdatedAt: new Date("2025-01-01T09:30:00Z"),
        },
      ]);
      expect(mockRepository.deleteMany).toHaveBeenCalledWith([]);
    });

    it("should delete free events", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event-1",
          busy: false,
          status: "confirmed",
          start: new Date("2025-01-01T10:00:00Z"),
          end: new Date("2025-01-01T11:00:00Z"),
          summary: "Free Event",
          description: null,
          location: null,
          isAllDay: false,
          timeZone: "UTC",
          originalStartDate: null,
          recurringEventId: null,
          etag: "test-etag",
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:30:00Z"),
        },
      ];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(mockRepository.upsertMany).toHaveBeenCalledWith([]);
      expect(mockRepository.deleteMany).toHaveBeenCalledWith([
        {
          selectedCalendarId: "test-calendar-id",
          externalId: "event-1",
        },
      ]);
    });

    it("should delete cancelled events", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "event-1",
          busy: true,
          status: "cancelled",
          start: new Date("2025-01-01T10:00:00Z"),
          end: new Date("2025-01-01T11:00:00Z"),
          summary: "Cancelled Event",
          description: null,
          location: null,
          isAllDay: false,
          timeZone: "UTC",
          originalStartDate: null,
          recurringEventId: null,
          etag: "test-etag",
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:30:00Z"),
        },
      ];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(mockRepository.upsertMany).toHaveBeenCalledWith([]);
      expect(mockRepository.deleteMany).toHaveBeenCalledWith([
        {
          selectedCalendarId: "test-calendar-id",
          externalId: "event-1",
        },
      ]);
    });

    it("should handle mixed event types", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "busy-event",
          busy: true,
          status: "confirmed",
          start: new Date("2025-01-01T10:00:00Z"),
          end: new Date("2025-01-01T11:00:00Z"),
          summary: "Busy Event",
          description: null,
          location: null,
          isAllDay: false,
          timeZone: "UTC",
          originalStartDate: null,
          recurringEventId: null,
          etag: "test-etag-1",
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:30:00Z"),
        },
        {
          id: "free-event",
          busy: false,
          status: "confirmed",
          start: new Date("2025-01-01T12:00:00Z"),
          end: new Date("2025-01-01T13:00:00Z"),
          summary: "Free Event",
          description: null,
          location: null,
          isAllDay: false,
          timeZone: "UTC",
          originalStartDate: null,
          recurringEventId: null,
          etag: "test-etag-2",
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:30:00Z"),
        },
        {
          id: "cancelled-event",
          busy: true,
          status: "cancelled",
          start: new Date("2025-01-01T14:00:00Z"),
          end: new Date("2025-01-01T15:00:00Z"),
          summary: "Cancelled Event",
          description: null,
          location: null,
          isAllDay: false,
          timeZone: "UTC",
          originalStartDate: null,
          recurringEventId: null,
          etag: "test-etag-3",
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:30:00Z"),
        },
      ];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(mockRepository.upsertMany).toHaveBeenCalledWith([
        expect.objectContaining({
          externalId: "busy-event",
          selectedCalendarId: "test-calendar-id",
        }),
      ]);
      expect(mockRepository.deleteMany).toHaveBeenCalledWith([
        {
          selectedCalendarId: "test-calendar-id",
          externalId: "free-event",
        },
        {
          selectedCalendarId: "test-calendar-id",
          externalId: "cancelled-event",
        },
      ]);
    });

    it("should handle empty events array", async () => {
      await service.handleEvents(mockSelectedCalendar, []);

      expect(mockRepository.upsertMany).toHaveBeenCalledWith([]);
      expect(mockRepository.deleteMany).toHaveBeenCalledWith([]);
    });

    it("should handle all-day events", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "all-day-event",
          busy: true,
          status: "confirmed",
          start: new Date("2025-01-01T00:00:00Z"),
          end: new Date("2025-01-02T00:00:00Z"),
          summary: "All Day Event",
          description: null,
          location: null,
          isAllDay: true,
          timeZone: "UTC",
          originalStartDate: null,
          recurringEventId: null,
          etag: "test-etag",
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:30:00Z"),
        },
      ];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(mockRepository.upsertMany).toHaveBeenCalledWith([
        expect.objectContaining({
          externalId: "all-day-event",
          isAllDay: true,
        }),
      ]);
    });

    it("should handle recurring events", async () => {
      const events: CalendarSubscriptionEventItem[] = [
        {
          id: "recurring-instance",
          busy: true,
          status: "confirmed",
          start: new Date("2025-01-01T10:00:00Z"),
          end: new Date("2025-01-01T11:00:00Z"),
          summary: "Recurring Event",
          description: null,
          location: null,
          isAllDay: false,
          timeZone: "UTC",
          originalStartDate: new Date("2025-01-01T10:00:00Z"),
          recurringEventId: "recurring-master",
          etag: "test-etag",
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:30:00Z"),
        },
      ];

      await service.handleEvents(mockSelectedCalendar, events);

      expect(mockRepository.upsertMany).toHaveBeenCalledWith([
        expect.objectContaining({
          externalId: "recurring-instance",
          recurringEventId: "recurring-master",
          originalStartTime: new Date("2025-01-01T10:00:00Z"),
        }),
      ]);
    });
  });

  describe("cleanupCache", () => {
    it("should delete all events for selected calendar", async () => {
      await service.cleanupCache(mockSelectedCalendar);

      expect(mockRepository.deleteAllBySelectedCalendarId).toHaveBeenCalledWith("test-calendar-id");
    });
  });

  describe("isAppSupported", () => {
    it("should return true for google-calendar", () => {
      expect(CalendarCacheEventService.isAppSupported("google-calendar")).toBe(true);
    });

    it("should return true for office365-calendar", () => {
      expect(CalendarCacheEventService.isAppSupported("office365-calendar")).toBe(true);
    });

    it("should return false for unsupported apps", () => {
      expect(CalendarCacheEventService.isAppSupported("outlook-calendar")).toBe(false);
      expect(CalendarCacheEventService.isAppSupported("apple-calendar")).toBe(false);
      expect(CalendarCacheEventService.isAppSupported("unknown-app")).toBe(false);
    });

    it("should return false for null appId", () => {
      expect(CalendarCacheEventService.isAppSupported(null)).toBe(false);
    });

    it("should return false for undefined appId", () => {
      expect(CalendarCacheEventService.isAppSupported(undefined as string)).toBe(false);
    });
  });
});
