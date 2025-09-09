import { Headers } from "node-fetch";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GoogleCalendarSubscriptionAdapter } from "./GoogleCalendarSubscription.adapter";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })),
    })),
  },
}));

vi.mock("@calcom/app-store/googlecalendar/lib/CalendarService", () => ({
  CalendarService: vi.fn().mockImplementation(() => ({
    createWatch: vi.fn(),
    stopWatch: vi.fn(),
    getEvents: vi.fn(),
  })),
}));

vi.mock("@calcom/app-store/googlecalendar/lib/CalendarAuth", () => ({
  CalendarAuth: vi.fn().mockImplementation(() => ({
    getClient: vi.fn().mockResolvedValue({
      events: {
        watch: vi.fn().mockResolvedValue({
          data: {
            id: "channel123",
            resourceId: "resource123",
            resourceUri: "https://www.googleapis.com/calendar/v3/calendars/test@example.com/events",
            expiration: "1640995200000",
          },
        }),
        list: vi.fn().mockResolvedValue({
          data: {
            items: [],
            nextSyncToken: "sync123",
          },
        }),
      },
      channels: {
        stop: vi.fn().mockResolvedValue({}),
      },
    }),
  })),
}));

vi.mock("@calcom/app-store/_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(() => ({
    getTokenObjectOrFetch: vi.fn().mockResolvedValue({
      access_token: "mock_access_token",
      refresh_token: "mock_refresh_token",
    }),
  })),
}));

describe("GoogleCalendarSubscriptionAdapter", () => {
  let adapter: GoogleCalendarSubscriptionAdapter;
  let mockCalendarService: {
    createWatch: ReturnType<typeof vi.fn>;
    stopWatch: ReturnType<typeof vi.fn>;
    getEvents: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    process.env.GOOGLE_WEBHOOK_TOKEN = "valid-token";
    process.env.GOOGLE_WEBHOOK_URL = "https://example.com/webhook";

    const { CalendarAuth } = await import("@calcom/app-store/googlecalendar/lib/CalendarAuth");
    vi.mocked(CalendarAuth).mockImplementation(() => ({
      getClient: vi.fn().mockResolvedValue({
        events: {
          watch: vi.fn().mockResolvedValue({
            data: {
              id: "channel123",
              resourceId: "resource123",
              resourceUri: "https://www.googleapis.com/calendar/v3/calendars/test@example.com/events",
              expiration: "1640995200000",
            },
          }),
          list: vi.fn().mockResolvedValue({
            data: {
              items: [],
              nextSyncToken: "sync123",
            },
          }),
        },
        channels: {
          stop: vi.fn().mockResolvedValue({}),
        },
      }),
    }));

    adapter = new GoogleCalendarSubscriptionAdapter();

    mockCalendarService = {
      createWatch: vi.fn(),
      stopWatch: vi.fn(),
      getEvents: vi.fn(),
    };

    const { CalendarService } = await import("@calcom/app-store/googlecalendar/lib/CalendarService");
    vi.mocked(CalendarService).mockImplementation(() => mockCalendarService);
  });

  describe("validate", () => {
    it("should validate webhook with correct token", async () => {
      process.env.GOOGLE_WEBHOOK_TOKEN = "valid-token";

      const headers = new Headers();
      headers.set("X-Goog-Channel-Token", "valid-token");

      const result = await adapter.validate({
        headers,
        query: new URLSearchParams(),
        body: {},
      });

      expect(result).toBe(true);
    });

    it("should reject webhook with incorrect token", async () => {
      process.env.GOOGLE_WEBHOOK_TOKEN = "valid-token";

      const headers = new Headers();
      headers.set("X-Goog-Channel-Token", "invalid-token");

      const result = await adapter.validate({
        headers,
        query: new URLSearchParams(),
        body: {},
      });

      expect(result).toBe(false);
    });

    it("should reject webhook with missing token", async () => {
      process.env.GOOGLE_WEBHOOK_TOKEN = "valid-token";

      const headers = new Headers();

      const result = await adapter.validate({
        headers,
        query: new URLSearchParams(),
        body: {},
      });

      expect(result).toBe(false);
    });

    it("should reject webhook when environment token is not set", async () => {
      delete process.env.GOOGLE_WEBHOOK_TOKEN;

      const headers = new Headers();
      headers.set("X-Goog-Channel-Token", "any-token");

      const result = await adapter.validate({
        headers,
        query: new URLSearchParams(),
        body: {},
      });

      expect(result).toBe(false);
    });
  });

  describe("extractChannelId", () => {
    it("should extract channel ID from headers", async () => {
      const headers = new Headers();
      headers.set("X-Goog-Channel-ID", "channel123");

      const result = await adapter.extractChannelId({
        headers,
        query: new URLSearchParams(),
        body: {},
      });

      expect(result).toBe("channel123");
    });

    it("should return null when channel ID header is missing", async () => {
      const headers = new Headers();

      const result = await adapter.extractChannelId({
        headers,
        query: new URLSearchParams(),
        body: {},
      });

      expect(result).toBeNull();
    });
  });

  describe("subscribe", () => {
    it("should successfully subscribe to calendar events", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        channelId: null,
        channelResourceId: null,
        lastSyncToken: null,
      };

      const credential = {
        id: 456,
        type: "google_calendar",
        key: {
          access_token: "access_token_123",
          refresh_token: "refresh_token_123",
        },
        userId: 123,
        teamId: null,
        appId: "google-calendar",
        invalid: false,
        delegatedToId: null,
      };

      const result = await adapter.subscribe(selectedCalendar, credential);

      expect(result).toEqual({
        provider: "google",
        id: "channel123",
        resourceId: "resource123",
        resourceUri: "https://www.googleapis.com/calendar/v3/calendars/test@example.com/events",
        expiration: new Date(1640995200000),
      });
    });

    it("should throw error when createWatch fails", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        channelId: null,
        channelResourceId: null,
        lastSyncToken: null,
      };

      const credential = {
        id: 456,
        type: "google_calendar",
        key: {
          access_token: "access_token_123",
          refresh_token: "refresh_token_123",
        },
        userId: 123,
        teamId: null,
        appId: "google-calendar",
        invalid: false,
        delegatedToId: null,
      };

      const { CalendarAuth } = await import("@calcom/app-store/googlecalendar/lib/CalendarAuth");
      vi.mocked(CalendarAuth).mockImplementation(() => ({
        getClient: vi.fn().mockRejectedValue(new Error("API Error")),
      }));

      await expect(adapter.subscribe(selectedCalendar, credential)).rejects.toThrow("API Error");
    });
  });

  describe("unsubscribe", () => {
    it("should successfully unsubscribe from calendar events", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        channelId: "channel123",
        channelResourceId: "resource123",
        lastSyncToken: null,
      };

      const credential = {
        id: 456,
        type: "google_calendar",
        key: {
          access_token: "access_token_123",
          refresh_token: "refresh_token_123",
        },
        userId: 123,
        teamId: null,
        appId: "google-calendar",
        invalid: false,
        delegatedToId: null,
      };

      await adapter.unsubscribe(selectedCalendar, credential);
    });

    it("should handle stopWatch errors gracefully", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        channelId: "channel123",
        channelResourceId: "resource123",
        lastSyncToken: null,
      };

      const credential = {
        id: 456,
        type: "google_calendar",
        key: {
          access_token: "access_token_123",
          refresh_token: "refresh_token_123",
        },
        userId: 123,
        teamId: null,
        appId: "google-calendar",
        invalid: false,
        delegatedToId: null,
      };

      const { CalendarAuth } = await import("@calcom/app-store/googlecalendar/lib/CalendarAuth");
      vi.mocked(CalendarAuth).mockImplementation(() => ({
        getClient: vi.fn().mockRejectedValue(new Error("Stop watch failed")),
      }));

      await expect(adapter.unsubscribe(selectedCalendar, credential)).rejects.toThrow("Stop watch failed");
    });
  });

  describe("fetchEvents", () => {
    it("should fetch events with sync token", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        channelId: "channel123",
        channelResourceId: "resource123",
        lastSyncToken: "previous-sync-token",
      };

      const credential = {
        id: 456,
        type: "google_calendar",
        key: {
          access_token: "access_token_123",
          refresh_token: "refresh_token_123",
        },
        userId: 123,
        teamId: null,
        appId: "google-calendar",
        invalid: false,
        delegatedToId: null,
      };

      const result = await adapter.fetchEvents(selectedCalendar, credential);

      expect(result.provider).toBe("google");
      expect(result.syncToken).toBe("sync123");
      expect(result.items).toHaveLength(0);
    });

    it("should fetch events without sync token", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        channelId: null,
        channelResourceId: null,
        lastSyncToken: null,
      };

      const credential = {
        id: 456,
        type: "google_calendar",
        key: {
          access_token: "access_token_123",
          refresh_token: "refresh_token_123",
        },
        userId: 123,
        teamId: null,
        appId: "google-calendar",
        invalid: false,
        delegatedToId: null,
      };

      const result = await adapter.fetchEvents(selectedCalendar, credential);

      expect(result.provider).toBe("google");
      expect(result.syncToken).toBe("sync123");
      expect(result.items).toHaveLength(0);
    });
  });

  describe("sanitizeEvents", () => {
    it("should sanitize events and filter out Cal.com events", () => {
      const pastDate = new Date("2020-01-01T10:00:00Z");
      const events = [
        {
          id: "event1",
          summary: "External Meeting",
          start: { dateTime: pastDate.toISOString() },
          end: { dateTime: pastDate.toISOString() },
          status: "confirmed",
          iCalUID: "external@example.com",
          transparency: "opaque",
        },
        {
          id: "event2",
          summary: "Cal.com Booking",
          start: { dateTime: pastDate.toISOString() },
          end: { dateTime: pastDate.toISOString() },
          status: "confirmed",
          iCalUID: "booking123@Cal.com",
          transparency: "opaque",
        },
        {
          id: "event3",
          summary: "Another External Meeting",
          start: { dateTime: pastDate.toISOString() },
          end: { dateTime: pastDate.toISOString() },
          status: "confirmed",
          iCalUID: "another@example.com",
          transparency: "opaque",
        },
      ];

      const result = adapter.sanitizeEvents(events);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("event1");
      expect(result[1].id).toBe("event3");
      expect(result.find((event) => event.id === "event2")).toBeUndefined();
    });

    it("should handle events without iCalUID", () => {
      const events = [
        {
          id: "event1",
          summary: "Meeting without iCalUID",
          start: { dateTime: "2024-01-01T10:00:00Z" },
          end: { dateTime: "2024-01-01T11:00:00Z" },
          status: "confirmed",
        },
      ];

      const result = adapter.sanitizeEvents(events);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("event1");
    });

    it("should handle empty events array", () => {
      const events: never[] = [];

      const result = adapter.sanitizeEvents(events);

      expect(result).toHaveLength(0);
    });
  });
});
