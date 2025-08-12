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
      // Keep compatibility if other code paths ever use this directly
      timeZone: event.timeZone || undefined,
    }));
  }

  async processWebhookEvents(
    channelId: string,
    credential: CredentialForCalendarService
  ) {
    const subscription = await this.subscriptionRepo.findByChannelId(channelId);
    if (!subscription) {
      throw new Error("Calendar subscription not found");
    }

    console.info("Got subscription", subscription);

    if (credential.delegatedTo) {
      if (!credential.delegatedTo.serviceAccountKey?.client_email) {
        throw new Error("Delegation credential missing required client_email");
      }
    }

    const credentialWithEmail: CredentialForCalendarServiceWithEmail = {
      ...credential,
      delegatedTo: credential.delegatedTo
        ? {
            serviceAccountKey: {
              client_email:
                credential.delegatedTo.serviceAccountKey.client_email,
              client_id: credential.delegatedTo.serviceAccountKey.client_id,
              private_key:
                credential.delegatedTo.serviceAccountKey.private_key,
            },
          }
        : null,
    };

    // Import Google Calendar service to fetch events
    const { default: GoogleCalendarService } = await import(
      "@calcom/app-store/googlecalendar/lib/CalendarService"
    );

    const calendarService = new GoogleCalendarService(credentialWithEmail);
    const calendar = await calendarService.authedCalendar();

    const calendarId = subscription.selectedCalendar.externalId;
    const now = new Date();

    // For initial sync, first get current events with time range, then get a sync token
    if (!subscription.nextSyncToken) {
      console.info("Initial sync: Getting current events with time range");
      const allCurrentEvents = await this.fetchAllTimeRangedEvents(
        calendar,
        calendarId,
        now.toISOString(),
        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      );

      // Process current events
      if (allCurrentEvents.length > 0) {
        const events = this.parseCalendarEvents(
          allCurrentEvents,
          subscription.id,
          false // Don't filter past events as we already fetched from timeMin=now
        );

        if (events.length > 0) {
          await this.eventRepo.bulkUpsertEvents(events, subscription.id);
        }
      }

      // Now do a full sync to get a nextSyncToken for future incremental syncs
      console.info("Initial sync: Getting sync token for future incremental syncs");
      const initialSyncToken = await this.fetchFreshSyncToken(calendar, calendarId);
      if (initialSyncToken) {
        await this.subscriptionRepo.updateSyncToken(subscription.id, initialSyncToken);
      }

      return;
    }

    // For incremental sync, use the existing sync token
    console.info("Incremental sync: Using existing sync token");
    try {
      const { items: incrementalItems, nextSyncToken } = await this.fetchAllIncremental(
        calendar,
        calendarId,
        subscription.nextSyncToken!
      );
      if (incrementalItems.length > 0) {
        const events = this.parseCalendarEvents(incrementalItems, subscription.id, false);
        if (events.length > 0) {
          await this.eventRepo.bulkUpsertEvents(events, subscription.id);
        }
      }
      if (nextSyncToken) {
        await this.subscriptionRepo.updateSyncToken(subscription.id, nextSyncToken);
      }
    } catch (err: any) {
      const status = err?.code ?? err?.response?.status;
      // Handle invalid/stale sync token by falling back to a full time-ranged sync
      if (status === 410) {
        console.warn("Incremental sync token is stale (410). Falling back to full time-ranged sync.");
        // Clear in-memory token to avoid reusing a stale value during recovery
        // Do not persist this cleared state; only persist a fresh token after successful recovery
        subscription.nextSyncToken = null;
        // Perform a time-ranged full sync (now to +30 days), with pagination
        const allCurrentEvents = await this.fetchAllTimeRangedEvents(
          calendar,
          calendarId,
          now.toISOString(),
          new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        );

        // Upsert events from full sync
        if (allCurrentEvents.length > 0) {
          const events = this.parseCalendarEvents(allCurrentEvents, subscription.id, false);
          if (events.length > 0) {
            await this.eventRepo.bulkUpsertEvents(events, subscription.id);
          }
        }

        // After successful full sync, fetch a fresh sync token and persist it once
        const freshToken = await this.fetchFreshSyncToken(calendar, calendarId);
        if (freshToken) {
          await this.subscriptionRepo.updateSyncToken(subscription.id, freshToken);
        }
        return;
      }

      // If it's not a 410, rethrow so upstream handlers/logging can catch
      throw err;
    }
  }

  private async fetchAllIncremental(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    syncToken: string
  ): Promise<{ items: calendar_v3.Schema$Event[]; nextSyncToken?: string }> {
    const items: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    let finalNextSyncToken: string | undefined;
    do {
      const data: calendar_v3.Schema$Events = (
        await calendar.events.list({ calendarId, singleEvents: true, syncToken, pageToken })
      ).data;
      if (data.items && data.items.length > 0) items.push(...data.items);
      pageToken = data.nextPageToken || undefined;
      if (data.nextSyncToken) finalNextSyncToken = data.nextSyncToken;
    } while (pageToken);
    return { items, nextSyncToken: finalNextSyncToken };
  }

  private async fetchAllTimeRangedEvents(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    timeMinIso: string,
    timeMaxIso: string
  ): Promise<calendar_v3.Schema$Event[]> {
    const items: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    do {
      const data: calendar_v3.Schema$Events = (
        await calendar.events.list({
          calendarId,
          singleEvents: true,
          timeMin: timeMinIso,
          timeMax: timeMaxIso,
          pageToken,
        })
      ).data;
      if (data.items && data.items.length > 0) items.push(...data.items);
      pageToken = data.nextPageToken || undefined;
    } while (pageToken);
    return items;
  }

  private async fetchFreshSyncToken(
    calendar: calendar_v3.Calendar,
    calendarId: string
  ): Promise<string | undefined> {
    const resp = await calendar.events.list({ calendarId, singleEvents: true });
    return resp.data.nextSyncToken || undefined;
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

    const events: Prisma.CalendarEventCreateInput[] = [];

    rawEvents.forEach((event: calendar_v3.Schema$Event) => {
      if (!event.id) return;

      const start = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : event.start?.date
        ? new Date(event.start.date)
        : new Date();

      // Filter past events if requested
      if (filterPastEvents && start < now) {
        return;
      }

      const end = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
        ? new Date(event.end.date)
        : new Date();

      const isAllDay = !event.start?.dateTime && !!event.start?.date;

      const createAttendees = (event.attendees || []).map((a) => ({
        email: a.email || null,
        displayName: a.displayName || null,
        responseStatus: a.responseStatus || null,
        isOrganizer: Boolean(a.organizer),
        isSelf: Boolean(a.self),
      }));

      events.push({
        calendarSubscription: { connect: { id: subscriptionId } },
        googleEventId: event.id!,
        iCalUID: event.iCalUID || null,
        etag: event.etag || "",
        sequence: event.sequence || 0,
        summary: event.summary || null,
        description: event.description || null,
        location: event.location || null,
        start,
        end,
        isAllDay,
        // Save event-level timezone if provided
        timeZone: (event.start?.timeZone as string | undefined) ?? null,
        creator: event.creator
          ? {
              create: {
                email: event.creator.email || null,
                displayName: event.creator.displayName || null,
                isSelf: Boolean(event.creator.self),
              },
            }
          : undefined,
        organizer: event.organizer
          ? {
              create: {
                email: event.organizer.email || null,
                displayName: event.organizer.displayName || null,
                isSelf: Boolean(event.organizer.self),
                isOrganizer: true,
              },
            }
          : undefined,
        attendees:
          createAttendees.length > 0
            ? {
                createMany: {
                  data: createAttendees,
                  skipDuplicates: true,
                },
              }
            : undefined,
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
    });

    return events;
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
    // Find SelectedCalendar records in a single query
    const selectedCalendars = await this.selectedCalendarRepo.findMany({
      where: {
        OR: calendarLookups.map(({ externalId, credentialId }) => ({
          externalId,
          credentialId,
        })),
      },
    });

    const selectedCalendarMap = new Map(
      selectedCalendars.map((sc) => [`${sc.externalId}_${sc.credentialId}`, sc.id])
    );

    const selectedCalendarIds = calendarLookups.map(({ externalId, credentialId }) => ({
      externalId,
      credentialId,
      selectedCalendarId: selectedCalendarMap.get(`${externalId}_${credentialId}`) || null,
    }));

    // Get subscriptions for each selected calendar ID that exists
    const validSelectedCalendarIds = selectedCalendarIds
      .filter((item) => item.selectedCalendarId !== null)
      .map((item) => item.selectedCalendarId!);

    // Batch fetch subscriptions to avoid N+1
    const subscriptions = await this.subscriptionRepo.findBySelectedCalendarIds(validSelectedCalendarIds);

    const subscriptionBySelectedCalendarId = new Map(subscriptions.map((s) => [s.selectedCalendarId, s]));

    const cacheStatuses = validSelectedCalendarIds.map((selectedCalendarId) => {
      const subscription = subscriptionBySelectedCalendarId.get(selectedCalendarId);
      return {
        selectedCalendarId,
        lastSyncAt: subscription?.updatedAt || null,
        subscriptionCount: subscription ? 1 : 0,
      };
    });

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
