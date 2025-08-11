import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import { CalendarEventRepository } from "./CalendarEventRepository";

describe("CalendarEventRepository", () => {
  let repository: CalendarEventRepository;

  beforeEach(() => {
    repository = new CalendarEventRepository(prismock);
    prismock.calendarEvent.deleteMany();
    prismock.calendarEventParticipant.deleteMany();
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

      const result = await repository.upsertEvent(data, "subscription-id");

      expect(result).toEqual(
        expect.objectContaining({
          googleEventId: "google-event-id",
          summary: "Test Event",
        })
      );
    });

    it("should upsert creator and organizer without creating duplicates and replace attendees", async () => {
      const subscriptionId = "sub-1";
      const googleEventId = "g-1";

      // Initial create with participants
      const created = await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          googleEventId,
          etag: "etag-1",
          summary: "Event",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          creator: {
            create: { email: "creator1@example.com", displayName: "Creator 1", isSelf: false },
          },
          organizer: {
            create: {
              email: "organizer1@example.com",
              displayName: "Organizer 1",
              isSelf: false,
              isOrganizer: true,
            },
          },
          attendees: {
            createMany: {
              data: [
                { email: "a1@example.com", displayName: "A1", responseStatus: "accepted", isSelf: false },
              ],
              skipDuplicates: true,
            },
          },
        },
        subscriptionId
      );

      // Update: change creator/organizer, replace attendees
      const updated = await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          googleEventId,
          etag: "etag-2",
          summary: "Event Updated",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:30:00Z"),
          creator: {
            create: { email: "creator2@example.com", displayName: "Creator 2", isSelf: true },
          },
          organizer: {
            create: {
              email: "organizer2@example.com",
              displayName: "Organizer 2",
              isSelf: false,
              isOrganizer: true,
            },
          },
          attendees: {
            createMany: {
              data: [
                { email: "a2@example.com", displayName: "A2", responseStatus: "tentative", isSelf: false },
                { email: "a3@example.com", displayName: "A3", responseStatus: "accepted", isSelf: false },
              ],
              skipDuplicates: true,
            },
          },
        },
        subscriptionId
      );

      const eventId = updated.id || created.id;

      const creatorRows = await prismock.calendarEventParticipant.findMany({
        where: { creatorOfId: eventId },
      });
      const organizerRows = await prismock.calendarEventParticipant.findMany({
        where: { organizerOfId: eventId },
      });
      const attendeesRows = await prismock.calendarEventParticipant.findMany({
        where: { attendeeOfId: eventId },
      });

      expect(creatorRows.some((r: any) => r.email === "creator2@example.com")).toBe(true);
      expect(organizerRows.some((r: any) => r.email === "organizer2@example.com")).toBe(true);
      expect(attendeesRows.some((r: any) => r.email === "a2@example.com")).toBe(true);
      expect(attendeesRows.some((r: any) => r.email === "a3@example.com")).toBe(true);

      // Idempotency: run the same update again
      await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          googleEventId,
          etag: "etag-3",
          summary: "Event Updated",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:30:00Z"),
          creator: {
            create: { email: "creator2@example.com", displayName: "Creator 2", isSelf: true },
          },
          organizer: {
            create: {
              email: "organizer2@example.com",
              displayName: "Organizer 2",
              isSelf: false,
              isOrganizer: true,
            },
          },
          attendees: {
            createMany: {
              data: [
                { email: "a2@example.com", displayName: "A2", responseStatus: "tentative", isSelf: false },
                { email: "a3@example.com", displayName: "A3", responseStatus: "accepted", isSelf: false },
              ],
              skipDuplicates: true,
            },
          },
        },
        subscriptionId
      );

      const finalCreator = await prismock.calendarEventParticipant.findMany({
        where: { creatorOfId: eventId },
      });
      const finalOrganizer = await prismock.calendarEventParticipant.findMany({
        where: { organizerOfId: eventId },
      });
      const finalAttendees = await prismock.calendarEventParticipant.findMany({
        where: { attendeeOfId: eventId },
      });
      expect(finalCreator.length).toBe(1);
      expect(finalCreator[0]?.email).toBe("creator2@example.com");
      expect(finalOrganizer.length).toBe(1);
      expect(finalOrganizer[0]?.email).toBe("organizer2@example.com");
      expect(finalAttendees.length).toBe(2);
    });

    it("should handle omitted participants without error on update", async () => {
      const subscriptionId = "sub-2";
      const googleEventId = "g-2";

      const created2 = await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          googleEventId,
          etag: "etag-1",
          summary: "Event",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          creator: { create: { email: "c1@example.com" } },
          organizer: { create: { email: "o1@example.com", isOrganizer: true } },
          attendees: {
            createMany: { data: [{ email: "a1@example.com" }], skipDuplicates: true },
          },
        },
        subscriptionId
      );

      const updated2 = await repository.upsertEvent(
        {
          calendarSubscription: { connect: { id: subscriptionId } },
          googleEventId,
          etag: "etag-2",
          summary: "Event",
          start: new Date("2024-01-01T10:00:00Z"),
          end: new Date("2024-01-01T11:00:00Z"),
          // no creator / organizer provided
          attendees: { createMany: { data: [], skipDuplicates: true } },
        },
        subscriptionId
      );

      const eventId2 = updated2.id || created2.id;

      // Event still exists and update did not throw; participants may be omitted
      const afterParticipants = await prismock.calendarEventParticipant.findMany({
        where: { creatorOfId: eventId2 },
      });
      expect(Array.isArray(afterParticipants)).toBe(true);
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
