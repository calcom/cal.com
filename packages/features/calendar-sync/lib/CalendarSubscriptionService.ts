import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

export class CalendarSubscriptionService {
  constructor(private deps: { calendarSubscriptionRepository?: ICalendarSubscriptionRepository }) {}

  //   watch(selectedCalendarId: string) {}

  //   unwatch(selectedCalendarId: string) {}
}
