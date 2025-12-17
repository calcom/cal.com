import { describe, expect, it, vi } from "vitest";

import type { Webhook } from "@calcom/prisma/client";

import type { EventPayloadType } from "./sendPayload";
import sendPayload from "./sendPayload";

vi.mock("@calcom/lib/constants", () => ({
  __esModule: true,
  WEBAPP_URL: "https://app.cal.com",
  APP_NAME: "Cal.com",
  IS_PRODUCTION: false,
}));

describe("sendPayload", () => {
  const webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate"> = {
    subscriberUrl: "https://example.com/webhook",
    appId: null,
    payloadTemplate: null,
  };

  it("sends cal.com video link for daily meetings", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const basePerson = {
      name: "Tester",
      email: "test@example.com",
      timeZone: "UTC",
      language: { translate: (key: string) => key, locale: "en" },
    };

    const payload: EventPayloadType = {
      type: "daily-event",
      title: "Daily Call",
      startTime: "2024-01-01T00:00:00.000Z",
      endTime: "2024-01-01T00:30:00.000Z",
      organizer: basePerson,
      attendees: [basePerson],
      uid: "test-uid",
      location: "integrations:daily",
      videoCallData: {
        type: "daily_video",
        id: "meeting-id",
        url: "https://meetco.daily.co/original",
        password: "",
      },
    };

    try {
      await sendPayload(null, "BOOKING_CREATED", "2024-01-01T00:00:00.000Z", webhook, payload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse((fetchMock.mock.calls[0]?.[1]?.body as string) ?? "{}");
      expect(body.payload.videoCallData.url).toBe("https://app.cal.com/video/test-uid");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
