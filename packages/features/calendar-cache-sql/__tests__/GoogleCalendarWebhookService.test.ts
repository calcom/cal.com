import { describe, it, expect, beforeEach, vi } from "vitest";

import { GoogleCalendarWebhookService } from "../GoogleCalendarWebhookService";
import type { WebhookRequest } from "../GoogleCalendarWebhookService";

describe("GoogleCalendarWebhookService", () => {
  const mockSubscriptionRepo = {
    findByChannelId: vi.fn(),
  };

  const mockEventRepo = {
    getEventsForAvailability: vi.fn(),
  };

  const mockFeaturesRepo = {
    checkIfFeatureIsEnabledGlobally: vi.fn(),
  };

  const mockGetCredentialForCalendarCache = vi.fn();

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  };

  const mockCalendarCacheService = {
    processWebhookEvents: vi.fn(),
  };

  const dependencies = {
    subscriptionRepo: mockSubscriptionRepo,
    eventRepo: mockEventRepo,
    featuresRepo: mockFeaturesRepo,
    getCredentialForCalendarCache: mockGetCredentialForCalendarCache,
    webhookToken: "test-token",
    logger: mockLogger,
  };

  let webhookService: GoogleCalendarWebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    webhookService = new GoogleCalendarWebhookService(dependencies);

    // Mock the CalendarCacheSqlService import
    vi.doMock("../CalendarCacheSqlService", () => ({
      CalendarCacheSqlService: vi.fn().mockImplementation(() => mockCalendarCacheService),
    }));
  });

  it("should process webhook successfully", async () => {
    const request: WebhookRequest = {
      headers: {
        "x-goog-channel-token": "test-token",
        "x-goog-channel-id": "test-channel-id",
      },
    };

    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockSubscriptionRepo.findByChannelId.mockResolvedValue({
      id: "subscription-id",
      selectedCalendar: {
        credential: { id: 1 },
        integration: "google_calendar",
        externalId: "test@example.com",
      },
    });
    mockGetCredentialForCalendarCache.mockResolvedValue({
      id: 1,
      key: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        scope: "https://www.googleapis.com/auth/calendar",
        token_type: "Bearer",
        expiry_date: Date.now() + 3600000,
      },
    });

    const response = await webhookService.processWebhook(request);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("ok");
    expect(mockCalendarCacheService.processWebhookEvents).toHaveBeenCalledWith(
      "test-channel-id",
      expect.objectContaining({ id: 1 })
    );
  });

  it("should reject invalid webhook token", async () => {
    const request: WebhookRequest = {
      headers: {
        "x-goog-channel-token": "invalid-token",
        "x-goog-channel-id": "test-channel-id",
      },
    };

    const response = await webhookService.processWebhook(request);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Invalid API key");
  });

  it("should handle missing channel ID", async () => {
    const request: WebhookRequest = {
      headers: {
        "x-goog-channel-token": "test-token",
      },
    };

    const response = await webhookService.processWebhook(request);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Missing Channel ID");
  });

  it("should return ok when SQL cache write is disabled", async () => {
    const request: WebhookRequest = {
      headers: {
        "x-goog-channel-token": "test-token",
        "x-goog-channel-id": "test-channel-id",
      },
    };

    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

    const response = await webhookService.processWebhook(request);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("ok");
    expect(mockLogger.debug).toHaveBeenCalledWith("SQL cache write not enabled globally");
  });

  it("should return ok when no subscription is found", async () => {
    const request: WebhookRequest = {
      headers: {
        "x-goog-channel-token": "test-token",
        "x-goog-channel-id": "test-channel-id",
      },
    };

    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockSubscriptionRepo.findByChannelId.mockResolvedValue(null);

    const response = await webhookService.processWebhook(request);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("ok");
    expect(mockLogger.info).toHaveBeenCalledWith("No subscription found for channelId", {
      channelId: "test-channel-id",
    });
  });

  it("should return ok when subscription has no credential", async () => {
    const request: WebhookRequest = {
      headers: {
        "x-goog-channel-token": "test-token",
        "x-goog-channel-id": "test-channel-id",
      },
    };

    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockSubscriptionRepo.findByChannelId.mockResolvedValue({
      id: "subscription-id",
      selectedCalendar: {
        integration: "google_calendar",
        externalId: "test@example.com",
      },
    });

    const response = await webhookService.processWebhook(request);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("ok");
    expect(mockLogger.info).toHaveBeenCalledWith("No credential found for subscription", {
      channelId: "test-channel-id",
    });
  });

  it("should return 404 when credential is not found", async () => {
    const request: WebhookRequest = {
      headers: {
        "x-goog-channel-token": "test-token",
        "x-goog-channel-id": "test-channel-id",
      },
    };

    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockSubscriptionRepo.findByChannelId.mockResolvedValue({
      id: "subscription-id",
      selectedCalendar: {
        credential: { id: 1 },
        integration: "google_calendar",
        externalId: "test@example.com",
      },
    });
    mockGetCredentialForCalendarCache.mockResolvedValue(null);

    const response = await webhookService.processWebhook(request);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Credential not found");
  });

  it("should handle errors gracefully", async () => {
    const request: WebhookRequest = {
      headers: {
        "x-goog-channel-token": "test-token",
        "x-goog-channel-id": "test-channel-id",
      },
    };

    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockRejectedValue(new Error("Database error"));

    const response = await webhookService.processWebhook(request);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal server error");
    expect(mockLogger.error).toHaveBeenCalledWith("Google Calendar SQL webhook error:", {
      error: expect.any(Error),
    });
  });
});
