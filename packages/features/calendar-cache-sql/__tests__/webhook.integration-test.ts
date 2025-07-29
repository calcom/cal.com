import { describe, it, expect, beforeEach, vi } from "vitest";

import { POST } from "../../../../apps/web/app/api/webhook/google-calendar-sql/route";

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn().mockImplementation((data, init) => {
      const response = new Response(JSON.stringify(data), {
        status: init?.status || 200,
        headers: { "Content-Type": "application/json" },
      });
      return response;
    }),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    calendarSubscription: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn().mockImplementation(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("@calcom/features/calendar-cache-sql/calendar-subscription.repository", () => ({
  CalendarSubscriptionRepository: vi.fn().mockImplementation(() => ({
    findByChannelId: vi.fn().mockResolvedValue({
      id: "subscription-id",
      selectedCalendar: {
        credential: { id: 1 },
        integration: "google_calendar",
        externalId: "test@example.com",
      },
    }),
  })),
}));

vi.mock("@calcom/lib/delegationCredential/server", () => ({
  getCredentialForCalendarCache: vi.fn().mockResolvedValue({
    id: 1,
    key: {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      scope: "https://www.googleapis.com/auth/calendar",
      token_type: "Bearer",
      expiry_date: Date.now() + 3600000,
    },
    delegatedTo: {
      serviceAccountKey: {
        client_email: "test@example.com",
        client_id: "mock-client-id",
        private_key: "mock-private-key",
      },
    },
  }),
}));

vi.mock("../../../packages/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn().mockResolvedValue({
    fetchAvailabilityAndSetCache: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@calcom/app-store/googlecalendar/lib/CalendarCacheService", () => ({
  CalendarCacheService: vi.fn().mockImplementation(() => ({
    fetchAvailability: vi.fn().mockResolvedValue({
      calendars: {},
      groups: {},
      kind: "calendar#freeBusy",
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  })),
}));

describe("Google Calendar SQL Webhook Integration", () => {
  beforeEach(() => {
    process.env.GOOGLE_WEBHOOK_TOKEN = "test-token";
    vi.clearAllMocks();
  });

  it("should process webhook and update events", async () => {
    const request = new Request("http://localhost/api/webhook/google-calendar-sql", {
      method: "POST",
      headers: {
        "x-goog-channel-id": "test-channel-id",
        "x-goog-channel-token": "test-token",
        "x-goog-resource-state": "sync",
      },
    });

    const params = Promise.resolve({});
    const response = await POST(request as any, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.message).toBe("ok");
  });

  it("should reject invalid webhook token", async () => {
    const request = new Request("http://localhost/api/webhook/google-calendar-sql", {
      method: "POST",
      headers: {
        "x-goog-channel-id": "test-channel-id",
        "x-goog-channel-token": "invalid-token",
        "x-goog-resource-state": "sync",
      },
    });

    const params = Promise.resolve({});
    const response = await POST(request as any, { params });
    const result = await response.json();

    expect(response.status).toBe(403);
    expect(result.message).toBe("Invalid API key");
  });

  it("should handle missing channel ID", async () => {
    const request = new Request("http://localhost/api/webhook/google-calendar-sql", {
      method: "POST",
      headers: {
        "x-goog-channel-token": "test-token",
        "x-goog-resource-state": "sync",
      },
    });

    const params = Promise.resolve({});
    const response = await POST(request as any, { params });
    const result = await response.json();

    expect(response.status).toBe(403);
    expect(result.message).toBe("Missing Channel ID");
  });
});
