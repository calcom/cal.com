import BaseCalendarService from "@calcom/lib/CalendarService";
import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

class CalDavCalendarService extends BaseCalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "caldav_calendar");
  }
}

/**
 * Factory function that creates a CalDAV Calendar service instance.
 * This is exported instead of the class to prevent internal types
 * from leaking into the emitted .d.ts file.
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new CalDavCalendarService(credential);
}
