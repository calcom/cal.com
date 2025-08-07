import type { calendar_v3 } from "@googleapis/calendar";
import type { Prisma } from "@prisma/client";

import type { ISelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
} from "@calcom/types/Credential";

import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

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

    if (credential.type === "office365_calendar") {
      await this.processOffice365WebhookEvents(subscription, credential);
    } else {
      await this.processGoogleWebhookEvents(subscription, credential);
    }
  }

  private async processGoogleWebhookEvents(
    subscription: CalendarSubscription,
    credential: CredentialForCalendarService
  ) {
    if (credential.delegatedTo && !credential.delegatedTo.serviceAccountKey.client_email) {
      throw new Error("Delegation credential missing required client_email");
    }

    const credentialWithEmail: CredentialForCalendarServiceWithEmail = {
      ...credential,
      delegatedTo: credential.delegatedTo
        ? {
            serviceAccountKey: {
              client_email: credential.delegatedTo.serviceAccountKey.client_email || "",
              client_id: credential.delegatedTo.serviceAccountKey.client_id,
              private_key: credential.delegatedTo.serviceAccountKey.private_key,
            },
          }
        : null,
    };

    const { default: GoogleCalendarService } = await import(
      "@calcom/app-store/googlecalendar/lib/CalendarService"
    );

    const calendarService = new GoogleCalendarService(credentialWithEmail);
    const calendar = await calendarService.authedCalendar();

    const calendarId = subscription.selectedCalendar.externalId;
    const now = new Date();

    if (!subscription.nextSyncToken) {
      console.info("Initial sync: Getting current events with time range");

      const currentEventsResponse = await calendar.events.list({
        calendarId,
        singleEvents: true,
        timeMin: now.toISOString(),
        timeMax: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      console.info("Got current events:", currentEventsResponse.data.items?.length || 0);

      if (currentEventsResponse.data.items) {
        const events = this.parseCalendarEvents(currentEventsResponse.data.items, subscription.id, false);

        if (events.length > 0) {
          await this.eventRepo.bulkUpsertEvents(events, subscription.id);
        }
      }

      console.info("Initial sync: Getting sync token for future incremental syncs");
      const syncTokenResponse = await calendar.events.list({
        calendarId,
        singleEvents: true,
      });

      if (syncTokenResponse.data.nextSyncToken) {
        await this.subscriptionRepo.updateSyncToken(subscription.id, syncTokenResponse.data.nextSyncToken);
        console.info("Got initial sync token:", syncTokenResponse.data.nextSyncToken);
      }

      return;
    }

    console.info("Incremental sync: Using existing sync token");
    const eventsResponse = await calendar.events.list({
      calendarId,
      singleEvents: true,
      syncToken: subscription.nextSyncToken,
    });

    console.info("Got events", eventsResponse.data);
    console.info("Got syncToken", eventsResponse.data.nextSyncToken);
    console.info("Full eventsResponse.data keys:", Object.keys(eventsResponse.data));
    console.info("Events count:", eventsResponse.data.items?.length || 0);
    console.info(
      "Sync approach:",
      subscription.nextSyncToken ? "incremental" : "initial sync (current + 30 days)"
    );
    console.info("Request params:", {
      calendarId,
      syncToken: subscription.nextSyncToken || "none",
      timeRange: subscription.nextSyncToken ? "incremental" : "now to +30 days",
    });

    if (eventsResponse.data.nextSyncToken) {
      await this.subscriptionRepo.updateSyncToken(subscription.id, eventsResponse.data.nextSyncToken);
    } else {
      console.info(
        "No nextSyncToken returned by Google Calendar API - this is normal for time-range queries or when no changes need syncing"
      );
    }

    if (eventsResponse.data.items) {
      const events = this.parseCalendarEvents(
        eventsResponse.data.items,
        subscription.id,
        !subscription.nextSyncToken
      );

      if (events.length > 0) {
        await this.eventRepo.bulkUpsertEvents(events, subscription.id);
      }
    }
  }

  private async processOffice365WebhookEvents(
    subscription: CalendarSubscription,
    credential: CredentialForCalendarService
  ) {
    const { default: Office365CalendarService } = await import(
      "@calcom/app-store/office365calendar/lib/CalendarService"
    );

    const credentialWithTenantId = credential as CredentialForCalendarService & {
      key: { tenant_id: string; client_id: string; client_secret: string };
    };
    const calendarService = new Office365CalendarService(credentialWithTenantId);
    const calendarId = subscription.selectedCalendar.externalId;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const userEndpoint = await calendarService.getUserEndpoint();
    const eventsUrl =
      calendarId === "primary" || !calendarId
        ? `${userEndpoint}/calendar/calendarView`
        : `${userEndpoint}/calendars/${calendarId}/calendarView`;

    const filter = `?startDateTime=${encodeURIComponent(now.toISOString())}&endDateTime=${encodeURIComponent(
      thirtyDaysFromNow.toISOString()
    )}`;

    const response = await calendarService["fetcher"](`${eventsUrl}${filter}`);
    const responseData = await response.json();

    console.info("Got Office365 events:", responseData.value?.length || 0);

    if (responseData.value) {
      const events = this.parseOffice365Events(responseData.value, subscription.id);

      if (events.length > 0) {
        await this.eventRepo.bulkUpsertEvents(events, subscription.id);
      }
    }
  }

  private parseOffice365Events(
    rawEvents: unknown[],
    subscriptionId: string
  ): Prisma.CalendarEventCreateInput[] {
    return rawEvents.reduce((acc, event: unknown) => {
      const eventObj = event as Record<string, unknown>;
      if (!eventObj.id) return acc;

      const startObj = eventObj.start as Record<string, unknown> | undefined;
      const endObj = eventObj.end as Record<string, unknown> | undefined;
      const start = startObj?.dateTime ? new Date(startObj.dateTime as string) : new Date();
      const end = endObj?.dateTime ? new Date(endObj.dateTime as string) : new Date();
      const isAllDay = !startObj?.dateTime && !!startObj?.date;

      const bodyObj = eventObj.body as Record<string, unknown> | undefined;
      const locationObj = eventObj.location as Record<string, unknown> | undefined;

      acc.push({
        calendarSubscription: { connect: { id: subscriptionId } },
        googleEventId: eventObj.id as string,
        iCalUID: (eventObj.iCalUId as string) || null,
        etag: (eventObj["@odata.etag"] as string) || "",
        sequence: 0,
        summary: (eventObj.subject as string) || null,
        description: (bodyObj?.content as string) || null,
        location: (locationObj?.displayName as string) || null,
        start,
        end,
        isAllDay,
        status: eventObj.isCancelled ? "cancelled" : "confirmed",
        transparency: eventObj.showAs === "free" ? "transparent" : "opaque",
        visibility: "default",
        recurringEventId: (eventObj.seriesMasterId as string) || null,
        originalStartTime: null,
        googleCreatedAt: eventObj.createdDateTime ? new Date(eventObj.createdDateTime as string) : null,
        googleUpdatedAt: eventObj.lastModifiedDateTime
          ? new Date(eventObj.lastModifiedDateTime as string)
          : null,
      });

      return acc;
    }, [] as Prisma.CalendarEventCreateInput[]);
  }

  /**
   * Parses and transforms raw Google Calendar events into Prisma-compatible event objects
   * @param rawEvents - Array of raw events from Google Calendar API
   * @param subscriptionId - ID of the calendar subscription
   * @param filterPastEvents - Whether to filter out events that start before now
   * @returns Array of Prisma CalendarEventCreateInput objects
   */
  private parseCalendarEvents(
    rawEvents: calendar_v3.Schema$Event[],
    subscriptionId: string,
    filterPastEvents = false
  ): Prisma.CalendarEventCreateInput[] {
    const now = new Date();

    return rawEvents.reduce((acc, event: calendar_v3.Schema$Event) => {
      if (!event.id) return acc;

      const start = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : event.start?.date
        ? new Date(event.start.date)
        : new Date();

      // Filter past events if requested
      if (filterPastEvents && start < now) {
        return acc;
      }

      const end = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
        ? new Date(event.end.date)
        : new Date();

      const isAllDay = !event.start?.dateTime && !!event.start?.date;

      acc.push({
        calendarSubscription: { connect: { id: subscriptionId } },
        googleEventId: event.id || "",
        iCalUID: event.iCalUID || null,
        etag: event.etag || "",
        sequence: event.sequence || 0,
        summary: event.summary || null,
        description: event.description || null,
        location: event.location || null,
        start,
        end,
        isAllDay,
        status: event.status || "confirmed",
        transparency: event.transparency || "opaque",
        visibility: event.visibility || "default",
        recurringEventId: event.recurringEventId || null,
        originalStartTime: event.originalStartTime?.dateTime
          ? new Date(event.originalStartTime.dateTime)
          : event.originalStartTime?.date
          ? new Date(event.originalStartTime.date)
          : null,
        googleCreatedAt: event.created ? new Date(event.created) : null,
        googleUpdatedAt: event.updated ? new Date(event.updated) : null,
      });

      return acc;
    }, [] as Prisma.CalendarEventCreateInput[]);
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
