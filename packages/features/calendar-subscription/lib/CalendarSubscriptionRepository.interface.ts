import type { CalendarSubscription } from "@prisma/client";

export interface ICalendarSubscriptionRepository {
  /**
   * Upserts the CalendarSubscription for the selectedCalendarId
   * @param selectedCalendarId the selectedCalendarId
   * @param calendarSubscription the CalendarSubscription
   * @returns the CalendarSubscription
   */
  upsertBySelectedCalendarId(
    selectedCalendarId: string,
    calendarSubscription: Partial<CalendarSubscription>
  ): Promise<CalendarSubscription | null>;

  /**
   * Returns the CalendarSubscription for the selectedCalendarId
   * @param selectedCalendarId the selectedCalendarId
   */
  findBySelectedCalendarId(selectedCalendarId: string): Promise<CalendarSubscription | null>;

  /**
   * Deletes the CalendarSubscription for the selectedCalendarId
   * @param selectedCalendarId the selectedCalendarId
   */
  deleteBySelectedCalendarId(selectedCalendarId: string): Promise<void>;
}
