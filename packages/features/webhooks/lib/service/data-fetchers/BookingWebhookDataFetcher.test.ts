import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../interface/infrastructure";
import type { BookingWebhookTaskPayload } from "../../types/webhookTask";
import { BookingWebhookDataFetcher } from "./BookingWebhookDataFetcher";

vi.mock("@calcom/features/CalendarEventBuilder", () => ({
  CalendarEventBuilder: {
    fromBooking: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn(),
}));

const mockKVGet = vi.fn().mockResolvedValue(null);
const mockKVDelete = vi.fn().mockResolvedValue(undefined);
vi.mock("@calcom/features/di/containers/KV", () => ({
  getKV: () => ({
    get: mockKVGet,
    put: vi.fn(),
    delete: mockKVDelete,
  }),
}));

import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { getTranslation } from "@calcom/i18n/server";

describe("BookingWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockBookingRepository: {
    getBookingForCalEventBuilderFromUid: ReturnType<typeof vi.fn>;
    findAttendeeNoShowByIds: ReturnType<typeof vi.fn>;
    findPreviousBooking: ReturnType<typeof vi.fn>;
  };
  let fetcher: BookingWebhookDataFetcher;

  function createMockLogger() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    };
  }

  function createPayload(overrides?: Partial<BookingWebhookTaskPayload>): BookingWebhookTaskPayload {
    return {
      operationId: "op-1",
      timestamp: new Date().toISOString(),
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      bookingUid: "booking-uid-1",
      eventTypeId: 10,
      userId: 5,
      teamId: 3,
      orgId: 1,
      oAuthClientId: null,
      ...overrides,
    } as BookingWebhookTaskPayload;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getTranslation).mockResolvedValue(((key: string, opts?: Record<string, string>) => {
      if (key === "x_marked_as_no_show") return `${opts?.x} marked as no-show`;
      if (key === "x_unmarked_as_no_show") return `${opts?.x} unmarked as no-show`;
      if (key === "no_show_updated") return "No-show status updated";
      return key;
    }) as never);

    mockLogger = createMockLogger();
    mockBookingRepository = {
      getBookingForCalEventBuilderFromUid: vi.fn(),
      findAttendeeNoShowByIds: vi.fn(),
      findPreviousBooking: vi.fn(),
    };
    fetcher = new BookingWebhookDataFetcher(mockLogger as unknown as ILogger, mockBookingRepository as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for all 6 booking trigger events", () => {
      const bookingTriggers = [
        WebhookTriggerEvents.BOOKING_CREATED,
        WebhookTriggerEvents.BOOKING_CANCELLED,
        WebhookTriggerEvents.BOOKING_RESCHEDULED,
        WebhookTriggerEvents.BOOKING_REQUESTED,
        WebhookTriggerEvents.BOOKING_REJECTED,
        WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
      ];

      for (const trigger of bookingTriggers) {
        expect(fetcher.canHandle(trigger)).toBe(true);
      }
    });

    it("should return false for non-booking triggers", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.FORM_SUBMITTED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.RECORDING_READY)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.OOO_CREATED)).toBe(false);
    });

    it("should return false for unknown trigger", () => {
      expect(fetcher.canHandle("UNKNOWN_TRIGGER" as WebhookTriggerEvents)).toBe(false);
    });
  });

  describe("fetchEventData", () => {
    it("should return null and log warn when bookingUid is missing", async () => {
      const payload = createPayload({ bookingUid: "" } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result.data).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("Missing bookingUid for booking webhook");
    });

    it("should return null when booking not found", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(null);
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(result.data).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("Booking not found", { bookingUid: "booking-uid-1" });
    });

    it("should return null when CalendarEventBuilder fails to build", async () => {
      const mockBooking = { eventType: { id: 10 } };
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      const mockBuilder = { build: vi.fn().mockReturnValue(null) };
      vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

      const payload = createPayload();
      const result = await fetcher.fetchEventData(payload);

      expect(result.data).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith("Failed to build CalendarEvent from booking", {
        bookingUid: "booking-uid-1",
      });
    });

    it("should return calendarEvent, booking, and eventType on success", async () => {
      const mockCalendarEvent = { title: "Test Event" };
      const mockBooking = { eventType: { id: 10, title: "Test" } };
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      const mockBuilder = { build: vi.fn().mockReturnValue(mockCalendarEvent) };
      vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

      const payload = createPayload();
      const result = await fetcher.fetchEventData(payload);

      expect(result.data).toEqual({
        calendarEvent: mockCalendarEvent,
        booking: mockBooking,
        eventType: mockBooking.eventType,
      });
    });

    it("should pass platform metadata to CalendarEventBuilder", async () => {
      const mockBooking = { eventType: { id: 10 } };
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      const mockBuilder = { build: vi.fn().mockReturnValue({ title: "Test" }) };
      vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

      const payload = createPayload({
        oAuthClientId: "oauth-client-1",
        platformRescheduleUrl: "https://example.com/reschedule",
        platformCancelUrl: "https://example.com/cancel",
        platformBookingUrl: "https://example.com/booking",
      } as Partial<BookingWebhookTaskPayload>);

      await fetcher.fetchEventData(payload);

      expect(CalendarEventBuilder.fromBooking).toHaveBeenCalledWith(mockBooking, {
        platformClientId: "oauth-client-1",
        platformRescheduleUrl: "https://example.com/reschedule",
        platformCancelUrl: "https://example.com/cancel",
        platformBookingUrl: "https://example.com/booking",
        attendeeSeatId: undefined,
      });
    });

    it("should pass attendeeSeatId to CalendarEventBuilder when provided in payload", async () => {
      const mockBooking = { eventType: { id: 10 } };
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      const mockBuilder = { build: vi.fn().mockReturnValue({ title: "Test" }) };
      vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

      const payload = createPayload({
        attendeeSeatId: "seat-ref-uuid-123",
        oAuthClientId: "oauth-client-1",
      } as Partial<BookingWebhookTaskPayload>);

      await fetcher.fetchEventData(payload);

      expect(CalendarEventBuilder.fromBooking).toHaveBeenCalledWith(mockBooking, {
        platformClientId: "oauth-client-1",
        platformRescheduleUrl: undefined,
        platformCancelUrl: undefined,
        platformBookingUrl: undefined,
        attendeeSeatId: "seat-ref-uuid-123",
      });
    });

    it("should include only the matching attendee for seat-scoped booking webhooks", async () => {
      const mockBooking = { eventType: { id: 10 } };
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      const mockCalendarEvent = {
        title: "Test",
        attendees: [
          { email: "a@example.com", bookingSeat: { referenceUid: "seat-a" } },
          { email: "b@example.com", bookingSeat: { referenceUid: "seat-b" } },
        ],
      };
      const mockBuilder = { build: vi.fn().mockReturnValue(mockCalendarEvent) };
      vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        attendeeSeatId: "seat-b",
      } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      const calEvent = ((result as Record<string, unknown>).data as Record<string, unknown>)
        .calendarEvent as { attendees: Array<{ email: string }> };
      expect(calEvent.attendees).toEqual([{ email: "b@example.com", bookingSeat: { referenceUid: "seat-b" } }]);
    });

    it("should keep attendees unchanged when seat-scoped attendee cannot be resolved", async () => {
      const mockBooking = { eventType: { id: 10 } };
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      const mockCalendarEvent = {
        title: "Test",
        attendees: [{ email: "a@example.com", bookingSeat: { referenceUid: "seat-a" } }],
      };
      const mockBuilder = { build: vi.fn().mockReturnValue(mockCalendarEvent) };
      vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        attendeeSeatId: "seat-missing",
      } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      const calEvent = ((result as Record<string, unknown>).data as Record<string, unknown>)
        .calendarEvent as { attendees: Array<{ email: string }> };
      expect(calEvent.attendees).toEqual([{ email: "a@example.com", bookingSeat: { referenceUid: "seat-a" } }]);
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        "Could not resolve seat attendee for webhook payload",
        expect.anything()
      );
    });

    it("should pass undefined attendeeSeatId when not provided in payload", async () => {
      const mockBooking = { eventType: { id: 10 } };
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      const mockBuilder = { build: vi.fn().mockReturnValue({ title: "Test" }) };
      vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

      const payload = createPayload();

      await fetcher.fetchEventData(payload);

      expect(CalendarEventBuilder.fromBooking).toHaveBeenCalledWith(mockBooking, {
        platformClientId: undefined,
        platformRescheduleUrl: undefined,
        platformCancelUrl: undefined,
        platformBookingUrl: undefined,
        attendeeSeatId: undefined,
      });
    });

    it("should return the error in the result when repository throws", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockRejectedValue(
        new Error("DB connection failed")
      );
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("DB connection failed");
    });

    describe("BOOKING_REQUESTED with fromReschedule", () => {
      it("should fetch previousBooking when booking has fromReschedule and trigger is BOOKING_REQUESTED", async () => {
        const mockBooking = {
          eventType: { id: 10, title: "Test" },
          fromReschedule: "original-booking-uid",
        };
        const mockPreviousBooking = {
          id: 50,
          uid: "original-booking-uid",
          startTime: new Date("2024-06-10T09:00:00.000Z"),
          endTime: new Date("2024-06-10T10:00:00.000Z"),
          rescheduledBy: "attendee@example.com",
        };
        mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
        mockBookingRepository.findPreviousBooking.mockResolvedValue(mockPreviousBooking);
        const mockBuilder = { build: vi.fn().mockReturnValue({ title: "Test" }) };
        vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

        const payload = createPayload({
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        });
        const result = await fetcher.fetchEventData(payload);

        expect(mockBookingRepository.findPreviousBooking).toHaveBeenCalledWith({
          fromReschedule: "original-booking-uid",
        });
        expect(result.data).toEqual({
          calendarEvent: { title: "Test" },
          booking: mockBooking,
          eventType: mockBooking.eventType,
          previousBooking: mockPreviousBooking,
        });
      });

      it("should not fetch previousBooking when booking has no fromReschedule for BOOKING_REQUESTED", async () => {
        const mockBooking = { eventType: { id: 10, title: "Test" } };
        mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
        const mockBuilder = { build: vi.fn().mockReturnValue({ title: "Test" }) };
        vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

        const payload = createPayload({
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        });
        const result = await fetcher.fetchEventData(payload);

        expect(mockBookingRepository.findPreviousBooking).not.toHaveBeenCalled();
        expect(result.data).toEqual({
          calendarEvent: { title: "Test" },
          booking: mockBooking,
          eventType: mockBooking.eventType,
        });
      });
    });

    describe("BOOKING_NO_SHOW_UPDATED", () => {
      it("should fetch attendee PII from DB using attendeeIds", async () => {
        mockBookingRepository.findAttendeeNoShowByIds.mockResolvedValue([
          { id: 1, email: "user@example.com", noShow: true },
        ]);

        const payload = createPayload({
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          bookingUid: "no-show-uid",
          metadata: {
            attendeeIds: [1],
            bookingId: 42,
          },
        } as Partial<BookingWebhookTaskPayload>);

        const result = await fetcher.fetchEventData(payload);

        expect(result.data).toEqual({
          noShowMessage: "user@example.com marked as no-show",
          noShowAttendees: [{ email: "user@example.com", noShow: true }],
          bookingId: 42,
          bookingUid: "no-show-uid",
        });
        expect(mockBookingRepository.findAttendeeNoShowByIds).toHaveBeenCalledWith({ ids: [1] });
        expect(mockBookingRepository.getBookingForCalEventBuilderFromUid).not.toHaveBeenCalled();
      });

      it("should build 'unmarked' message for single attendee with noShow=false", async () => {
        mockBookingRepository.findAttendeeNoShowByIds.mockResolvedValue([
          { id: 2, email: "user@example.com", noShow: false },
        ]);

        const payload = createPayload({
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          bookingUid: "no-show-uid",
          metadata: { attendeeIds: [2], bookingId: 42 },
        } as Partial<BookingWebhookTaskPayload>);

        const result = await fetcher.fetchEventData(payload);

        expect(result.data).toEqual(
          expect.objectContaining({
            noShowMessage: "user@example.com unmarked as no-show",
            noShowAttendees: [{ email: "user@example.com", noShow: false }],
          })
        );
      });

      it("should build generic message for multiple attendees", async () => {
        mockBookingRepository.findAttendeeNoShowByIds.mockResolvedValue([
          { id: 1, email: "a@example.com", noShow: true },
          { id: 2, email: "b@example.com", noShow: false },
        ]);

        const payload = createPayload({
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          bookingUid: "no-show-uid",
          metadata: { attendeeIds: [1, 2], bookingId: 42 },
        } as Partial<BookingWebhookTaskPayload>);

        const result = await fetcher.fetchEventData(payload);

        expect(result.data).toEqual({
          noShowMessage: "No-show status updated",
          noShowAttendees: [
            { email: "a@example.com", noShow: true },
            { email: "b@example.com", noShow: false },
          ],
          bookingId: 42,
          bookingUid: "no-show-uid",
        });
      });

      it("should return null when no attendees found in DB", async () => {
        mockBookingRepository.findAttendeeNoShowByIds.mockResolvedValue([]);

        const payload = createPayload({
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          bookingUid: "no-show-uid",
          metadata: { attendeeIds: [999], bookingId: 42 },
        } as Partial<BookingWebhookTaskPayload>);

        const result = await fetcher.fetchEventData(payload);

        expect(result.data).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          "No attendees found for no-show webhook",
          expect.any(Object)
        );
      });

      it("should return null when metadata is missing attendeeIds", async () => {
        const payload = createPayload({
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          metadata: { bookingId: 42 },
        } as Partial<BookingWebhookTaskPayload>);

        const result = await fetcher.fetchEventData(payload);

        expect(result.data).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Missing attendeeIds in no-show metadata",
          expect.any(Object)
        );
      });

      it("should return null when metadata is undefined", async () => {
        const payload = createPayload({
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          metadata: undefined,
        } as Partial<BookingWebhookTaskPayload>);

        const result = await fetcher.fetchEventData(payload);

        expect(result.data).toBeNull();
      });
    });
  });

  describe("getSubscriberContext", () => {
    it("should map all payload fields to context", () => {
      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        userId: 5,
        eventTypeId: 10,
        teamId: 3,
        orgId: 1,
        oAuthClientId: "oauth-1",
      } as Partial<BookingWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        userId: 5,
        eventTypeId: 10,
        teamId: 3,
        orgId: 1,
        oAuthClientId: "oauth-1",
      });
    });

    it("should handle missing optional fields", () => {
      const payload = createPayload({
        userId: undefined,
        eventTypeId: undefined,
        teamId: undefined,
        orgId: undefined,
        oAuthClientId: undefined,
      } as Partial<BookingWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CREATED);
      expect(context.userId).toBeUndefined();
      expect(context.eventTypeId).toBeUndefined();
    });

    it("should return correct triggerEvent from payload", () => {
      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
      } as Partial<BookingWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CANCELLED);
    });
  });

  describe("BOOKING_CANCELLED seat cancellation — KV-based attendee reconstruction", () => {
    function setupBookingAndBuilder(attendees = [{ email: "remaining@example.com", name: "Remaining" }]) {
      const mockCalendarEvent = {
        title: "Seated Event",
        attendees,
      };
      const mockBooking = { eventType: { id: 10 }, metadata: {} };
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue({
        build: vi.fn().mockReturnValue(mockCalendarEvent),
      } as never);
      return { mockCalendarEvent, mockBooking };
    }

    it("should override attendees from KV when entry exists", async () => {
      setupBookingAndBuilder();
      mockKVGet.mockResolvedValueOnce(
        JSON.stringify({
          email: "cancelled@example.com",
          name: "Cancelled User",
          timeZone: "America/New_York",
          locale: "en",
          phoneNumber: "+15551234567",
        })
      );

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        attendeeSeatId: "seat-ref-abc",
      } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(mockKVGet).toHaveBeenCalledWith("webhook:cancelled-seat:seat-ref-abc");
      const calEvent = ((result as Record<string, unknown>).data as Record<string, unknown>)
        .calendarEvent as { attendees: unknown[] };
      expect(calEvent.attendees).toHaveLength(1);
      expect(calEvent.attendees[0]).toEqual(
        expect.objectContaining({
          email: "cancelled@example.com",
          name: "Cancelled User",
          timeZone: "America/New_York",
          phoneNumber: "+15551234567",
        })
      );
      expect(mockKVDelete).not.toHaveBeenCalled();
    });

    it("should set placeholder attendee and warn when KV entry is missing (TTL expired)", async () => {
      setupBookingAndBuilder();
      mockKVGet.mockResolvedValueOnce(null);

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        attendeeSeatId: "seat-ref-expired",
      } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      const calEvent = ((result as Record<string, unknown>).data as Record<string, unknown>)
        .calendarEvent as { attendees: unknown[] };
      expect(calEvent.attendees).toHaveLength(1);
      expect(calEvent.attendees[0]).toEqual(
        expect.objectContaining({
          email: "",
          name: "[attendee data unavailable]",
        })
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Cancelled seat attendee KV entry missing (TTL expired or KV unavailable)",
        { bookingUid: "booking-uid-1", seatId: "seat-ref-expired" }
      );
    });

    it("should set placeholder attendee and warn when KV data fails validation", async () => {
      setupBookingAndBuilder();
      mockKVGet.mockResolvedValueOnce(JSON.stringify({ bad: "data" }));

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        attendeeSeatId: "seat-ref-bad",
      } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      const calEvent = ((result as Record<string, unknown>).data as Record<string, unknown>)
        .calendarEvent as { attendees: unknown[] };
      expect(calEvent.attendees).toHaveLength(1);
      expect(calEvent.attendees[0]).toEqual(
        expect.objectContaining({
          email: "",
          name: "[attendee data unavailable]",
        })
      );
      expect(mockLogger.warn).toHaveBeenCalledWith("Cancelled seat attendee KV data failed validation", {
        bookingUid: "booking-uid-1",
        seatId: "seat-ref-bad",
      });
    });

    it("should set calendarEvent.cancellationReason from KV when present", async () => {
      const { mockCalendarEvent } = setupBookingAndBuilder();
      mockKVGet.mockResolvedValueOnce(
        JSON.stringify({
          email: "cancelled@example.com",
          name: "Cancelled User",
          timeZone: "America/New_York",
          locale: "en",
          phoneNumber: null,
          cancellationReason: "Schedule conflict",
        })
      );

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        attendeeSeatId: "seat-ref-reason",
      } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      const calEvent = ((result as Record<string, unknown>).data as Record<string, unknown>)
        .calendarEvent as { cancellationReason?: string };
      expect(calEvent.cancellationReason).toBe("Schedule conflict");
    });

    it("should not set calendarEvent.cancellationReason when KV entry has no reason", async () => {
      const { mockCalendarEvent } = setupBookingAndBuilder();
      mockKVGet.mockResolvedValueOnce(
        JSON.stringify({
          email: "cancelled@example.com",
          name: "Cancelled User",
          timeZone: "America/New_York",
          locale: "en",
          phoneNumber: null,
        })
      );

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        attendeeSeatId: "seat-ref-no-reason",
      } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      const calEvent = ((result as Record<string, unknown>).data as Record<string, unknown>)
        .calendarEvent as { cancellationReason?: string };
      expect(calEvent.cancellationReason).toBeUndefined();
    });

    it("should not touch KV when BOOKING_CANCELLED has no attendeeSeatId (non-seat cancellation)", async () => {
      setupBookingAndBuilder();

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
      });

      await fetcher.fetchEventData(payload);

      expect(mockKVGet).not.toHaveBeenCalled();
    });
  });

  describe("fetchNoShowData — bookingId handling", () => {
    it("should include bookingId from metadata when present", async () => {
      mockBookingRepository.findAttendeeNoShowByIds.mockResolvedValue([
        { id: 1, email: "a@b.com", noShow: true },
      ]);

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "booking-noshow-5",
        metadata: {
          attendeeIds: [1],
          bookingId: 456,
        },
      } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result.data).toEqual(
        expect.objectContaining({
          bookingId: 456,
          bookingUid: "booking-noshow-5",
        })
      );
    });

    it("should handle missing bookingId in metadata gracefully", async () => {
      mockBookingRepository.findAttendeeNoShowByIds.mockResolvedValue([
        { id: 1, email: "a@b.com", noShow: true },
      ]);

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "booking-noshow-6",
        metadata: {
          attendeeIds: [1],
        },
      } as Partial<BookingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result.data).toEqual(
        expect.objectContaining({
          bookingId: undefined,
          bookingUid: "booking-noshow-6",
        })
      );
    });
  });
});
