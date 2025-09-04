import type { SelectedCalendar } from "@calcom/prisma/client";

type CalendarSubscriptionProvider = "google" | "outlook";

export type CalendarSubscriptionResult = {
  provider: CalendarSubscriptionProvider;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: Date | null;
};

export type CalendarUnsubscribeResult = {
  provider: CalendarSubscriptionProvider;
};

export type CalendarSubscriptionEvent = {
  provider: CalendarSubscriptionProvider;
};

export interface ICalendarSubscriptionPort {
  /**
   * Subscribes to a calendar
   * @param selectedCalendar
   */
  subscribe(selectedCalendar: SelectedCalendar): Promise<CalendarSubscriptionResult>;

  /**
   * Unsubscribes from a calendar
   * @param selectedCalendar
   */
  unsubscribe(selectedCalendar: SelectedCalendar): Promise<void>;

  /**
   * Handle webhook events
   * @param selectedCalendarId
   *
   */
  handle(selectedCalendar: SelectedCalendar): Promise<CalendarSubscriptionEvent[]>;
}
