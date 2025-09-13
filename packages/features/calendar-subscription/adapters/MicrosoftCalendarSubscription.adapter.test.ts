import { Headers } from "node-fetch";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { MicrosoftCalendarSubscriptionAdapter } from "./MicrosoftCalendarSubscription.adapter";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/app-store/office365calendar/lib/CalendarService", () => ({
  CalendarService: vi.fn().mockImplementation(() => ({
    createSubscription: vi.fn(),
    deleteSubscription: vi.fn(),
    getEvents: vi.fn(),
  })),
}));

global.fetch = vi.fn();

describe("MicrosoftCalendarSubscriptionAdapter", () => {
  let adapter: MicrosoftCalendarSubscriptionAdapter;
  let mockCalendarService: {
    createWatch: ReturnType<typeof vi.fn>;
    stopWatch: ReturnType<typeof vi.fn>;
    getEvents: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    adapter = new MicrosoftCalendarSubscriptionAdapter();

    mockCalendarService = {
      createSubscription: vi.fn(),
      deleteSubscription: vi.fn(),
      getEvents: vi.fn(),
    };

    const { CalendarService } = await import("@calcom/app-store/office365calendar/lib/CalendarService");
    vi.mocked(CalendarService).mockImplementation(() => mockCalendarService);
  });

  describe("validate", () => {
    it("should validate webhook with correct validation token", async () => {
      const query = new URLSearchParams();
      query.set("validationToken", "validation123");

      const result = await adapter.validate({
        headers: new Headers(),
        query,
        body: {},
      });

      expect(result).toBe(true);
    });

    it("should validate webhook with correct client state", async () => {
      process.env.MICROSOFT_WEBHOOK_TOKEN = "client-state-123";

      const testAdapter = new MicrosoftCalendarSubscriptionAdapter();

      const result = await testAdapter.validate({
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {
          clientState: "client-state-123",
        },
      });

      expect(result).toBe(true);
    });

    it("should reject webhook with incorrect client state", async () => {
      process.env.MICROSOFT_WEBHOOK_TOKEN = "client-state-123";

      const result = await adapter.validate({
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {
          clientState: "wrong-client-state",
        },
      });

      expect(result).toBe(false);
    });

    it("should reject webhook with missing client state", async () => {
      process.env.MICROSOFT_WEBHOOK_TOKEN = "client-state-123";

      const result = await adapter.validate({
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {},
      });

      expect(result).toBe(false);
    });

    it("should reject webhook when environment client state is not set", async () => {
      delete process.env.MICROSOFT_WEBHOOK_TOKEN;

      const result = await adapter.validate({
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {
          clientState: "any-client-state",
        },
      });

      expect(result).toBe(false);
    });
  });

  describe("extractChannelId", () => {
    it("should extract subscription ID from webhook body", async () => {
      const result = await adapter.extractChannelId({
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {
          value: [
            {
              subscriptionId: "subscription123",
            },
          ],
        },
      });

      expect(result).toBe("subscription123");
    });

    it("should return null when subscription ID is missing", async () => {
      const result = await adapter.extractChannelId({
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {
          value: [{}],
        },
      });

      expect(result).toBeNull();
    });

    it("should return null when value array is empty", async () => {
      const result = await adapter.extractChannelId({
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {
          value: [],
        },
      });

      expect(result).toBeNull();
    });

    it("should return null when body is malformed", async () => {
      const result = await adapter.extractChannelId({
        headers: new Headers(),
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
        integration: "office365_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        credential: {
          id: 456,
          key: { access_token: "token123" },
          userId: 123,
        },
      };

      const mockSubscriptionResponse = {
        id: "subscription123",
        resource: "resource123",
        expirationDateTime: "2024-01-02T00:00:00Z",
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSubscriptionResponse),
      } as Response);

      const result = await adapter.subscribe(selectedCalendar, selectedCalendar.credential);

      expect(result).toEqual({
        provider: "microsoft",
        id: "subscription123",
        resourceId: "resource123",
        resourceUri: expect.stringContaining("resource123"),
        expiration: new Date("2024-01-02T00:00:00Z"),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/subscriptions"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: expect.stringContaining("calendar@example.com"),
        })
      );
    });

    it("should throw error when createSubscription fails", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "office365_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        credential: {
          id: 456,
          key: { access_token: "token123" },
          userId: 123,
        },
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("API Error"),
      } as Response);

      await expect(adapter.subscribe(selectedCalendar, selectedCalendar.credential)).rejects.toThrow(
        "Microsoft Graph API error"
      );
    });
  });

  describe("unsubscribe", () => {
    it("should successfully unsubscribe from calendar events", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "office365_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        credential: {
          id: 456,
          key: { access_token: "token123" },
          userId: 123,
        },
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      const selectedCalendarWithChannelId = {
        ...selectedCalendar,
        channelResourceId: "subscription123",
      };

      await adapter.unsubscribe(selectedCalendarWithChannelId, selectedCalendarWithChannelId.credential);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/subscriptions/subscription123"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("should handle deleteSubscription errors gracefully", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "office365_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        credential: {
          id: 456,
          key: { access_token: "token123" },
          userId: 123,
        },
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Delete subscription failed"),
      } as Response);

      const selectedCalendarWithChannelId = {
        ...selectedCalendar,
        channelResourceId: "subscription123",
      };

      await expect(
        adapter.unsubscribe(selectedCalendarWithChannelId, selectedCalendarWithChannelId.credential)
      ).rejects.toThrow("Microsoft Graph API error");
    });
  });

  describe("fetchEvents", () => {
    it("should fetch events with delta link", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "office365_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        credential: {
          id: 456,
          key: { access_token: "token123" },
          userId: 123,
        },
      };

      const mockEvents = [
        {
          id: "event1",
          subject: "Meeting 1",
          start: { dateTime: "2024-01-01T10:00:00Z" },
          end: { dateTime: "2024-01-01T11:00:00Z" },
          isCancelled: false,
        },
      ];

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            value: mockEvents,
            "@odata.deltaLink": "delta123",
          }),
      } as Response);

      const selectedCalendarWithSyncToken = {
        ...selectedCalendar,
        lastSyncToken: "https://graph.microsoft.com/v1.0/previous-delta-link",
      };

      const result = await adapter.fetchEvents(
        selectedCalendarWithSyncToken,
        selectedCalendarWithSyncToken.credential
      );

      expect(result).toEqual({
        provider: "microsoft",
        syncToken: "delta123",
        items: expect.any(Array),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("previous-delta-link"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should fetch events without delta link", async () => {
      const selectedCalendar = {
        id: 1,
        userId: 123,
        integration: "office365_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        credential: {
          id: 456,
          key: { access_token: "token123" },
          userId: 123,
        },
      };

      const mockEvents = [
        {
          id: "event1",
          subject: "Meeting 1",
          start: { dateTime: "2024-01-01T10:00:00Z" },
          end: { dateTime: "2024-01-01T11:00:00Z" },
          isCancelled: false,
        },
      ];

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            value: mockEvents,
            "@odata.deltaLink": "delta123",
          }),
      } as Response);

      const result = await adapter.fetchEvents(selectedCalendar, selectedCalendar.credential);

      expect(result).toEqual({
        provider: "microsoft",
        syncToken: "delta123",
        items: expect.any(Array),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/events/delta"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });
  });

  describe("sanitizeEvents", () => {
    it("should sanitize events and filter out Cal.com events", () => {
      const events = [
        {
          id: "event1",
          subject: "External Meeting",
          start: { dateTime: "2024-01-01T10:00:00Z" },
          end: { dateTime: "2024-01-01T11:00:00Z" },
          isCancelled: false,
          iCalUId: "external@example.com",
        },
        {
          id: "event2",
          subject: "Cal.com Booking",
          start: { dateTime: "2024-01-01T14:00:00Z" },
          end: { dateTime: "2024-01-01T15:00:00Z" },
          isCancelled: false,
          iCalUId: "booking123@Cal.com",
        },
        {
          id: "event3",
          subject: "Another External Meeting",
          start: { dateTime: "2024-01-01T16:00:00Z" },
          end: { dateTime: "2024-01-01T17:00:00Z" },
          isCancelled: false,
          iCalUId: "another@example.com",
        },
      ];

      const result = adapter.sanitizeEvents(events);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("event1");
      expect(result[1].id).toBe("event3");
      expect(result.find((event) => event.id === "event2")).toBeUndefined();
    });

    it("should handle events without iCalUId", () => {
      const events = [
        {
          id: "event1",
          subject: "Meeting without iCalUId",
          start: { dateTime: "2024-01-01T10:00:00Z" },
          end: { dateTime: "2024-01-01T11:00:00Z" },
          isCancelled: false,
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

    it("should filter out cancelled events", () => {
      const events = [
        {
          id: "event1",
          subject: "Active Meeting",
          start: { dateTime: "2024-01-01T10:00:00Z" },
          end: { dateTime: "2024-01-01T11:00:00Z" },
          isCancelled: false,
        },
        {
          id: "event2",
          subject: "Cancelled Meeting",
          start: { dateTime: "2024-01-01T14:00:00Z" },
          end: { dateTime: "2024-01-01T15:00:00Z" },
          isCancelled: true,
        },
      ];

      const result = adapter.sanitizeEvents(events);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("event1");
    });
  });
});
