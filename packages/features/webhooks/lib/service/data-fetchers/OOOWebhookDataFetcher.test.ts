import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../interface/infrastructure";
import type { OOOWebhookTaskPayload } from "../../types/webhookTask";
import { OOOWebhookDataFetcher } from "./OOOWebhookDataFetcher";

describe("OOOWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let fetcher: OOOWebhookDataFetcher;

  function createMockLogger() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    };
  }

  function createPayload(overrides?: Partial<OOOWebhookTaskPayload>): OOOWebhookTaskPayload {
    return {
      operationId: "op-1",
      timestamp: new Date().toISOString(),
      triggerEvent: WebhookTriggerEvents.OOO_CREATED,
      oooEntryId: 42,
      userId: 5,
      teamId: 3,
      oAuthClientId: null,
      ...overrides,
    } as OOOWebhookTaskPayload;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    fetcher = new OOOWebhookDataFetcher(mockLogger as unknown as ILogger);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for OOO_CREATED only", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.OOO_CREATED)).toBe(true);
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_CREATED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.FORM_SUBMITTED)).toBe(false);
    });
  });

  describe("fetchEventData", () => {
    it("should return null when oooEntryId is missing", async () => {
      const payload = createPayload({ oooEntryId: 0 } as Partial<OOOWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("Missing oooEntryId for OOO webhook");
    });

    it("should return scaffold object for valid oooEntryId", async () => {
      const payload = createPayload({ oooEntryId: 99 } as Partial<OOOWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toEqual({ oooEntryId: 99, _scaffold: true });
    });

    it("should log debug about scaffold phase", async () => {
      const payload = createPayload({ oooEntryId: 99 } as Partial<OOOWebhookTaskPayload>);

      await fetcher.fetchEventData(payload);

      expect(mockLogger.debug).toHaveBeenCalledWith("OOO data fetch not implemented yet (Phase 0 scaffold)", {
        oooEntryId: 99,
      });
    });
  });

  describe("getSubscriberContext", () => {
    it("should map fields with eventTypeId and orgId undefined", () => {
      const payload = createPayload({
        userId: 5,
        teamId: 3,
        oAuthClientId: "oauth-1",
      } as Partial<OOOWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        userId: 5,
        eventTypeId: undefined,
        teamId: 3,
        orgId: undefined,
        oAuthClientId: "oauth-1",
      });
    });
  });
});
