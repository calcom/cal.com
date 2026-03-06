import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/tasker", () => ({
  default: {
    create: vi.fn(),
  },
}));

import tasker from "@calcom/features/tasker";
import { WebhookVersion } from "./interface/IWebhookRepository";
import schedulePayload from "./schedulePayload";

describe("schedulePayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should delegate to tasker.create with serialized payload", async () => {
    vi.mocked(tasker.create).mockResolvedValue(undefined as never);

    const webhook = {
      subscriberUrl: "https://example.com/webhook",
      appId: null,
      payloadTemplate: null,
      version: WebhookVersion.V_2021_10_20,
    };

    await schedulePayload("secret-key", "BOOKING_CREATED", "2024-01-01T00:00:00Z", webhook, {
      title: "Test",
    } as never);

    expect(tasker.create).toHaveBeenCalledWith(
      "sendWebhook",
      JSON.stringify({
        secretKey: "secret-key",
        triggerEvent: "BOOKING_CREATED",
        createdAt: "2024-01-01T00:00:00Z",
        webhook,
        data: { title: "Test" },
      })
    );
  });

  it("should return ok:true with status 200", async () => {
    vi.mocked(tasker.create).mockResolvedValue(undefined as never);

    const result = await schedulePayload(
      null,
      "BOOKING_CREATED",
      "2024-01-01T00:00:00Z",
      {
        subscriberUrl: "https://example.com",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      },
      { title: "Test" } as never
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        status: 200,
      })
    );
  });

  it("should pass null secretKey through to serialized data", async () => {
    vi.mocked(tasker.create).mockResolvedValue(undefined as never);

    await schedulePayload(
      null,
      "BOOKING_CANCELLED",
      "2024-01-01T00:00:00Z",
      {
        subscriberUrl: "https://example.com",
        appId: null,
        payloadTemplate: null,
        version: WebhookVersion.V_2021_10_20,
      },
      { title: "Test" } as never
    );

    const serialized = JSON.parse(vi.mocked(tasker.create).mock.calls[0][1] as string);
    expect(serialized.secretKey).toBeNull();
  });
});
