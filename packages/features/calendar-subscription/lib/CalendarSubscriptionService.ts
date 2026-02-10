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
import type { IFeatureRepository } from "@calcom/features/flags/repositories/PrismaFeatureRepository";
import type { ITeamFeatureRepository } from "@calcom/features/flags/repositories/PrismaTeamFeatureRepository";
import type { IUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
import type { ISelectedCalendarRepository } from "@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository.interface";
import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { metrics } from "@sentry/nextjs";

// biome-ignore lint/nursery/useExplicitType: logger type is inferred
const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService {
  static CALENDAR_SUBSCRIPTION_CACHE_FEATURE = "calendar-subscription-cache" as const;
  static CALENDAR_SUBSCRIPTION_SYNC_FEATURE = "calendar-subscription-sync" as const;
  static MAX_SUBSCRIBE_ERRORS = 3;

  constructor(
    private deps: {
      adapterFactory: AdapterFactory;
      selectedCalendarRepository: ISelectedCalendarRepository;
      featureRepository: IFeatureRepository;
      teamFeatureRepository: ITeamFeatureRepository;
      userFeatureRepository: IUserFeatureRepository & {
        checkIfUserHasFeature: (userId: number, slug: string) => Promise<boolean>;
      };
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

    const subscribeErrorCount = selectedCalendar.syncSubscribedErrorCount ?? 0;
    if (subscribeErrorCount >= CalendarSubscriptionService.MAX_SUBSCRIBE_ERRORS) {
      log.debug("Selected calendar exceeded subscribe error threshold", { selectedCalendarId });
      return;
    }

    const calendarSubscriptionAdapter = this.deps.adapterFactory.get(
      selectedCalendar.integration as CalendarSubscriptionProvider
    );

    try {
      const res = await calendarSubscriptionAdapter.subscribe(selectedCalendar, credential);
      await this.deps.selectedCalendarRepository.updateSubscription(selectedCalendarId, {
        channelId: res?.id,
        channelResourceId: res?.resourceId,
        channelResourceUri: res?.resourceUri,
        channelKind: res?.provider,
        channelExpiration: res?.expiration,
        syncSubscribedAt: new Date(),
        syncSubscribedErrorAt: null,
        syncSubscribedErrorCount: 0,
      });
    } catch (error: unknown) {
      const nextErrorCount = Math.min(
        CalendarSubscriptionService.MAX_SUBSCRIBE_ERRORS,
        (selectedCalendar.syncSubscribedErrorCount ?? 0) + 1
      );
      await this.deps.selectedCalendarRepository.updateSubscription(selectedCalendarId, {
        // don't need to cleanup other fields as they will only be used if syncSubscribedAt is not null
        syncSubscribedAt: null,
        syncSubscribedErrorAt: new Date(),
        syncSubscribedErrorCount: nextErrorCount,
      });
      throw error;
    }

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
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: webhook processing requires multiple steps
  async processWebhook(provider: CalendarSubscriptionProvider, request: Request) {
    const startTime = performance.now();
    log.debug("processWebhook", { provider });

    try {
      const calendarSubscriptionAdapter = this.deps.adapterFactory.get(provider);

      const isValid = await calendarSubscriptionAdapter.validate(request);
      if (!isValid) {
        metrics.count("calendar.subscription.webhook.invalid", 1, {
          attributes: { provider },
        });
        throw new Error("Invalid webhook request");
      }

      const channelId = await calendarSubscriptionAdapter.extractChannelId(request);
      if (!channelId) {
        metrics.count("calendar.subscription.webhook.missing_channel", 1, {
          attributes: { provider },
        });
        throw new Error("Missing channel ID in webhook");
      }

      log.debug("Processing webhook", { channelId });

      const selectedCalendar = await this.deps.selectedCalendarRepository.findByChannelId(channelId);
      if (!selectedCalendar) {
        metrics.count("calendar.subscription.webhook.skipped", 1, {
          attributes: { provider, reason: "calendar_not_found" },
        });
        log.info("Webhook processed - calendar not found", {
          provider,
          channelId,
          durationMs: performance.now() - startTime,
        });
        return null;
      }

      const eventsProcessed = await this.processEvents(selectedCalendar);

      const durationMs = performance.now() - startTime;

      metrics.count("calendar.subscription.webhook.success", 1, {
        attributes: { provider },
      });

      metrics.distribution("calendar.subscription.webhook.duration_ms", durationMs, {
        attributes: { provider },
      });

      metrics.distribution("calendar.subscription.webhook.events_fetched", eventsProcessed.eventsFetched, {
        attributes: { provider },
      });
    } catch (error) {
      const durationMs = performance.now() - startTime;

      metrics.count("calendar.subscription.webhook.error", 1, {
        attributes: { provider },
      });

      metrics.distribution("calendar.subscription.webhook.duration_ms", durationMs, {
        attributes: { provider, outcome: "error" },
      });

      log.error("Webhook processing failed", {
        provider,
        durationMs,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
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
  async processEvents(selectedCalendar: SelectedCalendar): Promise<{
    eventsFetched: number;
    eventsCached: number;
    eventsSynced: number;
    propagationLagMs?: { avg: number; max: number; min: number; count: number };
  }> {
    const startTime = performance.now();

    const result: {
      eventsFetched: number;
      eventsCached: number;
      eventsSynced: number;
      propagationLagMs?: { avg: number; max: number; min: number; count: number };
    } = {
      eventsFetched: 0,
      eventsCached: 0,
      eventsSynced: 0,
    };

    const calendarSubscriptionAdapter = this.deps.adapterFactory.get(
      selectedCalendar.integration as CalendarSubscriptionProvider
    );

    if (!selectedCalendar.credentialId && !selectedCalendar.delegationCredentialId) {
      log.debug("Selected Calendar doesn't have credentials", {
        selectedCalendarId: selectedCalendar.id,
      });
      return result;
    }

    const [cacheEnabled, syncEnabled, cacheEnabledForUser] = await Promise.all([
      this.isCacheEnabled(),
      this.isSyncEnabled(),
      this.isCacheEnabledForUser(selectedCalendar.userId),
    ]);

    if (!cacheEnabled && !syncEnabled) {
      log.info("Cache and sync are globally disabled", {
        channelId: selectedCalendar.channelId,
      });
      return result;
    }

    log.debug("Processing events", { channelId: selectedCalendar.channelId });

    const credential = await this.getCredential(selectedCalendar);
    if (!credential) {
      return result;
    }

    let events: CalendarSubscriptionEvent | null = null;
    try {
      events = await calendarSubscriptionAdapter.fetchEvents(selectedCalendar, credential);
    } catch (err) {
      metrics.count("calendar.subscription.events.fetch.error", 1, {
        attributes: { provider: selectedCalendar.integration },
      });
      await this.deps.selectedCalendarRepository.updateSyncStatus(selectedCalendar.id, {
        syncErrorAt: new Date(),
        syncErrorCount: { increment: 1 },
      });
      throw err;
    }

    if (!events?.items?.length) {
      log.debug("No events fetched", { channelId: selectedCalendar.channelId });
      return result;
    }

    result.eventsFetched = events.items.length;

    metrics.distribution("calendar.subscription.events.fetched", events.items.length, {
      attributes: {
        provider: selectedCalendar.integration,
        incremental: !!selectedCalendar.syncToken,
      },
    });

    const now = Date.now();
    const lagStats = this.calculatePropagationLag(events.items, now);
    if (lagStats) {
      result.propagationLagMs = lagStats;
      metrics.distribution("calendar.subscription.propagation_lag.avg_ms", lagStats.avg, {
        attributes: { provider: selectedCalendar.integration },
      });
      metrics.distribution("calendar.subscription.propagation_lag.max_ms", lagStats.max, {
        attributes: { provider: selectedCalendar.integration },
      });
    }

    await this.deps.selectedCalendarRepository.updateSyncStatus(selectedCalendar.id, {
      syncToken: events.syncToken || selectedCalendar.syncToken,
      syncedAt: new Date(),
      syncErrorAt: null,
      syncErrorCount: 0,
    });

    if (cacheEnabled && cacheEnabledForUser) {
      log.debug("Caching events", { count: events.items.length });
      await this.deps.calendarCacheEventService.handleEvents(selectedCalendar, events.items);
      result.eventsCached = events.items.length;

      metrics.distribution("calendar.subscription.events.cached", events.items.length, {
        attributes: { provider: selectedCalendar.integration },
      });
    }

    if (syncEnabled) {
      log.debug("Syncing events", { count: events.items.length });
      await this.deps.calendarSyncService.handleEvents(selectedCalendar, events.items);
      result.eventsSynced = events.items.length;

      metrics.distribution("calendar.subscription.events.synced", events.items.length, {
        attributes: { provider: selectedCalendar.integration },
      });
    }

    metrics.distribution("calendar.subscription.processEvents.duration_ms", performance.now() - startTime, {
      attributes: {
        provider: selectedCalendar.integration,
        cache: cacheEnabled && cacheEnabledForUser ? "on" : "off",
        sync: syncEnabled ? "on" : "off",
      },
    });

    return result;
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
    if (!(await this.isCacheEnabled())) {
      return;
    }
    const teamIds = await this.deps.teamFeatureRepository.getTeamsWithFeatureEnabled(
      CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
    );
    const rows = await this.deps.selectedCalendarRepository.findNextSubscriptionBatch({
      take: 100,
      integrations: this.deps.adapterFactory.getProviders(),
      teamIds,
      genericCalendarSuffixes: this.deps.adapterFactory.getGenericCalendarSuffixes(),
    });
    log.debug("checkForNewSubscriptions", { count: rows.length });
    await Promise.allSettled(rows.map(({ id }) => this.subscribe(id)));
  }

  /**
   * Check if cache is enabled
   * @returns true if cache is enabled
   */
  async isCacheEnabled(): Promise<boolean> {
    return this.deps.featureRepository.checkIfFeatureIsEnabledGlobally(
      CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
    );
  }

  /**
   * Check if cache is enabled for user
   * @returns true if cache is enabled
   */
  async isCacheEnabledForUser(userId: number): Promise<boolean> {
    return this.deps.userFeatureRepository.checkIfUserHasFeature(
      userId,
      CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
    );
  }

  /**
   * Check if sync is enabled
   * @returns true if sync is enabled
   */
  async isSyncEnabled(): Promise<boolean> {
    return this.deps.featureRepository.checkIfFeatureIsEnabledGlobally(
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
