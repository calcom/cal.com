import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
} from "@calcom/types/Credential";

import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

export class CalendarCacheSqlService {
  constructor(
    private subscriptionRepo: ICalendarSubscriptionRepository,
    private eventRepo: ICalendarEventRepository
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

  async processWebhookEvents(channelId: string, credential: CredentialForCalendarService) {
    const subscription = await this.subscriptionRepo.findByChannelId(channelId);
    if (!subscription) {
      throw new Error("Calendar subscription not found");
    }

    console.info("Got subscription", subscription);

    if (credential.delegatedTo && !credential.delegatedTo.serviceAccountKey.client_email) {
      throw new Error("Delegation credential missing required client_email");
    }

    const credentialWithEmail: CredentialForCalendarServiceWithEmail = {
      ...credential,
      delegatedTo: credential.delegatedTo
        ? {
            serviceAccountKey: {
              client_email: credential.delegatedTo.serviceAccountKey.client_email!,
              client_id: credential.delegatedTo.serviceAccountKey.client_id,
              private_key: credential.delegatedTo.serviceAccountKey.private_key,
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

      // First, get current events (now to +30 days) to avoid past events
      const currentEventsResponse = await calendar.events.list({
        calendarId,
        singleEvents: true,
        timeMin: now.toISOString(),
        timeMax: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      });

      console.info("Got current events:", currentEventsResponse.data.items?.length || 0);

      // Process current events
      if (currentEventsResponse.data.items) {
        const events = currentEventsResponse.data.items
          .filter((event) => event.id)
          .map((event) => {
            const start = event.start?.dateTime
              ? new Date(event.start.dateTime)
              : event.start?.date
              ? new Date(event.start.date)
              : new Date();

            const end = event.end?.dateTime
              ? new Date(event.end.dateTime)
              : event.end?.date
              ? new Date(event.end.date)
              : new Date();

            const isAllDay = !event.start?.dateTime && !!event.start?.date;

            return {
              calendarSubscription: { connect: { id: subscription.id } },
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
            };
          });

        if (events.length > 0) {
          await this.eventRepo.bulkUpsertEvents(events, subscription.id);
        }
      }

      // Now do a full sync to get a nextSyncToken for future incremental syncs
      console.info("Initial sync: Getting sync token for future incremental syncs");
      const syncTokenResponse = await calendar.events.list({
        calendarId,
        singleEvents: true,
        // No time constraints to get a sync token
      });

      if (syncTokenResponse.data.nextSyncToken) {
        await this.subscriptionRepo.updateSyncToken(subscription.id, syncTokenResponse.data.nextSyncToken);
        console.info("Got initial sync token:", syncTokenResponse.data.nextSyncToken);
      }

      return;
    }

    // For incremental sync, use the existing sync token
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

    // Update the syncToken for next sync
    if (eventsResponse.data.nextSyncToken) {
      await this.subscriptionRepo.updateSyncToken(subscription.id, eventsResponse.data.nextSyncToken);
    } else {
      console.info(
        "No nextSyncToken returned by Google Calendar API - this is normal for time-range queries or when no changes need syncing"
      );
    }

    // Process and save each event
    if (eventsResponse.data.items) {
      const events = eventsResponse.data.items
        .filter((event: any) => event.id)
        // For full sync (no syncToken), only process events from now onwards
        .filter((event: any) => {
          if (subscription.nextSyncToken) {
            // For incremental sync, process all events
            return true;
          }
          // For full sync, only process events from now onwards
          const eventStart = event.start?.dateTime
            ? new Date(event.start.dateTime)
            : event.start?.date
            ? new Date(event.start.date)
            : new Date();
          return eventStart >= now;
        })
        .map((event: any) => {
          const start = event.start?.dateTime
            ? new Date(event.start.dateTime)
            : event.start?.date
            ? new Date(event.start.date)
            : new Date();

          const end = event.end?.dateTime
            ? new Date(event.end.dateTime)
            : event.end?.date
            ? new Date(event.end.date)
            : new Date();

          const isAllDay = !event.start?.dateTime && !!event.start?.date;

          return {
            calendarSubscription: { connect: { id: subscription.id } },
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
          };
        });

      // Bulk upsert all events at once
      if (events.length > 0) {
        await this.eventRepo.bulkUpsertEvents(events, subscription.id);
      }
    }
  }
}
