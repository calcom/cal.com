/**
 * Calendar Manager modifications for optional guests
 * 
 * When creating calendar events, optional guests should be included
 * in the attendees list with optional: true flag.
 * 
 * Different calendar providers handle optional attendees differently:
 * - Google Calendar: attendees[].optional = true
 * - Microsoft Graph API: attendees[].type = "optional"  
 * - iCal/CALDAV: ROLE=OPT-PARTICIPANT
 */

import type { CalendarEvent } from "@calcom/types/Calendar";

/**
 * Normalizes attendees for different calendar providers
 * ensuring optional attendees are correctly marked
 */
export function normalizeAttendeesForCalendar(
  event: CalendarEvent,
  provider: "google" | "office365" | "caldav" | "other"
): CalendarEvent {
  return {
    ...event,
    attendees: event.attendees.map((attendee) => {
      if (!attendee.optional) return attendee;
      
      // All providers receive the optional flag,
      // each CalendarService implementation handles it appropriately
      return {
        ...attendee,
        optional: true,
      };
    }),
  };
}
