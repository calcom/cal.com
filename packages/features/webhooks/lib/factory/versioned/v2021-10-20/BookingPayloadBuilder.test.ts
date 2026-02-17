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
});
