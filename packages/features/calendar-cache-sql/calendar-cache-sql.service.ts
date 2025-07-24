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

  async processWebhookEvents(channelId: string, credential: any) {
    const subscription = await this.subscriptionRepo.findByChannelId(channelId);
    if (!subscription) {
      throw new Error("Calendar subscription not found");
    }

    const { getCalendar } = await import("@calcom/app-store/_utils/getCalendar");
    const calendarService = await getCalendar(credential);

    if (!calendarService) {
      throw new Error("Could not get calendar service");
    }

    await calendarService.fetchAvailabilityAndSetCache?.([subscription.selectedCalendar]);
  }
}
