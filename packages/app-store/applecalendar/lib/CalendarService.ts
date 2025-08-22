import CalendarService from "@calcom/lib/CalendarService";
import type { CredentialPayload } from "@calcom/types/Credential";

export default class AppleCalendarService extends CalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "apple_calendar", "https://caldav.icloud.com");
  }
}
