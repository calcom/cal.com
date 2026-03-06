import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../interface/infrastructure";
import type { PaymentWebhookTaskPayload } from "../../types/webhookTask";
import { PaymentWebhookDataFetcher } from "./PaymentWebhookDataFetcher";

describe("PaymentWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let fetcher: PaymentWebhookDataFetcher;

  function createMockLogger() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    };
  }

  function createPayload(overrides?: Partial<PaymentWebhookTaskPayload>): PaymentWebhookTaskPayload {
    return {
      operationId: "op-1",
      timestamp: new Date().toISOString(),
      triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      bookingUid: "booking-uid-1",
      eventTypeId: 10,
      userId: 5,
      teamId: 3,
      orgId: 1,
      oAuthClientId: null,
      ...overrides,
    } as PaymentWebhookTaskPayload;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    fetcher = new PaymentWebhookDataFetcher(mockLogger as unknown as ILogger);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for BOOKING_PAYMENT_INITIATED and BOOKING_PAID", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED)).toBe(true);
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_PAID)).toBe(true);
    });

    it("should return false for non-payment triggers", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_CREATED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.FORM_SUBMITTED)).toBe(false);
    });
  });

  describe("fetchEventData", () => {
    it("should return null when bookingUid is missing", async () => {
      const payload = createPayload({ bookingUid: "" } as Partial<PaymentWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("Missing bookingUid for payment webhook");
    });

    it("should return scaffold object for valid bookingUid", async () => {
      const payload = createPayload({ bookingUid: "pay-uid-1" } as Partial<PaymentWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toEqual({ bookingUid: "pay-uid-1", _scaffold: true });
    });
  });

  describe("getSubscriberContext", () => {
    it("should map all fields including orgId", () => {
      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
        userId: 5,
        eventTypeId: 10,
        teamId: 3,
        orgId: 1,
        oAuthClientId: "oauth-1",
      } as Partial<PaymentWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
        userId: 5,
        eventTypeId: 10,
        teamId: 3,
        orgId: 1,
        oAuthClientId: "oauth-1",
      });
    });
  });
});
