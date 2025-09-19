import "../__mocks__/CalendarAuth";

import { describe, test, expect, vi, beforeEach } from "vitest";

import type { SelectedCalendar } from "@calcom/prisma/client";

import { GoogleCalendarSubscriptionAdapter } from "../GoogleCalendarSubscription.adapter";

vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("test-uuid"),
}));

const mockSelectedCalendar: SelectedCalendar = {
  id: "test-calendar-id",
  userId: 1,
  credentialId: 1,
  integration: "google_calendar",
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

const mockCredential = {
  id: 1,
  key: { access_token: "test-token" },
  user: { email: "test@example.com" },
  delegatedTo: null,
};

describe("GoogleCalendarSubscriptionAdapter", () => {
  let adapter: GoogleCalendarSubscriptionAdapter;
  let mockClient: {
    events: {
      watch: ReturnType<typeof vi.fn>;
      list: ReturnType<typeof vi.fn>;
    };
    channels: {
      stop: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    process.env.GOOGLE_WEBHOOK_TOKEN = "test-webhook-token";
    process.env.GOOGLE_WEBHOOK_URL = "https://example.com";

    mockClient = {
      events: {
        watch: vi.fn(),
        list: vi.fn(),
      },
      channels: {
        stop: vi.fn(),
      },
    };

    const { CalendarAuth } = await import("../__mocks__/CalendarAuth");
    vi.mocked(CalendarAuth).mockImplementation(() => ({
      getClient: vi.fn().mockResolvedValue(mockClient),
    }));

    adapter = new GoogleCalendarSubscriptionAdapter();
    vi.clearAllMocks();
  });

  describe("validate", () => {
    test("should validate webhook with correct token", async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue("test-webhook-token"),
        },
      } as Request;

      const result = await adapter.validate(mockRequest);

      expect(result).toBe(true);
      expect(mockRequest.headers.get).toHaveBeenCalledWith("X-Goog-Channel-Token");
    });

    test("should reject webhook with incorrect token", async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue("wrong-token"),
        },
      } as Request;

      const result = await adapter.validate(mockRequest);

      expect(result).toBe(false);
    });

    test("should reject webhook when token is not configured", async () => {
      delete process.env.GOOGLE_WEBHOOK_TOKEN;
      adapter = new GoogleCalendarSubscriptionAdapter();

      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue("test-webhook-token"),
        },
      } as Request;

      const result = await adapter.validate(mockRequest);

      expect(result).toBe(false);
    });

    test("should reject webhook with missing token header", async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as Request;

      const result = await adapter.validate(mockRequest);

      expect(result).toBe(false);
    });
  });

  describe("extractChannelId", () => {
    test("should extract channel ID from webhook headers", async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue("test-channel-id"),
        },
      } as Request;

      const result = await adapter.extractChannelId(mockRequest);

      expect(result).toBe("test-channel-id");
      expect(mockRequest.headers.get).toHaveBeenCalledWith("X-Goog-Channel-ID");
    });

    test("should return null when channel ID is missing", async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as Request;

      const result = await adapter.extractChannelId(mockRequest);

      expect(result).toBeNull();
    });
  });

  describe("subscribe", () => {
    test("should successfully subscribe to calendar", async () => {
      const mockWatchResponse = {
        data: {
          id: "test-channel-id",
          resourceId: "test-resource-id",
          resourceUri: "test-resource-uri",
          expiration: "1640995200000",
        },
      };

      mockClient.events.watch.mockResolvedValue(mockWatchResponse);

      const result = await adapter.subscribe(mockSelectedCalendar, mockCredential);

      expect(mockClient.events.watch).toHaveBeenCalledWith({
        calendarId: "test@example.com",
        requestBody: {
          id: "test-uuid",
          type: "web_hook",
          address: "https://example.com/api/webhooks/calendar-subscription/google_calendar",
          token: "test-webhook-token",
          params: {
            ttl: "2592000",
          },
        },
      });

      expect(result).toEqual({
        provider: "google_calendar",
        id: "test-channel-id",
        resourceId: "test-resource-id",
        resourceUri: "test-resource-uri",
        expiration: new Date(1640995200000),
      });
    });

    test("should handle expiration as ISO string", async () => {
      const mockWatchResponse = {
        data: {
          id: "test-channel-id",
          resourceId: "test-resource-id",
          resourceUri: "test-resource-uri",
          expiration: "2023-12-01T10:00:00Z",
        },
      };

      mockClient.events.watch.mockResolvedValue(mockWatchResponse);

      const result = await adapter.subscribe(mockSelectedCalendar, mockCredential);

      expect(result.expiration).toEqual(new Date("2023-12-01T10:00:00Z"));
    });

    test("should handle missing expiration", async () => {
      const mockWatchResponse = {
        data: {
          id: "test-channel-id",
          resourceId: "test-resource-id",
          resourceUri: "test-resource-uri",
        },
      };

      mockClient.events.watch.mockResolvedValue(mockWatchResponse);

      const result = await adapter.subscribe(mockSelectedCalendar, mockCredential);

      expect(result.expiration).toBeNull();
    });
  });

  describe("unsubscribe", () => {
    test("should successfully unsubscribe from calendar", async () => {
      mockClient.channels.stop.mockResolvedValue({});

      await adapter.unsubscribe(mockSelectedCalendar, mockCredential);

      expect(mockClient.channels.stop).toHaveBeenCalledWith({
        requestBody: {
          resourceId: "test-resource-id",
        },
      });
    });

    test("should handle unsubscribe errors", async () => {
      const error = new Error("Unsubscribe failed");
      mockClient.channels.stop.mockRejectedValue(error);

      await expect(adapter.unsubscribe(mockSelectedCalendar, mockCredential)).rejects.toThrow(
        "Unsubscribe failed"
      );
    });
  });

  describe("fetchEvents", () => {
    test("should fetch events with sync token", async () => {
      const mockEventsResponse = {
        data: {
          nextSyncToken: "new-sync-token",
          items: [
            {
              id: "event-1",
              iCalUID: "event-1@cal.com",
              summary: "Test Event",
              description: "Test Description",
              location: "Test Location",
              start: {
                dateTime: "2023-12-01T10:00:00Z",
                timeZone: "UTC",
              },
              end: {
                dateTime: "2023-12-01T11:00:00Z",
              },
              status: "confirmed",
              transparency: "opaque",
              kind: "calendar#event",
              etag: "test-etag",
              created: "2023-12-01T09:00:00Z",
              updated: "2023-12-01T09:30:00Z",
            },
          ],
        },
      };

      mockClient.events.list.mockResolvedValue(mockEventsResponse);

      const result = await adapter.fetchEvents(mockSelectedCalendar, mockCredential);

      expect(mockClient.events.list).toHaveBeenCalledWith({
        calendarId: "test@example.com",
        pageToken: undefined,
        singleEvents: true,
        syncToken: "test-sync-token",
      });

      expect(result).toEqual({
        provider: "google_calendar",
        syncToken: "new-sync-token",
        items: [
          {
            id: "event-1",
            iCalUID: "event-1@cal.com",
            start: new Date("2023-12-01T10:00:00Z"),
            end: new Date("2023-12-01T11:00:00Z"),
            busy: true,
            summary: "Test Event",
            description: "Test Description",
            location: "Test Location",
            kind: "calendar#event",
            etag: "test-etag",
            status: "confirmed",
            isAllDay: undefined,
            timeZone: "UTC",
            recurringEventId: undefined,
            originalStartTime: undefined,
            createdAt: new Date("2023-12-01T09:00:00Z"),
            updatedAt: new Date("2023-12-01T09:30:00Z"),
          },
        ],
      });
    });

    test("should fetch events without sync token (initial sync)", async () => {
      const calendarWithoutSyncToken = {
        ...mockSelectedCalendar,
        syncToken: null,
      };

      const mockEventsResponse = {
        data: {
          nextSyncToken: "initial-sync-token",
          items: [],
        },
      };

      mockClient.events.list.mockResolvedValue(mockEventsResponse);

      const result = await adapter.fetchEvents(calendarWithoutSyncToken, mockCredential);

      expect(mockClient.events.list).toHaveBeenCalledWith({
        calendarId: "test@example.com",
        pageToken: undefined,
        singleEvents: true,
        timeMin: expect.any(String),
        timeMax: expect.any(String),
      });

      expect(result.syncToken).toBe("initial-sync-token");
    });

    test("should handle all-day events", async () => {
      const mockEventsResponse = {
        data: {
          nextSyncToken: "new-sync-token",
          items: [
            {
              id: "event-1",
              iCalUID: "event-1@cal.com",
              summary: "All Day Event",
              start: {
                date: "2023-12-01",
              },
              end: {
                date: "2023-12-02",
              },
              status: "confirmed",
              transparency: "opaque",
            },
          ],
        },
      };

      mockClient.events.list.mockResolvedValue(mockEventsResponse);

      const result = await adapter.fetchEvents(mockSelectedCalendar, mockCredential);

      expect(result.items[0].isAllDay).toBe(true);
      expect(result.items[0].start).toEqual(new Date("2023-12-01"));
      expect(result.items[0].end).toEqual(new Date("2023-12-02"));
    });

    test("should handle free events (transparent)", async () => {
      const mockEventsResponse = {
        data: {
          nextSyncToken: "new-sync-token",
          items: [
            {
              id: "event-1",
              iCalUID: "event-1@cal.com",
              summary: "Free Event",
              start: {
                dateTime: "2023-12-01T10:00:00Z",
              },
              end: {
                dateTime: "2023-12-01T11:00:00Z",
              },
              status: "confirmed",
              transparency: "transparent",
            },
          ],
        },
      };

      mockClient.events.list.mockResolvedValue(mockEventsResponse);

      const result = await adapter.fetchEvents(mockSelectedCalendar, mockCredential);

      expect(result.items[0].busy).toBe(false);
    });

    test("should handle pagination", async () => {
      const mockEventsResponse1 = {
        data: {
          nextPageToken: "page-2",
          items: [
            {
              id: "event-1",
              summary: "Event 1",
              start: { dateTime: "2023-12-01T10:00:00Z" },
              end: { dateTime: "2023-12-01T11:00:00Z" },
            },
          ],
        },
      };

      const mockEventsResponse2 = {
        data: {
          nextSyncToken: "final-sync-token",
          items: [
            {
              id: "event-2",
              summary: "Event 2",
              start: { dateTime: "2023-12-01T12:00:00Z" },
              end: { dateTime: "2023-12-01T13:00:00Z" },
            },
          ],
        },
      };

      mockClient.events.list
        .mockResolvedValueOnce(mockEventsResponse1)
        .mockResolvedValueOnce(mockEventsResponse2);

      const result = await adapter.fetchEvents(mockSelectedCalendar, mockCredential);

      expect(mockClient.events.list).toHaveBeenCalledTimes(2);
      expect(result.items).toHaveLength(2);
      expect(result.syncToken).toBe("final-sync-token");
    });

    test("should filter out events without ID", async () => {
      const mockEventsResponse = {
        data: {
          nextSyncToken: "new-sync-token",
          items: [
            {
              id: "event-1",
              summary: "Valid Event",
              start: { dateTime: "2023-12-01T10:00:00Z" },
              end: { dateTime: "2023-12-01T11:00:00Z" },
            },
            {
              summary: "Invalid Event",
              start: { dateTime: "2023-12-01T12:00:00Z" },
              end: { dateTime: "2023-12-01T13:00:00Z" },
            },
            {
              id: "",
              summary: "Empty ID Event",
              start: { dateTime: "2023-12-01T14:00:00Z" },
              end: { dateTime: "2023-12-01T15:00:00Z" },
            },
          ],
        },
      };

      mockClient.events.list.mockResolvedValue(mockEventsResponse);

      const result = await adapter.fetchEvents(mockSelectedCalendar, mockCredential);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("event-1");
    });
  });
});
