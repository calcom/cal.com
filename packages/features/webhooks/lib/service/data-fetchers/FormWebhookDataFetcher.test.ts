import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../interface/infrastructure";
import type { FormWebhookTaskPayload } from "../../types/webhookTask";
import { FormWebhookDataFetcher } from "./FormWebhookDataFetcher";

describe("FormWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let fetcher: FormWebhookDataFetcher;

  function createMockLogger() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    };
  }

  function createPayload(overrides?: Partial<FormWebhookTaskPayload>): FormWebhookTaskPayload {
    return {
      operationId: "op-1",
      timestamp: new Date().toISOString(),
      triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
      formId: "form-1",
      userId: 5,
      teamId: 3,
      oAuthClientId: null,
      ...overrides,
    } as FormWebhookTaskPayload;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    fetcher = new FormWebhookDataFetcher(mockLogger as unknown as ILogger);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for FORM_SUBMITTED only", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.FORM_SUBMITTED)).toBe(true);
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_CREATED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.RECORDING_READY)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.OOO_CREATED)).toBe(false);
    });
  });

  describe("fetchEventData", () => {
    it("should return null when formId is missing", async () => {
      const payload = createPayload({ formId: "" } as Partial<FormWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("Missing formId for form webhook");
    });

    it("should return scaffold object for valid formId", async () => {
      const payload = createPayload({ formId: "form-123" } as Partial<FormWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toEqual({ formId: "form-123", _scaffold: true });
    });

    it("should log debug about scaffold phase", async () => {
      const payload = createPayload({ formId: "form-123" } as Partial<FormWebhookTaskPayload>);

      await fetcher.fetchEventData(payload);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Form data fetch not implemented yet (Phase 0 scaffold)",
        { formId: "form-123" }
      );
    });
  });

  describe("getSubscriberContext", () => {
    it("should map fields correctly with eventTypeId undefined", () => {
      const payload = createPayload({
        userId: 5,
        teamId: 3,
        oAuthClientId: "oauth-1",
      } as Partial<FormWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
        userId: 5,
        eventTypeId: undefined,
        teamId: 3,
        orgId: undefined,
        oAuthClientId: "oauth-1",
      });
    });
  });
});
