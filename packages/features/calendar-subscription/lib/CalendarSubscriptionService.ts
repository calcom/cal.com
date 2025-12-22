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
import type { SelectedCalendar } from "@calcom/prisma/client";

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
  async processWebhook(provider: CalendarSubscriptionProvider, request: Request) {
    log.debug("processWebhook", { provider });
    const calendarSubscriptionAdapter = this.deps.adapterFactory.get(provider);

    const isValid = await calendarSubscriptionAdapter.validate(request);
    if (!isValid) throw new Error("Invalid webhook request");

    const channelId = await calendarSubscriptionAdapter.extractChannelId(request);
    if (!channelId) throw new Error("Missing channel ID in webhook");

    log.debug("Processing webhook", { channelId });
    const selectedCalendar = await this.deps.selectedCalendarRepository.findByChannelId(channelId);
    // it maybe caused by an old subscription being triggered
    if (!selectedCalendar) return null;

    // incremental event loading
    await this.processEvents(selectedCalendar);
  }

  /**
   * Process events
   * - fetch events from calendar
   * - process events
   * - update selected calendar
   * - update cache
   * - update sync
   */
  async processEvents(selectedCalendar: SelectedCalendar): Promise<void> {
    const calendarSubscriptionAdapter = this.deps.adapterFactory.get(
      selectedCalendar.integration as CalendarSubscriptionProvider
    );

    if (!selectedCalendar.credentialId && !selectedCalendar.delegationCredentialId) {
      log.debug("Selected Calendar doesn't have credentials", { selectedCalendarId: selectedCalendar.id });
      return;
    }

    // for cache the feature should be enabled globally and by user/team features
    const [cacheEnabled, syncEnabled, cacheEnabledForUser] = await Promise.all([
      this.isCacheEnabled(),
      this.isSyncEnabled(),
      this.isCacheEnabledForUser(selectedCalendar.userId),
    ]);

    if (!cacheEnabled && !syncEnabled) {
      log.info("Cache and sync are globally disabled", { channelId: selectedCalendar.channelId });
      return;
    }

    log.debug("Processing events", { channelId: selectedCalendar.channelId });
    const credential = await this.getCredential(selectedCalendar);
    if (!credential) return;

    let events: CalendarSubscriptionEvent | null = null;
    try {
      events = await calendarSubscriptionAdapter.fetchEvents(selectedCalendar, credential);
    } catch (err) {
      log.debug("Error fetching events", { channelId: selectedCalendar.channelId, err });
      await this.deps.selectedCalendarRepository.updateSyncStatus(selectedCalendar.id, {
        syncErrorAt: new Date(),
        syncErrorCount: { increment: 1 },
      });
      throw err;
    }

    if (!events?.items?.length) {
      log.debug("No events fetched", { channelId: selectedCalendar.channelId });
      return;
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
    }

    if (syncEnabled) {
      log.debug("Syncing events", { count: events.items.length });
      await this.deps.calendarSyncService.handleEvents(selectedCalendar, events.items);
    }
  }

  /**
   * Subscribe periodically to new calendars
   */
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
