import { describe, it, expect, vi, beforeEach } from "vitest";

import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";

import { GoogleCalendarSubscriptionAdapter } from "../adapters/GoogleCalendarSubscription.adapter";
import { MicrosoftCalendarSubscriptionAdapter } from "../adapters/MicrosoftCalendarSubscription.adapter";
import type { CalendarSubscriptionWebhookContext } from "./CalendarSubscriptionPort.interface";
import { CalendarSubscriptionService } from "./CalendarSubscriptionService";

vi.mock("@calcom/lib/delegationCredential/server", () => ({
  getCredentialForCalendarCache: vi.fn(),
}));

vi.mock("./cache/CalendarCacheEventService", () => ({
  CalendarCacheEventService: vi.fn().mockImplementation(() => ({
    handleEvents: vi.fn(),
    cleanupCache: vi.fn(),
  })),
}));

vi.mock("./cache/CalendarCacheEventRepository", () => ({
  CalendarCacheEventRepository: vi.fn().mockImplementation(() => ({
    upsertMany: vi.fn(),
    deleteMany: vi.fn(),
    deleteAllBySelectedCalendarId: vi.fn(),
  })),
}));

const mockSelectedCalendarRepository: SelectedCalendarRepository = {
  findById: vi.fn(),
  findByChannelId: vi.fn(),
  updateById: vi.fn(),
  findByExternalId: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
};

const mockFeaturesRepository: FeaturesRepository = {
  checkIfFeatureIsEnabledGlobally: vi.fn(),
  checkIfUserHasFeature: vi.fn(),
  checkIfTeamHasFeature: vi.fn(),
  checkIfOrgHasFeature: vi.fn(),
};

describe("Calendar Subscription Integration Tests", () => {
  let calendarSubscriptionService: CalendarSubscriptionService;
  let googleAdapter: GoogleCalendarSubscriptionAdapter;
  let microsoftAdapter: MicrosoftCalendarSubscriptionAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    googleAdapter = new GoogleCalendarSubscriptionAdapter();
    microsoftAdapter = new MicrosoftCalendarSubscriptionAdapter();
  });

  describe("Google Calendar Integration", () => {
    beforeEach(() => {
      calendarSubscriptionService = new CalendarSubscriptionService({
        calendarSubscriptionPort: googleAdapter,
        selectedCalendarRepository: mockSelectedCalendarRepository,
        featuresRepository: mockFeaturesRepository,
      });
    });

    it("should handle complete Google webhook flow", async () => {
      const context: CalendarSubscriptionWebhookContext = {
        headers: new Headers({
          "x-goog-channel-id": "test-channel-123",
          "x-goog-channel-token": "test-token",
        }),
        query: new URLSearchParams(),
        body: {},
      };

      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "test@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: "test-channel-123",
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSelectedCalendarRepository.findByChannelId = vi.fn().mockResolvedValue(selectedCalendar);
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally = vi
        .fn()
        .mockResolvedValueOnce(true) // cache enabled
        .mockResolvedValueOnce(false); // sync disabled

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      vi.mocked(getCredentialForCalendarCache).mockResolvedValue({
        id: 456,
        key: { access_token: "token123" },
        userId: 123,
      });

      vi.spyOn(googleAdapter, "validate").mockResolvedValue(true);
      vi.spyOn(googleAdapter, "extractChannelId").mockResolvedValue("test-channel-123");
      vi.spyOn(googleAdapter, "fetchEvents").mockResolvedValue({
        provider: "google_calendar",
        syncToken: "sync123",
        items: [],
      });

      await calendarSubscriptionService.processWebhook(context);

      expect(mockSelectedCalendarRepository.findByChannelId).toHaveBeenCalledWith("test-channel-123");
      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-sync"
      );
    });

    it("should handle Google subscription creation flow", async () => {
      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "test@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: null,
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSelectedCalendarRepository.findById = vi.fn().mockResolvedValue(selectedCalendar);
      mockSelectedCalendarRepository.updateById = vi.fn().mockResolvedValue(undefined);

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      vi.mocked(getCredentialForCalendarCache).mockResolvedValue({
        id: 456,
        key: { access_token: "token123" },
        userId: 123,
      });

      vi.spyOn(googleAdapter, "subscribe").mockResolvedValue({
        id: "channel123",
        resourceId: "resource123",
        resourceUri: "https://example.com/resource",
        provider: "google_calendar",
      });

      await calendarSubscriptionService.subscribe("1");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("1");
      expect(mockSelectedCalendarRepository.updateById).toHaveBeenCalledWith("1", expect.any(Object));
    });
  });

  describe("Microsoft Calendar Integration", () => {
    beforeEach(() => {
      calendarSubscriptionService = new CalendarSubscriptionService({
        calendarSubscriptionPort: microsoftAdapter,
        selectedCalendarRepository: mockSelectedCalendarRepository,
        featuresRepository: mockFeaturesRepository,
      });
    });

    it("should handle complete Microsoft webhook flow", async () => {
      const context: CalendarSubscriptionWebhookContext = {
        headers: new Headers({
          "content-type": "application/json",
        }),
        query: new URLSearchParams(),
        body: {
          validationToken: "test-validation-token",
          clientState: "test-client-state",
        },
      };

      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "office365_calendar",
        externalId: "test@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: "test-subscription-123",
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSelectedCalendarRepository.findByChannelId = vi.fn().mockResolvedValue(selectedCalendar);
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally = vi
        .fn()
        .mockResolvedValueOnce(true) // cache enabled
        .mockResolvedValueOnce(false); // sync disabled

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      vi.mocked(getCredentialForCalendarCache).mockResolvedValue({
        id: 456,
        key: { access_token: "token123" },
        userId: 123,
      });

      vi.spyOn(microsoftAdapter, "validate").mockResolvedValue(true);
      vi.spyOn(microsoftAdapter, "extractChannelId").mockResolvedValue("test-subscription-123");
      vi.spyOn(microsoftAdapter, "fetchEvents").mockResolvedValue({
        provider: "office365_calendar",
        syncToken: "sync123",
        items: [],
      });

      await calendarSubscriptionService.processWebhook(context);

      expect(mockSelectedCalendarRepository.findByChannelId).toHaveBeenCalledWith("test-subscription-123");
      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-sync"
      );
    });

    it("should handle Microsoft subscription creation flow", async () => {
      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "office365_calendar",
        externalId: "test@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: null,
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSelectedCalendarRepository.findById = vi.fn().mockResolvedValue(selectedCalendar);
      mockSelectedCalendarRepository.updateById = vi.fn().mockResolvedValue(undefined);

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      vi.mocked(getCredentialForCalendarCache).mockResolvedValue({
        id: 456,
        key: { access_token: "token123" },
        userId: 123,
      });

      vi.spyOn(microsoftAdapter, "subscribe").mockResolvedValue({
        id: "subscription123",
        resourceId: "resource123",
        resourceUri: "https://graph.microsoft.com/v1.0/me/events",
        provider: "office365_calendar",
      });

      await calendarSubscriptionService.subscribe("1");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("1");
      expect(mockSelectedCalendarRepository.updateById).toHaveBeenCalledWith("1", expect.any(Object));
    });
  });

  describe("Feature Flag Integration", () => {
    beforeEach(() => {
      calendarSubscriptionService = new CalendarSubscriptionService({
        calendarSubscriptionPort: googleAdapter,
        selectedCalendarRepository: mockSelectedCalendarRepository,
        featuresRepository: mockFeaturesRepository,
      });
    });

    it("should respect feature flags when processing webhooks", async () => {
      const context: CalendarSubscriptionWebhookContext = {
        headers: new Headers({
          "x-goog-channel-id": "test-channel-123",
          "x-goog-channel-token": "test-token",
        }),
        query: new URLSearchParams(),
        body: {},
      };

      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "test@example.com",
        credentialId: 456,
        cacheEnabled: false, // Cache disabled at calendar level
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: "test-channel-123",
        channelResourceId: null,
        channelResourceUri: null,
        channelKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSelectedCalendarRepository.findByChannelId = vi.fn().mockResolvedValue(selectedCalendar);
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally = vi
        .fn()
        .mockResolvedValueOnce(true) // cache enabled globally
        .mockResolvedValueOnce(true); // sync enabled globally

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      vi.mocked(getCredentialForCalendarCache).mockResolvedValue({
        id: 456,
        key: { access_token: "token123" },
        userId: 123,
      });

      vi.spyOn(googleAdapter, "validate").mockResolvedValue(true);
      vi.spyOn(googleAdapter, "extractChannelId").mockResolvedValue("test-channel-123");
      vi.spyOn(googleAdapter, "fetchEvents").mockResolvedValue({
        provider: "google_calendar",
        syncToken: "sync123",
        items: [],
      });

      await calendarSubscriptionService.processWebhook(context);

      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-sync"
      );
    });
  });
});
