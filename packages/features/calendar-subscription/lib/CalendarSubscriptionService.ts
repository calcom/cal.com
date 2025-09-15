import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { prisma } from "@calcom/prisma";

import type { AdapterFactory } from "../adapters/AdaptersFactory";
import type {
  CalendarCredential,
  CalendarSubscriptionWebhookContext,
  CalendarSubscriptionEvent,
  CalendarSubscriptionProvider,
} from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService {
  constructor(
    private deps: {
      adapterFactory: AdapterFactory;
      selectedCalendarRepository: SelectedCalendarRepository;
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
  }

  /**
   * Process webhook
   */
  async processWebhook(provider: CalendarSubscriptionProvider, context: CalendarSubscriptionWebhookContext) {
    log.debug("processWebhook", { provider });
    const calendarSubscriptionAdapter = this.deps.adapterFactory.get(provider);

    const isValid = await calendarSubscriptionAdapter.validate(context);
    if (!isValid) throw new Error("Invalid webhook request");

    const channelId = await calendarSubscriptionAdapter.extractChannelId(context);
    if (!channelId) throw new Error("Missing channel ID in webhook");

    log.debug("Processing webhook", { channelId });
    const [selectedCalendar, cacheEnabled, syncEnabled] = await Promise.all([
      this.deps.selectedCalendarRepository.findByChannelId(channelId),
      this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("calendar-subscription-cache"),
      this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("calendar-subscription-sync"),
    ]);

    if (!selectedCalendar?.credentialId || (!cacheEnabled && !syncEnabled)) {
      log.debug("Selected calendar not found", { channelId });
      return;
    }

    const credential = await this.getCalendarCredential(selectedCalendar.credentialId);
    if (!credential) return;

    let events: CalendarSubscriptionEvent | null = null;
    try {
      events = await calendarSubscriptionAdapter.fetchEvents(selectedCalendar, credential);
    } catch (err) {
      log.error("Error fetching events", { channelId, err });
      await this.deps.selectedCalendarRepository.updateById(selectedCalendar.id, {
        syncErrorAt: new Date(),
        syncErrorCount: (selectedCalendar.syncErrorCount || 0) + 1,
      });
      throw err;
    }

    if (!events?.items?.length) {
      log.debug("No events fetched", { channelId });
      return;
    }

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
      const cacheSvc = new CalendarCacheEventService({
        calendarCacheEventRepository: new CalendarCacheEventRepository(prisma),
        selectedCalendarRepository: this.deps.selectedCalendarRepository,
      });
      await cacheSvc.handleEvents(selectedCalendar, events.items);
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
