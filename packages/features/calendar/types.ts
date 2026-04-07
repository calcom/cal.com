import type { CalendarCredential } from "@calcom/calendar-adapter/calendar-adapter-types";
import type { SelectedCalendar } from "@calcom/prisma/client";

export type { CalendarCredential };

/**
 * Credential enriched with the delegation credential UUID it was resolved from.
 * Regular (non-delegation) credentials will have `delegationCredentialId` as
 * `undefined` or `null`.
 */
export type CalendarCredentialWithDelegation = CalendarCredential & {
  delegationCredentialId?: string | null;
};

export interface FetchBusyTimesParams {
  credentials: CalendarCredentialWithDelegation[];
  dateFrom: string;
  dateTo: string;
  selectedCalendars: SelectedCalendar[];
}

export interface ProcessEventsResult {
  eventsFetched: number;
  eventsCached: number;
  eventsSynced: number;
}
