/**
 * Integration tests for CalendarSubscriptionService sync restrictions.
 *
 * These tests wire up the real CalendarSubscriptionService with fake adapters
 * and repositories to verify the end-to-end behavior of sync gating:
 *
 *  - Sync only runs via webhook trigger
 *  - Sync never runs via cron (subscribe / syncById)
 *  - Sync never runs on non-incremental fetches (token expired / first subscribe)
 *  - Cache runs regardless of trigger source
 */
import "../__mocks__/delegationCredential";

import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  metrics: { count: vi.fn(), distribution: vi.fn() },
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeSelectedCalendar = (overrides: Partial<SelectedCalendar> = {}): SelectedCalendar => ({
  id: "cal-1",
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
  channelId: "ch-1",
  channelKind: "web_hook",
  channelResourceId: "res-1",
  channelResourceUri: "uri-1",
  channelExpiration: new Date(Date.now() + 86400000),
  syncSubscribedAt: new Date(),
  syncSubscribedErrorAt: null,
  syncSubscribedErrorCount: 0,
  syncToken: "existing-token",
  syncedAt: new Date(),
  syncErrorAt: null,
  syncErrorCount: 0,
  ...overrides,
});

const makeIncrementalEvents = () => ({
  provider: "google_calendar" as const,
  syncToken: "new-token",
  isIncrementalSync: true,
  items: [
    {
      id: "evt-1",
      iCalUID: "evt-1@cal.com",
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      busy: true,
      summary: "Meeting",
      description: null,
      location: null,
      status: "confirmed",
      isAllDay: false,
      timeZone: "UTC",
      recurringEventId: null,
      originalStartDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      etag: "etag-1",
      kind: "calendar#event",
    },
  ],
});

const makeFullSyncEvents = () => ({
  ...makeIncrementalEvents(),
  isIncrementalSync: false,
});

// ---------------------------------------------------------------------------
// Helper to build a wired-up service with spy-able deps
// ---------------------------------------------------------------------------

function createServiceWithDeps() {
  const adapter = {
    subscribe: vi.fn().mockResolvedValue({
      provider: "google_calendar",
      id: "ch-1",
      resourceId: "res-1",
      resourceUri: "uri-1",
      expiration: new Date(Date.now() + 86400000),
    }),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    validate: vi.fn().mockResolvedValue(true),
    extractChannelId: vi.fn().mockResolvedValue("ch-1"),
    fetchEvents: vi.fn().mockResolvedValue(makeIncrementalEvents()),
  };

  const adapterFactory: AdapterFactory = {
    get: vi.fn().mockReturnValue(adapter),
    getProviders: vi.fn().mockReturnValue(["google_calendar"]),
    getGenericCalendarSuffixes: vi.fn().mockReturnValue([]),
  };

  const selectedCalendarRepository: ISelectedCalendarRepository = {
    findById: vi.fn().mockResolvedValue(makeSelectedCalendar()),
    findByChannelId: vi.fn().mockResolvedValue(makeSelectedCalendar()),
    findNextSubscriptionBatch: vi.fn().mockResolvedValue([makeSelectedCalendar()]),
    updateSyncStatus: vi.fn().mockResolvedValue(makeSelectedCalendar()),
    updateSubscription: vi.fn().mockResolvedValue(makeSelectedCalendar()),
  };

  const featureRepository: IFeatureRepository = {
    findAll: vi.fn(),
    findBySlug: vi.fn(),
    update: vi.fn(),
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
  };

  const teamFeatureRepository: ITeamFeatureRepository = {
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(true),
    getTeamsWithFeatureEnabled: vi.fn().mockResolvedValue([1]),
  };

  const userFeatureRepository: IUserFeatureRepository & {
    checkIfUserHasFeature: (userId: number, slug: string) => Promise<boolean>;
  } = {
    checkIfUserHasFeature: vi.fn().mockResolvedValue(true),
    checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(true),
  };

  const calendarCacheEventService: CalendarCacheEventService = {
    handleEvents: vi.fn().mockResolvedValue(undefined),
    cleanupCache: vi.fn().mockResolvedValue(undefined),
    cleanupStaleCache: vi.fn().mockResolvedValue(undefined),
  };

  const calendarSyncService: CalendarSyncService = {
    handleEvents: vi.fn().mockResolvedValue(undefined),
  };

  const service = new CalendarSubscriptionService({
    adapterFactory,
    selectedCalendarRepository,
    featureRepository,
    teamFeatureRepository,
    userFeatureRepository,
    calendarCacheEventService,
    calendarSyncService,
  });

  return {
    service,
    adapter,
    calendarCacheEventService,
    calendarSyncService,
    selectedCalendarRepository,
    featureRepository,
    userFeatureRepository,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CalendarSubscriptionService — sync restriction integration", () => {
  let deps: ReturnType<typeof createServiceWithDeps>;

  beforeEach(async () => {
    deps = createServiceWithDeps();
    const { getCredentialForSelectedCalendar } = await import("../__mocks__/delegationCredential");
    getCredentialForSelectedCalendar.mockResolvedValue({
      id: 1,
      key: { access_token: "tok" },
      user: { email: "test@example.com" },
      delegatedTo: null,
    });
  });

  // -----------------------------------------------------------------------
  // Webhook path — sync SHOULD run
  // -----------------------------------------------------------------------

  describe("webhook → processWebhook → processEvents", () => {
    test("incremental webhook triggers both cache and sync", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      const request = new Request("http://localhost", { method: "POST" });
      await deps.service.processWebhook("google_calendar", request);

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).toHaveBeenCalledTimes(1);
    });

    test("webhook with expired token (non-incremental) triggers cache but NOT sync", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeFullSyncEvents());

      const request = new Request("http://localhost", { method: "POST" });
      await deps.service.processWebhook("google_calendar", request);

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Cron path (subscribe) — sync MUST NOT run
  // -----------------------------------------------------------------------

  describe("cron → subscribe → processEvents", () => {
    test("subscribe triggers cache but NEVER sync", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      await deps.service.subscribe("cal-1");

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("subscribe with first-time full sync triggers cache but NEVER sync", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeFullSyncEvents());

      await deps.service.subscribe("cal-1");

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Cron path (syncById) — sync MUST NOT run
  // -----------------------------------------------------------------------

  describe("cron → syncById → processEvents", () => {
    test("syncById triggers cache but NEVER sync", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      await deps.service.syncById("cal-1");

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Both cache and sync enabled — trigger determines sync behavior
  // -----------------------------------------------------------------------

  describe("both cache and sync enabled", () => {
    test("webhook incremental: cache YES, sync YES", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      const request = new Request("http://localhost", { method: "POST" });
      await deps.service.processWebhook("google_calendar", request);

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).toHaveBeenCalledTimes(1);
    });

    test("webhook non-incremental: cache YES, sync NO", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeFullSyncEvents());

      const request = new Request("http://localhost", { method: "POST" });
      await deps.service.processWebhook("google_calendar", request);

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("cron subscribe incremental: cache YES, sync NO", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      await deps.service.subscribe("cal-1");

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("cron syncById incremental: cache YES, sync NO", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      await deps.service.syncById("cal-1");

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Feature flag combinations
  // -----------------------------------------------------------------------

  describe("feature flag combinations", () => {
    test("webhook with sync disabled globally does NOT run sync", async () => {
      deps.featureRepository.checkIfFeatureIsEnabledGlobally = vi.fn().mockImplementation((slug: string) => {
        if (slug === "calendar-subscription-sync") return Promise.resolve(false);
        return Promise.resolve(true);
      });

      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      const request = new Request("http://localhost", { method: "POST" });
      await deps.service.processWebhook("google_calendar", request);

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("webhook with sync disabled for user does NOT run sync", async () => {
      deps.userFeatureRepository.checkIfUserHasFeature = vi.fn().mockImplementation((_userId, slug) => {
        if (slug === "calendar-subscription-sync") return Promise.resolve(false);
        return Promise.resolve(true);
      });

      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      const request = new Request("http://localhost", { method: "POST" });
      await deps.service.processWebhook("google_calendar", request);

      expect(deps.calendarCacheEventService.handleEvents).toHaveBeenCalledTimes(1);
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("cron skips fetch entirely when only sync is enabled (no cache)", async () => {
      deps.featureRepository.checkIfFeatureIsEnabledGlobally = vi.fn().mockResolvedValue(true);
      deps.userFeatureRepository.checkIfUserHasFeature = vi.fn().mockImplementation((_userId, slug) => {
        if (slug === "calendar-subscription-cache") return Promise.resolve(false);
        return Promise.resolve(true);
      });

      await deps.service.syncById("cal-1");

      expect(deps.adapter.fetchEvents).not.toHaveBeenCalled();
      expect(deps.calendarCacheEventService.handleEvents).not.toHaveBeenCalled();
      expect(deps.calendarSyncService.handleEvents).not.toHaveBeenCalled();
    });

    test("webhook with only sync enabled (no cache) fetches and syncs", async () => {
      deps.featureRepository.checkIfFeatureIsEnabledGlobally = vi.fn().mockResolvedValue(true);
      deps.userFeatureRepository.checkIfUserHasFeature = vi.fn().mockImplementation((_userId, slug) => {
        if (slug === "calendar-subscription-cache") return Promise.resolve(false);
        return Promise.resolve(true);
      });

      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      const request = new Request("http://localhost", { method: "POST" });
      await deps.service.processWebhook("google_calendar", request);

      expect(deps.adapter.fetchEvents).toHaveBeenCalled();
      expect(deps.calendarCacheEventService.handleEvents).not.toHaveBeenCalled();
      expect(deps.calendarSyncService.handleEvents).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // syncToken is always saved regardless of trigger
  // -----------------------------------------------------------------------

  describe("syncToken persistence", () => {
    test("syncToken is saved after webhook processing", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      const request = new Request("http://localhost", { method: "POST" });
      await deps.service.processWebhook("google_calendar", request);

      expect(deps.selectedCalendarRepository.updateSyncStatus).toHaveBeenCalledWith(
        "cal-1",
        expect.objectContaining({ syncToken: "new-token" })
      );
    });

    test("syncToken is saved after cron subscribe processing", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      await deps.service.subscribe("cal-1");

      expect(deps.selectedCalendarRepository.updateSyncStatus).toHaveBeenCalledWith(
        "cal-1",
        expect.objectContaining({ syncToken: "new-token" })
      );
    });

    test("syncToken is saved after cron syncById processing", async () => {
      deps.adapter.fetchEvents.mockResolvedValue(makeIncrementalEvents());

      await deps.service.syncById("cal-1");

      expect(deps.selectedCalendarRepository.updateSyncStatus).toHaveBeenCalledWith(
        "cal-1",
        expect.objectContaining({ syncToken: "new-token" })
      );
    });
  });
});
