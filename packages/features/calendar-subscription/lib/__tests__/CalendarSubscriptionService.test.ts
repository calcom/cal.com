import "../__mocks__/delegationCredential";

import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  metrics: {
    count: vi.fn(),
    distribution: vi.fn(),
  },
}));

import type { AdapterFactory } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import type { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import type { CalendarSyncService } from "@calcom/features/calendar-subscription/lib/sync/CalendarSyncService";
import type { IFeatureRepository } from "@calcom/features/flags/repositories/PrismaFeatureRepository";
import type { ITeamFeatureRepository } from "@calcom/features/flags/repositories/PrismaTeamFeatureRepository";
import type { IUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
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
  syncSubscribedErrorAt: null,
  syncSubscribedErrorCount: 0,
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
  let mockFeatureRepository: IFeatureRepository;
  let mockTeamFeatureRepository: ITeamFeatureRepository;
  let mockUserFeatureRepository: IUserFeatureRepository & {
    checkIfUserHasFeature: (userId: number, slug: string) => Promise<boolean>;
  };
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
      getGenericCalendarSuffixes: vi
        .fn()
        .mockReturnValue([
          "@group.v.calendar.google.com",
          "@group.calendar.google.com",
          "@import.calendar.google.com",
          "@resource.calendar.google.com",
        ]),
    };

    mockSelectedCalendarRepository = {
      findById: vi.fn().mockResolvedValue(mockSelectedCalendar),
      findByChannelId: vi.fn().mockResolvedValue(mockSelectedCalendar),
      findNextSubscriptionBatch: vi.fn().mockResolvedValue([mockSelectedCalendar]),
      updateSyncStatus: vi.fn().mockResolvedValue(mockSelectedCalendar),
      updateSubscription: vi.fn().mockResolvedValue(mockSelectedCalendar),
    };

    mockFeatureRepository = {
      findAll: vi.fn(),
      findBySlug: vi.fn(),
      update: vi.fn(),
      checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
    };

    mockTeamFeatureRepository = {
      checkIfTeamHasFeature: vi.fn().mockResolvedValue(true),
      getTeamsWithFeatureEnabled: vi.fn().mockResolvedValue([1, 2, 3]),
    };

    mockUserFeatureRepository = {
      checkIfUserHasFeature: vi.fn().mockResolvedValue(true),
      checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(true),
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
      featureRepository: mockFeatureRepository,
      teamFeatureRepository: mockTeamFeatureRepository,
      userFeatureRepository: mockUserFeatureRepository,
      calendarCacheEventService: mockCalendarCacheEventService,
      calendarSyncService: mockCalendarSyncService,
    });

    mockSelectedCalendar.syncSubscribedErrorCount = 0;

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
        syncSubscribedErrorAt: null,
        syncSubscribedErrorCount: 0,
      });
    });

    test("should record subscribe errors and retry later", async () => {
      const subscribeError = new Error("subscribe failed");
      mockAdapter.subscribe.mockRejectedValue(subscribeError);

      await expect(service.subscribe("test-calendar-id")).rejects.toThrow(subscribeError);

      expect(mockSelectedCalendarRepository.updateSubscription).toHaveBeenCalledWith("test-calendar-id", {
        syncSubscribedAt: null,
        syncSubscribedErrorAt: expect.any(Date),
        syncSubscribedErrorCount: 1,
      });
    });

    test("should skip subscription attempts after hitting error threshold", async () => {
      mockSelectedCalendarRepository.findById.mockResolvedValue({
        ...mockSelectedCalendar,
        syncSubscribedErrorCount: CalendarSubscriptionService.MAX_SUBSCRIBE_ERRORS,
      });

      await service.subscribe("test-calendar-id");

      expect(mockAdapter.subscribe).not.toHaveBeenCalled();
      expect(mockSelectedCalendarRepository.updateSubscription).not.toHaveBeenCalled();
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
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      await service.unsubscribe("test-calendar-id");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("test-calendar-id");
      expect(mockAdapter.unsubscribe).toHaveBeenCalledWith(mockSelectedCalendar, mockCredential);
      expect(mockSelectedCalendarRepository.updateSubscription).toHaveBeenCalledWith("test-calendar-id", {
        syncSubscribedAt: null,
      });
      expect(mockCalendarCacheEventService.cleanupCache).toHaveBeenCalledWith(mockSelectedCalendar);
    });

    test("should not cleanup cache if cache is disabled", async () => {
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

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
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValue(true);

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
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValue(true);

      await service.processEvents(mockSelectedCalendar);

      expect(mockCalendarCacheEventService.handleEvents).not.toHaveBeenCalled();
      expect(mockCalendarSyncService.handleEvents).toHaveBeenCalled();
    });

    test("should not process cache when cache is disabled for user", async () => {
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValue(false);

      await service.processEvents(mockSelectedCalendar);

      expect(mockCalendarCacheEventService.handleEvents).not.toHaveBeenCalled();
      expect(mockCalendarSyncService.handleEvents).toHaveBeenCalled();
    });

    test("should return early when both cache and sync are disabled", async () => {
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await service.processEvents(mockSelectedCalendar);

      expect(mockAdapter.fetchEvents).not.toHaveBeenCalled();
      expect(mockCalendarCacheEventService.handleEvents).not.toHaveBeenCalled();
      expect(mockCalendarSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("should handle API errors and update sync status", async () => {
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValue(true);

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
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValue(true);

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

      expect(mockTeamFeatureRepository.getTeamsWithFeatureEnabled).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockSelectedCalendarRepository.findNextSubscriptionBatch).toHaveBeenCalledWith({
        take: 100,
        integrations: ["google_calendar", "office365_calendar"],
        teamIds: [1, 2, 3],
        genericCalendarSuffixes: [
          "@group.v.calendar.google.com",
          "@group.calendar.google.com",
          "@import.calendar.google.com",
          "@resource.calendar.google.com",
        ],
      });
      expect(subscribeSpy).toHaveBeenCalledWith(mockSelectedCalendar.id);
    });

    test("should handle multiple calendars returned from batch", async () => {
      const calendarWithCache = { ...mockSelectedCalendar, id: "calendar-with-cache", userId: 1 };
      const calendarWithCache2 = { ...mockSelectedCalendar, id: "calendar-with-cache-2", userId: 2 };

      mockSelectedCalendarRepository.findNextSubscriptionBatch.mockResolvedValue([
        calendarWithCache,
        calendarWithCache2,
      ]);

      const subscribeSpy = vi.spyOn(service, "subscribe").mockResolvedValue(undefined);

      await service.checkForNewSubscriptions();

      expect(mockTeamFeatureRepository.getTeamsWithFeatureEnabled).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockSelectedCalendarRepository.findNextSubscriptionBatch).toHaveBeenCalledWith({
        take: 100,
        integrations: ["google_calendar", "office365_calendar"],
        teamIds: [1, 2, 3],
        genericCalendarSuffixes: [
          "@group.v.calendar.google.com",
          "@group.calendar.google.com",
          "@import.calendar.google.com",
          "@resource.calendar.google.com",
        ],
      });
      expect(subscribeSpy).toHaveBeenCalledTimes(2);
      expect(subscribeSpy).toHaveBeenCalledWith("calendar-with-cache");
      expect(subscribeSpy).toHaveBeenCalledWith("calendar-with-cache-2");
    });

    test("should skip when cache feature is globally disabled", async () => {
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);
      const subscribeSpy = vi.spyOn(service, "subscribe").mockResolvedValue(undefined);

      await service.checkForNewSubscriptions();

      expect(mockFeatureRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockTeamFeatureRepository.getTeamsWithFeatureEnabled).not.toHaveBeenCalled();
      expect(mockSelectedCalendarRepository.findNextSubscriptionBatch).not.toHaveBeenCalled();
      expect(subscribeSpy).not.toHaveBeenCalled();
    });

    test("should not process any calendars when no calendars are returned", async () => {
      mockSelectedCalendarRepository.findNextSubscriptionBatch.mockResolvedValue([]);

      const subscribeSpy = vi.spyOn(service, "subscribe").mockResolvedValue(undefined);

      await service.checkForNewSubscriptions();

      expect(mockTeamFeatureRepository.getTeamsWithFeatureEnabled).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockSelectedCalendarRepository.findNextSubscriptionBatch).toHaveBeenCalledWith({
        take: 100,
        integrations: ["google_calendar", "office365_calendar"],
        teamIds: [1, 2, 3],
        genericCalendarSuffixes: [
          "@group.v.calendar.google.com",
          "@group.calendar.google.com",
          "@import.calendar.google.com",
          "@resource.calendar.google.com",
        ],
      });
      expect(subscribeSpy).not.toHaveBeenCalled();
    });
  });

  describe("feature flag methods", () => {
    test("isCacheEnabled should check global cache feature", async () => {
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const result = await service.isCacheEnabled();

      expect(result).toBe(true);
      expect(mockFeatureRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
    });

    test("isCacheEnabledForUser should check user cache feature", async () => {
      mockUserFeatureRepository.checkIfUserHasFeature.mockResolvedValue(true);

      const result = await service.isCacheEnabledForUser(1);

      expect(result).toBe(true);
      expect(mockUserFeatureRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
        1,
        "calendar-subscription-cache"
      );
    });

    test("isSyncEnabled should check global sync feature", async () => {
      mockFeatureRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const result = await service.isSyncEnabled();

      expect(result).toBe(true);
      expect(mockFeatureRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-sync"
      );
    });
  });
});
