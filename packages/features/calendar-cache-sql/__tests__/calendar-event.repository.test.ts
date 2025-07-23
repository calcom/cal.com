import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import { CalendarEventRepository } from "../calendar-event.repository";

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
      const mockEvent = {
        id: "event-id",
        calendarSubscriptionId: subscriptionId,
        googleEventId: "google-event-id",
        etag: "test-etag",
        summary: "Test Event",
        start: new Date("2024-01-01T10:00:00Z"),
        end: new Date("2024-01-01T11:00:00Z"),
        status: "confirmed",
        transparency: "opaque",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismock.calendarEvent.create({ data: mockEvent });

      const events = await repository.getEventsForAvailability(
        subscriptionId,
        new Date("2024-01-01T09:00:00Z"),
        new Date("2024-01-01T12:00:00Z")
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
      const mockEvent = {
        id: "event-id",
        calendarSubscriptionId: subscriptionId,
        googleEventId: "google-event-id",
        etag: "test-etag",
        summary: "Cancelled Event",
        start: new Date("2024-01-01T10:00:00Z"),
        end: new Date("2024-01-01T11:00:00Z"),
        status: "cancelled",
        transparency: "opaque",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismock.calendarEvent.create({ data: mockEvent });

      const events = await repository.getEventsForAvailability(
        subscriptionId,
        new Date("2024-01-01T09:00:00Z"),
        new Date("2024-01-01T12:00:00Z")
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
});
