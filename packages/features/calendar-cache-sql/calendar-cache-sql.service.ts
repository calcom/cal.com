import type { CredentialForCalendarService } from "@calcom/types/Credential";

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

  async processWebhookEvents(channelId: string, credential: CredentialForCalendarService) {
    const subscription = await this.subscriptionRepo.findByChannelId(channelId);
    if (!subscription) {
      throw new Error("Calendar subscription not found");
    }

    const { CalendarCacheService } = await import(
      "@calcom/app-store/googlecalendar/lib/CalendarCacheService"
    );
    const cacheService = new CalendarCacheService(credential);

    const args = {
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items: [{ id: subscription.selectedCalendar.externalId }],
    };

    await cacheService.fetchAvailability(args);
  }
}
