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
  transparency: "opaque" | "transparent";
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
}
