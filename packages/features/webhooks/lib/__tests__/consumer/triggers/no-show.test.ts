import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PayloadBuilderFactory } from "../../../factory/versioned/PayloadBuilderFactory";
import type { IWebhookDataFetcher } from "../../../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../../../interface/IWebhookRepository";
import { WebhookVersion } from "../../../interface/IWebhookRepository";
import type { ILogger } from "../../../interface/infrastructure";
import type { IWebhookService } from "../../../interface/services";
import { WebhookTaskConsumer } from "../../../service/WebhookTaskConsumer";
import type { BookingWebhookTaskPayload } from "../../../types/webhookTask";

/**
 * BOOKING_NO_SHOW_UPDATED Trigger Tests
 *
 * Tests specific to the BOOKING_NO_SHOW_UPDATED webhook trigger.
 * This trigger fires when attendees are marked as no-show for a booking.
 *
 * Scenarios covered:
 * - Valid no-show data with message, attendees, bookingUid
 * - Missing required fields (message, attendees, bookingUid)
 * - userId, teamId, orgId, platformClientId passthrough
 * - No subscribers scenario
 */
describe("BOOKING_NO_SHOW_UPDATED Trigger", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockBookingDataFetcher: IWebhookDataFetcher;
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  const defaultSubscriber = {
    id: "sub-noshow-1",
    subscriberUrl: "https://example.com/noshow-webhook",
    payloadTemplate: null,
    appId: null,
    secret: "noshow-secret",
    time: null,
    timeUnit: null,
    eventTriggers: [WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED],
    version: WebhookVersion.V_2021_10_20,
  };

  const sampleNoShowEventData = {
    noShowMessage: "Host marked attendees as no-show",
    noShowAttendees: [
      { email: "attendee1@example.com", noShow: true },
      { email: "attendee2@example.com", noShow: false },
    ],
    bookingUid: "booking-uid-noshow",
    bookingId: 123,
  };

  beforeEach(() => {
    mockWebhookRepository = {
      getSubscribers: vi.fn().mockResolvedValue([]),
      getWebhookById: vi.fn(),
      findByWebhookId: vi.fn(),
      findByOrgIdAndTrigger: vi.fn(),
      getFilteredWebhooksForUser: vi.fn(),
    } as unknown as IWebhookRepository;

    mockBookingDataFetcher = {
      canHandle: vi.fn((event) =>
        [
          WebhookTriggerEvents.BOOKING_CREATED,
          WebhookTriggerEvents.BOOKING_CANCELLED,
          WebhookTriggerEvents.BOOKING_RESCHEDULED,
          WebhookTriggerEvents.BOOKING_REQUESTED,
          WebhookTriggerEvents.BOOKING_REJECTED,
          WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        ].includes(event)
      ),
      fetchEventData: vi.fn().mockResolvedValue(sampleNoShowEventData),
      getSubscriberContext: vi.fn((payload: BookingWebhookTaskPayload) => ({
        triggerEvent: payload.triggerEvent,
        userId: payload.userId,
        eventTypeId: payload.eventTypeId,
        teamId: payload.teamId,
        orgId: payload.orgId,
        oAuthClientId: payload.oAuthClientId,
      })),
    };

    mockPayloadBuilderFactory = {
      getBuilder: vi.fn().mockReturnValue({
        build: vi.fn().mockImplementation((dto) => dto),
      }),
    } as unknown as PayloadBuilderFactory;

    mockWebhookService = {
      processWebhooks: vi.fn().mockResolvedValue(undefined),
    } as unknown as IWebhookService;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ILogger;

    consumer = new WebhookTaskConsumer(
      mockWebhookRepository,
      [mockBookingDataFetcher],
      mockPayloadBuilderFactory,
      mockWebhookService,
      mockLogger
    );
  });

  describe("Happy path", () => {
    it("should process BOOKING_NO_SHOW_UPDATED and build correct DTO", async () => {
      const timestamp = "2025-12-20T14:00:00.000Z";
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-1",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "booking-uid-noshow",
        userId: 5,
        teamId: 10,
        orgId: 20,
        timestamp,
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-noshow-1");

      expect(mockBookingDataFetcher.canHandle).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED
      );
      expect(mockBookingDataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          createdAt: timestamp,
          message: "Host marked attendees as no-show",
          bookingUid: "booking-uid-noshow",
          bookingId: 123,
          attendees: [
            { email: "attendee1@example.com", noShow: true },
            { email: "attendee2@example.com", noShow: false },
          ],
          userId: 5,
          teamId: 10,
          orgId: 20,
        }),
        expect.arrayContaining([
          expect.objectContaining({ subscriberUrl: "https://example.com/noshow-webhook" }),
        ])
      );
    });

    it("should pass platformClientId from oAuthClientId when platformClientId is absent", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-platform",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "booking-uid-noshow",
        userId: 5,
        oAuthClientId: "oauth-client-123",
        timestamp: "2025-12-20T14:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-noshow-platform");

      const [, dto] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      expect((dto as Record<string, unknown>).platformClientId).toBe("oauth-client-123");
    });
  });

  describe("Missing required fields", () => {
    it("should warn and skip when message is missing", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        noShowAttendees: [{ email: "a@b.com", noShow: true }],
        bookingUid: "uid-1",
      });

      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-nomsg",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "uid-1",
        timestamp: "2025-12-20T14:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-noshow-nomsg");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Missing required fields for no-show DTO",
        expect.objectContaining({ errors: expect.arrayContaining([expect.stringContaining("Required")]) })
      );
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });

    it("should warn and skip when attendees are missing", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        noShowMessage: "No show",
        bookingUid: "uid-2",
      });

      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-noatt",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "uid-2",
        timestamp: "2025-12-20T14:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-noshow-noatt");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Missing required fields for no-show DTO",
        expect.objectContaining({ errors: expect.arrayContaining([expect.stringContaining("Required")]) })
      );
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });

    it("should warn and skip when bookingUid is missing from event data", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        noShowMessage: "No show",
        noShowAttendees: [{ email: "a@b.com", noShow: true }],
      });

      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-nouid",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "uid-3",
        timestamp: "2025-12-20T14:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-noshow-nouid");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Missing required fields for no-show DTO",
        expect.objectContaining({ errors: expect.arrayContaining([expect.stringContaining("Required")]) })
      );
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });
  });

  describe("No subscribers", () => {
    it("should skip processing when no subscribers found", async () => {
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([]);

      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-nosub",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "uid-nosub",
        timestamp: "2025-12-20T14:00:00.000Z",
      };

      await consumer.processWebhookTask(payload, "task-noshow-nosub");

      expect(mockBookingDataFetcher.fetchEventData).not.toHaveBeenCalled();
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });
  });
});
