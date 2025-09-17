import type {
  AdapterFactory,
  CalendarSubscriptionProvider,
} from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import type { ISelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository.interface";
import { prisma } from "@calcom/prisma";

import type {
  CalendarCredential,
  CalendarSubscriptionEvent,
} from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService {
  constructor(
    private deps: {
      adapterFactory: AdapterFactory;
      selectedCalendarRepository: ISelectedCalendarRepository;
      featuresRepository: FeaturesRepository;
    }
  ) {}

  /**
   * Subscribe to a calendar
   */
  async subscribe(selectedCalendarId: string): Promise<void> {
    log.debug("subscribe", { selectedCalendarId });
    const selectedCalendar = await this.deps.selectedCalendarRepository.findById(selectedCalendarId);
    if (!selectedCalendar?.credentialId) {
      log.debug("Selected calendar not found", { selectedCalendarId });
      return;
    }

    const credential = await this.getCalendarCredential(selectedCalendar.credentialId);
    if (!credential) {
      log.debug("Calendar credential not found", { selectedCalendarId });
      return;
    }

    const calendarSubscriptionAdapter = this.deps.adapterFactory.get(
      selectedCalendar.integration as CalendarSubscriptionProvider
    );
    const res = await calendarSubscriptionAdapter.subscribe(selectedCalendar, credential);

    await this.deps.selectedCalendarRepository.updateById(selectedCalendarId, {
      channelId: res?.id,
      channelResourceId: res?.resourceId,
      channelResourceUri: res?.resourceUri,
      channelKind: res?.provider,
      channelExpiration: res?.expiration,
      syncSubscribedAt: new Date(),
    });

    // initial event loading
    await processEvents(selectedCalendar);
  }

  /**
   * Unsubscribe from a calendar
   */
  async unsubscribe(selectedCalendarId: string): Promise<void> {
    log.debug("unsubscribe", { selectedCalendarId });
    const selectedCalendar = await this.deps.selectedCalendarRepository.findById(selectedCalendarId);
    if (!selectedCalendar?.credentialId) return;

    const credential = await this.getCalendarCredential(selectedCalendar.credentialId);
    if (!credential) return;

    const calendarSubscriptionAdapter = this.deps.adapterFactory.get(
      selectedCalendar.integration as CalendarSubscriptionProvider
    );

    await Promise.all([
      calendarSubscriptionAdapter.unsubscribe(selectedCalendar, credential),
      this.deps.selectedCalendarRepository.updateById(selectedCalendarId, {
        syncSubscribedAt: null,
      }),
    ]);

    // cleanup cache after unsubscribe
    if (await this.isCacheEnabled()) {
      const { CalendarCacheEventService } = await import("./cache/CalendarCacheEventService");
      const calendarCacheEventService = new CalendarCacheEventService(this.deps);
      await calendarCacheEventService.cleanupCache(selectedCalendar);
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
    if (!selectedCalendar?.credentialId) {
      log.debug("Selected calendar not found", { channelId });
      return;
    }

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

    const [cacheEnabled, syncEnabled] = await Promise.all([this.isCacheEnabled(), this.isSyncEnabled()]);
    if (!cacheEnabled && !syncEnabled) {
      log.debug("No cache or sync enabled", { channelId: selectedCalendar.channelId });
      return;
    }

    log.info("processEvents", { channelId: selectedCalendar.channelId });
    const credential = await this.getCalendarCredential(selectedCalendar.credentialId);
    if (!credential) return;

    let events: CalendarSubscriptionEvent | null = null;
    try {
      events = await calendarSubscriptionAdapter.fetchEvents(selectedCalendar, credential);
    } catch (err) {
      log.debug("Error fetching events", { channelId: selectedCalendar.channelId, err });
      await this.deps.selectedCalendarRepository.updateById(selectedCalendar.id, {
        syncErrorAt: new Date(),
        syncErrorCount: (selectedCalendar.syncErrorCount || 0) + 1,
      });
      throw err;
    }

    if (!events?.items?.length) {
      log.debug("No events fetched", { channelId: selectedCalendar.channelId });
      return;
    }

    log.debug("Processing events", { channelId: selectedCalendar.channelId, count: events.items.length });
    await this.deps.selectedCalendarRepository.updateById(selectedCalendar.id, {
      syncToken: events.syncToken || selectedCalendar.syncToken,
      syncedAt: new Date(),
      syncErrorAt: null,
      syncErrorCount: 0,
    });

    if (cacheEnabled) {
      log.debug("Caching events", { count: events.items.length });
      const { CalendarCacheEventService } = await import("./cache/CalendarCacheEventService");
      const { CalendarCacheEventRepository } = await import("./cache/CalendarCacheEventRepository");
      const calendarCacheEventService = new CalendarCacheEventService({
        calendarCacheEventRepository: new CalendarCacheEventRepository(prisma),
      });
      await calendarCacheEventService.handleEvents(selectedCalendar, events.items);
    }

    if (syncEnabled) {
      log.debug("Syncing events", { count: events.items.length });
      const { CalendarSyncService } = await import("./sync/CalendarSyncService");
      await new CalendarSyncService().handleEvents(selectedCalendar, events.items);
    }
  }

  /**
   * Subscribe periodically to new calendars
   */
  async checkForNewSubscriptions() {
    log.debug("checkForNewSubscriptions");
    const rows = await this.deps.selectedCalendarRepository.findNotSubscribed({ take: 100 });
    await Promise.allSettled(rows.map(({ id }) => this.subscribe(id)));
  }

  /**
   * Check if cache is enabled
   * @returns true if cache is enabled
   */
  async isCacheEnabled(): Promise<boolean> {
    return this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("calendar-subscription-cache");
  }

  /**
   * Check if sync is enabled
   * @returns true if sync is enabled
   */
  async isSyncEnabled(): Promise<boolean> {
    return this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("calendar-subscription-sync");
  }

  /**
   * Get credential with delegation if available
   */
  private async getCalendarCredential(credentialId: number): Promise<CalendarCredential | null> {
    const credential = await getCredentialForCalendarCache({ credentialId });
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
