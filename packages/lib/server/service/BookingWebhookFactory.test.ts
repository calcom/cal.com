import { describe, expect, it } from "vitest";
import { BookingWebhookFactory } from "./BookingWebhookFactory";

function createBaseParams(overrides: Record<string, unknown> = {}) {
  return {
    bookingId: 1,
    title: "Test Meeting",
    eventSlug: "test-meeting",
    description: "A test meeting",
    customInputs: { note: "hello" },
    responses: { name: { label: "Name", value: "John" } },
    userFieldsResponses: { name: { label: "Name", value: "John" } },
    startTime: "2025-01-01T10:00:00Z",
    endTime: "2025-01-01T11:00:00Z",
    organizer: {
      name: "Organizer",
      email: "organizer@example.com",
      timeZone: "UTC",
      language: { locale: "en" },
    },
    attendees: [
      {
        name: "Attendee",
        email: "attendee@example.com",
        timeZone: "UTC",
        language: { locale: "en" },
      },
    ],
    uid: "uid-123",
    location: "https://meet.example.com",
    destinationCalendar: null,
    cancellationReason: "No longer needed",
    iCalUID: "ical-123",
    cancelledBy: "organizer@example.com",
    ...overrides,
  };
}

describe("BookingWebhookFactory", () => {
  const factory = new BookingWebhookFactory();

  describe("createCancelledEventPayload", () => {
    it("sets type to eventSlug when available", () => {
      const result = factory.createCancelledEventPayload(createBaseParams());
      expect(result.type).toBe("test-meeting");
    });

    it("falls back to title when eventSlug is null", () => {
      const result = factory.createCancelledEventPayload(createBaseParams({ eventSlug: null }));
      expect(result.type).toBe("Test Meeting");
    });

    it("falls back to empty string when both eventSlug and title are empty", () => {
      const result = factory.createCancelledEventPayload(createBaseParams({ eventSlug: null, title: "" }));
      expect(result.type).toBe("");
    });

    it("sets title from params", () => {
      const result = factory.createCancelledEventPayload(createBaseParams({ title: "My Custom Title" }));
      expect(result.title).toBe("My Custom Title");
    });

    it("wraps destinationCalendar in array when present", () => {
      const destCal = {
        id: 1,
        integration: "google_calendar",
        externalId: "ext-1",
        primaryEmail: "user@gmail.com",
        userId: 1,
        eventTypeId: null,
        credentialId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        delegationCredentialId: null,
        domainWideDelegationCredentialId: null,
        customCalendarReminder: null,
      };
      const result = factory.createCancelledEventPayload(createBaseParams({ destinationCalendar: destCal }));
      expect(result.destinationCalendar).toEqual([destCal]);
    });

    it("returns empty array when destinationCalendar is null", () => {
      const result = factory.createCancelledEventPayload(createBaseParams({ destinationCalendar: null }));
      expect(result.destinationCalendar).toEqual([]);
    });

    it("passes customInputs when it is a plain object", () => {
      const result = factory.createCancelledEventPayload(
        createBaseParams({ customInputs: { key: "value" } })
      );
      expect(result.customInputs).toEqual({ key: "value" });
    });

    it("returns undefined for customInputs when it is an array", () => {
      const result = factory.createCancelledEventPayload(createBaseParams({ customInputs: ["a", "b"] }));
      expect(result.customInputs).toBeUndefined();
    });

    it("returns null for customInputs when it is null (typeof null is object)", () => {
      const result = factory.createCancelledEventPayload(createBaseParams({ customInputs: null }));
      expect(result.customInputs).toBeNull();
    });

    it("includes all base payload fields", () => {
      const result = factory.createCancelledEventPayload(createBaseParams());
      expect(result.bookingId).toBe(1);
      expect(result.uid).toBe("uid-123");
      expect(result.startTime).toBe("2025-01-01T10:00:00Z");
      expect(result.endTime).toBe("2025-01-01T11:00:00Z");
      expect(result.location).toBe("https://meet.example.com");
      expect(result.iCalUID).toBe("ical-123");
      expect(result.description).toBe("A test meeting");
    });

    it("includes cancelledBy and cancellationReason", () => {
      const result = factory.createCancelledEventPayload(createBaseParams());
      expect(result.cancelledBy).toBe("organizer@example.com");
      expect(result.cancellationReason).toBe("No longer needed");
    });

    it("sets status to CANCELLED", () => {
      const result = factory.createCancelledEventPayload(createBaseParams());
      expect(result.status).toBe("CANCELLED");
    });

    it("defaults requestReschedule to false when not provided", () => {
      const result = factory.createCancelledEventPayload(createBaseParams());
      expect(result.requestReschedule).toBe(false);
    });

    it("passes requestReschedule when true", () => {
      const result = factory.createCancelledEventPayload(createBaseParams({ requestReschedule: true }));
      expect(result.requestReschedule).toBe(true);
    });

    it("defaults eventTypeId, length, iCalSequence, eventTitle to null when not provided", () => {
      const result = factory.createCancelledEventPayload(createBaseParams());
      expect(result.eventTypeId).toBeNull();
      expect(result.length).toBeNull();
      expect(result.iCalSequence).toBeNull();
      expect(result.eventTitle).toBeNull();
    });

    it("passes eventTypeId, length, iCalSequence, eventTitle when provided", () => {
      const result = factory.createCancelledEventPayload(
        createBaseParams({
          eventTypeId: 42,
          length: 30,
          iCalSequence: 2,
          eventTitle: "Custom Event",
        })
      );
      expect(result.eventTypeId).toBe(42);
      expect(result.length).toBe(30);
      expect(result.iCalSequence).toBe(2);
      expect(result.eventTitle).toBe("Custom Event");
    });

    it("includes organizer and attendees in payload", () => {
      const result = factory.createCancelledEventPayload(createBaseParams());
      expect(result.organizer.email).toBe("organizer@example.com");
      expect(result.attendees).toHaveLength(1);
      expect(result.attendees[0].email).toBe("attendee@example.com");
    });

    it("includes responses and userFieldsResponses", () => {
      const result = factory.createCancelledEventPayload(createBaseParams());
      expect(result.responses).toEqual({ name: { label: "Name", value: "John" } });
      expect(result.userFieldsResponses).toEqual({ name: { label: "Name", value: "John" } });
    });
  });
});
