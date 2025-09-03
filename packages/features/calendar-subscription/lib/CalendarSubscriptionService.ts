import type { CalendarSubscriptionPort } from "calendar-subscription/lib/CalendarSubscriptionPort.interface";

import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

export class CalendarSubscriptionService {
  constructor(
    private deps: {
      calendarSubscriptionRepository?: ICalendarSubscriptionRepository;
      calendarSubscriptionPort?: CalendarSubscriptionPort;
    }
  ) {}

  /**
   * Subscribes to a calendar
   * @param selectedCalendarId
   * @returns
   */
  async subscribe(selectedCalendarId: string): Promise<void> {
    const selectedCalendar = await this.deps.calendarSubscriptionRepository?.findBySelectedCalendarId(
      selectedCalendarId
    );

    if (selectedCalendar) {
      return;
    }

    const calendarSubscriptionResult = await this.deps.calendarSubscriptionPort?.subscribe(
      selectedCalendarId
    );

    await this.deps.calendarSubscriptionRepository?.upsertBySelectedCalendarId(selectedCalendarId, {
      selectedCalendarId,
      resourceId: calendarSubscriptionResult?.id,
      resourceUri: calendarSubscriptionResult?.resourceUri,
      expiration: calendarSubscriptionResult?.expiration,
    });
  }

  /**
   * Unsubscribes from a calendar
   * @param selectedCalendarId
   * @returns
   */
  async unsubscribe(selectedCalendarId: string): Promise<void> {
    const selectedCalendar = await this.deps.calendarSubscriptionRepository?.findBySelectedCalendarId(
      selectedCalendarId
    );

    if (!selectedCalendar) {
      return;
    }
    await this.deps.calendarSubscriptionPort?.unsubscribe(selectedCalendarId);
  }

  async handle(selectedCalendarId: string): Promise<void> {
    await this.deps.calendarSubscriptionPort?.handle(selectedCalendarId);
  }
}
