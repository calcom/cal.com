import { getCredentialForSelectedCalendar } from "@calcom/app-store/delegationCredential";
import type {
  AdapterFactory,
  CalendarSubscriptionProvider,
} from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import type {
  CalendarCredential,
  CalendarSubscriptionEvent,
} from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import type { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import type { CalendarSyncService } from "@calcom/features/calendar-subscription/lib/sync/CalendarSyncService";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { ISelectedCalendarRepository } from "@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository.interface";
import logger from "@calcom/lib/logger";
import { withSpan } from "@calcom/lib/sentryWrapper";
import type { SelectedCalendar } from "@calcom/prisma/client";

// biome-ignore lint/nursery/useExplicitType: logger type is inferred
const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService {
  static CALENDAR_SUBSCRIPTION_CACHE_FEATURE = "calendar-subscription-cache" as const;
  static CALENDAR_SUBSCRIPTION_SYNC_FEATURE = "calendar-subscription-sync" as const;

  constructor(
    private deps: {
      adapterFactory: AdapterFactory;
      selectedCalendarRepository: ISelectedCalendarRepository;
      featuresRepository: FeaturesRepository;
      calendarCacheEventService: CalendarCacheEventService;
      calendarSyncService: CalendarSyncService;
    }
  ) {}

  /**
   * Subscribe to a calendar
   */
  async subscribe(selectedCalendarId: string): Promise<void> {
    log.debug("subscribe", { selectedCalendarId });
    const selectedCalendar = await this.deps.selectedCalendarRepository.findById(selectedCalendarId);
    if (!selectedCalendar) {
      log.debug("Selected calendar not found", { selectedCalendarId });
      return;
    }

    if (!selectedCalendar.credentialId && !selectedCalendar.delegationCredentialId) {
      log.debug("Selected calendar doesn't have credentials", { selectedCalendarId });
      return;
    }

    const credential = await this.getCredential(selectedCalendar);
    if (!credential) {
      log.debug("Calendar credential not found", { selectedCalendarId });
      return;
    }

    const calendarSubscriptionAdapter = this.deps.adapterFactory.get(
      selectedCalendar.integration as CalendarSubscriptionProvider
    );
    const res = await calendarSubscriptionAdapter.subscribe(selectedCalendar, credential);

    await this.deps.selectedCalendarRepository.updateSubscription(selectedCalendarId, {
      channelId: res?.id,
      channelResourceId: res?.resourceId,
      channelResourceUri: res?.resourceUri,
      channelKind: res?.provider,
      channelExpiration: res?.expiration,
      syncSubscribedAt: new Date(),
    });

    // initial event loading
    await this.processEvents(selectedCalendar);
  }

  /**
   * Unsubscribe from a calendar
   */
  async unsubscribe(selectedCalendarId: string): Promise<void> {
    log.debug("unsubscribe", { selectedCalendarId });
    const selectedCalendar = await this.deps.selectedCalendarRepository.findById(selectedCalendarId);
    if (!selectedCalendar) {
      log.debug("Selected calendar not found", { selectedCalendarId });
      return;
    }

    if (!selectedCalendar.credentialId && !selectedCalendar.delegationCredentialId) {
      log.debug("Selected calendar doesn't have credentials", { selectedCalendarId });
      return;
    }

    const credential = await this.getCredential(selectedCalendar);
    if (!credential) return;

    const calendarSubscriptionAdapter = this.deps.adapterFactory.get(
      selectedCalendar.integration as CalendarSubscriptionProvider
    );

    await Promise.all([
      calendarSubscriptionAdapter.unsubscribe(selectedCalendar, credential),
      this.deps.selectedCalendarRepository.updateSubscription(selectedCalendarId, {
        syncSubscribedAt: null,
      }),
    ]);

    // cleanup cache after unsubscribe
    if (await this.isCacheEnabled()) {
      log.debug("cleanupCache", { selectedCalendarId });
      await this.deps.calendarCacheEventService.cleanupCache(selectedCalendar);
    }
  }

  /**
   * Process webhook
   */
  // biome-ignore lint/nursery/useExplicitType: return type is inferred from withSpan
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: webhook processing requires multiple steps
  async processWebhook(provider: CalendarSubscriptionProvider, request: Request) {
    return withSpan(
      {
        name: "CalendarSubscriptionService.processWebhook",
        op: "calendar.subscription.webhook",
        attributes: {
          provider,
        },
      },
      // biome-ignore lint/complexity/noExcessiveLinesPerFunction: webhook processing requires multiple steps
      async (span) => {
        const startTime = performance.now();
        log.debug("processWebhook", { provider });

        try {
          const calendarSubscriptionAdapter = this.deps.adapterFactory.get(provider);

          const isValid = await calendarSubscriptionAdapter.validate(request);
          if (!isValid) {
            span.setAttribute("success", false);
            span.setAttribute("errorMessage", "Invalid webhook request");
            throw new Error("Invalid webhook request");
          }

          const channelId = await calendarSubscriptionAdapter.extractChannelId(request);
          if (!channelId) {
            span.setAttribute("success", false);
            span.setAttribute("errorMessage", "Missing channel ID in webhook");
            throw new Error("Missing channel ID in webhook");
          }

          log.debug("Processing webhook", { channelId });
          span.setAttribute("channelId", channelId);

          const selectedCalendar = await this.deps.selectedCalendarRepository.findByChannelId(channelId);
          // it maybe caused by an old subscription being triggered
          if (!selectedCalendar) {
            span.setAttribute("success", true);
            span.setAttribute("skipped", true);
            span.setAttribute("skipReason", "Calendar not found for channel");
            log.info("Webhook processed - calendar not found", {
              provider,
              channelId,
              durationMs: performance.now() - startTime,
            });
            return null;
          }

          span.setAttribute("selectedCalendarId", selectedCalendar.id);
          span.setAttribute("userId", selectedCalendar.userId);

          // incremental event loading
          const eventsProcessed = await this.processEvents(selectedCalendar);

          const durationMs = performance.now() - startTime;
          span.setAttribute("success", true);
          span.setAttribute("durationMs", durationMs);
          span.setAttribute("eventsProcessedCount", eventsProcessed.eventsFetched);
          span.setAttribute("eventsCachedCount", eventsProcessed.eventsCached);
          span.setAttribute("eventsSyncedCount", eventsProcessed.eventsSynced);

          log.info("Webhook processed successfully", {
            provider,
            channelId,
            selectedCalendarId: selectedCalendar.id,
            durationMs,
          });
        } catch (error) {
          const durationMs = performance.now() - startTime;
          span.setAttribute("success", false);
          span.setAttribute("durationMs", durationMs);
          // biome-ignore lint/nursery/noTernary: simple error message extraction
          span.setAttribute("errorMessage", error instanceof Error ? error.message : "Unknown error");

          log.error("Webhook processing failed", {
            provider,
            durationMs,
            // biome-ignore lint/nursery/noTernary: simple error message extraction
            error: error instanceof Error ? error.message : "Unknown error",
          });

          throw error;
        }
      }
    );
  }

  /**
   * Process events
   * - fetch events from calendar
   * - process events
   * - update selected calendar
   * - update cache
   * - update sync
   * @returns Object with counts of events fetched, cached, and synced, plus propagation lag metrics
   */
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: event processing requires multiple steps
  async processEvents(
    selectedCalendar: SelectedCalendar
  ): Promise<{
    eventsFetched: number;
    eventsCached: number;
    eventsSynced: number;
    propagationLagMs?: { avg: number; max: number; min: number; count: number };
  }> {
    return withSpan(
      {
        name: "CalendarSubscriptionService.processEvents",
        op: "calendar.subscription.processEvents",
        attributes: {
          provider: selectedCalendar.integration,
          selectedCalendarId: selectedCalendar.id,
          userId: selectedCalendar.userId,
          isIncremental: !!selectedCalendar.syncToken,
        },
      },
      // biome-ignore lint/complexity/noExcessiveLinesPerFunction: event processing requires multiple steps
      async (span) => {
        const result: {
          eventsFetched: number;
          eventsCached: number;
          eventsSynced: number;
          propagationLagMs?: { avg: number; max: number; min: number; count: number };
        } = { eventsFetched: 0, eventsCached: 0, eventsSynced: 0 };

        const calendarSubscriptionAdapter = this.deps.adapterFactory.get(
          selectedCalendar.integration as CalendarSubscriptionProvider
        );

        if (!selectedCalendar.credentialId && !selectedCalendar.delegationCredentialId) {
          log.debug("Selected Calendar doesn't have credentials", { selectedCalendarId: selectedCalendar.id });
          span.setAttribute("skipped", true);
          span.setAttribute("skipReason", "No credentials");
          return result;
        }

        // for cache the feature should be enabled globally and by user/team features
        const [cacheEnabled, syncEnabled, cacheEnabledForUser] = await Promise.all([
          this.isCacheEnabled(),
          this.isSyncEnabled(),
          this.isCacheEnabledForUser(selectedCalendar.userId),
        ]);

        if (!cacheEnabled && !syncEnabled) {
          log.info("Cache and sync are globally disabled", { channelId: selectedCalendar.channelId });
          span.setAttribute("skipped", true);
          span.setAttribute("skipReason", "Cache and sync disabled");
          return result;
        }

        log.debug("Processing events", { channelId: selectedCalendar.channelId });
        const credential = await this.getCredential(selectedCalendar);
        if (!credential) {
          span.setAttribute("skipped", true);
          span.setAttribute("skipReason", "No credential found");
          return result;
        }

        let events: CalendarSubscriptionEvent | null = null;
        try {
          events = await calendarSubscriptionAdapter.fetchEvents(selectedCalendar, credential);
        } catch (err) {
          log.debug("Error fetching events", { channelId: selectedCalendar.channelId, err });
          await this.deps.selectedCalendarRepository.updateSyncStatus(selectedCalendar.id, {
            syncErrorAt: new Date(),
            syncErrorCount: { increment: 1 },
          });
          span.setAttribute("success", false);
          // biome-ignore lint/nursery/noTernary: simple error message extraction
          span.setAttribute("errorMessage", err instanceof Error ? err.message : "Unknown error");
          throw err;
        }

        if (!events?.items?.length) {
          log.debug("No events fetched", { channelId: selectedCalendar.channelId });
          span.setAttribute("eventsFetched", 0);
          return result;
        }

        result.eventsFetched = events.items.length;
        span.setAttribute("eventsFetched", events.items.length);

        // Calculate propagation lag: time between event update in Google and now
        // Only meaningful for incremental syncs (when syncToken exists)
        const now = Date.now();
        const lagStats = this.calculatePropagationLag(events.items, now);
        if (lagStats) {
          result.propagationLagMs = lagStats;
          span.setAttribute("propagationLagAvgMs", lagStats.avg);
          span.setAttribute("propagationLagMaxMs", lagStats.max);
          span.setAttribute("propagationLagMinMs", lagStats.min);
          span.setAttribute("propagationLagEventCount", lagStats.count);
          log.info("Propagation lag calculated", {
            channelId: selectedCalendar.channelId,
            avgMs: lagStats.avg,
            maxMs: lagStats.max,
            minMs: lagStats.min,
            eventCount: lagStats.count,
          });
        }

        log.debug("Processing events", { channelId: selectedCalendar.channelId, count: events.items.length });
        await this.deps.selectedCalendarRepository.updateSyncStatus(selectedCalendar.id, {
          syncToken: events.syncToken || selectedCalendar.syncToken,
          syncedAt: new Date(),
          syncErrorAt: null,
          syncErrorCount: 0,
        });

        // it requires both global and team/user feature cache enabled
        if (cacheEnabled && cacheEnabledForUser) {
          log.debug("Caching events", { count: events.items.length });
          await this.deps.calendarCacheEventService.handleEvents(selectedCalendar, events.items);
          result.eventsCached = events.items.length;
          span.setAttribute("eventsCached", events.items.length);
        }

        if (syncEnabled) {
          log.debug("Syncing events", { count: events.items.length });
          await this.deps.calendarSyncService.handleEvents(selectedCalendar, events.items);
          result.eventsSynced = events.items.length;
          span.setAttribute("eventsSynced", events.items.length);
        }

        span.setAttribute("success", true);
        return result;
      }
    );
  }

  /**
   * Calculate propagation lag statistics from event timestamps
   * Uses updatedAt or createdAt to determine when the event was last modified in the provider
   */
  private calculatePropagationLag(
    items: CalendarSubscriptionEvent["items"],
    now: number
  ): { avg: number; max: number; min: number; count: number } | null {
    const lags: number[] = [];

    for (const item of items) {
      // Use updatedAt if available, otherwise fall back to createdAt
      const eventTimestamp = item.updatedAt ?? item.createdAt;
      if (eventTimestamp) {
        const lagMs = now - eventTimestamp.getTime();
        // Only count positive lags (ignore clock skew / future timestamps)
        if (lagMs >= 0) {
          lags.push(lagMs);
        }
      }
    }

    if (lags.length === 0) {
      return null;
    }

    const sum = lags.reduce((a, b) => a + b, 0);
    return {
      avg: Math.round(sum / lags.length),
      max: Math.max(...lags),
      min: Math.min(...lags),
      count: lags.length,
    };
  }

  /**
   * Subscribe periodically to new calendars
   */
  // biome-ignore lint/nursery/useExplicitType: return type is void
  async checkForNewSubscriptions() {
    const teamIds = await this.deps.featuresRepository.getTeamsWithFeatureEnabled(
      CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
    );

    const rows = await this.deps.selectedCalendarRepository.findNextSubscriptionBatch({
      take: 100,
      integrations: this.deps.adapterFactory.getProviders(),
      teamIds,
    });
    log.debug("checkForNewSubscriptions", { count: rows.length });
    await Promise.allSettled(rows.map(({ id }) => this.subscribe(id)));
  }

  /**
   * Check if cache is enabled
   * @returns true if cache is enabled
   */
  async isCacheEnabled(): Promise<boolean> {
    return this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally(
      CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
    );
  }

  /**
   * Check if cache is enabled for user
   * @returns true if cache is enabled
   */
  async isCacheEnabledForUser(userId: number): Promise<boolean> {
    return this.deps.featuresRepository.checkIfUserHasFeature(
      userId,
      CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
    );
  }

  /**
   * Check if sync is enabled
   * @returns true if sync is enabled
   */
  async isSyncEnabled(): Promise<boolean> {
    return this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally(
      CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_SYNC_FEATURE
    );
  }

  /**
   * Get credential with delegation if available
   */
  private async getCredential(selectedCalendar: SelectedCalendar): Promise<CalendarCredential | null> {
    if (!selectedCalendar.credentialId && !selectedCalendar.delegationCredentialId) {
      log.debug("Selected calendar doesn't have any credential");
      return null;
    }
    const credential = await getCredentialForSelectedCalendar(selectedCalendar);
    if (!credential) return null;
    return {
      ...credential,
      // biome-ignore lint/nursery/noTernary: conditional delegation credential mapping
      delegatedTo: credential.delegatedTo?.serviceAccountKey?.client_email
        ? {
            serviceAccountKey: {
              client_email: credential.delegatedTo.serviceAccountKey.client_email,
              client_id: credential.delegatedTo.serviceAccountKey.client_id,
              private_key: credential.delegatedTo.serviceAccountKey.private_key,
            },
          }
        : null,
    };
  }
}
