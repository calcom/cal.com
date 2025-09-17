import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import { CalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository";
import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";

describe("Google Calendar Webhook Cache Integration", () => {
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

  it("should populate cache when webhook receives Google Calendar events", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "google-cal-1",
        userId: 1,
        integration: "google_calendar",
        externalId: "primary@example.com",
        credentialId: 1,
        googleChannelId: "channel-123",
        googleChannelResourceId: "resource-123",
      },
    });

    const googleEvents: CalendarSubscriptionEventItem[] = [
      {
        id: "google-event-1",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        summary: "Google Meeting",
        description: "Important meeting",
        location: "Conference Room A",
        isAllDay: false,
        timeZone: "America/New_York",
        originalStartDate: null,
        recurringEventId: null,
        etag: "google-etag-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "google-event-2",
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
        etag: "google-etag-2",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ];

    await cacheService.handleEvents(selectedCalendar, googleEvents);

    const cachedEvents = await prismock.calendarCacheEvent.findMany({
      where: { selectedCalendarId: selectedCalendar.id },
    });

    expect(cachedEvents).toHaveLength(1);
    expect(cachedEvents[0]).toEqual(
      expect.objectContaining({
        externalId: "google-event-1",
        selectedCalendarId: "google-cal-1",
        summary: "Google Meeting",
        description: "Important meeting",
        location: "Conference Room A",
        timeZone: "America/New_York",
      })
    );
  });

  it("should handle Google Calendar recurring events", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "google-cal-1",
        userId: 1,
        integration: "google_calendar",
        externalId: "primary@example.com",
        credentialId: 1,
        googleChannelId: "channel-123",
      },
    });

    const recurringEvents: CalendarSubscriptionEventItem[] = [
      {
        id: "recurring-instance-1",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        summary: "Weekly Meeting",
        description: "Recurring weekly meeting",
        location: "Conference Room B",
        isAllDay: false,
        timeZone: "UTC",
        originalStartDate: new Date("2025-01-15T10:00:00Z"),
        recurringEventId: "recurring-master-123",
        etag: "recurring-etag-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "recurring-instance-2",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-22T10:00:00Z"),
        end: new Date("2025-01-22T11:00:00Z"),
        summary: "Weekly Meeting",
        description: "Recurring weekly meeting",
        location: "Conference Room B",
        isAllDay: false,
        timeZone: "UTC",
        originalStartDate: new Date("2025-01-22T10:00:00Z"),
        recurringEventId: "recurring-master-123",
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
    expect(cachedEvents[0].recurringEventId).toBe("recurring-master-123");
    expect(cachedEvents[1].recurringEventId).toBe("recurring-master-123");
    expect(cachedEvents[0].originalStartTime).toEqual(new Date("2025-01-15T10:00:00Z"));
    expect(cachedEvents[1].originalStartTime).toEqual(new Date("2025-01-22T10:00:00Z"));
  });

  it("should handle Google Calendar all-day events", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "google-cal-1",
        userId: 1,
        integration: "google_calendar",
        externalId: "primary@example.com",
        credentialId: 1,
        googleChannelId: "channel-123",
      },
    });

    const allDayEvents: CalendarSubscriptionEventItem[] = [
      {
        id: "all-day-event-1",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T00:00:00Z"),
        end: new Date("2025-01-16T00:00:00Z"),
        summary: "All Day Event",
        description: "Full day event",
        location: null,
        isAllDay: true,
        timeZone: "UTC",
        originalStartDate: null,
        recurringEventId: null,
        etag: "all-day-etag-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ];

    await cacheService.handleEvents(selectedCalendar, allDayEvents);

    const cachedEvents = await prismock.calendarCacheEvent.findMany({
      where: { selectedCalendarId: selectedCalendar.id },
    });

    expect(cachedEvents).toHaveLength(1);
    expect(cachedEvents[0].isAllDay).toBe(true);
    expect(cachedEvents[0].start).toEqual(new Date("2025-01-15T00:00:00Z"));
    expect(cachedEvents[0].end).toEqual(new Date("2025-01-16T00:00:00Z"));
  });

  it("should update existing events when webhook receives updates", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "google-cal-1",
        userId: 1,
        integration: "google_calendar",
        externalId: "primary@example.com",
        credentialId: 1,
        googleChannelId: "channel-123",
      },
    });

    await prismock.calendarCacheEvent.create({
      data: {
        externalId: "google-event-1",
        selectedCalendarId: selectedCalendar.id,
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        summary: "Original Meeting",
        timeZone: "UTC",
      },
    });

    const updatedEvents: CalendarSubscriptionEventItem[] = [
      {
        id: "google-event-1",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T14:00:00Z"),
        end: new Date("2025-01-15T15:00:00Z"),
        summary: "Updated Meeting",
        description: "Meeting time changed",
        location: "New Location",
        isAllDay: false,
        timeZone: "America/New_York",
        originalStartDate: null,
        recurringEventId: null,
        etag: "updated-etag-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
      },
    ];

    await cacheService.handleEvents(selectedCalendar, updatedEvents);

    const cachedEvents = await prismock.calendarCacheEvent.findMany({
      where: { selectedCalendarId: selectedCalendar.id },
    });

    expect(cachedEvents).toHaveLength(1);
    expect(cachedEvents[0]).toEqual(
      expect.objectContaining({
        externalId: "google-event-1",
        summary: "Updated Meeting",
        description: "Meeting time changed",
        location: "New Location",
        timeZone: "America/New_York",
        start: new Date("2025-01-15T14:00:00Z"),
        end: new Date("2025-01-15T15:00:00Z"),
      })
    );
  });

  it("should delete events when they are cancelled", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "google-cal-1",
        userId: 1,
        integration: "google_calendar",
        externalId: "primary@example.com",
        credentialId: 1,
        googleChannelId: "channel-123",
      },
    });

    await prismock.calendarCacheEvent.create({
      data: {
        externalId: "google-event-1",
        selectedCalendarId: selectedCalendar.id,
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        summary: "Meeting to Cancel",
        timeZone: "UTC",
      },
    });

    const cancelledEvents: CalendarSubscriptionEventItem[] = [
      {
        id: "google-event-1",
        busy: true,
        status: "cancelled",
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        summary: "Meeting to Cancel",
        description: null,
        location: null,
        isAllDay: false,
        timeZone: "UTC",
        originalStartDate: null,
        recurringEventId: null,
        etag: "cancelled-etag-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
      },
    ];

    await cacheService.handleEvents(selectedCalendar, cancelledEvents);

    const cachedEvents = await prismock.calendarCacheEvent.findMany({
      where: { selectedCalendarId: selectedCalendar.id },
    });

    expect(cachedEvents).toHaveLength(0);
  });

  it("should handle mixed event operations in single webhook", async () => {
    const selectedCalendar = await prismock.selectedCalendar.create({
      data: {
        id: "google-cal-1",
        userId: 1,
        integration: "google_calendar",
        externalId: "primary@example.com",
        credentialId: 1,
        googleChannelId: "channel-123",
      },
    });

    await prismock.calendarCacheEvent.create({
      data: {
        externalId: "existing-event",
        selectedCalendarId: selectedCalendar.id,
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        summary: "Existing Event",
        timeZone: "UTC",
      },
    });

    const mixedEvents: CalendarSubscriptionEventItem[] = [
      {
        id: "new-event",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T12:00:00Z"),
        end: new Date("2025-01-15T13:00:00Z"),
        summary: "New Event",
        description: null,
        location: null,
        isAllDay: false,
        timeZone: "UTC",
        originalStartDate: null,
        recurringEventId: null,
        etag: "new-etag",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "existing-event",
        busy: true,
        status: "confirmed",
        start: new Date("2025-01-15T14:00:00Z"),
        end: new Date("2025-01-15T15:00:00Z"),
        summary: "Updated Existing Event",
        description: "Updated description",
        location: null,
        isAllDay: false,
        timeZone: "UTC",
        originalStartDate: null,
        recurringEventId: null,
        etag: "updated-etag",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
      },
      {
        id: "cancelled-event",
        busy: true,
        status: "cancelled",
        start: new Date("2025-01-15T16:00:00Z"),
        end: new Date("2025-01-15T17:00:00Z"),
        summary: "Cancelled Event",
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

    await cacheService.handleEvents(selectedCalendar, mixedEvents);

    const cachedEvents = await prismock.calendarCacheEvent.findMany({
      where: { selectedCalendarId: selectedCalendar.id },
      orderBy: { start: "asc" },
    });

    expect(cachedEvents).toHaveLength(2);
    expect(cachedEvents[0].externalId).toBe("new-event");
    expect(cachedEvents[1].externalId).toBe("existing-event");
    expect(cachedEvents[1].summary).toBe("Updated Existing Event");
    expect(cachedEvents[1].description).toBe("Updated description");
  });
});
