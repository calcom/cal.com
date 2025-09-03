import type { CalendarSubscriptionRepository } from "calendar-subscription/lib/CalendarSubscriptionRepository";

import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";

import { GoogleCalendarSyncAdapter } from "./adapters/google.adapter";

export class CalendarSyncService {
  private providers = {
    google: new GoogleCalendarSyncAdapter(),
  } as const;
  constructor(
    private deps: {
      selectedCalendarRepository?: SelectedCalendarRepository;
      calendarSubscriptionRepository?: CalendarSubscriptionRepository;
    }
  ) {}

  // async process(events: CalendarEvent[]) {

  // }
}
