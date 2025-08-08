import type { calendar_v3 } from "@googleapis/calendar";
import type { Prisma, CalendarSubscription } from "@prisma/client";

import type { ICalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository.interface";
import type { ICalendarWebhookService } from "@calcom/features/calendar-cache-sql/CalendarWebhookServiceFactory";
import logger from "@calcom/lib/logger";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
} from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarWebhookService"] });

export class CalendarWebhookService implements ICalendarWebhookService {
  constructor(
    private subscriptionRepo: ICalendarSubscriptionRepository,
    private eventRepo: ICalendarEventRepository
  ) {}

  async processWebhookEvents(
    subscription: CalendarSubscription & {
      selectedCalendar: {
        credential: any | null;
        externalId: string;
        integration: string;
        userId: number;
      };
    },
    credential: CredentialForCalendarService
  ): Promise<void> {
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

    const { default: GoogleCalendarService } = await import("./CalendarService");

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
}
