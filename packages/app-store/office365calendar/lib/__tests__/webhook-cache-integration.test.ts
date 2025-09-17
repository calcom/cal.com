import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import { CalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository";
import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";

describe("Office365 Calendar Webhook Cache Integration", () => {
  let cacheService: CalendarCacheEventService;
  let cacheRepository: CalendarCacheEventRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    prismock.calendarCacheEvent.deleteMany();
    prismock.selectedCalendar.deleteMany();

    cacheRepository = new CalendarCacheEventRepository(prismock);
    cacheService = new CalendarCacheEventService({
      calendarCacheEventRepository: cacheRepository,
    });
  });

  it("should populate cache when webhook receives Office365 Calendar events", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "office365-cal-1",
        userId: 1,
        integration: "office365_calendar",
        externalId: "user@company.com",
        credentialId: 2,
      },
    });

    const office365Events: CalendarSubscriptionEventItem[] = [
      {
        id: "office365-event-1",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        summary: "Teams Meeting",
        description: "Important Teams meeting",
        location: "Microsoft Teams",
        isAllDay: false,
        timeZone: "America/New_York",
        originalStartDate: null,
        recurringEventId: null,
        etag: "office365-etag-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "office365-event-2",
        busy: false,
        status: "confirmed",
        start: new Date("2025-01-15T14:00:00Z"),
        end: new Date("2025-01-15T15:00:00Z"),
        summary: "Free Time",
        description: null,
        location: null,
        isAllDay: false,
        timeZone: "America/New_York",
        originalStartDate: null,
        recurringEventId: null,
        etag: "office365-etag-2",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ];

    await cacheService.handleEvents(selectedCalendar, office365Events);

    const cachedEvents = await prismock.calendarCacheEvent.findMany({
      where: { selectedCalendarId: selectedCalendar.id },
    });

    expect(cachedEvents).toHaveLength(1);
    expect(cachedEvents[0]).toEqual(
      expect.objectContaining({
        externalId: "office365-event-1",
        selectedCalendarId: "office365-cal-1",
        summary: "Teams Meeting",
        description: "Important Teams meeting",
        location: "Microsoft Teams",
        timeZone: "America/New_York",
      })
    );
  });

  it("should handle Office365 recurring events", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "office365-cal-1",
        userId: 1,
        integration: "office365_calendar",
        externalId: "user@company.com",
        credentialId: 2,
      },
    });

    const recurringEvents: CalendarSubscriptionEventItem[] = [
      {
        id: "recurring-instance-1",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T09:00:00Z"),
        end: new Date("2025-01-15T10:00:00Z"),
        summary: "Daily Standup",
        description: "Daily team standup",
        location: "Teams Room",
        isAllDay: false,
        timeZone: "UTC",
        originalStartDate: new Date("2025-01-15T09:00:00Z"),
        recurringEventId: "standup-master-456",
        etag: "recurring-etag-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "recurring-instance-2",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-16T09:00:00Z"),
        end: new Date("2025-01-16T10:00:00Z"),
        summary: "Daily Standup",
        description: "Daily team standup",
        location: "Teams Room",
        isAllDay: false,
        timeZone: "UTC",
        originalStartDate: new Date("2025-01-16T09:00:00Z"),
        recurringEventId: "standup-master-456",
        etag: "recurring-etag-2",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ];

    await cacheService.handleEvents(selectedCalendar, recurringEvents);

    const cachedEvents = await prismock.calendarCacheEvent.findMany({
      where: { selectedCalendarId: selectedCalendar.id },
      orderBy: { start: "asc" },
    });

    expect(cachedEvents).toHaveLength(2);
    expect(cachedEvents[0].recurringEventId).toBe("standup-master-456");
    expect(cachedEvents[1].recurringEventId).toBe("standup-master-456");
    expect(cachedEvents[0].originalStartTime).toEqual(new Date("2025-01-15T09:00:00Z"));
    expect(cachedEvents[1].originalStartTime).toEqual(new Date("2025-01-16T09:00:00Z"));
  });

  it("should handle Office365 timezone-specific events", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "office365-cal-1",
        userId: 1,
        integration: "office365_calendar",
        externalId: "user@company.com",
        credentialId: 2,
      },
    });

    const timezoneEvents: CalendarSubscriptionEventItem[] = [
      {
        id: "timezone-event-1",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T15:00:00Z"),
        end: new Date("2025-01-15T16:00:00Z"),
        summary: "European Meeting",
        description: "Meeting with European team",
        location: "Teams",
        isAllDay: false,
        timeZone: "Europe/London",
        originalStartDate: null,
        recurringEventId: null,
        etag: "timezone-etag-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "timezone-event-2",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T22:00:00Z"),
        end: new Date("2025-01-15T23:00:00Z"),
        summary: "Asian Meeting",
        description: "Meeting with Asian team",
        location: "Teams",
        isAllDay: false,
        timeZone: "Asia/Tokyo",
        originalStartDate: null,
        recurringEventId: null,
        etag: "timezone-etag-2",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ];

    await cacheService.handleEvents(selectedCalendar, timezoneEvents);

    const cachedEvents = await prismock.calendarCacheEvent.findMany({
      where: { selectedCalendarId: selectedCalendar.id },
      orderBy: { start: "asc" },
    });

    expect(cachedEvents).toHaveLength(2);
    expect(cachedEvents[0].timeZone).toBe("Europe/London");
    expect(cachedEvents[1].timeZone).toBe("Asia/Tokyo");
  });

  it("should verify Office365 calendar is supported", () => {
    expect(CalendarCacheEventService.isAppSupported("office365-calendar")).toBe(true);
  });

  it("should handle Office365 event updates and deletions", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "office365-cal-1",
        userId: 1,
        integration: "office365_calendar",
        externalId: "user@company.com",
        credentialId: 2,
      },
    });

    await prismock.calendarCacheEvent.create({
      data: {
        externalId: "office365-event-1",
        selectedCalendarId: selectedCalendar.id,
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        summary: "Original Teams Meeting",
        timeZone: "UTC",
      },
    });

    const updatedEvents: CalendarSubscriptionEventItem[] = [
      {
        id: "office365-event-1",
        busy: true,
        status: "cancelled",
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        summary: "Cancelled Teams Meeting",
        description: null,
        location: null,
        isAllDay: false,
        timeZone: "UTC",
        originalStartDate: null,
        recurringEventId: null,
        etag: "cancelled-etag",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
      },
    ];

    await cacheService.handleEvents(selectedCalendar, updatedEvents);

    const cachedEvents = await prismock.calendarCacheEvent.findMany({
      where: { selectedCalendarId: selectedCalendar.id },
    });

    expect(cachedEvents).toHaveLength(0);
  });
});
