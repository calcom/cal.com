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

import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";

describe("BookingWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockBookingRepository: { getBookingForCalEventBuilderFromUid: ReturnType<typeof vi.fn> };
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
    mockLogger = createMockLogger();
    mockBookingRepository = { getBookingForCalEventBuilderFromUid: vi.fn() };
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

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("Missing bookingUid for booking webhook");
    });

    it("should return null when booking not found", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(null);
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("Booking not found", { bookingUid: "booking-uid-1" });
    });

    it("should return null when CalendarEventBuilder fails to build", async () => {
      const mockBooking = { eventType: { id: 10 } };
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(mockBooking);
      const mockBuilder = { build: vi.fn().mockReturnValue(null) };
      vi.mocked(CalendarEventBuilder.fromBooking).mockResolvedValue(mockBuilder as never);

      const payload = createPayload();
      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
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

      expect(result).toEqual({
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
      });
    });

    it("should catch repository error, log, and return null", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockRejectedValue(
        new Error("DB connection failed")
      );
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith("Error fetching booking data for webhook", {
        bookingUid: "booking-uid-1",
        error: "DB connection failed",
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
});
