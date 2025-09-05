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
  transparency?: "opaque" | "transparent" | null;
  start?: string | null;
  end?: string | null;
  summary?: string | null;
  description?: string | null;
  iCalUID?: string | null;
  id?: string | null;
  kind?: string | null;
  status?: string | null;
};

export type CalendarSubscriptionEvent = {
  provider: CalendarSubscriptionProvider;
} & (
  | {
      syncToken: string | null;
      items?: CalendarSubscriptionEventItem[];
    }
  | {
      syncError: string | null;
    }
);

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
  fetchEvents(selectedCalendar: SelectedCalendar): Promise<CalendarSubscriptionEvent>;
}
