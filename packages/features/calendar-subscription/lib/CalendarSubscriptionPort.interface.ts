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

export interface CalendarSubscriptionPort {
  /**
   * Subscribes to a calendar
   * @param externalId
   */
  subscribe(externalId: string): Promise<CalendarSubscriptionResult>;

  /**
   * Unsubscribes from a calendar
   * @param selectedCalendarId
   */
  unsubscribe(selectedCalendarId: string): Promise<void>;

  /**
   * Handle webhook events
   * @param selectedCalendarId
   *
   */
  handle(selectedCalendarId: string): Promise<CalendarSubscriptionEvent[]>;
}
