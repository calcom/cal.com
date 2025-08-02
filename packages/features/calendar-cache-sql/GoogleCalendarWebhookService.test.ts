import { describe, it, expect, beforeEach, vi } from "vitest";

import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";
import { GoogleCalendarWebhookService } from "./GoogleCalendarWebhookService";

class MockCalendarSubscriptionRepository implements ICalendarSubscriptionRepository {
  findByChannelId = vi.fn();
  findBySelectedCalendar = vi.fn();
  findByCredentialId = vi.fn();
  findBySelectedCalendarIds = vi.fn();
  upsert = vi.fn();
  upsertMany = vi.fn();
  updateSyncToken = vi.fn();
  updateWatchDetails = vi.fn();
  getSubscriptionsToWatch = vi.fn();
  setWatchError = vi.fn();
  clearWatchError = vi.fn();
}

class MockCalendarEventRepository implements ICalendarEventRepository {
  getEventsForAvailability = vi.fn();
  getEventsForAvailabilityBatch = vi.fn();
  upsertEvent = vi.fn();
  deleteEvent = vi.fn();
  bulkUpsertEvents = vi.fn();
  cleanupOldEvents = vi.fn();
}

class MockCalendarCacheService {
  processWebhookEvents = vi.fn();
  getAvailability = vi.fn();
}

describe("GoogleCalendarWebhookService", () => {
  const mockSubscriptionRepo = new MockCalendarSubscriptionRepository();
  const mockEventRepo = new MockCalendarEventRepository();
  const mockCalendarCacheService = new MockCalendarCacheService();
  const mockGetCredentialForCalendarCache = vi.fn();

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  };

  const dependencies = {
    subscriptionRepo: mockSubscriptionRepo,
    eventRepo: mockEventRepo,
    calendarCacheService: mockCalendarCacheService as any,
    getCredentialForCalendarCache: mockGetCredentialForCalendarCache,
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
    const channelId = "test-channel-id";

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

    const response = await webhookService.processWebhook(channelId);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("ok");
    expect(mockCalendarCacheService.processWebhookEvents).toHaveBeenCalledWith(
      "test-channel-id",
      expect.objectContaining({ id: 1 })
    );
  });

  it("should return ok when no subscription is found", async () => {
    const channelId = "test-channel-id";

    mockSubscriptionRepo.findByChannelId.mockResolvedValue(null);

    const response = await webhookService.processWebhook(channelId);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("ok");
    expect(mockLogger.info).toHaveBeenCalledWith("No subscription found for channelId", {
      channelId: "test-channel-id",
    });
  });

  it("should return ok when subscription has no credential", async () => {
    const channelId = "test-channel-id";

    mockSubscriptionRepo.findByChannelId.mockResolvedValue({
      id: "subscription-id",
      selectedCalendar: {
        integration: "google_calendar",
        externalId: "test@example.com",
      },
    });

    const response = await webhookService.processWebhook(channelId);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("ok");
    expect(mockLogger.info).toHaveBeenCalledWith("No credential found for subscription", {
      channelId: "test-channel-id",
    });
  });

  it("should return 404 when credential is not found", async () => {
    const channelId = "test-channel-id";

    mockSubscriptionRepo.findByChannelId.mockResolvedValue({
      id: "subscription-id",
      selectedCalendar: {
        credential: { id: 1 },
        integration: "google_calendar",
        externalId: "test@example.com",
      },
    });
    mockGetCredentialForCalendarCache.mockResolvedValue(null);

    const response = await webhookService.processWebhook(channelId);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Credential not found");
  });

  it("should handle errors gracefully", async () => {
    const channelId = "test-channel-id";

    mockSubscriptionRepo.findByChannelId.mockRejectedValue(new Error("Database error"));

    const response = await webhookService.processWebhook(channelId);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal server error");
    expect(mockLogger.error).toHaveBeenCalledWith("Google Calendar SQL webhook error:", {
      error: expect.any(Error),
    });
  });
});
