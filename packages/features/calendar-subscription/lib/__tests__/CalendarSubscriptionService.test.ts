import "../__mocks__/delegationCredential";

import { describe, test, expect, vi, beforeEach } from "vitest";

import type { AdapterFactory } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import type { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import type { CalendarSyncService } from "@calcom/features/calendar-subscription/lib/sync/CalendarSyncService";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { ISelectedCalendarRepository } from "@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository.interface";
import type { SelectedCalendar } from "@calcom/prisma/client";

import { CalendarSubscriptionService } from "../CalendarSubscriptionService";

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

const mockSubscriptionResult = {
  provider: "google_calendar" as const,
  id: "test-channel-id",
  resourceId: "test-resource-id",
  resourceUri: "test-resource-uri",
  expiration: new Date(Date.now() + 86400000),
};

const mockEvents = {
  provider: "google_calendar" as const,
  syncToken: "new-sync-token",
  items: [
    {
      id: "event-1",
      iCalUID: "event-1@cal.com",
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      busy: true,
      summary: "Test Event",
      description: "Test Description",
      location: "Test Location",
      status: "confirmed",
      isAllDay: false,
      timeZone: "UTC",
      recurringEventId: null,
      originalStartDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      etag: "test-etag",
      kind: "calendar#event",
    },
  ],
};

describe("CalendarSubscriptionService", () => {
  let service: CalendarSubscriptionService;
  let mockAdapterFactory: AdapterFactory;
  let mockSelectedCalendarRepository: ISelectedCalendarRepository;
  let mockFeaturesRepository: FeaturesRepository;
  let mockCalendarCacheEventService: CalendarCacheEventService;
  let mockCalendarSyncService: CalendarSyncService;
  let mockAdapter: {
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    validate: ReturnType<typeof vi.fn>;
    extractChannelId: ReturnType<typeof vi.fn>;
    fetchEvents: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAdapter = {
      subscribe: vi.fn().mockResolvedValue(mockSubscriptionResult),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      validate: vi.fn().mockResolvedValue(true),
      extractChannelId: vi.fn().mockResolvedValue("test-channel-id"),
      fetchEvents: vi.fn().mockResolvedValue(mockEvents),
    };

    mockAdapterFactory = {
      get: vi.fn().mockReturnValue(mockAdapter),
      getProviders: vi.fn().mockReturnValue(["google_calendar", "office365_calendar"]),
    };

    mockSelectedCalendarRepository = {
      findById: vi.fn().mockResolvedValue(mockSelectedCalendar),
      findByChannelId: vi.fn().mockResolvedValue(mockSelectedCalendar),
      findNextSubscriptionBatch: vi.fn().mockResolvedValue([mockSelectedCalendar]),
      updateSyncStatus: vi.fn().mockResolvedValue(mockSelectedCalendar),
      updateSubscription: vi.fn().mockResolvedValue(mockSelectedCalendar),
    };

    mockFeaturesRepository = {
      checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
      checkIfUserHasFeature: vi.fn().mockResolvedValue(true),
      checkIfTeamHasFeature: vi.fn().mockResolvedValue(true),
      getTeamsWithFeatureEnabled: vi.fn().mockResolvedValue([1, 2, 3]),
    };

    mockCalendarCacheEventService = {
      handleEvents: vi.fn().mockResolvedValue(undefined),
      cleanupCache: vi.fn().mockResolvedValue(undefined),
      cleanupStaleCache: vi.fn().mockResolvedValue(undefined),
    };

    mockCalendarSyncService = {
      handleEvents: vi.fn().mockResolvedValue(undefined),
    };

    service = new CalendarSubscriptionService({
      adapterFactory: mockAdapterFactory,
      selectedCalendarRepository: mockSelectedCalendarRepository,
      featuresRepository: mockFeaturesRepository,
      calendarCacheEventService: mockCalendarCacheEventService,
      calendarSyncService: mockCalendarSyncService,
    });

    const { getCredentialForSelectedCalendar } = await import("../__mocks__/delegationCredential");
    getCredentialForSelectedCalendar.mockResolvedValue(mockCredential);
  });

  describe("subscribe", () => {
    test("should successfully subscribe to a calendar", async () => {
      await service.subscribe("test-calendar-id");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("test-calendar-id");
      expect(mockAdapterFactory.get).toHaveBeenCalledWith("google_calendar");
      expect(mockAdapter.subscribe).toHaveBeenCalledWith(mockSelectedCalendar, mockCredential);
      expect(mockSelectedCalendarRepository.updateSubscription).toHaveBeenCalledWith("test-calendar-id", {
        channelId: "test-channel-id",
        channelResourceId: "test-resource-id",
        channelResourceUri: "test-resource-uri",
        channelKind: "google_calendar",
        channelExpiration: mockSubscriptionResult.expiration,
        syncSubscribedAt: expect.any(Date),
      });
    });

    test("should return early if selected calendar not found", async () => {
      mockSelectedCalendarRepository.findById.mockResolvedValue(null);

      await service.subscribe("non-existent-id");

      expect(mockAdapter.subscribe).not.toHaveBeenCalled();
      expect(mockSelectedCalendarRepository.updateSubscription).not.toHaveBeenCalled();
    });

    test("should return early if selected calendar has no credentialId or delegationCredentialId", async () => {
      mockSelectedCalendarRepository.findById.mockResolvedValue({
        ...mockSelectedCalendar,
        credentialId: null,
        delegationCredentialId: null,
      });

      await service.subscribe("test-calendar-id");

      expect(mockAdapter.subscribe).not.toHaveBeenCalled();
      expect(mockSelectedCalendarRepository.updateSubscription).not.toHaveBeenCalled();
    });
  });

  describe("unsubscribe", () => {
    test("should successfully unsubscribe from a calendar", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      await service.unsubscribe("test-calendar-id");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("test-calendar-id");
      expect(mockAdapter.unsubscribe).toHaveBeenCalledWith(mockSelectedCalendar, mockCredential);
      expect(mockSelectedCalendarRepository.updateSubscription).toHaveBeenCalledWith("test-calendar-id", {
        syncSubscribedAt: null,
      });
      expect(mockCalendarCacheEventService.cleanupCache).toHaveBeenCalledWith(mockSelectedCalendar);
    });

    test("should not cleanup cache if cache is disabled", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      await service.unsubscribe("test-calendar-id");

      expect(mockCalendarCacheEventService.cleanupCache).not.toHaveBeenCalled();
    });

    test("should return early if selected calendar not found", async () => {
      mockSelectedCalendarRepository.findById.mockResolvedValue(null);

      await service.unsubscribe("non-existent-id");

      expect(mockAdapter.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe("processWebhook", () => {
    test("should successfully process a valid webhook", async () => {
      const mockRequest = new Request("http://example.com");

      await service.processWebhook("google_calendar", mockRequest);

      expect(mockAdapter.validate).toHaveBeenCalledWith(mockRequest);
      expect(mockAdapter.extractChannelId).toHaveBeenCalledWith(mockRequest);
      expect(mockSelectedCalendarRepository.findByChannelId).toHaveBeenCalledWith("test-channel-id");
    });

    test("should throw error for invalid webhook", async () => {
      const mockRequest = new Request("http://example.com");
      mockAdapter.validate.mockResolvedValue(false);

      await expect(service.processWebhook("google_calendar", mockRequest)).rejects.toThrow(
        "Invalid webhook request"
      );
    });

    test("should throw error for missing channel ID", async () => {
      const mockRequest = new Request("http://example.com");
      mockAdapter.extractChannelId.mockResolvedValue(null);

      await expect(service.processWebhook("google_calendar", mockRequest)).rejects.toThrow(
        "Missing channel ID in webhook"
      );
    });

    test("should return null for old subscription", async () => {
      const mockRequest = new Request("http://example.com");
      mockSelectedCalendarRepository.findByChannelId.mockResolvedValue(null);

      const _result = await service.processWebhook("google_calendar", mockRequest);

      expect(_result).toBeNull();
    });
  });

  describe("processEvents", () => {
    test("should process events when both cache and sync are enabled", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockFeaturesRepository.checkIfUserHasFeature.mockResolvedValue(true);

      await service.processEvents(mockSelectedCalendar);

      expect(mockAdapter.fetchEvents).toHaveBeenCalledWith(mockSelectedCalendar, mockCredential);
      expect(mockSelectedCalendarRepository.updateSyncStatus).toHaveBeenCalledWith(mockSelectedCalendar.id, {
        syncToken: "new-sync-token",
        syncedAt: expect.any(Date),
        syncErrorAt: null,
        syncErrorCount: 0,
      });
      expect(mockCalendarCacheEventService.handleEvents).toHaveBeenCalledWith(
        mockSelectedCalendar,
        mockEvents.items
      );
      expect(mockCalendarSyncService.handleEvents).toHaveBeenCalledWith(
        mockSelectedCalendar,
        mockEvents.items
      );
    });

    test("should not process cache when cache is disabled globally", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      mockFeaturesRepository.checkIfUserHasFeature.mockResolvedValue(true);

      await service.processEvents(mockSelectedCalendar);

      expect(mockCalendarCacheEventService.handleEvents).not.toHaveBeenCalled();
      expect(mockCalendarSyncService.handleEvents).toHaveBeenCalled();
    });

    test("should not process cache when cache is disabled for user", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockFeaturesRepository.checkIfUserHasFeature.mockResolvedValue(false);

      await service.processEvents(mockSelectedCalendar);

      expect(mockCalendarCacheEventService.handleEvents).not.toHaveBeenCalled();
      expect(mockCalendarSyncService.handleEvents).toHaveBeenCalled();
    });

    test("should return early when both cache and sync are disabled", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await service.processEvents(mockSelectedCalendar);

      expect(mockAdapter.fetchEvents).not.toHaveBeenCalled();
      expect(mockCalendarCacheEventService.handleEvents).not.toHaveBeenCalled();
      expect(mockCalendarSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("should handle API errors and update sync status", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockFeaturesRepository.checkIfUserHasFeature.mockResolvedValue(true);

      const apiError = new Error("API Error");
      mockAdapter.fetchEvents.mockRejectedValue(apiError);

      await expect(service.processEvents(mockSelectedCalendar)).rejects.toThrow("API Error");

      expect(mockSelectedCalendarRepository.updateSyncStatus).toHaveBeenCalledWith(mockSelectedCalendar.id, {
        syncErrorAt: expect.any(Date),
        syncErrorCount: {
          increment: 1,
        },
      });
    });

    test("should return early when no events are fetched", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockFeaturesRepository.checkIfUserHasFeature.mockResolvedValue(true);

      mockAdapter.fetchEvents.mockResolvedValue({
        ...mockEvents,
        items: [],
      });

      await service.processEvents(mockSelectedCalendar);

      expect(mockCalendarCacheEventService.handleEvents).not.toHaveBeenCalled();
      expect(mockCalendarSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("should return early when selected calendar has no credentialId or delegationCredentialId", async () => {
      const calendarWithoutCredential = {
        ...mockSelectedCalendar,
        credentialId: null,
        delegationCredentialId: null,
      };

      await service.processEvents(calendarWithoutCredential);

      expect(mockAdapter.fetchEvents).not.toHaveBeenCalled();
    });
  });

  describe("checkForNewSubscriptions", () => {
    test("should process new subscriptions", async () => {
      const subscribeSpy = vi.spyOn(service, "subscribe").mockResolvedValue(undefined);

      await service.checkForNewSubscriptions();

      expect(mockFeaturesRepository.getTeamsWithFeatureEnabled).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockSelectedCalendarRepository.findNextSubscriptionBatch).toHaveBeenCalledWith({
        take: 100,
        integrations: ["google_calendar", "office365_calendar"],
        teamIds: [1, 2, 3],
      });
      expect(subscribeSpy).toHaveBeenCalledWith(mockSelectedCalendar.id);
    });

    test("should handle mixed cache scenario where some teams have cache enabled and some do not", async () => {
      const calendarWithCache = { ...mockSelectedCalendar, id: "calendar-with-cache", userId: 1 };
      const calendarWithCache2 = { ...mockSelectedCalendar, id: "calendar-with-cache-2", userId: 2 };

      mockFeaturesRepository.getTeamsWithFeatureEnabled.mockResolvedValue([10, 20]);

      mockSelectedCalendarRepository.findNextSubscriptionBatch.mockResolvedValue([
        calendarWithCache,
        calendarWithCache2,
      ]);

      const subscribeSpy = vi.spyOn(service, "subscribe").mockResolvedValue(undefined);

      await service.checkForNewSubscriptions();

      expect(mockFeaturesRepository.getTeamsWithFeatureEnabled).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockSelectedCalendarRepository.findNextSubscriptionBatch).toHaveBeenCalledWith({
        take: 100,
        integrations: ["google_calendar", "office365_calendar"],
        teamIds: [10, 20],
      });
      expect(subscribeSpy).toHaveBeenCalledTimes(2);
      expect(subscribeSpy).toHaveBeenCalledWith("calendar-with-cache");
      expect(subscribeSpy).toHaveBeenCalledWith("calendar-with-cache-2");
    });

    test("should only fetch calendars for teams with feature enabled, not entire organization hierarchy", async () => {
      const teamId = 100;
      const parentOrgId = 1;

      mockFeaturesRepository.getTeamsWithFeatureEnabled.mockResolvedValue([teamId]);

      const calendarForTeamMember = { ...mockSelectedCalendar, id: "team-member-calendar", userId: 5 };
      mockSelectedCalendarRepository.findNextSubscriptionBatch.mockResolvedValue([calendarForTeamMember]);

      const subscribeSpy = vi.spyOn(service, "subscribe").mockResolvedValue(undefined);

      await service.checkForNewSubscriptions();

      expect(mockFeaturesRepository.getTeamsWithFeatureEnabled).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockSelectedCalendarRepository.findNextSubscriptionBatch).toHaveBeenCalledWith({
        take: 100,
        integrations: ["google_calendar", "office365_calendar"],
        teamIds: [teamId],
      });
      expect(mockSelectedCalendarRepository.findNextSubscriptionBatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          teamIds: expect.arrayContaining([parentOrgId]),
        })
      );
      expect(subscribeSpy).toHaveBeenCalledTimes(1);
      expect(subscribeSpy).toHaveBeenCalledWith("team-member-calendar");
    });

    test("should not process any calendars when no teams have the feature enabled", async () => {
      mockFeaturesRepository.getTeamsWithFeatureEnabled.mockResolvedValue([]);

      mockSelectedCalendarRepository.findNextSubscriptionBatch.mockResolvedValue([]);

      const subscribeSpy = vi.spyOn(service, "subscribe").mockResolvedValue(undefined);

      await service.checkForNewSubscriptions();

      expect(mockFeaturesRepository.getTeamsWithFeatureEnabled).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockSelectedCalendarRepository.findNextSubscriptionBatch).toHaveBeenCalledWith({
        take: 100,
        integrations: ["google_calendar", "office365_calendar"],
        teamIds: [],
      });
      expect(subscribeSpy).not.toHaveBeenCalled();
    });
  });

  describe("feature flag methods", () => {
    test("isCacheEnabled should check global cache feature", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const result = await service.isCacheEnabled();

      expect(result).toBe(true);
      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
    });

    test("isCacheEnabledForUser should check user cache feature", async () => {
      mockFeaturesRepository.checkIfUserHasFeature.mockResolvedValue(true);

      const result = await service.isCacheEnabledForUser(1);

      expect(result).toBe(true);
      expect(mockFeaturesRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
        1,
        "calendar-subscription-cache"
      );
    });

    test("isSyncEnabled should check global sync feature", async () => {
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const result = await service.isSyncEnabled();

      expect(result).toBe(true);
      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-sync"
      );
    });
  });
});
