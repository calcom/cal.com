import type { CalendarSubscriptionProvider } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
} from "@calcom/types/Credential";

export type CalendarSubscriptionResult = {
  provider: CalendarSubscriptionProvider;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: Date | null;
};

export type CalendarSubscriptionEventItem = {
  id: string;
  iCalUID: string | null;
  start?: Date;
  end?: Date;
  busy: boolean;
  isAllDay: boolean;
  summary: string | null;
  description: string | null;
  kind: string | null;
  etag: string | null;
  status: string | null;
  location: string | null;
  originalStartDate: Date | null;
  recurringEventId: string | null;
  timeZone: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CalendarSubscriptionEvent = {
  provider: CalendarSubscriptionProvider;
  syncToken: string | null;
  items: CalendarSubscriptionEventItem[];
};

export type CalendarCredential = CredentialForCalendarServiceWithEmail;

/**
 * Calendar Subscription Port
 */
export interface ICalendarSubscriptionPort {
  /**
   * Validates a webhook request
   * @param context
   */
  validate(context: Request): Promise<boolean>;

  /**
   * Extracts channel ID from a webhook request
   * @param request
   */
  extractChannelId(context: Request): Promise<string | null>;

  /**
   * Subscribes to a calendar
   * @param selectedCalendar
   */
  subscribe(
    selectedCalendar: SelectedCalendar,
    credential: CalendarCredential
  ): Promise<CalendarSubscriptionResult>;

  /**
   * Unsubscribes from a calendar
   * @param selectedCalendar
   */
  unsubscribe(selectedCalendar: SelectedCalendar, credential: CalendarCredential): Promise<void>;

  /**
   * Pulls events from a calendar
   * @param selectedCalendar
   */
  fetchEvents(
    selectedCalendar: SelectedCalendar,
    credential: CredentialForCalendarService
  ): Promise<CalendarSubscriptionEvent>;
}
