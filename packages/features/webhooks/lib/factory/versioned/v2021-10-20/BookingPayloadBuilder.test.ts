import { describe, it, expect, vi } from "vitest";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { BookingWebhookEventDTO, EventTypeInfo } from "../../../dto/types";
import { BookingPayloadBuilder } from "./BookingPayloadBuilder";

vi.mock("@calcom/lib/dayjs", () => ({
  getUTCOffsetByTimezone: vi.fn(() => 0),
}));

describe("v2021-10-20/BookingPayloadBuilder", () => {
  const builder = new BookingPayloadBuilder();

  const mockEventType: EventTypeInfo = {
    eventTitle: "Test Event",
    eventDescription: "Test Description",
    requiresConfirmation: false,
    price: 0,
    currency: "USD",
    length: 30,
  };

  const mockCalendarEvent: CalendarEvent = {
    type: "test-event",
    title: "Test Meeting",
    description: "Meeting description",
    additionalNotes: "Additional notes",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T10:30:00Z",
    organizer: {
      id: 1,
      email: "organizer@test.com",
      name: "Test Organizer",
      timeZone: "UTC",
      language: { locale: "en" },
    },
    attendees: [
      {
        email: "attendee@test.com",
        name: "Test Attendee",
        timeZone: "UTC",
        language: { locale: "en" },
      },
    ],
    location: "https://cal.com/video/123",
    uid: "booking-uid-123",
    customInputs: {},
    responses: {},
    userFieldsResponses: {},
  };

  const createMockDTO = (
    triggerEvent: WebhookTriggerEvents,
    extra: Partial<BookingWebhookEventDTO> = {}
  ): BookingWebhookEventDTO => ({
    triggerEvent,
    createdAt: "2024-01-15T10:00:00Z",
    booking: {
      id: 1,
      eventTypeId: 1,
      userId: 1,
      smsReminderNumber: null,
    },
    eventType: mockEventType,
    evt: mockCalendarEvent,
    ...extra,
  });

  it("should be instance of correct class", () => {
    expect(builder).toBeInstanceOf(BookingPayloadBuilder);
  });

  it("should correctly build BOOKING_CREATED payload", () => {
    const dto = createMockDTO(WebhookTriggerEvents.BOOKING_CREATED);
    const payload = builder.build(dto);

    expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CREATED);
    expect(payload.payload.status).toBe(BookingStatus.ACCEPTED);
    expect(payload.payload.bookingId).toBe(1);
    expect(payload.payload.title).toBe("Test Meeting");
  });

  it("should correctly build BOOKING_CANCELLED payload", () => {
    const dto = createMockDTO(WebhookTriggerEvents.BOOKING_CANCELLED, {
      cancelledBy: "user@test.com",
      cancellationReason: "Schedule conflict",
    });
    const payload = builder.build(dto);

    expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CANCELLED);
    expect(payload.payload.status).toBe(BookingStatus.CANCELLED);
    expect(payload.payload.cancelledBy).toBe("user@test.com");
    expect(payload.payload.cancellationReason).toBe("Schedule conflict");
  });

  it("should handle all booking trigger events", () => {
    const triggers = [
      WebhookTriggerEvents.BOOKING_CREATED,
      WebhookTriggerEvents.BOOKING_CANCELLED,
      WebhookTriggerEvents.BOOKING_REQUESTED,
      WebhookTriggerEvents.BOOKING_RESCHEDULED,
      WebhookTriggerEvents.BOOKING_REJECTED,
      WebhookTriggerEvents.BOOKING_PAID,
      WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
    ];

    triggers.forEach((trigger) => {
      let dto: BookingWebhookEventDTO;

      if (trigger === WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED) {
        dto = {
          triggerEvent: trigger,
          createdAt: "2024-01-15T10:00:00Z",
          bookingUid: "booking-uid-123",
          bookingId: 1,
          attendees: [{ email: "attendee@test.com", noShow: true }],
          message: "No-show",
        } as BookingWebhookEventDTO;
      } else {
        dto = createMockDTO(trigger);
      }

      const payload = builder.build(dto);
      expect(payload.triggerEvent).toBe(trigger);
      expect(payload.payload).toBeDefined();
    });
  });

  it("should never throw on missing optional fields", () => {
    // Test with minimal DTO
    const minimalDTO: BookingWebhookEventDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      createdAt: "2024-01-15T10:00:00Z",
      booking: {
        id: 1,
        eventTypeId: 1,
        userId: 1,
        smsReminderNumber: null,
      },
      eventType: mockEventType,
      evt: {
        ...mockCalendarEvent,
        organizer: null,
        attendees: [],
      },
    };

    expect(() => builder.build(minimalDTO)).not.toThrow();
  });

  describe("BOOKING_RESCHEDULED payload", () => {
    it("should include reschedule-specific fields", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_RESCHEDULED, {
        rescheduleId: 123,
        rescheduleUid: "original-booking-uid",
        rescheduleStartTime: "2024-01-14T10:00:00Z",
        rescheduleEndTime: "2024-01-14T10:30:00Z",
        rescheduledBy: "user@test.com",
        metadata: { videoCallUrl: "https://cal.com/video/456" },
      });
      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_RESCHEDULED);
      expect(payload.payload.status).toBe(BookingStatus.ACCEPTED);
      expect(payload.payload.rescheduleId).toBe(123);
      expect(payload.payload.rescheduleUid).toBe("original-booking-uid");
      expect(payload.payload.rescheduleStartTime).toBe("2024-01-14T10:00:00Z");
      expect(payload.payload.rescheduleEndTime).toBe("2024-01-14T10:30:00Z");
      expect(payload.payload.rescheduledBy).toBe("user@test.com");
      expect(payload.payload.metadata).toEqual({ videoCallUrl: "https://cal.com/video/456" });
    });
  });

  describe("BOOKING_REQUESTED payload", () => {
    it("should have PENDING status and include metadata", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        metadata: { videoCallUrl: "https://cal.com/video/789" },
      });
      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_REQUESTED);
      expect(payload.payload.status).toBe(BookingStatus.PENDING);
      expect(payload.payload.metadata).toEqual({ videoCallUrl: "https://cal.com/video/789" });
    });
  });

  describe("BOOKING_PAYMENT_INITIATED payload", () => {
    it("should include paymentId and paymentData", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED, {
        paymentId: 456,
        paymentData: { amount: 1000, currency: "USD" },
      });
      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED);
      expect(payload.payload.status).toBe(BookingStatus.ACCEPTED);
      expect(payload.payload.paymentId).toBe(456);
      expect(payload.payload.paymentData).toEqual({ amount: 1000, currency: "USD" });
    });
  });

  describe("BOOKING_REJECTED payload", () => {
    it("should include rejectionReason", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REJECTED, {
        rejectionReason: "Not available at this time",
      });
      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_REJECTED);
      expect(payload.payload.status).toBe(BookingStatus.REJECTED);
      expect(payload.payload.rejectionReason).toBe("Not available at this time");
    });
  });

  describe("responses field normalization", () => {
    it("should normalize system field labels to default labels", () => {
      const dtoWithResponses = createMockDTO(WebhookTriggerEvents.BOOKING_CREATED, {
        evt: {
          ...mockCalendarEvent,
          responses: {
            name: { value: "John Doe", label: "name" },
            email: { value: "john@test.com", label: "email" },
            location: { value: "Office", label: "location" },
          },
        },
      });
      const payload = builder.build(dtoWithResponses);

      expect(payload.payload.responses).toEqual({
        name: { value: "John Doe", label: "your_name" },
        email: { value: "john@test.com", label: "email_address" },
        location: { value: "Office", label: "location" },
      });
    });

    it("should preserve custom labels for non-system fields", () => {
      const dtoWithCustomResponses = createMockDTO(WebhookTriggerEvents.BOOKING_CREATED, {
        evt: {
          ...mockCalendarEvent,
          responses: {
            name: { value: "John Doe", label: "Full Name" },
            email: { value: "john@test.com", label: "Work Email" },
            customField: { value: "Custom Value", label: "Custom Label" },
          },
        },
      });
      const payload = builder.build(dtoWithCustomResponses);

      expect(payload.payload.responses).toEqual({
        name: { value: "John Doe", label: "Full Name" },
        email: { value: "john@test.com", label: "Work Email" },
        customField: { value: "Custom Value", label: "Custom Label" },
      });
    });
  });

  describe("organizer field", () => {
    it("should include usernameInOrg when provided", () => {
      const dtoWithOrgUsername = createMockDTO(WebhookTriggerEvents.BOOKING_CREATED, {
        evt: {
          ...mockCalendarEvent,
          organizer: {
            ...mockCalendarEvent.organizer,
            usernameInOrg: "org-username",
          },
        },
      });
      const payload = builder.build(dtoWithOrgUsername);

      expect(payload.payload.organizer.usernameInOrg).toBe("org-username");
    });

    it("should set usernameInOrg to null when not provided", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_CREATED);
      const payload = builder.build(dto);

      expect(payload.payload.organizer.usernameInOrg).toBeNull();
    });
  });

  describe("attendees field", () => {
    it("should include firstName and lastName derived from name", () => {
      const dtoWithAttendees = createMockDTO(WebhookTriggerEvents.BOOKING_CREATED, {
        evt: {
          ...mockCalendarEvent,
          attendees: [
            {
              email: "john@test.com",
              name: "John Doe Smith",
              timeZone: "UTC",
              language: { locale: "en" },
            },
          ],
        },
      });
      const payload = builder.build(dtoWithAttendees);

      expect(payload.payload.attendees[0].firstName).toBe("John");
      expect(payload.payload.attendees[0].lastName).toBe("Doe Smith");
    });

    it("should handle single name without space", () => {
      const dtoWithSingleName = createMockDTO(WebhookTriggerEvents.BOOKING_CREATED, {
        evt: {
          ...mockCalendarEvent,
          attendees: [
            {
              email: "john@test.com",
              name: "John",
              timeZone: "UTC",
              language: { locale: "en" },
            },
          ],
        },
      });
      const payload = builder.build(dtoWithSingleName);

      expect(payload.payload.attendees[0].firstName).toBe("John");
      expect(payload.payload.attendees[0].lastName).toBe("");
    });
  });

  describe("event type metadata", () => {
    it("should include eventTitle, eventDescription, price, currency, and length", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_CREATED);
      const payload = builder.build(dto);

      expect(payload.payload.eventTitle).toBe("Test Event");
      expect(payload.payload.eventDescription).toBe("Test Description");
      expect(payload.payload.price).toBe(0);
      expect(payload.payload.currency).toBe("USD");
      expect(payload.payload.length).toBe(30);
      expect(payload.payload.requiresConfirmation).toBe(false);
    });

    it("should handle paid events with price", () => {
      const paidEventType: EventTypeInfo = {
        ...mockEventType,
        price: 5000,
        currency: "USD",
      };
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_CREATED, {
        eventType: paidEventType,
      });
      const payload = builder.build(dto);

      expect(payload.payload.price).toBe(5000);
      expect(payload.payload.currency).toBe("USD");
    });
  });

  describe("BOOKING_CANCELLED with requestReschedule", () => {
    it("should include requestReschedule flag when true", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_CANCELLED, {
        cancelledBy: "user@test.com",
        cancellationReason: "Need to reschedule",
        requestReschedule: true,
      });
      const payload = builder.build(dto);

      expect(payload.payload.requestReschedule).toBe(true);
    });

    it("should default requestReschedule to false when not provided", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_CANCELLED, {
        cancelledBy: "user@test.com",
        cancellationReason: "Cannot attend",
      });
      const payload = builder.build(dto);

      expect(payload.payload.requestReschedule).toBe(false);
    });
  });
});

