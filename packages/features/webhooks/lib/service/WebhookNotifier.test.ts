import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookEventDTO } from "../dto/types";
import type { ILogger } from "../interface/infrastructure";
import type { IWebhookNotificationHandler } from "../interface/webhook";
import { WebhookNotifier } from "./WebhookNotifier";

describe("WebhookNotifier", () => {
  let mockHandler: { handleNotification: ReturnType<typeof vi.fn> };
  let mockLogger: ReturnType<typeof createMockLogger>;

  function createMockLogger() {
    const subLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn(),
    };
    subLogger.getSubLogger.mockReturnValue(subLogger);
    return {
      getSubLogger: vi.fn().mockReturnValue(subLogger),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  }

  function createDTO(overrides?: Partial<WebhookEventDTO>): WebhookEventDTO {
    return {
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      createdAt: new Date().toISOString(),
      bookingId: 1,
      eventTypeId: 10,
      ...overrides,
    } as WebhookEventDTO;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandler = { handleNotification: vi.fn().mockResolvedValue(undefined) };
    mockLogger = createMockLogger();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("emitWebhook", () => {
    it("should delegate to handler.handleNotification with dto and isDryRun", async () => {
      const notifier = new WebhookNotifier(
        mockHandler as unknown as IWebhookNotificationHandler,
        mockLogger as unknown as ILogger
      );
      const dto = createDTO();

      await notifier.emitWebhook(dto, false);

      expect(mockHandler.handleNotification).toHaveBeenCalledWith(dto, false);
    });

    it("should pass isDryRun=true through to handler", async () => {
      const notifier = new WebhookNotifier(
        mockHandler as unknown as IWebhookNotificationHandler,
        mockLogger as unknown as ILogger
      );
      const dto = createDTO();

      await notifier.emitWebhook(dto, true);

      expect(mockHandler.handleNotification).toHaveBeenCalledWith(dto, true);
    });

    it("should default isDryRun to false", async () => {
      const notifier = new WebhookNotifier(
        mockHandler as unknown as IWebhookNotificationHandler,
        mockLogger as unknown as ILogger
      );
      const dto = createDTO();

      await notifier.emitWebhook(dto);

      expect(mockHandler.handleNotification).toHaveBeenCalledWith(dto, false);
    });

    it("should log debug before and after emission", async () => {
      const notifier = new WebhookNotifier(
        mockHandler as unknown as IWebhookNotificationHandler,
        mockLogger as unknown as ILogger
      );
      const dto = createDTO({
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
      } as Partial<WebhookEventDTO>);

      await notifier.emitWebhook(dto);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Emitting webhook event: BOOKING_CANCELLED"),
        expect.objectContaining({ bookingId: 1, eventTypeId: 10 })
      );
      expect(subLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Successfully emitted webhook event: BOOKING_CANCELLED"),
        expect.objectContaining({ bookingId: 1 })
      );
    });

    it("should log error and re-throw when handler fails", async () => {
      mockHandler.handleNotification.mockRejectedValue(new Error("Handler failed"));
      const notifier = new WebhookNotifier(
        mockHandler as unknown as IWebhookNotificationHandler,
        mockLogger as unknown as ILogger
      );
      const dto = createDTO();

      await expect(notifier.emitWebhook(dto)).rejects.toThrow("Handler failed");

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to emit webhook event"),
        expect.objectContaining({ error: "Handler failed" })
      );
    });

    it("should include bookingId and eventTypeId in error log", async () => {
      mockHandler.handleNotification.mockRejectedValue(new Error("fail"));
      const notifier = new WebhookNotifier(
        mockHandler as unknown as IWebhookNotificationHandler,
        mockLogger as unknown as ILogger
      );
      const dto = createDTO({ bookingId: 42, eventTypeId: 99 } as Partial<WebhookEventDTO>);

      await expect(notifier.emitWebhook(dto)).rejects.toThrow();

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ bookingId: 42, eventTypeId: 99 })
      );
    });
  });
});
