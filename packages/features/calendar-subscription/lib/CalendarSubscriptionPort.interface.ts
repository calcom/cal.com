import type { SelectedCalendar } from "@calcom/prisma/client";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
} from "@calcom/types/Credential";

export type CalendarSubscriptionProvider = "google" | "outlook";

export type WebhookContext = {
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
  syncToken: string | null;
  items: CalendarSubscriptionEventItem[];
};

export type CalendarCredential = CredentialForCalendarServiceWithEmail;

export interface ICalendarSubscriptionPort {
  /**
   * Validates a webhook request
   * @param context
   */
  validate(context: WebhookContext): Promise<boolean>;

  /**
   * Extracts channel ID from a webhook request
   * @param request
   */
  extractChannelId(context: WebhookContext): Promise<string | null>;

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
