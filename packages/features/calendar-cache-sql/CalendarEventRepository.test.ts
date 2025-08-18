import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import { CalendarEventRepository } from "./CalendarEventRepository";

describe("CalendarEventRepository", () => {
  let repository: CalendarEventRepository;

  beforeEach(async () => {
    repository = new CalendarEventRepository(prismock as any);
    await prismock.calendarEvent.deleteMany();
  });

  describe("upsertEvent", () => {
    it("should create new event if not exists", async () => {
      const data = {
        calendarSubscription: { connect: { id: "subscription-id" } },
        externalEventId: "ext-event-id",
        externalEtag: "test-etag",
        summary: "Test Event",
        start: new Date("2024-01-01T10:00:00Z"),
        end: new Date("2024-01-01T11:00:00Z"),
      };

      const result = await repository.upsertEvent(data, "subscription-id");

      expect(result).toEqual(
        expect.objectContaining({
          externalEventId: "ext-event-id",
          summary: "Test Event",
        })
      );
    });

    it("should upsert event scalar fields and ignore participants", async () => {
      const subscriptionId = "sub-1";
      const externalEventId = "g-1";

      // Initial create with participants
      const created = await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          externalEventId,
          externalEtag: "etag-1",
          summary: "Event",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          // Participants are ignored in SQL cache
        },
        subscriptionId
      );

      // Update scalar fields only
      const updated = await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          externalEventId,
          externalEtag: "etag-2",
          summary: "Event Updated",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:30:00Z"),
          // Participants are ignored in SQL cache
        },
        subscriptionId
      );

      // No participant rows exist in SQL cache; ensure event updated correctly
      expect(updated.summary).toBe("Event Updated");

      // Idempotency: run the same update again
      await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          externalEventId,
          externalEtag: "etag-3",
          summary: "Event Updated",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:30:00Z"),
          // Participants ignored
        },
        subscriptionId
      );

      const after = await prismock.calendarEvent.findUnique({
        where: {
          calendarSubscriptionId_externalEventId: {
            calendarSubscriptionId: subscriptionId,
            externalEventId,
          },
        },
      });
      expect(after?.summary).toBe("Event Updated");
    });

    it("should handle omitted participants without error on update", async () => {
      const subscriptionId = "sub-2";
      const externalEventId = "g-2";

      const created2 = await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          externalEventId,
          externalEtag: "etag-1",
          summary: "Event",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          // Participants are ignored in SQL cache
        },
        subscriptionId
      );

      const updated2 = await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          externalEventId,
          externalEtag: "etag-2",
          summary: "Event",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          // no participants provided (ignored)
        },
        subscriptionId
      );

      // Event still exists and update did not throw
      expect(updated2).toBeTruthy();
    });
  });

  describe("getEventsForAvailability", () => {
    it("should return events within time range", async () => {
      const subscriptionId = "subscription-id";
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const mockEvent = {
        id: "event-id",
        calendarSubscriptionId: subscriptionId,
        externalEventId: "google-event-id",
        externalEtag: "test-etag",
        summary: "Test Event",
        start: futureDate,
        end: new Date(futureDate.getTime() + 60 * 60 * 1000), // 1 hour later
        status: "confirmed",
        transparency: "opaque",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prismock.calendarEvent.create({ data: mockEvent });

      const events = await repository.getEventsForAvailability(
        subscriptionId,
        futureDate,
        new Date(futureDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
      );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(
        expect.objectContaining({
          summary: "Test Event",
        })
      );
    });

    it("should exclude cancelled events", async () => {
      const subscriptionId = "subscription-id";
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const mockEvent = {
        id: "event-id",
        calendarSubscriptionId: subscriptionId,
        externalEventId: "google-event-id",
        externalEtag: "test-etag",
        summary: "Cancelled Event",
        start: futureDate,
        end: new Date(futureDate.getTime() + 60 * 60 * 1000), // 1 hour later
        status: "cancelled",
        transparency: "opaque",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prismock.calendarEvent.create({ data: mockEvent });

      const events = await repository.getEventsForAvailability(
        subscriptionId,
        futureDate,
        new Date(futureDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
      );

      expect(events).toHaveLength(0);
    });
  });

  describe("deleteEvent", () => {
    it("should delete event by subscription and google event ID", async () => {
      const subscriptionId = "subscription-id";
      const mockEvent = {
        id: "event-id",
        calendarSubscriptionId: subscriptionId,
        externalEventId: "google-event-id",
        externalEtag: "test-etag",
        summary: "Test Event",
        start: new Date("2024-01-01T10:00:00Z"),
        end: new Date("2024-01-01T11:00:00Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prismock.calendarEvent.create({ data: mockEvent });

      await repository.deleteEvent(subscriptionId, "google-event-id");

      const deletedEvent = await prismock.calendarEvent.findUnique({
        where: {
          calendarSubscriptionId_externalEventId: {
            calendarSubscriptionId: subscriptionId,
            externalEventId: "google-event-id",
          },
        },
      });

      expect(deletedEvent).toBeNull();
    });
  });

  describe("bulkUpsertEvents", () => {
    it("should bulk upsert events", async () => {
      const subscriptionId = "subscription-1";
      const now = new Date();
      const later = new Date(now.getTime() + 60 * 60 * 1000);

      const events = [
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          externalEventId: "event-1",
          externalEtag: "etag-1",
          summary: "Event 1",
          start: now,
          end: later,
        },
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          externalEventId: "event-2",
          externalEtag: "etag-2",
          summary: "Event 2",
          start: now,
          end: later,
        },
      ];

      // Ensure the subscription exists for the relation connect
      await prismock.calendarSubscription.create({
        data: { id: subscriptionId, selectedCalendarId: "sc-1", createdAt: now, updatedAt: now },
      });

      await repository.bulkUpsertEvents(events, subscriptionId);

      // Verify count matches input
      const ids = events.map((e) => e.externalEventId);
      // Prismock may not support `{ in: [...] }` reliably; fetch and filter in memory
      const allForSubscription = await prismock.calendarEvent.findMany({
        where: { calendarSubscriptionId: subscriptionId },
      });
      const createdEvents = allForSubscription.filter((e: any) => ids.includes(e.externalEventId));
      expect(createdEvents).toHaveLength(events.length);

      // Verify each record has expected properties
      const byId = new Map(createdEvents.map((e: any) => [e.externalEventId, e]));
      for (const expected of events) {
        const record = byId.get(expected.externalEventId);
        expect(record).toBeTruthy();
        expect(record).toMatchObject({
          externalEventId: expected.externalEventId,
          externalEtag: expected.externalEtag,
          summary: expected.summary,
          calendarSubscriptionId: subscriptionId,
        });
        expect(record.start).toBeInstanceOf(Date);
        expect(record.end).toBeInstanceOf(Date);
      }
    });
  });

  describe("cleanupOldEvents", () => {
    it("should cleanup old cancelled events", async () => {
      // Create some old cancelled events for testing
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      const mockOldEvent = {
        id: "old-event-id",
        calendarSubscriptionId: "subscription-id",
        externalEventId: "old-google-event-id",
        externalEtag: "test-etag",
        summary: "Old Cancelled Event",
        start: oldDate,
        end: oldDate,
        status: "cancelled",
        transparency: "opaque",
        createdAt: oldDate,
        updatedAt: oldDate,
      };

      await prismock.calendarEvent.create({ data: mockOldEvent });

      // Verify the event was created
      const eventsBefore = await prismock.calendarEvent.findMany();
      expect(eventsBefore).toHaveLength(1);

      await repository.cleanupOldEvents();

      // Verify the event was deleted
      const eventsAfter = await prismock.calendarEvent.findMany();
      expect(eventsAfter).toHaveLength(0);
    });

    it("should cleanup past events regardless of status", async () => {
      // Create a past confirmed event
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const mockPastEvent = {
        id: "past-event-id",
        calendarSubscriptionId: "subscription-id",
        externalEventId: "past-google-event-id",
        externalEtag: "test-etag",
        summary: "Past Confirmed Event",
        start: pastDate,
        end: pastDate,
        status: "confirmed",
        transparency: "opaque",
        createdAt: pastDate,
        updatedAt: pastDate,
      };

      await prismock.calendarEvent.create({ data: mockPastEvent });

      // Verify the event was created
      const eventsBefore = await prismock.calendarEvent.findMany();
      expect(eventsBefore).toHaveLength(1);

      await repository.cleanupOldEvents();

      // Verify the event was deleted
      const eventsAfter = await prismock.calendarEvent.findMany();
      expect(eventsAfter).toHaveLength(0);
    });
  });
});
