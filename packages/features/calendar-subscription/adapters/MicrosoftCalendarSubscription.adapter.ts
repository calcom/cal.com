import type { SelectedCalendar } from "@calcom/prisma/client";

import type {
  CalendarSubscriptionEvent,
  ICalendarSubscriptionPort,
  CalendarSubscriptionResult,
} from "../lib/CalendarSubscriptionPort.interface";

export class MicrosoftCalendarSubscriptionAdapter implements ICalendarSubscriptionPort {
  async subscribe(selectedCalendar: SelectedCalendar): Promise<CalendarSubscriptionResult> {
    throw new Error("Method not implemented.");
  }
  async unsubscribe(selectedCalendar: SelectedCalendar): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async fetchEvents(selectedCalendar: SelectedCalendar): Promise<CalendarSubscriptionEvent> {
    throw new Error("Method not implemented.");
  }
}
