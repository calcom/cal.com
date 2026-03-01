import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload", () => ({
  default: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@calcom/features/webhooks/lib/sendPayload", () => ({
  isEventPayload: vi.fn().mockReturnValue(true),
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: vi.fn((v: unknown) => JSON.stringify(v)),
}));

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: vi.fn((fn: (...args: never[]) => unknown) => fn),
}));

vi.mock("@calcom/lib/tracing/factory", () => ({
  distributedTracing: {
    createSpan: vi.fn().mockReturnValue({}),
    getTracingLogger: vi.fn().mockReturnValue({
      error: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
    }),
  },
}));

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { handleWebhookTrigger } from "./handleWebhookTrigger";

describe("handleWebhookTrigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches webhooks using subscriber options", async () => {
    vi.mocked(getWebhooks).mockResolvedValue([]);

    await handleWebhookTrigger({
      subscriberOptions: {
        userId: 1,
        eventTypeId: 10,
        triggerEvent: "BOOKING_CREATED" as never,
      },
      eventTrigger: "BOOKING_CREATED",
      webhookData: { type: "test" } as never,
      traceContext: {},
    });

    expect(getWebhooks).toHaveBeenCalledWith({
      userId: 1,
      eventTypeId: 10,
      triggerEvent: "BOOKING_CREATED",
    });
  });

  it("sends payload to each subscriber", async () => {
    vi.mocked(getWebhooks).mockResolvedValue([
      { id: "wh-1", subscriberUrl: "https://example.com/hook1", secret: "secret1" },
      { id: "wh-2", subscriberUrl: "https://example.com/hook2", secret: null },
    ] as never);

    await handleWebhookTrigger({
      subscriberOptions: {
        userId: 1,
        eventTypeId: 10,
        triggerEvent: "BOOKING_CREATED" as never,
      },
      eventTrigger: "BOOKING_CREATED",
      webhookData: { bookingId: 1 } as never,
      traceContext: {},
    });

    expect(sendPayload).toHaveBeenCalledTimes(2);
  });

  it("does not send payloads in dry run mode", async () => {
    vi.mocked(getWebhooks).mockResolvedValue([
      { id: "wh-1", subscriberUrl: "https://example.com/hook1", secret: "s" },
    ] as never);

    await handleWebhookTrigger({
      subscriberOptions: {
        userId: 1,
        eventTypeId: 10,
        triggerEvent: "BOOKING_CREATED" as never,
      },
      eventTrigger: "BOOKING_CREATED",
      webhookData: { bookingId: 1 } as never,
      isDryRun: true,
      traceContext: {},
    });

    expect(sendPayload).not.toHaveBeenCalled();
  });

  it("handles errors gracefully without throwing", async () => {
    vi.mocked(getWebhooks).mockRejectedValue(new Error("DB connection failed"));

    await expect(
      handleWebhookTrigger({
        subscriberOptions: {
          userId: 1,
          eventTypeId: 10,
          triggerEvent: "BOOKING_CREATED" as never,
        },
        eventTrigger: "BOOKING_CREATED",
        webhookData: { bookingId: 1 } as never,
        traceContext: {},
      })
    ).resolves.not.toThrow();
  });

  it("handles individual subscriber failures gracefully", async () => {
    vi.mocked(getWebhooks).mockResolvedValue([
      { id: "wh-1", subscriberUrl: "https://example.com/hook1", secret: "s" },
    ] as never);
    vi.mocked(sendPayload).mockRejectedValue(new Error("Connection refused"));

    await expect(
      handleWebhookTrigger({
        subscriberOptions: {
          userId: 1,
          eventTypeId: 10,
          triggerEvent: "BOOKING_CREATED" as never,
        },
        eventTrigger: "BOOKING_CREATED",
        webhookData: { bookingId: 1, uid: "test-uid" } as never,
        traceContext: {},
      })
    ).resolves.not.toThrow();
  });
});
