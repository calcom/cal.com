import type { SelectedCalendar } from "@calcom/prisma/client";

type CalendarSubscriptionProvider = "google" | "outlook";

export type CalendarSubscriptionResult = {
  provider: CalendarSubscriptionProvider;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: Date | null;
};

export type CalendarSubscriptionEventItem = {
  transparency: "opaque" | "transparent";
  start: string | null;
  end: string | null;
  summary: string | null;
};

export type CalendarSubscriptionEvent = {
  provider: CalendarSubscriptionProvider;
  syncToken: string | null;
  items: CalendarSubscriptionEventItem[];
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
   * Pulls events from a calendar
   * @param selectedCalendar
   */
  fetchEvents(selectedCalendar: SelectedCalendar): Promise<CalendarSubscriptionEvent[]>;
}
