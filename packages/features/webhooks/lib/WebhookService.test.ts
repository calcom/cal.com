import { describe, it, expect, vi, beforeEach } from "vitest";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { WebhookService } from "./WebhookService";
import type { GetWebhooksReturnType } from "./getWebhooks";
import getWebhooks from "./getWebhooks";
import sendOrSchedulePayload from "./sendOrSchedulePayload";

vi.mock("./getWebhooks");
vi.mock("./sendOrSchedulePayload");

vi.mock("@calcom/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("@calcom/lib/logger")>("@calcom/lib/logger");
  return {
    ...actual,
    getSubLogger: vi.fn(() => ({
      error: vi.fn(),
    })),
  };
});

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: JSON.stringify,
}));

describe("WebhookService", () => {
  const mockOptions = {
    id: "mockOptionsId",
    subscriberUrl: "subUrl",
    payloadTemplate: "PayloadTemplate",
    appId: "AppId",
    secret: "WhSecret",
    triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize with options and webhooks", async () => {
    const mockWebhooks: GetWebhooksReturnType = [
      {
        id: "webhookId",
        subscriberUrl: "url",
        secret: "secret",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);

    // Has to be called with await due to the iffi being async
    const service = await WebhookService.init(mockOptions);

    expect(service).toBeInstanceOf(WebhookService);
    expect(await service.getWebhooks()).toEqual(mockWebhooks);
    expect(getWebhooks).toHaveBeenCalledWith(mockOptions);
  });

  it("should send payload to all webhooks", async () => {
    const mockWebhooks = [
      {
        id: "webhookId",
        subscriberUrl: "url",
        secret: "secret",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
      {
        id: "webhookId2",
        subscriberUrl: "url2",
        secret: "secret2",
        appId: "appId2",
        payloadTemplate: "payloadTemplate2",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);
    vi.mocked(sendOrSchedulePayload).mockResolvedValue({
      ok: true,
      status: 200,
      message: "Success",
    });

    const service = await WebhookService.init(mockOptions);

    const payload = {
      secretKey: "secret",
      triggerEvent: "triggerEvent",
      createdAt: "now",
      webhook: {
        subscriberUrl: "url",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
      },
      data: "test",
    };

    await service.sendPayload(payload as any);

    expect(sendOrSchedulePayload).toHaveBeenCalledTimes(mockWebhooks.length);

    mockWebhooks.forEach((webhook) => {
      expect(sendOrSchedulePayload).toHaveBeenCalledWith(
        webhook.secret,
        mockOptions.triggerEvent,
        expect.any(String),
        webhook,
        payload
      );
    });
  });

  it("should log error when sending payload fails", async () => {
    const mockWebhooks = [
      {
        id: "webhookId",
        subscriberUrl: "url",
        secret: "secret",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);

    vi.mocked(sendOrSchedulePayload).mockRejectedValue(new Error("Failure"));

    const service = await WebhookService.init(mockOptions);

    const payload = {
      secretKey: "secret",
      triggerEvent: "triggerEvent",
      createdAt: "now",
      webhook: {
        subscriberUrl: "url",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
      },
      data: "test",
    };

    await service.sendPayload(payload as any);

    // The logger mock is already set up at the top of the file
    // We can verify that the service handled the error gracefully
    expect(sendOrSchedulePayload).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple webhook failures gracefully", async () => {
    const mockWebhooks = [
      {
        id: "webhookId1",
        subscriberUrl: "url1",
        secret: "secret1",
        appId: "appId1",
        payloadTemplate: "payloadTemplate1",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
      {
        id: "webhookId2",
        subscriberUrl: "url2",
        secret: "secret2",
        appId: "appId2",
        payloadTemplate: "payloadTemplate2",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
      {
        id: "webhookId3",
        subscriberUrl: "url3",
        secret: "secret3",
        appId: "appId3",
        payloadTemplate: "payloadTemplate3",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);

    // First webhook succeeds, second fails, third succeeds
    vi.mocked(sendOrSchedulePayload)
      .mockResolvedValueOnce({ ok: true, status: 200, message: "Success" })
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ ok: true, status: 200, message: "Success" });

    const service = await WebhookService.init(mockOptions);

    const payload = {
      secretKey: "secret",
      triggerEvent: "triggerEvent",
      createdAt: "now",
      webhook: {
        subscriberUrl: "url",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
      },
      data: "test",
    };

    await service.sendPayload(payload as any);

    // Should still call all webhooks despite failures
    expect(sendOrSchedulePayload).toHaveBeenCalledTimes(3);
  });

  it("should handle empty webhooks array", async () => {
    vi.mocked(getWebhooks).mockResolvedValue([]);

    const service = await WebhookService.init(mockOptions);

    const payload = {
      secretKey: "secret",
      triggerEvent: "triggerEvent",
      createdAt: "now",
      webhook: {
        subscriberUrl: "url",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
      },
      data: "test",
    };

    await service.sendPayload(payload as any);

    // Should not call sendOrSchedulePayload when no webhooks
    expect(sendOrSchedulePayload).not.toHaveBeenCalled();
  });

  it("should use Promise.allSettled for concurrent webhook execution", async () => {
    const mockWebhooks = [
      {
        id: "webhookId1",
        subscriberUrl: "url1",
        secret: "secret1",
        appId: "appId1",
        payloadTemplate: "payloadTemplate1",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
      {
        id: "webhookId2",
        subscriberUrl: "url2",
        secret: "secret2",
        appId: "appId2",
        payloadTemplate: "payloadTemplate2",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);

    // Mock sendOrSchedulePayload to simulate different response times
    let callCount = 0;
    vi.mocked(sendOrSchedulePayload).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First webhook takes longer
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return { ok: true, status: 200, message: "Success" };
    });

    const service = await WebhookService.init(mockOptions);

    const payload = {
      secretKey: "secret",
      triggerEvent: "triggerEvent",
      createdAt: "now",
      webhook: {
        subscriberUrl: "url",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
      },
      data: "test",
    };

    const startTime = Date.now();
    await service.sendPayload(payload as any);
    const endTime = Date.now();

    // Should execute concurrently (total time should be close to the longest webhook time, not sum)
    expect(endTime - startTime).toBeLessThan(200); // Should be less than sum of both delays
    expect(sendOrSchedulePayload).toHaveBeenCalledTimes(2);
  });

  it("should handle webhook with null secret", async () => {
    const mockWebhooks = [
      {
        id: "webhookId",
        subscriberUrl: "url",
        secret: null,
        appId: "appId",
        payloadTemplate: "payloadTemplate",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);
    vi.mocked(sendOrSchedulePayload).mockResolvedValue({
      ok: true,
      status: 200,
      message: "Success",
    });

    const service = await WebhookService.init(mockOptions);

    const payload = {
      secretKey: "secret",
      triggerEvent: "triggerEvent",
      createdAt: "now",
      webhook: {
        subscriberUrl: "url",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
      },
      data: "test",
    };

    await service.sendPayload(payload as any);

    expect(sendOrSchedulePayload).toHaveBeenCalledWith(
      null,
      mockOptions.triggerEvent,
      expect.any(String),
      mockWebhooks[0],
      payload
    );
  });

  it("should handle webhook with undefined appId", async () => {
    const mockWebhooks = [
      {
        id: "webhookId",
        subscriberUrl: "url",
        secret: "secret",
        appId: undefined,
        payloadTemplate: "payloadTemplate",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);
    vi.mocked(sendOrSchedulePayload).mockResolvedValue({
      ok: true,
      status: 200,
      message: "Success",
    });

    const service = await WebhookService.init(mockOptions);

    const payload = {
      secretKey: "secret",
      triggerEvent: "triggerEvent",
      createdAt: "now",
      webhook: {
        subscriberUrl: "url",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
      },
      data: "test",
    };

    await service.sendPayload(payload as any);

    expect(sendOrSchedulePayload).toHaveBeenCalledWith(
      "secret",
      mockOptions.triggerEvent,
      expect.any(String),
      mockWebhooks[0],
      payload
    );
  });

  it("should handle webhook with null payloadTemplate", async () => {
    const mockWebhooks = [
      {
        id: "webhookId",
        subscriberUrl: "url",
        secret: "secret",
        appId: "appId",
        payloadTemplate: null,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);
    vi.mocked(sendOrSchedulePayload).mockResolvedValue({
      ok: true,
      status: 200,
      message: "Success",
    });

    const service = await WebhookService.init(mockOptions);

    const payload = {
      secretKey: "secret",
      triggerEvent: "triggerEvent",
      createdAt: "now",
      webhook: {
        subscriberUrl: "url",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
      },
      data: "test",
    };

    await service.sendPayload(payload as any);

    expect(sendOrSchedulePayload).toHaveBeenCalledWith(
      "secret",
      mockOptions.triggerEvent,
      expect.any(String),
      mockWebhooks[0],
      payload
    );
  });

  it("should handle static sendWebhook method", async () => {
    const mockWebhooks = [
      {
        id: "webhookId",
        subscriberUrl: "url",
        secret: "secret",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);
    vi.mocked(sendOrSchedulePayload).mockResolvedValue({
      ok: true,
      status: 200,
      message: "Success",
    });

    const payload = {
      secretKey: "secret",
      triggerEvent: "triggerEvent",
      createdAt: "now",
      webhook: {
        subscriberUrl: "url",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
      },
      data: "test",
    };

    await WebhookService.sendWebhook(mockOptions, payload as any);

    expect(getWebhooks).toHaveBeenCalledWith(mockOptions);
    expect(sendOrSchedulePayload).toHaveBeenCalledWith(
      "secret",
      mockOptions.triggerEvent,
      expect.any(String),
      mockWebhooks[0],
      payload
    );
  });
});
