import { describe, it, expect, beforeEach, vi } from "vitest";

import { POST } from "../../../../apps/web/app/api/webhook/google-calendar-sql/route";

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
  getCredentialForCalendarCache: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock("../../../packages/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn().mockResolvedValue({
    fetchAvailabilityAndSetCache: vi.fn().mockResolvedValue(undefined),
  }),
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

    const response = await POST(request as any);
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

    await expect(POST(request as any)).rejects.toThrow("Invalid API key");
  });

  it("should handle missing channel ID", async () => {
    const request = new Request("http://localhost/api/webhook/google-calendar-sql", {
      method: "POST",
      headers: {
        "x-goog-channel-token": "test-token",
        "x-goog-resource-state": "sync",
      },
    });

    await expect(POST(request as any)).rejects.toThrow("Missing Channel ID");
  });
});
