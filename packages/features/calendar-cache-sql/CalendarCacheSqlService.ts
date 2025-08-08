import type { ISelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";
import { CalendarWebhookServiceFactory } from "./CalendarWebhookServiceFactory";

export class CalendarCacheSqlService {
  constructor(
    private subscriptionRepo: ICalendarSubscriptionRepository,
    private eventRepo: ICalendarEventRepository,
    private selectedCalendarRepo: ISelectedCalendarRepository
  ) {}

  async getAvailability(selectedCalendarId: string, start: Date, end: Date) {
    const subscription = await this.subscriptionRepo.findBySelectedCalendar(selectedCalendarId);

    if (!subscription) {
      throw new Error("Calendar subscription not found");
    }

    const events = await this.eventRepo.getEventsForAvailability(subscription.id, start, end);

    return events.map((event) => ({
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      title: event.summary || "Busy",
      source: "calendar-cache-sql",
    }));
  }

  async processWebhookEvents(channelIdOrSubscriptionId: string, credential: CredentialForCalendarService) {
    let subscription;

    if (credential.type === "office365_calendar") {
      subscription = await this.subscriptionRepo.findByOffice365SubscriptionId(channelIdOrSubscriptionId);
    } else {
      subscription = await this.subscriptionRepo.findByChannelId(channelIdOrSubscriptionId);
    }

    if (!subscription) {
      throw new Error("Calendar subscription not found");
    }

    console.info("Got subscription", subscription);

    const webhookService = await CalendarWebhookServiceFactory.createService(
      credential,
      this.subscriptionRepo,
      this.eventRepo
    );

    await webhookService.processWebhookEvents(subscription, credential);
  }

  /**
   * Enriches calendar data with SQL cache information at the individual calendar level
   */
  async enrichCalendarsWithSqlCacheData<
    T extends {
      credentialId: number;
      calendars?: { externalId: string; name?: string }[];
    }
  >(
    calendars: T[]
  ): Promise<
    (T & {
      calendars?: ({ externalId: string; name?: string } & {
        sqlCacheUpdatedAt: Date | null;
        sqlCacheSubscriptionCount: number;
      })[];
    })[]
  > {
    if (calendars.length === 0) {
      return [];
    }

    // Get all unique external IDs and credential IDs
    const calendarLookups = calendars.flatMap((cal) =>
      (cal.calendars || []).map((calendar) => ({
        externalId: calendar.externalId,
        credentialId: cal.credentialId,
      }))
    );

    // Find SelectedCalendar records for each external ID and credential ID combination
    const selectedCalendarIds = await Promise.all(
      calendarLookups.map(async ({ externalId, credentialId }) => {
        const selectedCalendar = await this.selectedCalendarRepo.findFirst({
          where: {
            externalId,
            credentialId,
          },
        });
        return {
          externalId,
          credentialId,
          selectedCalendarId: selectedCalendar?.id || null,
        };
      })
    );

    // Get subscriptions for each selected calendar ID that exists
    const validSelectedCalendarIds = selectedCalendarIds
      .filter((item) => item.selectedCalendarId !== null)
      .map((item) => item.selectedCalendarId!);

    const cacheStatuses = await Promise.all(
      validSelectedCalendarIds.map(async (selectedCalendarId) => {
        const subscription = await this.subscriptionRepo.findBySelectedCalendar(selectedCalendarId);

        return {
          selectedCalendarId,
          lastSyncAt: subscription?.updatedAt || null,
          subscriptionCount: subscription ? 1 : 0,
        };
      })
    );

    const cacheStatusMap = new Map(
      cacheStatuses.map((cache) => [
        cache.selectedCalendarId,
        { updatedAt: cache.lastSyncAt, subscriptionCount: cache.subscriptionCount },
      ])
    );

    // Create a map from externalId+credentialId to cache status
    const externalIdCredentialIdToCacheMap = new Map();
    selectedCalendarIds.forEach(({ externalId, credentialId, selectedCalendarId }) => {
      if (selectedCalendarId) {
        const cacheInfo = cacheStatusMap.get(selectedCalendarId);
        externalIdCredentialIdToCacheMap.set(`${externalId}_${credentialId}`, cacheInfo);
      }
    });

    return calendars.map((calendar) => {
      const enrichedCalendars = calendar.calendars?.map((cal) => {
        const cacheKey = `${cal.externalId}_${calendar.credentialId}`;
        const cacheInfo = externalIdCredentialIdToCacheMap.get(cacheKey);

        return {
          ...cal,
          sqlCacheUpdatedAt: cacheInfo?.updatedAt || null,
          sqlCacheSubscriptionCount: cacheInfo?.subscriptionCount || 0,
        };
      });

      return {
        ...calendar,
        calendars: enrichedCalendars,
      };
    });
  }
}
