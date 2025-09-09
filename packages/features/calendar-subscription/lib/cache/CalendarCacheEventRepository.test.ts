import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import type { PrismaClient } from "@calcom/prisma";
import type { CalendarCacheEvent } from "@calcom/prisma/client";

import { CalendarCacheEventRepository } from "./CalendarCacheEventRepository";

const prismaMock = mockDeep<PrismaClient>();

describe("CalendarCacheEventRepository", () => {
  let repository: CalendarCacheEventRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new CalendarCacheEventRepository(prismaMock);
  });

  describe("upsertMany", () => {
    it("should create many calendar cache events", async () => {
      const events: CalendarCacheEvent[] = [
        {
          id: "1",
          externalEventId: "event1",
          selectedCalendarId: "1",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          summary: "Meeting 1",
          description: null,
          location: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          externalEventId: "event2",
          selectedCalendarId: "1",
          start: new Date("2024-01-01T14:00:00Z"),
          end: new Date("2024-01-01T15:00:00Z"),
          summary: "Meeting 2",
          description: null,
          location: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.calendarCacheEvent.createMany = vi.fn().mockResolvedValue({ count: 2 });

      await repository.upsertMany(events);

      expect(prismaMock.calendarCacheEvent.createMany).toHaveBeenCalledWith({
        data: events,
      });
    });

    it("should handle empty events array", async () => {
      prismaMock.calendarCacheEvent.createMany = vi.fn().mockResolvedValue({ count: 0 });

      await repository.upsertMany([]);

      expect(prismaMock.calendarCacheEvent.createMany).toHaveBeenCalledWith({
        data: [],
      });
    });

    it("should handle events with null summary", async () => {
      const events: CalendarCacheEvent[] = [
        {
          id: "1",
          externalEventId: "event1",
          selectedCalendarId: "1",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          summary: null,
          description: null,
          location: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.calendarCacheEvent.createMany = vi.fn().mockResolvedValue({ count: 1 });

      await repository.upsertMany(events);

      expect(prismaMock.calendarCacheEvent.createMany).toHaveBeenCalledWith({
        data: events,
      });
    });
  });

  describe("deleteMany", () => {
    it("should delete events by external IDs and selected calendar ID", async () => {
      const events = [
        { externalEventId: "event1", selectedCalendarId: "1" },
        { externalEventId: "event2", selectedCalendarId: "1" },
        { externalEventId: "event3", selectedCalendarId: "1" },
      ];

      prismaMock.calendarCacheEvent.deleteMany = vi.fn().mockResolvedValue({ count: 3 });

      await repository.deleteMany(events);

      expect(prismaMock.calendarCacheEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { externalEventId: "event1", selectedCalendarId: "1" },
            { externalEventId: "event2", selectedCalendarId: "1" },
            { externalEventId: "event3", selectedCalendarId: "1" },
          ],
        },
      });
    });

    it("should handle empty events array", async () => {
      const events: Pick<CalendarCacheEvent, "externalEventId" | "selectedCalendarId">[] = [];

      await repository.deleteMany(events);

      expect(prismaMock.calendarCacheEvent.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("deleteAllBySelectedCalendarId", () => {
    it("should delete all events for a selected calendar", async () => {
      const selectedCalendarId = "1";

      prismaMock.calendarCacheEvent.deleteMany = vi.fn().mockResolvedValue({ count: 5 });

      await repository.deleteAllBySelectedCalendarId(selectedCalendarId);

      expect(prismaMock.calendarCacheEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          selectedCalendarId: "1",
        },
      });
    });

    it("should handle case when no events exist for selected calendar", async () => {
      const selectedCalendarId = "999";

      prismaMock.calendarCacheEvent.deleteMany = vi.fn().mockResolvedValue({ count: 0 });

      await repository.deleteAllBySelectedCalendarId(selectedCalendarId);

      expect(prismaMock.calendarCacheEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          selectedCalendarId: "999",
        },
      });
    });
  });
});
