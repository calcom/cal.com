import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { CalendarCacheEvent } from "@calcom/prisma/client";

import { CalendarCacheEventRepository } from "./CalendarCacheEventRepository";

describe("CalendarCacheEventRepository", () => {
  let repository: CalendarCacheEventRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    prismock.calendarCacheEvent.deleteMany();
    repository = new CalendarCacheEventRepository(prismock);
  });

  describe("findAllBySelectedCalendarIds", () => {
    it("should find events within date range", async () => {
      const selectedCalendarId = "test-calendar-1";
      const start = new Date("2025-01-01T00:00:00Z");
      const end = new Date("2025-01-31T23:59:59Z");

      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-1",
          selectedCalendarId,
          start: new Date("2025-01-15T10:00:00Z"),
          end: new Date("2025-01-15T11:00:00Z"),
          summary: "Test Event",
          timeZone: "UTC",
        },
      });

      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-2",
          selectedCalendarId,
          start: new Date("2025-02-15T10:00:00Z"),
          end: new Date("2025-02-15T11:00:00Z"),
          summary: "Out of Range Event",
          timeZone: "UTC",
        },
      });

      const result = await repository.findAllBySelectedCalendarIds([selectedCalendarId], start, end);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        timeZone: "UTC",
      });
    });

    it("should find events for multiple selected calendars", async () => {
      const selectedCalendarIds = ["calendar-1", "calendar-2"];
      const start = new Date("2025-01-01T00:00:00Z");
      const end = new Date("2025-01-31T23:59:59Z");

      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T10:00:00Z"),
          end: new Date("2025-01-15T11:00:00Z"),
          summary: "Calendar 1 Event",
          timeZone: "UTC",
        },
      });

      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-2",
          selectedCalendarId: "calendar-2",
          start: new Date("2025-01-20T14:00:00Z"),
          end: new Date("2025-01-20T15:00:00Z"),
          summary: "Calendar 2 Event",
          timeZone: "America/New_York",
        },
      });

      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-3",
          selectedCalendarId: "calendar-3",
          start: new Date("2025-01-25T16:00:00Z"),
          end: new Date("2025-01-25T17:00:00Z"),
          summary: "Calendar 3 Event",
          timeZone: "UTC",
        },
      });

      const result = await repository.findAllBySelectedCalendarIds(selectedCalendarIds, start, end);

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.timeZone)).toEqual(expect.arrayContaining(["UTC", "America/New_York"]));
    });

    it("should return empty array when no events found", async () => {
      const result = await repository.findAllBySelectedCalendarIds(
        ["non-existent-calendar"],
        new Date("2025-01-01T00:00:00Z"),
        new Date("2025-01-31T23:59:59Z")
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("upsertMany", () => {
    it("should create new events", async () => {
      const events: Partial<CalendarCacheEvent>[] = [
        {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T10:00:00Z"),
          end: new Date("2025-01-15T11:00:00Z"),
          summary: "New Event",
          description: "Event description",
          location: "Meeting Room",
          isAllDay: false,
          timeZone: "UTC",
        },
      ];

      await repository.upsertMany(events as CalendarCacheEvent[]);

      const created = await prismock.calendarCacheEvent.findFirst({
        where: { externalId: "event-1" },
      });

      expect(created).toBeTruthy();
      expect(created?.summary).toBe("New Event");
      expect(created?.description).toBe("Event description");
      expect(created?.location).toBe("Meeting Room");
    });

    it("should update existing events", async () => {
      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T10:00:00Z"),
          end: new Date("2025-01-15T11:00:00Z"),
          summary: "Original Event",
          timeZone: "UTC",
        },
      });

      const events: Partial<CalendarCacheEvent>[] = [
        {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T14:00:00Z"),
          end: new Date("2025-01-15T15:00:00Z"),
          summary: "Updated Event",
          description: "Updated description",
          location: "New Location",
          isAllDay: false,
          timeZone: "America/New_York",
        },
      ];

      await repository.upsertMany(events as CalendarCacheEvent[]);

      const updated = await prismock.calendarCacheEvent.findFirst({
        where: { externalId: "event-1" },
      });

      expect(updated?.summary).toBe("Updated Event");
      expect(updated?.description).toBe("Updated description");
      expect(updated?.location).toBe("New Location");
      expect(updated?.timeZone).toBe("America/New_York");
    });

    it("should handle empty events array", async () => {
      await expect(repository.upsertMany([])).resolves.not.toThrow();
    });

    it("should handle multiple events", async () => {
      const events: Partial<CalendarCacheEvent>[] = [
        {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T10:00:00Z"),
          end: new Date("2025-01-15T11:00:00Z"),
          summary: "Event 1",
          timeZone: "UTC",
        },
        {
          externalId: "event-2",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-16T10:00:00Z"),
          end: new Date("2025-01-16T11:00:00Z"),
          summary: "Event 2",
          timeZone: "UTC",
        },
      ];

      await repository.upsertMany(events as CalendarCacheEvent[]);

      const count = await prismock.calendarCacheEvent.count();
      expect(count).toBe(2);
    });

    it("should handle all-day events", async () => {
      const events: Partial<CalendarCacheEvent>[] = [
        {
          externalId: "all-day-event",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T00:00:00Z"),
          end: new Date("2025-01-16T00:00:00Z"),
          summary: "All Day Event",
          isAllDay: true,
          timeZone: "UTC",
        },
      ];

      await repository.upsertMany(events as CalendarCacheEvent[]);

      const created = await prismock.calendarCacheEvent.findFirst({
        where: { externalId: "all-day-event" },
      });

      expect(created?.isAllDay).toBe(true);
    });
  });

  describe("deleteMany", () => {
    it("should delete specified events", async () => {
      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T10:00:00Z"),
          end: new Date("2025-01-15T11:00:00Z"),
          summary: "Event to Delete",
          timeZone: "UTC",
        },
      });

      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-2",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-16T10:00:00Z"),
          end: new Date("2025-01-16T11:00:00Z"),
          summary: "Event to Keep",
          timeZone: "UTC",
        },
      });

      await repository.deleteMany([
        {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
        },
      ]);

      const remaining = await prismock.calendarCacheEvent.findMany();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].externalId).toBe("event-2");
    });

    it("should handle empty events array", async () => {
      await expect(repository.deleteMany([])).resolves.not.toThrow();
    });

    it("should filter out events without externalId or selectedCalendarId", async () => {
      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T10:00:00Z"),
          end: new Date("2025-01-15T11:00:00Z"),
          summary: "Event",
          timeZone: "UTC",
        },
      });

      await repository.deleteMany([
        {
          externalId: "",
          selectedCalendarId: "calendar-1",
        },
        {
          externalId: "event-1",
          selectedCalendarId: "",
        },
      ]);

      const remaining = await prismock.calendarCacheEvent.findMany();
      expect(remaining).toHaveLength(1);
    });

    it("should delete multiple events", async () => {
      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T10:00:00Z"),
          end: new Date("2025-01-15T11:00:00Z"),
          summary: "Event 1",
          timeZone: "UTC",
        },
      });

      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-2",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-16T10:00:00Z"),
          end: new Date("2025-01-16T11:00:00Z"),
          summary: "Event 2",
          timeZone: "UTC",
        },
      });

      await repository.deleteMany([
        {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
        },
        {
          externalId: "event-2",
          selectedCalendarId: "calendar-1",
        },
      ]);

      const remaining = await prismock.calendarCacheEvent.findMany();
      expect(remaining).toHaveLength(0);
    });
  });

  describe("deleteAllBySelectedCalendarId", () => {
    it("should delete all events for a selected calendar", async () => {
      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-1",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-15T10:00:00Z"),
          end: new Date("2025-01-15T11:00:00Z"),
          summary: "Calendar 1 Event 1",
          timeZone: "UTC",
        },
      });

      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-2",
          selectedCalendarId: "calendar-1",
          start: new Date("2025-01-16T10:00:00Z"),
          end: new Date("2025-01-16T11:00:00Z"),
          summary: "Calendar 1 Event 2",
          timeZone: "UTC",
        },
      });

      await prismock.calendarCacheEvent.create({
        data: {
          externalId: "event-3",
          selectedCalendarId: "calendar-2",
          start: new Date("2025-01-17T10:00:00Z"),
          end: new Date("2025-01-17T11:00:00Z"),
          summary: "Calendar 2 Event",
          timeZone: "UTC",
        },
      });

      await repository.deleteAllBySelectedCalendarId("calendar-1");

      const remaining = await prismock.calendarCacheEvent.findMany();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].selectedCalendarId).toBe("calendar-2");
    });

    it("should handle non-existent calendar id", async () => {
      await expect(repository.deleteAllBySelectedCalendarId("non-existent")).resolves.not.toThrow();
    });
  });
});
