import type { ICalendarEventRepository } from "./calendar-event.repository.interface";
import type { ICalendarSubscriptionRepository } from "./calendar-subscription.repository.interface";

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

  async processWebhookEvents(channelId: string, events: any[]) {
    const subscription = await this.subscriptionRepo.findByChannelId(channelId);
    if (!subscription) {
      throw new Error("Calendar subscription not found");
    }

    for (const event of events) {
      if (event.status === "cancelled") {
        await this.eventRepo.deleteEvent(subscription.id, event.id);
      } else {
        await this.eventRepo.upsertEvent({
          calendarSubscription: { connect: { id: subscription.id } },
          googleEventId: event.id,
          iCalUID: event.iCalUID,
          etag: event.etag,
          sequence: event.sequence || 0,
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: new Date(event.start.dateTime || event.start.date),
          end: new Date(event.end.dateTime || event.end.date),
          isAllDay: !!event.start.date,
          status: event.status || "confirmed",
          transparency: event.transparency || "opaque",
          visibility: event.visibility || "default",
          recurringEventId: event.recurringEventId,
          originalStartTime: event.originalStartTime ? new Date(event.originalStartTime.dateTime) : null,
          googleCreatedAt: event.created ? new Date(event.created) : null,
          googleUpdatedAt: event.updated ? new Date(event.updated) : null,
        });
      }
    }
  }
}
