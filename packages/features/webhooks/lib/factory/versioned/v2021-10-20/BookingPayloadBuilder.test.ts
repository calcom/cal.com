import { describe, it, expect, vi } from "vitest";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type {
  BookingWebhookEventDTO,
  EventPayloadType,
  EventTypeInfo,
} from "../../../dto/types";
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

  describe("Legacy payload shape compatibility (v2021-10-20)", () => {
    /**
     * These tests assert the real BookingPayloadBuilder output matches the
     * legacy webhook format expected by E2E (webhook.e2e.ts) and external
     * consumers. They exercise normalization and field shapes without mocks.
     */

    it("normalizes response labels to your_name and email_address for BOOKING_REQUESTED", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        evt: {
          ...mockCalendarEvent,
          responses: {
            name: { value: "Test Testson", label: "name" },
            email: { value: "test@example.com", label: "email" },
          },
          userFieldsResponses: {},
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.responses?.name?.label).toBe("your_name");
      expect(p.responses?.name?.value).toBe("Test Testson");
      expect(p.responses?.email?.label).toBe("email_address");
      expect(p.responses?.email?.value).toBe("test@example.com");
    });

    it("passes through userFieldsResponses unchanged (only responses is normalized)", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        evt: {
          ...mockCalendarEvent,
          responses: {},
          userFieldsResponses: {
            name: { value: "Jane", label: "name" },
            email: { value: "jane@example.com", label: "email" },
          },
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.userFieldsResponses?.name?.label).toBe("name");
      expect(p.userFieldsResponses?.email?.label).toBe("email");
    });

    it("includes destinationCalendar in payload (null when not set)", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        evt: { ...mockCalendarEvent, destinationCalendar: undefined },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect("destinationCalendar" in p).toBe(true);
      expect(p.destinationCalendar).toBeNull();
    });

    it("includes destinationCalendar when evt has it", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        evt: {
          ...mockCalendarEvent,
          destinationCalendar: { id: "cal-1", integration: "google_calendar" },
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.destinationCalendar).toEqual({
        id: "cal-1",
        integration: "google_calendar",
      });
    });

    it("outputs assignmentReason as legacy array from booking", () => {
      const legacyReason = [
        { reasonEnum: "ROUND_ROBIN", reasonString: "Round robin" },
        { reasonEnum: "LEAST_RECENTLY_BOOKED", reasonString: "Least recently booked" },
      ];
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        booking: {
          id: 1,
          eventTypeId: 1,
          userId: 1,
          smsReminderNumber: null,
          assignmentReason: legacyReason,
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.assignmentReason).toEqual(legacyReason);
    });

    it("outputs assignmentReason as null when booking has none", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        booking: {
          id: 1,
          eventTypeId: 1,
          userId: 1,
          smsReminderNumber: null,
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.assignmentReason).toBeNull();
    });

    it("BOOKING_REQUESTED payload includes metadata from extra", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        metadata: { videoCallUrl: "https://cal.com/video/abc" },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.metadata).toEqual({ videoCallUrl: "https://cal.com/video/abc" });
    });

    it("preserves empty string description (does not replace with additionalNotes)", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        evt: {
          ...mockCalendarEvent,
          description: "",
          additionalNotes: "organizer notes here",
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.description).toBe("");
      expect(p.additionalNotes).toBe("organizer notes here");
    });

    it("defaults to price 0, currency usd, length null when eventType fields are missing", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        eventType: {
          ...mockEventType,
          price: undefined,
          currency: undefined,
          length: undefined,
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.price).toBe(0);
      expect(p.currency).toBe("usd");
      expect(p.length).toBeNull();
    });

    it("derives attendee firstName and lastName from full name when absent", () => {
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        evt: {
          ...mockCalendarEvent,
          attendees: [
            {
              email: "john@example.com",
              name: "John Doe",
              timeZone: "UTC",
              language: { locale: "en" },
            },
            {
              email: "alice@example.com",
              name: "Alice",
              timeZone: "UTC",
              language: { locale: "en" },
            },
          ],
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.attendees?.[0]).toMatchObject({
        name: "John Doe",
        firstName: "John",
        lastName: "Doe",
      });
      expect(p.attendees?.[1]).toMatchObject({
        name: "Alice",
        firstName: "Alice",
        lastName: "",
      });
    });

    it("does not leak evt.assignmentReason; only booking legacy array or null appears", () => {
      const evtShape = { category: "round_robin", details: "transformed" } as const;
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        evt: {
          ...mockCalendarEvent,
          assignmentReason: evtShape,
        },
        booking: {
          id: 1,
          eventTypeId: 1,
          userId: 1,
          smsReminderNumber: null,
          assignmentReason: null,
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.assignmentReason).toBeNull();
      expect(p.assignmentReason).not.toEqual(evtShape);
    });

    it("uses only booking.assignmentReason when both evt and booking have it", () => {
      const legacyArray = [{ reasonEnum: "ROUND_ROBIN", reasonString: "Round robin" }];
      const dto = createMockDTO(WebhookTriggerEvents.BOOKING_REQUESTED, {
        evt: {
          ...mockCalendarEvent,
          assignmentReason: { category: "other", details: "from evt" },
        },
        booking: {
          id: 1,
          eventTypeId: 1,
          userId: 1,
          smsReminderNumber: null,
          assignmentReason: legacyArray,
        },
      });
      const result = builder.build(dto);
      const p = result.payload as EventPayloadType;

      expect(p.assignmentReason).toEqual(legacyArray);
    });
  });
});
