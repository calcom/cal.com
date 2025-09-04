import type {
  CalendarSubscriptionEvent,
  ICalendarSubscriptionPort,
  CalendarSubscriptionResult,
} from "../lib/CalendarSubscriptionPort.interface";

export class OutlookCalendarSubscriptionAdapter implements ICalendarSubscriptionPort {
  subscribe(selectedCalendar): Promise<CalendarSubscriptionResult> {
    throw new Error("Method not implemented.");
  }
  unsubscribe(selectedCalendar): Promise<void> {
    throw new Error("Method not implemented.");
  }

  handle(selectedCalendar): Promise<CalendarSubscriptionEvent[]> {
    throw new Error("Method not implemented.");
  }
}
