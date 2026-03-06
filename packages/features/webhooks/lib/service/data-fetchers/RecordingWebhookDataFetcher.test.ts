import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../interface/infrastructure";
import type { RecordingWebhookTaskPayload } from "../../types/webhookTask";
import { RecordingWebhookDataFetcher } from "./RecordingWebhookDataFetcher";

describe("RecordingWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let fetcher: RecordingWebhookDataFetcher;

  function createMockLogger() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    };
  }

  function createPayload(overrides?: Partial<RecordingWebhookTaskPayload>): RecordingWebhookTaskPayload {
    return {
      operationId: "op-1",
      timestamp: new Date().toISOString(),
      triggerEvent: WebhookTriggerEvents.RECORDING_READY,
      recordingId: "rec-1",
      bookingUid: "booking-uid-1",
      eventTypeId: 10,
      userId: 5,
      teamId: 3,
      oAuthClientId: null,
      ...overrides,
    } as RecordingWebhookTaskPayload;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    fetcher = new RecordingWebhookDataFetcher(mockLogger as unknown as ILogger);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for RECORDING_READY and RECORDING_TRANSCRIPTION_GENERATED", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.RECORDING_READY)).toBe(true);
      expect(fetcher.canHandle(WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED)).toBe(true);
    });

    it("should return false for non-recording triggers", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_CREATED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.FORM_SUBMITTED)).toBe(false);
    });
  });

  describe("fetchEventData", () => {
    it("should return null when recordingId is missing", async () => {
      const payload = createPayload({ recordingId: "" } as Partial<RecordingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("Missing recordingId for recording webhook");
    });

    it("should return scaffold object for valid recordingId", async () => {
      const payload = createPayload({ recordingId: "rec-99" } as Partial<RecordingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toEqual({ recordingId: "rec-99", _scaffold: true });
    });
  });

  describe("getSubscriberContext", () => {
    it("should have orgId undefined", () => {
      const payload = createPayload({
        userId: 5,
        eventTypeId: 10,
        teamId: 3,
        oAuthClientId: "oauth-1",
      } as Partial<RecordingWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.RECORDING_READY,
        userId: 5,
        eventTypeId: 10,
        teamId: 3,
        orgId: undefined,
        oAuthClientId: "oauth-1",
      });
    });
  });
});
