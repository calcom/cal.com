import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

import type { SelectedCalendar } from "@calcom/prisma/client";

import {
  MicrosoftGraphEvent,
  Office365CalendarSubscriptionAdapter,
} from "../Office365CalendarSubscription.adapter";

const _mockSelectedCalendar: SelectedCalendar = {
  id: "test-calendar-id",
  userId: 1,
  credentialId: 1,
  integration: "office365_calendar",
  externalId: "test@example.com",
  eventTypeId: null,
  delegationCredentialId: null,
  domainWideDelegationCredentialId: null,
  googleChannelId: null,
  googleChannelKind: null,
  googleChannelResourceId: null,
  googleChannelResourceUri: null,
  googleChannelExpiration: null,
  error: null,
  lastErrorAt: null,
  watchAttempts: 0,
  maxAttempts: 3,
  unwatchAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  channelId: "test-channel-id",
  channelKind: "web_hook",
  channelResourceId: "test-resource-id",
  channelResourceUri: "test-resource-uri",
  channelExpiration: new Date(Date.now() + 86400000),
  syncSubscribedAt: new Date(),
  syncToken: "test-sync-token",
  syncedAt: new Date(),
  syncErrorAt: null,
  syncErrorCount: 0,
};

const _mockCredential = {
  id: 1,
  userId: 1,
  delegationCredentialId: null,
  key: { access_token: "test-token" },
  type: "office365_calendar",
  teamId: null,
  appId: null,
  invalid: false,
  user: { email: "test@example.com" },
  delegatedTo: null,
};

// prevent actual logging during tests
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    }),
  },
}));

describe("Office365CalendarSubscriptionAdapter", () => {
  const mockWebhookUrl = "https://example.com/api/webhooks/calendar-subscription/office365_calendar";
  const mockWebhookToken = "test-webhook-token";

  beforeEach(() => {
    vi.stubEnv("MICROSOFT_WEBHOOK_URL", mockWebhookUrl);
    vi.stubEnv("MICROSOFT_WEBHOOK_TOKEN", mockWebhookToken);
    vi.stubEnv("NEXT_PUBLIC_WEBAPP_URL", "https://app.example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("validate", () => {
    test("returns true with valid clientState", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const req = new Request("https://example.com", {
        headers: { clientState: mockWebhookToken },
      });
      const res = await adapter.validate(req);
      expect(res).toBe(true);
    });

    test("returns false if token does not match", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const req = new Request("https://example.com", {
        headers: { clientState: "invalid" },
      });
      const res = await adapter.validate(req);
      expect(res).toBe(false);
    });

    test("returns false if MICROSOFT_WEBHOOK_TOKEN is missing", async () => {
      vi.stubEnv("MICROSOFT_WEBHOOK_TOKEN", "");
      const adapter = new Office365CalendarSubscriptionAdapter();
      const req = new Request("https://example.com");
      const res = await adapter.validate(req);
      expect(res).toBe(false);
    });
  });

  describe("extractChannelId", () => {
    test("extracts subscriptionId from body", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const req = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ subscriptionId: "abc" }),
      });
      const id = await adapter.extractChannelId(req);
      expect(id).toBe("abc");
    });

    test("extracts subscriptionId from headers", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const req = new Request("https://example.com", {
        headers: { subscriptionId: "hdr-123" },
      });
      const id = await adapter.extractChannelId(req);
      expect(id).toBe("hdr-123");
    });

    test("returns null if subscriptionId is missing", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const req = new Request("https://example.com");
      const id = await adapter.extractChannelId(req);
      expect(id).toBe(null);
    });
  });

  describe("subscribe", () => {
    test("throws error if webhook config is missing", async () => {
      vi.stubEnv("MICROSOFT_WEBHOOK_URL", "");
      const adapter = new Office365CalendarSubscriptionAdapter();
      await expect(adapter.subscribe(_mockSelectedCalendar, _mockCredential)).rejects.toThrow(
        /Webhook config missing/
      );
    });

    test("successfully subscribes to calendar events", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const mockRes = {
        id: "sub-1",
        resource: "me/calendars/test@example.com/events",
        expirationDateTime: new Date().toISOString(),
      };
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockRes });

      const res = await adapter.subscribe(_mockSelectedCalendar, _mockCredential);
      expect(res.id).toBe("sub-1");
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("unsubscribe", () => {
    test("does nothing if channelResourceId is missing", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      global.fetch = vi.fn();
      await adapter.unsubscribe({ ..._mockSelectedCalendar, channelResourceId: null }, _mockCredential);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("sends DELETE request correctly", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      await adapter.unsubscribe(_mockSelectedCalendar, _mockCredential);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/subscriptions/"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("fetchEvents", () => {
    test("uses deltaLink if syncToken exists", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const mockRes = {
        "@odata.deltaLink": "https://graph.microsoft.com/v1.0/me/calendars/.../events/delta?$token=abc",
        value: [
          {
            id: "1",
            subject: "Event",
            start: { dateTime: "2025-10-18T10:00:00Z" },
            end: { dateTime: "2025-10-18T11:00:00Z" },
          },
        ],
      };
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockRes });
      const res = await adapter.fetchEvents(_mockSelectedCalendar, _mockCredential);
      expect(res.items.length).toBe(1);
      expect(res.syncToken).toContain("$token=abc");
    });

    test("performs full sync when no syncToken is present", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const mock1 = { "@odata.nextLink": "page2", value: [{ id: "a" }] };
      const mock2 = { "@odata.deltaLink": "done", value: [{ id: "b" }] };
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mock1 })
        .mockResolvedValueOnce({ ok: true, json: async () => mock2 });

      const res = await adapter.fetchEvents({ ..._mockSelectedCalendar, syncToken: null }, _mockCredential);
      expect(res.items.length).toBe(2);
      expect(res.syncToken).toBe("done");
    });
  });

  describe("getGraphClient", () => {
    test("returns a valid accessToken", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const client = await adapter["getGraphClient"](_mockCredential);
      expect(client.accessToken).toBe("test-token");
    });

    test("throws error if access_token is missing", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const badCred = { ..._mockCredential, key: {} };
      await expect(adapter["getGraphClient"](badCred)).rejects.toThrow(/Missing Microsoft access token/);
    });
  });

  describe("request", () => {
    test("performs successful API request", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "123" }) });
      const res = await adapter["request"]({ accessToken: "tok" }, "GET", "/me/events");
      expect(res).toEqual({ id: "123" });
    });

    test("throws error when API call fails", async () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => "err",
      });
      await expect(adapter["request"]({ accessToken: "tok" }, "GET", "/me/events")).rejects.toThrow(
        /Graph 400 Bad Request/
      );
    });
  });

  describe("parseEvents", () => {
    test("parses events correctly", () => {
      const adapter = new Office365CalendarSubscriptionAdapter();
      const events: MicrosoftGraphEvent[] = [
        {
          id: "1",
          subject: "Meeting",
          bodyPreview: "desc",
          start: { dateTime: "2025-10-18T10:00:00Z", timeZone: "UTC" },
          end: { dateTime: "2025-10-18T11:00:00Z", timeZone: "UTC" },
          showAs: "busy",
        },
      ];
      const parsed = adapter["parseEvents"](events);
      expect(parsed[0].summary).toBe("Meeting");
      expect(parsed[0].busy).toBe(true);
    });
  });
});
