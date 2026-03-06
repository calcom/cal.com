/**
 * Calendar connection helpers.
 * Re-exports getCalendars usage; full types in client.
 */

import type { ConnectedCalendar, GetCalendarsResponse } from "../types.js";

/**
 * Extract connected calendar sources (e.g. "google", "office365") from getCalendars response.
 */
export function getConnectedSources(response: GetCalendarsResponse): string[] {
  const sources: string[] = [];
  for (const conn of response.data.connectedCalendars) {
    const type = conn.integration?.type;
    if (type === "google_calendar") sources.push("google");
    else if (type === "office365_calendar") sources.push("office365");
    else if (type === "apple_calendar") sources.push("apple");
  }
  return [...new Set(sources)];
}

/**
 * Get the first connected Google calendar (for default calendarId).
 */
export function getDefaultGoogleCalendarId(response: GetCalendarsResponse): string | null {
  for (const conn of response.data.connectedCalendars) {
    if (conn.integration?.type === "google_calendar") {
      const primary = conn.primary;
      if (primary?.externalId) return primary.externalId;
      const first = conn.calendars?.[0];
      if (first?.externalId) return first.externalId;
      // This connection has no usable calendar — continue checking other connections
    }
  }
  return null;
}

export type { ConnectedCalendar, GetCalendarsResponse };
