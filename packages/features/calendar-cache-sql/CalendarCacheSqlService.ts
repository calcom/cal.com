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

  async ensureSubscription(selectedCalendarId: string) {
    return await this.subscriptionRepo.upsert({
      selectedCalendar: { connect: { id: selectedCalendarId } },
    });
  }

  async processWebhookEvents(channelId: string, credential: CredentialForCalendarService) {
    const subscription = await this.subscriptionRepo.findByChannelId(channelId);
    if (!subscription) {
      throw new Error("Calendar subscription not found");
    }

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
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch events using events.list with syncToken if available
    const eventsResponse = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      syncToken: subscription.nextSyncToken || undefined,
    });

    // Update the syncToken for next sync
    if (eventsResponse.data.nextSyncToken) {
      await this.subscriptionRepo.update(subscription.id, {
        nextSyncToken: eventsResponse.data.nextSyncToken,
      });
    }

    // Process and save each event
    if (eventsResponse.data.items) {
      for (const event of eventsResponse.data.items) {
        if (!event.id) continue;

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

        const isAllDay = !event.start?.dateTime && event.start?.date;

        await this.eventRepo.upsertEvent({
          calendarSubscription: { connect: { id: subscription.id } },
          googleEventId: event.id,
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
      }
    }
  }
}
