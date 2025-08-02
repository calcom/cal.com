import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import { CalendarEventRepository } from "./CalendarEventRepository";

describe("CalendarEventRepository", () => {
  let repository: CalendarEventRepository;

  beforeEach(() => {
    repository = new CalendarEventRepository(prismock);
    prismock.calendarEvent.deleteMany();
  });

  describe("upsertEvent", () => {
    it("should create new event if not exists", async () => {
      const data = {
        calendarSubscription: { connect: { id: "subscription-id" } },
        googleEventId: "google-event-id",
        etag: "test-etag",
        summary: "Test Event",
        start: new Date("2024-01-01T10:00:00Z"),
        end: new Date("2024-01-01T11:00:00Z"),
      };

      const result = await repository.upsertEvent(data);

      expect(result).toEqual(
        expect.objectContaining({
          googleEventId: "google-event-id",
          summary: "Test Event",
        })
      );
    });
  });

  describe("getEventsForAvailability", () => {
    it("should return events within time range", async () => {
      const subscriptionId = "subscription-id";
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const mockEvent = {
        id: "event-id",
        calendarSubscriptionId: subscriptionId,
        googleEventId: "google-event-id",
        etag: "test-etag",
        summary: "Test Event",
        start: futureDate,
        end: new Date(futureDate.getTime() + 60 * 60 * 1000), // 1 hour later
        status: "confirmed",
        transparency: "opaque",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismock.calendarEvent.create({ data: mockEvent });

      const events = await repository.getEventsForAvailability(
        subscriptionId,
        futureDate,
        new Date(futureDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
      );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(
        expect.objectContaining({
          googleEventId: "google-event-id",
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
        googleEventId: "google-event-id",
        etag: "test-etag",
        summary: "Cancelled Event",
        start: futureDate,
        end: new Date(futureDate.getTime() + 60 * 60 * 1000), // 1 hour later
        status: "cancelled",
        transparency: "opaque",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismock.calendarEvent.create({ data: mockEvent });

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
        googleEventId: "google-event-id",
        etag: "test-etag",
        summary: "Test Event",
        start: new Date("2024-01-01T10:00:00Z"),
        end: new Date("2024-01-01T11:00:00Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismock.calendarEvent.create({ data: mockEvent });

      await repository.deleteEvent(subscriptionId, "google-event-id");

      const deletedEvent = await prismock.calendarEvent.findUnique({
        where: {
          calendarSubscriptionId_googleEventId: {
            calendarSubscriptionId: subscriptionId,
            googleEventId: "google-event-id",
          },
        },
      });

      expect(deletedEvent).toBeNull();
    });
  });

  describe("bulkUpsertEvents", () => {
    it("should bulk upsert events", async () => {
      const events = [
        {
          calendarSubscription: { connect: { id: "subscription-1" } },
          googleEventId: "event-1",
          etag: "etag-1",
          summary: "Event 1",
          start: new Date(),
          end: new Date(),
        },
        {
          calendarSubscription: { connect: { id: "subscription-1" } },
          googleEventId: "event-2",
          etag: "etag-2",
          summary: "Event 2",
          start: new Date(),
          end: new Date(),
        },
      ];

      await repository.bulkUpsertEvents(events);

      // Verify that events were created by checking if they exist
      const createdEvents = await prismock.calendarEvent.findMany();
      expect(createdEvents.length).toBeGreaterThan(0);
    });
  });

  describe("cleanupOldEvents", () => {
    it("should cleanup old cancelled events", async () => {
      // Create some old cancelled events for testing
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      const mockOldEvent = {
        id: "old-event-id",
        calendarSubscriptionId: "subscription-id",
        googleEventId: "old-google-event-id",
        etag: "test-etag",
        summary: "Old Cancelled Event",
        start: oldDate,
        end: oldDate,
        status: "cancelled",
        transparency: "opaque",
        createdAt: oldDate,
        updatedAt: oldDate,
      };

      prismock.calendarEvent.create({ data: mockOldEvent });

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
        googleEventId: "past-google-event-id",
        etag: "test-etag",
        summary: "Past Confirmed Event",
        start: pastDate,
        end: pastDate,
        status: "confirmed",
        transparency: "opaque",
        createdAt: pastDate,
        updatedAt: pastDate,
      };

      prismock.calendarEvent.create({ data: mockPastEvent });

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
