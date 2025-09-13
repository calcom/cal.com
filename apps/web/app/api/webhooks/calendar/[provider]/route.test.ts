import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { POST } from "./route";

vi.mock("@calcom/features/calendar-subscription/adapters/GoogleCalendarSubscription.adapter", () => ({
  GoogleCalendarSubscriptionAdapter: vi.fn().mockImplementation(() => ({
    validate: vi.fn(),
    extractChannelId: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    fetchEvents: vi.fn(),
    sanitizeEvents: vi.fn(),
  })),
}));

vi.mock("@calcom/features/calendar-subscription/adapters/MicrosoftCalendarSubscription.adapter", () => ({
  MicrosoftCalendarSubscriptionAdapter: vi.fn().mockImplementation(() => ({
    validate: vi.fn(),
    extractChannelId: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    fetchEvents: vi.fn(),
    sanitizeEvents: vi.fn(),
  })),
}));

vi.mock("@calcom/features/calendar-subscription/lib/CalendarSubscriptionService", () => ({
  CalendarSubscriptionService: vi.fn().mockImplementation(() => ({
    processWebhook: vi.fn(),
  })),
}));

vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn(),
}));

vi.mock("@calcom/lib/server/repository/SelectedCalendarRepository", () => ({
  SelectedCalendarRepository: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

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

describe("/api/webhooks/calendar/[provider]/route", () => {
  let mockCalendarSubscriptionService: {
    processWebhook: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { CalendarSubscriptionService } = await import(
      "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService"
    );
    mockCalendarSubscriptionService = {
      processWebhook: vi.fn(),
    };
    vi.mocked(CalendarSubscriptionService).mockImplementation(() => mockCalendarSubscriptionService);
  });

  describe("POST", () => {
    it("should successfully process Google webhook", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/calendar/google", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-channel-id": "channel123",
          "x-goog-channel-token": "token123",
        },
        body: JSON.stringify({ events: [] }),
      });

      const context = {
        params: Promise.resolve({ provider: ["google"] }),
      };

      mockCalendarSubscriptionService.processWebhook.mockResolvedValue(undefined);

      const response = await POST(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({ message: "Webhook processed" });
      expect(mockCalendarSubscriptionService.processWebhook).toHaveBeenCalledWith({
        headers: request.headers,
        query: expect.any(URLSearchParams),
        body: { events: [] },
      });
    });

    it("should successfully process Microsoft webhook", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/calendar/microsoft", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          value: [
            {
              subscriptionId: "subscription123",
              clientState: "client-state-123",
            },
          ],
        }),
      });

      const context = {
        params: Promise.resolve({ provider: ["microsoft"] }),
      };

      mockCalendarSubscriptionService.processWebhook.mockResolvedValue(undefined);

      const response = await POST(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({ message: "Webhook processed" });
      expect(mockCalendarSubscriptionService.processWebhook).toHaveBeenCalledWith({
        headers: request.headers,
        query: expect.any(URLSearchParams),
        body: {
          value: [
            {
              subscriptionId: "subscription123",
              clientState: "client-state-123",
            },
          ],
        },
      });
    });

    it("should return 400 for unsupported provider", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/calendar/unsupported", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const context = {
        params: Promise.resolve({ provider: ["unsupported"] }),
      };

      const response = await POST(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({ message: "Unsupported provider" });
      expect(mockCalendarSubscriptionService.processWebhook).not.toHaveBeenCalled();
    });

    it("should return 500 when CalendarSubscriptionService throws error", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/calendar/google", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-channel-id": "channel123",
          "x-goog-channel-token": "token123",
        },
        body: JSON.stringify({ events: [] }),
      });

      const context = {
        params: Promise.resolve({ provider: ["google"] }),
      };

      const error = new Error("Processing failed");
      mockCalendarSubscriptionService.processWebhook.mockRejectedValue(error);

      const response = await POST(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({ message: "Processing failed" });
    });

    it("should return 500 with generic message for unknown error", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/calendar/google", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-channel-id": "channel123",
          "x-goog-channel-token": "token123",
        },
        body: JSON.stringify({ events: [] }),
      });

      const context = {
        params: Promise.resolve({ provider: ["google"] }),
      };

      mockCalendarSubscriptionService.processWebhook.mockRejectedValue("Unknown error");

      const response = await POST(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({ message: "Unknown error" });
    });

    it("should handle malformed JSON in request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/calendar/google", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-channel-id": "channel123",
          "x-goog-channel-token": "token123",
        },
        body: "invalid json",
      });

      const context = {
        params: Promise.resolve({ provider: ["google"] }),
      };

      const response = await POST(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.message).toContain("Unexpected token");
    });
  });
});
