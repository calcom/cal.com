import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { prisma } from "@calcom/prisma";

import type { ICalendarSubscriptionPort } from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService {
  constructor(
    private deps: {
      calendarSubscriptionPort: ICalendarSubscriptionPort;
      selectedCalendarRepository: SelectedCalendarRepository;
      featureRepository: FeaturesRepository;
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

    const calendarSubscriptionResult = await this.deps.calendarSubscriptionPort.subscribe(selectedCalendar);
    await this.deps.selectedCalendarRepository?.updateById(selectedCalendarId, {
      channelId: calendarSubscriptionResult?.resourceId,
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
    const selectedCalendar = await this.deps.selectedCalendarRepository?.updateById(selectedCalendarId, {
      syncEnabled: false,
      cacheEnabled: false,
    });

    if (!selectedCalendar) {
      log.debug("Selected calendar not found", { selectedCalendarId });
      return;
    }
    await this.deps.calendarSubscriptionPort.unsubscribe(selectedCalendar);
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
      this.deps.featureRepository.checkIfFeatureIsEnabledGlobally("calendar-subscription-cache"),
      this.deps.featureRepository.checkIfFeatureIsEnabledGlobally("calendar-subscription-sync"),
    ]);

    if (!syncEnabled && !cacheEnabled) {
      log.debug("Skipping processing webhook, sync and cache not enabled globally", { channelId });
      return;
    }

    if (!selectedCalendar) {
      log.debug("Selected calendar not found", { channelId });
      return;
    }

    const calendarSubscriptionEvents = await this.deps.calendarSubscriptionPort.fetchEvents(selectedCalendar);
    log.debug("Events fetched", { count: calendarSubscriptionEvents.items.length });

    await this.deps.selectedCalendarRepository.updateById(selectedCalendar.id, {
      syncToken: calendarSubscriptionEvents.syncToken,
    });

    if (selectedCalendar.cacheEnabled) {
      log.debug("Caching events", { count: calendarSubscriptionEvents.items.length });
      const { CalendarCacheEventService } = await import("./cache/CalendarCacheEventService");
      const { CalendarCacheEventRepository } = await import("./cache/CalendarCacheEventRepository");
      const calendarCacheEventService = new CalendarCacheEventService({
        calendarCacheEventRepository: new CalendarCacheEventRepository(prisma),
        selectedCalendarRepository: this.deps.selectedCalendarRepository,
      });
      await calendarCacheEventService.handleEvents(calendarSubscriptionEvents.items);
    }

    if (syncEnabled) {
      log.debug("Syncing events", { count: calendarSubscriptionEvents.items.length });
      const { CalendarSyncService } = await import("./sync/CalendarSyncService");
      const calendarSyncService = new CalendarSyncService();
      await calendarSyncService.handleEvents(selectedCalendar, calendarSubscriptionEvents.items);
    }
  }
}
