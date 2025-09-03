import type {
  CalendarSubscriptionEvent,
  CalendarSubscriptionPort,
  CalendarSubscriptionResult,
} from "../lib/CalendarSubscriptionPort.interface";

export class OutlookCalendarSubscriptionAdapter implements CalendarSubscriptionPort {
  subscribe(externalId: string): Promise<CalendarSubscriptionResult> {
    throw new Error("Method not implemented.");
  }
  unsubscribe(selectedCalendarId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  handle(selectedCalendarId: string): Promise<CalendarSubscriptionEvent[]> {
    throw new Error("Method not implemented.");
  }
}
