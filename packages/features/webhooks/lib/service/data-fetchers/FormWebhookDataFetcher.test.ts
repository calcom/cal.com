import type { RoutingFormResponseRepositoryInterface } from "@calcom/features/routing-forms/repositories/RoutingFormResponseRepository.interface";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../interface/infrastructure";
import type {
  FormWebhookTaskPayload,
  RoutingFormFallbackHitWebhookTaskPayload,
} from "../../types/webhookTask";
import { FormWebhookDataFetcher } from "./FormWebhookDataFetcher";

describe("FormWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockRoutingFormResponseRepository: RoutingFormResponseRepositoryInterface;
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

  function createFallbackPayload(
    overrides?: Partial<RoutingFormFallbackHitWebhookTaskPayload>
  ): RoutingFormFallbackHitWebhookTaskPayload {
    return {
      operationId: "op-fb-1",
      timestamp: new Date().toISOString(),
      triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
      formId: "form-abc",
      responseId: 456,
      teamId: 10,
      userId: 5,
      oAuthClientId: null,
      metadata: {
        fallbackAction: {
          type: "externalRedirectUrl",
          value: "https://example.com/fallback",
        },
      },
      ...overrides,
    } as RoutingFormFallbackHitWebhookTaskPayload;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockRoutingFormResponseRepository = {
      findByIdIncludeForm: vi.fn().mockResolvedValue({
        response: { "field-1": { label: "Email", value: "test@example.com" } },
        form: {
          fields: [],
          name: "Test Routing Form",
          description: null,
          userId: 5,
          teamId: 10,
        },
      }),
      findByBookingUidIncludeForm: vi.fn(),
    };
    fetcher = new FormWebhookDataFetcher(
      mockLogger as unknown as ILogger,
      mockRoutingFormResponseRepository
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for FORM_SUBMITTED", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.FORM_SUBMITTED)).toBe(true);
    });

    it("should return true for ROUTING_FORM_FALLBACK_HIT", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT)).toBe(true);
    });

    it("should return false for other trigger events", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_CREATED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.RECORDING_READY)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.OOO_CREATED)).toBe(false);
    });
  });

  describe("fetchEventData - FORM_SUBMITTED", () => {
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

  describe("fetchEventData - ROUTING_FORM_FALLBACK_HIT", () => {
    it("should fetch event data from DB via repository", async () => {
      const payload = createFallbackPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(mockRoutingFormResponseRepository.findByIdIncludeForm).toHaveBeenCalledWith(456);
      expect(result).toEqual({
        formId: "form-abc",
        formName: "Test Routing Form",
        responseId: 456,
        fallbackAction: {
          type: "externalRedirectUrl",
          value: "https://example.com/fallback",
        },
        responses: { "field-1": { label: "Email", value: "test@example.com" } },
      });
    });

    it("should include eventTypeId in fallbackAction when present", async () => {
      const payload = createFallbackPayload({
        metadata: {
          fallbackAction: {
            type: "eventTypeRedirectUrl",
            value: "team/30min",
            eventTypeId: 42,
          },
        },
      });

      const result = await fetcher.fetchEventData(payload);

      expect(result).toEqual(
        expect.objectContaining({
          fallbackAction: {
            type: "eventTypeRedirectUrl",
            value: "team/30min",
            eventTypeId: 42,
          },
        })
      );
    });

    it("should return null when formId is missing", async () => {
      const payload = createFallbackPayload({ formId: "" });

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("Missing formId or responseId for fallback hit webhook");
    });

    it("should return null when form response not found in DB", async () => {
      vi.mocked(mockRoutingFormResponseRepository.findByIdIncludeForm).mockResolvedValueOnce(null);
      const payload = createFallbackPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Form response not found for fallback hit webhook",
        expect.objectContaining({ responseId: 456, formId: "form-abc" })
      );
    });

    it("should return null when DB fetch throws an error", async () => {
      vi.mocked(mockRoutingFormResponseRepository.findByIdIncludeForm).mockRejectedValueOnce(
        new Error("DB connection error")
      );
      const payload = createFallbackPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error fetching form response for fallback hit webhook",
        expect.objectContaining({
          responseId: 456,
          formId: "form-abc",
          error: "DB connection error",
        })
      );
    });

    it("should handle fallbackAction being optional in metadata", async () => {
      const payload = createFallbackPayload({
        metadata: {},
      });

      const result = await fetcher.fetchEventData(payload);

      expect(result).toEqual({
        formId: "form-abc",
        formName: "Test Routing Form",
        responseId: 456,
        fallbackAction: undefined,
        responses: { "field-1": { label: "Email", value: "test@example.com" } },
      });
    });
  });

  describe("getSubscriberContext - FORM_SUBMITTED", () => {
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

  describe("getSubscriberContext - ROUTING_FORM_FALLBACK_HIT", () => {
    it("should extract subscriber context from payload", () => {
      const payload = createFallbackPayload({
        userId: 5,
        teamId: 10,
        orgId: 99,
        oAuthClientId: "oauth-1",
      });

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        userId: 5,
        eventTypeId: undefined,
        teamId: 10,
        orgId: 99,
        oAuthClientId: "oauth-1",
      });
    });

    it("should handle missing optional fields", () => {
      const payload = createFallbackPayload({
        userId: undefined,
        teamId: undefined,
        orgId: undefined,
      });

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        userId: undefined,
        eventTypeId: undefined,
        teamId: undefined,
        orgId: undefined,
        oAuthClientId: null,
      });
    });
  });
});
