import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import { ICSFeedCalendarService } from "../../ics-feedcalendar/lib/CalendarService";

/**
 * Factory function to instantiate the Proton Calendar service.
 * Wraps the generic ICS feed integration with a custom calendar integration type name.
 * @param credential - The decrypted credential record containing key and integration settings.
 * @returns The Calendar service instance.
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ICSFeedCalendarService(credential, "protoncalendar_calendar");
}
