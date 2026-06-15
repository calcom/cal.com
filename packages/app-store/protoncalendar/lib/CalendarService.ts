import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import BuildIcsFeedCalendarService from "../../ics-feedcalendar/lib/CalendarService";

/**
 * Proton Calendar is backed by the read-only ICS feed service: Proton only
 * exposes calendars as ICS share links, so availability is read from the feed
 * and event writes are no-ops (handled by the ICS feed service).
 *
 * Factory function exported instead of the class to prevent internal types
 * from leaking into the emitted .d.ts file.
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return BuildIcsFeedCalendarService(credential, "proton_calendar");
}
