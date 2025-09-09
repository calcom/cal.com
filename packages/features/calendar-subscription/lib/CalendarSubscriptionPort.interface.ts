import type { SelectedCalendar } from "@calcom/prisma/client";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
} from "@calcom/types/Credential";

export type CalendarSubscriptionProvider = "google" | "microsoft";

export type CalendarSubscriptionWebhookContext = {
  headers?: Headers;
  query?: URLSearchParams;
  body?: unknown | null;
};

export type CalendarSubscriptionResult = {
  provider: CalendarSubscriptionProvider;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: Date | null;
};

export type CalendarSubscriptionEventItem = {
  id?: string | null;
  iCalUID?: string | null;
  start?: Date;
  end?: Date;
  busy: boolean;
  summary?: string | null;
  description?: string | null;
  kind?: string | null;
  status?: string | null;
  location?: string | null;
};

export type CalendarSubscriptionEvent = {
  provider: CalendarSubscriptionProvider;
  syncToken: string | null;
  items: CalendarSubscriptionEventItem[];
};

export type CalendarCredential = CredentialForCalendarServiceWithEmail;

export interface ICalendarSubscriptionPort {
  /**
   * Validates a webhook request
   * @param context
   */
  validate(context: CalendarSubscriptionWebhookContext): Promise<boolean>;

  /**
   * Extracts channel ID from a webhook request
   * @param request
   */
  extractChannelId(context: CalendarSubscriptionWebhookContext): Promise<string | null>;

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
