import { describe, it, expect, vi, beforeEach } from "vitest";

import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";

import type {
  ICalendarSubscriptionPort,
  CalendarSubscriptionWebhookContext,
} from "./CalendarSubscriptionPort.interface";
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

const mockCalendarSubscriptionPort: ICalendarSubscriptionPort = {
  validate: vi.fn(),
  extractChannelId: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  fetchEvents: vi.fn(),
  sanitizeEvents: vi.fn(),
};

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

describe("CalendarSubscriptionService", () => {
  let service: CalendarSubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new CalendarSubscriptionService({
      calendarSubscriptionPort: mockCalendarSubscriptionPort,
      selectedCalendarRepository: mockSelectedCalendarRepository,
      featuresRepository: mockFeaturesRepository,
    });
  });

  describe("subscribe", () => {
    it("should successfully subscribe to calendar events", async () => {
      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
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
      mockCalendarSubscriptionPort.subscribe = vi.fn().mockResolvedValue({
        id: "channel123",
        resourceId: "resource123",
        resourceUri: "https://example.com/resource",
        provider: "google_calendar",
      });
      mockSelectedCalendarRepository.updateById = vi.fn().mockResolvedValue(undefined);

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      vi.mocked(getCredentialForCalendarCache).mockResolvedValue({
        id: 456,
        key: { access_token: "token123" },
        userId: 123,
      });

      await service.subscribe("1");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("1");
      expect(mockCalendarSubscriptionPort.subscribe).toHaveBeenCalledWith(
        selectedCalendar,
        expect.objectContaining({
          id: 456,
          key: { access_token: "token123" },
          userId: 123,
        })
      );
      expect(mockSelectedCalendarRepository.updateById).toHaveBeenCalledWith("1", {
        channelId: "channel123",
        channelResourceId: "resource123",
        channelResourceUri: "https://example.com/resource",
        channelKind: "google_calendar",
      });
    });

    it("should return early when selected calendar not found", async () => {
      mockSelectedCalendarRepository.findById = vi.fn().mockResolvedValue(null);

      await service.subscribe("1");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("1");
      expect(mockCalendarSubscriptionPort.subscribe).not.toHaveBeenCalled();
    });

    it("should return early when credentialId is null", async () => {
      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: null,
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

      await service.subscribe("1");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("1");
      expect(mockCalendarSubscriptionPort.subscribe).not.toHaveBeenCalled();
    });
  });

  describe("unsubscribe", () => {
    it("should successfully unsubscribe from calendar events", async () => {
      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
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
      mockCalendarSubscriptionPort.unsubscribe = vi.fn().mockResolvedValue(undefined);
      mockSelectedCalendarRepository.updateById = vi.fn().mockResolvedValue(undefined);

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      vi.mocked(getCredentialForCalendarCache).mockResolvedValue({
        id: 456,
        key: { access_token: "token123" },
        userId: 123,
      });

      await service.unsubscribe("1");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("1");
      expect(mockCalendarSubscriptionPort.unsubscribe).toHaveBeenCalledWith(
        selectedCalendar,
        expect.objectContaining({
          id: 456,
          key: { access_token: "token123" },
          userId: 123,
        })
      );
      expect(mockSelectedCalendarRepository.updateById).toHaveBeenCalledWith("1", {
        cacheEnabled: false,
      });
    });

    it("should return early when selected calendar not found", async () => {
      mockSelectedCalendarRepository.findById = vi.fn().mockResolvedValue(null);

      await service.unsubscribe("1");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("1");
      expect(mockCalendarSubscriptionPort.unsubscribe).not.toHaveBeenCalled();
    });

    it("should return early when credentialId is null", async () => {
      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: null,
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

      await service.unsubscribe("1");

      expect(mockSelectedCalendarRepository.findById).toHaveBeenCalledWith("1");
      expect(mockCalendarSubscriptionPort.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe("processWebhook", () => {
    it("should successfully process webhook with valid context", async () => {
      const context: CalendarSubscriptionWebhookContext = {
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {},
      };

      mockCalendarSubscriptionPort.validate = vi.fn().mockResolvedValue(true);
      mockCalendarSubscriptionPort.extractChannelId = vi.fn().mockResolvedValue("channel123");

      const selectedCalendar = {
        id: "1",
        userId: 123,
        integration: "google_calendar",
        externalId: "calendar@example.com",
        credentialId: 456,
        cacheEnabled: true,
        lastSyncToken: null,
        lastSyncedAt: null,
        lastSyncErrorAt: null,
        syncErrorCount: 0,
        channelId: "channel123",
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
      mockSelectedCalendarRepository.updateById = vi.fn().mockResolvedValue(undefined);

      mockCalendarSubscriptionPort.fetchEvents = vi.fn().mockResolvedValue({
        provider: "google_calendar",
        syncToken: "sync123",
        items: [],
      });

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      vi.mocked(getCredentialForCalendarCache).mockResolvedValue({
        id: 456,
        key: { access_token: "token123" },
        userId: 123,
      });

      await service.processWebhook(context);

      expect(mockCalendarSubscriptionPort.validate).toHaveBeenCalledWith(context);
      expect(mockCalendarSubscriptionPort.extractChannelId).toHaveBeenCalledWith(context);
      expect(mockSelectedCalendarRepository.findByChannelId).toHaveBeenCalledWith("channel123");
    });

    it("should return early when webhook validation fails", async () => {
      const context: CalendarSubscriptionWebhookContext = {
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {},
      };

      mockCalendarSubscriptionPort.validate = vi.fn().mockResolvedValue(false);

      await service.processWebhook(context);

      expect(mockCalendarSubscriptionPort.validate).toHaveBeenCalledWith(context);
      expect(mockCalendarSubscriptionPort.extractChannelId).not.toHaveBeenCalled();
    });

    it("should return early when channel ID cannot be extracted", async () => {
      const context: CalendarSubscriptionWebhookContext = {
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {},
      };

      mockCalendarSubscriptionPort.validate = vi.fn().mockResolvedValue(true);
      mockCalendarSubscriptionPort.extractChannelId = vi.fn().mockResolvedValue(null);

      await service.processWebhook(context);

      expect(mockCalendarSubscriptionPort.validate).toHaveBeenCalledWith(context);
      expect(mockCalendarSubscriptionPort.extractChannelId).toHaveBeenCalledWith(context);
      expect(mockSelectedCalendarRepository.findByChannelId).not.toHaveBeenCalled();
    });

    it("should return early when both cache and sync features are disabled", async () => {
      const context: CalendarSubscriptionWebhookContext = {
        headers: new Headers(),
        query: new URLSearchParams(),
        body: {},
      };

      mockCalendarSubscriptionPort.validate = vi.fn().mockResolvedValue(true);
      mockCalendarSubscriptionPort.extractChannelId = vi.fn().mockResolvedValue("channel123");

      mockSelectedCalendarRepository.findByChannelId = vi.fn().mockResolvedValue(null);
      mockFeaturesRepository.checkIfFeatureIsEnabledGlobally = vi
        .fn()
        .mockResolvedValueOnce(false) // cache disabled
        .mockResolvedValueOnce(false); // sync disabled

      await service.processWebhook(context);

      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-cache"
      );
      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "calendar-subscription-sync"
      );
      expect(mockSelectedCalendarRepository.findByChannelId).toHaveBeenCalledWith("channel123");
    });
  });
});
