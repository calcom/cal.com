import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { prisma } from "@calcom/prisma";

import type {
  CalendarCredential,
  ICalendarSubscriptionPort,
} from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService {
  constructor(
    private deps: {
      calendarSubscriptionPort: ICalendarSubscriptionPort;
      selectedCalendarRepository: SelectedCalendarRepository;
      featuresRepository: FeaturesRepository;
    }
  ) {}

  /**
   * Subscribes to a calendar
   * @param selectedCalendarId
   * @returns
   */
  async subscribe(selectedCalendarId: string): Promise<void> {
    log.debug("Attempt to subscribe to Google Calendar", { selectedCalendarId });

    const selectedCalendar = await this.deps.selectedCalendarRepository.findById(selectedCalendarId);
    if (!selectedCalendar) {
      log.debug("Selected calendar not found", { selectedCalendarId });
      return;
    }

    if (!selectedCalendar.credentialId) {
      log.debug("Selected calendar credentialId is null", { selectedCalendarId });
      return;
    }

    const credential = await this.getCalendarCredential(selectedCalendar.credentialId);
    if (!credential) {
      log.debug("Credential not found", { selectedCalendarId, credentialId: selectedCalendar.credentialId });
      return;
    }

    const calendarSubscriptionResult = await this.deps.calendarSubscriptionPort.subscribe(
      selectedCalendar,
      credential
    );

    await this.deps.selectedCalendarRepository?.updateById(selectedCalendarId, {
      channelId: calendarSubscriptionResult?.id,
      channelResourceId: calendarSubscriptionResult?.resourceId,
      channelResourceUri: calendarSubscriptionResult?.resourceUri,
      channelKind: calendarSubscriptionResult?.provider,
    });
  }

  /**
   * Unsubscribes from a calendar
   * @param selectedCalendarId
   * @returns
   */
  async unsubscribe(selectedCalendarId: string): Promise<void> {
    log.debug("Attempt to unsubscribe from Google Calendar", { selectedCalendarId });
    const selectedCalendar = await this.deps.selectedCalendarRepository.findById(selectedCalendarId);
    if (!selectedCalendar || !selectedCalendar.credentialId) {
      log.debug("Selected calendar not found or credentialId is null", { selectedCalendarId });
      return;
    }

    const credential = await this.getCalendarCredential(selectedCalendar.credentialId);
    if (!credential) {
      log.debug("Credential not found", { selectedCalendarId, credentialId: selectedCalendar.credentialId });
      return;
    }

    await Promise.all([
      this.deps.calendarSubscriptionPort.unsubscribe(selectedCalendar, credential),
      this.deps.selectedCalendarRepository.updateById(selectedCalendarId, {
        cacheEnabled: false,
      }),
    ]);
  }

  /**
   * Processes webhook
   *
   * @param channelId
   * @returns
   */
  async processWebhook(channelId: string) {
    log.debug("Processing webhook", { channelId });

    const [selectedCalendar, cacheEnabled, syncEnabled] = await Promise.all([
      this.deps.selectedCalendarRepository.findByChannelId(channelId),
      this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("calendar-subscription-cache"),
      this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("calendar-subscription-sync"),
    ]);

    if (!syncEnabled && !cacheEnabled) {
      log.debug("Skipping processing webhook, sync and cache not enabled globally", { channelId });
      return;
    }

    if (!selectedCalendar || !selectedCalendar.credentialId) {
      log.debug("Selected calendar not found or credentialId is null", { channelId });
      return;
    }

    const credential = await this.getCalendarCredential(selectedCalendar.credentialId);
    if (!credential) {
      log.debug("Credential not found", { channelId, credentialId: selectedCalendar.credentialId });
      return;
    }

    let calendarSubscriptionEvents;
    try {
      calendarSubscriptionEvents = await this.deps.calendarSubscriptionPort.fetchEvents(
        selectedCalendar,
        credential
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        log.error("Error fetching events", { channelId, message: error.message });
      } else {
        log.error("Unknown error fetching events", { channelId, error });
      }
      await this.deps.selectedCalendarRepository.updateById(selectedCalendar.id, {
        lastSyncErrorAt: new Date(),
        syncErrorCount: (selectedCalendar.syncErrorCount || 0) + 1,
      });
    }

    if (!calendarSubscriptionEvents) {
      log.debug("No events fetched", { channelId });
      return;
    }

    log.debug("Events fetched", { count: calendarSubscriptionEvents.items.length });
    await this.deps.selectedCalendarRepository.updateById(selectedCalendar.id, {
      lastSyncToken: calendarSubscriptionEvents.syncToken || selectedCalendar.lastSyncToken,
      lastSyncedAt: new Date(),
      lastSyncErrorAt: null,
      syncErrorCount: 0,
    });

    // Apply cache only if both feature flag and selected calendar cache are enabled
    if (cacheEnabled && selectedCalendar.cacheEnabled) {
      log.debug("Caching events", { count: calendarSubscriptionEvents.items.length });

      // Dynamic import to avoid it fully when flag is disabled
      const { CalendarCacheEventService } = await import("./cache/CalendarCacheEventService");
      const { CalendarCacheEventRepository } = await import("./cache/CalendarCacheEventRepository");
      const calendarCacheEventService = new CalendarCacheEventService({
        calendarCacheEventRepository: new CalendarCacheEventRepository(prisma),
        selectedCalendarRepository: this.deps.selectedCalendarRepository,
      });
      await calendarCacheEventService.handleEvents(
        selectedCalendar,
        credential,
        calendarSubscriptionEvents.items
      );
    }

    if (syncEnabled) {
      log.debug("Syncing events", { count: calendarSubscriptionEvents.items.length });

      // Dynamic import to avoid it fully when flag is disabled
      const { CalendarSyncService } = await import("./sync/CalendarSyncService");
      const calendarSyncService = new CalendarSyncService();
      await calendarSyncService.handleEvents(selectedCalendar, credential, calendarSubscriptionEvents.items);
    }
  }

  /**
   * Gets calendar credential with delegation if available
   * @param credentialId
   * @returns
   */
  private async getCalendarCredential(credentialId: number): Promise<CalendarCredential | null> {
    const credential = await getCredentialForCalendarCache({ credentialId });
    if (!credential) {
      return null;
    }
    return {
      ...credential,
      delegatedTo:
        credential.delegatedTo && credential.delegatedTo.serviceAccountKey?.client_email
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
